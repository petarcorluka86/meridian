'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteTaskAction, editTaskAction } from '@/app/tasks/actions';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { DateInput, Field, Select, TextInput } from './Input';
import { Row, Spacer, Stack } from './Layout';
import { RemoveIcon } from './icons';
import type { Priority } from './Rail';
import type { TaskView } from './TaskRow';
import { Code, Text } from './Text';

export type TaskPerson = { slug: string; name: string };
export type TaskProject = { id: string; title: string };

const PRIORITIES = [
  { value: 'normal', label: 'Normal' },
  { value: 'important', label: 'Important' },
  { value: 'urgent', label: 'Urgent' },
];

const KINDS = [
  { value: 'task', label: 'Mine to do' },
  { value: 'waiting', label: 'Waiting on somebody' },
];

/**
 * Editing a task, and the only way to delete one.
 *
 * A dialog rather than an expanding row: the same row appears on Overview, on
 * Tasks and on a person's page, and none of the three has room for five fields
 * without pushing everything under it down the screen.
 *
 * Mounted only while it is open, so it starts from what is on disk every time
 * rather than from whatever was typed into it and abandoned.
 *
 * Deleting happens inside this dialog rather than in a second one on top of it:
 * two scrims deep, Escape closes both and it stops being clear what is being
 * asked. The Delete button arms itself instead — the body becomes the warning,
 * the footer becomes the choice.
 */
export function TaskDialog({
  task,
  people,
  projects,
  onClose,
}: {
  task: TaskView;
  people: readonly TaskPerson[];
  /** Absent means no Project field, and the task keeps the project it has. */
  projects?: readonly TaskProject[];
  onClose: () => void;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [kind, setKind] = useState<TaskView['kind']>(task.kind);
  const [due, setDue] = useState(task.dueDate ?? '');
  const [person, setPerson] = useState(task.personSlug ?? '');
  const [project, setProject] = useState(task.projectId ?? '');
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const run = async (work: () => Promise<{ ok: true } | { ok: false; message: string }>) => {
    if (pending) return;
    setPending(true);
    const result = await work();
    if (!result.ok) {
      setPending(false);
      setError(result.message);
      return;
    }
    onClose();
    router.refresh();
  };

  const save = () =>
    run(() =>
      editTaskAction(task.id, {
        title,
        priority,
        dueDate: due || null,
        personSlug: person || null,
        projectId: project || null,
        kind,
      }),
    );

  if (armed) {
    return (
      <Dialog
        open
        title="Delete this task?"
        tone="danger"
        onClose={onClose}
        footer={
          <>
            <Button variant="neutral" onClick={() => setArmed(false)}>
              Keep it
            </Button>
            {/* No glyph: `RemoveIcon` is always the danger tone, which is what a
                danger button is already made of. `Confirm` carries none either. */}
            <Button
              variant="danger"
              onClick={() => run(() => deleteTaskAction(task.id))}
              pending={pending}
            >
              Delete
            </Button>
          </>
        }
      >
        <Stack gap={2}>
          <Text level="body" tone="muted">
            “{task.title}” leaves tasks.json. A snapshot is taken before every write, so{' '}
            <Code>npm run vault:restore</Code> can bring it back — nothing in the app can.
          </Text>
          {error ? (
            <Text level="small" tone="danger">
              {error}
            </Text>
          ) : null}
        </Stack>
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      title="Edit task"
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
          <Button variant="primary" onClick={save} pending={pending}>
            Save
          </Button>
        </>
      }
    >
      <Stack gap={4}>
        <Field label="Title">
          <TextInput
            autoFocus
            value={title}
            onChange={setTitle}
            ariaLabel="Task title"
            onKeyDown={(event) => {
              if (event.key === 'Enter') save();
            }}
          />
        </Field>
        <Field label="Priority">
          <Select
            options={PRIORITIES}
            value={priority}
            onChange={(value) => setPriority(value as Priority)}
          />
        </Field>
        {/* The clear button sits beside the label rather than inside it: a
            `Field` is a `label`, and a button inside one is not a control the
            label can name. */}
        <Row gap={2} align="end">
          <Field label="Due">
            <DateInput value={due} onChange={setDue} ariaLabel="Due date" />
          </Field>
          {due ? <Button onClick={() => setDue('')}>No date</Button> : null}
        </Row>
        <Field label="Who">
          <Select
            options={[
              { value: '', label: 'Nobody' },
              ...people.map((p) => ({ value: p.slug, label: p.name })),
            ]}
            value={person}
            onChange={setPerson}
          />
        </Field>
        {projects ? (
          <Field label="Project">
            <Select
              options={[
                { value: '', label: 'No project' },
                ...projects.map((p) => ({ value: p.id, label: p.title })),
              ]}
              value={project}
              onChange={setProject}
            />
          </Field>
        ) : null}
        <Field label="Kind">
          <Select
            options={KINDS}
            value={kind}
            onChange={(value) => setKind(value as TaskView['kind'])}
          />
        </Field>
        {error ? (
          <Text level="small" tone="danger">
            {error}
          </Text>
        ) : null}
      </Stack>
    </Dialog>
  );
}
