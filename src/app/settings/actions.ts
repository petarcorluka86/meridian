'use server';

import { configChanged } from '@/app/changed';
import { THEMES, type Theme, loadConfig } from '@/lib/env';
import { writeEnv } from '@/lib/env-write';

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
