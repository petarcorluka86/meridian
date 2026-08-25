'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createNoteAction } from '@/app/notes/actions';
import { NAV_GLYPH } from '@/components/NavIcons';
import { EMPTY } from '@/copy/empty';
import {
  AddIcon,
  Card,
  CardFooter,
  CardHeader,
  CardRow,
  CategoryPill,
  categoryOf,
  Button,
  EmptyState,
  Pill,
  Spacer,
  Text,
  TextInput,
  TextLink,
} from '@/components/ui';
import type { NoteCategory } from '@/lib/vault/schemas';
import { shortDate } from '@/lib/dates';
import styles from './Projects.module.css';

export type ProjectNote = {
  path: string;
  title: string;
  date: string | null;
  draft: boolean;
  category: NoteCategory;
};

/**
 * The project's notes, and a way to start one that is already tagged with it.
 *
 * A note written here is about the project and about nobody in particular, so it
 * lands in `notes/general/` carrying `project: <id>`. Giving it a person later
 * moves the file into their folder and changes nothing about the tag — which is
 * the whole reason a project is front matter rather than a folder.
 *
 * It opens the note rather than staying here: a note is a thing you write, and
 * the row that would appear in this list is not where the writing happens.
 */
export function ProjectNotesCard({ id, notes }: { id: string; notes: ProjectNote[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const add = () => {
    if (!title.trim() || pending) return;
    startTransition(async () => {
      const result = await createNoteAction(title, null, id);
      if (result.ok) {
        setTitle('');
        setError(null);
        router.push(`/notes?note=${encodeURIComponent(result.path)}`);
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <Card>
      <CardHeader
        title="Notes"
        count={notes.length || undefined}
        end={
          <Button
            size="sm"
            icon={adding ? undefined : <AddIcon />}
            onClick={() => setAdding((open) => !open)}
          >
            {adding ? 'Cancel' : 'New note'}
          </Button>
        }
      />

      {notes.map((note) => (
        <CardRow key={note.path}>
          <Text level="mono" tone="muted">
            {note.date ? shortDate(note.date) : '—'}
          </Text>
          <TextLink href={`/notes?note=${encodeURIComponent(note.path)}`} truncate>
            {note.title}
          </TextLink>
          <Spacer />
          {note.draft ? <Pill tone="warning">Draft</Pill> : null}
          <CategoryPill category={note.category} label={categoryOf(note.category).label} />
        </CardRow>
      ))}

      {notes.length === 0 && !adding ? (
        <EmptyState glyph={NAV_GLYPH.notes} {...EMPTY.project.notes} />
      ) : null}

      {adding ? (
        <CardFooter>
          <span className={styles.grow}>
            <TextInput
              value={title}
              autoFocus
              onChange={setTitle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') add();
                if (event.key === 'Escape') setAdding(false);
              }}
              placeholder="What is it about?"
              ariaLabel="New note on this project"
            />
          </span>
          <Button variant="primary" onClick={add} pending={pending} icon={<AddIcon />}>
            Create
          </Button>
          {error ? (
            <Text level="small" tone="danger">
              {error}
            </Text>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  );
}
