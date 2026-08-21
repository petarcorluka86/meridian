import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetConfig } from '@/lib/env';

/**
 * Committing is how the vault leaves this process, and pushing is how it leaves
 * the machine. Both were untested: `scanText` had eleven tests over its regexes
 * and nothing asserted that commitAll actually consults it, on the right files,
 * before `git add`. That wiring is the whole control — CLAUDE.md names it as what
 * stands between a pasted key and a push — and it is the kind that breaks
 * silently, because a commit that goes through looks exactly like a commit that
 * was checked.
 */
let vault: string;

const git = (...args: string[]) =>
  execFileSync('git', args, { cwd: vault, encoding: 'utf8' }).trim();

const write = (rel: string, body: string) => {
  const full = path.join(vault, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, body);
};

/** A token-shaped string, assembled so this file is not itself a scanner hit. */
const FAKE_TOKEN = `ghp_${'a1b2c3d4e5'.repeat(4)}`;

beforeEach(() => {
  vault = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-commit-'));
  process.env.VAULT_PATH = vault;
  resetConfig();

  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  // A hook installed in the developer's own git template must not decide the
  // outcome of these tests.
  git('config', 'core.hooksPath', path.join(vault, '.git', 'no-hooks'));

  write('.gitignore', '.cache/\n.snapshots/\n');
  write('tasks.json', '[]\n');
  git('add', '--all');
  git('commit', '-qm', 'init');
});

afterEach(() => {
  fs.rmSync(vault, { recursive: true, force: true });
  delete process.env.VAULT_PATH;
  resetConfig();
});

describe('a credential never reaches a commit', () => {
  it('refuses, names the file and line, and leaves git untouched', async () => {
    const { commitAll } = await import('@/lib/git');
    write('notes/general/2026-08-20-leak.md', `# Notes\n\nkey was ${FAKE_TOKEN}\n`);
    write('notes/general/2026-08-20-clean.md', '# Clean\n\nnothing here\n');

    await expect(commitAll('should not happen')).rejects.toThrow(
      /notes\/general\/2026-08-20-leak\.md:3 — looks like a GitHub token/,
    );

    // Before `git add`, not after: nothing staged, nothing committed.
    expect(git('log', '--oneline')).toBe(git('log', '--oneline', '-1'));
    expect(git('diff', '--cached', '--name-only')).toBe('');
  });

  it('never quotes the value it found', async () => {
    const { commitAll } = await import('@/lib/git');
    write('notes/general/2026-08-20-leak.md', `# Notes\n\n${FAKE_TOKEN}\n`);

    // The refusal is read on screen and lands in a toast; repeating the secret
    // there puts a second copy of it somewhere new.
    await expect(commitAll('')).rejects.toThrow(
      expect.not.stringContaining(FAKE_TOKEN) as unknown as string,
    );
  });

  it('checks a file that is only staged, not just an unstaged edit', async () => {
    const { commitAll } = await import('@/lib/git');
    write('notes/general/2026-08-20-leak.md', `# Notes\n\n${FAKE_TOKEN}\n`);
    git('add', '--all');

    await expect(commitAll('')).rejects.toThrow(/looks like a GitHub token/);
  });

  it('commits everything once the credential is gone', async () => {
    const { commitAll } = await import('@/lib/git');
    write('notes/general/2026-08-20-note.md', '# Notes\n\nnothing here\n');
    write('tasks.json', '[{"note":"changed"}]\n');

    const { files } = await commitAll('a real save');

    expect(files).toBe(2);
    expect(git('log', '-1', '--pretty=%s')).toBe('a real save');
    expect(git('status', '--porcelain')).toBe('');
  });

  it('dates the commit itself when no message is given', async () => {
    const { commitAll } = await import('@/lib/git');
    write('tasks.json', '[{"note":"changed"}]\n');

    await commitAll('   ');
    expect(git('log', '-1', '--pretty=%s')).toMatch(/^data: update \d{4}-\d{2}-\d{2}$/);
  });

  it('says there is nothing to save rather than making an empty commit', async () => {
    const { commitAll } = await import('@/lib/git');
    await expect(commitAll('nothing changed')).rejects.toThrow(/Nothing to save/);
    expect(git('log', '--oneline')).toBe(git('log', '--oneline', '-1'));
  });
});

/**
 * Where a push goes used to be a literal. The dialog said "Push to GitHub?" and
 * "sends them to origin/main", and the toast said "Pushed to origin/main." — on
 * the one operation in the app that cannot be taken back, for a vault holding
 * evaluations and pay figures. Whatever `git push` actually obeys is the only
 * honest answer, so it is read rather than assumed.
 */
describe('where a push would go', () => {
  it('is nothing when no branch is tracking', async () => {
    const { upstream, push } = await import('@/lib/git');
    expect(await upstream()).toBeNull();
    await expect(push()).rejects.toThrow(/No remote configured/);
  });

  it('names the remote, the branch and the url git reports', async () => {
    const { upstream } = await import('@/lib/git');
    const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-remote-'));
    try {
      execFileSync('git', ['init', '-q', '--bare'], { cwd: bare });
      // Deliberately not "origin/main": a vault pointed at a company GitLab, or
      // a colleague's fork, was pushed under a dialog that claimed otherwise.
      git('remote', 'add', 'backup', bare);
      git('branch', '-M', 'trunk');
      git('push', '-q', '-u', 'backup', 'trunk');

      expect(await upstream()).toEqual({ remote: 'backup', branch: 'trunk', url: bare });
    } finally {
      fs.rmSync(bare, { recursive: true, force: true });
    }
  });

  it('reports what it pushed to, not what it hoped', async () => {
    const { push } = await import('@/lib/git');
    const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-remote-'));
    try {
      execFileSync('git', ['init', '-q', '--bare'], { cwd: bare });
      git('remote', 'add', 'backup', bare);
      git('branch', '-M', 'trunk');
      git('push', '-q', '-u', 'backup', 'trunk');

      write('tasks.json', '[{"note":"changed"}]\n');
      git('commit', '-qam', 'another');

      expect(await push()).toMatchObject({ remote: 'backup', branch: 'trunk' });
    } finally {
      fs.rmSync(bare, { recursive: true, force: true });
    }
  });
});
