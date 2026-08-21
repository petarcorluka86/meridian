import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { now } from '@/lib/clock';
import {
  CACHE_DIR,
  FixtureVaultError,
  safeVaultPath,
  vaultIsInsideApp,
  vaultRoot,
} from '@/lib/vault/paths';

export type SourceName = 'bamboohr' | 'calendar' | 'github';

/**
 * Live data is cached so a page paints instantly and offline. It lives in
 * .cache/, which is git-ignored — nothing fetched is ever written into the vault
 * proper, so no pay figure can reach a remote through a commit.
 */
export const CacheEnvelope = z.object({
  fetchedAt: z.string(),
  etag: z.string().nullable().default(null),
  data: z.unknown().optional(),
});

export type Freshness =
  | { state: 'live'; fetchedAt: string; age: string }
  | { state: 'stale'; fetchedAt: string; ageLabel: string; age: string }
  | { state: 'missing' }
  | { state: 'unconfigured' }
  | {
      state: 'failed';
      fetchedAt: string | null;
      ageLabel: string | null;
      age: string | null;
      message: string;
    };

export function cachePath(source: SourceName): string {
  return `${CACHE_DIR}/${source}.json`;
}

export function readCache<T>(
  source: SourceName,
  schema: z.ZodType<T>,
): {
  data: T | null;
  fetchedAt: string | null;
  etag: string | null;
} {
  let raw: string;
  try {
    raw = fs.readFileSync(safeVaultPath(cachePath(source)), 'utf8');
  } catch {
    return { data: null, fetchedAt: null, etag: null };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // A corrupt cache is disposable — treat it as absent rather than a problem the
    // user has to fix. It will be rewritten on the next successful fetch.
    return { data: null, fetchedAt: null, etag: null };
  }

  const envelope = parsed as { fetchedAt?: string; etag?: string | null };
  const result = schema.safeParse(parsed);
  return {
    data: result.success ? result.data : null,
    fetchedAt: typeof envelope?.fetchedAt === 'string' ? envelope.fetchedAt : null,
    etag: typeof envelope?.etag === 'string' ? envelope.etag : null,
  };
}

export function writeCache(source: SourceName, payload: Record<string, unknown>): void {
  // The last line of defence. Every sync checks first and refuses politely; this
  // one throws, because reaching it means a new code path found its way here.
  if (vaultIsInsideApp()) throw new FixtureVaultError();
  const abs = safeVaultPath(cachePath(source));
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  // Not the vault write path: the cache is disposable, needs no snapshot, and a
  // torn write costs nothing because the next fetch replaces it.
  const tmp = `${abs}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`);
  fs.renameSync(tmp, abs);
}

/**
 * Why a source last failed, if it has since it last succeeded.
 *
 * `Freshness` has had a `failed` variant with a message from the first commit,
 * and the pill has always known how to draw it — nothing ever constructed one.
 * So an expired API key looked exactly like a slow one: the pill aged, the
 * numbers stopped moving, and nothing anywhere said why. The five empty
 * `catch { /* keep the cache *​/ }` blocks were the whole story.
 */
const FAILURES = `${CACHE_DIR}/failures.json`;

const Failures = z.record(z.string(), z.object({ at: z.string(), message: z.string() }));

function readFailures(): Record<string, { at: string; message: string }> {
  try {
    const raw = fs.readFileSync(safeVaultPath(FAILURES), 'utf8');
    const parsed = Failures.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

function writeFailures(all: Record<string, { at: string; message: string }>): void {
  if (vaultIsInsideApp()) return;
  try {
    const abs = safeVaultPath(FAILURES);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    const tmp = `${abs}.tmp.${process.pid}`;
    fs.writeFileSync(tmp, `${JSON.stringify(all, null, 2)}\n`);
    fs.renameSync(tmp, abs);
  } catch {
    // Recording why something failed must not itself become a failure.
  }
}

/** Copy the user reads, not the exception text. */
export function noteFailure(source: SourceName, message: string): void {
  writeFailures({ ...readFailures(), [source]: { at: new Date(now()).toISOString(), message } });
}

export function clearFailure(source: SourceName): void {
  const all = readFailures();
  if (!(source in all)) return;
  delete all[source];
  writeFailures(all);
}

export function failureOf(source: SourceName): { at: string; message: string } | null {
  return readFailures()[source] ?? null;
}

/**
 * The age as the sync badge shows it: a number and a unit, nothing else.
 *
 * Computed here rather than in the badge because the badge runs in the browser,
 * and a relative time worked out from the visitor's clock disagrees with the
 * server's — which is a hydration mismatch, and on this screen also a lie about
 * how fresh the numbers are.
 */
export function shortAge(fetchedAt: string, at = now()): string {
  const minutes = Math.floor((at - new Date(fetchedAt).getTime()) / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function ageLabel(fetchedAt: string, at = now()): string {
  const ms = at - new Date(fetchedAt).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m old`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h old`;
  const days = Math.floor(hours / 24);
  return `${days}d old`;
}

/**
 * A source is stale once past its window. Stale always names the age, so an old
 * number never poses as a current one.
 */
export function freshnessOf(
  fetchedAt: string | null,
  maxAgeSeconds: number,
  configured: boolean,
  at = now(),
  failure: { at: string; message: string } | null = null,
): Freshness {
  if (!configured) return { state: 'unconfigured' };

  // A failure only counts while it is the most recent thing that happened. A
  // later success means whatever it was is over.
  if (failure && (!fetchedAt || failure.at > fetchedAt)) {
    return {
      state: 'failed',
      fetchedAt,
      ageLabel: fetchedAt ? ageLabel(fetchedAt, at) : null,
      age: fetchedAt ? shortAge(fetchedAt, at) : null,
      message: failure.message,
    };
  }

  if (!fetchedAt) return { state: 'missing' };
  const age = at - new Date(fetchedAt).getTime();
  if (age <= maxAgeSeconds * 1000) {
    return { state: 'live', fetchedAt, age: shortAge(fetchedAt, at) };
  }
  return {
    state: 'stale',
    fetchedAt,
    ageLabel: ageLabel(fetchedAt, at),
    age: shortAge(fetchedAt, at),
  };
}

/** Photos are served from disk so no avatar is ever fetched by the browser. */
export function photoPath(slug: string): string | null {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    const rel = `${CACHE_DIR}/photos/${slug}.${ext}`;
    try {
      if (fs.existsSync(path.join(vaultRoot(), rel))) return rel;
    } catch {
      return null;
    }
  }
  return null;
}
