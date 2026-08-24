import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetConfig } from '@/lib/env';
import { VaultPathError } from '@/lib/vault/paths';

/**
 * Emptying the vault is the only thing in this app that a snapshot cannot undo,
 * so the interesting tests here are the refusals rather than the deletion. Each
 * one is a way somebody's real folder could go: the committed fixture, a
 * VAULT_PATH left at `/`, a VAULT_PATH left at `~`.
 */

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-reset-'));
  process.env.VAULT_PATH = dir;
  resetConfig();
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  delete process.env.VAULT_PATH;
  resetConfig();
});

function fill(root: string): void {
  fs.mkdirSync(path.join(root, 'people/ana-horvat/notes'), { recursive: true });
  fs.mkdirSync(path.join(root, '.git/refs'), { recursive: true });
  fs.mkdirSync(path.join(root, '.snapshots'), { recursive: true });
  fs.writeFileSync(path.join(root, 'tasks.json'), '[]\n');
  fs.writeFileSync(path.join(root, 'people/entries.json'), '[]\n');
  fs.writeFileSync(path.join(root, 'people/ana-horvat/about.md'), '# Ana\n');
  fs.writeFileSync(path.join(root, '.git/HEAD'), 'ref: refs/heads/main\n');
  fs.writeFileSync(path.join(root, '.snapshots/tasks.json.1'), '[]\n');
}

describe('emptying the vault', () => {
  it('removes everything under the folder, and leaves the folder', async () => {
    const { emptyVault } = await import('@/lib/vault/reset');
    fill(dir);

    emptyVault();

    expect(fs.existsSync(dir)).toBe(true);
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it('takes the git history and the snapshots with it, which is what the confirmation says', async () => {
    const { emptyVault } = await import('@/lib/vault/reset');
    fill(dir);

    emptyVault();

    // If either of these survived, "there is no commit and no snapshot to go
    // back to" would be a lie told in a confirmation dialog.
    expect(fs.existsSync(path.join(dir, '.git'))).toBe(false);
    expect(fs.existsSync(path.join(dir, '.snapshots'))).toBe(false);
  });

  it('refuses when the vault is inside this repository', async () => {
    const { emptyVault, ResetRefused } = await import('@/lib/vault/reset');
    process.env.VAULT_PATH = './src/fixtures/vault';
    resetConfig();

    expect(() => emptyVault()).toThrow(ResetRefused);
    // The fixture is committed test data, and it is still there.
    expect(fs.existsSync(path.resolve('src/fixtures/vault/people/entries.json'))).toBe(true);
  });

  it('refuses a filesystem root', async () => {
    const { emptyVault, ResetRefused } = await import('@/lib/vault/reset');
    process.env.VAULT_PATH = path.parse(process.cwd()).root;
    resetConfig();

    expect(() => emptyVault()).toThrow(ResetRefused);
  });

  it('refuses the home folder', async () => {
    const { emptyVault, ResetRefused } = await import('@/lib/vault/reset');
    process.env.VAULT_PATH = os.homedir();
    resetConfig();

    expect(() => emptyVault()).toThrow(ResetRefused);
  });

  it('refuses when VAULT_PATH is not set', async () => {
    const { emptyVault } = await import('@/lib/vault/reset');
    delete process.env.VAULT_PATH;
    resetConfig();

    // `tests/setup.ts` is what makes this test safe rather than clever: with no
    // VAULT_PATH in the environment, loadConfig() falls back to a .env file, and
    // the developer's own .env names a real vault.
    expect(() => emptyVault()).toThrow(VaultPathError);
  });
});

describe('removing .env', () => {
  it('deletes the file and unsets what it had put in this process', async () => {
    const { removeEnv } = await import('@/lib/env-write');
    const envPath = path.join(dir, '.env');
    fs.writeFileSync(
      envPath,
      'VAULT_PATH=/somewhere\n# GITHUB_TOKEN=commented\nMERIDIAN_THEME=dark\n',
    );
    process.env.MERIDIAN_THEME = 'dark';
    process.env.GITHUB_TOKEN = 'set by something else';

    removeEnv(envPath);

    expect(fs.existsSync(envPath)).toBe(false);
    // Without this the app reads as configured with nothing behind it.
    expect(process.env.MERIDIAN_THEME).toBeUndefined();
    // A commented-out key was never this file's doing, so it is left alone.
    expect(process.env.GITHUB_TOKEN).toBe('set by something else');

    delete process.env.GITHUB_TOKEN;
  });

  it('is a no-op on a vault that never had one', async () => {
    const { removeEnv } = await import('@/lib/env-write');
    expect(() => removeEnv(path.join(dir, '.env'))).not.toThrow();
  });
});
