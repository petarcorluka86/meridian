import { describe, expect, it } from 'vitest';
import { eventsBetween, parseIcs } from '@/lib/sources/ical';

const wrap = (body: string) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${body}\r\nEND:VCALENDAR\r\n`;

describe('parseIcs', () => {
  it('reads a plain event', () => {
    const [event] = parseIcs(
      wrap(
        `BEGIN:VEVENT\r\nUID:a@x\r\nSUMMARY:1:1 with Ivan\r\nDTSTART:20260820T080000Z\r\nDTEND:20260820T083000Z\r\nEND:VEVENT`,
      ),
    );
    expect(event?.summary).toBe('1:1 with Ivan');
    expect(event?.dtStart).toBe('2026-08-20T08:00:00.000Z');
  });

  it('unfolds a continued line', () => {
    const [event] = parseIcs(
      wrap(
        `BEGIN:VEVENT\r\nUID:a@x\r\nSUMMARY:A very long meeting title that Google\r\n  wrapped\r\nDTSTART:20260820T080000Z\r\nEND:VEVENT`,
      ),
    );
    expect(event?.summary).toBe('A very long meeting title that Google wrapped');
  });

  it('unescapes commas and newlines', () => {
    const [event] = parseIcs(
      wrap(
        `BEGIN:VEVENT\r\nUID:a@x\r\nSUMMARY:Review\\, then ship\r\nDESCRIPTION:one\\ntwo\r\nDTSTART:20260820T080000Z\r\nEND:VEVENT`,
      ),
    );
    expect(event?.summary).toBe('Review, then ship');
    expect(event?.description).toBe('one\ntwo');
  });

  it('treats a date-only DTSTART as all day', () => {
    const [event] = parseIcs(
      wrap(`BEGIN:VEVENT\r\nUID:a@x\r\nSUMMARY:Off\r\nDTSTART;VALUE=DATE:20260820\r\nEND:VEVENT`),
    );
    expect(event?.allDay).toBe(true);
    expect(event?.dtStart).toBe('2026-08-20');
  });

  it('finds a video link in the description when there is no conference property', () => {
    const [event] = parseIcs(
      wrap(
        `BEGIN:VEVENT\r\nUID:a@x\r\nSUMMARY:Sync\r\nDESCRIPTION:Join at https://meet.google.com/abc-defg-hij please\r\nDTSTART:20260820T080000Z\r\nEND:VEVENT`,
      ),
    );
    expect(event?.conference).toBe('https://meet.google.com/abc-defg-hij');
  });
});

describe('recurrence', () => {
  const weekly = wrap(
    `BEGIN:VEVENT\r\nUID:w@x\r\nSUMMARY:Weekly 1:1\r\nDTSTART:20260803T080000Z\r\nDTEND:20260803T083000Z\r\nRRULE:FREQ=WEEKLY\r\nEND:VEVENT`,
  );

  it('expands a weekly series into the window only', () => {
    const events = eventsBetween(weekly, '2026-08-10T00:00:00Z', '2026-08-31T23:59:59Z');
    expect(events.length).toBe(4);
    expect(events[0]!.start.slice(0, 10)).toBe('2026-08-10');
  });

  it('never returns an unbounded series', () => {
    const events = eventsBetween(weekly, '2026-08-01T00:00:00Z', '2027-08-01T00:00:00Z');
    expect(events.length).toBeLessThan(400);
  });

  it('honours COUNT and UNTIL', () => {
    const counted = wrap(
      `BEGIN:VEVENT\r\nUID:c@x\r\nSUMMARY:Three\r\nDTSTART:20260803T080000Z\r\nRRULE:FREQ=WEEKLY;COUNT=3\r\nEND:VEVENT`,
    );
    expect(eventsBetween(counted, '2026-08-01T00:00:00Z', '2026-12-01T00:00:00Z')).toHaveLength(3);

    const until = wrap(
      `BEGIN:VEVENT\r\nUID:u@x\r\nSUMMARY:Until\r\nDTSTART:20260803T080000Z\r\nRRULE:FREQ=WEEKLY;UNTIL=20260817T000000Z\r\nEND:VEVENT`,
    );
    expect(eventsBetween(until, '2026-08-01T00:00:00Z', '2026-12-01T00:00:00Z')).toHaveLength(2);
  });

  it('drops a cancelled occurrence named by EXDATE', () => {
    const withEx = wrap(
      `BEGIN:VEVENT\r\nUID:e@x\r\nSUMMARY:Weekly\r\nDTSTART:20260803T080000Z\r\nRRULE:FREQ=WEEKLY;COUNT=3\r\nEXDATE:20260810T080000Z\r\nEND:VEVENT`,
    );
    const events = eventsBetween(withEx, '2026-08-01T00:00:00Z', '2026-12-01T00:00:00Z');
    expect(events.map((e) => e.start.slice(0, 10))).toEqual(['2026-08-03', '2026-08-17']);
  });

  it('lets a RECURRENCE-ID override replace one occurrence', () => {
    const withOverride = wrap(
      `BEGIN:VEVENT\r\nUID:o@x\r\nSUMMARY:Weekly\r\nDTSTART:20260803T080000Z\r\nRRULE:FREQ=WEEKLY;COUNT=2\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:o@x\r\nSUMMARY:Moved\r\nRECURRENCE-ID:20260810T080000Z\r\nDTSTART:20260811T090000Z\r\nDTEND:20260811T093000Z\r\nEND:VEVENT`,
    );
    const events = eventsBetween(withOverride, '2026-08-01T00:00:00Z', '2026-12-01T00:00:00Z');
    const summaries = events.map((e) => e.summary);
    expect(summaries).toContain('Moved');
    // The original 10 Aug occurrence must not also appear.
    expect(events.filter((e) => e.start.slice(0, 10) === '2026-08-10')).toHaveLength(0);
  });
});
