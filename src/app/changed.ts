import { revalidatePath } from 'next/cache';

/**
 * One word per concept, and this is the third of three. They were mixed up:
 *
 *   sync     go to a source now, whatever the freshness window says
 *   refresh  go to a source only if its window has expired
 *   changed  the vault on disk changed, so re-render the pages that read it
 *
 * `revalidate` is Next's word for the last of those and is left to Next, because
 * having our own function called revalidateSources next to Next's
 * revalidatePath, meaning something else, is how the three got muddled.
 *
 * Overview reads everything, so it is always included; name whatever else the
 * change touched.
 */
export function vaultChanged(...paths: Array<string | null | undefined>): void {
  revalidatePath('/');
  for (const path of paths) if (path) revalidatePath(path);
}

/**
 * The configuration changed, which the shell renders — the setup panel, the
 * sidebar, whether a source exists at all. A page-level revalidation does not
 * reach it.
 */
export function configChanged(): void {
  revalidatePath('/', 'layout');
}
