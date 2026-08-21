import fs from 'node:fs';
import path from 'node:path';
import type { z } from 'zod';
import { loadConfig } from '@/lib/env';
import { isDisposable, vaultRoot } from './paths';
import { parseFrontmatter } from './frontmatter';
import {
  NoteFrontmatter,
  PersonEntry as PersonEntrySchema,
  PlanEntries,
  LinkEntries,
  TaskEntry as TaskEntrySchema,
  TimeEntry as TimeEntrySchema,
  VaultConfig,
  type NoteCategory,
  type PersonEntry,
  type PlanEntry,
  type LinkEntry,
  type TaskEntry,
  type TimeEntry,
} from './schemas';

export type VaultProblem = { path: string; message: string };

export type Note = {
  /** Vault-relative path. The note's identity — there is no separate id. */
  path: string;
  title: string;
  date: string | null;
  /** From the folder, never from front matter. */
  personSlug: string | null;
  location: 'person' | 'inbox' | 'general';
  category: NoteCategory;
  draft: boolean;
  pinned: boolean;
  body: string;
  mtimeMs: number;
};

export type VaultSnapshot = {
  root: string;
  people: PersonEntry[];
  peopleBySlug: Map<string, PersonEntry>;
  links: Map<string, LinkEntry[]>;
  plans: Map<string, PlanEntry[]>;
  about: Map<string, string>;
  notes: Note[];
  notesByPath: Map<string, Note>;
  notesByPerson: Map<string, Note[]>;
  tasks: TaskEntry[];
  tasksById: Map<string, TaskEntry>;
  time: TimeEntry[];
  config: z.infer<typeof VaultConfig>;
  problems: VaultProblem[];
  builtAt: number;
};

let snapshot: VaultSnapshot | null = null;
let watcher: fs.FSWatcher | null = null;
/** Which folder the watcher above is actually watching, which is not always the configured one. */
let watchedRoot: string | null = null;
let rebuildTimer: NodeJS.Timeout | null = null;

const NOTE_NAME = /^(\d{4}-\d{2}-\d{2})-(.+)\.md$/;

/**
 * Absent and unreadable are different facts, and only one of them is ordinary.
 * A vault is scaffolded lazily, so a person with no `about.md` is nothing to
 * report. A file that exists and will not open is, and reading it as "nothing
 * there" is how a permission error becomes "you have no tasks" — or, when the
 * read is not guarded at all, how one file takes down every screen that touches
 * the index. ENOENT is the only silence.
 */
function readTextFile(
  root: string,
  rel: string,
  problems: VaultProblem[],
): { text: string | null; unreadable: boolean } {
  try {
    return { text: fs.readFileSync(path.join(root, rel), 'utf8'), unreadable: false };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { text: null, unreadable: false };
    }
    problems.push({ path: rel, message: `Could not be read — ${(err as Error).message}` });
    return { text: null, unreadable: true };
  }
}

function readJsonFile<T>(
  root: string,
  rel: string,
  schema: z.ZodType<T>,
  fallback: T,
  problems: VaultProblem[],
): T {
  const { text: raw } = readTextFile(root, rel, problems);
  if (raw === null) return fallback;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    problems.push({ path: rel, message: `Not valid JSON — ${(err as Error).message}` });
    return fallback;
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    const first = result.error.issues[0];
    problems.push({
      path: rel,
      message: first
        ? `${first.path.join('.') || 'root'}: ${first.message}`
        : 'Does not match the expected shape',
    });
    return fallback;
  }
  return result.data;
}

/**
 * Arrays are validated one row at a time. A single malformed task must cost you
 * that task, not the whole file — losing 200 good rows to one typo is exactly the
 * failure this app exists to avoid.
 */
