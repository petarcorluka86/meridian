import fs from 'node:fs';
import path from 'node:path';
import { resetConfig } from './env';

/**
 * Surgical edits to .env.
 *
 * The file is meant to be opened and read by a person: it carries comments
 * explaining each key, blank lines grouping them, and whatever the user has
 * added themselves. A program that rewrites it wholesale eventually eats all of
 * that, so this only ever touches the lines it must:
 *
 *   - a key that exists is replaced in place, keeping its position
 *   - a key that exists but is commented out is uncommented in place
 *   - a key that does not exist is appended under a heading
 *
 * Every other byte of the file is left exactly as it was found.
 */

const KEY = /^(\s*)(#\s*)?([A-Z][A-Z0-9_]*)\s*=(.*)$/;

export type EnvEdit = Record<string, string>;

export function applyEnvEdits(source: string, edits: EnvEdit): string {
  const remaining = new Map(Object.entries(edits));
  const lines = source.split('\n');

  const next = lines.map((line) => {
    const match = KEY.exec(line);
    if (!match) return line;

    const [, indent, , name] = match;
    if (!name || !remaining.has(name)) return line;

    const value = remaining.get(name)!;
    remaining.delete(name);
    // Uncomments as a side effect: a key the user had commented out is the one
    // they were told to fill in.
    return `${indent ?? ''}${name}=${value}`;
  });

  if (remaining.size > 0) {
    if (next.length && next[next.length - 1]!.trim() !== '') next.push('');
    next.push('# Added by the setup wizard');
    for (const [name, value] of remaining) next.push(`${name}=${value}`);
    next.push('');
  }

  return next.join('\n');
}

/** Writes atomically and re-tightens the mode: this file holds credentials. */
export function writeEnv(envPath: string, edits: EnvEdit): void {
  let source = '';
  try {
    source = fs.readFileSync(envPath, 'utf8');
  } catch {
    source = '';
  }

  const updated = applyEnvEdits(source, edits);
  const tmp = `${envPath}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, updated, { mode: 0o600 });
  fs.renameSync(tmp, envPath);
  fs.chmodSync(envPath, 0o600);

  // The file is not the only copy. Next loads .env into process.env at boot, and
  // `loadConfig` prefers process.env over the file — so a key written here is
  // still the boot value on the next read unless the process's own environment
  // is corrected too. Without this the theme changes on disk and not on screen,
  // and a credential retyped in the wizard is re-checked as the old one.
  for (const [name, value] of Object.entries(edits)) process.env[name] = value;

  // loadConfig() memoises, and the wizard needs the next step to see what the
  // previous one just wrote.
  resetConfig();
}

/** True when the file is readable only by its owner. */
export function envIsPrivate(envPath: string): boolean {
  try {
    return (fs.statSync(envPath).mode & 0o077) === 0;
  } catch {
    return true;
  }
}

export function envExampleFor(appRoot: string): string {
  const example = path.join(appRoot, '.env.example');
  try {
    return fs.readFileSync(example, 'utf8');
  } catch {
    return '';
  }
}
