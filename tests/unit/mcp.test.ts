import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { z } from 'zod';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetConfig } from '@/lib/env';

/**
 * The MCP server is how an agent writes the vault. Fifteen tools, and no test.
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

describe('what the server offers', () => {
  const EXPECTED = [
    'list_people',
    'read_person',
    'list_projects',
    'read_note',
    'search',
    'add_task',
    'complete_task',
    'write_note',
    'move_note',
    'log_hours',
    'add_link',
    'plan_rise',
    'write_about',
    'vault_diff',
    'commit',
    'vault_problems',
  ];

  it('offers exactly these sixteen tools', async () => {
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
