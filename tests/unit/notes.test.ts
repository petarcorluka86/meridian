import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetConfig } from '@/lib/env';
import { notePath, slugifyTitle } from '@/lib/vault/notes';

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

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

  it('puts a note about nobody in general', () => {
    expect(notePath({ ...base, personSlug: null, location: 'general' })).toBe(
      'notes/general/2026-08-20-staff-track.md',
    );
  });

  it('lets the person win over a stale location', () => {
    expect(notePath({ ...base, personSlug: 'ana-horvat', location: 'general' })).toBe(
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
    fs.mkdirSync(path.join(dir, 'notes/general'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'notes/general/2026-08-18-misao.md'),
      '---\ncategory: idea\ndraft: true\npinned: false\n---\n# Misao\n\nBody.\n',
    );
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    delete process.env.VAULT_PATH;
    resetConfig();
  });

  it('files a note under a person and keeps its front matter', async () => {
    const { moveNote } = await import('@/lib/vault/notes');
    const { invalidateVault } = await import('@/lib/vault/index');
    invalidateVault();

    const result = await moveNote('notes/general/2026-08-18-misao.md', {
      personSlug: 'ana-horvat',
    });
    expect(result.path).toBe('people/ana-horvat/notes/2026-08-18-misao.md');
    expect(fs.existsSync(path.join(dir, 'notes/general/2026-08-18-misao.md'))).toBe(false);
    expect(fs.readFileSync(path.join(dir, result.path), 'utf8')).toContain('category: idea');
  });

  it('renames on a date change, keeping the title slug', async () => {
    const { moveNote } = await import('@/lib/vault/notes');
    const { invalidateVault } = await import('@/lib/vault/index');
    invalidateVault();

    const result = await moveNote('notes/general/2026-08-18-misao.md', { date: '2026-01-05' });
    expect(result.path).toBe('notes/general/2026-01-05-misao.md');
  });

  it('refuses a person who is not on the roster', async () => {
    const { moveNote } = await import('@/lib/vault/notes');
    const { invalidateVault } = await import('@/lib/vault/index');
    invalidateVault();

    await expect(
      moveNote('notes/general/2026-08-18-misao.md', { personSlug: 'nobody-here' }),
    ).rejects.toThrow(/No person with the slug/);
  });

  it('refuses to overwrite a note already at the destination', async () => {
    const { moveNote } = await import('@/lib/vault/notes');
    const { invalidateVault } = await import('@/lib/vault/index');
    invalidateVault();

    fs.mkdirSync(path.join(dir, 'people/ana-horvat/notes'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'people/ana-horvat/notes/2026-08-18-misao.md'), '# Taken\n');

    await expect(
      moveNote('notes/general/2026-08-18-misao.md', { personSlug: 'ana-horvat' }),
    ).rejects.toThrow(/already exists/);
    // The original must survive a refused move.
    expect(fs.existsSync(path.join(dir, 'notes/general/2026-08-18-misao.md'))).toBe(true);
  });

  it('is a no-op when nothing that places the note changed', async () => {
    const { moveNote } = await import('@/lib/vault/notes');
    const { invalidateVault } = await import('@/lib/vault/index');
    invalidateVault();

    const result = await moveNote('notes/general/2026-08-18-misao.md', { date: '2026-08-18' });
    expect(result.moved).toBe(false);
  });
});

describe('deleteNote', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-delete-note-'));
    process.env.VAULT_PATH = dir;
    resetConfig();
    fs.mkdirSync(path.join(dir, 'notes/general'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'notes/general/2026-08-18-hiring.md'),
      '---\ncategory: planning\ndraft: false\npinned: false\n---\n# Hiring\n\nTwo roles.\n',
    );
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    delete process.env.VAULT_PATH;
    resetConfig();
  });

  it('removes the file and leaves a snapshot behind it', async () => {
    const { deleteNote } = await import('@/lib/vault/notes');
    const { invalidateVault, getVault } = await import('@/lib/vault/index');
    invalidateVault();

    await deleteNote('notes/general/2026-08-18-hiring.md');

    expect(fs.existsSync(path.join(dir, 'notes/general/2026-08-18-hiring.md'))).toBe(false);
    // The confirmation promises vault:restore can bring it back. This is that
    // promise, on disk.
    const snapshots = fs.readdirSync(
      path.join(dir, '.snapshots/notes/general/2026-08-18-hiring.md'),
    );
    expect(snapshots).toHaveLength(1);
    expect(
      fs.readFileSync(
        path.join(dir, '.snapshots/notes/general/2026-08-18-hiring.md', snapshots[0]!),
        'utf8',
      ),
    ).toContain('Two roles.');

    expect(getVault().notes).toHaveLength(0);
  });

  it('refuses a path that is not a note it can read', async () => {
    const { deleteNote } = await import('@/lib/vault/notes');
    const { invalidateVault } = await import('@/lib/vault/index');
    invalidateVault();

    await expect(deleteNote('notes/general/never-existed.md')).rejects.toThrow();
    // Nothing outside the vault, and nothing that is not a note.
    await expect(deleteNote('../../etc/hosts')).rejects.toThrow();
    await expect(deleteNote('people/entries.json')).rejects.toThrow();
  });
});

