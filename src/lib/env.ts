/*
 * Turbopack warns that a computed path makes it trace the whole project into the
 * build output. That matters when the output is a serverless bundle with a size
 * limit; this app is started from its own folder with `next start`, and the paths
 * are computed because they are the user's — VAULT_PATH and the location of
 * .env are configuration, not constants. Opted out per call, so a future one has
 * to say the same thing on purpose.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type EnvProblem = { key: string; message: string };

/**
 * Which of the two palettes the app paints in, or `system` to take the
 * machine's own answer. It lives in .env rather than in the vault because it is
 * a fact about this screen, not about the team: the vault is committed and
 * shared, and a theme that travelled with it would follow the notes onto
 * somebody else's Mac.
 *
 * Light is the default rather than `system`, deliberately: this app is a light
 * app that has a dark scheme, and which one it opens in is a choice somebody
 * makes here rather than one their Mac makes for them at sunset. `system` is one
 * of the three, and picking it is how you hand the decision back.
 */
export type Theme = 'system' | 'light' | 'dark';

export const THEMES = ['system', 'light', 'dark'] as const satisfies readonly Theme[];

function themeOf(raw: string): Theme {
  // Anything else is the default. A hand-typed value is worth ignoring rather
  // than blocking on: the wrong colour scheme is not a reason to refuse to open,
  // and the Settings screen shows which one is actually in force.
  return (THEMES as readonly string[]).includes(raw) ? (raw as Theme) : 'light';
}

function expandHome(p: string): string {
  return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;
}

/**
 * The inverse, and it lives beside its opposite rather than being written out
 * again per screen: a path shown to the reader wears the `~` they typed.
 */
export function tildeHome(p: string): string {
  const home = os.homedir();
  return p.startsWith(home) ? `~${p.slice(home.length)}` : p;
}

/**
 * The app builds the BambooHR hostname itself, so the subdomain is the bare
 * company name. People reasonably paste the whole host or a full URL, and the
 * resulting 403 says nothing useful — normalise instead of failing obscurely.
 */
