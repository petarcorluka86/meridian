/**
 * Dates on disk are `YYYY-MM-DD` strings compared lexicographically. No Date object
 * is ever stored, and no page formats a date inline — this is the only formatter.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FULL_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * `new Date('2026-08-19')` is UTC midnight, which is the previous day west of
 * Greenwich. Every date in the vault is a calendar date with no timezone, so it is
 * parsed into local noon where no offset can shift it across a day boundary.
 */
export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

import { nowDate } from '@/lib/clock';

export function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today, from the one clock — see lib/clock.ts for why it can be stopped. */
export function today(): string {
  return toIso(nowDate());
}

export function addDays(iso: string, days: number): string {
  const d = parseIso(iso);
  d.setDate(d.getDate() + days);
  return toIso(d);
}

/** Whole calendar days from `from` to `to`; negative when `to` is in the past. */
export function daysBetween(from: string, to: string): number {
  const ms = parseIso(to).getTime() - parseIso(from).getTime();
  return Math.round(ms / 86_400_000);
}

/** "12 Aug" */
export function shortDate(iso: string): string {
  const d = parseIso(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "Wednesday, 19 August 2026" */
export function longDate(iso: string): string {
  const d = parseIso(iso);
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${FULL_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export type DueTone = 'late' | 'today' | 'upcoming' | 'none' | 'done';

/**
 * "3 days late" · "today" · "22 Aug", and `null` for a task with no date.
 *
 * No date is not a state worth a word: it is most of the list, and labelling it
 * put a grey "no date" pill on every row that was merely not urgent. The absence
 * of a pill says it.
 */
export function dueLabel(due: string | null, now = today()): string | null {
  if (!due) return null;
  const delta = daysBetween(now, due);
  if (delta < 0) return `${-delta} ${-delta === 1 ? 'day' : 'days'} late`;
  if (delta === 0) return 'today';
  return shortDate(due);
}

export function dueTone(due: string | null, done: boolean, now = today()): DueTone {
  if (done) return 'done';
  if (!due) return 'none';
  const delta = daysBetween(now, due);
  if (delta < 0) return 'late';
  if (delta === 0) return 'today';
  return 'upcoming';
}

/**
 * The days a card can be stepped through, newest label first read: today reads
 * as "Today" rather than as its date, because that is what somebody looking at a
 * dashboard is asking about.
 *
 * Built on the server. A day worked out from the visitor's clock is a different
 * day from the server's for an hour either side of midnight, and every other
 * label on the card is computed against the server's.
 */
export function dayWindow(back: number, forward: number, now = today()) {
  const days = [];
  for (let offset = -back; offset <= forward; offset++) {
    const iso = addDays(now, offset);
    days.push({
      iso,
      label:
        offset === 0
          ? 'Today'
          : offset === -1
            ? 'Yesterday'
            : offset === 1
              ? 'Tomorrow'
              : // Built from the same tables as every other label in this file,
                // rather than from Intl: the pixel gate must not depend on the
                // locale of the machine it runs on.
                `${DAYS[parseIso(iso).getDay()]?.slice(0, 3)} ${shortDate(iso)}`,
    });
  }
  // Where today sits in the list, which is where a card opens.
  return { days, todayIndex: back };
}
