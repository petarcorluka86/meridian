import { now as clockNow } from '@/lib/clock';

export type MeetingState = 'past' | 'now' | 'upcoming';

/**
 * Where a meeting sits relative to now.
 *
 * Decided on the server, never on the visitor's machine: a clock an hour out
 * would say a meeting is running when it finished, and the screen and the MCP
 * server would disagree about the same event. One rule, one place.
 */
export function meetingState(start: string, end: string, instant = clockNow()): MeetingState {
  if (Date.parse(end) <= instant) return 'past';
  if (Date.parse(start) <= instant) return 'now';
  return 'upcoming';
}

/**
 * Leave is inclusive at both ends, and both are ISO days — so a day falls inside
 * it by string comparison, with no parsing and no timezone to get wrong.
 */
export function coversDay(row: { start: string; end: string }, day: string): boolean {
  return row.start <= day && row.end >= day;
}
