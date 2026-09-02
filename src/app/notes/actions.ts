'use server';

import { vaultChanged } from '@/app/changed';
import {
  createNote,
  deleteNote,
  getNote,
  moveNote,
  saveNoteBody,
  setNoteMeta,
} from '@/lib/vault/notes';
import type { NoteCategory } from '@/lib/vault/schemas';

export type NoteResult = { ok: true; path: string } | { ok: false; message: string };

export async function setMetaAction(
  path: string,
  patch: Partial<{
    category: NoteCategory;
    draft: boolean;
    pinned: boolean;
    project: string | null;
  }>,
): Promise<NoteResult> {
  try {
    await setNoteMeta(path, patch);
    // A note can be tagged with a project from here, so the project's own page
    // has to be told as well as the Notes screen.
    vaultChanged('/notes', '/projects', patch.project ? `/projects/${patch.project}` : null);
    return { ok: true, path };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

/** Changing the date renames the file; changing the person moves it between folders. */
export async function moveNoteAction(
  path: string,
  patch: { date?: string; personSlug?: string | null },
): Promise<NoteResult> {
  try {
    const result = await moveNote(path, patch);
    vaultChanged('/notes');
    return { ok: true, path: result.path };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

/**
 * Deletes the note's file. A snapshot is taken first, so `npm run vault:restore`
 * can bring it back and nothing in the app can — which is what the confirmation
 * on the screen says, in those words.
 *
 * The person's page and the project's are revalidated as well as Notes: a note
 * is counted in both, and a count that still includes a deleted note is the kind
 * of wrong that gets believed.
 */
export async function deleteNoteAction(path: string): Promise<NoteResult> {
  try {
    const note = getNote(path);
    await deleteNote(path);
    vaultChanged(
      '/notes',
      note?.personSlug ? `/people/${note.personSlug}` : null,
      note?.project ? `/projects/${note.project}` : null,
      '/projects',
    );
    return { ok: true, path };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

/** Everything the note page holds, which is every field a note has. */
export type NoteDraft = {
  title: string;
  body: string;
  category: NoteCategory;
  personSlug: string | null;
  project: string | null;
  draft: boolean;
  pinned: boolean;
  date: string;
};

/**
 * The note page's one write, for both of the things that page is: the whole note
 * in a single call, and nothing on disk until it is made.
 *
 * That is the difference from the list screen's pane, where every control writes
 * the moment it moves. A full page is somewhere you sit and change four things
 * before you mean any of them, and a Cancel that leaves three of them applied is
 * not a cancel — so the page stages the lot and this action lands it.
 *
 * The order matters for an existing note: content and front matter first, then
 * the move, because moving is what changes the path this was called with. A move
 * that fails therefore leaves the writing done and the file where it was, which
 * is the half worth keeping.
 */
export async function writeNoteAction(path: string | null, note: NoteDraft): Promise<NoteResult> {
  try {
    if (!path) {
      const created = await createNote({
        title: note.title,
        body: note.body,
        category: note.category,
        personSlug: note.personSlug,
        project: note.project,
        draft: note.draft,
        pinned: note.pinned,
        date: note.date,
      });
      vaultChanged(
        '/notes',
        note.personSlug ? `/people/${note.personSlug}` : null,
        note.project ? `/projects/${note.project}` : null,
        '/projects',
      );
      return { ok: true, path: created };
    }

    const before = getNote(path);
    await setNoteMeta(path, {
      category: note.category,
      draft: note.draft,
      pinned: note.pinned,
      project: note.project,
    });
    await saveNoteBody(path, note.title, note.body);
    const moved = await moveNote(path, { date: note.date, personSlug: note.personSlug });

    // Both sides of a move: the person or project it left counts one note fewer,
    // and a count that still includes it is the kind of wrong that gets believed.
    vaultChanged(
      '/notes',
      before?.personSlug ? `/people/${before.personSlug}` : null,
      note.personSlug ? `/people/${note.personSlug}` : null,
      before?.project ? `/projects/${before.project}` : null,
      note.project ? `/projects/${note.project}` : null,
      '/projects',
    );
    return { ok: true, path: moved.path };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function createNoteAction(
  title: string,
  personSlug: string | null,
  project: string | null = null,
): Promise<NoteResult> {
  try {
    const path = await createNote({ title, personSlug, project, category: 'generic' });
    vaultChanged('/notes');
    return { ok: true, path };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
