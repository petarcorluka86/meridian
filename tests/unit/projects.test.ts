import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetConfig } from '@/lib/env';

/**
 * Projects, and the two claims the interface makes about them that nothing else
 * would catch if they stopped being true.
 *
 * **Archiving loses nothing.** It is a flag, the record is untouched, and
 * restoring is the same call inverted. The confirmation says so; this is what
 * makes it so.
 *
 * **Deleting a project does not delete its work.** Its tasks and notes stay
 * exactly where they are and lose the project. That is the promise the
 * confirmation makes in the most words, on the one action that cannot be undone
 * from inside the app — and it spans three files, which is exactly the kind of
 * thing that quietly stops working.
 */
let dir: string;

const read = (rel: string) => JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8'));
const readText = (rel: string) => fs.readFileSync(path.join(dir, rel), 'utf8');

/** The index is a cache; a test that writes behind it has to say so. */
async function projects() {
  const { invalidateVault } = await import('@/lib/vault/index');
  invalidateVault();
  return import('@/lib/vault/projects');
}

async function tasks() {
  const { invalidateVault } = await import('@/lib/vault/index');
  invalidateVault();
  return import('@/lib/vault/tasks');
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-projects-'));
  fs.mkdirSync(path.join(dir, 'notes/general'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'people/ana-horvat/notes'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'people/entries.json'),
    `${JSON.stringify([{ slug: 'ana-horvat', displayName: 'Ana Horvat' }])}\n`,
  );
  fs.writeFileSync(path.join(dir, 'tasks.json'), '[]\n');
  fs.writeFileSync(path.join(dir, 'time.json'), '[]\n');
  fs.writeFileSync(path.join(dir, 'config.json'), '{"dataVersion":1}\n');
  process.env.VAULT_PATH = dir;
  resetConfig();
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  delete process.env.VAULT_PATH;
  resetConfig();
});

describe('creating a project', () => {
  it('takes its id from its title, so the JSON is readable by eye', async () => {
    const { createProject } = await projects();

    expect(await createProject({ title: 'Platform split' })).toBe('platform-split');
  });

  it('counts up rather than reaching for a timestamp when two share a title', async () => {
    const { createProject } = await projects();

    await createProject({ title: 'Platform split' });
    expect(await createProject({ title: 'Platform split' })).toBe('platform-split-2');
  });

  it('folds the accents a slug cannot carry', async () => {
    const { createProject } = await projects();

    expect(await createProject({ title: 'Šimić — nagrađivanje' })).toBe('simic-nagradivanje');
  });

  it('refuses a title that is only whitespace, and writes nothing', async () => {
    const { createProject } = await projects();

    await expect(createProject({ title: '   ' })).rejects.toThrow(/needs a title/);
    expect(fs.existsSync(path.join(dir, 'projects.json'))).toBe(false);
  });

  it('numbers the phases it is given and marks none of them done', async () => {
    const { createProject } = await projects();

    await createProject({ title: 'Hiring', phases: ['Scorecard agreed', '  ', 'Roles posted'] });

    // The blank one is dropped rather than becoming a phase with no name.
    expect(read('projects.json')[0].phases).toEqual([
      { id: 'p1', label: 'Scorecard agreed', note: '', done: false },
      { id: 'p2', label: 'Roles posted', note: '', done: false },
    ]);
  });
});

describe('phases', () => {
  it('never reuses an id, so a tick cannot land on the wrong phase', async () => {
    const { createProject, addPhase, removePhase } = await projects();
    const id = await createProject({ title: 'P', phases: ['One', 'Two'] });

    await removePhase(id, 'p1');
    await addPhase(id, 'Three');

    const ids = (await projectRow(id)).phases.map((p: { id: string }) => p.id);
    expect(ids).toEqual(['p2', 'p3']);
  });

  it('counts progress from the phases rather than storing it', async () => {
    const { createProject, setPhaseDone, progressOf } = await projects();
    const id = await createProject({ title: 'P', phases: ['One', 'Two', 'Three'] });

    await setPhaseDone(id, 'p1', true);
    await setPhaseDone(id, 'p2', true);

    const row = await projectRow(id);
    // Nothing derived is written down, so there is no percentage on disk to drift.
    expect(Object.keys(row)).not.toContain('percent');
    expect(progressOf(row)).toEqual({ total: 3, done: 2, percent: 67, complete: false });
  });

  it('calls a project with no phases 0% rather than complete', async () => {
    const { createProject, progressOf } = await projects();
    const id = await createProject({ title: 'A ritual' });

    expect(progressOf(await projectRow(id))).toEqual({
      total: 0,
      done: 0,
      percent: 0,
      complete: false,
    });
  });

  it('refuses a phase with no name', async () => {
    const { createProject, addPhase } = await projects();
    const id = await createProject({ title: 'P' });

    await expect(addPhase(id, '  ')).rejects.toThrow(/needs a name/);
    expect((await projectRow(id)).phases).toEqual([]);
  });
});

