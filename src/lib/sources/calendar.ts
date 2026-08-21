import { FixtureVaultError, vaultIsInsideApp } from '@/lib/vault/paths';
import { z } from 'zod';
import { now } from '@/lib/clock';
import { loadConfig } from '@/lib/env';
import { eventsBetween, type CalEvent } from './ical';
import { failureOf, freshnessOf, readCache, type Freshness, writeCache } from './cache';
import { logEgress } from './egress';

export const CalendarCache = z.object({
  fetchedAt: z.string(),
  etag: z.string().nullable().default(null),
  events: z
    .array(
      z.object({
        uid: z.string(),
        start: z.string(),
        end: z.string(),
        allDay: z.boolean().default(false),
        summary: z.string(),
        location: z.string().default(''),
        conference: z.string().nullable().default(null),
      }),
    )
    .default([]),
});

export type CalendarRead = { events: CalEvent[]; freshness: Freshness };

export function readCalendar(): CalendarRead {
  const config = loadConfig();
  const { data, fetchedAt } = readCache('calendar', CalendarCache);
  return {
    events: data?.events ?? [],
    // Meetings move by the minute, so the window is short by default.
    freshness: freshnessOf(
      fetchedAt,
      config.calendar?.maxAge ?? 300,
      Boolean(config.calendar),
      undefined,
      failureOf('calendar'),
    ),
  };
}

/**
 * A Google secret-address feed is a plain GET returning text/calendar. No OAuth,
 * no token exchange, and therefore no exception to the read-only rule.
 *
 * The URL is itself the credential: anyone holding it can read the calendar
 * indefinitely. It lives in .env at 0600 and is never sent to the browser.
 */
export async function syncCalendarFromIcal(): Promise<{ events: number }> {
  if (vaultIsInsideApp()) throw new FixtureVaultError();

  const config = loadConfig();
  if (config.calendar?.kind !== 'ical') throw new Error('No iCal address configured.');

  const started = Date.now();
  let status = 0;
  let body: string;
  try {
    const response = await fetch(config.calendar.icalUrl, {
      method: 'GET',
      headers: { Accept: 'text/calendar' },
      signal: AbortSignal.timeout(30_000),
    });
    status = response.status;
    if (response.status === 404) {
      throw new Error(
        'The calendar address returned 404. Use the Secret address in iCal format, not the public one.',
      );
    }
    if (!response.ok) throw new Error(`The calendar address returned ${response.status}.`);
    body = await response.text();
  } finally {
    logEgress({
      method: 'GET',
      host: 'calendar.google.com',
      path: '/ical',
      status,
      ms: Date.now() - started,
    });
  }

  if (!body.includes('BEGIN:VCALENDAR')) {
    throw new Error('That address did not return a calendar feed.');
  }

  // A fortnight either side is all any screen asks for, and it bounds recurrence
  // expansion to something finite.
  const from = new Date(Date.now() - 14 * 864e5).toISOString();
  const to = new Date(Date.now() + 21 * 864e5).toISOString();
  const events = eventsBetween(body, from, to);

  writeCache('calendar', { fetchedAt: new Date().toISOString(), etag: null, events });
  return { events: events.length };
}

/**
 * Google Calendar over OAuth.
 *
 * `singleEvents=true` makes Google expand recurrence server-side, so none of the
 * RRULE work in ical.ts is needed on this path.
 *
 * Callers must already hold an access token — obtaining one is a POST, and this
 * module runs inside the server, which never makes one. `scripts/calendar-sync.ts`
 * does the exchange in its own process and passes the token in.
 */
export async function syncCalendarWithToken(accessToken: string): Promise<{ events: number }> {
  if (vaultIsInsideApp()) throw new FixtureVaultError();

  const config = loadConfig();
  if (config.calendar?.kind !== 'oauth') throw new Error('Google Calendar is not configured.');

  const timeMin = new Date(Date.now() - 2 * 864e5).toISOString();
  const timeMax = new Date(Date.now() + 21 * 864e5).toISOString();
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendar.calendarId)}/events` +
    `?singleEvents=true&orderBy=startTime&maxResults=250` +
    `&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`;

  const started = Date.now();
  let status = 0;
  let payload: unknown;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(30_000),
    });
    status = response.status;
    if (response.status === 401) throw new Error('Google rejected the access token.');
    if (!response.ok) throw new Error(`Google Calendar returned ${response.status}.`);
    payload = await response.json();
  } finally {
    logEgress({
      method: 'GET',
      host: 'www.googleapis.com',
      path: '/calendar/v3/events',
      status,
      ms: Date.now() - started,
    });
  }

  const items = (payload as { items?: unknown[] }).items ?? [];
  const events = [];
  for (const raw of items) {
    const item = raw as {
      id?: string;
      status?: string;
      summary?: string;
      location?: string;
      hangoutLink?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
    };
    if (item.status === 'cancelled') continue;
    const startRaw = item.start?.dateTime ?? item.start?.date;
    if (!startRaw) continue;
    const allDay = !item.start?.dateTime;
    const video = item.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri;

    events.push({
      uid: item.id ?? startRaw,
      start: allDay ? startRaw : new Date(startRaw).toISOString(),
      end: (() => {
        const endRaw = item.end?.dateTime ?? item.end?.date ?? startRaw;
        return allDay ? endRaw : new Date(endRaw).toISOString();
      })(),
      allDay,
      summary: item.summary ?? '(no title)',
      location: item.location ?? '',
      conference: item.hangoutLink ?? video ?? null,
    });
  }

  writeCache('calendar', { fetchedAt: new Date().toISOString(), etag: null, events });
  return { events: events.length };
}

/**
 * The one POST this app makes.
 *
 * OAuth requires the refresh-token exchange to be a POST. It is authentication
 * rather than a write to anyone's data — Google's own token endpoint, returning
 * a short-lived key, touching nothing — but the distinction is too fine to leave
 * to judgement, so it is permitted by exact URL and nothing else is.
 *
 * It used to run in a separate process so the server could be shown to make no
 * POST at all. That was honest but expensive: a process spawn and a TypeScript
 * compile every five minutes, from inside a Server Action, and a runtime
 * dependency on a build tool. The exception is now stated where it can be read,
 * enforced by exact URL rather than by host, and cannot be redirected elsewhere.
 */
export const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

export async function accessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<string> {
  const started = now();
  let status = 0;
  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(30_000),
    });
    status = response.status;

    if (response.status === 400 || response.status === 401) {
      throw new Error(
        'Google refused the refresh token. It may have been revoked, or the client id and secret may not match it.',
      );
    }
    if (!response.ok) throw new Error(`Google returned ${response.status} for the token exchange.`);

    const body = (await response.json()) as { access_token?: string };
    if (!body.access_token) throw new Error('Google returned no access token.');
    return body.access_token;
  } finally {
    logEgress({
      method: 'POST',
      host: 'oauth2.googleapis.com',
      path: '/token',
      status,
      ms: now() - started,
    });
  }
}

/** Refreshes the calendar, whichever way it is configured. */
export async function syncCalendar(): Promise<{ events: number }> {
  // Before the token exchange, not after: the inner syncs refuse too, but by
  // then Google has already been asked for a token.
  if (vaultIsInsideApp()) throw new FixtureVaultError();

  const config = loadConfig();
  if (!config.calendar) throw new Error('Calendar is not connected.');
  if (config.calendar.kind === 'ical') return syncCalendarFromIcal();
  const token = await accessToken(
    config.calendar.clientId,
    config.calendar.clientSecret,
    config.calendar.refreshToken,
  );
  return syncCalendarWithToken(token);
}
