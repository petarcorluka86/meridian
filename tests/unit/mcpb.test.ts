import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

import { declaredTools, manifest } from '../../mcp/manifest';

/**
 * The manifest is read once, by an installer, on somebody else's machine.
 *
 * There is no second chance to notice that the tagline is nine characters over
 * the limit, that a tool arrived without a description, or that the entry point
 * names a file the packer does not write — the bundle simply fails to install,
 * or installs and offers nothing. Everything asserted here is a rule a
 * connector review applies, or a promise this repository makes elsewhere and
 * would otherwise break quietly in one file nobody reads.
 */
describe('the .mcpb manifest', () => {
  const m = manifest();

  it('carries what MCPB requires, in the version it is written against', () => {
    expect(m.manifest_version).toBe('0.3');
    for (const key of ['name', 'version', 'description', 'author', 'server'] as const) {
      expect(m[key], key).toBeTruthy();
    }
    expect(m.author.name).toBeTruthy();
  });

  it('stays inside the lengths a listing is capped at', () => {
    // A tagline over 55 and a description over 2 000 are rejected on submission,
    // not trimmed.
    expect(m.name.length).toBeLessThanOrEqual(100);
    expect(m.description.length).toBeLessThanOrEqual(55);
    expect(m.long_description.length).toBeLessThanOrEqual(2000);
    for (const tool of m.tools) expect(tool.name.length, tool.name).toBeLessThanOrEqual(64);
  });

  it('describes every tool it lists, and lists every tool the server registers', () => {
    for (const tool of m.tools) expect(tool.description, tool.name).toBeTruthy();
    // The list comes from the registration itself, so this is really a check
    // that nothing between here and there drops one.
    expect(m.tools).toHaveLength(declaredTools().length);
    expect(m.tools.map((t) => t.name)).toContain('read_day');
  });

  it('points at the file the packer writes, and runs it with node', () => {
    // A path typed twice is a bundle that installs and does nothing.
    expect(m.server.entry_point).toBe('server/index.mjs');
    expect(m.server.mcp_config.command).toBe('node');
    expect(m.server.mcp_config.args[0]).toContain(m.server.entry_point);

    const packer = fs.readFileSync('scripts/build-mcpb.ts', 'utf8');
    expect(packer).toContain(m.server.entry_point);
    expect(packer).toContain(m.icon);
  });

  it('asks for the vault and for nothing else', () => {
    // This server never contacts a source, so a credential field would be a
    // secret collected for nothing. See PRIVACY.md, which says so out loud.
    expect(Object.keys(m.user_config)).toEqual(['vault_path']);
    expect(m.user_config.vault_path).toMatchObject({ type: 'directory', required: true });
    // biome-ignore lint/suspicious/noTemplateCurlyInString: MCPB's own placeholder, and asserting the literal is the point — a real template literal here would bake this machine's path into the manifest.
    expect(m.server.mcp_config.env).toEqual({ VAULT_PATH: '${user_config.vault_path}' });
  });

  it('points at a privacy policy that is actually in the repository', () => {
    // Required by review, and required to resolve — a 404 is worse than none.
    expect(m.privacy_policies).toHaveLength(1);
    expect(m.privacy_policies[0]).toMatch(/\/PRIVACY\.md$/);
    expect(fs.existsSync('PRIVACY.md')).toBe(true);
  });
});
