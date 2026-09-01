import { nowDate } from '@/lib/clock';
import { notFound } from 'next/navigation';
import { getVault } from '@/lib/vault/index';
import { readBamboo } from '@/lib/sources/bamboohr';
import { photoPath } from '@/lib/sources/cache';
import { renderMarkdown } from '@/lib/markdown';
import { dueLabel, dueTone, shortDate, today } from '@/lib/dates';
import { MONTHS, buildTimeline, formatEur, rateAt, ym, ymOfIso } from '@/lib/comp';
import {
  AboutCard,
  CompensationCard,
  LinksCard,
  PlansCard,
  type CompHistoryRow,
} from '@/components/people/PersonCards';
import { PersonTasks } from '@/components/people/PersonTasks';
import { NAV_GLYPH } from '@/components/NavIcons';
import { EMPTY } from '@/copy/empty';
import {
  Avatar,
  Card,
  CardHeader,
  CardRow,
  CategoryPill,
  categoryOf,
  Columns,
  EmptyState,
  SyncBadge,
  ButtonLink,
  Page,
  Pill,
  Row,
  Spacer,
  Stack,
  type TaskView,
  Text,
  TextLink,
} from '@/components/ui';
import styles from '@/components/people/Person.module.css';

export default async function PersonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vault = getVault();
  const person = vault.peopleBySlug.get(slug);
  if (!person) notFound();

  const bamboo = readBamboo();
  const comp = bamboo.data?.compensation[slug];
  const plans = vault.plans.get(slug) ?? [];
  const links = vault.links.get(slug) ?? [];
  const about = vault.about.get(slug) ?? '';
  const notes = vault.notesByPerson.get(slug) ?? [];

  const now = today();
  const clock = nowDate();
  const thisYear = clock.getFullYear();
  const asOf = ym(thisYear, clock.getMonth() + 1);

  const timeline = buildTimeline(comp?.rows ?? [], plans);
  const at = rateAt(timeline, asOf);

  // Newest first, and a plan sits in the same sequence as a real rise so the
  // history reads as one story — marked planned, never mistaken for payroll.
  const history: CompHistoryRow[] = timeline
    .slice()
    .reverse()
    .map((entry, i, all) => {
      const previous = all[i + 1] ?? null;
      const delta = previous ? entry.amount - previous.amount : null;
      const y = Math.floor(entry.ym / 100);
      const m = entry.ym % 100;
      return {
        when: `${MONTHS[m - 1]} ${y}`,
        delta:
          delta === null ? 'first rate' : `${delta >= 0 ? '+' : '−'}${formatEur(Math.abs(delta))}`,
        rate: formatEur(entry.amount),
        planned: entry.planned,
        reason: '',
      };
    });

  // The roster, for the edit dialog's Who field: a task on this page can be
  // moved to somebody else, which is the whole reason the field is there.
  const people = vault.people.map((p) => ({ slug: p.slug, name: p.displayName }));
  const projects = vault.projects.map((p) => ({
    id: p.id,
    title: p.title,
    phases: p.phases.map((ph) => ({ id: ph.id, label: ph.label })),
  }));

  const personTasks: TaskView[] = vault.tasks
    .filter((t) => t.personSlug === slug)
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
    .map((t) => ({
      id: t.id,
      title: t.title,
      done: t.status === 'done',
      priority: t.priority,
      dueDate: t.dueDate,
      dueLabel: dueLabel(t.dueDate, now),
      dueTone: dueTone(t.dueDate, t.status === 'done', now),
      personName: null,
      personSlug: t.personSlug,
      personPhoto: null,
      projectId: t.projectId,
      projectName: t.projectId ? (vault.projectsById.get(t.projectId)?.title ?? null) : null,
      phaseId: t.phaseId,
      phaseName:
        t.projectId && t.phaseId
          ? (vault.projectsById.get(t.projectId)?.phases.find((ph) => ph.id === t.phaseId)?.label ??
            null)
          : null,
      kind: t.kind,
    }));

  const photo = photoPath(slug);
  const hired = (() => {
    if (!person.hr.hireDate) return null;
    const at = ymOfIso(person.hr.hireDate);
    return `hired ${MONTHS[(at % 100) - 1]} ${Math.floor(at / 100)}`;
  })();

  const headline = [person.hr.jobTitle, person.hr.department, hired].filter(Boolean).join(' · ');
  const first = person.displayName.split(' ')[0] ?? person.displayName;

  return (
    <Page>
      <Stack gap={5}>
        <Stack gap={4}>
          <Row gap={2}>
            <ButtonLink href="/people" variant="ghost" size="sm">
              ← All people
            </ButtonLink>
          </Row>
          <Row gap={4}>
            <Avatar name={person.displayName} photo={photo} size="xl" />
            <Stack gap={1}>
              <Text as="h1" level="heading">
                {person.displayName}
              </Text>
              <Text level="small" tone="muted">
                {headline || '—'}
              </Text>
            </Stack>
            <Spacer />
            <div className={styles.contact}>
              {person.hr.workEmail ? (
                <Text level="small" tone="muted">
                  {person.hr.workEmail}
                </Text>
              ) : null}
              {person.hr.workPhone ? (
                <Text level="small" tone="muted">
                  {person.hr.workPhone}
                </Text>
              ) : null}
              <SyncBadge source="BambooHR" target="roster" freshness={bamboo.freshness} />
            </div>
          </Row>
        </Stack>

        <Columns
          main={
            <>
              <AboutCard
                slug={slug}
                name={person.displayName}
                body={about}
                html={renderMarkdown(about)}
              />

              <PersonTasks
                slug={slug}
                firstName={first}
                tasks={personTasks}
                people={people}
                projects={projects}
              />

              <Card>
                <CardHeader title="Notes" count={notes.length || undefined} />
                {notes.map((note) => (
                  <CardRow key={note.path}>
                    <Text level="mono" tone="muted">
                      {note.date ? shortDate(note.date) : '—'}
                    </Text>
                    <TextLink href={`/notes?note=${encodeURIComponent(note.path)}`} truncate>
                      {note.title}
                    </TextLink>
                    <Spacer />
                    {note.draft ? <Pill tone="warning">Draft</Pill> : null}
                    <CategoryPill
                      category={note.category}
                      label={categoryOf(note.category).label}
                    />
                  </CardRow>
                ))}
                {notes.length === 0 ? (
                  <EmptyState glyph={NAV_GLYPH.notes} {...EMPTY.person.notes} />
                ) : null}
              </Card>
            </>
          }
          side={
            <>
              <LinksCard
                slug={slug}
                links={links.map((l) => ({
                  label: l.label,
                  url: l.url,
                  host: l.url.replace(/^https?:\/\//i, '').split('/')[0] ?? l.url,
                }))}
              />

              <PlansCard
                slug={slug}
                thisYear={thisYear}
                plans={plans.map((p) => ({
                  id: p.id,
                  when: `${MONTHS[p.month - 1]} ${p.year}`,
                  amount: `+${formatEur(p.amount)}`,
                  promotion: p.promotion,
                }))}
              />

              <CompensationCard
                rate={at.active ? formatEur(at.active.amount) : '—'}
                paidPer={comp?.paidPer ?? 'Month'}
                history={history}
                bonuses={(comp?.bonus ?? []).map((b) => ({
                  when: shortDate(b.date),
                  amount: formatEur(b.amount),
                  reason: b.reason,
                }))}
                note={bamboo.data?.compNote ?? null}
                footnote={`From BambooHR · read only${
                  bamboo.freshness.state === 'live' || bamboo.freshness.state === 'stale'
                    ? ` · synced ${new Date(bamboo.freshness.fetchedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
                    : ''
                }`}
                hasData={Boolean(comp?.rows.length) || plans.length > 0}
              />
            </>
          }
        />
      </Stack>
    </Page>
  );
}
