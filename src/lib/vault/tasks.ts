import { today } from '@/lib/dates';
import { getVault } from './index';
import { TaskEntry } from './schemas';
import { mutateJsonRows } from './write';

const FILE = 'tasks.json';

/**
 * Read-modify-write under a per-file lock, with the mtime the read saw. An edit
 * made in an editor or by an agent between the read and the write is a conflict,
 * not something to overwrite — the retry re-reads and re-applies.
 */
async function mutate(fn: (tasks: TaskEntry[]) => TaskEntry[]): Promise<void> {
  await mutateJsonRows<TaskEntry>(FILE, TaskEntry, fn);
}

function stamp() {
  return new Date().toISOString();
}

/**
 * Ids are derived from the date and title so a task is identifiable by eye in the
 * JSON and in a diff, which is the point of a plain-file vault. A counter suffix
 * keeps them unique when two tasks share a day and a title.
 */
function makeId(title: string, existing: Set<string>): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
  const base = `${today()}-${slug || 'task'}`;
  if (!existing.has(base)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${base}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }
}

export type NewTask = {
  title: string;
  description?: string | null;
  priority?: TaskEntry['priority'];
  dueDate?: string | null;
  personSlug?: string | null;
  projectId?: string | null;
  phaseId?: string | null;
  kind?: TaskEntry['kind'];
};

/**
 * A phase id is only a fact together with its project — `p2` on its own names a
 * different phase on every project, and phase ids are reused across projects.
 * So a phase without a project, or one its project has not got, is refused
 * before anything is written rather than stored as a reference nothing can
 * resolve.
 */
function requirePhaseOnProject(projectId: string | null, phaseId: string | null): void {
  if (!phaseId) return;
  if (!projectId) throw new Error('A phase only means something together with its project.');
  const project = getVault().projectsById.get(projectId);
  if (!project) throw new Error('That project is no longer in the vault.');
  if (!project.phases.some((p) => p.id === phaseId)) {
    throw new Error('That phase is not on this project.');
  }
}

export async function addTask(input: NewTask): Promise<void> {
  const title = input.title.trim();
  if (!title) throw new Error('A task needs a title.');
  requirePhaseOnProject(input.projectId || null, input.phaseId || null);

  await mutate((tasks) => {
    const now = stamp();
    const task: TaskEntry = {
      id: makeId(title, new Set(tasks.map((t) => t.id))),
      title,
      description: input.description?.trim() || null,
      priority: input.priority ?? 'normal',
      dueDate: input.dueDate ?? null,
      status: 'todo',
      kind: input.kind ?? 'task',
      personSlug: input.personSlug || null,
      projectId: input.projectId || null,
      phaseId: input.phaseId || null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    return [task, ...tasks];
  });
}

export async function setTaskStatus(id: string, done: boolean): Promise<void> {
  await mutate((tasks) => {
    const next = tasks.map((task) => {
      if (task.id !== id) return task;
      return {
        ...task,
        status: done ? ('done' as const) : ('todo' as const),
        // Re-saving an already-done task keeps its original completion time.
        completedAt: done ? (task.completedAt ?? stamp()) : null,
        updatedAt: stamp(),
      };
    });

    return next;
  });
}

/**
 * What the edit dialog can change, and nothing else.
 *
 * `status`, `completedAt` and `createdAt` are deliberately not here: ticking a
 * task off is `setTaskStatus`, and a form that also carried the status would let
 * a dialog left open in one tab undo a tick made in another.
 */
export type TaskPatch = {
  title: string;
  /**
   * Optional, unlike every other field: the edit dialog has no description
   * field, so a required one would make the dialog erase what a tool wrote.
   * Undefined keeps what is there; null clears it.
   */
  description?: string | null;
  priority: TaskEntry['priority'];
  dueDate: string | null;
  personSlug: string | null;
  projectId: string | null;
  phaseId: string | null;
  kind: TaskEntry['kind'];
};

export async function updateTask(id: string, patch: TaskPatch): Promise<void> {
  const title = patch.title.trim();
  if (!title) throw new Error('A task needs a title.');
  requirePhaseOnProject(patch.projectId || null, patch.phaseId || null);

  await mutate((tasks) => {
    // Thrown before anything is written, so a task deleted by hand between
    // opening the dialog and saving it does not come back.
    if (!tasks.some((task) => task.id === id)) {
      throw new Error('That task is no longer in the vault.');
    }
    return tasks.map((task) =>
      task.id === id
        ? {
            ...task,
            title,
            description:
              patch.description === undefined
                ? task.description
                : patch.description?.trim() || null,
            priority: patch.priority,
            dueDate: patch.dueDate,
            personSlug: patch.personSlug || null,
            projectId: patch.projectId || null,
            phaseId: patch.phaseId || null,
            kind: patch.kind,
            updatedAt: stamp(),
          }
        : task,
    );
  });
}

/**
 * Gone, not marked done. The snapshot `write.ts` takes before every write is
 * what makes this recoverable — `npm run vault:restore` has the row.
 */
export async function deleteTask(id: string): Promise<void> {
  await mutate((tasks) => {
    if (!tasks.some((task) => task.id === id)) {
      throw new Error('That task is no longer in the vault.');
    }
    return tasks.filter((task) => task.id !== id);
  });
}
