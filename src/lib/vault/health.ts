/*
 * Turbopack warns that a computed path makes it trace the whole project into the
 * build output. That matters when the output is a serverless bundle with a size
 * limit; this app is started from its own folder with `next start`, and the paths
 * are computed because they are the user's — VAULT_PATH and the location of
 * .env are configuration, not constants. Opted out per call, so a future one has
 * to say the same thing on purpose.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '@/lib/env';
import { DATA_VERSION, migrateVault } from './migrate';
import { VAULT_README } from './readme';

export type VaultHealth =
  | { state: 'ok' }
  /** Amber: nothing is broken, something is unset. */
  | { state: 'unset'; envMissing: boolean }
  /** Red: this would lose work, so editing is blocked rather than failing later. */
  | { state: 'unwritable'; vaultPath: string; reason: string }
  /** Red: the vault was written by a newer Meridian than this one. */
  | { state: 'app-too-old'; vaultPath: string; found: number; supported: number }
  /** Red: a step failed, so the vault is part-converted and must not be written to. */
  | { state: 'migration-failed'; vaultPath: string; at: number; what: string; reason: string };

/**
 * Which states stop the app editing, rather than merely nag.
 *
 * A switch over the discriminant with no default, so adding a state to the union
 * above without deciding this is a type error rather than a screen that silently
 * lets writes through. The caller is the root layout, where it used to be an
 * `||` chain that a new state would simply not have appeared in.
 */
export function blocksEditing(health: VaultHealth): boolean {
  switch (health.state) {
    case 'unwritable':
    case 'app-too-old':
    case 'migration-failed':
      return true;
    case 'ok':
    case 'unset':
      return false;
  }
}

const GITIGNORE = `.cache/
.snapshots/
.DS_Store
`;

/**
 * Written before anything else can be, because `.cache/` holds salaries,
 * absences and employee photos. A vault that gets `git init` before this exists
 * would stage every one of them — which is the single thing this app is built
 * to make impossible.
 *
 * Everything here is created only if absent; nothing is ever overwritten.
 */
function ensureScaffold(vaultPath: string): void {
  const gitignore = path.join(vaultPath, '.gitignore');
  if (!fs.existsSync(gitignore)) fs.writeFileSync(gitignore, GITIGNORE);

  for (const dir of ['people', 'notes/inbox', 'notes/general']) {
    fs.mkdirSync(path.join(/* turbopackIgnore: true */ vaultPath, dir), { recursive: true });
  }

  const seeds: Array<[string, string]> = [
    ['README.md', VAULT_README],
    ['people/entries.json', '[]\n'],
    ['tasks.json', '[]\n'],
    ['time.json', '[]\n'],
    [
      'config.json',
      `${JSON.stringify(
        {
          thresholds: { contactGapDays: 14, timeBalanceLimitHours: 20, uncommittedChangesDays: 3 },
          dataVersion: DATA_VERSION,
        },
        null,
        2,
      )}\n`,
    ],
  ];
  for (const [rel, contents] of seeds) {
    const file = path.join(/* turbopackIgnore: true */ vaultPath, rel);
    if (!fs.existsSync(file)) fs.writeFileSync(file, contents);
  }
}

/**
 * Existence is not permission, so this writes a real file and deletes it — but
 * once per vault, not once per render. The root layout calls vaultHealth() on
 * every request, and a write inside the vault wakes the watcher; probing each
 * time meant the in-memory index was thrown away and rebuilt on every page load.
 *
 * A folder whose permissions change while the app is running will be caught by
 * the write that actually fails, which reports the real error rather than a
 * guess about it.
 */
const probed = new Map<string, string | null>();

function writable(vaultPath: string): string | null {
  const cached = probed.get(vaultPath);
  if (cached !== undefined) return cached;

  const probe = path.join(vaultPath, `.meridian-write-check-${process.pid}`);
  let refusal: string | null = null;
  try {
    fs.writeFileSync(probe, '');
    fs.rmSync(probe, { force: true });
  } catch (err) {
    refusal = (err as Error).message;
  }
  probed.set(vaultPath, refusal);
  return refusal;
}

/**
 * Checked before anything reads or writes, so a misconfigured vault produces the
 * first-run panel rather than a 500 on every page.
 */
export function vaultHealth(): VaultHealth {
  const config = loadConfig();
  if (!config.vaultPath) return { state: 'unset', envMissing: !config.envExists };

  try {
    fs.mkdirSync(config.vaultPath, { recursive: true });
  } catch (err) {
    return { state: 'unwritable', vaultPath: config.vaultPath, reason: (err as Error).message };
  }

  const refusal = writable(config.vaultPath);
  if (refusal) return { state: 'unwritable', vaultPath: config.vaultPath, reason: refusal };

  ensureScaffold(config.vaultPath);

  // Before anything reads or writes. An older app let loose on a newer vault
  // drops the fields it has never heard of on its first save.
  const migration = migrateVault(config.vaultPath);
  if (migration.state === 'app-too-old') {
    return {
      state: 'app-too-old',
      vaultPath: config.vaultPath,
      found: migration.found,
      supported: migration.supported,
    };
  }
  // A failure used to log twice and return 'ok', so the app carried on reading
  // and writing a vault it had just failed to convert — and the only trace was in
  // a terminal the user is not looking at, because they are in a browser.
  if (migration.state === 'failed') {
    console.error(`Vault migration failed at format ${migration.at}: ${migration.what}`);
    console.error(`  ${migration.reason}`);
    return {
      state: 'migration-failed',
      vaultPath: config.vaultPath,
      at: migration.at,
      what: migration.what,
      reason: migration.reason,
    };
  }
  if (migration.state === 'migrated') {
    console.log(`Vault migrated from format ${migration.from} to ${migration.to}.`);
    for (const step of migration.steps) console.log(`  ${step}`);
  }

  return { state: 'ok' };
}
