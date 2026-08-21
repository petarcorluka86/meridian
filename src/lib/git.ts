import { execFile } from 'node:child_process';
import fs from 'node:fs';
import { promisify } from 'node:util';
import path from 'node:path';
import { vaultRoot } from './vault/paths';
import { refusalFor, scanText, type SecretHit } from './secrets';

const run = promisify(execFile);

/** Field separator for --pretty; git emits it from the %x1f escape. */
const SEP = String.fromCharCode(31);

/**
 * Every git call is execFile with an argument array — no shell, so no amount of
 * odd characters in a filename or commit message can become a command.
 */
async function git(args: string[], cwd = vaultRoot()): Promise<string> {
  const { stdout } = await run('git', args, {
    cwd,
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, GIT_PAGER: 'cat', GIT_TERMINAL_PROMPT: '0' },
  });
  return stdout;
}

export type RepoState =
  | { kind: 'ok' }
  | { kind: 'not-a-repo' }
  | { kind: 'nested'; toplevel: string };

/**
 * The vault must be the root of its own repository. If git resolves to a parent
 * repo — the app's own, say — committing would sweep up source code and the diff
 * on screen would be a lie.
 */
export async function repoState(): Promise<RepoState> {
  try {
    const toplevel = (await git(['rev-parse', '--show-toplevel'])).trim();
    // Compared after resolving symlinks, not as strings. git reports the real
    // path, and a vault anywhere behind a link — /tmp and /var on macOS, or a
    // home directory that is one — resolves differently on our side. The two
    // spellings name the same folder, and treating them as different disables
    // saving on a vault that is perfectly fine.
    if (real(toplevel) !== real(vaultRoot())) {
      return { kind: 'nested', toplevel };
    }
    return { kind: 'ok' };
  } catch {
    return { kind: 'not-a-repo' };
  }
}

function real(p: string): string {
  try {
    return fs.realpathSync(path.resolve(p));
  } catch {
    return path.resolve(p);
  }
}

export type FileStatus = 'added' | 'changed' | 'deleted';
export type ChangedFile = { path: string; status: FileStatus };

export async function changedFiles(): Promise<ChangedFile[]> {
  const tracked = await git(['diff', 'HEAD', '--name-status', '--no-renames']).catch(() => '');
  const files: ChangedFile[] = [];

  for (const line of tracked.split('\n')) {
    if (!line.trim()) continue;
    const [code, file] = line.split('\t');
    if (!file) continue;
    files.push({
      path: file,
      status: code?.startsWith('A') ? 'added' : code?.startsWith('D') ? 'deleted' : 'changed',
    });
  }

  // Untracked files are changes too, and are listed alongside the rest.
  const untracked = await git(['ls-files', '--others', '--exclude-standard']).catch(() => '');
  for (const file of untracked.split('\n')) {
    if (file.trim()) files.push({ path: file.trim(), status: 'added' });
  }

  return files.sort((a, b) => a.path.localeCompare(b.path));
}

export type DiffRow =
  | { kind: 'ctx'; line: number; text: string }
  | { kind: 'chg'; line: number; before: string; after: string }
  | { kind: 'add'; line: number; text: string }
  | { kind: 'del'; line: number; text: string };

export type FileDiff = {
  path: string;
  status: FileStatus;
  hunk: string;
  rows: DiffRow[];
  additions: number;
  deletions: number;
};

/**
 * Turns a unified diff into the paired model the Changelog screen draws: a run of
 * removed lines and the run of added lines that follows it are zipped into `chg`
 * rows, so side-by-side has something to put opposite each other. What is left
 * over stays `del` or `add`.
 */
export function parseUnified(diff: string, status: FileStatus): { hunk: string; rows: DiffRow[] } {
  const rows: DiffRow[] = [];
  let hunk = '';
  let lineNo = 0;

  let removed: string[] = [];
  let added: string[] = [];
  let pendingAt = 0;

  const flush = () => {
    const pairs = Math.min(removed.length, added.length);
    for (let i = 0; i < pairs; i++) {
      rows.push({ kind: 'chg', line: pendingAt + i, before: removed[i]!, after: added[i]! });
    }
    for (let i = pairs; i < removed.length; i++) {
      rows.push({ kind: 'del', line: pendingAt + i, text: removed[i]! });
    }
    for (let i = pairs; i < added.length; i++) {
      rows.push({ kind: 'add', line: pendingAt + i, text: added[i]! });
    }
    removed = [];
    added = [];
  };

  const SKIP = [
    'diff ',
    'index ',
    '--- ',
    '+++ ',
    'new file',
    'deleted file',
    'similarity ',
    'rename ',
    '\\ No newline',
  ];

  for (const line of diff.split('\n')) {
    if (line.startsWith('@@')) {
      flush();
      if (!hunk) {
        const end = line.indexOf('@@', 2);
        hunk = end > 0 ? line.slice(0, end + 2) : line;
      }
      const m = /\+(\d+)/.exec(line);
      lineNo = m ? Number(m[1]) : 1;
      continue;
    }
    if (SKIP.some((prefix) => line.startsWith(prefix))) continue;

    if (line.startsWith('-')) {
      if (added.length) flush();
      if (!removed.length) pendingAt = lineNo;
      removed.push(line.slice(1));
      continue;
    }
    if (line.startsWith('+')) {
      if (!added.length && !removed.length) pendingAt = lineNo;
      added.push(line.slice(1));
      lineNo++;
      continue;
    }
    flush();
    if (line.startsWith(' ')) {
      rows.push({ kind: 'ctx', line: lineNo, text: line.slice(1) });
      lineNo++;
    }
  }
  flush();

  return { hunk: hunk || (status === 'added' ? `@@ -0,0 +1,${rows.length} @@` : ''), rows };
}

