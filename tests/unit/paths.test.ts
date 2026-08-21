import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isDisposable } from '@/lib/vault/paths';

/**
 * What the watcher ignores decides whether the in-memory index survives.
 *
 * The app writes into the vault for its own reasons — a probe to check the
 * folder is writable, a temp file every atomic write renames from — and the
 * watcher used to treat those as somebody editing the vault. The root layout
 * probes on every render, so every page load threw the index away and rebuilt
 * it: five rebuilds from five renders, 81–117 ms each on a mature vault, in the
 * request path.
 */
describe('what the watcher ignores', () => {
  it('ignores the caches, which are not the vault', () => {
    expect(isDisposable('.cache')).toBe(true);
    expect(isDisposable('.cache/bamboohr.json')).toBe(true);
    expect(isDisposable('.snapshots')).toBe(true);
    expect(isDisposable('.snapshots/tasks.json/2026-08-19T00-00-00-000Z.json')).toBe(true);
  });

  it("ignores the app's own bookkeeping", () => {
    expect(isDisposable('.meridian-write-check-1234')).toBe(true);
    expect(isDisposable('tasks.json.tmp.1234')).toBe(true);
    expect(isDisposable('people/entries.json.tmp.99')).toBe(true);
  });

  it('does not ignore anything a person would edit', () => {
    expect(isDisposable('tasks.json')).toBe(false);
    expect(isDisposable('time.json')).toBe(false);
    expect(isDisposable('config.json')).toBe(false);
    expect(isDisposable('people/entries.json')).toBe(false);
    expect(isDisposable('people/ana-horvat/about.md')).toBe(false);
    expect(isDisposable('notes/general/2026-08-14-a.md')).toBe(false);
    expect(isDisposable('README.md')).toBe(false);
  });

  it('does not ignore a folder that merely starts with the same letters', () => {
    // `.cachexyz` is somebody's folder, not ours.
    expect(isDisposable('.cachexyz/a.json')).toBe(false);
    expect(isDisposable('.snapshotsold')).toBe(false);
    // And a note that genuinely ends in something tmp-shaped is still a note.
    expect(isDisposable('notes/general/tmp.md')).toBe(false);
  });
});

/**
 * "Every write goes through src/lib/vault/write.ts" is written in CLAUDE.md as
 * an absolute rule, and eight files write to disk directly. Most are right to —
 * `.env`, the caches and the egress log are not vault records and must not be
 * snapshotted — but a rule with seven silent exceptions is a rule nobody can rely
 * on, and three other invariants in this codebase have a gate while this one had
 * none.
 *
 * So the exceptions are named. A new one has to be added here deliberately,
 * which is the point.
 */
describe('who is allowed to write to disk', () => {
  const ALLOWED = new Set([
    // The vault write path itself: snapshot, mtime check, atomic rename.
    'lib/vault/write.ts',
    // Credentials. Not a vault record, and mode 0600 rather than snapshotted.
    'lib/env-write.ts',
    // Disposable caches, written temp-then-rename but never snapshotted: a
    // snapshot of fetched data would be a second copy of a salary on disk.
    'lib/sources/cache.ts',
    'lib/sources/bamboohr/client.ts',
    // Append-only audit log. A rewrite would defeat the point of it.
    'lib/sources/egress.ts',
    // Scaffolding a new vault and probing that it is writable, both of which
    // happen before there is a vault to write through.
    'lib/vault/health.ts',
    'app/setup/actions.ts',
    // The format version, which is what the write path would be migrating.
    'lib/vault/migrate.ts',
  ]);

  it('is exactly the list above', () => {
    const root = path.resolve(import.meta.dirname, '../../src');
    const found = new Set<string>();

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name)) continue;
        const source = fs.readFileSync(full, 'utf8');
        if (/fs\.(write|append)FileSync|fs\.promises\.(write|append)File/.test(source)) {
          found.add(path.relative(root, full).split(path.sep).join('/'));
        }
      }
    };
    walk(root);

    expect([...found].sort()).toEqual([...ALLOWED].sort());
  });
});
