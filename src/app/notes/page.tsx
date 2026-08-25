import Link from 'next/link';
import { getVault } from '@/lib/vault/index';
import { renderMarkdown, splitTitle } from '@/lib/markdown';
import { shortDate } from '@/lib/dates';
import { NoteFilters } from '@/components/notes/NoteFilters';
import { NewNote } from '@/components/notes/NewNote';
import { EMPTY_GLYPH } from '@/components/EmptyGlyphs';
import { NAV_GLYPH } from '@/components/NavIcons';
import { NoteEditor, type EditorNote } from '@/components/notes/NoteEditor';
import { EMPTY } from '@/copy/empty';
import {
  CategoryPill,
  categoryOf,
  EmptyState,
  PageHeader,
  Pill,
  Row,
  Stack,
  Text,
} from '@/components/ui';
import styles from '@/components/notes/Notes.module.css';

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{
    note?: string;
    person?: string;
    project?: string;
    cat?: string;
    drafts?: string;
  }>;
}) {
  const params = await searchParams;
  const person = params.person ?? 'all';
  const project = params.project ?? 'all';
  const category = params.cat ?? 'all';
  const draftsOnly = params.drafts === '1';

  const vault = getVault();
  const people = vault.people.map((p) => ({ slug: p.slug, name: p.displayName }));
  const projects = vault.projects.map((p) => ({ id: p.id, title: p.title }));
  const nameOf = (slug: string) => vault.peopleBySlug.get(slug)?.displayName ?? slug;
  const projectTitleOf = (id: string) => vault.projectsById.get(id)?.title ?? null;

  const filtered = vault.notes
    .filter((n) => {
      if (person === 'inbox') return n.location === 'inbox';
      if (person === 'general') return n.personSlug === null;
      if (person !== 'all') return n.personSlug === person;
      return true;
    })
    .filter((n) => {
      if (project === 'none') return n.project === null;
      if (project !== 'all') return n.project === project;
      return true;
    })
    .filter((n) => category === 'all' || n.category === category)
    .filter((n) => !draftsOnly || n.draft)
    // Pinned notes hold the top of the list; everything else is newest first.
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        (b.date ?? '').localeCompare(a.date ?? '') ||
        a.path.localeCompare(b.path),
    );

  const selected = filtered.find((n) => n.path === params.note) ?? filtered[0] ?? null;

  const draftCount = vault.notes.filter((n) => n.draft).length;
  const subtitle = `${vault.notes.length} ${vault.notes.length === 1 ? 'note' : 'notes'}${
    draftCount ? ` · ${draftCount} draft${draftCount === 1 ? '' : 's'}` : ''
  }`;

  const hrefFor = (path: string) => {
    const p = new URLSearchParams();
    p.set('note', path);
    if (person !== 'all') p.set('person', person);
    if (project !== 'all') p.set('project', project);
    if (category !== 'all') p.set('cat', category);
    if (draftsOnly) p.set('drafts', '1');
    return `/notes?${p}`;
  };

  const editorNote: EditorNote | null = selected
    ? (() => {
        const { title, body } = splitTitle(selected.body);
        return {
          path: selected.path,
          title: title || selected.title,
          body,
          html: renderMarkdown(body),
          date: selected.date ?? '',
          personSlug: selected.personSlug,
          project: selected.project,
          category: selected.category,
          draft: selected.draft,
          pinned: selected.pinned,
        };
      })()
    : null;

  return (
    <div className={styles.split} data-screen>
      <div className={`scroll ${styles.listCol}`}>
        <div className={styles.listHead}>
          <Stack gap={4}>
            <PageHeader title="Notes" subtitle={subtitle} level="title" />
            {/* Always, not only when the vault is empty. Writing one down is the
                reason somebody opens this screen, and hiding the way to do it
                behind an empty state means it is missing exactly when there is
                already a note in the way of it. */}
            <NewNote person={person} />
            <NoteFilters
              people={people}
              projects={projects}
              person={person}
              project={project}
              category={category}
              draftsOnly={draftsOnly}
            />
          </Stack>
        </div>

        {filtered.map((note) => {
          const where = note.personSlug
            ? nameOf(note.personSlug)
            : note.location === 'inbox'
              ? 'Inbox'
              : 'General';
          return (
            <Link
              key={note.path}
              href={hrefFor(note.path)}
              className={note.path === selected?.path ? styles.noteRowSelected : styles.noteRow}
              scroll={false}
            >
              <Stack gap={2}>
                <Text level="label" tone="strong">
                  {note.title}
                </Text>
                <Row gap={2}>
                  <CategoryPill category={note.category} label={categoryOf(note.category).label} />
                  {note.draft ? <Pill tone="warning">Draft</Pill> : null}
                  {note.pinned ? <Pill tone="info">Pinned</Pill> : null}
                  <Text level="small" tone="muted">
                    {note.date ? shortDate(note.date) : 'no date'} · {where}
                    {note.project && projectTitleOf(note.project)
                      ? ` · ${projectTitleOf(note.project)}`
                      : ''}
                  </Text>
                </Row>
              </Stack>
            </Link>
          );
        })}

        {filtered.length === 0 ? (
          <Stack gap={3}>
            {vault.notes.length === 0 ? (
              <EmptyState glyph={NAV_GLYPH.notes} {...EMPTY.notes.none} />
            ) : person === 'inbox' ? (
              <EmptyState glyph={NAV_GLYPH.notes} {...EMPTY.notes.inbox} />
            ) : (
              <EmptyState glyph={EMPTY_GLYPH.search} {...EMPTY.notes.filtered} />
            )}
          </Stack>
        ) : null}
      </div>

      {editorNote ? (
        <NoteEditor note={editorNote} people={people} projects={projects} />
      ) : (
        <div className={`scroll ${styles.editorCol}`}>
          <EmptyState glyph={NAV_GLYPH.notes} {...EMPTY.notes.unselected} standalone />
        </div>
      )}
    </div>
  );
}
