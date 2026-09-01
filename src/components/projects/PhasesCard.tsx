'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { captureTaskAction } from '@/app/actions';
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
  CollapseIcon,
  Dialog,
  EditIcon,
  EmptyState,
  ExpandIcon,
  Field,
  Meter,
  Pill,
  RemoveIcon,
  Spacer,
  Stack,
  type TaskPerson,
  type TaskProject,
  TaskRow,
  type TaskView,
  Text,
  Textarea,
  TextInput,
} from '@/components/ui';
import styles from './Projects.module.css';

const NO_TASKS: Progress = { total: 0, done: 0, percent: 0, complete: false };

/**
 * The checkpoints, laid out to the Claude Design canvas: one Phases card, and
 * inside its body a block per phase — a nested `Card`, because a bordered
 * surface is a Card and containment is what says a task belongs to its phase.
 *
 * Each block is a small copy of the project's own shape. A head row: the step
 * pill ("Phase 01 / 05"), the tick — a judgement made by hand, never derived
 * from the tasks — the label, the task fraction, a disclosure, the pencil.
 * Under it, edge to edge, the phase's own bar, counted from its tasks. Then
 * the tasks themselves as the shared `TaskRow`, and a footer that adds a task
 * already filed under this phase.
 *
 * The disclosure exists because a phase deep in a long project can hold ten
 * tasks; collapsed, the block is one line and the bar still says how far it
 * has got. A phase opens by default only while it is the work at hand — one
 * that is done, or has no tasks yet, starts collapsed, so the card opens on
 * what is actually in motion. The chevron overrides either way.
 *
 * A task with no phase is not here at all; it is in the Uncategorized tasks
 * card. A phase with no tasks draws no bar — an empty bar reading 0% would
 * claim no progress rather than "not measured this way" — and the same rule
 * holds for the summary bar over a project with no phases.
 */
export function PhasesCard({
  id,
  phases,
  progress,
  taskProgress,
  tasks,
  people,
  projects,
}: {
  id: string;
  phases: readonly ProjectPhase[];
  progress: Progress;
  /** By phase id. A phase with no tasks is `{ total: 0 }` and draws no bar. */
  taskProgress: Record<string, Progress>;
  /** By phase id, soonest due first. A done task keeps its place, struck through. */
  tasks: Record<string, TaskView[]>;
  people: readonly TaskPerson[];
  projects: readonly TaskProject[];
}) {
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [editing, setEditing] = useState<ProjectPhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  /*
   * Which phase is in flight, not merely that one is. Every checkbox shares this
   * component's transition, so disabling on `pending` alone would freeze all of
   * them when you tick one.
   */
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  /** Per phase, only where the chevron overrode the default. */
  const [disclosed, setDisclosed] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});

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

  const addTaskTo = (phase: ProjectPhase) => {
    const title = drafts[phase.id]?.trim();
    if (!title || pending) return;
    run(
      () =>
        captureTaskAction({
          title,
          priority: 'normal',
          dueDate: null,
          personSlug: null,
          projectId: id,
          phaseId: phase.id,
        }),
      () => setDrafts((d) => ({ ...d, [phase.id]: '' })),
    );
  };

  const pad = (n: number) => String(n).padStart(2, '0');

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

      {phases.length > 0 ? (
        <CardBody>
          <Stack gap={4}>
            <Meter
              value={progress.done}
              total={progress.total}
              tone={progress.complete ? 'success' : 'accent'}
              label="Phases done"
            />

            <Stack gap={3}>
              {phases.map((phase, index) => {
                const own = taskProgress[phase.id] ?? NO_TASKS;
                const rows = tasks[phase.id] ?? [];
                const open = disclosed[phase.id] ?? (rows.length > 0 && !phase.done);
                return (
                  <Card key={phase.id}>
                    <CardRow
                      tone={phase.done ? 'success' : undefined}
                      pending={busy === phase.id && pending}
                    >
                      <Pill tone={phase.done ? 'success' : 'neutral'}>
                        Phase {pad(index + 1)} / {pad(phases.length)}
                      </Pill>
                      <Checkbox
                        checked={phase.done}
                        onToggle={() => toggle(phase)}
                        ariaLabel={
                          phase.done
                            ? `Mark "${phase.label}" as not done`
                            : `Mark "${phase.label}" as done`
                        }
                      />
                      <span className={styles.phaseLabel}>
                        <Text
                          level="body"
                          tone={phase.done ? 'faint' : 'strong'}
                          strike={phase.done}
                        >
                          {phase.label}
                        </Text>
                      </span>
                      {/* Everything from here on is the right-hand group: the
                          fraction, the disclosure and the pencil sit against the
                          edge, whatever the label's length does on the left. */}
                      <Spacer />
                      <Text level="small" tone={own.total > 0 ? 'muted' : 'faint'} numeric nowrap>
                        {own.total > 0 ? `${own.done}/${own.total} tasks` : 'No tasks'}
                      </Text>
                      <Button
                        iconOnly
                        size="sm"
                        variant="ghost"
                        icon={open ? <CollapseIcon /> : <ExpandIcon />}
                        onClick={() => setDisclosed((d) => ({ ...d, [phase.id]: !open }))}
                        ariaLabel={open ? `Collapse "${phase.label}"` : `Expand "${phase.label}"`}
                      />
                      <Button
                        iconOnly
                        size="sm"
                        variant="ghost"
                        icon={<EditIcon />}
                        onClick={() => setEditing(phase)}
                        ariaLabel={`Edit "${phase.label}"`}
                      />
                    </CardRow>

                    {/* Edge to edge, a direct child of the card: this bar is the
                        block's own rule, not a figure inside a body. */}
                    {own.total > 0 ? (
                      <Meter
                        value={own.done}
                        total={own.total}
                        tone={own.complete ? 'success' : 'accent'}
                        label={`Tasks done on "${phase.label}"`}
                      />
                    ) : null}

                    {phase.note ? (
                      <CardBody>
                        <Text level="small" tone="muted">
                          {phase.note}
                        </Text>
                      </CardBody>
                    ) : null}

                    {open ? (
                      <>
                        {rows.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            people={people}
                            projects={projects}
                            showProject={false}
                          />
                        ))}
                        {rows.length === 0 ? (
                          <CardRow>
                            <Text level="small" tone="muted">
                              {EMPTY.project.phaseTasks.title}
                            </Text>
                          </CardRow>
                        ) : null}
                        <CardFooter>
                          <span className={styles.grow}>
                            <TextInput
                              value={drafts[phase.id] ?? ''}
                              onChange={(value) => setDrafts((d) => ({ ...d, [phase.id]: value }))}
                              placeholder="Add a task to this phase…"
                              ariaLabel={`New task on "${phase.label}"`}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') addTaskTo(phase);
                              }}
                            />
                          </span>
                          <Button
                            onClick={() => addTaskTo(phase)}
                            pending={pending}
                            icon={<AddIcon />}
                          >
                            Add
                          </Button>
                        </CardFooter>
                      </>
                    ) : null}
                  </Card>
                );
              })}
            </Stack>
          </Stack>
        </CardBody>
      ) : (
        <EmptyState glyph={EMPTY_GLYPH.phases} {...EMPTY.project.phases} />
      )}

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
          “{phase.label}” leaves this project. Its tasks stay on the project and lose only the phase
          — they move to Uncategorized tasks. Nothing else changes.
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
