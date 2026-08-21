'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toggleTaskAction } from '@/app/tasks/actions';
import { Avatar } from './Avatar';
import { CardRow } from './Card';
import { Checkbox } from './Input';
import { Pill, type PillTone } from './Pill';
import { Rail, type Priority } from './Rail';
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
  dueLabel: string;
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
 */
export function TaskRow({ task, showDue = true }: { task: TaskView; showDue?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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
      {showDue ? <Pill tone={DUE_TONE[task.dueTone]}>{task.dueLabel}</Pill> : null}
    </CardRow>
  );
}
