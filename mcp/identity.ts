/**
 * Who this server says it is, in the one place everything that has to say it
 * reads from.
 *
 * There are two audiences and they never meet: a client learns the name, the
 * title, the description and the icon over the wire, from `initialize`; Claude
 * Desktop learns the same four from the manifest inside the `.mcpb` bundle,
 * before the server has ever run. Written twice, a bundle ships last month's
 * description and nothing fails — so `scripts/build-mcpb.ts` generates the
 * manifest from here rather than keeping a copy.
 *
 * The version comes from package.json for the same reason: the repo is the app,
 * so there is no second version to bump.
 */
import fs from 'node:fs';
import path from 'node:path';

import pkg from '../package.json' with { type: 'json' };

export const NAME = 'meridian-vault';

/** The name a person reads. `NAME` is the one a config file holds. */
export const TITLE = 'Meridian Vault';

export const VERSION = pkg.version;

/** The listing subtitle, and the connector directory caps it at 55. */
export const TAGLINE = "A manager's hub over a folder of plain files";

/**
 * What the server is, factually and in its own voice.
 *
 * Deliberately free of instructions to the model — a directory review reads
 * anything shaped like one as an injection attempt, and the two rules an agent
 * genuinely needs are in the server's `instructions`, which is where the
 * protocol puts them.
 */
export const DESCRIPTION = `Reads and writes a Meridian vault: a folder of plain files holding people, notes, tasks, hours and projects, plus cached copies of what BambooHR, Google Calendar and GitHub last said.

Every write goes through the same validated, snapshotted store the Meridian app uses, so a change made here is a change the app can read. Nothing in this server makes a network request of any kind, and nothing is ever written back to BambooHR, Google or GitHub.`;

export const KEYWORDS = ['vault', 'notes', 'tasks', 'people', 'management', 'markdown'];

/** `git+https://…​.git` is what npm wants; a person following the link is not. */
export const WEBSITE = pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');

export const PRIVACY_POLICY = `${WEBSITE}/blob/main/PRIVACY.md`;

export const AUTHOR = { name: 'Petar Ćorluka', url: WEBSITE };

/** The mark, from the repository root. `scripts/build-mcpb.ts` reads it too. */
export const ICON_FILE = 'public/icon.svg';

/**
 * The mark, inline, because a server that reached out for its own icon would be
 * a server that reaches out. Beside this file once it has been bundled, and up
 * in `public/` when it is running from the checkout — the same file either way.
 */
const ICON_CANDIDATES = ['icon.svg', path.join('..', ICON_FILE)];

function readIcon(): string | undefined {
  for (const candidate of ICON_CANDIDATES) {
    const file = path.join(import.meta.dirname, candidate);
    if (!fs.existsSync(file)) continue;
    return `data:image/svg+xml;base64,${fs.readFileSync(file).toString('base64')}`;
  }
  return undefined;
}

const src = readIcon();

/**
 * Empty rather than absent when the file is missing: an icon is decoration, and
 * a server that refuses to start because it cannot find its own logo is worse
 * than one that starts without it.
 */
export const ICONS = src ? [{ src, mimeType: 'image/svg+xml', sizes: ['any'] }] : [];
