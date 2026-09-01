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
      // The name is what an argument is passed under; the title is what a
      // person picking through a list of forty-five of them reads.
      expect(tool.title, tool.name).toBeTruthy();
    }
  });

  it('says who it is, so a client has something to show besides the name', async () => {
    const client = await connected();
    const info = client.getServerVersion();
    const { DESCRIPTION, NAME, TITLE, VERSION, WEBSITE } = await import('../../mcp/identity');

    // Written once in identity.ts because the .mcpb manifest says the same four
    // things to an installer that never runs this code.
    expect(info).toMatchObject({
      name: NAME,
      title: TITLE,
      version: VERSION,
      description: DESCRIPTION,
      websiteUrl: WEBSITE,
    });
    // A data URI rather than a URL: a server that fetched its own icon would be
    // a server that fetches.
    expect(info?.icons?.[0]?.src).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it('carries the version the repo is on, rather than one written out twice', async () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const { VERSION } = await import('../../mcp/identity');
    expect(VERSION).toBe(pkg.version);
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

  it('flags a question the vault cannot answer, rather than answering it', async () => {
    const client = await connected();
    const result = await client.callTool({ name: 'read_person', arguments: { slug: 'nobody' } });

    // Without the flag this is a successful call whose result is a sentence,
    // which reads exactly like a person whose About says "No person with the
    // slug nobody."
    expect(result.isError).toBe(true);
    expect((result.content as { text: string }[])[0]?.text).toContain('No person');
  });

  it('refuses an argument the schema does not accept', async () => {
    const client = await connected();
    // The schema has to be reaching the SDK for this to be refused rather than
    // handed to the handler as undefined.
    const result = await client.callTool({ name: 'read_person', arguments: { slug: 42 } });
    expect(result.isError).toBe(true);
  });
});