describe('tasks on a phase', () => {
  it('refuses a phase without a project, and a phase the project has not got', async () => {
    const { createProject } = await projects();
    const id = await createProject({ title: 'P', phases: ['One'] });

    const { addTask } = await tasks();
    await expect(addTask({ title: 'Orphan', phaseId: 'p1' })).rejects.toThrow(/its project/);
    await expect(addTask({ title: 'Wrong', projectId: id, phaseId: 'p9' })).rejects.toThrow(
      /not on this project/,
    );
    expect(read('tasks.json')).toEqual([]);
  });

  it('counts each phase from its own tasks, and never writes the fraction down', async () => {
    const { createProject } = await projects();
    const id = await createProject({ title: 'P', phases: ['One', 'Two'] });

    const { addTask, setTaskStatus } = await tasks();
    await addTask({ title: 'A', projectId: id, phaseId: 'p1' });
    await addTask({ title: 'B', projectId: id, phaseId: 'p1' });
    await addTask({ title: 'Loose', projectId: id });
    await setTaskStatus(
      read('tasks.json').find((t: { title: string }) => t.title === 'A').id,
      true,
    );

    const { taskProgressByPhase } = await projects();
    const byPhase = taskProgressByPhase(await projectRow(id), read('tasks.json'));
    expect(byPhase.p1).toEqual({ total: 2, done: 1, percent: 50, complete: false });
    // A phase with no tasks is 0 of 0, not missing — the card asks it directly.
    expect(byPhase.p2).toEqual({ total: 0, done: 0, percent: 0, complete: false });
  });

  it('removing a phase takes it off its tasks, so a reused ordinal cannot adopt them', async () => {
    const { createProject } = await projects();
    const id = await createProject({ title: 'P', phases: ['One'] });

    const { addTask } = await tasks();
    await addTask({ title: 'Filed', projectId: id, phaseId: 'p1' });

    const { removePhase } = await projects();
    await removePhase(id, 'p1');

    const [task] = read('tasks.json');
    expect(task.phaseId).toBeNull();
    // The task keeps its project — only the phase is gone.
    expect(task.projectId).toBe(id);
  });

  it('deleting the project takes the phase off its tasks along with the project', async () => {
    const { createProject } = await projects();
    const id = await createProject({ title: 'P', phases: ['One'] });

    const { addTask } = await tasks();
    await addTask({ title: 'Filed', projectId: id, phaseId: 'p1' });

    await (await projects()).deleteProject(id);

    const [task] = read('tasks.json');
    expect(task.projectId).toBeNull();
    expect(task.phaseId).toBeNull();
  });
});

describe('links', () => {
  it('refuses anything that is not http(s)', async () => {
    const { createProject, addProjectLink } = await projects();
    const id = await createProject({ title: 'P' });

    await expect(addProjectLink(id, 'Bad', 'javascript:alert(1)')).rejects.toThrow(/http/);
    expect((await projectRow(id)).links).toEqual([]);
  });

  it('falls back to the host when no label is given', async () => {
    const { createProject, addProjectLink } = await projects();
    const id = await createProject({ title: 'P' });

    await addProjectLink(id, '', 'https://example.com/a/b');

    expect((await projectRow(id)).links).toEqual([
      { label: 'example.com', url: 'https://example.com/a/b' },
    ]);
  });
});

