import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetConfig } from '@/lib/env';
import { notePath, slugifyTitle } from '@/lib/vault/notes';

describe('slugifyTitle', () => {
  it('folds Croatian diacritics rather than dropping the letters', () => {
    expect(slugifyTitle('Marko Marić')).toBe('marko-maric');
    expect(slugifyTitle('Dora Šimić')).toBe('dora-simic');
    expect(slugifyTitle('Đurđevdan')).toBe('durdevdan');
    expect(slugifyTitle('plan zapošljavanja')).toBe('plan-zaposljavanja');
  });

  it('keeps a filename readable', () => {
    expect(slugifyTitle('1:1 — staff track and on-call')).toBe('1-1-staff-track-and-on-call');
    expect(slugifyTitle('!!!')).toBe('note');
    expect(slugifyTitle('')).toBe('note');
  });

  it('never ends on a dash after truncation', () => {
    const long = slugifyTitle(`${'a'.repeat(39)} bbbb`);
    expect(long.endsWith('-')).toBe(false);
  });
});

describe('notePath', () => {
  const base = { date: '2026-08-20', titleSlug: 'staff-track' };

  it('files a note about a person under that person', () => {
    expect(notePath({ ...base, personSlug: 'ana-horvat', location: 'person' })).toBe(
      'people/ana-horvat/notes/2026-08-20-staff-track.md',
    );
  });

  it('keeps a captured note in the inbox until it has a person', () => {
    expect(notePath({ ...base, personSlug: null, location: 'inbox' })).toBe(
      'notes/inbox/2026-08-20-staff-track.md',
    );
  });

  it('puts a note about nobody in general', () => {
    expect(notePath({ ...base, personSlug: null, location: 'general' })).toBe(
      'notes/general/2026-08-20-staff-track.md',
    );
  });

  it('lets the person win over a stale location', () => {
    expect(notePath({ ...base, personSlug: 'ana-horvat', location: 'inbox' })).toBe(
      'people/ana-horvat/notes/2026-08-20-staff-track.md',
    );
  });
});

describe('moveNote', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-notes-'));
    process.env.VAULT_PATH = dir;
    resetConfig();
    fs.mkdirSync(path.join(dir, 'people'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'people/entries.json'),
      JSON.stringify([
        { slug: 'ana-horvat', displayName: 'Ana Horvat' },
        { slug: 'marko-maric', displayName: 'Marko Marić' },
      ]),
    );
    fs.mkdirSync(path.join(dir, 'notes/inbox'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'notes/inbox/2026-08-18-misao.md'),
      '---\ncategory: idea\ndraft: true\npinned: false\n---\n# Misao\n\nBody.\n',
    );
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    delete process.env.VAULT_PATH;
    resetConfig();
  });

  it('moves a filed note out of the inbox and keeps its front matter', async () => {
    const { moveNote } = await import('@/lib/vault/notes');
    const { invalidateVault } = await import('@/lib/vault/index');
    invalidateVault();

    const result = await moveNote('notes/inbox/2026-08-18-misao.md', { personSlug: 'ana-horvat' });
    expect(result.path).toBe('people/ana-horvat/notes/2026-08-18-misao.md');
    expect(fs.existsSync(path.join(dir, 'notes/inbox/2026-08-18-misao.md'))).toBe(false);
    expect(fs.readFileSync(path.join(dir, result.path), 'utf8')).toContain('category: idea');
  });

  it('renames on a date change, keeping the title slug', async () => {
    const { moveNote } = await import('@/lib/vault/notes');
    const { invalidateVault } = await import('@/lib/vault/index');
    invalidateVault();

    const result = await moveNote('notes/inbox/2026-08-18-misao.md', { date: '2026-01-05' });
    expect(result.path).toBe('notes/inbox/2026-01-05-misao.md');
  });

  it('refuses a person who is not on the roster', async () => {
    const { moveNote } = await import('@/lib/vault/notes');
    const { invalidateVault } = await import('@/lib/vault/index');
    invalidateVault();

    await expect(
      moveNote('notes/inbox/2026-08-18-misao.md', { personSlug: 'nobody-here' }),
    ).rejects.toThrow(/No person with the slug/);
  });

  it('refuses to overwrite a note already at the destination', async () => {
    const { moveNote } = await import('@/lib/vault/notes');
    const { invalidateVault } = await import('@/lib/vault/index');
    invalidateVault();

    fs.mkdirSync(path.join(dir, 'people/ana-horvat/notes'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'people/ana-horvat/notes/2026-08-18-misao.md'), '# Taken\n');

    await expect(
      moveNote('notes/inbox/2026-08-18-misao.md', { personSlug: 'ana-horvat' }),
    ).rejects.toThrow(/already exists/);
    // The original must survive a refused move.
    expect(fs.existsSync(path.join(dir, 'notes/inbox/2026-08-18-misao.md'))).toBe(true);
  });

  it('is a no-op when nothing that places the note changed', async () => {
    const { moveNote } = await import('@/lib/vault/notes');
    const { invalidateVault } = await import('@/lib/vault/index');
    invalidateVault();

    const result = await moveNote('notes/inbox/2026-08-18-misao.md', { date: '2026-08-18' });
    expect(result.moved).toBe(false);
  });
});

describe('what counts as a note', () => {
  it('accepts only the three places a note can live', async () => {
    const { isNotePathForTests } = await import('@/lib/vault/index');
    expect(isNotePathForTests('notes/inbox/2026-08-18-misao.md')).toBe(true);
    expect(isNotePathForTests('notes/general/2026-08-15-plan.md')).toBe(true);
    expect(isNotePathForTests('people/ana-horvat/notes/2026-08-12-1on1.md')).toBe(true);
  });

  it('rejects Markdown that is not a note', async () => {
    const { isNotePathForTests } = await import('@/lib/vault/index');
    // The vault's own documentation is not a note about anyone.
    expect(isNotePathForTests('README.md')).toBe(false);
    expect(isNotePathForTests('people/ana-horvat/about.md')).toBe(false);
    // Nested deeper than the layout allows.
    expect(isNotePathForTests('notes/general/sub/deep.md')).toBe(false);
    expect(isNotePathForTests('people/ana-horvat/notes/sub/deep.md')).toBe(false);
    // Right name, wrong place.
    expect(isNotePathForTests('notes/2026-08-18-loose.md')).toBe(false);
    expect(isNotePathForTests('people/ana-horvat/2026-08-18-loose.md')).toBe(false);
    expect(isNotePathForTests('tasks.json')).toBe(false);
  });
});
