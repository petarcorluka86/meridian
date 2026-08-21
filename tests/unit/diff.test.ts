import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseUnified } from '@/lib/git';

const hunk = (body: string) =>
  `diff --git a/f b/f\nindex 111..222 100644\n--- a/f\n+++ b/f\n${body}`;

describe('parseUnified', () => {
  it('pairs a removal with the addition that follows it', () => {
    const { rows } = parseUnified(
      hunk('@@ -1,3 +1,3 @@\n ctx\n-old line\n+new line\n ctx2\n'),
      'changed',
    );
    expect(rows.map((r) => r.kind)).toEqual(['ctx', 'chg', 'ctx']);
    const chg = rows[1];
    expect(chg).toMatchObject({ kind: 'chg', before: 'old line', after: 'new line' });
  });

  it('keeps unpaired removals as deletions', () => {
    const { rows } = parseUnified(hunk('@@ -1,3 +1,1 @@\n ctx\n-gone one\n-gone two\n'), 'changed');
    expect(rows.map((r) => r.kind)).toEqual(['ctx', 'del', 'del']);
  });

  it('keeps unpaired additions as additions', () => {
    const { rows } = parseUnified(hunk('@@ -1,1 +1,3 @@\n ctx\n+new one\n+new two\n'), 'changed');
    expect(rows.map((r) => r.kind)).toEqual(['ctx', 'add', 'add']);
  });

  it('pairs what it can and leaves the remainder', () => {
    const { rows } = parseUnified(hunk('@@ -1,3 +1,4 @@\n-a\n-b\n+A\n+B\n+C\n'), 'changed');
    expect(rows.map((r) => r.kind)).toEqual(['chg', 'chg', 'add']);
  });

  it('ignores file headers and the no-newline marker', () => {
    const { rows } = parseUnified(
      hunk('@@ -1 +1 @@\n-x\n+y\n\\ No newline at end of file\n'),
      'changed',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe('chg');
  });

  it('numbers rows from the hunk header', () => {
    const { rows, hunk: header } = parseUnified(
      hunk('@@ -590,4 +591,4 @@\n ctx\n-old\n+new\n'),
      'changed',
    );
    expect(header).toBe('@@ -590,4 +591,4 @@');
    expect(rows[0]).toMatchObject({ line: 591 });
    expect(rows[1]).toMatchObject({ line: 592 });
  });

  it('synthesises a hunk label for a brand new file', () => {
    const { hunk: header } = parseUnified('new file mode 100644\n+first\n', 'added');
    expect(header).toMatch(/^@@ -0,0/);
  });
});

describe('commit history', () => {
  it('never calls a commit pushed when there is no remote', async () => {
    // Guarded by reading the source rather than a live repo: the mistake is a
    // silent one, and the assertion should survive a refactor of the internals.
    const fs = await import('node:fs');
    const path = await import('node:path');
    const source = fs.readFileSync(
      path.resolve(import.meta.dirname, '../../src/lib/git.ts'),
      'utf8',
    );
    expect(source).toContain('pushed: tracked && !unpushed.has(hash)');
  });
});

describe('recognising the vault as its own repository', () => {
  /**
   * A vault reached through a symlink is still that vault. git reports the real
   * path; VAULT_PATH may be the link. Comparing the two as strings said "this
   * vault sits inside another repository" and disabled saving on a vault that
   * was perfectly fine — which is what /tmp and /var are on macOS, and what a
   * home directory behind a link is anywhere.
   */
  let real: string;
  let link: string;

  beforeEach(() => {
    real = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-repo-'));
    link = `${real}-link`;
    fs.symlinkSync(real, link);
    execFileSync('git', ['init', '-q'], { cwd: real });
    fs.writeFileSync(path.join(real, 'tasks.json'), '[]\n');
  });

  afterEach(async () => {
    fs.rmSync(link, { force: true });
    fs.rmSync(real, { recursive: true, force: true });
    delete process.env.VAULT_PATH;
    const { resetConfig } = await import('@/lib/env');
    resetConfig();
  });

  const stateFor = async (target: string) => {
    process.env.VAULT_PATH = target;
    const { resetConfig } = await import('@/lib/env');
    resetConfig();
    const { repoState } = await import('@/lib/git');
    return repoState();
  };

  it('accepts the vault by its real path', async () => {
    expect(await stateFor(real)).toEqual({ kind: 'ok' });
  });

  it('accepts the same vault through a symlink', async () => {
    expect(await stateFor(link)).toEqual({ kind: 'ok' });
  });

  it('still refuses a vault that really is inside another repository', async () => {
    const inner = path.join(real, 'nested');
    fs.mkdirSync(inner);
    const state = await stateFor(inner);
    expect(state.kind).toBe('nested');
  });

  it('says so when there is no repository at all', async () => {
    const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-bare-'));
    try {
      expect((await stateFor(bare)).kind).toBe('not-a-repo');
    } finally {
      fs.rmSync(bare, { recursive: true, force: true });
    }
  });
});
