/**
 * Installs the vault's pre-commit hook, when you ask for it.
 *
 * The app used to write this file into your vault by itself, as a side effect of
 * rendering a page. Writing an executable into somebody's git repository without
 * asking is not a thing an app should do quietly, so now it is a command.
 *
 * What it protects: a `git commit` typed in a terminal inside the vault. Saving
 * through the app already runs the same credential check on its own, and does
 * not need this.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { installNetGuard } from '@/lib/net-guard';
import { vaultRoot } from '@/lib/vault/paths';

installNetGuard();

const vault = vaultRoot();
const app = process.cwd();
const hooks = path.join(vault, '.git', 'hooks');
const hook = path.join(hooks, 'pre-commit');

function isRepo(): boolean {
  try {
    execFileSync('git', ['rev-parse', '--git-dir'], { cwd: vault, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (!isRepo()) {
  console.error(`${vault} is not a git repository yet. Run git init there first.`);
  process.exit(1);
}

if (fs.existsSync(hook)) {
  const existing = fs.readFileSync(hook, 'utf8');
  if (!existing.includes('Installed by Meridian')) {
    console.error(`${hook} already exists and is not ours. Left alone — merge it by hand.`);
    process.exit(1);
  }
}

const script = [
  '#!/bin/sh',
  '# Installed by Meridian. Refuses a commit that carries a credential.',
  '# Delete this file to opt out; the app checks on its own Save path either way.',
  `VAULT_PATH="$(pwd)" npm --prefix ${JSON.stringify(app)} run --silent vault:scan || exit 1`,
  '',
].join('\n');

fs.mkdirSync(hooks, { recursive: true });
fs.writeFileSync(hook, script, { mode: 0o755 });

console.log(`Installed ${hook}`);
console.log('A git commit in the vault now refuses anything that looks like a credential.');
console.log(`It calls back into ${app} — reinstall this if you move the app folder.`);