export async function fileDiffs(files: ChangedFile[]): Promise<FileDiff[]> {
  const out: FileDiff[] = [];

  for (const file of files) {
    let raw = '';
    try {
      raw = await git([
        'diff',
        'HEAD',
        '--no-color',
        '--unified=3',
        '--no-renames',
        '--',
        file.path,
      ]);
    } catch (err) {
      raw = (err as { stdout?: string }).stdout ?? '';
    }

    if (!raw.trim()) {
      // Untracked: diff against /dev/null so a new file renders like every other
      // change instead of vanishing from the view. Exits 1 by design, so read stdout.
      raw = await git([
        'diff',
        '--no-index',
        '--no-color',
        '--unified=3',
        '--',
        '/dev/null',
        file.path,
      ]).catch((err: { stdout?: string }) => err.stdout ?? '');
    }

    const { hunk, rows } = parseUnified(raw, file.status);
    out.push({
      path: file.path,
      status: file.status,
      hunk,
      rows,
      additions: rows.filter((r) => r.kind === 'add' || r.kind === 'chg').length,
      deletions: rows.filter((r) => r.kind === 'del' || r.kind === 'chg').length,
    });
  }

  return out;
}

export type Commit = { hash: string; message: string; when: string; pushed: boolean };

async function unpushedHashes(): Promise<Set<string>> {
  try {
    const out = await git(['rev-list', '--abbrev-commit', '@{u}..HEAD']);
    return new Set(
      out
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    );
  } catch {
    // No upstream configured: nothing has been pushed, so nothing counts as pushed.
    return new Set();
  }
}

export async function recentCommits(limit = 8): Promise<Commit[]> {
  // With no upstream, nothing has been pushed — the empty unpushed set must not
  // be read as "everything is safely on a remote", which is the opposite.
  const tracked = (await upstream()) !== null;
  const unpushed = await unpushedHashes();
  const log = await git([
    'log',
    `-${limit}`,
    '--no-color',
    '--date=relative',
    `--pretty=format:%h%x1f%s%x1f%ad`,
  ]).catch(() => '');

  return log
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash = '', message = '', when = ''] = line.split(SEP);
      return { hash, message, when, pushed: tracked && !unpushed.has(hash) };
    });
}

export type Upstream = { remote: string; branch: string; url: string };

/**
 * Where a push would actually go, read from git rather than from configuration,
 * because git is what `git push` obeys.
 *
 * The Push confirmation used to name "GitHub" and "origin/main" as literals, on
 * the one irreversible operation in the app — so a vault whose upstream is a
 * company GitLab, or a colleague's fork, was sent there under a dialog that said
 * otherwise. VAULT_GIT_REMOTE was the same mistake from the other side: a second
 * place to write the answer down, which nothing read.
 */
export async function upstream(): Promise<Upstream | null> {
  try {
    const ref = (await git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'])).trim();
    const slash = ref.indexOf('/');
    if (slash < 0) return null;
    const remote = ref.slice(0, slash);
    const url = (await git(['remote', 'get-url', remote])).trim();
    return { remote, branch: ref.slice(slash + 1), url };
  } catch {
    return null;
  }
}

export async function unpushedCount(): Promise<number> {
  return (await unpushedHashes()).size;
}

/**
 * True only when the remote genuinely holds nothing yet. The stronger warning has
 * to be rare — shown on every push it becomes noise and stops being read.
 */
export async function isFirstPush(): Promise<boolean> {
  try {
    const count = await git(['rev-list', '--count', '@{u}']);
    return Number(count.trim()) === 0;
  } catch {
    return true;
  }
}

export async function commitAll(message: string): Promise<{ files: number }> {
  const files = await changedFiles();
  if (files.length === 0) throw new Error('Nothing to save. The vault matches what you see.');

  // Checked here rather than only in a git hook, because this is how the vault
  // is actually committed — through the app, not the command line. A key that
  // reaches a commit has to be rotated; one that reaches a push has left the
  // machine.
  const hits = scanChanged(files.map((f) => f.path));
  if (hits.length > 0) throw new Error(refusalFor(hits));

  await git(['add', '--all', '--', '.']);
  const subject = message.trim() || `data: update ${new Date().toISOString().slice(0, 10)}`;
  await git(['commit', '-m', subject]);
  return { files: files.length };
}

/** Returns where it went, so the message the user reads is not a guess. */
export async function push(): Promise<Upstream> {
  const target = await upstream();
  if (!target) {
    throw new Error('No remote configured. Saving works; sharing needs a remote.');
  }
  await git(['push']);
  return target;
}

/**
 * Reads each changed file from disk and scans it. Deleted files are skipped —
 * there is nothing to leak in a file that is going away — and anything unreadable
 * as text is skipped too, since a credential in a binary is not a shape this can
 * recognise anyway.
 */
function scanChanged(paths: string[]): SecretHit[] {
  const hits: SecretHit[] = [];
  for (const rel of paths) {
    let text: string;
    try {
      text = fs.readFileSync(path.join(vaultRoot(), rel), 'utf8');
    } catch {
      continue;
    }
    hits.push(...scanText(rel, text));
  }
  return hits;
}
