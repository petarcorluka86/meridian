import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { vaultIsInsideApp, vaultRoot } from './paths';

/**
 * Emptying the vault, which is the only destructive thing in this app that a
 * snapshot cannot undo.
 *
 * Every other delete in Meridian goes through `write.ts`, which snapshots first,
 * so `npm run vault:restore` can always bring it back. This one takes the
 * snapshots with it: `.snapshots/` lives inside the vault, and so does `.git`.
 * That is what the confirmation says, and it is why the guards below matter more
 * than the six lines that do the work.
 *
 * The folder itself is left in place. Its children go; the next `vaultHealth()`
 * scaffolds an empty vault back into it, which is what "the folders come back
 * with your first note" means.
 */
export class ResetRefused extends Error {}

/**
 * The three ways `rm -rf $VAULT_PATH/*` could take something it must not.
 *
 * The first is the one that has actually happened in this repository's history,
 * in another form: a sync ran against the committed fixture and put thirteen
 * real colleagues into version control. `vaultIsInsideApp()` exists because of
 * it, and emptying a vault is a far worse thing to do to the fixture than
 * writing to it.
 *
 * The other two are typos. `VAULT_PATH=/` and `VAULT_PATH=~` both resolve, both
 * pass every other check in this file, and both are somebody's whole machine.
 */
function checkedRoot(): string {
  if (vaultIsInsideApp()) {
    throw new ResetRefused('Not while VAULT_PATH points inside this repository.');
  }

  // Throws VaultPathError of its own when VAULT_PATH is unset.
  const root = vaultRoot();

  if (path.dirname(root) === root) {
    throw new ResetRefused(`VAULT_PATH is a filesystem root (${root}).`);
  }
  if (root === os.homedir()) {
    throw new ResetRefused(`VAULT_PATH is your home folder (${root}).`);
  }
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new ResetRefused(`VAULT_PATH is not a folder (${root}).`);
  }

  return root;
}

/**
 * Everything under the vault, including `.git`, `.cache/` and `.snapshots/`.
 *
 * `readdirSync` then `rm` per child rather than `rm -rf` on the root: the folder
 * may be somebody's own — a synced folder, a mount point, a directory with
 * permissions somebody set — and re-creating it would not be the same folder.
 */
export function emptyVault(): void {
  const root = checkedRoot();
  for (const entry of fs.readdirSync(root)) {
    fs.rmSync(path.join(/* turbopackIgnore: true */ root, entry), {
      recursive: true,
      force: true,
    });
  }
}
