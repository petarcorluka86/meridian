import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetConfig } from '@/lib/env';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-write-'));
  process.env.VAULT_PATH = dir;
  resetConfig();
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  delete process.env.VAULT_PATH;
  resetConfig();
});

describe('write path', () => {
  it('refuses to overwrite a file changed since it was read', async () => {
    const { readForUpdate, writeTextAtomic, VaultConflictError } = await import(
      '@/lib/vault/write'
    );
    fs.writeFileSync(path.join(dir, 'notes.md'), 'first\n');

    const seen = readForUpdate('notes.md')!;
    expect(seen.data).toBe('first\n');

    // Someone edits the file in an editor, or an agent writes it, in between.
    fs.writeFileSync(path.join(dir, 'notes.md'), 'edited elsewhere\n');
    const bumped = new Date(Date.now() + 5000);
    fs.utimesSync(path.join(dir, 'notes.md'), bumped, bumped);

    expect(() => writeTextAtomic('notes.md', 'mine\n', { expectMtimeMs: seen.mtimeMs })).toThrow(
      VaultConflictError,
    );
    expect(fs.readFileSync(path.join(dir, 'notes.md'), 'utf8')).toBe('edited elsewhere\n');
  });

  it('writes when the file has not moved', async () => {
    const { readForUpdate, writeTextAtomic } = await import('@/lib/vault/write');
    fs.writeFileSync(path.join(dir, 'notes.md'), 'first\n');
    const seen = readForUpdate('notes.md')!;
    writeTextAtomic('notes.md', 'second\n', { expectMtimeMs: seen.mtimeMs });
    expect(fs.readFileSync(path.join(dir, 'notes.md'), 'utf8')).toBe('second\n');
  });

  it('keeps the previous content in .snapshots before overwriting', async () => {
    const { writeTextAtomic } = await import('@/lib/vault/write');
    fs.writeFileSync(path.join(dir, 'notes.md'), 'original\n');
    writeTextAtomic('notes.md', 'replaced\n');

    const snapDir = path.join(dir, '.snapshots', 'notes.md');
    const kept = fs.readdirSync(snapDir);
    expect(kept).toHaveLength(1);
    expect(fs.readFileSync(path.join(snapDir, kept[0]!), 'utf8')).toBe('original\n');
  });

  it('leaves no temp file behind', async () => {
    const { writeTextAtomic } = await import('@/lib/vault/write');
    writeTextAtomic('a.json', '{}\n');
    expect(fs.readdirSync(dir).filter((f) => f.includes('.tmp.'))).toHaveLength(0);
  });

  it('refuses a path that escapes the vault', async () => {
    const { safeVaultPath, VaultPathError } = await import('@/lib/vault/paths');
    expect(() => safeVaultPath('../outside.md')).toThrow(VaultPathError);
    expect(() => safeVaultPath('people/../../outside.md')).toThrow(VaultPathError);
    expect(() => safeVaultPath('/etc/passwd')).toThrow(VaultPathError);
  });

  it('refuses a symlink that points out of the vault', async () => {
    const { safeVaultPath, VaultPathError } = await import('@/lib/vault/paths');
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-outside-'));
    fs.writeFileSync(path.join(outside, 'secret.txt'), 'x');
    fs.symlinkSync(outside, path.join(dir, 'escape'));
    try {
      expect(() => safeVaultPath('escape/secret.txt')).toThrow(VaultPathError);
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe('vault scaffolding', () => {
  it('writes .gitignore before anything can put salaries in git', async () => {
    const { vaultHealth } = await import('@/lib/vault/health');
    expect(vaultHealth().state).toBe('ok');

    const gitignore = fs.readFileSync(path.join(dir, '.gitignore'), 'utf8');
    // Both hold data pulled from elsewhere, or prior versions of your own.
    expect(gitignore).toContain('.cache/');
    expect(gitignore).toContain('.snapshots/');
  });

  it('creates the layout the app expects, and seeds empty files', async () => {
    const { vaultHealth } = await import('@/lib/vault/health');
    vaultHealth();
    for (const rel of ['people', 'notes/inbox', 'notes/general']) {
      expect(fs.existsSync(path.join(dir, rel))).toBe(true);
    }
    for (const rel of ['people/entries.json', 'tasks.json', 'time.json', 'config.json']) {
      expect(fs.existsSync(path.join(dir, rel))).toBe(true);
    }
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'tasks.json'), 'utf8'))).toEqual([]);
  });

  it('never overwrites what is already there', async () => {
    const { vaultHealth } = await import('@/lib/vault/health');
    fs.writeFileSync(path.join(dir, '.gitignore'), '# mine\n');
    fs.mkdirSync(path.join(dir, 'people'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'people/entries.json'), '[{"slug":"x","displayName":"X"}]');

    vaultHealth();

    expect(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8')).toBe('# mine\n');
    expect(fs.readFileSync(path.join(dir, 'people/entries.json'), 'utf8')).toContain('"slug":"x"');
  });
});

/**
 * The retry is the whole point of the read-modify-write loop: the app and an
 * agent can both write, and one must not silently lose the other's change.
 *
 * It had no test. Removing the retry entirely left all 127 other tests passing,
 * which is the argument for these.
 */
describe('the retry loop', () => {
  // Each bump has to be distinct: two writes in the same millisecond leave the
  // mtime unchanged, the conflict is not detected, and the test passes for the
  // wrong reason.
  let bump = 0;
  const laterThan = (file: string) => {
    bump += 1;
    const when = new Date(Date.now() + bump * 5000);
    fs.utimesSync(file, when, when);
  };

  it('re-reads and re-applies when somebody else wrote in between', async () => {
    const { mutateJsonRows } = await import('@/lib/vault/write');
    const file = path.join(dir, 'tasks.json');
    fs.writeFileSync(file, JSON.stringify([{ id: 'a' }]));

    const anyRow = { safeParse: (v: unknown) => ({ success: true, data: v as { id: string } }) };
    let attempts = 0;

    await mutateJsonRows<{ id: string }>('tasks.json', anyRow, (tasks) => {
      attempts++;
      if (attempts === 1) {
        // An agent writes the file after this attempt read it.
        fs.writeFileSync(file, JSON.stringify([{ id: 'a' }, { id: 'theirs' }]));
        laterThan(file);
      }
      return [...tasks, { id: 'mine' }];
    });

    expect(attempts).toBe(2);
    // Both survive. Their write is not lost, and mine is applied on top of it.
    const saved = JSON.parse(fs.readFileSync(file, 'utf8')) as { id: string }[];
    expect(saved.map((t) => t.id)).toEqual(['a', 'theirs', 'mine']);
  });

  it('gives up rather than looping, and says so', async () => {
    const { mutateJsonRows } = await import('@/lib/vault/write');
    const file = path.join(dir, 'tasks.json');
    fs.writeFileSync(file, '[]');

    const anyRow = { safeParse: (v: unknown) => ({ success: true, data: v as unknown }) };
    let attempts = 0;

    await expect(
      mutateJsonRows<unknown>('tasks.json', anyRow, (rows) => {
        attempts++;
        // Something is writing continuously; the loop must end.
        fs.writeFileSync(file, JSON.stringify([attempts]));
        laterThan(file);
        return [...rows, attempts];
      }),
    ).rejects.toThrow('tasks.json kept changing while saving. Try again.');

    expect(attempts).toBe(3);
  });

  it('applies the same loop to a note', async () => {
    const { mutateTextFile } = await import('@/lib/vault/write');
    const file = path.join(dir, 'note.md');
    fs.writeFileSync(file, 'first\n');

    let attempts = 0;
    await mutateTextFile('note.md', (raw) => {
      attempts++;
      if (attempts === 1) {
        fs.writeFileSync(file, 'theirs\n');
        laterThan(file);
      }
      return `${raw.trim()} + mine\n`;
    });

    expect(attempts).toBe(2);
    expect(fs.readFileSync(file, 'utf8')).toBe('theirs + mine\n');
  });

  it('refuses to rewrite a file that is no longer there', async () => {
    const { mutateTextFile } = await import('@/lib/vault/write');
    await expect(mutateTextFile('gone.md', (raw) => raw)).rejects.toThrow(
      'gone.md no longer exists.',
    );
  });
});

/**
 * The write path used to validate the whole array at once and, on any failure,
 * write `fn([])` over the file. One hand-typed date in a vault of two hundred
 * tasks, one click in the UI, and a hundred and ninety-nine tasks were gone with
 * the action reporting success.
 *
 * The read path had always been right — skip the row, name it, load the rest.
 * These are the same rule on the other side.
 */
describe('one bad row costs only itself', () => {
  const row = {
    safeParse: (v: unknown) => {
      const ok =
        typeof v === 'object' && v !== null && typeof (v as { id?: unknown }).id === 'string';
      return ok
        ? { success: true as const, data: v as { id: string } }
        : { success: false as const };
    },
  };

  it('keeps every good row, and the bad one, when something is added', async () => {
    const { mutateJsonRows } = await import('@/lib/vault/write');
    const file = path.join(dir, 'rows.json');
    const good = Array.from({ length: 200 }, (_, i) => ({ id: `t${i}` }));
    const bad = { id: 42, note: 'typed by hand' };
    fs.writeFileSync(file, JSON.stringify([...good.slice(0, 100), bad, ...good.slice(100)]));

    await mutateJsonRows<{ id: string }>('rows.json', row, (rows) => [...rows, { id: 'new' }]);

    const saved = JSON.parse(fs.readFileSync(file, 'utf8')) as Array<{ id: unknown }>;
    expect(saved).toHaveLength(202);
    expect(saved.filter((r) => typeof r.id === 'string')).toHaveLength(201);
    // Kept exactly as the person typed it, not repaired and not dropped.
    expect(saved).toContainEqual(bad);
  });

  it('lets a delete work around a row it cannot read', async () => {
    const { mutateJsonRows } = await import('@/lib/vault/write');
    const file = path.join(dir, 'rows.json');
    fs.writeFileSync(file, JSON.stringify([{ id: 'a' }, { broken: true }, { id: 'b' }]));

    await mutateJsonRows<{ id: string }>('rows.json', row, (rows) =>
      rows.filter((r) => r.id !== 'a'),
    );

    const saved = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown[];
    expect(saved).toEqual([{ id: 'b' }, { broken: true }]);
  });

  it('refuses to write over a file it cannot parse at all', async () => {
    const { mutateJsonRows, VaultUnreadableError } = await import('@/lib/vault/write');
    const file = path.join(dir, 'rows.json');
    fs.writeFileSync(file, '{ this is not json');

    // Nothing can be preserved from it, so the only safe move is to leave it be.
    await expect(
      mutateJsonRows<{ id: string }>('rows.json', row, (rows) => [...rows, { id: 'new' }]),
    ).rejects.toThrow(VaultUnreadableError);

    expect(fs.readFileSync(file, 'utf8')).toBe('{ this is not json');
  });

  it('refuses a file that parses but is not a list', async () => {
    const { mutateJsonRows, VaultUnreadableError } = await import('@/lib/vault/write');
    const file = path.join(dir, 'rows.json');
    fs.writeFileSync(file, '{"tasks": []}');

    await expect(mutateJsonRows<{ id: string }>('rows.json', row, (rows) => rows)).rejects.toThrow(
      VaultUnreadableError,
    );
    expect(fs.readFileSync(file, 'utf8')).toBe('{"tasks": []}');
  });
});

/**
 * Editing and deleting a task are the two writes the edit dialog can make, and
 * both go through the same read-modify-write as everything else. What is tested
 * here is what they must not touch: a task's own history, and rows that are not
 * the one being changed.
 */
describe('editing and deleting a task', () => {
  const seed = async () => {
    const { addTask } = await import('@/lib/vault/tasks');
    await addTask({ title: 'Write the Q3 plan', priority: 'urgent', dueDate: '2026-09-01' });
    await addTask({ title: 'Book the offsite room' });
    const rows = () =>
      JSON.parse(fs.readFileSync(path.join(dir, 'tasks.json'), 'utf8')) as Array<{
        id: string;
        title: string;
        priority: string;
        dueDate: string | null;
        status: string;
        kind: string;
        personSlug: string | null;
        completedAt: string | null;
        createdAt: string;
        updatedAt: string;
      }>;
    return { rows, id: rows().find((t) => t.title === 'Write the Q3 plan')!.id };
  };

  it('changes the five fields it owns and leaves the rest of the row alone', async () => {
    const { updateTask } = await import('@/lib/vault/tasks');
    const { rows, id } = await seed();
    const before = rows().find((t) => t.id === id)!;

    await updateTask(id, {
      title: '  Write the Q3 plan properly  ',
      priority: 'normal',
      dueDate: null,
      personSlug: 'ana-horvat',
      kind: 'waiting',
    });

    const after = rows().find((t) => t.id === id)!;
    expect(after.title).toBe('Write the Q3 plan properly');
    expect(after.priority).toBe('normal');
    expect(after.dueDate).toBeNull();
    expect(after.personSlug).toBe('ana-horvat');
    expect(after.kind).toBe('waiting');
    // The id is what every other file points at, and the history is not the
    // dialog's to rewrite.
    expect(after.id).toBe(before.id);
    expect(after.createdAt).toBe(before.createdAt);
    expect(after.status).toBe(before.status);
    expect(rows()).toHaveLength(2);
  });

  it('does not let a stale dialog undo a tick made somewhere else', async () => {
    const { setTaskStatus, updateTask } = await import('@/lib/vault/tasks');
    const { rows, id } = await seed();

    await setTaskStatus(id, true);
    await updateTask(id, {
      title: 'Write the Q3 plan',
      priority: 'urgent',
      dueDate: '2026-09-01',
      personSlug: null,
      kind: 'task',
    });

    const after = rows().find((t) => t.id === id)!;
    expect(after.status).toBe('done');
    expect(after.completedAt).not.toBeNull();
  });

  it('refuses a title that is only whitespace, and writes nothing', async () => {
    const { updateTask } = await import('@/lib/vault/tasks');
    const { rows, id } = await seed();

    await expect(
      updateTask(id, {
        title: '   ',
        priority: 'normal',
        dueDate: null,
        personSlug: null,
        kind: 'task',
      }),
    ).rejects.toThrow(/needs a title/);

    expect(rows().find((t) => t.id === id)!.title).toBe('Write the Q3 plan');
  });

  it('deletes one row and only that row', async () => {
    const { deleteTask } = await import('@/lib/vault/tasks');
    const { rows, id } = await seed();

    await deleteTask(id);

    expect(rows()).toHaveLength(1);
    expect(rows()[0]!.title).toBe('Book the offsite room');
  });

  it('says so rather than resurrecting a task deleted by hand', async () => {
    const { deleteTask, updateTask } = await import('@/lib/vault/tasks');
    const { rows, id } = await seed();

    await deleteTask(id);

    for (const attempt of [
      () =>
        updateTask(id, {
          title: 'Back from the dead',
          priority: 'normal',
          dueDate: null,
          personSlug: null,
          kind: 'task',
        }),
      () => deleteTask(id),
    ]) {
      await expect(attempt()).rejects.toThrow(/no longer in the vault/);
    }

    expect(rows()).toHaveLength(1);
  });
});
