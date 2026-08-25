import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DATA_VERSION, MIGRATIONS, type Migration, migrateVault } from '@/lib/vault/migrate';

/**
 * The vault outlives the app, so the format carries a version. Until now nothing
 * read it: `dataVersion` was written into config.json and never looked at again,
 * which is a migration story only in the sense that a blank page is a novel.
 *
 * The case that matters is the second describe block. An older app opening a
 * newer vault is the one that loses data, because its first save drops every
 * field it has never heard of.
 */

let vault: string;

const config = () =>
  JSON.parse(fs.readFileSync(path.join(vault, 'config.json'), 'utf8')) as {
    dataVersion: number;
    thresholds?: unknown;
  };

beforeEach(() => {
  vault = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-migrate-'));
  fs.writeFileSync(
    path.join(vault, 'config.json'),
    `${JSON.stringify({ thresholds: { contactGapDays: 14 }, dataVersion: 1 }, null, 2)}\n`,
  );
});

afterEach(() => {
  fs.rmSync(vault, { recursive: true, force: true });
});

describe('a vault at the current format', () => {
  it('is left alone', () => {
    expect(migrateVault(vault, [], 1)).toEqual({ state: 'current' });
    expect(config().dataVersion).toBe(1);
  });

  it('keeps a version it cannot make sense of out of the way', () => {
    // A config with no version, or a broken one, is treated as current rather
    // than migrated from zero — repairing it is the doctor's job, not this one's.
    // `DATA_VERSION` rather than a literal, because "current" is whatever this
    // build writes: with a number here, this test broke the day the format moved.
    fs.writeFileSync(path.join(vault, 'config.json'), '{ "thresholds": {} }');
    expect(migrateVault(vault, [], DATA_VERSION).state).toBe('current');
    fs.writeFileSync(path.join(vault, 'config.json'), 'not json');
    expect(migrateVault(vault, [], DATA_VERSION).state).toBe('current');
  });
});

describe('a vault newer than the app', () => {
  it('is refused rather than opened', () => {
    fs.writeFileSync(
      path.join(vault, 'config.json'),
      `${JSON.stringify({ dataVersion: 4 }, null, 2)}\n`,
    );

    expect(migrateVault(vault, [], 2)).toEqual({ state: 'app-too-old', found: 4, supported: 2 });
    // And nothing was written on the way to saying so.
    expect(config().dataVersion).toBe(4);
  });
});

describe('a vault older than the app', () => {
  const step = (to: number, marker: string): Migration => ({
    to,
    what: `wrote ${marker}`,
    run: (dir) => fs.writeFileSync(path.join(dir, marker), ''),
  });

  it('runs every step in order and lands on the current version', () => {
    const outcome = migrateVault(vault, [step(3, 'third'), step(2, 'second')], 3);

    expect(outcome).toEqual({
      state: 'migrated',
      from: 1,
      to: 3,
      steps: ['wrote second', 'wrote third'],
    });
    expect(config().dataVersion).toBe(3);
    expect(fs.existsSync(path.join(vault, 'second'))).toBe(true);
  });

  it('leaves the rest of config.json untouched', () => {
    migrateVault(vault, [step(2, 'second')], 2);
    expect(config().thresholds).toEqual({ contactGapDays: 14 });
  });

  it('skips steps the vault is already past', () => {
    fs.writeFileSync(
      path.join(vault, 'config.json'),
      `${JSON.stringify({ dataVersion: 2 }, null, 2)}\n`,
    );
    const outcome = migrateVault(vault, [step(2, 'second'), step(3, 'third')], 3);

    expect(outcome).toMatchObject({ state: 'migrated', from: 2, steps: ['wrote third'] });
    expect(fs.existsSync(path.join(vault, 'second'))).toBe(false);
  });

  it('stops at the step that failed, and does not record it as done', () => {
    const broken: Migration = {
      to: 3,
      what: 'breaks',
      run: () => {
        throw new Error('disk full');
      },
    };
    const outcome = migrateVault(vault, [step(2, 'second'), broken], 3);

    expect(outcome).toEqual({ state: 'failed', at: 2, what: 'breaks', reason: 'disk full' });
    // Step 2 succeeded and is recorded; step 3 did not, so the next start
    // retries step 3 alone rather than redoing step 2.
    expect(config().dataVersion).toBe(2);
    expect(fs.existsSync(path.join(vault, 'second'))).toBe(true);
  });

  it('refuses to move the version when a format change has no step', () => {
    // It used to stamp the number on and report 'migrated', which writes "format
    // 2" onto format-1 data. After that the app-too-old refusal can never fire
    // again, because every vault claims the newest format whatever it holds.
    const outcome = migrateVault(vault, [], 2);

    expect(outcome).toMatchObject({ state: 'failed', at: 1, what: 'reach format 2' });
    expect(config().dataVersion).toBe(1);
  });

  it('keeps the steps that ran and names the one that is missing', () => {
    const outcome = migrateVault(vault, [step(2, 'second')], 3);

    expect(outcome).toMatchObject({ state: 'failed', at: 2, what: 'reach format 3' });
    // Step 2 ran and is recorded, so a restart does not redo it.
    expect(config().dataVersion).toBe(2);
    expect(fs.existsSync(path.join(vault, 'second'))).toBe(true);
  });
});

describe('the step that removed the inbox', () => {
  let vault: string;

  beforeEach(() => {
    vault = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-inbox-migration-'));
    fs.mkdirSync(path.join(vault, 'notes/inbox'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(vault, { recursive: true, force: true });
  });

  const step = () => MIGRATIONS.find((m) => m.to === 2)!;

  it('moves every note into general and takes the folder with it', () => {
    fs.writeFileSync(path.join(vault, 'notes/inbox/2026-08-18-misao.md'), '# Misao\n');
    fs.writeFileSync(path.join(vault, 'notes/inbox/2026-08-19-druga.md'), '# Druga\n');

    step().run(vault);

    expect(fs.readdirSync(path.join(vault, 'notes/general')).sort()).toEqual([
      '2026-08-18-misao.md',
      '2026-08-19-druga.md',
    ]);
    expect(fs.existsSync(path.join(vault, 'notes/inbox'))).toBe(false);
  });

  it('keeps both when the same filename already exists in general', () => {
    fs.mkdirSync(path.join(vault, 'notes/general'), { recursive: true });
    fs.writeFileSync(
      path.join(vault, 'notes/general/2026-08-18-misao.md'),
      '# The one in general\n',
    );
    fs.writeFileSync(
      path.join(vault, 'notes/inbox/2026-08-18-misao.md'),
      '# The one from the inbox\n',
    );

    step().run(vault);

    // Neither is overwritten. The renamed one is ugly on purpose: it is visible,
    // and nothing somebody wrote is gone.
    expect(
      fs.readFileSync(path.join(vault, 'notes/general/2026-08-18-misao.md'), 'utf8'),
    ).toContain('The one in general');
    expect(
      fs.readFileSync(path.join(vault, 'notes/general/2026-08-18-misao-inbox.md'), 'utf8'),
    ).toContain('The one from the inbox');
  });

  it('leaves a folder holding something it does not understand', () => {
    fs.writeFileSync(path.join(vault, 'notes/inbox/notes.txt'), 'not a note\n');

    step().run(vault);

    // Not this step's to judge, and not this step's to delete.
    expect(fs.existsSync(path.join(vault, 'notes/inbox/notes.txt'))).toBe(true);
  });

  it('is a no-op on a vault that never had an inbox', () => {
    fs.rmSync(path.join(vault, 'notes/inbox'), { recursive: true });
    expect(() => step().run(vault)).not.toThrow();
  });
});