function readJsonArray<T>(
  root: string,
  rel: string,
  item: z.ZodType<T>,
  problems: VaultProblem[],
): { rows: T[]; readable: boolean } {
  const { text: raw, unreadable } = readTextFile(root, rel, problems);
  // A roster that is merely absent leaves every folder genuinely unlisted, which
  // is worth reporting. A roster that will not open makes every folder *look*
  // unlisted, which buries the real cause under one line per person.
  if (raw === null) return { rows: [], readable: !unreadable };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    problems.push({ path: rel, message: `Not valid JSON — ${(err as Error).message}` });
    return { rows: [], readable: false };
  }
  if (!Array.isArray(parsed)) {
    problems.push({ path: rel, message: 'Expected a JSON array' });
    return { rows: [], readable: false };
  }

  const rows: T[] = [];
  parsed.forEach((row, i) => {
    const result = item.safeParse(row);
    if (result.success) {
      rows.push(result.data);
      return;
    }
    const first = result.error.issues[0];
    const where = first?.path.length ? first.path.join('.') : 'row';
    problems.push({
      path: rel,
      message: `entry ${i} (${where}): ${first?.message ?? 'does not match the expected shape'} — this entry is skipped, the rest still load.`,
    });
  });
  return { rows, readable: true };
}

function titleOf(body: string, fileName: string): string {
  const heading = /^#\s+(.+)$/m.exec(body);
  if (heading?.[1]) return heading[1].trim();
  const stripped = fileName.replace(/\.md$/, '').replace(NOTE_NAME, '$2');
  return stripped.replace(/-/g, ' ');
}

function readNote(root: string, rel: string, problems: VaultProblem[]): Note | null {
  const abs = path.join(root, rel);
  let raw: string;
  let mtimeMs: number;
  try {
    raw = fs.readFileSync(abs, 'utf8');
    mtimeMs = fs.statSync(abs).mtimeMs;
  } catch (err) {
    problems.push({ path: rel, message: `Could not read — ${(err as Error).message}` });
    return null;
  }

  const { data, body } = parseFrontmatter(raw);
  const meta = NoteFrontmatter.parse(data);
  const fileName = path.basename(rel);
  const dateMatch = NOTE_NAME.exec(fileName);

  const segments = rel.split('/');
  let personSlug: string | null = null;
  let location: Note['location'] = 'general';
  if (segments[0] === 'people' && segments[1] && !segments[1].startsWith('_')) {
    personSlug = segments[1];
    location = 'person';
  } else if (segments[0] === 'notes' && segments[1] === 'inbox') {
    location = 'inbox';
  }

  return {
    path: rel,
    title: titleOf(body, fileName),
    date: dateMatch?.[1] ?? null,
    personSlug,
    location,
    category: meta.category,
    draft: meta.draft,
    pinned: meta.pinned,
    body,
    mtimeMs,
  };
}

/**
 * A note lives in one of exactly three places. Anything else that happens to be
 * Markdown — the vault's own README, an about.md, a stray file someone dropped
 * in — is not a note and must not appear in the Notes list.
 */
export function isNotePathForTests(rel: string): boolean {
  return isNotePath(rel);
}

function isNotePath(rel: string): boolean {
  if (!rel.endsWith('.md')) return false;
  const segments = rel.split('/');
  if (segments[0] === 'notes' && (segments[1] === 'inbox' || segments[1] === 'general')) {
    return segments.length === 3;
  }
  if (segments[0] === 'people' && segments[2] === 'notes') return segments.length === 4;
  return false;
}

function walk(root: string, rel: string, out: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(path.join(root, rel), { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.name.startsWith('.')) continue;
    if (isDisposable(childRel)) continue;
    if (entry.isDirectory()) walk(root, childRel, out);
    else if (entry.isFile()) out.push(childRel);
  }
}

