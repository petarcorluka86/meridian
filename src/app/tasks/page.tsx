import { getVault } from '@/lib/vault/index';
import { photoPath } from '@/lib/sources/cache';
import { daysBetween, dueLabel, dueTone, today } from '@/lib/dates';
import { AddTask } from '@/components/tasks/AddTask';
import { EMPTY_GLYPH } from '@/components/EmptyGlyphs';
import { NAV_GLYPH } from '@/components/NavIcons';
import { EMPTY } from '@/copy/empty';
import {
  Card,
  CardGroup,
  CardToolbar,
  ChipLink,
  Divider,
  EmptyState,
  Page,
  PageHeader,
  Stack,
  TaskRow,
  type TaskView,
  type Tone,
} from '@/components/ui';

type Filter = 'open' | 'done' | 'waiting';
type Prio = 'all' | 'urgent' | 'important' | 'normal';

const RANK = { urgent: 0, important: 1, normal: 2 } as const;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; prio?: string }>;
}) {
  const params = await searchParams;
  const filter = (
    ['open', 'done', 'waiting'].includes(params.show ?? '') ? params.show : 'open'
  ) as Filter;
  const prio = (
    ['all', 'urgent', 'important', 'normal'].includes(params.prio ?? '') ? params.prio : 'all'
  ) as Prio;

  const vault = getVault();
  const now = today();

  const people = vault.people.map((p) => ({ slug: p.slug, name: p.displayName }));
  const nameOf = (slug: string | null) =>
    slug ? (vault.peopleBySlug.get(slug)?.displayName ?? slug) : null;

  // "Open" means open work of your own. A task you are waiting on someone else
  // for is counted and filtered separately.
  const open = vault.tasks.filter((t) => t.status !== 'done' && t.kind === 'task');
  const doneCount = vault.tasks.filter((t) => t.status === 'done').length;

  const inFilter = (t: (typeof vault.tasks)[number]) => {
    if (filter === 'done') return t.status === 'done';
    if (filter === 'waiting') return t.status !== 'done' && t.kind === 'waiting';
    return t.status !== 'done' && t.kind === 'task';
  };

  const pool = vault.tasks.filter(inFilter);
  const matching = pool.filter((t) => prio === 'all' || t.priority === prio);

  const views: TaskView[] = matching
    .slice()
    .sort(
      (a, b) =>
        RANK[a.priority] - RANK[b.priority] ||
        Number(a.dueDate === null) - Number(b.dueDate === null) ||
        (a.dueDate ?? '').localeCompare(b.dueDate ?? ''),
    )
    .map((t) => ({
      id: t.id,
      title: t.title,
      done: t.status === 'done',
      priority: t.priority,
      dueDate: t.dueDate,
      dueLabel: dueLabel(t.dueDate, now),
      dueTone: dueTone(t.dueDate, t.status === 'done', now),
      personName: nameOf(t.personSlug),
      personSlug: t.personSlug,
      personPhoto: t.personSlug ? photoPath(t.personSlug) : null,
      kind: t.kind,
    }));

  // Grouped by when they are due, not one flat list ordered by date.
  type Group = { key: string; label: string; tone: Tone; rows: TaskView[] };
  const groups: Group[] = (
    [
      {
        key: 'late',
        label: 'Late',
        tone: 'danger',
        rows: views.filter((t) => t.dueDate && daysBetween(now, t.dueDate) < 0),
      },
      {
        key: 'today',
        label: 'Today',
        tone: 'info',
        rows: views.filter((t) => t.dueDate && daysBetween(now, t.dueDate) === 0),
      },
      {
        key: 'upcoming',
        label: 'Upcoming',
        tone: 'default',
        rows: views.filter((t) => t.dueDate && daysBetween(now, t.dueDate) > 0),
      },
      { key: 'someday', label: 'No date', tone: 'muted', rows: views.filter((t) => !t.dueDate) },
    ] satisfies Group[]
  ).filter((g) => g.rows.length > 0);

  const href = (next: { show?: Filter; prio?: Prio }) => {
    const p = new URLSearchParams();
    const show = next.show ?? filter;
    const pr = next.prio ?? prio;
    if (show !== 'open') p.set('show', show);
    if (pr !== 'all') p.set('prio', pr);
    const q = p.toString();
    return q ? `/tasks?${q}` : '/tasks';
  };

  // Counts follow the active Open/Waiting/Done filter — a count that ignores the
  // filter above it is a count of something the user cannot see.
  const countFor = (p: Prio) =>
    p === 'all' ? pool.length : pool.filter((t) => t.priority === p).length;
  const withCount = (label: string, n: number) => (n > 0 ? `${label} (${n})` : label);

  return (
    <Page width="narrow">
      <PageHeader title="Tasks" subtitle={`${open.length} open · ${doneCount} done`} />
      <Stack gap={4}>
        <AddTask people={people} />

        <Card>
          <CardToolbar>
            <ChipLink href={href({ show: 'open' })} selected={filter === 'open'}>
              Open
            </ChipLink>
            <ChipLink href={href({ show: 'done' })} selected={filter === 'done'}>
              Done
            </ChipLink>
            <Divider orientation="vertical" />
            {(['all', 'urgent', 'important', 'normal'] as const).map((p) => (
              <ChipLink key={p} href={href({ prio: p })} size="sm" selected={prio === p}>
                {withCount(p === 'all' ? 'All' : p[0]!.toUpperCase() + p.slice(1), countFor(p))}
              </ChipLink>
            ))}
          </CardToolbar>

          {groups.map((group) => (
            <div key={group.key}>
              <CardGroup label={group.label} tone={group.tone} count={group.rows.length} />
              {group.rows.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          ))}

          {views.length === 0 ? (
            vault.tasks.length === 0 ? (
              <EmptyState glyph={NAV_GLYPH.tasks} {...EMPTY.tasks.none} />
            ) : filter === 'open' && prio === 'all' ? (
              <EmptyState glyph={NAV_GLYPH.tasks} {...EMPTY.tasks.allDone} />
            ) : (
              <EmptyState glyph={EMPTY_GLYPH.search} {...EMPTY.tasks.filtered} />
            )
          ) : null}
        </Card>
      </Stack>
    </Page>
  );
}
