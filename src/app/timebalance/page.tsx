import { allTimeEntries, formatHours, sumHours } from '@/lib/vault/time';
import { parseIso, today, toIso } from '@/lib/dates';
import { EntryRow, LogEntry, type EntryView } from '@/components/timebalance/TimeLog';
import { CustomRange } from '@/components/timebalance/CustomRange';
import { EMPTY } from '@/copy/empty';
import {
  Card,
  CardBody,
  ChipLink,
  EmptyState,
  Page,
  PageHeader,
  Row,
  Spacer,
  Stack,
  Stat,
  Text,
  type Tone,
} from '@/components/ui';
import styles from '@/components/timebalance/Time.module.css';

type Range = 'all' | 'week' | 'month' | 'custom';

/** Monday-start week containing `iso`. */
function weekBounds(iso: string): [string, string] {
  const d = parseIso(iso);
  const offset = (d.getDay() + 6) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - offset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return [toIso(start), toIso(end)];
}

/** Owed either way is the same four tones as everything else. */
const toneOf = (n: number): Tone => (n >= 0 ? 'success' : 'danger');

export default async function TimebalancePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const range = (
    ['all', 'week', 'month', 'custom'].includes(params.range ?? '') ? params.range : 'all'
  ) as Range;

  const now = today();
  const entries = allTimeEntries();
  const [weekStart, weekEnd] = weekBounds(now);
  const monthPrefix = now.slice(0, 7);

  // The total is always the truth of where you stand — a range narrows the log
  // below, never the headline figure.
  const total = sumHours(entries);
  const week = sumHours(entries.filter((e) => e.date >= weekStart && e.date <= weekEnd));
  const month = sumHours(entries.filter((e) => e.date.startsWith(monthPrefix)));

  const inRange = (date: string) => {
    if (range === 'week') return date >= weekStart && date <= weekEnd;
    if (range === 'month') return date.startsWith(monthPrefix);
    if (range === 'custom') {
      if (params.from && date < params.from) return false;
      if (params.to && date > params.to) return false;
      return true;
    }
    return true;
  };

  const shown = entries.filter((e) => inRange(e.date));

  const views: EntryView[] = shown.map((e) => {
    const d = parseIso(e.date);
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      id: e.id,
      date: e.date,
      dateLabel: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}.`,
      hoursDelta: e.hoursDelta,
      amount: formatHours(e.hoursDelta),
      // An entry with no reason still gets a line, so rows keep their height.
      note: e.note || '—',
    };
  });

  const href = (r: Range) => (r === 'all' ? '/timebalance' : `/timebalance?range=${r}`);

  return (
    <Page width="narrow">
      <PageHeader title="Timebalance" />
      <Stack gap={4}>
        <Card>
          <CardBody>
            <div className={styles.summary}>
              <Stat
                label="Total balance"
                value={formatHours(total)}
                size="lg"
                tone={toneOf(total)}
              />
              <span className={styles.rule} />
              <Stat label="This week" value={formatHours(week)} tone={toneOf(week)} />
              <Stat label="This month" value={formatHours(month)} tone={toneOf(month)} />
            </div>
          </CardBody>
        </Card>

        <LogEntry defaultDate={now} />

        <Row gap={2}>
          {(
            [
              ['all', 'All time'],
              ['week', 'This week'],
              ['month', 'This month'],
            ] as const
          ).map(([key, label]) => (
            <ChipLink key={key} href={href(key)} selected={range === key}>
              {label}
            </ChipLink>
          ))}
          <CustomRange active={range === 'custom'} from={params.from ?? ''} to={params.to ?? ''} />
          <Spacer />
          <Text level="mono" tone="muted">
            {shown.length} {shown.length === 1 ? 'entry' : 'entries'} ·{' '}
            {formatHours(sumHours(shown))}
          </Text>
        </Row>

        <Card>
          {views.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
          {views.length === 0 ? (
            <EmptyState size="lg" standalone>
              {entries.length === 0
                ? EMPTY.timebalance.none
                : total === 0 && shown.length === 0
                  ? EMPTY.timebalance.zero
                  : EMPTY.timebalance.range}
            </EmptyState>
          ) : null}
        </Card>
      </Stack>
    </Page>
  );
}
