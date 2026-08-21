import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '@/lib/env';

export class VaultPathError extends Error {}

export function vaultRoot(): string {
  const { vaultPath } = loadConfig();
  if (!vaultPath) throw new VaultPathError('VAULT_PATH is not set');
  return vaultPath;
}

/**
 * The single chokepoint for turning anything user- or agent-supplied into an
 * absolute path. Resolves, then realpaths as far as the path exists, so a symlink
 * pointing outside the vault is rejected rather than followed.
 */
export function safeVaultPath(relPath: string): string {
  if (relPath.includes('\0')) throw new VaultPathError('Path contains a null byte');

  const root = vaultRoot();
  const abs = path.resolve(root, relPath);
  const rootReal = realpathDeep(root);

  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new VaultPathError(`Path escapes the vault: ${relPath}`);
  }

  const real = realpathDeep(abs);
  if (real !== rootReal && !real.startsWith(rootReal + path.sep)) {
    throw new VaultPathError(`Path resolves outside the vault: ${relPath}`);
  }
  return abs;
}

/** realpath of the longest existing prefix — a path being created is still checkable. */
function realpathDeep(p: string): string {
  let current = p;
  const trailing: string[] = [];
  for (;;) {
    try {
      return path.join(fs.realpathSync(current), ...trailing.reverse());
    } catch {
      const parent = path.dirname(current);
      if (parent === current) return p;
      trailing.push(path.basename(current));
      current = parent;
    }
  }
}

export function relFromVault(abs: string): string {
  return path.relative(vaultRoot(), abs).split(path.sep).join('/');
}

/**
 * True when VAULT_PATH points inside this repository — the committed fixture, or
 * anything else under the app folder.
 *
 * Nothing fetched from an integration may be written into such a vault. Running
 * the app against the fixture once synced a real BambooHR into it and put
 * thirteen colleagues — names, work emails, phone numbers and photographs — into
 * version control. The fixture is committed test data; it is built by
 * scripts/build-fixture-vault.ts and by nothing else.
 */
export function vaultIsInsideApp(): boolean {
  const app = path.resolve(/* turbopackIgnore: true */ process.cwd());
  let root: string;
  try {
    root = path.resolve(vaultRoot());
  } catch {
    return false;
  }
  return root === app || root.startsWith(app + path.sep);
}

export class FixtureVaultError extends Error {
  constructor() {
    super(
      'Refusing to write fetched data into a vault inside the app folder. ' +
        'That vault is committed; rebuild it with scripts/build-fixture-vault.ts instead.',
    );
  }
}

export const CACHE_DIR = '.cache';
export const SNAPSHOT_DIR = '.snapshots';

/**
 * Skipped by the index walk, invisible in the Vault tree, and — the part that
 * matters — ignored by the watcher.
 *
 * The app's own bookkeeping used to wake the watcher. `vaultHealth()` writes a
 * probe file to check the folder is writable, and the root layout calls it on
 * every render, so every page load rebuilt the whole index: measured at five
 * rebuilds from five renders, 81–117 ms each on a mature vault. The documented
 * architecture is "built once and kept in memory"; it was true only until the
 * app itself touched the folder.
 */
export function isDisposable(rel: string): boolean {
  const name = rel.split('/').pop() ?? rel;
  return (
    rel === CACHE_DIR ||
    rel.startsWith(`${CACHE_DIR}/`) ||
    rel === SNAPSHOT_DIR ||
    rel.startsWith(`${SNAPSHOT_DIR}/`) ||
    // The writability probe, and the temp file every atomic write renames from.
    name.startsWith('.meridian-') ||
    /\.tmp\.\d+$/.test(name)
  );
}
