import { getVault, invalidateVault, type Note } from './index';
import { parseFrontmatter, serializeFrontmatter } from './frontmatter';
import { NoteFrontmatter, type NoteCategory } from './schemas';
import { safeVaultPath } from './paths';
import { moveFile, mutateTextFile, removeFile, withLock, writeTextAtomic } from './write';
import fs from 'node:fs';

export type NoteLocation = 'person' | 'inbox' | 'general';

/** "1:1 — staff track" → "1-1-staff-track", capped so a filename stays readable. */
export function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đ]/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
    .replace(/-$/, '');
  return slug || 'note';
}

/**
 * The folder decides who a note is about, so a path is derived from the three
 * facts that place it — never stored and never read back from front matter.
 */
export function notePath(opts: {
  date: string;
  titleSlug: string;
  personSlug: string | null;
  location: NoteLocation;
}): string {
  const file = `${opts.date}-${opts.titleSlug}.md`;
  if (opts.personSlug) return `people/${opts.personSlug}/notes/${file}`;
  return opts.location === 'inbox' ? `notes/inbox/${file}` : `notes/general/${file}`;
}

/** The slug part of an existing filename, so renaming by date keeps the title. */
function titleSlugOf(note: Note): string {
  const base = note.path.split('/').pop()!.replace(/\.md$/, '');
  const withoutDate = base.replace(/^\d{4}-\d{2}-\d{2}-/, '');
  return withoutDate || slugifyTitle(note.title);
}

/**
 * The four keys, in this order, and nothing else. `project` is last and is
 * dropped when there is none — `serializeFrontmatter` omits an empty value — so a
 * note that belongs to no project keeps the front matter it always had, byte for
 * byte.
 */
function noteFile(note: {
  category: NoteCategory;
  draft: boolean;
  pinned: boolean;
  project: string | null;
  body: string;
}): string {
  return serializeFrontmatter(
    {
      category: note.category,
      draft: note.draft,
      pinned: note.pinned,
      project: note.project ?? '',
    },
    note.body,
  );
}

export function getNote(path: string): Note | null {
  return getVault().notesByPath.get(path) ?? null;
}

async function rewrite(path: string, next: (note: Note, raw: string) => string): Promise<void> {
  // The note is looked up per attempt, not once: a retry happens precisely
  // because someone else wrote the file.
  await mutateTextFile(path, (raw) => {
    const note = getNote(path);
    if (!note) throw new Error(`${path} is not a note Meridian can read.`);
    return next(note, raw);
  });
}

export async function saveNoteBody(path: string, title: string, body: string): Promise<void> {
  await rewrite(path, (_note, raw) => {
    const { data } = parseFrontmatter(raw);
    const meta = NoteFrontmatter.parse(data);
    // The title lives in the first heading, the way any Markdown tool would read it.
    const withoutHeading = body.replace(/^#\s+.*(\r?\n)?/, '');
    const trimmedTitle = title.trim();
    const nextBody = trimmedTitle
      ? `# ${trimmedTitle}\n${withoutHeading.startsWith('\n') ? '' : '\n'}${withoutHeading}`
      : body;
    return noteFile({ ...meta, body: nextBody });
  });
}

export async function setNoteMeta(
  path: string,
  patch: Partial<{
    category: NoteCategory;
    draft: boolean;
    pinned: boolean;
    project: string | null;
  }>,
): Promise<void> {
  await rewrite(path, (_note, raw) => {
    const { data, body } = parseFrontmatter(raw);
    const meta = NoteFrontmatter.parse(data);
    return noteFile({ ...meta, ...patch, body });
  });
}

export type MoveResult = { path: string; moved: boolean };

/**
 * Which project a note belongs to. A separate call from `setNoteMeta` only so
 * that deleting a project has one obvious thing to call for each of its notes.
 */
export async function setNoteProject(path: string, project: string | null): Promise<void> {
  await setNoteMeta(path, { project });
}

/**
 * Changing the date renames the file; changing the person moves it between
 * folders. Both are visible on disk, which is the point — the folder is the
 * record of who a note is about.
 */
export async function moveNote(
  path: string,
  patch: { date?: string; personSlug?: string | null },
): Promise<MoveResult> {
  const note = getNote(path);
  if (!note) throw new Error(`${path} is not a note Meridian can read.`);

  const date = patch.date ?? note.date ?? new Date().toISOString().slice(0, 10);
  const personSlug = patch.personSlug === undefined ? note.personSlug : patch.personSlug || null;

  if (personSlug && !getVault().peopleBySlug.has(personSlug)) {
    throw new Error(`No person with the slug ${personSlug} in people/entries.json.`);
  }

  // Filing a captured note gives it a person, which takes it out of the inbox.
  const location: NoteLocation = personSlug
    ? 'person'
    : note.location === 'inbox'
      ? 'inbox'
      : 'general';

  const next = notePath({ date, titleSlug: titleSlugOf(note), personSlug, location });
  if (next === path) return { path, moved: false };

  if (fs.existsSync(safeVaultPath(next))) {
    throw new Error(`${next} already exists. Rename one of them first.`);
  }

  await withLock(path, () => {
    moveFile(path, next);
    invalidateVault();
  });
  return { path: next, moved: true };
}

/**
 * Deletes the note's file, and nothing else.
 *
 * A note is one file, so there is no third place to tidy up — no row to remove
 * from an index, no reference to clear the way deleting a project has to. What
 * the note said is in `.snapshots/` and `npm run vault:restore` can bring it
 * back; nothing in the app can, which is what the confirmation says.
 */
export async function deleteNote(path: string): Promise<void> {
  const note = getNote(path);
  if (!note) throw new Error(`${path} is not a note Meridian can read.`);

  await withLock(path, () => {
    removeFile(path);
    invalidateVault();
  });
}

export async function createNote(input: {
  title: string;
  body?: string;
  category?: NoteCategory;
  personSlug?: string | null;
  project?: string | null;
  draft?: boolean;
  date?: string;
}): Promise<string> {
  const title = input.title.trim();
  if (!title) throw new Error('A note needs a title.');

  const date = input.date ?? new Date().toISOString().slice(0, 10);
  const personSlug = input.personSlug || null;
  // Anything captured without a person lands in the inbox until you give it one.
  const location: NoteLocation = personSlug
    ? 'person'
    : input.personSlug === null
      ? 'inbox'
      : 'general';

  let path = notePath({ date, titleSlug: slugifyTitle(title), personSlug, location });
  for (let i = 2; fs.existsSync(safeVaultPath(path)); i++) {
    path = notePath({ date, titleSlug: `${slugifyTitle(title)}-${i}`, personSlug, location });
  }

  const body = input.body?.trim() ? `# ${title}\n\n${input.body.trim()}\n` : `# ${title}\n\n`;
  writeTextAtomic(
    path,
    noteFile({
      category: input.category ?? 'generic',
      draft: input.draft ?? false,
      pinned: false,
      project: input.project ?? null,
      body,
    }),
  );
  invalidateVault();
  return path;
}
