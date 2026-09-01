/**
 * What the MCP server offers, separately from the server itself.
 *
 * Every tool goes through the same store layer as the interface — Zod
 * validation, pre-write snapshot, atomic rename, mtime conflict check. That is
 * the whole point: an agent gets the operations the app protects, rather than
 * hand-editing JSON and corrupting an array nobody notices for a week.
 *
 * Registration lives here rather than in vault-server.ts so it can be tested.
 * The entry point connects to stdio on import, which means importing it in a
 * test hangs — so the wiring, thirty-two tools an agent reads and writes the vault through,
 * had no test at all: whether each schema matches what its handler passes down,
 * and whether a bad argument is refused rather than written.
 */
import { z } from 'zod';

import { getVault } from '../src/lib/vault/index.js';
import { addTask, deleteTask, setTaskStatus, updateTask } from '../src/lib/vault/tasks.js';
import {
  addTimeEntry,
  allTimeEntries,
  deleteTimeEntry,
  formatHours,
  parseHours,
  sumHours,
  updateTimeEntry,
} from '../src/lib/vault/time.js';
import {
  createNote,
  getNote,
  deleteNote,
  moveNote,
  saveNoteBody,
  setNoteMeta,
} from '../src/lib/vault/notes.js';
import { addLink, addPlan, removeLink, removePlan, saveAbout } from '../src/lib/vault/people.js';
import {
  addPhase,
  addProjectLink,
  createProject,
  progressOf,
  removePhase,
  removeProjectLink,
  setPhaseDone,
  setProjectArchived,
  updatePhase,
  updateProject,
} from '../src/lib/vault/projects.js';
import {
  changedFiles,
  commitAll,
  fileDiffs,
  isFirstPush,
  recentCommits,
  repoState,
  unpushedCount,
  upstream,
} from '../src/lib/git.js';
import { blocksEditing, vaultHealth } from '../src/lib/vault/health.js';
import { loadConfig } from '../src/lib/env.js';
import { IsoDate, NOTE_CATEGORIES, TaskPriority } from '../src/lib/vault/schemas.js';
import type { TaskEntry } from '../src/lib/vault/schemas.js';
import type { Note } from '../src/lib/vault/index.js';
import { daysBetween, dueLabel, today } from '../src/lib/dates.js';
import { now as clockNow } from '../src/lib/clock.js';
import { readBamboo } from '../src/lib/sources/bamboohr.js';
import { readCalendar } from '../src/lib/sources/calendar.js';
import { openedLabel, readGithub } from '../src/lib/sources/github.js';
import { coversDay, meetingState } from '../src/lib/sources/day.js';
import { readEgress } from '../src/lib/sources/egress.js';
import { buildTimeline, lastRiseLabel, nextRiseLabel, rateAt, ymOfIso } from '../src/lib/comp.js';

export type ToolResult = { content: { type: 'text'; text: string }[] };

/**
 * What a client needs in order to decide what it may run without asking. A tool
 * with no hint is treated as the worst case, so an unannotated read is a
 * permission prompt somebody has to answer for nothing.
 */
export type ToolAnnotations = {
  /** Touches nothing. */
  readOnlyHint: boolean;
  /** Removes something that was there. */
  destructiveHint: boolean;
  /** Running it twice leaves the vault where running it once did. */
  idempotentHint: boolean;
};

const READS: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
};
const ADDS: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
};
const CHANGES: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
};
const REMOVES: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
};

/**
 * Which tool is which, in one list rather than beside each registration.
 *
 * A client reads these to decide what it can run on its own, so the difference
 * between `read_day` and `delete_task` has to be legible in a single pass — and
 * a new tool that nobody classified has to be a failing test rather than a tool
 * that quietly asks permission for reading the roster. `tests/unit/mcp.test.ts`
 * fails if a registered tool is missing from here.
 */
const ANNOTATIONS: Record<string, ToolAnnotations> = {
  list_people: READS,
  read_person: READS,
  list_projects: READS,
  read_project: READS,
  list_tasks: READS,
  list_notes: READS,
  read_note: READS,
  read_hours: READS,
  read_day: READS,
  read_compensation: READS,
  read_sources: READS,
  read_egress: READS,
  search: READS,
  vault_diff: READS,
  vault_problems: READS,
  vault_health: READS,
  vault_status: READS,

  add_task: ADDS,
  write_note: ADDS,
  log_hours: ADDS,
  add_link: ADDS,
  plan_rise: ADDS,
  create_project: ADDS,
  add_phase: ADDS,
  add_project_link: ADDS,
  // Not idempotent: a second commit with nothing left to save refuses.
  commit: ADDS,

  complete_task: CHANGES,
  update_task: CHANGES,
  move_note: CHANGES,
  update_hours: CHANGES,
  write_about: CHANGES,
  update_project: CHANGES,
  archive_project: CHANGES,
  update_phase: CHANGES,
  complete_phase: CHANGES,

  delete_task: REMOVES,
  delete_note: REMOVES,
  delete_hours: REMOVES,
  remove_link: REMOVES,
  remove_plan: REMOVES,
  remove_phase: REMOVES,
  remove_project_link: REMOVES,
};

