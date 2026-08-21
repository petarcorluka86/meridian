'use server';

import { vaultChanged } from '@/app/changed';
import { commitAll, push } from '@/lib/git';
import { invalidateVault } from '@/lib/vault/index';

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };

export async function commitAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const message = String(formData.get('message') ?? '');
  try {
    const { files } = await commitAll(message);
    invalidateVault();
    vaultChanged('/changelog');
    return {
      ok: true,
      message: `Committed ${files} ${files === 1 ? 'file' : 'files'} locally. Nothing has left this Mac.`,
    };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

/**
 * Push is only ever reached through the confirmation dialog. The vault holds
 * private notes and pay figures, so sending it anywhere is an explicit step and
 * never a side effect of something else.
 */
export async function pushAction(): Promise<ActionResult> {
  try {
    // Named from what git reported, not from a literal: this is the one message
    // in the app that says where a team's pay figures just went.
    const { remote, branch } = await push();
    vaultChanged('/changelog');
    return { ok: true, message: `Pushed to ${remote}/${branch}.` };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