describe('archiving', () => {
  it('changes one flag and nothing else', async () => {
    const { createProject, setProjectArchived } = await projects();
    const id = await createProject({ title: 'P', phases: ['One'] });
    const before = await projectRow(id);

    await setProjectArchived(id, true);
    const archived = await projectRow(id);

    expect(archived.archived).toBe(true);
    expect({ ...archived, archived: false, updatedAt: before.updatedAt }).toEqual(before);
  });

  it('comes back exactly as it went in', async () => {
    const { createProject, setProjectArchived } = await projects();
    const id = await createProject({ title: 'P', phases: ['One', 'Two'] });
    const before = await projectRow(id);

    await setProjectArchived(id, true);
    await setProjectArchived(id, false);
    const after = await projectRow(id);

    expect({ ...after, updatedAt: before.updatedAt }).toEqual(before);
  });
});

describe('deleting a project', () => {
  it('leaves its tasks where they are and takes only the project off them', async () => {
    const { createProject } = await projects();
    const id = await createProject({ title: 'Platform split' });

    const { addTask } = await tasks();
    await addTask({ title: 'Extract the scheduler', projectId: id });
    await addTask({ title: 'Something else' });

    await (await projects()).deleteProject(id);

    const rows = read('tasks.json');
    expect(rows).toHaveLength(2);
    expect(rows.map((t: { title: string }) => t.title).sort()).toEqual([
      'Extract the scheduler',
      'Something else',
    ]);
    expect(rows.every((t: { projectId: string | null }) => t.projectId === null)).toBe(true);
  });

  it('leaves its notes on disk and takes only the project out of the front matter', async () => {
    const { createProject } = await projects();
    const id = await createProject({ title: 'Platform split' });

    const rel = 'people/ana-horvat/notes/2026-08-12-1on1.md';
    fs.writeFileSync(
      path.join(dir, rel),
      `---\ncategory: 1on1\ndraft: false\npinned: true\nproject: ${id}\n---\n# 1:1\n\nBody.\n`,
    );

    await (await projects()).deleteProject(id);

    const after = readText(rel);
    expect(fs.existsSync(path.join(dir, rel))).toBe(true);
    expect(after).not.toContain('project:');
    // Everything else in the front matter, and the body, is exactly as it was.
    expect(after).toContain('category: 1on1');
    expect(after).toContain('pinned: true');
    expect(after).toContain('# 1:1');
  });

  it('says so rather than pretending, for a project already gone', async () => {
    const { createProject } = await projects();
    const id = await createProject({ title: 'P' });
    await (await projects()).deleteProject(id);

    await expect((await projects()).deleteProject(id)).rejects.toThrow(/no longer in the vault/);
  });
});

describe('the index', () => {
  it('skips one malformed project and still loads the rest', async () => {
    fs.writeFileSync(
      path.join(dir, 'projects.json'),
      JSON.stringify([
        { id: 'good', title: 'Good', phases: [], links: [], createdAt: 'x', updatedAt: 'x' },
        { id: 'NOT A SLUG', title: 'Bad', createdAt: 'x', updatedAt: 'x' },
        { id: 'also-good', title: 'Also good', createdAt: 'x', updatedAt: 'x' },
      ]),
    );

    const { getVault, invalidateVault } = await import('@/lib/vault/index');
    invalidateVault();
    const vault = getVault();

    expect(vault.projects.map((p) => p.id)).toEqual(['good', 'also-good']);
    expect(vault.problems.map((p) => p.path)).toContain('projects.json');
  });

  it('groups notes by the project their front matter names', async () => {
    fs.writeFileSync(
      path.join(dir, 'notes/general/2026-08-15-plan.md'),
      '---\ncategory: planning\ndraft: false\npinned: false\nproject: hiring\n---\n# Plan\n',
    );
    fs.writeFileSync(
      path.join(dir, 'notes/general/2026-08-16-other.md'),
      '---\ncategory: generic\ndraft: false\npinned: false\n---\n# Other\n',
    );

    const { getVault, invalidateVault } = await import('@/lib/vault/index');
    invalidateVault();
    const vault = getVault();

    expect(vault.notesByProject.get('hiring')?.map((n) => n.title)).toEqual(['Plan']);
    expect(vault.notes.find((n) => n.title === 'Other')?.project).toBeNull();
  });
});

async function projectRow(id: string) {
  const { invalidateVault } = await import('@/lib/vault/index');
  invalidateVault();
  return read('projects.json').find((p: { id: string }) => p.id === id);
}
