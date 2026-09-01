import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { z } from 'zod';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetConfig } from '@/lib/env';
import { addDays, today } from '@/lib/dates';

/**
 * The MCP server is how an agent reads and writes the vault. Thirty-two tools, and no test.
 *
 * The store layer beneath them is well covered; the wiring was not — whether
 * each tool's schema matches what its handler passes down, and whether a bad
 * argument is refused rather than written. A schema that accepts something the
 * handler cannot use is a write that corrupts a file, made by something with no
 * hands to notice.
 */

type Tool = {
  name: string;
  description: string;
  schema: z.ZodRawShape;
  run: (input: unknown) => Promise<{ content: { type: 'text'; text: string }[] }>;
};

async function tools(): Promise<Map<string, Tool>> {
  const { registerTools } = await import('../../mcp/tools');
  const found = new Map<string, Tool>();
  registerTools({
    tool: (name: string, description: string, schema: unknown, handler: unknown) => {
      found.set(name, {
        name,
        description,
        schema: schema as z.ZodRawShape,
        run: handler as Tool['run'],
      });
    },
  } as never);
  return found;
}

/** What the tool would do with these arguments, or why it will not. */
async function call(tool: Tool, input: Record<string, unknown>): Promise<string> {
  const { z: zod } = await import('zod');
  const parsed = zod.object(tool.schema).safeParse(input);
  if (!parsed.success) throw new Error(`refused: ${parsed.error.issues[0]?.message}`);
  const result = await tool.run(parsed.data);
  return result.content.map((c) => c.text).join('\n');
}

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-mcp-'));
  for (const sub of ['people', 'notes/inbox', 'notes/general']) {
    fs.mkdirSync(path.join(dir, sub), { recursive: true });
  }
  fs.writeFileSync(path.join(dir, 'people/entries.json'), '[]\n');
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

/** A roster of one, with a folder, so a note can be filed against it. */
function withPerson(slug = 'ana-horvat', name = 'Ana Horvat'): void {
  fs.mkdirSync(path.join(dir, 'people', slug, 'notes'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'people/entries.json'),
    `${JSON.stringify([{ slug, displayName: name, mine: { contactCadenceDays: 14 } }])}\n`,
  );
}

function withProject(): void {
  const stamp = `${today()}T09:00:00.000Z`;
  fs.writeFileSync(
    path.join(dir, 'projects.json'),
    `${JSON.stringify([
      {
        id: 'pay-review',
        title: 'Pay review',
        description: 'The autumn round.',
        phases: [
          { id: 'p1', label: 'Gather numbers', note: 'From Bamboo.', done: true },
          { id: 'p2', label: 'Draft proposals', note: '', done: false },
        ],
        links: [{ label: 'Sheet', url: 'https://example.com/sheet' }],
        archived: false,
        createdAt: stamp,
        updatedAt: stamp,
      },
    ])}\n`,
  );
}

describe('what the server offers', () => {
  const EXPECTED = [
    'list_people',
    'read_person',
    'list_projects',
    'read_project',
    'create_project',
    'update_project',
    'archive_project',
    'add_phase',
    'update_phase',
    'complete_phase',
    'remove_phase',
    'add_project_link',
    'remove_project_link',
    'list_tasks',
    'list_notes',
    'read_note',
    'read_hours',
    'read_day',
    'read_compensation',
    'read_sources',
    'read_egress',
    'search',
    'add_task',
    'complete_task',
    'update_task',
    'delete_task',
    'write_note',
    'move_note',
    'delete_note',
    'log_hours',
    'update_hours',
    'delete_hours',
    'add_link',
    'plan_rise',
    'remove_link',
    'remove_plan',
    'write_about',
    'vault_diff',
    'commit',
    'vault_health',
    'vault_status',
    'vault_problems',
  ];

  it('offers exactly these forty-two tools', async () => {
    // Agents refer to tools by name, so renaming one is a breaking change and
    // should have to be made here on purpose.
    expect([...(await tools()).keys()]).toEqual(EXPECTED);
  });

  it('describes every one of them', async () => {
    for (const tool of (await tools()).values()) {
      expect(tool.description.length, tool.name).toBeGreaterThan(15);
    }
  });
});