export function bambooSubdomainOf(raw: string): string {
  return raw
    .replace(/^https?:\/\//i, '')
    .replace(/\.bamboohr\.com.*$/i, '')
    .replace(/\/.*$/, '')
    .trim();
}

/**
 * Parsed here rather than pulled from a package so nothing about it is
 * surprising: KEY=value, # comments, no interpolation, no multiline.
 *
 * The file is hand-editable, and the setup wizard also writes it through
 * lib/env-write.ts — which is why the parser and the writer have to agree on
 * exactly this much syntax and no more. Anything a parser accepts that the
 * writer does not preserve is a key somebody loses on their next save.
 */
function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    const hash = value.indexOf(' #');
    if (hash >= 0) value = value.slice(0, hash).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

export type Config = {
  envPath: string;
  theme: Theme;
  envExists: boolean;
  /** Mode is not 0600. A warning, never fatal — the app still opens. */
  envModeWarning: string | null;
  vaultPath: string | null;
  bamboo: {
    subdomain: string;
    apiKey: string;
    managerId: string;
    maxAge: number;
    inboxMaxAge: number;
    /**
     * Where this tenant keeps pay. BambooHR's standard `compensation` table is
     * the default and is what most companies use; some keep it in a custom table
     * instead, in which case its name and the three fields are configured here.
     */
    comp: {
      table: string;
      dateField: string;
      amountField: string;
      grossField: string | null;
    };
  } | null;
  /**
   * Google, and only Google, signed in to rather than addressed by a secret URL.
   * Its token refresh is the one POST this app makes — permitted by exact URL,
   * see TOKEN_ENDPOINT in lib/sources/calendar.ts.
   *
   * There used to be a second shape here: a secret iCal address, which is a
   * credential in the form of a URL. Company Workspace accounts usually have
   * those switched off, and an address that never expires and cannot be scoped
   * is the wrong thing to keep for an account somebody else administers.
   */
  calendar: {
    clientId: string;
    clientSecret: string;
    calendarId: string;
    refreshToken: string;
    maxAge: number;
  } | null;
  github: { token: string; login: string; repos: string[]; maxAge: number } | null;
  problems: EnvProblem[];
};

/**
 * Where the credentials live. One function, because two places computed it
 * independently and would have drifted.
 *
 * MERIDIAN_ENV_PATH exists so a test can load a config that is not the
 * developer's own .env — without it, every test touching loadConfig() reads
 * whatever happens to be on the machine and passes or fails accordingly.
 */
export function envFilePath(): string {
  return process.env.MERIDIAN_ENV_PATH || path.join(process.cwd(), '.env');
}

let cached: Config | null = null;

export function loadConfig(): Config {
  if (cached) return cached;

  const envPath = envFilePath();
  const problems: EnvProblem[] = [];
  let envExists = false;
  let envModeWarning: string | null = null;
  let raw: Record<string, string> = {};

  try {
    const stat = fs.statSync(/* turbopackIgnore: true */ envPath);
    envExists = true;
    const mode = stat.mode & 0o777;
    if (mode !== 0o600) {
      envModeWarning = `.env is mode ${mode.toString(8)}; it holds credentials and should be 600. Run: chmod 600 .env`;
    }
    raw = parseEnvFile(fs.readFileSync(/* turbopackIgnore: true */ envPath, 'utf8'));
  } catch {
    problems.push({
      key: '.env',
      message: 'No .env found. Copy .env.example and fill in what you have.',
    });
  }

  const get = (k: string) => (process.env[k] ?? raw[k] ?? '').trim();

  const vaultRaw = get('VAULT_PATH');
  const vaultPath = vaultRaw ? path.resolve(expandHome(vaultRaw)) : null;
  if (!vaultPath) {
    problems.push({ key: 'VAULT_PATH', message: 'Meridian has no vault yet.' });
  }

  const all = (...keys: string[]) => keys.every((k) => get(k).length > 0);

  cached = {
    envPath,
    theme: themeOf(get('MERIDIAN_THEME')),
    envExists,
    envModeWarning,
    vaultPath,
    bamboo: all('BAMBOOHR_SUBDOMAIN', 'BAMBOOHR_API_KEY', 'BAMBOOHR_MANAGER_EMPLOYEE_ID')
      ? {
          subdomain: bambooSubdomainOf(get('BAMBOOHR_SUBDOMAIN')),
          apiKey: get('BAMBOOHR_API_KEY'),
          managerId: get('BAMBOOHR_MANAGER_EMPLOYEE_ID'),
          maxAge: Number(get('BAMBOOHR_MAX_AGE')) || 3600,
          // Approvals and absences are "what needs me today" data, so they get
          // their own short window — the roster and pay tables change rarely and
          // would be wasteful to refetch at the same rate.
          inboxMaxAge: Number(get('BAMBOOHR_INBOX_MAX_AGE')) || 300,
          comp: {
            table: get('BAMBOOHR_COMP_TABLE') || 'compensation',
            // Only consulted for a custom table; the standard one has its own
            // shape and is parsed by name.
            dateField: get('BAMBOOHR_COMP_DATE_FIELD') || 'customDate1',
            amountField: get('BAMBOOHR_COMP_AMOUNT_FIELD') || 'customTotal1',
            grossField: get('BAMBOOHR_COMP_GROSS_FIELD') || 'customGrosssalary',
          },
        }
      : null,
    // All four, or nothing: a client with no refresh token is a sign-in that was
    // started and not finished, and the calendar is not connected until it is.
    calendar: all(
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GOOGLE_CALENDAR_ID',
      'GOOGLE_REFRESH_TOKEN',
    )
      ? {
          clientId: get('GOOGLE_CLIENT_ID'),
          clientSecret: get('GOOGLE_CLIENT_SECRET'),
          calendarId: get('GOOGLE_CALENDAR_ID'),
          refreshToken: get('GOOGLE_REFRESH_TOKEN'),
          maxAge: Number(get('CALENDAR_MAX_AGE')) || 300,
        }
      : null,
    github: all('GITHUB_TOKEN', 'GITHUB_LOGIN')
      ? {
          token: get('GITHUB_TOKEN'),
          login: get('GITHUB_LOGIN'),
          repos: get('GITHUB_REPOS')
            .split(',')
            .map((r) => r.trim())
            .filter(Boolean),
          maxAge: Number(get('GITHUB_MAX_AGE')) || 300,
        }
      : null,
    problems,
  };

  return cached;
}

/**
 * The raw .env values, bypassing the all-or-nothing grouping in loadConfig().
 * Needed by setup scripts that run before every key of a group is filled in.
 */
export function rawEnv(key: string): string {
  const envPath = envFilePath();
  try {
    return (
      process.env[key] ??
      parseEnvFile(fs.readFileSync(/* turbopackIgnore: true */ envPath, 'utf8'))[key] ??
      ''
    ).trim();
  } catch {
    return (process.env[key] ?? '').trim();
  }
}

/** Tests and the CLI need to re-read after writing a different .env. */
export function resetConfig(): void {
  cached = null;
}
