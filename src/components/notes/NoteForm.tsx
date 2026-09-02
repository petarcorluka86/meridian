'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteNoteAction, writeNoteAction } from '@/app/notes/actions';
import { renderMarkdown } from '@/lib/markdown';
import { notePath, noteTitleSlug, slugifyTitle } from '@/lib/vault/note-path';
import type { NoteCategory } from '@/lib/vault/schemas';
import { Confirm } from '@/components/Confirm';
import { MarkdownEditor } from './MarkdownEditor';
import { NoteMeta } from './NoteMeta';
import {
  AddIcon,
  Banner,
  Button,
  Card,
  CardBody,
  CardHeader,
  CheckIcon,
  PrevIcon,
  Prose,
  Row,
  Spacer,
  Stack,
  Text,
  TextInput,
} from '@/components/ui';
import styles from './Note.module.css';

/**
 * A note as the page holds it. `path` is null for one that does not exist yet,
 * and that single field is the whole difference between creating and editing —
 * everything below reads it and nothing else branches on the two cases.
 */
export type FormNote = {
  path: string | null;
  title: string;
  body: string;
  date: string;
  personSlug: string | null;
  project: string | null;
  category: NoteCategory;
  draft: boolean;
  pinned: boolean;
};

type Props = {
  note: FormNote;
  people: { slug: string; name: string }[];
  projects: { id: string; title: string }[];
};

type Ask = 'discard' | 'delete';

/**
 * Writing a note, on a page of its own.
 *
 * Two things about it are decisions rather than layout.
 *
 * **Nothing is written until Save.** The list screen's pane writes on every
 * control, which is right there — one change, made deliberately, on a note you
 * are looking at. Here you sit and change the person, the date, the category and
 * six paragraphs before any of it is meant, and a Cancel that had already
 * applied three of them would not be a cancel. So the whole note goes in one
 * call, and leaving with changes asks first.
 *
 * **The path is the one it will have, not the one it has.** Moving between
 * folders and renaming by date are both visible on disk, and this is where they
 * are decided — so the bar shows where the file lands if you press Save, which
 * for a new note is a path that does not exist yet.
 */