describe('a bad argument is refused, not written', () => {
  it('will not add a task with no title', async () => {
    const add = (await tools()).get('add_task')!;
    await expect(call(add, { title: '' })).rejects.toThrow(/refused/);
    await expect(call(add, { title: 'Real', dueDate: '2026-9-1' })).rejects.toThrow(/refused/);

    // Nothing reached the file on either attempt.
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'tasks.json'), 'utf8'))).toEqual([]);
  });

  it('will not log hours that are not hours', async () => {
    const log = (await tools()).get('log_hours')!;
    await expect(call(log, { date: 'yesterday', hours: '+1' })).rejects.toThrow(/refused/);
    // The schema takes hours as a string; the store is what rejects the value,
    // and it must reject rather than write a zero.
    await expect(call(log, { date: '2026-08-12', hours: 'lots' })).rejects.toThrow();
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'time.json'), 'utf8'))).toEqual([]);
  });

  it('will not plan a rise of nothing', async () => {
    const plan = (await tools()).get('plan_rise')!;
    await expect(
      call(plan, { slug: 'ana-horvat', amount: -100, month: 4, year: 2026 }),
    ).rejects.toThrow(/refused/);
    await expect(
      call(plan, { slug: 'ana-horvat', amount: 4200, month: 13, year: 2026 }),
    ).rejects.toThrow(/refused/);
  });

  it('will not write a note in a category that does not exist', async () => {
    const write = (await tools()).get('write_note')!;
    await expect(call(write, { title: 'A note', category: 'gossip' })).rejects.toThrow(/refused/);
  });

  it('will not create a nameless project, nor hang a javascript: link on one', async () => {
    const all = await tools();
    await expect(call(all.get('create_project')!, { title: '' })).rejects.toThrow(/refused/);
    await expect(call(all.get('add_phase')!, { id: 'x', label: '' })).rejects.toThrow(/refused/);
    expect(fs.existsSync(path.join(dir, 'projects.json'))).toBe(false);

    withProject();
    // The schema takes any string; the store is what refuses the scheme.
    await expect(
      call(all.get('add_project_link')!, { id: 'pay-review', url: 'javascript:alert(1)' }),
    ).rejects.toThrow(/http/);
  });

  it('will not touch a person who is not in the roster', async () => {
    const link = (await tools()).get('add_link')!;
    await expect(
      call(link, { slug: 'nobody', label: 'Docs', url: 'https://example.com' }),
    ).rejects.toThrow();
    expect(fs.existsSync(path.join(dir, 'people/nobody'))).toBe(false);
  });
});

describe('what the tools actually do', () => {
  it('adds a task and finds it again', async () => {
    const all = await tools();
    await call(all.get('add_task')!, { title: 'Send the pay-rise proposal', priority: 'urgent' });

    const saved = JSON.parse(fs.readFileSync(path.join(dir, 'tasks.json'), 'utf8'));
    expect(saved).toHaveLength(1);
    expect(saved[0].priority).toBe('urgent');

    expect(await call(all.get('search')!, { query: 'pay-rise' })).toContain('Send the pay-rise');
  });

  it('completes a task by the id it was given', async () => {
    const all = await tools();
    await call(all.get('add_task')!, { title: 'One thing' });
    const [task] = JSON.parse(fs.readFileSync(path.join(dir, 'tasks.json'), 'utf8'));

    await call(all.get('complete_task')!, { id: task.id, done: true });
    const [after] = JSON.parse(fs.readFileSync(path.join(dir, 'tasks.json'), 'utf8'));
    expect(after.status).toBe('done');
  });

  it('writes a note to a real file, with front matter', async () => {
    const all = await tools();
    const said = await call(all.get('write_note')!, {
      title: 'A thought',
      body: 'Worth keeping.',
      category: 'idea',
    });

    const written = said.match(/notes\/[^\s]+\.md/)?.[0];
    expect(written).toBeTruthy();
    const contents = fs.readFileSync(path.join(dir, written as string), 'utf8');
    expect(contents).toContain('category: idea');
    expect(contents).toContain('Worth keeping.');
  });

  it('reports what the app cannot read', async () => {
    fs.writeFileSync(path.join(dir, 'tasks.json'), 'not json');
    const problems = await call((await tools()).get('vault_problems')!, {});
    expect(problems).toContain('tasks.json');
  });
});

