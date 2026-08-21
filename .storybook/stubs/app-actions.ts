import { action } from 'storybook/actions';

/**
 * Stands in for the Server Actions in `src/app/actions.ts`, so `SyncBadge` can be
 * rendered outside a request. Pressing a badge lands in the Actions panel instead
 * of going to BambooHR.
 *
 * The second of two stubs, and for the same reason as the first: a Server Action
 * cannot exist in a browser-only build, because importing the real module drags
 * the vault and `node:fs` into the bundle.
 */
export type SyncTarget = 'roster' | 'inbox' | 'compensation' | 'calendar' | 'github';

export async function syncSourceAction(target: SyncTarget): Promise<{ ok: boolean }> {
  action('syncSourceAction')(target);
  return { ok: true };
}
