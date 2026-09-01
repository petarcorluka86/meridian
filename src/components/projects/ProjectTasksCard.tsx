'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { captureTaskAction } from '@/app/actions';
import { NAV_GLYPH } from '@/components/NavIcons';
import { EMPTY } from '@/copy/empty';
import {
  AddIcon,
  Button,
  Card,
  CardFooter,
  CardHeader,
  EmptyState,
  type TaskProject,
  TaskRow,
  type TaskView,
  Text,
  TextInput,
} from '@/components/ui';
import styles from './Projects.module.css';

/**
 * The project's unfiled tasks — the ones under no phase — and a way to add one
 * without leaving the project. A task that has a phase is not here: it sits
 * under that phase in the Phases card, where its position says what a chip
 * would have.
 *
 * A title and nothing else. Every other field a task has — priority, a date, who
 * it is for — is one press away in the row's own dialog, and asking for four
 * things to write down "chase the vendor" is how a thought gets lost on the way
 * to being typed. The project is the page, so that field is not asked for at
 * all: it is the one thing this form already knows. The phase is not asked for
 * either — a capture starts unfiled, and filing it is the dialog's job.
 */
export function ProjectTasksCard({
  id,
  tasks,
  people,
  projects,
  openTasks,
  totalTasks,
}: {
  id: string;
  tasks: TaskView[];
  people: { slug: string; name: string }[];
  projects: TaskProject[];
  openTasks: number;
  /** The whole project's count, phased ones included — it decides which emptiness this is. */
  totalTasks: number;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const add = () => {
    if (!title.trim() || pending) return;
    startTransition(async () => {
      const result = await captureTaskAction({
        title,
        priority: 'normal',
        dueDate: null,
        personSlug: null,
        projectId: id,
      });
      if (result.ok) {
        setTitle('');
        setError(null);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <Card>
      <CardHeader
        title="Uncategorized tasks"
        count={openTasks || undefined}
        end={
          <Button
            size="sm"
            icon={adding ? undefined : <AddIcon />}
            onClick={() => setAdding((open) => !open)}
          >
            {adding ? 'Cancel' : 'Add task'}
          </Button>
        }
      />

      {tasks.map((task) => (
        // The project is the page, so every row would carry the same chip. It is
        // the one place the chip is noise.
        <TaskRow
          key={task.id}
          task={task}
          people={people}
          projects={projects}
          showProject={false}
        />
      ))}

      {tasks.length === 0 && !adding ? (
        <EmptyState
          glyph={NAV_GLYPH.tasks}
          {...(totalTasks > 0 ? EMPTY.project.allFiled : EMPTY.project.tasks)}
        />
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
              placeholder="What needs doing?"
              ariaLabel="New task on this project"
            />
          </span>
          <Button variant="primary" onClick={add} pending={pending} icon={<AddIcon />}>
            Add
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