describe('what an agent can read', () => {
  it('counts every match before the limit, so a trimmed answer says it is one', async () => {
    const all = await tools();
    for (let i = 0; i < 5; i++) await call(all.get('add_task')!, { title: `Thing ${i}` });

    const trimmed = JSON.parse(await call(all.get('list_tasks')!, { limit: 2 }));
    expect(trimmed.total).toBe(5);
    expect(trimmed.tasks).toHaveLength(2);
  });

  it('filters tasks by person, and null means nobody', async () => {
    withPerson();
    const all = await tools();
    await call(all.get('add_task')!, { title: 'Hers', personSlug: 'ana-horvat' });
    await call(all.get('add_task')!, { title: 'Nobody s' });

    const hers = JSON.parse(await call(all.get('list_tasks')!, { personSlug: 'ana-horvat' }));
    expect(hers.tasks.map((t: { title: string }) => t.title)).toEqual(['Hers']);

    const loose = JSON.parse(await call(all.get('list_tasks')!, { personSlug: null }));
    expect(loose.tasks.map((t: { title: string }) => t.title)).toEqual(['Nobody s']);
  });

  it('leaves done tasks out until they are asked for', async () => {
    const all = await tools();
    await call(all.get('add_task')!, { title: 'Finished' });
    const [task] = JSON.parse(fs.readFileSync(path.join(dir, 'tasks.json'), 'utf8'));
    await call(all.get('complete_task')!, { id: task.id, done: true });

    expect(JSON.parse(await call(all.get('list_tasks')!, {})).total).toBe(0);
    expect(JSON.parse(await call(all.get('list_tasks')!, { status: 'done' })).total).toBe(1);
    expect(JSON.parse(await call(all.get('list_tasks')!, { status: 'all' })).total).toBe(1);
  });

  it('lists notes without their bodies', async () => {
    const all = await tools();
    await call(all.get('write_note')!, { title: 'A thought', body: 'Worth keeping.' });

    const listed = await call(all.get('list_notes')!, {});
    expect(listed).toContain('A thought');
    // The body is what read_note is for; a list of fifty would be unreadable.
    expect(listed).not.toContain('Worth keeping.');
  });

  it('gives the balance for the vault and the total for the range', async () => {
    const all = await tools();
    await call(all.get('log_hours')!, { hours: '+2', date: '2026-01-10', note: 'Release' });
    await call(all.get('log_hours')!, { hours: '-1', date: '2026-06-02', note: 'Left early' });

    const read = JSON.parse(
      await call(all.get('read_hours')!, { from: '2026-01-01', to: '2026-03-01' }),
    );
    expect(read.balance).toBe('+1.0h');
    expect(read.rangeTotal).toBe('+2.0h');
    expect(read.total).toBe(1);
  });

  it('opens a project with its phases, its links and its tasks', async () => {
    withProject();
    const all = await tools();
    await call(all.get('add_task')!, { title: 'Pull the numbers', projectId: 'pay-review' });

    const read = JSON.parse(await call(all.get('read_project')!, { id: 'pay-review' }));
    expect(read.progress).toMatchObject({ total: 2, done: 1, percent: 50 });
    expect(read.phases[0].note).toBe('From Bamboo.');
    expect(read.links).toHaveLength(1);
    expect(read.tasks.map((t: { title: string }) => t.title)).toEqual(['Pull the numbers']);

    expect(await call(all.get('read_project')!, { id: 'nope' })).toContain('No project');
  });

  it('shapes a project: created with phases, ticked, linked, and read back whole', async () => {
    const all = await tools();
    const created = await call(all.get('create_project')!, {
      title: 'DevOps education',
      description: 'The mentorship.',
      phases: ['P1 Foundations', 'P2 AWS by hand'],
    });
    expect(created).toBe('Created devops-education.');

    await call(all.get('complete_phase')!, { id: 'devops-education', phase: 'p1' });
    await call(all.get('add_phase')!, { id: 'devops-education', label: 'P3 Terraform' });
    await call(all.get('add_project_link')!, {
      id: 'devops-education',
      label: 'Roadmap',
      url: 'https://example.com/roadmap',
    });
    await call(all.get('update_project')!, { id: 'devops-education', description: 'Week 1.' });

    const read = JSON.parse(await call(all.get('read_project')!, { id: 'devops-education' }));
    // The title survived an update that only sent the description.
    expect(read.title).toBe('DevOps education');
    expect(read.description).toBe('Week 1.');
    expect(read.progress).toMatchObject({ total: 3, done: 1 });
    expect(read.links).toEqual([{ label: 'Roadmap', url: 'https://example.com/roadmap' }]);

    await call(all.get('remove_phase')!, { id: 'devops-education', phase: 'p3' });
    await call(all.get('remove_project_link')!, { id: 'devops-education', index: 0 });
    const after = JSON.parse(await call(all.get('read_project')!, { id: 'devops-education' }));
    expect(after.progress.total).toBe(2);
    expect(after.links).toEqual([]);
  });

  it('files a task under a phase, and the phase answers with its own task fraction', async () => {
    withProject();
    const all = await tools();
    await call(all.get('add_task')!, {
      title: 'Pull the numbers',
      projectId: 'pay-review',
      phaseId: 'p2',
    });
    await call(all.get('add_task')!, { title: 'Loose end', projectId: 'pay-review' });

    const read = JSON.parse(await call(all.get('read_project')!, { id: 'pay-review' }));
    expect(read.phases[1].tasks).toEqual({ total: 1, done: 0, percent: 0, complete: false });
    expect(read.phases[0].tasks).toMatchObject({ total: 0 });
    expect(read.tasks.find((t: { title: string }) => t.title === 'Pull the numbers').phaseId).toBe(
      'p2',
    );

    // Moving the task to another project drops the phase rather than carrying a
    // reference that names a different phase there.
    await call(all.get('create_project')!, { title: 'Elsewhere' });
    const task = JSON.parse(await call(all.get('list_tasks')!, {})).tasks.find(
      (t: { title: string }) => t.title === 'Pull the numbers',
    );
    await call(all.get('update_task')!, { id: task.id, projectId: 'elsewhere' });
    const moved = JSON.parse(await call(all.get('list_tasks')!, {})).tasks.find(
      (t: { id: string }) => t.id === task.id,
    );
    expect(moved.phaseId).toBeNull();
  });

  it('archives a project and restores it, with nothing lost in between', async () => {
    withProject();
    const all = await tools();
    await call(all.get('archive_project')!, { id: 'pay-review' });
    expect(JSON.parse(await call(all.get('list_projects')!, {}))).toEqual([]);

    await call(all.get('archive_project')!, { id: 'pay-review', archived: false });
    const [project] = JSON.parse(await call(all.get('list_projects')!, {}));
    expect(project).toMatchObject({ id: 'pay-review', phases: { total: 2, done: 1 } });
  });

  it('says so, rather than Done, about a phase that is not there', async () => {
    withProject();
    const all = await tools();
    expect(await call(all.get('complete_phase')!, { id: 'pay-review', phase: 'p9' })).toContain(
      'No phase',
    );
    expect(await call(all.get('update_phase')!, { id: 'nope', phase: 'p1' })).toContain(
      'No project',
    );
  });

  it('says how long since the last note about somebody, against their cadence', async () => {
    withPerson();
    const stale = addDays(today(), -30);
    fs.writeFileSync(
      path.join(dir, 'people/ana-horvat/notes', `${stale}-catch-up.md`),
      '---\ncategory: 1on1\n---\n\n# Catch up\n',
    );

    const [person] = JSON.parse(await call((await tools()).get('list_people')!, {}));
    expect(person.lastNote).toBe(stale);
    expect(person.daysSinceLastNote).toBe(30);
    expect(person.overdue).toBe(true);
  });

  it('says nothing rather than overdue for somebody with no notes at all', async () => {
    withPerson();
    const [person] = JSON.parse(await call((await tools()).get('list_people')!, {}));
    expect(person.daysSinceLastNote).toBeNull();
    // Never spoken to and overdue are different states, and one is worse.
    expect(person.overdue).toBeNull();
  });
});

