'use server';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { configChanged } from '@/app/changed';
import { now } from '@/lib/clock';
import { loadConfig, bambooSubdomainOf } from '@/lib/env';
import { accessToken } from '@/lib/sources/calendar';
import { type CalendarChoice, listCalendars } from '@/lib/sources/google-oauth';
import { fold } from '@/lib/sources/bamboohr/client';
import { logEgress } from '@/lib/sources/egress';
import { writeEnv } from '@/lib/env-write';
import { vaultHealth } from '@/lib/vault/health';

/**
 * The wizard writes credentials but never reads them back. Every action here
 * returns a verdict and, at most, harmless facts — how many people a key can
 * see, which repositories it reaches. A value that went in never comes out.
 *
 * All of it runs in the server, which is bound to localhost and refuses any
 * non-GET outbound request, so a credential typed here reaches this process and
 * the file on disk and nowhere else.
 */
export type Check = { ok: true; detail: string } | { ok: false; problem: string; hint?: string };

function expandHome(p: string): string {
  return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;
}

/**
 * Logged like every other outbound call. These were the only fetches in the repo
 * that skipped the egress log, and they are the ones that carry a freshly typed
 * credential to a real company's HR system — exactly the step somebody would
 * want to see a record of. "Every outbound request appends to .cache/egress.log"
 * is a claim about provability; a log missing the interesting requests does not
 * prove the thing it exists for.
 */
async function logged(url: string, init: RequestInit, host: string): Promise<Response> {
  const started = now();
  let status = 0;
  try {
    const response = await fetch(url, init);
    status = response.status;
    return response;
  } finally {
    logEgress({
      method: 'GET',
      host,
      path: new URL(url).pathname,
      status,
      ms: now() - started,
    });
  }
}

async function bambooGet(subdomain: string, apiKey: string, endpoint: string): Promise<Response> {
  return logged(
    `https://api.bamboohr.com/api/gateway.php/${encodeURIComponent(subdomain)}/v1/${endpoint}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(`${apiKey}:x`).toString('base64')}`,
      },
      signal: AbortSignal.timeout(20_000),
    },
    'api.bamboohr.com',
  );
}

export async function checkVaultAction(rawPath: string): Promise<Check> {
  const target = expandHome(rawPath.trim());
  if (!target) return { ok: false, problem: 'Choose a folder first.' };
  if (!path.isAbsolute(target)) {
    return {
      ok: false,
      problem: 'That needs to be a full path.',
      hint: 'For example ~/meridian/vault',
    };
  }

  try {
    fs.mkdirSync(target, { recursive: true });
    const probe = path.join(target, `.meridian-check-${process.pid}`);
    fs.writeFileSync(probe, '');
    fs.rmSync(probe, { force: true });
  } catch (err) {
    return { ok: false, problem: `Cannot write there — ${(err as Error).message}` };
  }

  writeEnv(loadConfig().envPath, { VAULT_PATH: rawPath.trim() });
  // Scaffolds .gitignore first, so nothing lands in git before it exists.
  vaultHealth();
  configChanged();

  const existing = fs.readdirSync(target).filter((f) => !f.startsWith('.'));
  return {
    ok: true,
    detail: existing.length
      ? `Using ${target}, which already has ${existing.length} ${existing.length === 1 ? 'entry' : 'entries'} in it.`
      : `Created ${target}.`,
  };
}

export type BambooCheck = Check & { candidates?: { id: string; name: string; reports: number }[] };

/**
 * Verifies the key, then finds which employee id the manager is — the one
 * value people cannot look up easily, and the one most often guessed wrong.
 */
export async function checkBambooAction(
  rawSubdomain: string,
  apiKey: string,
  search: string,
): Promise<BambooCheck> {
  const subdomain = bambooSubdomainOf(rawSubdomain);
  if (!subdomain || !apiKey.trim())
    return { ok: false, problem: 'Both the company name and the API key are needed.' };

  let response: Response;
  try {
    response = await bambooGet(subdomain, apiKey.trim(), 'employees/directory');
  } catch {
    return { ok: false, problem: 'Could not reach BambooHR. Check the connection.' };
  }

  if (response.status === 401) {
    return {
      ok: false,
      problem: 'BambooHR rejected the API key.',
      hint: 'Profile → API Keys → Add New Key',
    };
  }
  if (response.status === 403) {
    return {
      ok: false,
      problem: 'The key is valid but cannot read the employee directory.',
      hint: 'Ask whoever administers BambooHR to allow it.',
    };
  }
  if (response.status === 404) {
    return {
      ok: false,
      problem: `No BambooHR at "${subdomain}".`,
      hint: 'Use just the company name, as in yourcompany.bamboohr.com',
    };
  }
  if (!response.ok) return { ok: false, problem: `BambooHR returned ${response.status}.` };

  const body = (await response.json()) as { employees?: Array<Record<string, unknown>> };
  const employees = (body.employees ?? []).map((e) => ({
    id: String(e.id ?? ''),
    name: String(e.displayName ?? [e.firstName, e.lastName].filter(Boolean).join(' ')),
    supervisor: String(e.supervisor ?? ''),
  }));

  const needle = fold(search.trim());
  const matches = needle
    ? employees.filter((e) => fold(e.name).includes(needle))
    : employees.filter((e) => employees.some((o) => o.supervisor === e.name));

  const candidates = matches
    .map((e) => ({
      id: e.id,
      name: e.name,
      reports: employees.filter((o) => o.supervisor === e.name).length,
    }))
    .sort((a, b) => b.reports - a.reports)
    .slice(0, 8);

  if (candidates.length === 0) {
    return {
      ok: false,
      problem: needle
        ? `Nobody in the directory matches "${search}".`
        : 'Nobody in the directory has direct reports.',
      hint: 'Try your surname.',
    };
  }

  return {
    ok: true,
    detail: `The key works — ${employees.length} people in the directory.`,
    candidates,
  };
}

