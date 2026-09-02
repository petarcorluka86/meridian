'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteNoteAction, moveNoteAction, setMetaAction } from '@/app/notes/actions';
import type { NoteCategory } from '@/lib/vault/schemas';
import { Confirm } from '@/components/Confirm';
import { NoteMeta } from './NoteMeta';
import {
  Banner,
  ButtonLink,
  Card,
  CardBody,
  EditIcon,
  Prose,
  Row,
  Spacer,
  Stack,
  Text,
} from '@/components/ui';
import styles from './Notes.module.css';

export type PaneNote = {
  path: string;
  title: string;
  html: string;
  date: string;
  personSlug: string | null;
  project: string | null;
  category: NoteCategory;
  draft: boolean;
  pinned: boolean;
};

type Props = {
  note: PaneNote;
  people: { slug: string; name: string }[];
  projects: { id: string; title: string }[];
};

/**
 * The selected note, beside the list: what it says, and the handful of facts
 * about it that are one control each.
 *
 * It reads and it files; it does not write the note. Every control here takes
 * effect the moment it moves, which is right for a single deliberate change made
 * while looking at the note — and wrong for rewriting it, where four changes are
 * one thought and Cancel has to mean something. That is what the note page is,
 * and "Open in editor" is the way to it.
 */
export function NotePane({ note, people, projects }: Props) {
  const router = useRouter();
  const [saveState, setSaveState] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  // Selecting a different note in the list re-renders this component in place,
  // so "Saved" and a failed delete have to be cleared by hand.
  // biome-ignore lint/correctness/useExhaustiveDependencies: path is the note's identity, and the reset is what this effect is for — nothing in the body reads it
  useEffect(() => {
    setError(null);
    setSaveState('');
    setConfirming(false);
  }, [note.path]);

  const run = (
    fn: () => Promise<{ ok: boolean; path?: string; message?: string }>,
    label: string,
  ) =>
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        setError(null);
        setSaveState(label);
        // A move changes the note's identity, so the selection has to follow it.
        if (result.path && result.path !== note.path) {
          router.replace(`/notes?note=${encodeURIComponent(result.path)}`, { scroll: false });
        } else {
          router.refresh();
        }
      } else {
        setError(result.message ?? 'Could not save.');
        setSaveState('');
      }
    });

  /**
   * Deleting cannot go through `run`: that one keeps the selection on the note
   * it just wrote, and this note is gone. The list picks the next one.
   */
  const remove = () =>
    startTransition(async () => {
      const result = await deleteNoteAction(note.path);
      setConfirming(false);
      if (result.ok) {
        router.replace('/notes', { scroll: false });
        router.refresh();
      } else {
        setError(result.message ?? 'Could not delete it.');
      }
    });

  return (
    <div className={`scroll ${styles.readCol}`}>
      <Stack gap={4}>
        {/* Bottom-aligned, not centred: the path is a line of type beside a
            34px control, and centring it leaves the words floating higher above
            the card below than the button they sit next to. */}
        <Row gap={3} align="end">
          <Text level="mono" tone="muted">
            {note.path}
          </Text>
          <Spacer />
          {saveState ? (
            <Text level="small" tone="success">
              {saveState}
            </Text>
          ) : null}
          <ButtonLink
            variant="primary"
            href={`/notes/edit?note=${encodeURIComponent(note.path)}`}
            icon={<EditIcon />}
          >
            Open in editor
          </ButtonLink>
        </Row>

        <NoteMeta
          personSlug={note.personSlug}
          category={note.category}
          project={note.project}
          date={note.date}
          draft={note.draft}
          pinned={note.pinned}
          people={people}
          projects={projects}
          disabled={pending}
          onPerson={(slug) => run(() => moveNoteAction(note.path, { personSlug: slug }), 'Moved')}
          onCategory={(category) => run(() => setMetaAction(note.path, { category }), 'Saved')}
          onProject={(project) => run(() => setMetaAction(note.path, { project }), 'Saved')}
          onDate={(date) => run(() => moveNoteAction(note.path, { date }), 'Renamed')}
          onDraft={(draft) => run(() => setMetaAction(note.path, { draft }), 'Saved')}
          onPinned={(pinned) => run(() => setMetaAction(note.path, { pinned }), 'Saved')}
          onDelete={() => setConfirming(true)}
        />

        <div className={styles.noteCard}>
          <Card>
            <CardBody roomy>
              <Stack gap={3}>
                <Text as="h2" level="heading">
                  {note.title}
                </Text>
                {note.html.trim() ? (
                  <Prose html={note.html} />
                ) : (
                  <Text level="body" tone="muted">
                    Empty note. Open it in the editor and start typing.
                  </Text>
                )}
              </Stack>
            </CardBody>
          </Card>
        </div>

        {error ? <Banner tone="danger" description={error} /> : null}
      </Stack>

      <Confirm
        open={confirming}
        title="Delete this note?"
        body={`“${note.title}” is removed from ${note.path}. A snapshot is taken first, so npm run vault:restore can bring it back — nothing in the app can.`}
        action="Delete note"
        pending={pending}
        onCancel={() => setConfirming(false)}
        onConfirm={remove}
      />
    </div>
  );
}
