import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetConfig } from '@/lib/env';

/**
 * The fixture vault is committed test data. Running the app against it once
 * synced a real BambooHR into it, and put thirteen colleagues — names, work
 * emails, phone numbers and photographs — into version control, where they were
 * also rendered into the committed pixel baselines.
 *
 * Nothing fetched from an integration may land in a vault inside this
 * repository. The fixture is built by scripts/build-fixture-vault.ts and by
 * nothing else.
 */

const ROOT = path.resolve(import.meta.dirname, '../..');

let outside: string;

beforeEach(() => {
  outside = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-guard-'));
});

afterEach(() => {
  fs.rmSync(outside, { recursive: true, force: true });
  delete process.env.VAULT_PATH;
  resetConfig();
});

function withVault(target: string): void {
  process.env.VAULT_PATH = target;
  resetConfig();
}

describe('a vault inside the app folder', () => {
  it('is recognised, however it is written', async () => {
    const { vaultIsInsideApp } = await import('@/lib/vault/paths');

    withVault('./src/fixtures/vault');
    expect(vaultIsInsideApp()).toBe(true);

    withVault(path.join(ROOT, 'src/fixtures/vault'));
    expect(vaultIsInsideApp()).toBe(true);

    // The app folder itself, and anything else under it.
    withVault(ROOT);
    expect(vaultIsInsideApp()).toBe(true);
    withVault(path.join(ROOT, 'somewhere/else'));
    expect(vaultIsInsideApp()).toBe(true);
  });

  it('does not catch a real vault that merely shares a prefix', async () => {
    const { vaultIsInsideApp } = await import('@/lib/vault/paths');

    withVault(outside);
    expect(vaultIsInsideApp()).toBe(false);
    // `<root>-notes` starts with the root string but is not inside it.
    withVault(`${ROOT}-notes`);
    expect(vaultIsInsideApp()).toBe(false);
  });

  it('refuses a cache write', async () => {
    const { writeCache } = await import('@/lib/sources/cache');
    const { FixtureVaultError } = await import('@/lib/vault/paths');

    withVault('./src/fixtures/vault');
    expect(() => writeCache('bamboohr', { fetchedAt: 'now' })).toThrow(FixtureVaultError);

    withVault(outside);
    expect(() => writeCache('bamboohr', { fetchedAt: 'now' })).not.toThrow();
  });
});

describe('every sync refuses before it fetches', () => {
  /**
   * Scanned rather than called: a new sync added a year from now would otherwise
   * be the one that has no guard, and nothing would say so.
   */
  // Walked rather than listed: bamboohr.ts became a folder of five files, and a
  // hardcoded list would have quietly stopped covering any of them.
  const SOURCES = (() => {
    const dir = path.join(ROOT, 'src/lib/sources');
    const out: string[] = [];
    const walk = (at: string) => {
      for (const entry of fs.readdirSync(at, { withFileTypes: true })) {
        const full = path.join(at, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.ts')) out.push(full);
      }
    };
    walk(dir);
    return out.map((file) => ({
      file: path.relative(dir, file),
      source: fs.readFileSync(file, 'utf8'),
    }));
  })();

  const syncs = SOURCES.flatMap(({ file, source }) =>
    [...source.matchAll(/export async function (sync\w*)\s*\(/g)].map((m) => ({
      file,
      name: m[1] as string,
      after: source.slice(m.index, m.index + 400),
    })),
  );

  it('guards every exported sync entry point', () => {
    const missing = syncs
      .filter((s) => !s.after.includes('vaultIsInsideApp()'))
      .map((s) => `${s.file}: ${s.name}`);

    expect(missing).toEqual([]);
  });

  it('finds the syncs it claims to be checking', () => {
    // A scan that matches nothing passes for the wrong reason.
    expect(syncs.length).toBeGreaterThanOrEqual(6);
  });
});

describe('the committed fixture', () => {
  const entries = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'src/fixtures/vault/people/entries.json'), 'utf8'),
  ) as Array<{ displayName: string; hr: { workEmail: string | null; workPhone: string | null } }>;

  it('contains only invented people', () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const person of entries) {
      expect(person.hr.workEmail, person.displayName).toMatch(/@yourcompany\.com$/);
      // A real roster carries mobile numbers; the seed never does.
      expect(person.hr.workPhone, person.displayName).toBeNull();
    }
  });

  it('carries no photographs', () => {
    // Photos are real faces. The fixture renders initials instead, and the
    // committed pixel baselines are of those initials.
    const photos = path.join(ROOT, 'src/fixtures/vault/.cache/photos');
    const files = fs.existsSync(photos) ? fs.readdirSync(photos) : [];
    expect(files).toEqual([]);
  });
});
