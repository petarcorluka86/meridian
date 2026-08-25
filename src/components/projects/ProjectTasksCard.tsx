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
  type TaskView,
  TaskRow,
  Text,
  TextInput,
} from '@/components/ui';
import styles from './Projects.module.css';

/**
 * The project's tasks, and a way to add one without leaving the project.
 *
 * A title and nothing else. Every other field a task has — priority, a date, who
 * it is for — is one press away in the row's own dialog, and asking for four
 * things to write down "chase the vendor" is how a thought gets lost on the way
 * to being typed. The project is the page, so that field is not asked for at
 * all: it is the one thing this form already knows.
 */
export function ProjectTasksCard({
  id,
  tasks,
  people,
  projects,
  openTasks,
}: {
  id: string;
  tasks: TaskView[];
  people: { slug: string; name: string }[];
  projects: { id: string; title: string }[];
  openTasks: number;
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
        title="Tasks"
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
        <EmptyState glyph={NAV_GLYPH.tasks} {...EMPTY.project.tasks} />
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
