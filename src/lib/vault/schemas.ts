import { z } from 'zod';

/** YYYY-MM-DD, compared lexicographically everywhere. Never a Date on disk. */
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
export const IsoTimestamp = z.string().datetime({ offset: true }).or(z.string().datetime());
export const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'expected a lowercase slug');

export const PersonEntry = z.object({
  slug: Slug,
  displayName: z.string().min(1),
  hr: z
    .object({
      jobTitle: z.string().nullable().default(null),
      department: z.string().nullable().default(null),
      hireDate: IsoDate.nullable().default(null),
      supervisorEmployeeId: z.string().nullable().default(null),
      workEmail: z.string().nullable().default(null),
      workPhone: z.string().nullable().default(null),
      employeeId: z.string().nullable().default(null),
    })
    .prefault({}),
  mine: z
    .object({
      contactCadenceDays: z.number().int().positive().default(14),
      growth: z
        .object({
          currentLevel: z.string().nullable().default(null),
          targetLevel: z.string().nullable().default(null),
        })
        .prefault({}),
    })
    .prefault({}),
  status: z.enum(['active', 'archived']).default('active'),
});
export type PersonEntry = z.infer<typeof PersonEntry>;

export const PersonEntries = z.array(PersonEntry);

export const LinkEntry = z.object({ label: z.string().min(1), url: z.string().url() });
export const LinkEntries = z.array(LinkEntry);
export type LinkEntry = z.infer<typeof LinkEntry>;

export const PlanEntry = z.object({
  id: z.string().min(1),
  amount: z.number().positive(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  promotion: z.string().default(''),
});
export const PlanEntries = z.array(PlanEntry);
export type PlanEntry = z.infer<typeof PlanEntry>;

/**
 * A checkpoint the project has to pass. Not a task: a phase is how you know
 * where the project stands, and it is ticked off by hand rather than by
 * finishing anything in particular. Tasks can be filed under a phase — that
 * gives the phase a task count of its own, never the tick.
 */
export const ProjectPhase = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  note: z.string().default(''),
  done: z.boolean().default(false),
});
export type ProjectPhase = z.infer<typeof ProjectPhase>;

/**
 * Work that runs longer than a task. One record per project in `projects.json`,
 * the same way tasks and time are one file each — a mature vault has tens of
 * projects, not thousands, and splitting them would buy nothing.
 *
 * Links live inside the record rather than in a `projects/<id>/links.json`,
 * because a project has no folder: its notes stay in the person folder or in
 * `notes/general/` and carry the project in their front matter. One file is the
 * whole store for a project.
 *
 * Archiving is a flag, never a delete. Nothing is removed and it always comes
 * back.
 */
export const ProjectEntry = z.object({
  id: Slug,
  title: z.string().min(1),
  description: z.string().default(''),
  phases: z.array(ProjectPhase).default([]),
  links: z.array(LinkEntry).default([]),
  archived: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const ProjectEntries = z.array(ProjectEntry);
export type ProjectEntry = z.infer<typeof ProjectEntry>;

export const TaskPriority = z.enum(['urgent', 'important', 'normal']);
export const TaskEntry = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().default(null),
  priority: TaskPriority.default('normal'),
  dueDate: IsoDate.nullable().default(null),
  status: z.enum(['todo', 'done']).default('todo'),
  kind: z.enum(['task', 'waiting']).default('task'),
  personSlug: Slug.nullable().default(null),
  /** A task belongs to a project the same way it belongs to a person: both, or neither. */
  projectId: Slug.nullable().default(null),
  /** A phase id on the task's own project. Meaningless without `projectId`, and the store refuses the pair apart. */
  phaseId: z.string().min(1).nullable().default(null),
  completedAt: z.string().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const TaskEntries = z.array(TaskEntry);
export type TaskEntry = z.infer<typeof TaskEntry>;

export const TimeEntry = z.object({
  id: z.string().min(1),
  date: IsoDate,
  hoursDelta: z.number(),
  note: z.string().default(''),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const TimeEntries = z.array(TimeEntry);
export type TimeEntry = z.infer<typeof TimeEntry>;

export const VaultConfig = z.object({
  thresholds: z
    .object({
      contactGapDays: z.number().int().positive().default(14),
      timeBalanceLimitHours: z.number().positive().default(20),
      uncommittedChangesDays: z.number().int().positive().default(3),
    })
    .prefault({}),
  dataVersion: z.number().int().default(1),
});
export type VaultConfig = z.infer<typeof VaultConfig>;

export const NOTE_CATEGORIES = [
  '1on1',
  'feedback',
  'incident',
  'planning',
  'idea',
  'generic',
] as const;
export type NoteCategory = (typeof NOTE_CATEGORIES)[number];

/**
 * Front matter only. Who a note is about comes from its folder, never from here.
 *
 * A project does not: a note about Ana that belongs to the platform split still
 * lives in Ana's folder, so `project` is a fact the path cannot carry and is the
 * one key here that names something outside the note.
 */
export const NoteFrontmatter = z.object({
  category: z.enum(NOTE_CATEGORIES).catch('generic'),
  draft: z.coerce.boolean().catch(false),
  pinned: z.coerce.boolean().catch(false),
  project: Slug.nullable().catch(null),
});
export type NoteFrontmatter = z.infer<typeof NoteFrontmatter>;
