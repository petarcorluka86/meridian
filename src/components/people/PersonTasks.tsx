'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addTaskAction } from '@/app/tasks/actions';
import { EMPTY_GLYPH } from '@/components/EmptyGlyphs';
import { NAV_GLYPH } from '@/components/NavIcons';
import { EMPTY } from '@/copy/empty';
import {
  AddIcon,
  Button,
  Card,
  CardFooter,
  CardHeader,
  Chip,
  EmptyState,
  Select,
  TaskRow,
  type TaskView,
  TextInput,
} from '@/components/ui';
import styles from './Person.module.css';

type Filter = 'open' | 'done' | 'all';
type Prio = 'all' | 'urgent' | 'important' | 'normal';

/**
 * A person's tasks, filtered in place. Adding one here links it to them —
 * which is the point of the card: you are already looking at the person.
 */
export function PersonTasks({
  slug,
  firstName,
  tasks,
}: {
  slug: string;
  firstName: string;
  tasks: TaskView[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('open');
  const [prio, setPrio] = useState<Prio>('all');
  const [title, setTitle] = useState('');
  const [pending, startTransition] = useTransition();

  const shown = tasks
    .filter((t) => (filter === 'all' ? true : filter === 'done' ? t.done : !t.done))
    .filter((t) => prio === 'all' || t.priority === prio);

  const add = () => {
    if (!title.trim() || pending) return;
    startTransition(async () => {
      await addTaskAction({ title, priority: 'normal', dueDate: null, personSlug: slug });
      setTitle('');
      router.refresh();
    });
  };

  const openCount = tasks.filter((t) => !t.done).length;

  return (
    <Card>
      <CardHeader
        title="Tasks"
        count={openCount || undefined}
        end={
          <>
            {(['open', 'done', 'all'] as const).map((f) => (
              <Chip key={f} size="sm" selected={filter === f} onClick={() => setFilter(f)}>
                {f[0]!.toUpperCase() + f.slice(1)}
              </Chip>
            ))}
            <Select
              size="sm"
              value={prio}
              onChange={(value) => setPrio(value as Prio)}
              ariaLabel="Priority"
              options={[
                { value: 'all', label: 'Any priority' },
                { value: 'urgent', label: 'Urgent' },
                { value: 'important', label: 'Important' },
                { value: 'normal', label: 'Normal' },
              ]}
            />
          </>
        }
      />

      {shown.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}

      {shown.length === 0 ? (
        filter === 'open' && prio === 'all' ? (
          <EmptyState glyph={NAV_GLYPH.tasks} {...EMPTY.person.tasks} />
        ) : (
          <EmptyState glyph={EMPTY_GLYPH.search} {...EMPTY.person.tasksFiltered} />
        )
      ) : null}

      <CardFooter>
        <span className={styles.grow}>
          <TextInput
            value={title}
            onChange={setTitle}
            onKeyDown={(event) => {
              if (event.key === 'Enter') add();
            }}
            placeholder={`Something for ${firstName}…`}
            ariaLabel={`Add a task for ${firstName}`}
          />
        </span>
        <Button variant="primary" onClick={add} pending={pending} icon={<AddIcon />}>
          Add task
        </Button>
      </CardFooter>
    </Card>
  );
}
