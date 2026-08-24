import { getVault } from './index';
import { setNoteProject } from './notes';
import { LinkEntry, ProjectEntry, type ProjectPhase, TaskEntry } from './schemas';
import { mutateJsonRows } from './write';

const FILE = 'projects.json';

/** Read-modify-write under the file's lock, with the mtime the read saw. */
async function mutate(fn: (projects: ProjectEntry[]) => ProjectEntry[]): Promise<void> {
  await mutateJsonRows<ProjectEntry>(FILE, ProjectEntry, fn);
}

function stamp() {
  return new Date().toISOString();
}

/**
 * The id is the title, slugified — readable in the JSON, in a diff and in the
 * URL, which is the point of a plain-file vault. A collision takes a counter
 * rather than a timestamp, so two projects called the same thing stay tellable
 * apart by eye.
 */
function makeId(title: string, existing: Set<string>): string {
  const base =
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40)
      .replace(/-$/, '') || 'project';
  if (!existing.has(base)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${base}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }
}

/** Phase ids only have to be unique inside their project, so they are ordinals. */
function phaseId(phases: readonly ProjectPhase[]): string {
  const taken = new Set(phases.map((p) => p.id));
  for (let i = phases.length + 1; ; i++) {
    const candidate = `p${i}`;
    if (!taken.has(candidate)) return candidate;
  }
}

function requireProject(projects: readonly ProjectEntry[], id: string): void {
  if (!projects.some((p) => p.id === id)) {
    throw new Error('That project is no longer in the vault.');
  }
}

/** Every change to a project touches the same three lines, so they live here. */
async function patch(id: string, fn: (project: ProjectEntry) => ProjectEntry): Promise<void> {
  await mutate((projects) => {
    requireProject(projects, id);
    return projects.map((p) => (p.id === id ? { ...fn(p), updatedAt: stamp() } : p));
  });
}

export type NewProject = {
  title: string;
  description?: string;
  /** Labels only. A project created with phases gets them in the order given. */
  phases?: readonly string[];
};

export async function createProject(input: NewProject): Promise<string> {
  const title = input.title.trim();
  if (!title) throw new Error('A project needs a title.');

  let id = '';
  await mutate((projects) => {
    const now = stamp();
    id = makeId(title, new Set(projects.map((p) => p.id)));
    const phases: ProjectPhase[] = (input.phases ?? [])
      .map((label) => label.trim())
      .filter(Boolean)
      .map((label, i) => ({ id: `p${i + 1}`, label, note: '', done: false }));
    return [
      ...projects,
      {
        id,
        title,
        description: input.description?.trim() ?? '',
        phases,
        links: [],
        archived: false,
        createdAt: now,
        updatedAt: now,
      },
    ];
  });
  return id;
}

export async function updateProject(
  id: string,
  input: { title: string; description: string },
): Promise<void> {
  const title = input.title.trim();
  if (!title) throw new Error('A project needs a title.');
  await patch(id, (project) => ({ ...project, title, description: input.description.trim() }));
}

/**
 * Archiving is a flag. Nothing is deleted, its tasks and notes stay exactly where
 * they are, and restoring it is the same call with `false`.
 */
export async function setProjectArchived(id: string, archived: boolean): Promise<void> {
  await patch(id, (project) => ({ ...project, archived }));
}

/**
 * Gone, and its tasks and notes are not.
 *
 * They lose the project rather than following it into the bin — that is what the
 * confirmation promises, and a task deleted along with a project is a task
 * nobody agreed to delete. The references are cleared rather than left dangling
 * so a new project that happens to take the same slug cannot silently adopt
 * somebody else's orphans.
 *
 * The project record goes last: if clearing a reference fails, the project is
 * still there to try again from, rather than the reverse.
 */
export async function deleteProject(id: string): Promise<void> {
  requireProject(getVault().projects, id);

  await mutateJsonRows<TaskEntry>('tasks.json', TaskEntry, (tasks) =>
    tasks.map((task) =>
      task.projectId === id ? { ...task, projectId: null, updatedAt: stamp() } : task,
    ),
  );

  for (const note of getVault().notesByProject.get(id) ?? []) {
    await setNoteProject(note.path, null);
  }

  await mutate((projects) => {
    requireProject(projects, id);
    return projects.filter((p) => p.id !== id);
  });
}

export async function addPhase(id: string, label: string): Promise<void> {
  const trimmed = label.trim();
  if (!trimmed) throw new Error('A phase needs a name.');
  await patch(id, (project) => ({
    ...project,
    phases: [
      ...project.phases,
      { id: phaseId(project.phases), label: trimmed, note: '', done: false },
    ],
  }));
}

export async function updatePhase(
  id: string,
  phase: string,
  input: { label: string; note: string },
): Promise<void> {
  const label = input.label.trim();
  if (!label) throw new Error('A phase needs a name.');
  await patch(id, (project) => {
    if (!project.phases.some((p) => p.id === phase)) {
      throw new Error('That phase is no longer on this project.');
    }
    return {
      ...project,
      phases: project.phases.map((p) =>
        p.id === phase ? { ...p, label, note: input.note.trim() } : p,
      ),
    };
  });
}

export async function setPhaseDone(id: string, phase: string, done: boolean): Promise<void> {
  await patch(id, (project) => ({
    ...project,
    phases: project.phases.map((p) => (p.id === phase ? { ...p, done } : p)),
  }));
}

export async function removePhase(id: string, phase: string): Promise<void> {
  await patch(id, (project) => ({
    ...project,
    phases: project.phases.filter((p) => p.id !== phase),
  }));
}

export async function addProjectLink(id: string, label: string, url: string): Promise<void> {
  const trimmed = url.trim();
  // Same rule as a person's links: anything but http(s) would be blocked on
  // click anyway, and a javascript: URL has no business in the vault.
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error('A link needs to start with http:// or https://');
  }
  const name = label.trim() || trimmed.replace(/^https?:\/\//i, '').split('/')[0] || trimmed;
  const link = LinkEntry.parse({ label: name, url: trimmed });
  await patch(id, (project) => ({ ...project, links: [...project.links, link] }));
}

export async function removeProjectLink(id: string, index: number): Promise<void> {
  await patch(id, (project) => ({
    ...project,
    links: project.links.filter((_, i) => i !== index),
  }));
}

/**
 * What a project card and a project page both need: how far the phases have got.
 * Never written to disk — it is counted from the phases every time, like every
 * other derived number in this app.
 */
export type Progress = { total: number; done: number; percent: number; complete: boolean };

export function progressOf(project: Pick<ProjectEntry, 'phases'>): Progress {
  const total = project.phases.length;
  const done = project.phases.filter((p) => p.done).length;
  return {
    total,
    done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    complete: total > 0 && done === total,
  };
}
