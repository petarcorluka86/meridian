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
 * test hangs — so the wiring, fifteen tools an agent writes the vault through,
 * had no test at all: whether each schema matches what its handler passes down,
 * and whether a bad argument is refused rather than written.
 */
import { z } from 'zod';

import { getVault } from '../src/lib/vault/index.js';
import { addTask, setTaskStatus } from '../src/lib/vault/tasks.js';
import {
  addTimeEntry,
  allTimeEntries,
  formatHours,
  parseHours,
  sumHours,
} from '../src/lib/vault/time.js';
import {
  createNote,
  getNote,
  moveNote,
  saveNoteBody,
  setNoteMeta,
} from '../src/lib/vault/notes.js';
import { addLink, addPlan, saveAbout } from '../src/lib/vault/people.js';
import { changedFiles, commitAll, fileDiffs, repoState } from '../src/lib/git.js';
import { NOTE_CATEGORIES } from '../src/lib/vault/schemas.js';
import { today } from '../src/lib/dates.js';

export type ToolResult = { content: { type: 'text'; text: string }[] };

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
  ): void;
};

export function registerTools(server: Tooling): void {
  const text = (value: unknown) => ({
    content: [
      {
        type: 'text' as const,
        text: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
      },
    ],
  });

  server.tool('list_people', 'The roster, with role and hire date.', {}, async () =>
    text(
      getVault().people.map((p) => ({
        slug: p.slug,
        name: p.displayName,
        role: p.hr.jobTitle,
        hired: p.hr.hireDate,
        status: p.status,
      })),
    ),
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
        notes: (vault.notesByPerson.get(slug) ?? []).map((n) => ({
          path: n.path,
          title: n.title,
          date: n.date,
          category: n.category,
          draft: n.draft,
        })),
        openTasks: vault.tasks.filter((t) => t.personSlug === slug && t.status !== 'done'),
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
    'search',
    'Search people, tasks and note contents.',
    { query: z.string().min(1) },
    async ({ query }) => {
      const needle = query.toLowerCase();
      const vault = getVault();
      return text({
        people: vault.people
          .filter((p) => p.displayName.toLowerCase().includes(needle) || p.slug.includes(needle))
          .map((p) => ({ slug: p.slug, name: p.displayName })),
        tasks: vault.tasks
          .filter((t) => t.title.toLowerCase().includes(needle))
          .map((t) => ({ id: t.id, title: t.title, due: t.dueDate, done: t.status === 'done' })),
        notes: vault.notes
          .filter(
            (n) => n.title.toLowerCase().includes(needle) || n.body.toLowerCase().includes(needle),
          )
          .map((n) => ({ path: n.path, title: n.title, date: n.date })),
      });
    },
  );

  server.tool(
    'add_task',
    'Add a task. Everything except the title is optional.',
    {
      title: z.string().min(1),
      priority: z.enum(['urgent', 'important', 'normal']).optional(),
      dueDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable()
        .optional(),
      personSlug: z.string().nullable().optional(),
    },
    async (input) => {
      await addTask({
        title: input.title,
        priority: input.priority ?? 'normal',
        dueDate: input.dueDate ?? null,
        personSlug: input.personSlug ?? null,
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
    'write_note',
    'Create a note, or replace the body of an existing one.',
    {
      path: z.string().optional(),
      title: z.string().min(1),
      body: z.string().default(''),
      personSlug: z.string().nullable().optional(),
      category: z.enum(NOTE_CATEGORIES).optional(),
      draft: z.boolean().optional(),
    },
    async (input) => {
      if (input.path) {
        await saveNoteBody(input.path, input.title, input.body);
        if (input.category || input.draft !== undefined) {
          await setNoteMeta(input.path, {
            ...(input.category ? { category: input.category } : {}),
            ...(input.draft !== undefined ? { draft: input.draft } : {}),
          });
        }
        return text(input.path);
      }
      const created = await createNote({
        title: input.title,
        body: input.body,
        personSlug: input.personSlug ?? null,
        category: input.category ?? 'generic',
        draft: input.draft ?? false,
      });
      return text(created);
    },
  );

  server.tool(
    'move_note',
    'Change who a note is about, or its date. Both move the file on disk.',
    {
      path: z.string(),
      personSlug: z.string().nullable().optional(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
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
    'log_hours',
    'Log overtime or time taken back. Positive is owed to you.',
    {
      hours: z.string().describe('e.g. "+1.5" or "-2"'),
      note: z.string().default(''),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    },
    async ({ hours, note, date }) => {
      await addTimeEntry(date ?? today(), parseHours(hours), note);
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

  server.tool('vault_problems', 'Anything in the vault the app cannot read.', {}, async () => {
    const problems = getVault().problems;
    return text(problems.length === 0 ? 'No problems found.' : problems);
  });
}
