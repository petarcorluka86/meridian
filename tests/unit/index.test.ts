import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetConfig } from '@/lib/env';

/**
 * The read path: one walk of the folder, everything validated, and a list of
 * what could not be. It is the largest file in lib/ and had no test of its own —
 * every other test reached it sideways.
 *
 * The rule it exists to hold is "a malformed file costs only itself". Now that
 * the write path keeps the same promise, both sides are pinned.
 */
let dir: string;

const write = (rel: string, body: string) => {
  const full = path.join(dir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, body);
};

const task = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  title: `Task ${id}`,
  description: null,
  priority: 'normal',
  dueDate: null,
  status: 'todo',
  kind: 'task',
  personSlug: null,
  completedAt: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  ...over,
});

const person = (slug: string, over: Record<string, unknown> = {}) => ({
  slug,
  displayName: slug,
  hr: {
    jobTitle: null,
    department: null,
    hireDate: null,
    supervisorEmployeeId: null,
    workEmail: null,
    workPhone: null,
    employeeId: null,
  },
  mine: { contactCadenceDays: 14, growth: { currentLevel: null, targetLevel: null } },
  status: 'active',
  ...over,
});

async function vault() {
  const { getVault, invalidateVault } = await import('@/lib/vault/index');
  invalidateVault();
  return getVault();
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-index-'));
  process.env.VAULT_PATH = dir;
  resetConfig();
  write('people/entries.json', '[]\n');
  write('tasks.json', '[]\n');
  write('time.json', '[]\n');
  write('config.json', '{"dataVersion":1}\n');
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  delete process.env.VAULT_PATH;
  resetConfig();
});

describe('a malformed file costs only itself', () => {
  it('keeps the good rows and names the bad one', async () => {
    write('tasks.json', JSON.stringify([task('a'), task('b', { dueDate: '2026-9-1' }), task('c')]));

    const { tasks, problems } = await vault();

    expect(tasks.map((t) => t.id)).toEqual(['a', 'c']);
    expect(problems).toHaveLength(1);
    expect(problems[0]?.path).toBe('tasks.json');
    expect(problems[0]?.message).toContain('entry 1');
    expect(problems[0]?.message).toContain('dueDate');
  });

  it('does not let one broken file empty another', async () => {
    write('tasks.json', 'not json at all');
    write(
      'time.json',
      JSON.stringify([
        {
          id: 'h1',
          date: '2026-08-12',
          hoursDelta: 1.5,
          note: '',
          createdAt: '2026-08-12T00:00:00.000Z',
          updatedAt: '2026-08-12T00:00:00.000Z',
        },
      ]),
    );

    const { tasks, time, problems } = await vault();

    expect(tasks).toEqual([]);
    expect(time).toHaveLength(1);
    expect(problems.map((p) => p.path)).toContain('tasks.json');
  });

  it('never reads a corrupt roster as "no people"', async () => {
    // The line CLAUDE.md singles out. An empty list and an unreadable list are
    // different facts, and only one of them is reported.
    write('people/entries.json', '[{"slug":"ana"},{"nonsense":true}]');

    const { problems } = await vault();
    expect(problems.filter((p) => p.path === 'people/entries.json').length).toBeGreaterThan(0);
  });

  it('says when a file is not a list at all', async () => {
    write('tasks.json', '{"tasks":[]}');
    const { problems } = await vault();
    expect(problems[0]?.message).toContain('array');
  });
});

/**
 * "A malformed file costs only itself" held for a file the app could parse and
 * reject. It did not hold for a file it could not open: `about.md` was read
 * without a guard, so one unreadable file threw out of buildSnapshot and every
 * screen that reads the vault answered 500 — with the message stripped in
 * production, and `vault:doctor` dying on the same line.
 *
 * Mode 000 is the trigger. A directory where a file belongs would be tidier —
 * same errno for every user — but `walk()` only collects `entry.isFile()`, so a
 * directory never reaches the read at all. Root can open mode 000 regardless, so
 * these skip there rather than passing for the wrong reason.
 */