describe('what counts as a note', () => {
  it('accepts only the three places a note can live', async () => {
    const { isNotePathForTests } = await import('@/lib/vault/index');
    expect(isNotePathForTests('notes/general/2026-08-18-misao.md')).toBe(true);
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

/**
 * The note page's one write, which is where creating and editing a note both
 * end up. What is worth a test is not the writing but the order: front matter,
 * then the body, then the move — because the move is what changes the path the
 * first two were called with, and getting that backwards writes into a file that
 * is no longer there.
 */
describe('writeNoteAction', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-write-note-'));
    process.env.VAULT_PATH = dir;
    resetConfig();
    fs.mkdirSync(path.join(dir, 'people'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'people/entries.json'),
      JSON.stringify([{ slug: 'ana-horvat', displayName: 'Ana Horvat' }]),
    );
    fs.mkdirSync(path.join(dir, 'notes/general'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'notes/general/2026-08-18-misao.md'),
      '---\ncategory: idea\ndraft: true\npinned: true\n---\n# Misao\n\nBody.\n',
    );
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    delete process.env.VAULT_PATH;
    resetConfig();
  });

  const write = async () => {
    const { writeNoteAction } = await import('@/app/notes/actions');
    const { invalidateVault } = await import('@/lib/vault/index');
    invalidateVault();
    return writeNoteAction;
  };

  it('creates a note at the path the editor showed, with every field it held', async () => {
    const writeNoteAction = await write();

    const result = await writeNoteAction(null, {
      title: 'Staff track',
      body: 'What she asked for.',
      category: '1on1',
      personSlug: 'ana-horvat',
      project: 'platform-split',
      draft: true,
      pinned: false,
      date: '2026-08-20',
    });

    expect(result).toEqual({ ok: true, path: 'people/ana-horvat/notes/2026-08-20-staff-track.md' });
    const raw = fs.readFileSync(
      path.join(dir, 'people/ana-horvat/notes/2026-08-20-staff-track.md'),
      'utf8',
    );
    expect(raw).toContain('category: 1on1');
    expect(raw).toContain('draft: true');
    expect(raw).toContain('project: platform-split');
    expect(raw).toContain('# Staff track');
    expect(raw).toContain('What she asked for.');
  });

  it('writes the body and the front matter of a note that also moves', async () => {
    const writeNoteAction = await write();

    const result = await writeNoteAction('notes/general/2026-08-18-misao.md', {
      title: 'Misao',
      body: 'Rewritten.',
      category: 'planning',
      personSlug: 'ana-horvat',
      project: null,
      draft: false,
      pinned: true,
      date: '2026-08-25',
    });

    // The move is last, so what comes back is where the file actually is.
    expect(result).toEqual({ ok: true, path: 'people/ana-horvat/notes/2026-08-25-misao.md' });
    expect(fs.existsSync(path.join(dir, 'notes/general/2026-08-18-misao.md'))).toBe(false);
    const raw = fs.readFileSync(
      path.join(dir, 'people/ana-horvat/notes/2026-08-25-misao.md'),
      'utf8',
    );
    expect(raw).toContain('category: planning');
    expect(raw).toContain('draft: false');
    expect(raw).toContain('pinned: true');
    expect(raw).toContain('Rewritten.');
  });

  it('reports a bad person rather than throwing, and leaves the note where it was', async () => {
    const writeNoteAction = await write();

    const result = await writeNoteAction('notes/general/2026-08-18-misao.md', {
      title: 'Misao',
      body: 'Body.',
      category: 'idea',
      personSlug: 'nobody-here',
      project: null,
      draft: true,
      pinned: true,
      date: '2026-08-18',
    });

    expect(result.ok).toBe(false);
    expect(fs.existsSync(path.join(dir, 'notes/general/2026-08-18-misao.md'))).toBe(true);
  });
});