/** Every tool's classification, for the test that keeps the list complete. */
export function annotationsOf(name: string): ToolAnnotations | undefined {
  return ANNOTATIONS[name];
}

/**
 * The part of McpServer registration actually uses. Narrow on purpose: a test
 * can satisfy this in five lines, and the handler's argument type still comes
 * from the schema, which is the thing worth checking.
 */
export type Tooling = {
  tool<T extends z.ZodRawShape>(
    name: string,
    description: string,
    schema: T,
    handler: (input: z.infer<z.ZodObject<T>>) => Promise<ToolResult>,
    annotations?: ToolAnnotations,
  ): void;
};

export function registerTools(target: Tooling): void {
  // Every registration below goes through this, so no call site has to remember
  // to annotate itself and none of them can disagree with the list above.
  const server: Tooling = {
    tool: (name, description, schema, handler) =>
      target.tool(name, description, schema, handler, ANNOTATIONS[name]),
  };

  const text = (value: unknown) => ({
    content: [
      {
        type: 'text' as const,
        text: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
      },
    ],
  });

  /*
   * One shape for a task and one for a note, wherever either is listed. A tool
   * that trimmed its own subset is how `read_person` came to omit `pinned` and
   * `project` while `read_note` returned them — the same record, two answers.
   */
  const taskView = (t: TaskEntry, now: string) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    kind: t.kind,
    dueDate: t.dueDate,
    due: dueLabel(t.dueDate, now),
    done: t.status === 'done',
    completedAt: t.completedAt,
    personSlug: t.personSlug,
    projectId: t.projectId,
  });

  const noteView = (n: Note) => ({
    path: n.path,
    title: n.title,
    date: n.date,
    category: n.category,
    draft: n.draft,
    pinned: n.pinned,
    project: n.project,
    personSlug: n.personSlug,
    location: n.location,
  });

  server.tool(
    'list_people',
    'The roster: role, hire date, and how long since the last note about each person.',
    { includeArchived: z.boolean().default(false) },
    async ({ includeArchived }) => {
      const vault = getVault();
      const now = today();
      return text(
        vault.people
          .filter((p) => includeArchived || p.status === 'active')
          .map((p) => {
            // notesByPerson is newest first, and a note whose filename carries no
            // date cannot answer this — so the first *dated* one is the answer.
            const last = (vault.notesByPerson.get(p.slug) ?? []).find((n) => n.date)?.date ?? null;
            const since = last ? daysBetween(last, now) : null;
            const cadence = p.mine.contactCadenceDays;
            return {
              slug: p.slug,
              name: p.displayName,
              role: p.hr.jobTitle,
              hired: p.hr.hireDate,
              status: p.status,
              lastNote: last,
              daysSinceLastNote: since,
              cadenceDays: cadence,
              // Null rather than true when there is no note at all: never spoken
              // to and overdue are different states, and one of them is worse.
              overdue: since === null ? null : since > cadence,
            };
          }),
      );
    },
  );

  server.tool(
    'read_person',
    'Everything the vault holds about one person: about, links, plans, notes and open tasks.',
    { slug: z.string() },
    async ({ slug }) => {
      const vault = getVault();
      const person = vault.peopleBySlug.get(slug);
      if (!person) return text(`No person with the slug ${slug}.`);
      return text({
        person,
        about: vault.about.get(slug) ?? '',
        links: vault.links.get(slug) ?? [],
        plans: vault.plans.get(slug) ?? [],
        notes: (vault.notesByPerson.get(slug) ?? []).map(noteView),
        openTasks: vault.tasks
          .filter((t) => t.personSlug === slug && t.status !== 'done')
          .map((t) => taskView(t, today())),
      });
    },
  );

  /*
   * The reads give an agent the id a task or note points at. Since 2026-09-01 the
   * shaping calls are here too — creating, phasing, linking, archiving — the
   * owner reversed the earlier decision (MCP-COVERAGE.md, Projects — write).
   * Deleting is the one that stays at the screen: its confirmation promises what
   * happens to the project's tasks and notes, and a promise is read by a person.
   */
  server.tool(
    'list_projects',
    'Projects, with how far their phases have got. Read only — the id is what a task or note points at.',
    { includeArchived: z.boolean().default(false) },
    async ({ includeArchived }) => {
      const vault = getVault();
      return text(
        vault.projects
          .filter((p) => includeArchived || !p.archived)
          .map((p) => {
            const { total, done, percent } = progressOf(p);
            return {
              id: p.id,
              title: p.title,
              description: p.description,
              archived: p.archived,
              phases: { total, done, percent },
              nextPhase: p.phases.find((phase) => !phase.done)?.label ?? null,
              openTasks: vault.tasks.filter((t) => t.projectId === p.id && t.status !== 'done')
                .length,
              notes: vault.notesByProject.get(p.id)?.length ?? 0,
            };
          }),
      );
    },
  );

  server.tool(
    'read_project',
    'One project, whole: its phases with their notes, its links, its tasks and its notes.',
    { id: z.string() },
    async ({ id }) => {
      const vault = getVault();
      const project = vault.projectsById.get(id);
      if (!project) return text(`No project with the id ${id}.`);
      const now = today();
      return text({
        id: project.id,
        title: project.title,
        description: project.description,
        archived: project.archived,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        progress: progressOf(project),
        phases: project.phases,
        links: project.links,
        tasks: vault.tasks.filter((t) => t.projectId === id).map((t) => taskView(t, now)),
        notes: (vault.notesByProject.get(id) ?? []).map(noteView),
      });
    },
  );

  server.tool(
    'create_project',
    'Create a project, optionally with its phases in the order given. Answers with the id a task or note points at.',
    {
      title: z.string().min(1),
      description: z.string().optional(),
      phases: z.array(z.string().min(1)).optional().describe('Phase labels, in order.'),
    },
    async (input) => {
      const id = await createProject({
        title: input.title,
        description: input.description,
        phases: input.phases,
      });
      return text(`Created ${id}.`);
    },
  );

  server.tool(
    'update_project',
    'Change a project title or description. Only the fields given move.',
    {
      id: z.string(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
    },
    async ({ id, ...patch }) => {
      // updateProject takes both fields, on purpose: the dialog it was written
      // for always has both. A tool may send one, so the other is read back here.
      const project = getVault().projectsById.get(id);
      if (!project) return text(`No project with the id ${id}.`);
      await updateProject(id, {
        title: patch.title ?? project.title,
        description: patch.description ?? project.description,
      });
      return text('Changed.');
    },
  );

  server.tool(
    'archive_project',
    'Archive a project, or restore it. A flag, not a deletion — its tasks and notes stay where they are.',
    { id: z.string(), archived: z.boolean().default(true) },
    async ({ id, archived }) => {
      await setProjectArchived(id, archived);
      return text(archived ? 'Archived.' : 'Restored.');
    },
  );

  server.tool(
    'add_phase',
    'Add a phase to the end of a project. Phase ids come back from read_project.',
    { id: z.string(), label: z.string().min(1) },
    async ({ id, label }) => {
      await addPhase(id, label);
      return text('Added.');
    },
  );

  server.tool(
    'update_phase',
    'Change a phase label or its note. Only the fields given move. Phase ids come from read_project.',
    {
      id: z.string(),
      phase: z.string(),
      label: z.string().min(1).optional(),
      note: z.string().optional(),
    },
    async ({ id, phase, ...patch }) => {
      const project = getVault().projectsById.get(id);
      if (!project) return text(`No project with the id ${id}.`);
      const existing = project.phases.find((p) => p.id === phase);
      if (!existing) return text(`No phase ${phase} on ${id}.`);
      await updatePhase(id, phase, {
        label: patch.label ?? existing.label,
        note: patch.note ?? existing.note,
      });
      return text('Changed.');
    },
  );

  server.tool(
    'complete_phase',
    'Tick a phase off, or untick it. Progress is never written down, so this is the number moving.',
    { id: z.string(), phase: z.string(), done: z.boolean().default(true) },
    async ({ id, phase, done }) => {
      const project = getVault().projectsById.get(id);
      if (!project) return text(`No project with the id ${id}.`);
      // setPhaseDone maps over the phases and a miss changes nothing, so the
      // answer would say Done about a phase that is not there.
      if (!project.phases.some((p) => p.id === phase)) {
        return text(`No phase ${phase} on ${id}.`);
      }
      await setPhaseDone(id, phase, done);
      return text(done ? 'Done.' : 'Reopened.');
    },
  );

  server.tool(
    'remove_phase',
    'Remove a phase from a project. The remaining phases keep their ids.',
    { id: z.string(), phase: z.string() },
    async ({ id, phase }) => {
      await removePhase(id, phase);
      return text('Removed.');
    },
  );

  server.tool(
    'add_project_link',
    'Add a labelled link to a project. http(s) only — the same rule as links on a person.',
    {
      id: z.string(),
      url: z.string(),
      label: z.string().optional().describe('The site name if left out.'),
    },
    async ({ id, url, label }) => {
      await addProjectLink(id, label ?? '', url);
      return text('Added.');
    },
  );

  server.tool(
    'remove_project_link',
    'Remove a project link by its position in read_project, counting from zero.',
    { id: z.string(), index: z.number().int().min(0) },
    async ({ id, index }) => {
      await removeProjectLink(id, index);
      return text('Removed.');
    },
  );

  server.tool(
    'list_tasks',
    'Tasks, filtered. Open ones by default, soonest due first. `total` counts before the limit, so a truncated answer says it is one.',
    {
      status: z.enum(['open', 'done', 'all']).default('open'),
      personSlug: z
        .string()
        .nullable()
        .optional()
        .describe('A slug for one person; null for tasks belonging to nobody.'),
      projectId: z
        .string()
        .nullable()
        .optional()
        .describe('An id for one project; null for tasks belonging to no project.'),
      priority: TaskPriority.optional(),
      kind: z.enum(['task', 'waiting']).optional().describe('`waiting` is what somebody owes you.'),
      dueBefore: IsoDate.optional(),
      late: z.boolean().optional().describe('Only tasks already past their due date.'),
      limit: z.number().int().min(1).max(500).default(100),
    },
    async (input) => {
      const vault = getVault();
      const now = today();
      const rows = vault.tasks.filter((t) => {
        const done = t.status === 'done';
        if (input.status === 'open' && done) return false;
        if (input.status === 'done' && !done) return false;
        if (input.personSlug !== undefined && t.personSlug !== input.personSlug) return false;
        if (input.projectId !== undefined && t.projectId !== input.projectId) return false;
        if (input.priority && t.priority !== input.priority) return false;
        if (input.kind && t.kind !== input.kind) return false;
        if (input.dueBefore && (!t.dueDate || t.dueDate >= input.dueBefore)) return false;
        if (input.late && !(t.dueDate && t.dueDate < now)) return false;
        return true;
      });
      // Soonest due first, and a task with no date sorts after every task that
      // has one — an undated task is not urgent, it is unscheduled.
      const sorted = rows
        .slice()
        .sort((a, b) => (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31'));
      return text({
        total: sorted.length,
        tasks: sorted.slice(0, input.limit).map((t) => taskView(t, now)),
      });
    },
  );

  server.tool(
    'list_notes',
    'Notes, filtered, newest first. Front matter only — no bodies, so a wide query stays readable. Use read_note for one.',
    {
      personSlug: z
        .string()
        .nullable()
        .optional()
        .describe('A slug for one person; null for notes about nobody.'),
      project: z
        .string()
        .nullable()
        .optional()
        .describe('An id for one project; null for notes on no project.'),
      category: z.enum(NOTE_CATEGORIES).optional(),
      location: z.enum(['person', 'inbox', 'general']).optional(),
      draft: z.boolean().optional(),
      pinned: z.boolean().optional(),
      limit: z.number().int().min(1).max(500).default(100),
    },
    async (input) => {
      const rows = getVault().notes.filter((n) => {
        if (input.personSlug !== undefined && n.personSlug !== input.personSlug) return false;
        if (input.project !== undefined && n.project !== input.project) return false;
        if (input.category && n.category !== input.category) return false;
        if (input.location && n.location !== input.location) return false;
        if (input.draft !== undefined && n.draft !== input.draft) return false;
        if (input.pinned !== undefined && n.pinned !== input.pinned) return false;
        return true;
      });
      const sorted = rows.slice().sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? 1 : -1));
      return text({
        total: sorted.length,
        notes: sorted.slice(0, input.limit).map(noteView),
      });
    },
  );

  server.tool(
    'read_note',
    'One note, with its front matter and body.',
    { path: z.string() },
    async ({ path }) => {
      const note = getNote(path);
      return note ? text(note) : text(`No note at ${path}.`);
    },
  );

  server.tool(
    'read_hours',
    'The overtime balance and the entries behind it. Positive is owed to you. The balance is always the whole vault; a range narrows only the entries.',
    {
      from: IsoDate.optional(),
      to: IsoDate.optional(),
      limit: z.number().int().min(1).max(500).default(100),
    },
    async ({ from, to, limit }) => {
      const all = allTimeEntries();
      const rows = all.filter((e) => (!from || e.date >= from) && (!to || e.date <= to));
      return text({
        balance: formatHours(sumHours(all)),
        rangeTotal: formatHours(sumHours(rows)),
        total: rows.length,
        // allTimeEntries is newest first, which is the order to read a log in.
        entries: rows.slice(0, limit),
      });
    },
  );

  /*
   * The four below read `.cache/` and nothing else, and that is a rule rather
   * than how they happen to be written: **an agent may not make this app go to
   * the network.**
   *
   * Every sync is a GET, so this is not the read-only rule — it is a separate
   * decision. What it protects is who spends the quota and when. A tool that can
   * see a cache is four hours old must say so; it must not refresh it. That is a
   * person pressing a sync badge, or the shell's own minute timer.
   *
   * `tests/unit/readonly.test.ts` fails the build if anything under `mcp/`
   * reaches a sync, the layers under one, or `fetch` itself.
   */
  server.tool(
    'read_day',
    'What the Overview shows, for one day: meetings, approvals waiting, who is away, what is late or due, pull requests waiting on review, the hours balance and how much is unsaved. Read from cache — it never goes to the network, and every part says how old it is.',
    { date: IsoDate.optional().describe('Today if left out.') },
    async ({ date }) => {
      const day = date ?? today();
      const vault = getVault();
      const bamboo = readBamboo();
      const calendar = readCalendar();
      const github = readGithub();
      const instant = clockNow();
      const now = today();
      const nameOf = (slug: string | null) =>
        slug ? (vault.peopleBySlug.get(slug)?.displayName ?? slug) : null;

      // An all-day entry on a work calendar is a status, not something you
      // attend — Google exports one every day for its working-location feature.
      const meetings = calendar.events
        .filter((e) => !e.allDay && e.start.slice(0, 10) === day)
        .map((e) => ({
          start: e.start,
          end: e.end,
          summary: e.summary,
          location: e.location,
          conference: e.conference,
          state: meetingState(e.start, e.end, instant),
        }));

      const presence = (bamboo.data?.timeOff ?? []).filter((t) => coversDay(t, day));
      const presenceView = (t: (typeof presence)[number]) => ({
        slug: t.slug,
        name: nameOf(t.slug) ?? t.name,
        type: t.type,
        start: t.start,
        end: t.end,
      });

      const open = vault.tasks.filter((t) => t.status !== 'done');
      const repo = await repoState();
      const changed = repo.kind === 'ok' ? await changedFiles() : [];

      return text({
        date: day,
        meetings: { freshness: calendar.freshness, events: meetings },
        approvals: {
          freshness: bamboo.inboxFreshness,
          items: (bamboo.data?.inbox ?? []).map((i) => ({ ...i, name: nameOf(i.slug) })),
        },
        away: presence.filter((t) => !t.wfh).map(presenceView),
        workingFromHome: presence.filter((t) => t.wfh).map(presenceView),
        tasks: {
          open: open.length,
          late: open.filter((t) => t.dueDate && t.dueDate < now).map((t) => taskView(t, now)),
          due: open.filter((t) => t.dueDate === day).map((t) => taskView(t, now)),
          waiting: open.filter((t) => t.kind === 'waiting').length,
        },
        reviews: {
          freshness: github.freshness,
          pullRequests: (github.data?.pullRequests ?? []).map((pr) => ({
            repo: pr.repo,
            number: pr.number,
            title: pr.title,
            url: pr.url,
            author: pr.author,
            person: nameOf(pr.personSlug),
            draft: pr.draft,
            opened: openedLabel(pr.openedAt),
            changedFiles: pr.changedFiles,
          })),
        },
        hours: { balance: formatHours(sumHours(allTimeEntries())) },
        vault: { unsavedFiles: changed.length, problems: vault.problems.length },
      });
    },
  );

  server.tool(
    'read_compensation',
    "One person's pay: what BambooHR holds, the bonuses, the rises planned in the vault, and the rate in force in a given month. Planned rises are marked as planned and are never written back.",
    { slug: z.string(), asOf: IsoDate.optional().describe('Today if left out.') },
    async ({ slug, asOf }) => {
      const vault = getVault();
      if (!vault.peopleBySlug.has(slug)) return text(`No person with the slug ${slug}.`);
      const bamboo = readBamboo();
      const comp = bamboo.data?.compensation[slug];
      const plans = vault.plans.get(slug) ?? [];
      const month = ymOfIso(asOf ?? today());
      const at = rateAt(buildTimeline(comp?.rows ?? [], plans), month);
      return text({
        freshness: bamboo.compFreshness,
        currency: comp?.currency ?? 'EUR',
        paidPer: comp?.paidPer ?? 'Month',
        current: at.active,
        lastRise: lastRiseLabel(at, month),
        nextRise: nextRiseLabel(at, month),
        rows: comp?.rows ?? [],
        bonuses: comp?.bonus ?? [],
        plans,
        note: comp ? null : 'No compensation has been synced for this person.',
      });
    },
  );

  server.tool(
    'read_sources',
    'Whether each source is configured, how old its cache is, and what went wrong if anything did.',
    {},
    async () => {
      const bamboo = readBamboo();
      const calendar = readCalendar();
      const github = readGithub();
      const config = loadConfig();
      return text({
        // A source can be unconfigured because nobody set it up, or because what
        // was set up is wrong. Those read the same in a freshness state and do
        // not read the same to somebody trying to fix it.
        env: config.problems,
        bamboohr: {
          roster: bamboo.freshness,
          approvalsAndPresence: bamboo.inboxFreshness,
          compensation: bamboo.compFreshness,
          people: bamboo.data?.employees.length ?? 0,
        },
        calendar: { freshness: calendar.freshness, events: calendar.events.length },
        github: {
          freshness: github.freshness,
          pullRequests: github.data?.pullRequests.length ?? 0,
        },
      });
    },
  );

  server.tool(
    'read_egress',
    'The outbound request log: every request this app has made, newest last. Where to look when a source says it failed.',
    { limit: z.number().int().min(1).max(500).default(50) },
    async ({ limit }) => text(readEgress(limit).join('\n') || 'Nothing has been requested yet.'),
  );

  server.tool(
    'search',
    'Everything the vault holds, by substring — case-insensitive, not fuzzy. People, projects, tasks, notes, About, phases, links and the time log. `truncated` names any list the limit cut.',
    { query: z.string().min(1), limit: z.number().int().min(1).max(200).default(25) },
    async ({ query, limit }) => {
      const needle = query.toLowerCase();
      const vault = getVault();
      const has = (value: string | null | undefined) =>
        Boolean(value?.toLowerCase().includes(needle));

      // Enough of the line to recognise the hit, not enough to fill the answer
      // with somebody's whole About page.
      const excerpt = (body: string) => {
        const at = body.toLowerCase().indexOf(needle);
        if (at < 0) return '';
        return `${at > 40 ? '…' : ''}${body.slice(Math.max(0, at - 40), at + 80).trim()}…`;
      };

      const nameOf = (slug: string) => vault.peopleBySlug.get(slug)?.displayName ?? slug;

      const found = {
        people: vault.people
          .filter((p) => has(p.displayName) || p.slug.includes(needle))
          .map((p) => ({ slug: p.slug, name: p.displayName })),
        projects: vault.projects
          .filter((p) => has(p.title) || p.id.includes(needle) || has(p.description))
          .map((p) => ({ id: p.id, title: p.title, archived: p.archived })),
        tasks: vault.tasks
          .filter((t) => has(t.title) || has(t.description))
          .map((t) => ({
            id: t.id,
            title: t.title,
            due: t.dueDate,
            done: t.status === 'done',
            project: t.projectId,
          })),
        notes: vault.notes
          .filter((n) => has(n.title) || has(n.body))
          .map((n) => ({ path: n.path, title: n.title, date: n.date })),
        about: [...vault.about.entries()]
          .filter(([, body]) => has(body))
          .map(([slug, body]) => ({ slug, name: nameOf(slug), excerpt: excerpt(body) })),
        phases: vault.projects.flatMap((p) =>
          p.phases
            .filter((phase) => has(phase.label) || has(phase.note))
            .map((phase) => ({
              projectId: p.id,
              project: p.title,
              phase: phase.id,
              label: phase.label,
              note: phase.note,
              done: phase.done,
            })),
        ),
        links: [
          ...[...vault.links.entries()].flatMap(([slug, links]) =>
            links
              .filter((l) => has(l.label) || has(l.url))
              .map((l) => ({ on: 'person' as const, owner: slug, ...l })),
          ),
          ...vault.projects.flatMap((p) =>
            p.links
              .filter((l) => has(l.label) || has(l.url))
              .map((l) => ({ on: 'project' as const, owner: p.id, ...l })),
          ),
        ],
        hours: vault.time
          .filter((e) => has(e.note))
          .map((e) => ({ id: e.id, date: e.date, hours: e.hoursDelta, note: e.note })),
      };

      const truncated = Object.entries(found)
        .filter(([, rows]) => rows.length > limit)
        .map(([kind]) => kind);
      return text({
        ...Object.fromEntries(Object.entries(found).map(([k, rows]) => [k, rows.slice(0, limit)])),
        ...(truncated.length > 0 ? { truncated } : {}),
      });
    },
  );

  server.tool(
    'add_task',
    'Add a task. Everything except the title is optional.',
    {
      title: z.string().min(1),
      priority: z.enum(['urgent', 'important', 'normal']).optional(),
      dueDate: IsoDate.nullable().optional(),
      personSlug: z.string().nullable().optional(),
      projectId: z.string().nullable().optional(),
      kind: z
        .enum(['task', 'waiting'])
        .optional()
        .describe('`waiting` is something somebody owes you, not something you do.'),
    },
    async (input) => {
      await addTask({
        title: input.title,
        priority: input.priority ?? 'normal',
        dueDate: input.dueDate ?? null,
        personSlug: input.personSlug ?? null,
        projectId: input.projectId ?? null,
        kind: input.kind ?? 'task',
      });
      return text('Added.');
    },
  );

  server.tool(
    'complete_task',
    'Mark a task done, or reopen it.',
    { id: z.string(), done: z.boolean().default(true) },
    async ({ id, done }) => {
      await setTaskStatus(id, done);
      return text(done ? 'Completed.' : 'Reopened.');
    },
  );

  server.tool(
    'update_task',
    'Change a task. Only the fields given move; everything else stays as it is. Ids come from list_tasks or search.',
    {
      id: z.string(),
      title: z.string().min(1).optional(),
      priority: TaskPriority.optional(),
      dueDate: IsoDate.nullable().optional().describe('Null clears the due date.'),
      personSlug: z.string().nullable().optional().describe('Null unassigns it.'),
      projectId: z.string().nullable().optional().describe('Null takes it off its project.'),
      kind: z.enum(['task', 'waiting']).optional(),
    },
    async ({ id, ...patch }) => {
      // updateTask takes a whole task, on purpose: the dialog it was written for
      // always has one. A tool has a few named fields instead, so the rest are
      // read back here rather than left for the store to guess.
      const task = getVault().tasksById.get(id);
      if (!task) return text(`No task with the id ${id}.`);
      await updateTask(id, {
        title: patch.title ?? task.title,
        priority: patch.priority ?? task.priority,
        dueDate: patch.dueDate === undefined ? task.dueDate : patch.dueDate,
        personSlug: patch.personSlug === undefined ? task.personSlug : patch.personSlug,
        projectId: patch.projectId === undefined ? task.projectId : patch.projectId,
        kind: patch.kind ?? task.kind,
      });
      return text('Changed.');
    },
  );

  server.tool(
    'delete_task',
    'Delete a task. Gone, not marked done — `npm run vault:restore` has the row if it was a mistake.',
    { id: z.string() },
    async ({ id }) => {
      await deleteTask(id);
      return text('Deleted.');
    },
  );

  server.tool(
    'write_note',
    'Create a note, or replace the body of one that exists. With a path it edits that note; without one it creates a note. A title is required to create and optional to edit — left out, the note keeps the title it has.',
    {
      path: z.string().optional(),
      title: z.string().min(1).optional(),
      body: z.string().default(''),
      personSlug: z.string().nullable().optional(),
      project: z.string().nullable().optional(),
      category: z.enum(NOTE_CATEGORIES).optional(),
      draft: z.boolean().optional(),
      pinned: z.boolean().optional(),
      date: IsoDate.optional().describe(
        'New notes only. Today if left out; move_note changes it after.',
      ),
    },
    async (input) => {
      if (input.path) {
        const existing = getNote(input.path);
        if (!existing) return text(`No note at ${input.path}.`);
        // saveNoteBody rewrites the H1 from the title it is given, so a caller
        // that only wanted to change the body must not have to guess at one.
        await saveNoteBody(input.path, input.title ?? existing.title, input.body);
        if (
          input.category ||
          input.draft !== undefined ||
          input.pinned !== undefined ||
          input.project !== undefined
        ) {
          await setNoteMeta(input.path, {
            ...(input.category ? { category: input.category } : {}),
            ...(input.draft !== undefined ? { draft: input.draft } : {}),
            ...(input.pinned !== undefined ? { pinned: input.pinned } : {}),
            ...(input.project !== undefined ? { project: input.project } : {}),
          });
        }
        return text(input.path);
      }
      if (!input.title) return text('A note needs a title.');
      const created = await createNote({
        title: input.title,
        body: input.body,
        personSlug: input.personSlug ?? null,
        project: input.project ?? null,
        category: input.category ?? 'generic',
        draft: input.draft ?? false,
        ...(input.date ? { date: input.date } : {}),
      });
      // createNote writes `pinned: false` and takes no argument for it — the app
      // pins from the note's own row, after it exists. Passing it here and having
      // it silently vanish is worse than a second write.
      if (input.pinned) await setNoteMeta(created, { pinned: true });
      return text(created);
    },
  );

  server.tool(
    'move_note',
    'Change who a note is about, or its date. Both move the file on disk.',
    {
      path: z.string(),
      personSlug: z.string().nullable().optional(),
      date: IsoDate.optional(),
    },
    async ({ path, personSlug, date }) => {
      const result = await moveNote(path, {
        ...(personSlug !== undefined ? { personSlug } : {}),
        ...(date ? { date } : {}),
      });
      return text(result.path);
    },
  );

  server.tool(
    'delete_note',
    'Delete a note. A snapshot is taken first, so `npm run vault:restore` can bring it back — nothing here can.',
    { path: z.string() },
    async ({ path }) => {
      await deleteNote(path);
      return text(`Deleted ${path}.`);
    },
  );

  server.tool(
    'log_hours',
    'Log overtime or time taken back. Positive is owed to you.',
    {
      hours: z.string().describe('e.g. "+1.5" or "-2"'),
      note: z.string().default(''),
      date: IsoDate.optional(),
    },
    async ({ hours, note, date }) => {
      await addTimeEntry(date ?? today(), parseHours(hours), note);
      return text(`Balance is now ${formatHours(sumHours(allTimeEntries()))}.`);
    },
  );

  server.tool(
    'update_hours',
    'Change an entry in the time log. Ids come from read_hours.',
    {
      id: z.string(),
      hours: z.string().optional().describe('e.g. "+1.5" or "-2"'),
      note: z.string().optional(),
      date: IsoDate.optional(),
    },
    async ({ id, hours, note, date }) => {
      const entry = allTimeEntries().find((e) => e.id === id);
      if (!entry) return text(`No time entry with the id ${id}.`);
      await updateTimeEntry(id, {
        date: date ?? entry.date,
        hoursDelta: hours === undefined ? entry.hoursDelta : parseHours(hours),
        note: note ?? entry.note,
      });
      return text(`Balance is now ${formatHours(sumHours(allTimeEntries()))}.`);
    },
  );

  server.tool(
    'delete_hours',
    'Remove an entry from the time log.',
    { id: z.string() },
    async ({ id }) => {
      await deleteTimeEntry(id);
      return text(`Balance is now ${formatHours(sumHours(allTimeEntries()))}.`);
    },
  );

  server.tool(
    'add_link',
    'Add a labelled link to a person.',
    { slug: z.string(), label: z.string(), url: z.string() },
    async ({ slug, label, url }) => {
      await addLink(slug, label, url);
      return text('Added.');
    },
  );

  server.tool(
    'plan_rise',
    'Record a planned pay rise or promotion. Never written to BambooHR.',
    {
      slug: z.string(),
      amount: z.number().positive(),
      month: z.number().int().min(1).max(12),
      year: z.number().int(),
      promotion: z.string().default(''),
    },
    async ({ slug, amount, month, year, promotion }) => {
      await addPlan(slug, { amount, month, year, promotion });
      return text('Planned.');
    },
  );

  server.tool(
    'remove_link',
    "Remove one of a person's links. The index is its position in the list read_person returns.",
    { slug: z.string(), index: z.number().int().min(0) },
    async ({ slug, index }) => {
      await removeLink(slug, index);
      return text('Removed.');
    },
  );

  server.tool(
    'remove_plan',
    'Remove a planned rise or promotion. The id is on the plan read_person returns.',
    { slug: z.string(), id: z.string() },
    async ({ slug, id }) => {
      await removePlan(slug, id);
      return text('Removed.');
    },
  );

  server.tool(
    'write_about',
    'Replace the About markdown for a person.',
    { slug: z.string(), body: z.string() },
    async ({ slug, body }) => {
      await saveAbout(slug, body);
      return text('Saved.');
    },
  );

  server.tool(
    'vault_diff',
    'What has changed in the vault since the last commit.',
    {},
    async () => {
      const repo = await repoState();
      if (repo.kind !== 'ok')
        return text(`The vault is not its own git repository (${repo.kind}).`);
      const files = await changedFiles();
      if (files.length === 0) return text('Nothing to save. The vault matches what you see.');
      return text(await fileDiffs(files));
    },
  );

  server.tool(
    'commit',
    'Commit the vault locally. Never pushes — that stays a decision made in the app.',
    { message: z.string().default('') },
    async ({ message }) => {
      const { files } = await commitAll(message);
      return text(
        `Committed ${files} ${files === 1 ? 'file' : 'files'} locally. Nothing has left this Mac.`,
      );
    },
  );

  server.tool(
    'vault_health',
    'Whether the vault can be written to at all, and the thresholds it is judged against. Check this first if a write is refused.',
    {},
    async () => {
      const health = vaultHealth();
      const vault = getVault();
      return text({
        health,
        editingBlocked: blocksEditing(health),
        vaultPath: vault.root,
        thresholds: vault.config.thresholds,
        dataVersion: vault.config.dataVersion,
        problems: vault.problems.length,
      });
    },
  );

  server.tool(
    'vault_status',
    'Where the vault stands in git: unsaved files, recent commits, how many are unpushed and where they would go.',
    { commits: z.number().int().min(1).max(50).default(8) },
    async ({ commits }) => {
      const repo = await repoState();
      if (repo.kind !== 'ok')
        return text(`The vault is not its own git repository (${repo.kind}).`);
      const target = await upstream();
      return text({
        unsavedFiles: (await changedFiles()).length,
        commits: await recentCommits(commits),
        unpushed: await unpushedCount(),
        // Null rather than an empty object: no remote means nothing can leave
        // this machine, which is a state worth reading as one.
        remote: target,
        firstPush: target ? await isFirstPush() : false,
      });
    },
  );

  server.tool('vault_problems', 'Anything in the vault the app cannot read.', {}, async () => {
    const problems = getVault().problems;
    return text(problems.length === 0 ? 'No problems found.' : problems);
  });
}
