import { nowDate } from '@/lib/clock';
import { getVault } from '@/lib/vault/index';
import { readBamboo } from '@/lib/sources/bamboohr';
import { photoPath } from '@/lib/sources/cache';
import {
  MONTHS,
  buildTimeline,
  formatEur,
  lastRiseLabel,
  nextRiseLabel,
  rateAt,
  ym,
} from '@/lib/comp';
import { PeopleTable, type CompRowView } from '@/components/people/PeopleTable';
import { initials } from '@/components/people/avatar';
import { SyncButton } from '@/components/people/SyncButton';
import { loadConfig } from '@/lib/env';
import { EMPTY } from '@/copy/empty';
import {
  Avatar,
  Card,
  CardBody,
  CardLink,
  EmptyState,
  SyncBadge,
  Page,
  PageHeader,
  Row,
  Segment,
  Segmented,
  Stack,
  Text,
} from '@/components/ui';
import styles from '@/components/people/People.module.css';

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; m?: string; y?: string; sort?: string; dir?: string }>;
}) {
  const params = await searchParams;
  const detailed = params.view === 'detailed';

  const vault = getVault();
  const bamboo = readBamboo();

  const now = nowDate();
  const thisMonth = now.getMonth() + 1;
  const thisYear = now.getFullYear();
  const asOfMonth = Number(params.m) || thisMonth;
  const asOfYear = Number(params.y) || thisYear;
  const asOf = ym(asOfYear, asOfMonth);
  const shifted = asOf !== ym(thisYear, thisMonth);

  const people = vault.people.filter((p) => p.status === 'active');

  const rows: CompRowView[] = people.map((person) => {
    const comp = bamboo.data?.compensation[person.slug];
    const plans = vault.plans.get(person.slug) ?? [];
    const timeline = buildTimeline(comp?.rows ?? [], plans);
    const at = rateAt(timeline, asOf);
    const today = rateAt(timeline, ym(thisYear, thisMonth)).active;

    return {
      slug: person.slug,
      name: person.displayName,
      role: person.hr.jobTitle ?? '—',
      initials: initials(person.displayName),
      photo: photoPath(person.slug),
      rate: at.active ? formatEur(at.active.amount) : '—',
      // When the table is projected forward, the real current rate stays visible
      // underneath so a projection cannot be mistaken for payroll.
      rateToday:
        shifted && today && at.active && today.amount !== at.active.amount
          ? `today ${formatEur(today.amount)}`
          : '',
      fromPlan: Boolean(at.active?.planned),
      lastRise: at.active ? lastRiseLabel(at, asOf) : '—',
      lastRiseFirst: !at.previous,
      nextRise: at.active ? nextRiseLabel(at, asOf) : 'none planned',
      hasNext: Boolean(at.next),
    };
  });

  const sort = params.sort ?? 'name';
  const dir = params.dir === 'desc' ? 'desc' : 'asc';
  const sorted = rows.slice().sort((a, b) => {
    const flip = dir === 'asc' ? 1 : -1;
    if (sort === 'role') return a.role.localeCompare(b.role) * flip;
    if (sort === 'rate') {
      const parse = (s: string) => Number(s.replace(/[^0-9.]/g, '')) || 0;
      return (parse(a.rate) - parse(b.rate)) * flip;
    }
    if (sort === 'last') return a.lastRise.localeCompare(b.lastRise) * flip;
    if (sort === 'next') return a.nextRise.localeCompare(b.nextRise) * flip;
    return a.name.localeCompare(b.name) * flip;
  });

  // Pointing at the wrong compensation table looks exactly like a company that
  // pays nobody. When nothing came back at all, the footnote says which it is.
  const compNote = bamboo.data?.compNote ?? null;
  const note = compNote
    ? compNote
    : shifted
      ? `Monthly, Last rise: BambooHR compensation table (read only). Next rise: plans you keep in the vault. Projected to ${MONTHS[asOfMonth - 1]} ${asOfYear} — planned rises up to that month are counted as if they had happened, and blue means the rate comes from a plan, not BambooHR.`
      : 'Monthly and Last rise come from the BambooHR compensation table (read only). Next rise comes from plans you keep in the vault — BambooHR never sees them.';

  const years = [thisYear - 1, thisYear, thisYear + 1, thisYear + 2];

  return (
    <Page>
      <PageHeader
        title="Direct reports"
        subtitle={
          <Row gap={2}>
            <Text level="small" tone="muted">
              {people.length} {people.length === 1 ? 'person' : 'people'} reporting to you
            </Text>
            <SyncBadge source="BambooHR" target="roster" freshness={bamboo.freshness} />
          </Row>
        }
        end={
          <>
            <Segmented label="View">
              <Segment href="/people" selected={!detailed}>
                Simple
              </Segment>
              <Segment href="/people?view=detailed" selected={detailed}>
                Detailed
              </Segment>
            </Segmented>
            <SyncButton configured={Boolean(loadConfig().bamboo)} />
          </>
        }
      />

      {people.length === 0 ? (
        <Card>
          <EmptyState size="lg" standalone>
            {bamboo.freshness.state === 'unconfigured'
              ? 'BambooHR is not connected. Add the BAMBOOHR_ keys to .env and restart, or add people to people/entries.json by hand.'
              : EMPTY.people.none}
          </EmptyState>
        </Card>
      ) : detailed ? (
        <PeopleTable
          rows={sorted}
          asOfMonth={asOfMonth}
          asOfYear={asOfYear}
          shifted={shifted}
          years={years}
          note={note}
          sort={sort}
          dir={dir}
        />
      ) : (
        <div className={styles.grid}>
          {people.map((person) => (
            <CardLink key={person.slug} href={`/people/${person.slug}`}>
              <CardBody>
                <Stack gap={4} align="center">
                  <Avatar name={person.displayName} photo={photoPath(person.slug)} size="xl" />
                  <Stack gap={1} align="center">
                    <Text level="subheading">{person.displayName}</Text>
                    <Text level="small" tone="muted">
                      {person.hr.jobTitle ?? '—'}
                    </Text>
                  </Stack>
                </Stack>
              </CardBody>
            </CardLink>
          ))}
        </div>
      )}
    </Page>
  );
}
