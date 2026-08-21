/**
 * Refuses a commit that carries a credential into the vault.
 *
 * The app checks this on its own Save path, which is how the vault is normally
 * committed. This is the same check for the other way in: `git commit` in a
 * terminal, or an agent that shells out. Installed as the vault's pre-commit
 * hook by the app, and runnable by hand as `npm run vault:scan`.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { installNetGuard } from '@/lib/net-guard';
import { refusalFor, scanText, type SecretHit } from '@/lib/secrets';
import { vaultRoot } from '@/lib/vault/paths';

installNetGuard();

const root = vaultRoot();

function staged(): string[] {
  try {
    return execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
      cwd: root,
      encoding: 'utf8',
    })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    // No commit in progress — scan the whole vault instead, which is what
    // somebody running this by hand means.
    return everything();
  }
}

function everything(out: string[] = [], dir = ''): string[] {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === '.cache' || entry.name === '.snapshots') continue;
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) everything(out, rel);
    else out.push(rel);
  }
  return out;
}

const hits: SecretHit[] = [];
for (const rel of staged()) {
  let text: string;
  try {
    text = fs.readFileSync(path.join(root, rel), 'utf8');
  } catch {
    continue;
  }
  hits.push(...scanText(rel, text));
}

if (hits.length > 0) {
  console.error(refusalFor(hits));
  process.exit(1);
}
