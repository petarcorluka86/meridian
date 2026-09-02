'use client';

import type { NoteCategory } from '@/lib/vault/schemas';
import { NAV_GLYPH } from '@/components/NavIcons';
import {
  Button,
  Card,
  CardRow,
  CATEGORIES,
  DateInput,
  Icon,
  Select,
  Toggle,
} from '@/components/ui';
import styles from './NoteMeta.module.css';

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

export type NoteMetaValues = {
  personSlug: string | null;
  category: NoteCategory;
  project: string | null;
  date: string;
  draft: boolean;
  pinned: boolean;
};

type Props = NoteMetaValues & {
  people: { slug: string; name: string }[];
  projects: { id: string; title: string }[];
  disabled?: boolean;
  onPerson: (slug: string | null) => void;
  onCategory: (category: NoteCategory) => void;
  onProject: (id: string | null) => void;
  onDate: (date: string) => void;
  onDraft: (draft: boolean) => void;
  onPinned: (pinned: boolean) => void;
  /** Absent for a note that does not exist yet: there is nothing to delete. */
  onDelete?: () => void;
};

/**
 * Every fact about a note that is not the note: who it is about, what kind it
 * is, which project it belongs to, when it happened, and the two states the list
 * shows as a pill.
 *
 * One component for both screens, and that is the point of it — the reading pane
 * and the note page show the same card because it *is* the same card, rather
 * than two that were drawn to match and will drift the first time one of them is
 * touched. What differs is only what the handlers do: the pane writes each
 * change the moment it moves, the page stages them until Save.
 *
 * Draft and Pinned are both switches because both are states rather than
 * actions. Delete is last and is the only thing here that is not a fact about
 * the note — it asks before it deletes, so a misclick costs a dismissed dialog.
 */
export function NoteMeta({
  personSlug,
  category,
  project,
  date,
  draft,
  pinned,
  people,
  projects,
  disabled,
  onPerson,
  onCategory,
  onProject,
  onDate,
  onDraft,
  onPinned,
  onDelete,
}: Props) {
  return (
    <Card>
      <CardRow wrap>
        <PersonIcon />
        <Select
          size="sm"
          value={personSlug ?? ''}
          onChange={(value) => onPerson(value || null)}
          ariaLabel="Person"
          disabled={disabled}
          options={[
            { value: '', label: 'Not about a person' },
            ...people.map((p) => ({ value: p.slug, label: p.name })),
          ]}
        />
        <FolderIcon />
        <Select
          size="sm"
          value={category}
          onChange={(value) => onCategory(value as NoteCategory)}
          ariaLabel="Category"
          disabled={disabled}
          options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
        />
        <ProjectIcon />
        <Select
          size="sm"
          value={project ?? ''}
          onChange={(value) => onProject(value || null)}
          ariaLabel="Project"
          disabled={disabled}
          options={[
            { value: '', label: 'No project' },
            ...projects.map((p) => ({ value: p.id, label: p.title })),
          ]}
        />
        <CalendarIcon />
        <DateInput size="sm" value={date} onChange={onDate} ariaLabel="Date" />

        {/* `margin-inline-start` on the group rather than a `Spacer`: the row
            wraps, and a spacer only pushes on the line it is on — so a window
            narrow enough to wrap would drop these to the left of the next line.
            This keeps them at the right edge on whichever line they land on. */}
        <div className={styles.actions}>
          <Toggle checked={draft} onChange={onDraft} label="Draft" />
          <Toggle checked={pinned} onChange={onPinned} label="Pinned" />
          {onDelete ? (
            <Button variant="danger" size="sm" onClick={onDelete} disabled={disabled}>
              Delete
            </Button>
          ) : null}
        </div>
      </CardRow>
    </Card>
  );
}
