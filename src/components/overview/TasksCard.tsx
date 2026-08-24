'use client';

import { useState } from 'react';
import { OVERVIEW_GLYPH, TasksIcon } from '@/components/overview/OverviewIcons';
import { EMPTY_GLYPH } from '@/components/EmptyGlyphs';
import { EMPTY } from '@/copy/empty';
import {
  ButtonLink,
  Card,
  CardHeader,
  CardToolbar,
  Chip,
  EmptyState,
  GoIcon,
  Row,
  TaskRow,
  type TaskView,
  Text,
} from '@/components/ui';

/**
 * Every open task, including the ones with no date and the ones you are waiting
 * on somebody else for — the Tasks screen filters those out, so this is where
 * they stay visible.
 *
 * The priority filter is this card's own state, not a URL parameter. A filter
 * that narrows one card on a dashboard is not worth a reload or a place in
 * history; a filter that narrows a whole screen is, and the Tasks screen keeps
 * its in the URL.
 *
 * The rows are the shared `TaskRow`, so a task can be ticked off here. It used
 * to draw its own lighter row on the argument that a dashboard is a glance — but
 * the first thing you want after reading "3 days late" is to say it is done, and
 * being sent to another screen to do it is what made the glance useless.
 */

type Prio = 'all' | 'urgent' | 'important' | 'normal';

const PRIORITIES: Prio[] = ['all', 'urgent', 'important', 'normal'];
const RANK = { urgent: 0, important: 1, normal: 2 } as const;

export function TasksCard({
  open,
  people,
  projects,
}: {
  open: TaskView[];
  people: readonly { slug: string; name: string }[];
  projects: readonly { id: string; title: string }[];
}) {
  const [prio, setPrio] = useState<Prio>('all');

  const countFor = (p: Prio) =>
    p === 'all' ? open.length : open.filter((task) => task.priority === p).length;

  const shown = open
    .filter((task) => prio === 'all' || task.priority === prio)
    .sort(
      (a, b) =>
        RANK[a.priority] - RANK[b.priority] ||
        // A date beats no date, and then the nearest date first.
        Number(a.dueDate === null) - Number(b.dueDate === null) ||
        (a.dueDate ?? '').localeCompare(b.dueDate ?? ''),
    );

  return (
    <Card>
      <CardHeader
        title={
          <Row gap={3}>
            <TasksIcon />
            <Text level="subheading">Tasks</Text>
          </Row>
        }
        end={
          <ButtonLink href="/tasks" size="sm" icon={<GoIcon />}>
            Open Tasks
          </ButtonLink>
        }
      />
      <CardToolbar>
        {PRIORITIES.map((p) => {
          const count = countFor(p);
          const label = p === 'all' ? 'All' : p[0]!.toUpperCase() + p.slice(1);
          return (
            <Chip key={p} size="sm" selected={prio === p} onClick={() => setPrio(p)}>
              {count > 0 ? `${label} (${count})` : label}
            </Chip>
          );
        })}
      </CardToolbar>
      {shown.map((task) => (
        <TaskRow key={task.id} task={task} people={people} projects={projects} />
      ))}
      {shown.length === 0 ? (
        // Nothing open at all reads differently from a filter that matched nothing.
        open.length > 0 ? (
          <EmptyState glyph={EMPTY_GLYPH.search} {...EMPTY.overview.tasksFiltered} />
        ) : (
          <EmptyState glyph={OVERVIEW_GLYPH.tasks} {...EMPTY.overview.tasks} />
        )
      ) : null}
    </Card>
  );
}
