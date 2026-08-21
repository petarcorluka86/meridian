/**
 * Just enough iCalendar to render a day of meetings.
 *
 * A Google secret-address feed is a plain GET returning text/calendar, which is
 * why this integration needs no OAuth and no exception to the read-only rule.
 * What it costs is that everything below has to be done by hand: unfolding,
 * escaping, timezone-less dates, and recurrence.
 */

export type CalEvent = {
  uid: string;
  start: string; // ISO instant, or YYYY-MM-DD for an all-day event
  end: string;
  allDay: boolean;
  summary: string;
  location: string;
  /** A video link, if the invite carries one. */
  conference: string | null;
};

type RawEvent = {
  uid: string;
  summary: string;
  location: string;
  description: string;
  conference: string | null;
  dtStart: string;
  dtEnd: string;
  allDay: boolean;
  rrule: string | null;
  exdates: string[];
  recurrenceId: string | null;
};

/** Lines longer than 75 octets are folded onto continuation lines. */
function unfold(source: string): string[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/**
 * `20260820T093000Z`, `20260820T093000` (floating or TZID) or `20260820`.
 * A floating time is treated as local, which is what a calendar app shows.
 */
function parseDateValue(raw: string): { value: string; allDay: boolean } {
  const v = raw.trim();
  if (/^\d{8}$/.test(v)) {
    return { value: `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`, allDay: true };
  }
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(v);
  if (!m) return { value: v, allDay: false };
  const [, y, mo, d, h, mi, s, z] = m;
  if (z) {
    return {
      value: new Date(Date.UTC(+y!, +mo! - 1, +d!, +h!, +mi!, +s!)).toISOString(),
      allDay: false,
    };
  }
  return { value: new Date(+y!, +mo! - 1, +d!, +h!, +mi!, +s!).toISOString(), allDay: false };
}

const MEET =
  /https:\/\/[a-z0-9.-]*(?:meet\.google\.com|zoom\.us|teams\.microsoft\.com)\/[^\s<>"]+/i;

export function parseIcs(source: string): RawEvent[] {
  const events: RawEvent[] = [];
  let current: Partial<RawEvent> | null = null;

  for (const line of unfold(source)) {
    if (line === 'BEGIN:VEVENT') {
      current = { exdates: [], conference: null, rrule: null, recurrenceId: null };
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current?.dtStart && current.uid) {
        events.push({
          uid: current.uid,
          summary: current.summary ?? '(no title)',
          location: current.location ?? '',
          description: current.description ?? '',
          conference:
            current.conference ??
            MEET.exec(current.description ?? '')?.[0] ??
            MEET.exec(current.location ?? '')?.[0] ??
            null,
          dtStart: current.dtStart,
          dtEnd: current.dtEnd ?? current.dtStart,
          allDay: current.allDay ?? false,
          rrule: current.rrule ?? null,
          exdates: current.exdates ?? [],
          recurrenceId: current.recurrenceId ?? null,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const rawName = line.slice(0, colon);
    const value = line.slice(colon + 1);
    const name = rawName.split(';')[0]!.toUpperCase();

    switch (name) {
      case 'UID':
        current.uid = value;
        break;
      case 'SUMMARY':
        current.summary = unescapeText(value);
        break;
      case 'LOCATION':
        current.location = unescapeText(value);
        break;
      case 'DESCRIPTION':
        current.description = unescapeText(value);
        break;
      case 'X-GOOGLE-CONFERENCE':
        current.conference = value;
        break;
      case 'DTSTART': {
        const parsed = parseDateValue(value);
        current.dtStart = parsed.value;
        current.allDay = parsed.allDay;
        break;
      }
      case 'DTEND':
        current.dtEnd = parseDateValue(value).value;
        break;
      case 'RRULE':
        current.rrule = value;
        break;
      case 'EXDATE':
        for (const one of value.split(',')) current.exdates!.push(parseDateValue(one).value);
        break;
      case 'RECURRENCE-ID':
        current.recurrenceId = parseDateValue(value).value;
        break;
      default:
        break;
    }
  }

  return events;
}

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/**
 * Expands a recurrence into a bounded window rather than into the future —
 * a weekly 1:1 with no UNTIL is otherwise infinite.
 */
function expand(event: RawEvent, fromIso: string, toIso: string): string[] {
  if (!event.rrule) return [event.dtStart];

  const parts = Object.fromEntries(
    event.rrule.split(';').map((p) => {
      const [k, v] = p.split('=');
      return [k!.toUpperCase(), v ?? ''];
    }),
  );

  const freq = parts.FREQ;
  const interval = Math.max(1, Number(parts.INTERVAL ?? 1));
  const count = parts.COUNT ? Number(parts.COUNT) : null;
  const until = parts.UNTIL ? parseDateValue(parts.UNTIL).value : null;
  const byDay = parts.BYDAY ? parts.BYDAY.split(',').map((d) => d.slice(-2)) : null;

  const windowFrom = new Date(fromIso).getTime();
  const windowTo = new Date(toIso).getTime();
  const first = new Date(event.dtStart);
  const out: string[] = [];

  const cursor = new Date(first);
  // COUNT limits what the rule generates, not what survives. An EXDATE removes
  // an occurrence; it must not pull a replacement in from the end of the series.
  let generated = 0;
  // Bounded so a malformed rule cannot spin: a year of daily occurrences.
  for (let i = 0; i < 400 && generated < (count ?? 400); i++) {
    const at = cursor.getTime();
    if (until && at > new Date(until).getTime()) break;
    if (at > windowTo) break;

    const matchesDay = !byDay || byDay.includes(DAY_CODES[cursor.getDay()]!);
    if (matchesDay) {
      generated++;
      const iso = event.allDay ? cursor.toISOString().slice(0, 10) : cursor.toISOString();
      if (at >= windowFrom && !event.exdates.includes(iso)) out.push(iso);
    }

    if (freq === 'DAILY') cursor.setDate(cursor.getDate() + interval);
    else if (freq === 'WEEKLY') cursor.setDate(cursor.getDate() + (byDay ? 1 : 7 * interval));
    else if (freq === 'MONTHLY') cursor.setMonth(cursor.getMonth() + interval);
    else if (freq === 'YEARLY') cursor.setFullYear(cursor.getFullYear() + interval);
    else break;
  }

  return out;
}

export function eventsBetween(source: string, fromIso: string, toIso: string): CalEvent[] {
  const raw = parseIcs(source);

  // A RECURRENCE-ID event replaces one occurrence of its series.
  const overrides = new Set(
    raw.filter((e) => e.recurrenceId).map((e) => `${e.uid}@${e.recurrenceId}`),
  );

  const out: CalEvent[] = [];
  for (const event of raw) {
    const durationMs = new Date(event.dtEnd).getTime() - new Date(event.dtStart).getTime();
    const starts = event.recurrenceId ? [event.dtStart] : expand(event, fromIso, toIso);

    for (const start of starts) {
      if (!event.recurrenceId && overrides.has(`${event.uid}@${start}`)) continue;
      const end = event.allDay
        ? event.dtEnd
        : new Date(
            new Date(start).getTime() + (Number.isFinite(durationMs) ? durationMs : 0),
          ).toISOString();
      out.push({
        uid: event.uid,
        start,
        end,
        allDay: event.allDay,
        summary: event.summary,
        location: event.location,
        conference: event.conference,
      });
    }
  }

  return out.sort((a, b) => a.start.localeCompare(b.start));
}
