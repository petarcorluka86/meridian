'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toggleTaskAction } from '@/app/tasks/actions';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { CardRow } from './Card';
import { EditIcon } from './icons';
import { Checkbox } from './Input';
import { Pill, type PillTone } from './Pill';
import { Rail, type Priority } from './Rail';
import { TaskDialog, type TaskPerson } from './TaskDialog';
import { Text } from './Text';
import { TextLink } from './TextLink';
import styles from './TaskRow.module.css';

export type TaskView = {
  id: string;
  title: string;
  done: boolean;
  priority: Priority;
  dueDate: string | null;
  /**
   * Worked out on the server and passed down. Computing "3 days late" in the
   * browser means the client's clock decides it — which disagrees with the
   * server's across midnight, and React calls that a hydration mismatch.
   */
  dueLabel: string | null;
  dueTone: 'late' | 'today' | 'upcoming' | 'none' | 'done';
  personName: string | null;
  personSlug: string | null;
  /** Resolved on the server — a client component cannot read the vault. */
  personPhoto: string | null;
  kind: 'task' | 'waiting';
};

const DUE_TONE: Record<TaskView['dueTone'], PillTone> = {
  late: 'danger',
  today: 'info',
  upcoming: 'neutral',
  none: 'neutral',
  done: 'neutral',
};

/**
 * A task, wherever you meet it: Overview, Tasks and a person's page all render
 * this. Assembled entirely from primitives — the rail, the checkbox, the pill,
 * the avatar and the row are the shared ones, not copies of them.
 *
 * The pencil opens `TaskDialog`, which is where a task is changed or deleted. It
 * needs the roster for its Who field, so a screen that renders rows passes
 * `people`; without it the pencil is not drawn, because an edit dialog that
 * cannot say who a task belongs to would silently drop that field.
 */
export function TaskRow({
  task,
  people,
  showDue = true,
}: {
  task: TaskView;
  people?: readonly TaskPerson[];
  showDue?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  const toggle = () =>
    startTransition(async () => {
      await toggleTaskAction(task.id, !task.done);
      router.refresh();
    });

  return (
    <CardRow pending={pending}>
      <Rail priority={task.priority} done={task.done} />
      <Checkbox
        checked={task.done}
        onToggle={toggle}
        ariaLabel={task.done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
      />
      <span className={styles.title}>
        <Text level="body" tone={task.done ? 'faint' : 'strong'}>
          {task.title}
        </Text>
      </span>
      {task.kind === 'waiting' ? <Pill tone="warning">waiting</Pill> : null}
      {task.personName && task.personSlug ? (
        <TextLink href={`/people/${task.personSlug}`}>
          <Text level="small" tone="inherit">
            {task.personName}
          </Text>
          <Avatar name={task.personName} photo={task.personPhoto} size="sm" />
        </TextLink>
      ) : task.personName ? (
        // A task can name somebody who is not on the roster. There is nowhere to
        // send you, so it stays text.
        <>
          <Text level="small" tone="muted">
            {task.personName}
          </Text>
          <Avatar name={task.personName} photo={task.personPhoto} size="sm" />
        </>
      ) : null}
      {/* No date, no pill: it is most of the list, and a grey "no date" on every
          row that is merely not urgent says nothing. */}
      {showDue && task.dueLabel ? <Pill tone={DUE_TONE[task.dueTone]}>{task.dueLabel}</Pill> : null}
      {people ? (
        <Button
          iconOnly
          size="sm"
          variant="ghost"
          icon={<EditIcon />}
          onClick={() => setEditing(true)}
          ariaLabel={`Edit "${task.title}"`}
        />
      ) : null}
      {editing && people ? (
        <TaskDialog task={task} people={people} onClose={() => setEditing(false)} />
      ) : null}
    </CardRow>
  );
}
