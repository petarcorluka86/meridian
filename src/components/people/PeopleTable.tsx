'use client';

import { useRouter } from 'next/navigation';
import { MONTHS } from '@/lib/comp';
import { EMPTY } from '@/copy/empty';
import {
  Avatar,
  Blurred,
  ButtonLink,
  Card,
  CardFooter,
  CardHeader,
  CardRow,
  CalendarIcon,
  RevealButton,
  Row,
  Select,
  Stack,
  Table,
  TBody,
  TD,
  TH,
  THead,
  Text,
  TR,
  useReveal,
} from '@/components/ui';

export type CompRowView = {
  slug: string;
  name: string;
  role: string;
  initials: string;
  photo: string | null;
  rate: string;
  rateToday: string;
  fromPlan: boolean;
  lastRise: string;
  lastRiseFirst: boolean;
  nextRise: string;
  hasNext: boolean;
};

type Props = {
  rows: CompRowView[];
  asOfMonth: number;
  asOfYear: number;
  shifted: boolean;
  years: number[];
  note: string;
  sort: string;
  dir: 'asc' | 'desc';
};

const COLUMNS = [
  { key: 'name', label: 'Person', align: 'start' },
  { key: 'role', label: 'Role', align: 'start' },
  { key: 'rate', label: 'Monthly', align: 'end' },
  { key: 'last', label: 'Last rise', align: 'end' },
  { key: 'next', label: 'Next rise', align: 'end' },
] as const;

export function PeopleTable({ rows, asOfMonth, asOfYear, shifted, years, note, sort, dir }: Props) {
  const router = useRouter();
  const { revealed, left, toggle } = useReveal();

  const go = (next: Record<string, string>) => {
    const params = new URLSearchParams({ view: 'detailed' });
    params.set('m', String(next.m ?? asOfMonth));
    params.set('y', String(next.y ?? asOfYear));
    if (next.sort ?? sort) params.set('sort', next.sort ?? sort);
    if (next.dir ?? dir) params.set('dir', next.dir ?? dir);
    router.push(`/people?${params}`, { scroll: false });
  };

  const pickSort = (key: string) =>
    go({ sort: key, dir: sort === key && dir === 'asc' ? 'desc' : 'asc' });

  return (
    <Card>
      <CardHeader
        title="Detailed view"
        end={
          <>
            <Text level="small" tone="muted">
              As of
            </Text>
            <Select
              size="sm"
              value={String(asOfMonth)}
              onChange={(value) => go({ m: value })}
              ariaLabel="As-of month"
              options={MONTHS.map((month, index) => ({ value: String(index + 1), label: month }))}
            />
            <Select
              size="sm"
              value={String(asOfYear)}
              onChange={(value) => go({ y: value })}
              ariaLabel="As-of year"
              options={years.map((year) => ({ value: String(year), label: String(year) }))}
            />
            {shifted ? (
              <ButtonLink href="/people?view=detailed" size="sm" icon={<CalendarIcon />}>
                Today
              </ButtonLink>
            ) : null}
            <RevealButton revealed={revealed} left={left} onToggle={toggle} />
          </>
        }
      />
      {revealed ? null : (
        <CardRow>
          <Text level="small" tone="muted">
            {EMPTY.people.hidden}
          </Text>
        </CardRow>
      )}

      <Table label="Direct reports">
        <THead>
          {COLUMNS.map((column) => (
            <TH
              key={column.key}
              align={column.align}
              onSort={() => pickSort(column.key)}
              sorted={sort === column.key ? dir : undefined}
            >
              {column.label}
            </TH>
          ))}
        </THead>
        <TBody>
          {rows.map((row) => (
            <TR key={row.slug} interactive>
              <TD link={`/people/${row.slug}`}>
                <Row gap={3}>
                  <Avatar name={row.name} photo={row.photo} size="sm" />
                  <Text level="small" tone="strong" truncate>
                    {row.name}
                  </Text>
                </Row>
              </TD>
              <TD>
                <Text level="small" tone="muted" truncate>
                  {row.role}
                </Text>
              </TD>
              <TD align="end" numeric>
                <Blurred revealed={revealed}>
                  <Stack gap={1} align="end">
                    <Text level="label" tone={row.fromPlan ? 'info' : 'strong'} numeric>
                      {row.rate}
                    </Text>
                    {row.rateToday ? (
                      <Text level="small" tone="faint" numeric>
                        {row.rateToday}
                      </Text>
                    ) : null}
                  </Stack>
                </Blurred>
              </TD>
              <TD align="end">
                <Blurred revealed={revealed}>
                  <Text level="small" tone={row.lastRiseFirst ? 'faint' : 'success'}>
                    {row.lastRise}
                  </Text>
                </Blurred>
              </TD>
              <TD align="end">
                <Blurred revealed={revealed}>
                  <Text level="small" tone={row.hasNext ? 'info' : 'faint'}>
                    {row.nextRise}
                  </Text>
                </Blurred>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      {rows.every((r) => !r.hasNext) ? (
        <CardRow>
          <Text level="small" tone="muted">
            {EMPTY.people.noRises}
          </Text>
        </CardRow>
      ) : null}

      <CardFooter>
        <Text level="small" tone="muted">
          {note}
        </Text>
      </CardFooter>
    </Card>
  );
}