describe('a file that will not open', () => {
  const asRoot = typeof process.getuid === 'function' && process.getuid() === 0;
  const shut = (rel: string) => fs.chmodSync(path.join(dir, rel), 0o000);

  it.skipIf(asRoot)('names an unreadable about.md and still loads everything else', async () => {
    write('people/entries.json', JSON.stringify([person('ana-horvat')]));
    write('tasks.json', JSON.stringify([task('a')]));
    write('notes/general/2026-08-14-real.md', '# Real\n');
    write('people/ana-horvat/about.md', 'Ana.\n');
    shut('people/ana-horvat/about.md');

    const { people, tasks, notes, problems } = await vault();

    expect(problems.map((p) => p.path)).toContain('people/ana-horvat/about.md');
    expect(problems.find((p) => p.path.endsWith('about.md'))?.message).toContain(
      'Could not be read',
    );
    // The point of the rule: the other three stores are untouched.
    expect(people).toHaveLength(1);
    expect(tasks).toHaveLength(1);
    expect(notes).toHaveLength(1);
  });

  it.skipIf(asRoot)('does not read an unreadable tasks.json as "no tasks"', async () => {
    shut('tasks.json');
    const { tasks, problems } = await vault();

    expect(tasks).toEqual([]);
    expect(problems.map((p) => p.path)).toContain('tasks.json');
  });

  it.skipIf(asRoot)(
    'does not make every folder look orphaned when the roster will not open',
    async () => {
      write('people/ana-horvat/about.md', 'Ana.\n');
      shut('people/entries.json');

      const { problems } = await vault();

      expect(problems.map((p) => p.path)).toContain('people/entries.json');
      // One cause, one line. Without this the real problem is buried under a
      // "no matching slug" per person.
      expect(problems.filter((p) => p.message.includes('no matching slug'))).toEqual([]);
    },
  );

  it('says nothing about a file that is merely absent', async () => {
    // A vault is scaffolded lazily and a person may never have written an about.
    write('people/entries.json', JSON.stringify([person('ana-horvat')]));
    write('people/ana-horvat/links.json', '[]\n');

    const { problems, about } = await vault();

    expect(problems).toEqual([]);
    expect(about.get('ana-horvat')).toBeUndefined();
  });

  it.skipIf(asRoot)('never throws, whichever single file is the unreadable one', async () => {
    // The guard for the next read added to the walk. buildSnapshot throwing is
    // not a degraded screen, it is every screen at once.
    const seed: Array<[string, string]> = [
      ['people/entries.json', JSON.stringify([person('ana-horvat')])],
      ['tasks.json', '[]\n'],
      ['time.json', '[]\n'],
      ['config.json', '{"dataVersion":1}\n'],
      ['people/ana-horvat/about.md', 'Ana.\n'],
      ['people/ana-horvat/links.json', '[]\n'],
      ['people/ana-horvat/plans.json', '[]\n'],
      ['people/ana-horvat/notes/2026-08-12-1on1.md', '# 1:1\n'],
      ['notes/general/2026-08-14-real.md', '# Real\n'],
    ];

    for (const [rel] of seed) {
      // Unlink needs the folder's permission, not the file's, so the previous
      // round's mode-000 file goes away cleanly.
      for (const [each] of seed) fs.rmSync(path.join(dir, each), { force: true });
      for (const [each, body] of seed) write(each, body);
      shut(rel);

      const snapshot = await vault();
      expect(
        snapshot.problems.map((p) => p.path),
        rel,
      ).toContain(rel);
    }
  });
});

/**
 * The wizard writes VAULT_PATH and env-write.ts resets the config, so the new
 * folder is live immediately — but the index and the watcher were bound to the
 * old one for the life of the process. Every screen kept showing the previous
 * vault while every save resolved against the new root and failed with "no
 * longer exists", and the wizard reported success either way.
 */
describe('the index follows VAULT_PATH', () => {
  it('rebuilds against the new folder without being told', async () => {
    write('people/entries.json', JSON.stringify([person('ana-horvat')]));
    expect((await vault()).people.map((p) => p.slug)).toEqual(['ana-horvat']);

    const moved = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-index-moved-'));
    try {
      fs.mkdirSync(path.join(moved, 'people'), { recursive: true });
      fs.writeFileSync(
        path.join(moved, 'people/entries.json'),
        JSON.stringify([person('marko-maric')]),
      );
      process.env.VAULT_PATH = moved;
      resetConfig();

      // Deliberately not invalidateVault(): the point is that no caller has to
      // remember, because the one that mattered — checkVaultAction — did not.
      const { getVault } = await import('@/lib/vault/index');
      const after = getVault();

      expect(after.root).toBe(moved);
      expect(after.people.map((p) => p.slug)).toEqual(['marko-maric']);
    } finally {
      fs.rmSync(moved, { recursive: true, force: true });
    }
  });
});

describe('what the walk finds', () => {
  it('reports a person folder with no entry rather than hiding it', async () => {
    write('people/entries.json', JSON.stringify([person('ana-horvat')]));
    write('people/marko-maric/about.md', 'A folder nobody listed.\n');

    const { problems } = await vault();
    const orphan = problems.find((p) => p.path.includes('marko-maric'));
    expect(orphan?.message).toContain('no matching slug');
  });

  it('takes a note’s person from its folder', async () => {
    write('people/entries.json', JSON.stringify([person('ana-horvat')]));
    write(
      'people/ana-horvat/notes/2026-08-12-1on1.md',
      '---\ncategory: 1:1\ndraft: false\npinned: false\n---\n\n# Talked about scope\n',
    );

    const { notes } = await vault();
    expect(notes).toHaveLength(1);
    expect(notes[0]?.personSlug).toBe('ana-horvat');
    expect(notes[0]?.date).toBe('2026-08-12');
  });

  it('does not walk the caches', async () => {
    write('.cache/photos/ana.png', 'not really a png');
    write('.snapshots/tasks.json/2026-08-19T00-00-00-000Z.json', 'nonsense');
    write('notes/general/2026-08-14-real.md', '---\ncategory: idea\n---\n\n# Real\n');

    const { notes, problems } = await vault();
    expect(notes).toHaveLength(1);
    expect(problems).toEqual([]);
  });

  it('does not count the vault README as a note', async () => {
    write('README.md', '# Vault\n\nNot a note.\n');
    const { notes } = await vault();
    expect(notes).toEqual([]);
  });
});