describe('what an agent can put right again', () => {
  async function oneTask(): Promise<{ id: string }> {
    const all = await tools();
    await call(all.get('add_task')!, { title: 'Draft the proposal', priority: 'normal' });
    return JSON.parse(fs.readFileSync(path.join(dir, 'tasks.json'), 'utf8'))[0];
  }

  it('changes only the fields it is given', async () => {
    const task = await oneTask();
    await call((await tools()).get('update_task')!, { id: task.id, priority: 'urgent' });

    const [after] = JSON.parse(fs.readFileSync(path.join(dir, 'tasks.json'), 'utf8'));
    expect(after.priority).toBe('urgent');
    expect(after.title).toBe('Draft the proposal');
  });

  it('clears a due date when told null, rather than leaving it alone', async () => {
    const all = await tools();
    await call(all.get('add_task')!, { title: 'Dated', dueDate: '2026-09-01' });
    const [task] = JSON.parse(fs.readFileSync(path.join(dir, 'tasks.json'), 'utf8'));

    await call(all.get('update_task')!, { id: task.id, dueDate: null });
    const [after] = JSON.parse(fs.readFileSync(path.join(dir, 'tasks.json'), 'utf8'));
    expect(after.dueDate).toBeNull();
  });

  it('says so, and writes nothing, when the task is gone', async () => {
    const said = await call((await tools()).get('update_task')!, { id: 'nope', title: 'X' });
    expect(said).toContain('No task');
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'tasks.json'), 'utf8'))).toEqual([]);
  });

  it('deletes a task outright', async () => {
    const task = await oneTask();
    await call((await tools()).get('delete_task')!, { id: task.id });
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'tasks.json'), 'utf8'))).toEqual([]);
  });

  it('edits and deletes a time entry, and says the balance each time', async () => {
    const all = await tools();
    await call(all.get('log_hours')!, { hours: '+2', date: '2026-01-10', note: 'Release' });
    const [entry] = JSON.parse(fs.readFileSync(path.join(dir, 'time.json'), 'utf8'));

    expect(await call(all.get('update_hours')!, { id: entry.id, hours: '+3' })).toContain('+3.0h');
    expect(await call(all.get('delete_hours')!, { id: entry.id })).toContain('0.0h');
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'time.json'), 'utf8'))).toEqual([]);
  });

  it('takes back a link and a plan it added', async () => {
    withPerson();
    const all = await tools();
    await call(all.get('add_link')!, {
      slug: 'ana-horvat',
      label: 'Docs',
      url: 'https://example.com',
    });
    await call(all.get('plan_rise')!, { slug: 'ana-horvat', amount: 4200, month: 4, year: 2027 });

    const before = JSON.parse(await call(all.get('read_person')!, { slug: 'ana-horvat' }));
    expect(before.links).toHaveLength(1);

    await call(all.get('remove_link')!, { slug: 'ana-horvat', index: 0 });
    await call(all.get('remove_plan')!, { slug: 'ana-horvat', id: before.plans[0].id });

    const after = JSON.parse(await call(all.get('read_person')!, { slug: 'ana-horvat' }));
    expect(after.links).toEqual([]);
    expect(after.plans).toEqual([]);
  });

  it('pins a note it is creating, which createNote cannot do on its own', async () => {
    const said = await call((await tools()).get('write_note')!, {
      title: 'Standing item',
      pinned: true,
    });
    const written = said.match(/notes\/[^\s]+\.md/)?.[0] as string;
    expect(fs.readFileSync(path.join(dir, written), 'utf8')).toContain('pinned: true');
  });
});
describe('what an agent can see without going anywhere', () => {
  /** A pinned instant, so "running" and "over" mean the same thing every run. */
  const NOW = '2026-08-24T10:30:00.000Z';

  function cache(source: string, payload: Record<string, unknown>): void {
    fs.mkdirSync(path.join(dir, '.cache'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, '.cache', `${source}.json`),
      `${JSON.stringify({ fetchedAt: NOW, etag: null, ...payload })}\n`,
    );
  }

  beforeEach(() => {
    process.env.MERIDIAN_NOW = NOW;
  });
  afterEach(() => {
    delete process.env.MERIDIAN_NOW;
  });

  it('says which meeting is running, which is over and which is still to come', async () => {
    cache('calendar', {
      events: [
        {
          uid: 'a',
          start: '2026-08-24T09:00:00.000Z',
          end: '2026-08-24T09:30:00.000Z',
          allDay: false,
          summary: 'Standup',
          location: '',
          conference: null,
        },
        {
          uid: 'b',
          start: '2026-08-24T10:00:00.000Z',
          end: '2026-08-24T11:00:00.000Z',
          allDay: false,
          summary: 'Review',
          location: '',
          conference: 'https://meet.example.com/x',
        },
        {
          uid: 'c',
          start: '2026-08-24T15:00:00.000Z',
          end: '2026-08-24T16:00:00.000Z',
          allDay: false,
          summary: 'One to one',
          location: '',
          conference: null,
        },
        {
          uid: 'd',
          start: '2026-08-24',
          end: '2026-08-25',
          allDay: true,
          summary: 'Office',
          location: '',
          conference: null,
        },
      ],
    });

    const day = JSON.parse(await call((await tools()).get('read_day')!, { date: '2026-08-24' }));
    expect(
      day.meetings.events.map((m: { summary: string; state: string }) => [m.summary, m.state]),
    ).toEqual([
      ['Standup', 'past'],
      ['Review', 'now'],
      ['One to one', 'upcoming'],
    ]);
  });

  it('leaves the day empty rather than borrowing another day s meetings', async () => {
    cache('calendar', {
      events: [
        {
          uid: 'a',
          start: '2026-08-25T09:00:00.000Z',
          end: '2026-08-25T09:30:00.000Z',
          allDay: false,
          summary: 'Tomorrow',
          location: '',
          conference: null,
        },
      ],
    });
    const day = JSON.parse(await call((await tools()).get('read_day')!, { date: '2026-08-24' }));
    expect(day.meetings.events).toEqual([]);
  });

  it('names who is away on the day asked for, not who is away in general', async () => {
    withPerson();
    cache('bamboohr', {
      employees: [],
      timeOff: [
        {
          slug: 'ana-horvat',
          name: 'Ana Horvat',
          type: 'Holiday',
          start: '2026-08-20',
          end: '2026-08-24',
          wfh: false,
        },
        {
          slug: 'ana-horvat',
          name: 'Ana Horvat',
          type: 'Home',
          start: '2026-08-26',
          end: '2026-08-26',
          wfh: true,
        },
      ],
    });

    const day = JSON.parse(await call((await tools()).get('read_day')!, { date: '2026-08-24' }));
    expect(day.away.map((r: { name: string }) => r.name)).toEqual(['Ana Horvat']);
    expect(day.workingFromHome).toEqual([]);

    const later = JSON.parse(await call((await tools()).get('read_day')!, { date: '2026-08-26' }));
    expect(later.away).toEqual([]);
    expect(later.workingFromHome).toHaveLength(1);
  });

  it('separates what is late from what is due on the day', async () => {
    const all = await tools();
    await call(all.get('add_task')!, { title: 'Overdue', dueDate: '2026-08-01' });
    await call(all.get('add_task')!, { title: 'Today', dueDate: '2026-08-24' });
    await call(all.get('add_task')!, { title: 'Later', dueDate: '2026-09-30' });

    const day = JSON.parse(await call(all.get('read_day')!, { date: '2026-08-24' }));
    expect(day.tasks.late.map((t: { title: string }) => t.title)).toEqual(['Overdue']);
    expect(day.tasks.due.map((t: { title: string }) => t.title)).toEqual(['Today']);
    expect(day.tasks.open).toBe(3);
  });

  it('names a state for every source rather than implying the numbers are current', async () => {
    cache('calendar', {
      events: [
        {
          uid: 'a',
          start: '2026-08-24T09:00:00.000Z',
          end: '2026-08-24T09:30:00.000Z',
          allDay: false,
          summary: 'Standup',
          location: '',
          conference: null,
        },
      ],
    });
    const sources = JSON.parse(await call((await tools()).get('read_sources')!, {}));

    // Which state it is depends on whether this machine has credentials, and the
    // tool must not care: what it may never do is answer with a count and no word
    // about how old it is.
    const states = ['live', 'stale', 'missing', 'unconfigured', 'failed'];
    for (const source of ['bamboohr', 'calendar', 'github'] as const) {
      const freshness = source === 'bamboohr' ? sources.bamboohr.roster : sources[source].freshness;
      expect(states, source).toContain(freshness.state);
    }
    expect(sources.calendar.events).toBe(1);
  });

  it('reads pay from the cache and the plans from the vault, together', async () => {
    withPerson();
    cache('bamboohr', {
      employees: [],
      compensation: {
        'ana-horvat': {
          currency: 'EUR',
          rows: [
            {
              startDate: '2025-01-01',
              endDate: null,
              rate: 4000,
              gross: null,
              reason: 'Hire',
              comment: '',
            },
            {
              startDate: '2026-01-01',
              endDate: null,
              rate: 4400,
              gross: null,
              reason: 'Rise',
              comment: '',
            },
          ],
          bonus: [{ date: '2026-03-01', amount: 500, reason: 'Delivery' }],
        },
      },
    });
    const all = await tools();
    await call(all.get('plan_rise')!, { slug: 'ana-horvat', amount: 400, month: 12, year: 2026 });

    const pay = JSON.parse(
      await call(all.get('read_compensation')!, { slug: 'ana-horvat', asOf: '2026-08-24' }),
    );
    expect(pay.current).toMatchObject({ amount: 4400, planned: false });
    expect(pay.nextRise).toContain('€400');
    expect(pay.bonuses).toHaveLength(1);
    expect(pay.plans).toHaveLength(1);
  });

  it('refuses a person who is not on the roster rather than inventing an empty history', async () => {
    expect(await call((await tools()).get('read_compensation')!, { slug: 'nobody' })).toContain(
      'No person',
    );
  });
});

