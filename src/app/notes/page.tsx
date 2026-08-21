import Link from 'next/link';
import { getVault } from '@/lib/vault/index';
import { renderMarkdown, splitTitle } from '@/lib/markdown';
import { shortDate } from '@/lib/dates';
import { NoteFilters } from '@/components/notes/NoteFilters';
import { NewNote } from '@/components/notes/NewNote';
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
  searchParams: Promise<{ note?: string; person?: string; cat?: string; drafts?: string }>;
}) {
  const params = await searchParams;
  const person = params.person ?? 'all';
  const category = params.cat ?? 'all';
  const draftsOnly = params.drafts === '1';

  const vault = getVault();
  const people = vault.people.map((p) => ({ slug: p.slug, name: p.displayName }));
  const nameOf = (slug: string) => vault.peopleBySlug.get(slug)?.displayName ?? slug;

  const filtered = vault.notes
    .filter((n) => {
      if (person === 'inbox') return n.location === 'inbox';
      if (person === 'general') return n.personSlug === null;
      if (person !== 'all') return n.personSlug === person;
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
            <NoteFilters
              people={people}
              person={person}
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
                  </Text>
                </Row>
              </Stack>
            </Link>
          );
        })}

        {filtered.length === 0 ? (
          <Stack gap={3}>
            <EmptyState>
              {vault.notes.length === 0
                ? EMPTY.notes.none
                : person === 'inbox'
                  ? EMPTY.notes.inbox
                  : EMPTY.notes.filtered}
            </EmptyState>
            {/* A filter that matched nothing gets a sentence, not a button. The
                action appears only when there is genuinely nothing to write yet. */}
            {vault.notes.length === 0 ? (
              <div className={styles.listHead}>
                <NewNote person={person} />
              </div>
            ) : null}
          </Stack>
        ) : null}
      </div>

      {editorNote ? (
        <NoteEditor note={editorNote} people={people} />
      ) : (
        <div className={`scroll ${styles.editorCol}`}>
          <Text level="body" tone="muted">
            {EMPTY.notes.none}
          </Text>
        </div>
      )}
    </div>
  );
}
