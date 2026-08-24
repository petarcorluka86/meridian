'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  addPhaseAction,
  editPhaseAction,
  removePhaseAction,
  togglePhaseAction,
} from '@/app/projects/actions';
import type { Progress } from '@/lib/vault/projects';
import type { ProjectPhase } from '@/lib/vault/schemas';
import { EMPTY_GLYPH } from '@/components/EmptyGlyphs';
import { EMPTY } from '@/copy/empty';
import {
  AddIcon,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardRow,
  Checkbox,
  Dialog,
  EditIcon,
  EmptyState,
  Field,
  Meter,
  Pill,
  RemoveIcon,
  Spacer,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@/components/ui';
import styles from './Projects.module.css';

/**
 * The checkpoints, and the only place a project's progress is decided.
 *
 * A phase is ticked in the row, the way a task is — that is the action you come
 * to this card for, and putting it behind the pencil would make the common case
 * two clicks. The pencil is for the two things a row cannot hold: renaming the
 * phase, and writing down what has to be true for it to be done.
 *
 * The bar and the count are both drawn only when there are phases. A project
 * without them has nothing to be a fraction of, and an empty bar reading 0%
 * would claim it had made no progress rather than that it is not measured
 * this way.
 */
export function PhasesCard({
  id,
  phases,
  progress,
}: {
  id: string;
  phases: readonly ProjectPhase[];
  progress: Progress;
}) {
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [editing, setEditing] = useState<ProjectPhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  /*
   * Which row is in flight, not merely that one is. All five rows share this
   * component's transition, so dimming on `pending` dims the whole card when you
   * tick one phase — and then it is the click you cannot account for.
   */
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (work: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) =>
    startTransition(async () => {
      const result = await work();
      if (!result.ok) {
        setError(result.message ?? 'Could not save.');
        return;
      }
      setError(null);
      after?.();
      router.refresh();
    });

  const toggle = (phase: ProjectPhase) => {
    setBusy(phase.id);
    run(
      () => togglePhaseAction(id, phase.id, !phase.done),
      () => setBusy(null),
    );
  };

  const add = () => {
    if (!label.trim() || pending) return;
    run(
      () => addPhaseAction(id, label),
      () => setLabel(''),
    );
  };

  return (
    <Card>
      {/* No `count`: "2 of 5 done" beside it already carries the total, and a
          bare 5 next to it is the same number said twice. */}
      <CardHeader
        title="Phases"
        end={
          progress.total > 0 ? (
            <>
              <Text level="small" tone="muted">
                {progress.done} of {progress.total} done
              </Text>
              <Pill tone={progress.complete ? 'success' : 'info'}>{progress.percent}%</Pill>
            </>
          ) : undefined
        }
      />

      {progress.total > 0 ? (
        <CardBody>
          <Meter
            value={progress.done}
            total={progress.total}
            tone={progress.complete ? 'success' : 'accent'}
            label="Phases done"
          />
        </CardBody>
      ) : null}

      {phases.map((phase, index) => (
        <CardRow key={phase.id} pending={busy === phase.id}>
          <Text level="mono" tone="faint" numeric>
            {String(index + 1).padStart(2, '0')}
          </Text>
          <Checkbox
            checked={phase.done}
            onToggle={() => toggle(phase)}
            ariaLabel={
              phase.done ? `Mark "${phase.label}" as not done` : `Mark "${phase.label}" as done`
            }
          />
          <span className={styles.phase}>
            <Stack gap={1}>
              <Text level="body" tone={phase.done ? 'faint' : 'strong'} strike={phase.done}>
                {phase.label}
              </Text>
              {phase.note ? (
                <Text level="small" tone="muted">
                  {phase.note}
                </Text>
              ) : null}
            </Stack>
          </span>
          <Spacer />
          <Button
            iconOnly
            size="sm"
            variant="ghost"
            icon={<EditIcon />}
            onClick={() => setEditing(phase)}
            ariaLabel={`Edit "${phase.label}"`}
          />
        </CardRow>
      ))}

      {phases.length === 0 ? (
        <EmptyState glyph={EMPTY_GLYPH.phases} {...EMPTY.project.phases} />
      ) : null}

      {error ? (
        <CardRow tone="danger">
          <Text level="small" tone="danger">
            {error}
          </Text>
        </CardRow>
      ) : null}

      <CardFooter>
        <span className={styles.grow}>
          <TextInput
            value={label}
            onChange={setLabel}
            placeholder="Add a phase…"
            ariaLabel="Phase name"
            onKeyDown={(event) => {
              if (event.key === 'Enter') add();
            }}
          />
        </span>
        <Button variant="primary" onClick={add} pending={pending} icon={<AddIcon />}>
          Add phase
        </Button>
      </CardFooter>

      {editing ? (
        <PhaseDialog
          phase={editing}
          onClose={() => setEditing(null)}
          onSave={(input) =>
            run(
              () => editPhaseAction(id, editing.id, input),
              () => setEditing(null),
            )
          }
          onRemove={() =>
            run(
              () => removePhaseAction(id, editing.id),
              () => setEditing(null),
            )
          }
          pending={pending}
        />
      ) : null}
    </Card>
  );
}

/**
 * Renaming a phase, and writing down what has to be true for it to be done.
 *
 * Delete arms in place rather than opening a second dialog on top of this one,
 * exactly as `TaskDialog` does: two scrims deep, Escape closes both and it stops
 * being clear what is being asked.
 */
function PhaseDialog({
  phase,
  onClose,
  onSave,
  onRemove,
  pending,
}: {
  phase: ProjectPhase;
  onClose: () => void;
  onSave: (input: { label: string; note: string }) => void;
  onRemove: () => void;
  pending: boolean;
}) {
  const [label, setLabel] = useState(phase.label);
  const [note, setNote] = useState(phase.note);
  const [armed, setArmed] = useState(false);

  if (armed) {
    return (
      <Dialog
        open
        title="Delete this phase?"
        tone="danger"
        onClose={onClose}
        footer={
          <>
            <Button variant="neutral" onClick={() => setArmed(false)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={onRemove} pending={pending}>
              Delete
            </Button>
          </>
        }
      >
        <Text level="body" tone="muted">
          “{phase.label}” leaves this project, and the ones after it move up a number. Nothing else
          on the project changes.
        </Text>
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      title="Edit phase"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={() => setArmed(true)} icon={<RemoveIcon />}>
            Delete
          </Button>
          <Spacer />
          <Button variant="neutral" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => onSave({ label, note })} pending={pending}>
            Save
          </Button>
        </>
      }
    >
      <Stack gap={4}>
        <Field label="Name">
          <TextInput
            autoFocus
            value={label}
            onChange={setLabel}
            ariaLabel="Phase name"
            onKeyDown={(event) => {
              if (event.key === 'Enter') onSave({ label, note });
            }}
          />
        </Field>
        <Field label="Description">
          <Textarea
            value={note}
            onChange={setNote}
            rows={3}
            placeholder="What has to be true for this phase to be done?"
            ariaLabel="Phase description"
          />
        </Field>
      </Stack>
    </Dialog>
  );
}
