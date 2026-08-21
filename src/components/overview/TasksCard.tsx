'use client';

import { useState } from 'react';
import { OVERVIEW_GLYPH, TasksIcon } from '@/components/overview/OverviewIcons';
import { EMPTY_GLYPH } from '@/components/EmptyGlyphs';
import { EMPTY } from '@/copy/empty';
import {
  ButtonLink,
  Card,
  CardHeader,
  CardRow,
  CardToolbar,
  Chip,
  EmptyState,
  GoIcon,
  Rail,
  Row,
  Spacer,
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
 * Deliberately not the full `TaskRow`: this card is a glance, so it draws the
 * priority rail, the title and the due date and nothing else.
 */
export type OpenTask = {
  id: string;
  title: string;
  priority: 'urgent' | 'important' | 'normal';
  /** Sorted on. The date itself, so ordering needs no clock. */
  dueDate: string | null;
  /**
   * Worked out on the server and passed down. Computing "3 days late" here means
   * the browser's clock decides it, which disagrees with the server's across
   * midnight — and React calls that a hydration mismatch.
   */
  dueLabel: string;
  late: boolean;
};

type Prio = 'all' | 'urgent' | 'important' | 'normal';

const PRIORITIES: Prio[] = ['all', 'urgent', 'important', 'normal'];
const RANK = { urgent: 0, important: 1, normal: 2 } as const;

export function TasksCard({ open }: { open: OpenTask[] }) {
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
        <CardRow key={task.id}>
          <Rail priority={task.priority} />
          <Text level="body">{task.title}</Text>
          <Spacer />
          <Text level="small" tone={task.late ? 'danger' : 'info'}>
            {task.dueLabel}
          </Text>
        </CardRow>
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
