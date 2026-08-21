'use server';

import { vaultChanged } from '@/app/changed';
import { moveNote, saveNoteBody, setNoteMeta } from '@/lib/vault/notes';
import type { NoteCategory } from '@/lib/vault/schemas';

export type NoteResult = { ok: true; path: string } | { ok: false; message: string };

export async function saveNoteAction(
  path: string,
  title: string,
  body: string,
): Promise<NoteResult> {
  try {
    await saveNoteBody(path, title, body);
    vaultChanged('/notes');
    return { ok: true, path };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function setMetaAction(
  path: string,
  patch: Partial<{ category: NoteCategory; draft: boolean; pinned: boolean }>,
): Promise<NoteResult> {
  try {
    await setNoteMeta(path, patch);
    vaultChanged('/notes');
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

export async function createNoteAction(
  title: string,
  personSlug: string | null,
): Promise<NoteResult> {
  try {
    const { createNote } = await import('@/lib/vault/notes');
    const path = await createNote({ title, personSlug, category: 'generic' });
    vaultChanged('/notes');
    return { ok: true, path };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
