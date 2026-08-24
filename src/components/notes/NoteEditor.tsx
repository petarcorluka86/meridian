'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { moveNoteAction, saveNoteAction, setMetaAction } from '@/app/notes/actions';
import type { NoteCategory } from '@/lib/vault/schemas';
import { NAV_GLYPH } from '@/components/NavIcons';
import {
  Banner,
  Button,
  Card,
  CardBody,
  CardRow,
  CATEGORIES,
  CheckIcon,
  DateInput,
  EditIcon,
  Icon,
  PinIcon,
  Prose,
  Row,
  Select,
  Spacer,
  Stack,
  Text,
  Textarea,
  TextInput,
  Toggle,
} from '@/components/ui';
import styles from './Notes.module.css';

const PersonIcon = () => (
  <Icon tone="muted" size="lg">
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" />
  </Icon>
);

const FolderIcon = () => (
  <Icon tone="muted" size="lg">
    <path d="M4 7.5A2.5 2.5 0 016.5 5h3l2 2.5h6A2.5 2.5 0 0120 10v7a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
  </Icon>
);

const CalendarIcon = () => (
  <Icon tone="muted" size="lg">
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 10h17M8 3.5v3M16 3.5v3" />
  </Icon>
);

/* The sidebar's Projects mark, so a note's project is recognisable as the same
   thing the nav points at rather than a fourth shape in this row. */
const ProjectIcon = () => (
  <Icon tone="muted" size="lg">
    {NAV_GLYPH.projects}
  </Icon>
);

export type EditorNote = {
  path: string;
  title: string;
  body: string;
  html: string;
  date: string;
  personSlug: string | null;
  project: string | null;
  category: NoteCategory;
  draft: boolean;
  pinned: boolean;
};

type Props = {
  note: EditorNote;
  people: { slug: string; name: string }[];
  projects: { id: string; title: string }[];
};

export function NoteEditor({ note, people, projects }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [saveState, setSaveState] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Selecting a different note in the list re-renders this component in place.
  // biome-ignore lint/correctness/useExhaustiveDependencies: path is the note's identity — two notes with the same title and body must still reset the editor
  useEffect(() => {
    setEditing(false);
    setTitle(note.title);
    setBody(note.body);
    setError(null);
    setSaveState('');
  }, [note.path, note.title, note.body]);

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

  const save = () =>
    run(async () => {
      const result = await saveNoteAction(note.path, title, body);
      if (result.ok) setEditing(false);
      return result;
    }, 'Saved');

  return (
    <div className={`scroll ${styles.editorCol}`}>
      <div className={styles.column}>
        <Stack gap={4}>
          <Row gap={3}>
            <Text level="mono" tone="muted">
              {note.path}
            </Text>
            <Spacer />
            {saveState ? (
              <Text level="small" tone="success">
                {saveState}
              </Text>
            ) : null}
            <Toggle
              checked={note.draft}
              onChange={(checked) =>
                run(() => setMetaAction(note.path, { draft: checked }), 'Saved')
              }
              label="Draft"
            />
            <Button
              size="sm"
              onClick={() => run(() => setMetaAction(note.path, { pinned: !note.pinned }), 'Saved')}
              icon={<PinIcon />}
              disabled={pending}
              ariaPressed={note.pinned}
            >
              {note.pinned ? 'Pinned' : 'Pin'}
            </Button>
            {editing ? (
              <>
                <Button onClick={() => setEditing(false)}>Cancel</Button>
                <Button variant="primary" onClick={save} pending={pending} icon={<CheckIcon />}>
                  Save
                </Button>
              </>
            ) : (
              <Button variant="primary" onClick={() => setEditing(true)} icon={<EditIcon />}>
                Edit
              </Button>
            )}
          </Row>

          <Card>
            <CardRow>
              <PersonIcon />
              <Select
                size="sm"
                value={note.personSlug ?? ''}
                onChange={(value) =>
                  run(() => moveNoteAction(note.path, { personSlug: value || null }), 'Moved')
                }
                ariaLabel="Person"
                disabled={pending}
                options={[
                  { value: '', label: 'Not about a person' },
                  ...people.map((p) => ({ value: p.slug, label: p.name })),
                ]}
              />
              <FolderIcon />
              <Select
                size="sm"
                value={note.category}
                onChange={(value) =>
                  run(() => setMetaAction(note.path, { category: value as NoteCategory }), 'Saved')
                }
                ariaLabel="Category"
                disabled={pending}
                options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
              />
              <ProjectIcon />
              <Select
                size="sm"
                value={note.project ?? ''}
                onChange={(value) =>
                  run(() => setMetaAction(note.path, { project: value || null }), 'Saved')
                }
                ariaLabel="Project"
                disabled={pending}
                options={[
                  { value: '', label: 'No project' },
                  ...projects.map((p) => ({ value: p.id, label: p.title })),
                ]}
              />
              <CalendarIcon />
              <DateInput
                size="sm"
                value={note.date}
                onChange={(value) =>
                  run(() => moveNoteAction(note.path, { date: value }), 'Renamed')
                }
                ariaLabel="Date"
              />
            </CardRow>
          </Card>

          {editing ? (
            <Card>
              <CardRow>
                <TextInput
                  bare
                  heading
                  value={title}
                  onChange={setTitle}
                  placeholder="Note title"
                  ariaLabel="Note title"
                />
              </CardRow>
              <Textarea mono bare value={body} onChange={setBody} ariaLabel="Note body" />
            </Card>
          ) : (
            <Card>
              <CardBody>
                <Stack gap={3}>
                  <Text as="h2" level="heading">
                    {note.title}
                  </Text>
                  {note.html.trim() ? (
                    <Prose html={note.html} />
                  ) : (
                    <Text level="body" tone="muted">
                      Empty note. Start typing.
                    </Text>
                  )}
                </Stack>
              </CardBody>
            </Card>
          )}

          {error ? <Banner tone="danger" description={error} /> : null}
        </Stack>
      </div>
    </div>
  );
}
