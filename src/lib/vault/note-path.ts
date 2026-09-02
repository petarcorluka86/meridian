/**
 * Where a note's file goes, and nothing that touches the disk.
 *
 * Split out of `notes.ts` so the editor can show the path a new note will get
 * while it is still being typed: `notes.ts` imports `node:fs`, and a client
 * component cannot. Two implementations of this would be two answers to "which
 * file is this", and the one the screen showed would be the wrong one.
 */

/**
 * Two, since there is nowhere else a note can be. It used to be three: a note
 * captured without a person landed in `notes/inbox/` and waited to be filed.
 * The waiting was the problem — the only way out of that folder was to name a
 * person, so a note that was about nobody in particular stayed in a queue that
 * could never be emptied.
 */
export type NoteLocation = 'person' | 'general';

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
  return `notes/general/${file}`;
}

/**
 * The slug part of an existing filename, so renaming by date or moving between
 * folders keeps the title the file already has. A note's heading is free to
 * change without the file being renamed underneath it — the path is where it
 * was filed, not a second copy of what it says.
 */
export function noteTitleSlug(path: string, title: string): string {
  const base = path.split('/').pop()!.replace(/\.md$/, '');
  const withoutDate = base.replace(/^\d{4}-\d{2}-\d{2}-/, '');
  return withoutDate || slugifyTitle(title);
}