export async function saveBambooAction(
  rawSubdomain: string,
  apiKey: string,
  managerId: string,
): Promise<Check> {
  writeEnv(loadConfig().envPath, {
    BAMBOOHR_SUBDOMAIN: bambooSubdomainOf(rawSubdomain),
    BAMBOOHR_API_KEY: apiKey.trim(),
    BAMBOOHR_MANAGER_EMPLOYEE_ID: managerId.trim(),
    BAMBOOHR_MAX_AGE: '3600',
    BAMBOOHR_INBOX_MAX_AGE: '300',
  });
  configChanged();
  return { ok: true, detail: 'BambooHR is connected.' };
}

export async function checkGithubAction(
  token: string,
  login: string,
  repos: string,
): Promise<Check> {
  const list = repos
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
  if (!token.trim() || !login.trim())
    return { ok: false, problem: 'The token and your handle are both needed.' };
  if (list.length === 0)
    return { ok: false, problem: 'List at least one repository, as owner/name.' };

  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token.trim()}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'meridian',
  };

  const reachable: string[] = [];
  const refused: string[] = [];
  for (const repo of list) {
    try {
      const response = await logged(
        `https://api.github.com/repos/${repo}`,
        { method: 'GET', headers, signal: AbortSignal.timeout(20_000) },
        'api.github.com',
      );
      if (response.status === 401) {
        return {
          ok: false,
          problem: 'GitHub rejected the token.',
          hint: 'It needs Pull requests: read-only.',
        };
      }
      response.ok ? reachable.push(repo) : refused.push(repo);
    } catch {
      refused.push(repo);
    }
  }

  if (reachable.length === 0) {
    return {
      ok: false,
      problem: `The token cannot reach ${refused.join(', ')}.`,
      hint: 'A fine-grained token has to list each repository explicitly.',
    };
  }

  writeEnv(loadConfig().envPath, {
    GITHUB_TOKEN: token.trim(),
    GITHUB_LOGIN: login.trim(),
    GITHUB_REPOS: reachable.join(','),
  });
  configChanged();

  return {
    ok: true,
    detail:
      `Reading ${reachable.length} ${reachable.length === 1 ? 'repository' : 'repositories'}.` +
      (refused.length ? ` Could not reach ${refused.join(', ')} — left out.` : ''),
  };
}

/**
 * The calendar, checked before a single value is written down.
 *
 * Four values that are wrong in four different ways, and the check separates
 * them: the refresh token exchange proves the client and the token fit together,
 * and the calendar list proves the id is one this account can actually read. A
 * wrong id is named back with the ones that would have worked, which is the
 * failure people actually hit.
 *
 * Nothing is saved until all four are good, so a half-typed attempt cannot leave
 * the app looking configured.
 */
export async function checkCalendarAction(
  rawClientId: string,
  rawClientSecret: string,
  rawRefreshToken: string,
  rawCalendarId: string,
): Promise<Check> {
  const clientId = rawClientId.trim();
  const clientSecret = rawClientSecret.trim();
  const refreshToken = rawRefreshToken.trim();
  const calendarId = rawCalendarId.trim();

  if (!clientId || !clientSecret || !refreshToken || !calendarId) {
    return { ok: false, problem: 'All four are needed.' };
  }
  if (!clientId.endsWith('.apps.googleusercontent.com')) {
    return {
      ok: false,
      problem: 'That does not look like a Google client ID.',
      hint: 'It ends in .apps.googleusercontent.com',
    };
  }

  let calendars: CalendarChoice[];
  try {
    const token = await accessToken(clientId, clientSecret, refreshToken);
    calendars = await listCalendars(token);
  } catch (err) {
    return { ok: false, problem: (err as Error).message };
  }

  const chosen = calendars.find((calendar) => calendar.id === calendarId);
  if (!chosen) {
    const others = calendars.slice(0, 3).map((calendar) => calendar.id);
    return {
      ok: false,
      problem: `That account cannot read ${calendarId}.`,
      hint: others.length
        ? `It can read ${others.join(', ')}${calendars.length > others.length ? ', and others' : ''}.`
        : 'It can read no calendars at all.',
    };
  }

  writeEnv(loadConfig().envPath, {
    GOOGLE_CLIENT_ID: clientId,
    GOOGLE_CLIENT_SECRET: clientSecret,
    GOOGLE_REFRESH_TOKEN: refreshToken,
    GOOGLE_CALENDAR_ID: calendarId,
    CALENDAR_MAX_AGE: '300',
  });
  configChanged();

  return {
    ok: true,
    detail: `Reading ${chosen.summary}${chosen.primary ? ', your own calendar' : ''}.`,
  };
}

export async function skipStepAction(): Promise<Check> {
  configChanged();
  return { ok: true, detail: 'Skipped. You can connect it later from Settings.' };
}

/** What is configured, with no secret ever leaving this process. */
export async function setupStateAction(): Promise<{
  vault: string | null;
  bamboo: boolean;
  calendar: boolean;
  github: boolean;
  envPrivate: boolean;
}> {
  const config = loadConfig();
  return {
    vault: config.vaultPath,
    bamboo: Boolean(config.bamboo),
    calendar: Boolean(config.calendar),
    github: Boolean(config.github),
    envPrivate: !config.envModeWarning,
  };
}