export function NoteForm({ note, people, projects }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [person, setPerson] = useState(note.personSlug ?? '');
  const [project, setProject] = useState(note.project ?? '');
  const [category, setCategory] = useState<NoteCategory>(note.category);
  const [date, setDate] = useState(note.date);
  const [draft, setDraft] = useState(note.draft);
  const [pinned, setPinned] = useState(note.pinned);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isNew = note.path === null;

  // Derived rather than a flag each setter has to remember: typing a word and
  // deleting it again leaves the note exactly as it was, and a page that then
  // asks about discarding changes is asking about nothing.
  const dirty =
    title !== note.title ||
    body !== note.body ||
    person !== (note.personSlug ?? '') ||
    project !== (note.project ?? '') ||
    category !== note.category ||
    date !== note.date ||
    draft !== note.draft ||
    pinned !== note.pinned;

  const where = notePath({
    date,
    titleSlug: note.path ? noteTitleSlug(note.path, note.title) : slugifyTitle(title),
    personSlug: person || null,
    location: person ? 'person' : 'general',
  });

  // The same pipeline the read pane uses, so the preview is the note rather than
  // an approximation of it — and sanitised, since it is the same sanitiser.
  const html = useMemo(() => renderMarkdown(body), [body]);

  const back = note.path ? `/notes?note=${encodeURIComponent(note.path)}` : '/notes';

  const save = () => {
    if (!title.trim() || pending) return;
    startTransition(async () => {
      const result = await writeNoteAction(note.path, {
        title,
        body,
        category,
        personSlug: person || null,
        project: project || null,
        draft,
        pinned,
        date,
      });
      if (result.ok) {
        router.push(`/notes?note=${encodeURIComponent(result.path)}`);
      } else {
        setError(result.message);
      }
    });
  };

  const leave = () => {
    if (dirty) {
      setAsk('discard');
      return;
    }
    router.push(back);
  };

  const remove = () =>
    startTransition(async () => {
      const result = await deleteNoteAction(note.path!);
      setAsk(null);
      if (result.ok) router.push('/notes');
      else setError(result.message);
    });

  /**
   * The keys somebody editing a Markdown file already has in their hands, shared
   * by the title field and the body.
   *
   * Tab indents rather than leaving the field, which is the one thing here that
   * costs something: a keyboard user cannot leave the textarea with Tab any
   * more. Shift+Tab still does, and Escape leaves the page altogether — without
   * both of those this would be a trap rather than an editor.
   */
  const keys = (event: React.KeyboardEvent<HTMLElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      save();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      leave();
    }
  };

  const bodyKeys = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    keys(event);
    if (event.defaultPrevented || event.key !== 'Tab' || event.shiftKey) return;

    event.preventDefault();
    const field = event.currentTarget;

    // `insertText` rather than setting the value ourselves: it leaves the caret
    // where the browser would leave it and keeps the native undo stack, so ⌘Z
    // still walks back through what was typed. Writing the string by hand
    // restores the caret a frame late — fast enough for a person, wrong for
    // anything typed immediately after — and throws the undo history away.
    if (document.execCommand('insertText', false, '  ')) return;

    const from = field.selectionStart;
    const to = field.selectionEnd;
    setBody(`${body.slice(0, from)}  ${body.slice(to)}`);
    requestAnimationFrame(() => field.setSelectionRange(from + 2, from + 2));
  };

  const state: { label: string; tone: 'muted' | 'warning' } = dirty
    ? { label: 'unsaved changes', tone: 'warning' }
    : { label: isNew ? 'new note' : 'no changes', tone: 'muted' };

  return (
    <div className={styles.screen} data-screen>
      {/* The reading pane's header, with one control added: the way back. Two
          screens showing a note must not show its facts two different ways, so
          the card below is literally the same component; this row differs only
          where it has to — a note being written has a Save rather than a way
          into an editor it is already in. */}
      <Stack gap={4}>
        {/* Centred, unlike the reading pane's: there the row is a line of type
              beside one control and the type has to sit on the same baseline as
              the card below. Here the row is controls at both ends, and a
              control hanging low beside another is just crooked. */}
        <Row gap={3}>
          <Button icon={<PrevIcon />} onClick={leave}>
            Notes
          </Button>
          <Text level="mono" tone="muted" truncate>
            {where}
          </Text>
          <Spacer />
          <Text level="small" tone={state.tone} nowrap>
            {state.label}
          </Text>
          <Button
            variant="primary"
            onClick={save}
            pending={pending}
            disabled={!title.trim()}
            icon={isNew ? <AddIcon /> : <CheckIcon />}
          >
            {isNew ? 'Create note' : 'Save'}
          </Button>
        </Row>

        <NoteMeta
          personSlug={person || null}
          category={category}
          project={project || null}
          date={date}
          draft={draft}
          pinned={pinned}
          people={people}
          projects={projects}
          onPerson={(slug) => setPerson(slug ?? '')}
          onCategory={setCategory}
          onProject={(id) => setProject(id ?? '')}
          onDate={setDate}
          onDraft={setDraft}
          onPinned={setPinned}
          onDelete={isNew ? undefined : () => setAsk('delete')}
        />

        {error ? <Banner tone="danger" description={error} /> : null}

        {/* Half each, and the same card twice: what is typed and what it comes
          out as, side by side at the same width, so the eye can carry a line
          across. Neither scrolls on its own — the page does, once. */}
        <div className={styles.panes}>
          <Card>
            <CardHeader title="Markdown" />
            <CardBody roomy>
              <Stack gap={3}>
                <TextInput
                  bare
                  heading
                  value={title}
                  onChange={setTitle}
                  onKeyDown={keys}
                  placeholder="Note title"
                  ariaLabel="Note title"
                  autoFocus={isNew}
                />
                <MarkdownEditor
                  value={body}
                  onChange={setBody}
                  onKeyDown={bodyKeys}
                  placeholder="Write the note. Headings, **bold** and - bullets all render on the right."
                  ariaLabel="Note body"
                />
              </Stack>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Preview" />
            <CardBody roomy>
              <Stack gap={3}>
                <Text as="h2" level="heading" tone={title.trim() ? undefined : 'faint'}>
                  {title.trim() || 'Untitled note'}
                </Text>
                {body.trim() ? (
                  <Prose html={html} />
                ) : (
                  <Text level="body" tone="muted">
                    Nothing written yet — the preview fills in as you type.
                  </Text>
                )}
              </Stack>
            </CardBody>
          </Card>
        </div>
      </Stack>

      <Confirm
        open={ask === 'discard'}
        title="Discard changes?"
        body={
          isNew
            ? 'Nothing has been written to the vault yet, so leaving now writes nothing at all.'
            : `Nothing has been written to ${note.path} yet. Leaving now leaves the note exactly as it is on disk.`
        }
        action="Discard"
        onCancel={() => setAsk(null)}
        onConfirm={() => router.push(back)}
      />

      <Confirm
        open={ask === 'delete'}
        title="Delete this note?"
        body={`“${note.title}” is removed from ${note.path}. A snapshot is taken first, so npm run vault:restore can bring it back — nothing in the app can.`}
        action="Delete note"
        pending={pending}
        onCancel={() => setAsk(null)}
        onConfirm={remove}
      />
    </div>
  );
}
