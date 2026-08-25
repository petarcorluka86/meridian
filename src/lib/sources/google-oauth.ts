import { now } from '@/lib/clock';
import { logEgress } from '@/lib/sources/egress';

/**
 * The one thing this app asks Google other than for events: which calendars the
 * account can read.
 *
 * It is what makes connecting a calendar checkable. The four values somebody
 * types — client id, client secret, refresh token, calendar id — are wrong in
 * four different ways, and a list that comes back proves the first three fit
 * together and says whether the fourth is one of them.
 *
 * There is no browser sign-in here, deliberately. Meridian takes the
 * credentials as they are, checks them, and writes them down; the consent flow
 * that used to sit in this file was one more moving part between somebody who
 * already has a refresh token and an app that can use it.
 */

/** Read the calendar, and nothing else. Not `calendar`, which can also write. */
export const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

export type CalendarChoice = { id: string; summary: string; primary: boolean };

/**
 * The calendars this account can read, so the last step of connecting is a
 * choice from a list rather than somebody pasting their own address in.
 */
export async function listCalendars(token: string): Promise<CalendarChoice[]> {
  const started = now();
  let status = 0;
  try {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader&maxResults=250',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(30_000),
      },
    );
    status = response.status;
    if (!response.ok) throw new Error(`Google returned ${response.status} for the calendar list.`);

    const body = (await response.json()) as {
      items?: Array<{ id?: string; summary?: string; primary?: boolean }>;
    };

    return (body.items ?? [])
      .filter((item): item is { id: string; summary?: string; primary?: boolean } =>
        Boolean(item.id),
      )
      .map((item) => ({
        id: item.id,
        summary: item.summary || item.id,
        primary: Boolean(item.primary),
      }))
      .sort((a, b) => Number(b.primary) - Number(a.primary) || a.summary.localeCompare(b.summary));
  } finally {
    logEgress({
      method: 'GET',
      host: 'www.googleapis.com',
      path: '/calendar/v3/users/me/calendarList',
      status,
      ms: now() - started,
    });
  }
}
