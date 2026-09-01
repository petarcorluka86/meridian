/**
 * What the `.mcpb` bundle says about itself, separately from the packing.
 *
 * Split out of `scripts/build-mcpb.ts` for the same reason `server.ts` is split
 * out of `vault-server.ts`: that file runs esbuild and spawns `zip` the moment
 * it is imported, so nothing in it could be tested — and this is the part worth
 * testing. A manifest is read once, by an installer, on somebody else's
 * machine; there is no second chance to notice that the tagline is nine
 * characters over the limit or that a tool arrived without a description.
 */
import {
  AUTHOR,
  DESCRIPTION,
  KEYWORDS,
  NAME,
  PRIVACY_POLICY,
  TAGLINE,
  TITLE,
  VERSION,
  WEBSITE,
} from './identity.js';
import { registerTools } from './tools.js';

/**
 * What the bundle says it contains, asked of the real registration.
 *
 * Registration builds closures and touches no vault, so this is safe to call
 * anywhere — and it is the only list of tools that cannot fall behind
 * `tools.ts`.
 */
export function declaredTools(): { name: string; description: string }[] {
  const found: { name: string; description: string }[] = [];
  registerTools({
    tool: (name, description) => {
      found.push({ name, description });
    },
  });
  return found.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * MCPB 0.3.
 *
 * VAULT_PATH is passed in the environment rather than left to a `.env`, and
 * `src/lib/env.ts` reads `process.env` before the file — which is what lets the
 * bundle work with no `.env` at all. There is deliberately **no field for a
 * credential**: this server never contacts a source, so a key it could not use
 * would be a secret collected for nothing.
 */
export function manifest() {
  return {
    manifest_version: '0.3',
    name: NAME,
    display_name: TITLE,
    version: VERSION,
    description: TAGLINE,
    long_description: DESCRIPTION,
    author: AUTHOR,
    homepage: WEBSITE,
    documentation: `${WEBSITE}#readme`,
    support: `${WEBSITE}/issues`,
    icon: 'icon.png',
    keywords: KEYWORDS,
    privacy_policies: [PRIVACY_POLICY],
    license: 'MIT',
    server: {
      type: 'node',
      entry_point: 'server/index.mjs',
      // biome-ignore-start lint/suspicious/noTemplateCurlyInString: MCPB's own placeholders, expanded by the installer on the machine the bundle lands on. A real template literal here bakes this machine's paths into everybody's copy.
      mcp_config: {
        command: 'node',
        args: ['${__dirname}/server/index.mjs'],
        env: { VAULT_PATH: '${user_config.vault_path}' },
      },
    },
    user_config: {
      vault_path: {
        type: 'directory',
        title: 'Vault folder',
        description:
          'The folder Meridian keeps people, notes, tasks, hours and projects in. Everything this server reads and writes is inside it.',
        required: true,
        default: '${HOME}/meridian/vault',
        // biome-ignore-end lint/suspicious/noTemplateCurlyInString: back to ordinary strings.
      },
    },
    tools: declaredTools(),
    // The list above is this build's, not something the installer should infer.
    tools_generated: false,
    compatibility: {
      platforms: ['darwin', 'linux', 'win32'],
      runtimes: { node: '>=22' },
    },
  };
}