describe('what a client is told before it asks', () => {
  it('classifies every tool, so nothing is treated as the worst case by default', async () => {
    const { annotationsOf } = await import('../../mcp/tools');
    for (const name of (await tools()).keys()) {
      expect(annotationsOf(name), name).toBeDefined();
    }
  });

  it('marks the reads read-only and the deletes destructive', async () => {
    const { annotationsOf } = await import('../../mcp/tools');
    for (const name of ['list_people', 'read_day', 'search', 'vault_diff']) {
      expect(annotationsOf(name), name).toMatchObject({ readOnlyHint: true });
    }
    for (const name of [
      'delete_task',
      'delete_hours',
      'remove_link',
      'remove_plan',
      'remove_phase',
      'remove_project_link',
    ]) {
      expect(annotationsOf(name), name).toMatchObject({
        readOnlyHint: false,
        destructiveHint: true,
      });
    }
    // Anything that writes is not read-only, whatever else it is.
    for (const name of ['add_task', 'write_note', 'commit', 'update_task', 'create_project']) {
      expect(annotationsOf(name), name).toMatchObject({ readOnlyHint: false });
    }
  });
});

describe('search reaches the places it used to miss', () => {
  it('finds a word that only appears in somebody s About', async () => {
    withPerson();
    const all = await tools();
    await call(all.get('write_about')!, {
      slug: 'ana-horvat',
      body: 'Runs the Kubernetes migration and mentors two juniors.',
    });

    const found = JSON.parse(await call(all.get('search')!, { query: 'kubernetes' }));
    expect(found.about).toHaveLength(1);
    expect(found.about[0].slug).toBe('ana-horvat');
    expect(found.about[0].excerpt).toContain('Kubernetes');
  });

  it('finds a phase, a link and a line in the time log', async () => {
    withPerson();
    withProject();
    const all = await tools();
    await call(all.get('add_link')!, {
      slug: 'ana-horvat',
      label: 'Handbook',
      url: 'https://example.com/handbook',
    });
    await call(all.get('log_hours')!, {
      hours: '+2',
      date: '2026-02-02',
      note: 'Handbook rewrite',
    });

    const found = JSON.parse(await call(all.get('search')!, { query: 'handbook' }));
    expect(found.links).toHaveLength(1);
    expect(found.hours).toHaveLength(1);

    const phases = JSON.parse(await call(all.get('search')!, { query: 'gather' }));
    expect(phases.phases[0]).toMatchObject({ projectId: 'pay-review', label: 'Gather numbers' });
  });

  it('says which lists the limit cut, rather than cutting them quietly', async () => {
    const all = await tools();
    for (let i = 0; i < 4; i++) await call(all.get('add_task')!, { title: `Report ${i}` });

    const found = JSON.parse(await call(all.get('search')!, { query: 'report', limit: 2 }));
    expect(found.tasks).toHaveLength(2);
    expect(found.truncated).toEqual(['tasks']);
  });
});