export function buildSnapshot(): VaultSnapshot {
  const root = vaultRoot();
  const problems: VaultProblem[] = [];

  const peopleRead = readJsonArray(root, 'people/entries.json', PersonEntrySchema, problems);
  const people = peopleRead.rows;
  const tasks = readJsonArray(root, 'tasks.json', TaskEntrySchema, problems).rows;
  const time = readJsonArray(root, 'time.json', TimeEntrySchema, problems).rows;
  const config = readJsonFile(root, 'config.json', VaultConfig, VaultConfig.parse({}), problems);

  const files: string[] = [];
  walk(root, '', files);

  const links = new Map<string, LinkEntry[]>();
  const plans = new Map<string, PlanEntry[]>();
  const about = new Map<string, string>();
  const notes: Note[] = [];

  const peopleBySlug = new Map(people.map((p) => [p.slug, p]));

  for (const rel of files) {
    const segments = rel.split('/');
    if (segments[0] === 'people' && segments.length >= 3) {
      const slug = segments[1]!;
      const tail = segments.slice(2).join('/');
      if (tail === 'links.json')
        links.set(slug, readJsonFile(root, rel, LinkEntries, [], problems));
      else if (tail === 'plans.json')
        plans.set(slug, readJsonFile(root, rel, PlanEntries, [], problems));
      else if (tail === 'about.md') {
        const { text } = readTextFile(root, rel, problems);
        if (text !== null) about.set(slug, text);
      }
    }
    if (!isNotePath(rel)) continue;
    const note = readNote(root, rel, problems);
    if (note) notes.push(note);
  }

  // A person folder with no matching roster entry, or the reverse, is a real
  // problem the user has to see — silently repairing it orphans their notes.
  const folders = new Set(
    files
      .filter((f) => f.startsWith('people/') && f.split('/').length >= 3)
      .map((f) => f.split('/')[1]!)
      .filter((s) => !s.startsWith('_')),
  );
  for (const slug of folders) {
    // Only meaningful when the roster itself parsed — otherwise every folder looks
    // orphaned and the real cause is buried.
    if (peopleRead.readable && !peopleBySlug.has(slug)) {
      problems.push({
        path: `people/${slug}/`,
        message: `Folder has no matching slug in people/entries.json — ${slug} will not appear on the roster.`,
      });
    }
  }

  const notesByPath = new Map(notes.map((n) => [n.path, n]));
  const notesByPerson = new Map<string, Note[]>();
  for (const note of notes) {
    if (!note.personSlug) continue;
    const list = notesByPerson.get(note.personSlug) ?? [];
    list.push(note);
    notesByPerson.set(note.personSlug, list);
  }
  for (const list of notesByPerson.values()) {
    list.sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? 1 : -1));
  }

  return {
    root,
    people,
    peopleBySlug,
    links,
    plans,
    about,
    notes,
    notesByPath,
    notesByPerson,
    tasks,
    tasksById: new Map(tasks.map((t) => [t.id, t])),
    time,
    config,
    problems,
    builtAt: Date.now(),
  };
}

/**
 * Everything reads through here. The first call walks the folder; every call after
 * reads memory until the watcher says otherwise.
 */
export function getVault(): VaultSnapshot {
  const root = loadConfig().vaultPath;
  if (!root) {
    throw new Error('VAULT_PATH is not set');
  }
  // The setup wizard can point VAULT_PATH at a different folder while the server
  // is running, and env-write.ts resets the config the moment it does. Without
  // this the index and the watcher stay on the old folder: every screen keeps
  // showing the previous vault while every save resolves against the new one and
  // fails with "no longer exists". Checked here so nothing has to remember.
  if (snapshot && snapshot.root !== root) snapshot = null;
  if (!snapshot) {
    snapshot = buildSnapshot();
    startWatching(root);
  }
  return snapshot;
}

/** Called after our own writes so the next read does not wait for the watcher. */
export function invalidateVault(): void {
  snapshot = null;
}

function startWatching(root: string): void {
  if (watcher && watchedRoot === root) return;

  watcher?.close();
  watcher = null;
  watchedRoot = null;

  try {
    const next = fs.watch(root, { recursive: true }, (_event, filename) => {
      if (filename && isDisposable(String(filename).split(path.sep).join('/'))) return;
      if (rebuildTimer) clearTimeout(rebuildTimer);
      rebuildTimer = setTimeout(() => {
        snapshot = null;
      }, 50);
    });
    // A folder that goes away — deleted, unmounted, an external disk pulled —
    // emits an error, and an unhandled one on an FSWatcher takes down the
    // process. The next read rebuilds and reports whatever it finds instead.
    next.on('error', () => {
      watcher = null;
      watchedRoot = null;
      snapshot = null;
    });
    next.unref?.();
    watcher = next;
    watchedRoot = root;
  } catch {
    // Watching is an optimisation for external edits, not a requirement. Without
    // it the app still works; it just needs a reload to notice a hand edit.
    watcher = null;
  }
}
