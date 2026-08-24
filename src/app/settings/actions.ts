'use server';

import { configChanged } from '@/app/changed';
import { THEMES, type Theme, loadConfig } from '@/lib/env';
import { removeEnv, writeEnv } from '@/lib/env-write';
import { invalidateVault } from '@/lib/vault/index';
import { emptyVault } from '@/lib/vault/reset';

/**
 * The one setting the app writes about itself rather than about the vault.
 *
 * A Server Action is an HTTP endpoint, so the argument is whatever was posted —
 * it is checked against the three names here rather than trusted to be one of
 * them. `writeEnv` touches only this key and re-tightens the file to 0600;
 * `configChanged` is what puts the new `data-theme` on the document, because the
 * attribute is rendered by the root layout and a page-level revalidation does
 * not reach it.
 */
export async function setThemeAction(theme: Theme): Promise<void> {
  if (!(THEMES as readonly string[]).includes(theme)) return;

  writeEnv(loadConfig().envPath, { MERIDIAN_THEME: theme });
  configChanged();
}

export type ResetResult = { ok: true; message: string } | { ok: false; message: string };

/**
 * The two destructive actions in the app, and the only ones a snapshot cannot
 * undo. Both take no argument at all, which is most of their safety: a Server
 * Action is an HTTP endpoint, and there is nothing here for a caller to vary —
 * the path comes from VAULT_PATH and the guards in `lib/vault/reset.ts` decide
 * whether that path may be emptied.
 */
export async function resetVaultAction(): Promise<ResetResult> {
  try {
    emptyVault();
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }

  // The index is rebuilt from an empty folder rather than waiting for the
  // watcher: every screen is about to re-render, and a stale snapshot of files
  // that no longer exist is worse than an empty one.
  invalidateVault();
  configChanged();
  return { ok: true, message: 'Vault emptied. The folders come back with your first note.' };
}

export async function fullResetAction(): Promise<ResetResult> {
  const { envPath } = loadConfig();

  try {
    emptyVault();
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }

  // Last, and only once the vault is actually gone: .env is what holds
  // VAULT_PATH, so removing it first would leave nothing pointing at the folder
  // this was supposed to empty.
  removeEnv(envPath);

  invalidateVault();
  configChanged();
  return { ok: true, message: 'Everything cleared. Meridian reopens as freshly installed.' };
}
