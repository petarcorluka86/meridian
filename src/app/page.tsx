import { now as clockNow } from '@/lib/clock';
import { getVault } from '@/lib/vault/index';
import { loadConfig } from '@/lib/env';
import { readBamboo } from '@/lib/sources/bamboohr';
import { readCalendar } from '@/lib/sources/calendar';
import { readGithub } from '@/lib/sources/github';
import { photoPath } from '@/lib/sources/cache';
import { changedFiles, repoState } from '@/lib/git';
import { allTimeEntries, sumHours } from '@/lib/vault/time';
import { addDays, dayWindow, dueLabel, dueTone, longDate, shortDate, today } from '@/lib/dates';
import {
  OutCard,
  type PresenceRow,
  WorkingFromHomeCard,
} from '@/components/overview/PresenceCards';
import { HoursCard } from '@/components/overview/HoursCard';
import { InboxCard } from '@/components/overview/InboxCard';
import { MeetingsCard, type MeetingView } from '@/components/overview/MeetingsCard';
import { QuickCapture } from '@/components/overview/QuickCapture';
import { ReviewCard } from '@/components/overview/ReviewCard';
import { SavedCard } from '@/components/overview/SavedCard';
import { TasksCard } from '@/components/overview/TasksCard';
import { Columns, Page, PageHeader, Stack, type TaskView, type Tone } from '@/components/ui';

export default async function OverviewPage() {
  const config = loadConfig();
  const vault = getVault();
  const bamboo = readBamboo();
  const calendar = readCalendar();
  const github = readGithub();
  const now = today();

  /*
   * The days these three cards can be stepped through: as far back as the
   * calendar cache reaches and as far forward as it does. Built here because a
   * day worked out from the visitor's clock is a different day from this one for
   * an hour either side of midnight.
   */
  const { days, todayIndex } = dayWindow(2, 21, now);
  const firstDay = days[0]?.iso ?? now;
  const lastDay = days[days.length - 1]?.iso ?? now;

  const hhmm = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const durationOf = (start: string, end: string) => {
    const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    if (mins < 60) return `${mins} min`;
    const hours = mins / 60;
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`;
  };

  /*
   * Only what happens at a time. An all-day entry on a work calendar is almost
   * never something you attend: it is a status. Google's working-location feature
   * exports one every day named after the place ("Office", "Home"), which arrived
   * here as a meeting with no time and pushed the real ones down.
   */
  const meetings: MeetingView[] = calendar.events
    .filter((e) => !e.allDay)
    .filter((e) => {
      const day = e.start.slice(0, 10);
      return day >= firstDay && day <= lastDay;
    })
    .map((e) => ({
      uid: e.uid + e.start,
      day: e.start.slice(0, 10),
      clock: `${hhmm(e.start)} – ${hhmm(e.end)}`,
      duration: durationOf(e.start, e.end),
      summary: e.summary,
      conference: e.conference,
    }));

  const photoOf = (slug: string | null) => (slug ? photoPath(slug) : null);

  const people = vault.people.map((p) => ({ slug: p.slug, name: p.displayName }));
  const nameOf = (slug: string | null) =>
    slug ? (vault.peopleBySlug.get(slug)?.displayName ?? slug) : null;

  // Every open task, including the ones with no date and the ones you are waiting
  // on somebody else for — the Tasks screen filters those out, so this is where
  // they stay visible.
  //
  // The card filters and sorts it in place; the due label and its tone are
  // resolved here, because the browser's clock must not be what decides them.
  const open: TaskView[] = vault.tasks
    .filter((t) => t.status !== 'done')
    .map((t) => ({
      id: t.id,
      title: t.title,
      done: false,
      priority: t.priority,
      dueDate: t.dueDate,
      dueLabel: dueLabel(t.dueDate, now),
      dueTone: dueTone(t.dueDate, false, now),
      personName: nameOf(t.personSlug),
      personSlug: t.personSlug,
      personPhoto: photoOf(t.personSlug),
      kind: t.kind,
    }));

  const inbox = bamboo.data?.inbox ?? [];
  // Every leave the cache holds; the cards pick the day. BambooHR is only asked
  // from today onwards, which is why a day before today says so rather than
  // showing an empty list.
  const presence = (bamboo.data?.timeOff ?? []).map((t): PresenceRow & { wfh: boolean } => ({
    slug: t.slug,
    name: nameOf(t.slug) ?? t.name,
    type: t.type,
    start: t.start,
    end: t.end,
    backLabel: shortDate(addDays(t.end, 1)),
    photo: photoOf(t.slug),
    wfh: t.wfh,
  }));
  const wfh = presence.filter((t) => t.wfh);
  const out = presence.filter((t) => !t.wfh);

  const balance = sumHours(allTimeEntries());
  const repo = await repoState();
  const changed = repo.kind === 'ok' ? await changedFiles() : [];

  const prs = github.data?.pullRequests ?? [];
  // The longer you have been blocking it, the louder it reads.
  const ageTone = (openedAt: string): Tone => {
    const days = (clockNow() - new Date(openedAt).getTime()) / 864e5;
    if (days >= 4) return 'danger';
    if (days >= 2) return 'warning';
    return 'muted';
  };

  return (
    <Page>
      <PageHeader title={`${longDate(now)}!`} level="display" />
      <Stack gap={4}>
        <QuickCapture people={people} />

        <Columns
          main={
            <>
              <InboxCard
                inbox={inbox.map((row) => ({
                  kind: row.kind,
                  title: row.title,
                  name: nameOf(row.slug) ?? '',
                  photo: photoOf(row.slug),
                }))}
                subdomain={config.bamboo?.subdomain ?? null}
                freshness={bamboo.inboxFreshness}
              />

              <TasksCard open={open} people={people} />

              <ReviewCard
                prs={prs}
                connected={Boolean(config.github)}
                freshness={github.freshness}
                photoOf={photoOf}
                ageTone={ageTone}
              />
            </>
          }
          side={
            <>
              <MeetingsCard
                meetings={meetings}
                days={days}
                todayIndex={todayIndex}
                connected={Boolean(config.calendar)}
                freshness={calendar.freshness}
              />

              <WorkingFromHomeCard
                rows={wfh}
                days={days}
                todayIndex={todayIndex}
                connected={Boolean(config.bamboo)}
                freshness={bamboo.inboxFreshness}
              />

              <OutCard
                rows={out}
                days={days}
                todayIndex={todayIndex}
                connected={Boolean(config.bamboo)}
                freshness={bamboo.inboxFreshness}
              />

              <HoursCard balance={balance} />

              <SavedCard changed={changed.length} />
            </>
          }
        />
      </Stack>
    </Page>
  );
}
