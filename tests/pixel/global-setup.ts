import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Builds the vault the Changelog screen is measured against.
 *
 * Changelog renders `git status` of the vault, so it needs one that is its own
 * repository with a known set of changes. The fixture vault cannot be it: it
 * lives inside this repository, so the screen correctly refuses to save from
 * there and renders nothing to compare.
 *
 * Rebuilt from scratch on every run, so the diff on screen is exactly these
 * edits and never yesterday's as well.
 */
const APP = path.resolve(import.meta.dirname, '../..');
/**
 * Outside the app folder, deliberately. Building it inside meant several hundred
 * file writes under a directory Next's dev server watches, and the server died
 * mid-run often enough to look like a flaky gate.
 */
export const GATE_VAULT = path.join(os.tmpdir(), 'meridian-gate-vault');
const VAULT = GATE_VAULT;
const FIXTURE = path.join(APP, 'src/fixtures/vault');

function git(args: string[]): void {
  execFileSync('git', args, { cwd: VAULT, stdio: 'ignore' });
}

export default function globalSetup(): void {
  fs.rmSync(VAULT, { recursive: true, force: true });
  fs.cpSync(FIXTURE, VAULT, { recursive: true });

  git(['init', '-q']);
  git(['config', 'user.email', 'gate@meridian.test']);
  git(['config', 'user.name', 'Pixel gate']);
  git(['add', '--all']);
  git(['commit', '-q', '-m', 'the vault as the fixture leaves it']);

  // One change of each kind the diff renderer draws: a line added inside a file,
  // a line removed, and a whole file that is new.
  const note = path.join(VAULT, 'notes/general/2026-08-14-zahtjevi.md');
  const lines = fs.readFileSync(note, 'utf8').split('\n');
  lines.splice(3, 0, 'Added while preparing the gate.');
  fs.writeFileSync(note, lines.filter((line) => !line.startsWith('- BambooHR')).join('\n'));

  fs.writeFileSync(
    path.join(VAULT, 'notes/inbox/2026-08-19-uncommitted.md'),
    '---\ncategory: idea\ndraft: false\npinned: false\n---\n\n# A thought not yet saved\n\nThis file exists only so the gate has an untracked change to draw.\n',
  );
}
