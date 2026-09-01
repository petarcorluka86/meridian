/**
 * Packs the vault MCP server into `artifacts/meridian-vault.mcpb` — the format
 * Claude Desktop installs by double-click, with a name, an icon and a folder
 * picker for the vault.
 *
 * The bundle holds one esbuild-built JavaScript file rather than this checkout,
 * which is the decision worth knowing: `.mcp.json` and `desktop/mcp-server.sh`
 * both run the TypeScript in place, by absolute path, and break the day the
 * folder moves — fine for the machine this was written on, useless as something
 * to hand somebody. esbuild resolves the `@/` alias exactly as
 * `scripts/tsx-alias.mjs` does at runtime, so what ships is the code the tests
 * ran against.
 *
 * The manifest is `mcp/manifest.ts`, which is tested. Everything here is the
 * part that cannot be: a build, three copies and a zip.
 *
 * Rebuild after changing anything under `mcp/` or `src/lib/`. Nothing else
 * needs it — the app and Claude Code run the TypeScript directly, and only this
 * is a copy.
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import * as esbuild from 'esbuild';

import { ICON_FILE, NAME } from '../mcp/identity.js';
import { declaredTools, manifest } from '../mcp/manifest.js';

const run = promisify(execFile);

const ROOT = path.resolve(import.meta.dirname, '..');
const STAGE = path.join(ROOT, 'artifacts/mcpb');
const OUT = path.join(ROOT, `artifacts/${NAME}.mcpb`);

fs.rmSync(STAGE, { recursive: true, force: true });
fs.mkdirSync(path.join(STAGE, 'server'), { recursive: true });

await esbuild.build({
  entryPoints: [path.join(ROOT, 'mcp/vault-server.ts')],
  outfile: path.join(STAGE, 'server/index.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  // The same mapping scripts/tsx-alias.mjs does at runtime.
  alias: { '@': path.join(ROOT, 'src') },
  banner: { js: '// Built by scripts/build-mcpb.ts. Edit mcp/ and rebuild.' },
});

// Beside the code, because identity.ts looks for it there once bundled.
fs.copyFileSync(path.join(ROOT, ICON_FILE), path.join(STAGE, 'server/icon.svg'));
// The installer's own icon, and the one place a raster is the right answer.
fs.copyFileSync(path.join(ROOT, 'public/icon-512.png'), path.join(STAGE, 'icon.png'));
fs.writeFileSync(path.join(STAGE, 'manifest.json'), `${JSON.stringify(manifest(), null, 2)}\n`);

fs.rmSync(OUT, { force: true });
// -X drops the extended attributes a Mac would otherwise pack in; -r is the
// tree. An argument array, never a shell string, like every other spawn here.
await run('zip', ['-q', '-r', '-X', OUT, 'manifest.json', 'icon.png', 'server'], { cwd: STAGE });

const size = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`${path.relative(ROOT, OUT)} — ${declaredTools().length} tools, ${size} KB`);
console.log('Install it by opening it, or by dragging it onto Claude Desktop.');
