import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetConfig } from '@/lib/env';

/**
 * mcp.test.ts covers the tools by implementing `Tooling` itself, which is the
 * right way to test fifteen handlers and says nothing about whether the SDK ever
 * sees them. That join was a cast — `server as unknown as Tooling` — over a
 * method the SDK marks deprecated, on a `^1.30.0` dependency. Type-check, tests
 * and build would all have stayed green with no tools registered at all.
 *
 * So this one drives a real client down a real transport into the real server.
 * In memory rather than over stdio: a spawned `tsx` costs seconds and proves
 * nothing extra, since the transport is not what is in doubt.
 */
let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-mcp-server-'));
  for (const sub of ['people/ana-horvat', 'notes/inbox', 'notes/general']) {
    fs.mkdirSync(path.join(dir, sub), { recursive: true });
  }
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

async function connected() {
  const { createServer } = await import('../../mcp/server');
  const client = new Client({ name: 'test', version: '0' });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await Promise.all([createServer().connect(serverSide), client.connect(clientSide)]);
  return client;
}

describe('the server an agent actually talks to', () => {
  it('registers every tool, with a description and a schema', async () => {
    const client = await connected();
    const { tools } = await client.listTools();

    // The count is asserted here, where a test maintains it, rather than written
    // into a Markdown file where nothing does.
    expect(tools).toHaveLength(45);
    expect(tools.map((t) => t.name).sort()).toEqual([
      'add_link',
      'add_phase',
      'add_project_link',
      'add_task',
      'archive_project',
      'commit',
      'complete_phase',
      'complete_task',
      'create_project',
      'delete_hours',
      'delete_note',
      'delete_task',
      'list_notes',
      'list_people',
      'list_projects',
      'list_tasks',
      'log_hours',
      'move_note',
      'plan_rise',
      'read_compensation',
      'read_day',
      'read_egress',
      'read_file',
      'read_hours',
      'read_note',
      'read_person',
      'read_project',
      'read_sources',
      'remove_link',
      'remove_phase',
      'remove_plan',
      'remove_project_link',
      'search',
      'update_hours',
      'update_person',
      'update_phase',
      'update_project',
      'update_task',
      'vault_diff',
      'vault_health',
      'vault_problems',
      'vault_status',
      'vault_tree',
      'write_about',
      'write_note',
    ]);
    for (const tool of tools) {
      expect(tool.description, tool.name).toBeTruthy();
      expect(tool.inputSchema, tool.name).toBeTruthy();
    }
  });

  it('carries the annotations to the client, which is where they are used', async () => {
    const client = await connected();
    const { tools } = await client.listTools();
    const byName = new Map(tools.map((t) => [t.name, t.annotations]));

    // A client decides what it may run unattended from these. The list in
    // tools.ts is only worth keeping if it survives the trip.
    expect(byName.get('list_people')).toMatchObject({ readOnlyHint: true });
    expect(byName.get('delete_task')).toMatchObject({ destructiveHint: true });
    for (const tool of tools) expect(tool.annotations, tool.name).toBeDefined();
  });

  it('tells the client what the vault is before it asks anything', async () => {
    const client = await connected();
    const instructions = client.getInstructions() ?? '';

    // The two rules no single tool description can carry.
    expect(instructions).toContain('BambooHR');
    expect(instructions).toMatch(/read-only|reads a cache/i);
    expect(instructions).toContain('move_note');
  });

  it('runs a tool and returns what the store holds', async () => {
    const client = await connected();
    const result = await client.callTool({ name: 'list_people', arguments: {} });
    const text = (result.content as { type: string; text: string }[]).map((c) => c.text).join('\n');

    expect(text).toContain('ana-horvat');
    expect(text).toContain('Ana Horvat');
  });

  it('carries an argument through the schema into the handler', async () => {
    const client = await connected();
    const result = await client.callTool({
      name: 'read_person',
      arguments: { slug: 'ana-horvat' },
    });
    const text = (result.content as { type: string; text: string }[]).map((c) => c.text).join('\n');

    expect(text).toContain('Ana Horvat');
  });

  it('refuses an argument the schema does not accept', async () => {
    const client = await connected();
    // The schema has to be reaching the SDK for this to be refused rather than
    // handed to the handler as undefined.
    const result = await client.callTool({ name: 'read_person', arguments: { slug: 42 } });
    expect(result.isError).toBe(true);
  });
});
