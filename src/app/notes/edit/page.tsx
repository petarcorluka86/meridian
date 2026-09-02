import { notFound } from 'next/navigation';
import { getVault } from '@/lib/vault/index';
import { splitTitle } from '@/lib/markdown';
import { today } from '@/lib/dates';
import { type FormNote, NoteForm } from '@/components/notes/NoteForm';

/**
 * Writing a note, on a page of its own — the one screen a note is created or
 * rewritten on. The list screen is for finding and reading; this is for typing,
 * and it takes the whole window to do it.
 *
 * One route for both, because they are one screen with one field different: no
 * `note=` is a note that does not exist yet, and `person=` / `project=` seed it
 * from wherever the writing started.
 */
export default async function NoteEditPage({
  searchParams,
}: {
  searchParams: Promise<{ note?: string; person?: string; project?: string }>;
}) {
  const params = await searchParams;
  const vault = getVault();
  const people = vault.people.map((p) => ({ slug: p.slug, name: p.displayName }));
  // Every project, archived included: a note already tagged with one has to
  // find it in this list, or opening the page would quietly clear the tag.
  const projects = vault.projects.map((p) => ({ id: p.id, title: p.title }));

  const existing = params.note ? (vault.notesByPath.get(params.note) ?? null) : null;
  // A path that names no note is a broken link, not an empty editor: opening a
  // blank page here would look like the note had been emptied.
  if (params.note && !existing) notFound();

  const note: FormNote = existing
    ? (() => {
        const { title, body } = splitTitle(existing.body);
        return {
          path: existing.path,
          title: title || existing.title,
          body,
          date: existing.date ?? today(),
          personSlug: existing.personSlug,
          project: existing.project,
          category: existing.category,
          draft: existing.draft,
          pinned: existing.pinned,
        };
      })()
    : {
        path: null,
        title: '',
        body: '',
        date: today(),
        // Seeded, not fixed: a note started from a person's page or a project is
        // about them until it is told otherwise, and both are still selectable.
        personSlug: params.person && vault.peopleBySlug.has(params.person) ? params.person : null,
        project: params.project ?? null,
        category: 'generic',
        // A note nobody has finished writing is a draft. Saving it says so on
        // the list until the toggle here is turned off.
        draft: true,
        pinned: false,
      };

  return <NoteForm note={note} people={people} projects={projects} />;
}