describe('editing a note does not require restating its title', () => {
  it('keeps the title when only the body is given', async () => {
    const all = await tools();
    const created = (
      await call(all.get('write_note')!, { title: 'Hiring plan', body: 'First draft.' })
    ).trim();

    await call(all.get('write_note')!, { path: created, body: 'Second draft.' });

    const note = JSON.parse(await call(all.get('read_note')!, { path: created }));
    expect(note.title).toBe('Hiring plan');
    expect(note.body).toContain('Second draft.');
    expect(note.body).not.toContain('First draft.');
  });

  it('still refuses to create a note with no title at all', async () => {
    expect(await call((await tools()).get('write_note')!, { body: 'Orphan.' })).toContain(
      'needs a title',
    );
  });

  it('says so rather than creating one when the path is wrong', async () => {
    const said = await call((await tools()).get('write_note')!, {
      path: 'notes/general/2026-01-01-nope.md',
      body: 'x',
    });
    expect(said).toContain('No note at');
  });
});

describe('what an agent can find out about the vault itself', () => {
  it('says whether writing is possible at all, and what it is judged against', async () => {
    const health = JSON.parse(await call((await tools()).get('vault_health')!, {}));
    expect(health.editingBlocked).toBe(false);
    // The thresholds an agent would otherwise have to guess at.
    expect(health.thresholds).toMatchObject({ contactGapDays: expect.any(Number) });
  });

  it('says the vault is not a repository rather than throwing at git', async () => {
    const said = await call((await tools()).get('vault_status')!, {});
    expect(said).toContain('not its own git repository');
  });

  it('records a task as waiting when it is somebody else s move', async () => {
    const all = await tools();
    await call(all.get('add_task')!, { title: 'Legal to come back', kind: 'waiting' });

    const waiting = JSON.parse(await call(all.get('list_tasks')!, { kind: 'waiting' }));
    expect(waiting.tasks).toHaveLength(1);
    expect(JSON.parse(await call(all.get('list_tasks')!, { kind: 'task' })).tasks).toEqual([]);
  });
});
