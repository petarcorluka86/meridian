import { today } from '@/lib/dates';
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
  priority?: TaskEntry['priority'];
  dueDate?: string | null;
  personSlug?: string | null;
  kind?: TaskEntry['kind'];
};

export async function addTask(input: NewTask): Promise<void> {
  const title = input.title.trim();
  if (!title) throw new Error('A task needs a title.');

  await mutate((tasks) => {
    const now = stamp();
    const task: TaskEntry = {
      id: makeId(title, new Set(tasks.map((t) => t.id))),
      title,
      description: null,
      priority: input.priority ?? 'normal',
      dueDate: input.dueDate ?? null,
      status: 'todo',
      kind: input.kind ?? 'task',
      personSlug: input.personSlug || null,
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
