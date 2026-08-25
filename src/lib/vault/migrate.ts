import fs from 'node:fs';
import path from 'node:path';

/**
 * The vault outlives the app. It is a folder of plain files that somebody may
 * open in five years, with a copy of Meridian older or newer than the one that
 * wrote it — so the format carries a version, and that version is acted on
 * rather than merely recorded.
 *
 * Two directions, and they are not symmetrical:
 *
 * **Older vault, newer app** — migrate forward, one numbered step at a time,
 * writing the new version only once the step has succeeded. A migration that
 * dies halfway leaves the old number, so the next start tries again rather than
 * treating a half-converted vault as done.
 *
 * **Newer vault, older app** — stop. An old app cannot know what a field it has
 * never heard of means, and its first write would drop it. This is the case that
 * actually loses data, and the only safe response is to refuse and say so.
 */

/** What this build of the app writes and understands. */
export const DATA_VERSION = 2;

export type Migration = {
  /** The version the vault is at once this has run. */
  to: number;
  /** One line, shown to the user and written into the log. */
  what: string;
  run: (vaultPath: string) => void;
};

/**
 * The format changes there have been, in order.
 *
 * Step 2 is the first: `notes/inbox/` is gone as a concept, and a vault written
 * before that has notes sitting in a folder this app no longer looks in. Moving
 * them is not optional tidying — leaving them would make them vanish from the
 * Notes screen while still being on disk, which is the worst of both.
 *
 * A name collision in `notes/general/` is possible and is not resolved by
 * overwriting: the file keeps its name with `-inbox` before the extension, which
 * is ugly and visible and does not lose anything.
 */
export const MIGRATIONS: Migration[] = [
  {
    to: 2,
    what: 'move notes/inbox into notes/general',
    run: (vaultPath) => {
      const from = path.join(vaultPath, 'notes/inbox');
      if (!fs.existsSync(from)) return;

      const to = path.join(vaultPath, 'notes/general');
      fs.mkdirSync(to, { recursive: true });

      for (const name of fs.readdirSync(from)) {
        if (!name.endsWith('.md')) continue;
        let target = path.join(to, name);
        if (fs.existsSync(target)) {
          target = path.join(to, name.replace(/\.md$/, '-inbox.md'));
        }
        fs.renameSync(path.join(from, name), target);
      }

      // Only if it is empty, and only then. Anything else in there is somebody
      // else's and is not this step's to judge.
      if (fs.readdirSync(from).length === 0) fs.rmdirSync(from);
    },
  },
];

export type MigrationOutcome =
  | { state: 'current' }
  | { state: 'migrated'; from: number; to: number; steps: string[] }
  | { state: 'app-too-old'; found: number; supported: number }
  | { state: 'failed'; at: number; what: string; reason: string };

function configPath(vaultPath: string): string {
  return path.join(vaultPath, 'config.json');
}

function readVersion(vaultPath: string): number {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath(vaultPath), 'utf8')) as {
      dataVersion?: unknown;
    };
    const found = raw.dataVersion;
    return typeof found === 'number' && Number.isInteger(found) && found > 0 ? found : DATA_VERSION;
  } catch {
    // No config yet, or one that will not parse. The scaffold writes it with the
    // current version, and a corrupt one is reported by the doctor, not here.
    return DATA_VERSION;
  }
}

function writeVersion(vaultPath: string, version: number): void {
  const file = configPath(vaultPath);
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
  const next = `${JSON.stringify({ ...raw, dataVersion: version }, null, 2)}\n`;
  const tmp = `${file}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, next);
  fs.renameSync(tmp, file);
}

export function migrateVault(
  vaultPath: string,
  migrations: Migration[] = MIGRATIONS,
  supported = DATA_VERSION,
): MigrationOutcome {
  const found = readVersion(vaultPath);
  if (found > supported) return { state: 'app-too-old', found, supported };
  if (found === supported) return { state: 'current' };

  const steps: string[] = [];
  let at = found;

  for (const migration of migrations.filter((m) => m.to > found).sort((a, b) => a.to - b.to)) {
    try {
      migration.run(vaultPath);
    } catch (err) {
      // The version is still the old one, so the next start retries this step
      // rather than assuming everything before it needs doing again.
      return { state: 'failed', at, what: migration.what, reason: (err as Error).message };
    }
    writeVersion(vaultPath, migration.to);
    steps.push(migration.what);
    at = migration.to;
  }

  // A gap between the last step and the current version means DATA_VERSION was
  // raised without anybody writing the step for it. Stamping the number anyway
  // writes "format N" onto data that is still format N-1 — and from then on the
  // app-too-old refusal, the only thing standing between an older app and a
  // newer vault, can never fire, because every vault claims the newest format.
  // A change that genuinely needs no conversion still needs a step saying so.
  if (at !== supported) {
    return {
      state: 'failed',
      at,
      what: `reach format ${supported}`,
      reason:
        `there is no migration step to ${supported}. DATA_VERSION was raised without one — ` +
        `add it to MIGRATIONS, even if all it records is that nothing needed converting.`,
    };
  }

  return { state: 'migrated', from: found, to: at, steps };
}
