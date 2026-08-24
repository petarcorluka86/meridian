'use server';

import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { vaultRoot } from '@/lib/vault/paths';

const run = promisify(execFile);

/**
 * Shows the vault in the desktop file manager, selected inside the folder that
 * holds it.
 *
 * It takes no argument, and that is the whole of its safety: the path comes from
 * VAULT_PATH, so there is nothing here a caller could point somewhere else.
 * `execFile` with an argument array for the same reason every git call is one —
 * no shell, so a folder name full of odd characters stays a folder name.
 *
 * Windows is left out rather than guessed at: `explorer /select,` exits non-zero
 * even when it worked, so the one thing this function reports would be wrong.
 */
export async function revealVaultAction(): Promise<{ ok: true } | { ok: false; message: string }> {
  let target: string;
  try {
    target = vaultRoot();
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }

  // Only macOS can select the folder itself; elsewhere the parent is opened.
  const reveal: [string, string[]] | null =
    process.platform === 'darwin'
      ? ['open', ['-R', target]]
      : process.platform === 'linux'
        ? ['xdg-open', [path.dirname(target)]]
        : null;

  if (!reveal) {
    return { ok: false, message: `Meridian cannot open a folder on ${process.platform}.` };
  }

  try {
    await run(reveal[0], reveal[1]);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: `Could not open the folder — ${(err as Error).message}` };
  }
}
