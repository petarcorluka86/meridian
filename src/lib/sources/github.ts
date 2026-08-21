import { FixtureVaultError, vaultIsInsideApp } from '@/lib/vault/paths';
import { z } from 'zod';
import { now } from '@/lib/clock';
import { loadConfig } from '@/lib/env';
import { failureOf, freshnessOf, readCache, type Freshness, writeCache } from './cache';
import { logEgress } from './egress';

export const GithubCache = z.object({
  fetchedAt: z.string(),
  etag: z.string().nullable().default(null),
  pullRequests: z
    .array(
      z.object({
        id: z.number(),
        repo: z.string(),
        number: z.number(),
        title: z.string(),
        url: z.string(),
        author: z.string(),
        /** Filled in when the author matches someone on your roster. */
        personSlug: z.string().nullable().default(null),
        changedFiles: z.number().default(0),
        additions: z.number().default(0),
        deletions: z.number().default(0),
        openedAt: z.string(),
        draft: z.boolean().default(false),
      }),
    )
    .default([]),
});

export type GithubCache = z.infer<typeof GithubCache>;
export type GithubRead = { data: GithubCache | null; freshness: Freshness };

export function readGithub(): GithubRead {
  const config = loadConfig();
  const { data, fetchedAt } = readCache('github', GithubCache);
  return {
    data,
    // Pull requests move by the minute, so this shares the short window.
    freshness: freshnessOf(
      fetchedAt,
      config.github?.maxAge ?? 300,
      Boolean(config.github),
      undefined,
      failureOf('github'),
    ),
  };
}

/** The single outbound function for GitHub. GET only, like every other source. */
async function githubGet(token: string, path: string): Promise<unknown> {
  const url = `https://api.github.com${path}`;
  const started = Date.now();
  let status = 0;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'meridian',
      },
      signal: AbortSignal.timeout(20_000),
    });
    status = response.status;
    if (response.status === 401) throw new Error('GitHub rejected the token.');
    if (response.status === 403) {
      throw new Error('GitHub refused the request — the token may lack access to that repository.');
    }
    if (response.status === 404)
      throw new Error('Repository not found, or the token cannot see it.');
    if (!response.ok) throw new Error(`GitHub returned ${response.status}.`);
    return await response.json();
  } finally {
    logEgress({ method: 'GET', host: 'api.github.com', path, status, ms: Date.now() - started });
  }
}

const PullListItem = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  html_url: z.string(),
  draft: z.boolean().default(false),
  created_at: z.string(),
  user: z.object({ login: z.string() }).nullable().default(null),
  requested_reviewers: z.array(z.object({ login: z.string() })).default([]),
  requested_teams: z.array(z.object({ slug: z.string() })).default([]),
});

const PullDetail = z.object({
  changed_files: z.number().default(0),
  additions: z.number().default(0),
  deletions: z.number().default(0),
});

function parseRows<T>(raw: unknown, schema: z.ZodType<T>): T[] {
  if (!Array.isArray(raw)) return [];
  const out: T[] = [];
  for (const row of raw) {
    const result = schema.safeParse(row);
    if (result.success) out.push(result.data);
  }
  return out;
}

/**
 * Maps a GitHub login to someone on the roster by looking for a github.com link
 * on their profile — the data is already there, and guessing from names would
 * be wrong more often than it was right.
 */
export function githubLoginToSlug(links: Map<string, { url: string }[]>): Map<string, string> {
  const out = new Map<string, string>();
  for (const [slug, entries] of links) {
    for (const entry of entries) {
      const match = /^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9-]+)\/?$/i.exec(
        entry.url.trim(),
      );
      if (match?.[1]) out.set(match[1].toLowerCase(), slug);
    }
  }
  return out;
}

export type PullRequest = GithubCache['pullRequests'][number];

export type SyncGithubResult = { pullRequests: number; warnings: string[] };

/**
 * Pull requests waiting on your review, across the repositories listed in .env.
 *
 * Per-repo rather than the search API: a fine-grained token is scoped to named
 * repositories, and search would need broader access than this needs.
 */
export async function syncGithub(loginToSlug: Map<string, string>): Promise<SyncGithubResult> {
  if (vaultIsInsideApp()) throw new FixtureVaultError();

  const config = loadConfig();
  if (!config.github) throw new Error('GitHub is not connected.');
  const { token, login, repos } = config.github;
  if (repos.length === 0) throw new Error('No repositories listed yet. Set GITHUB_REPOS in .env.');

  const me = login.toLowerCase();
  const pullRequests: GithubCache['pullRequests'] = [];
  const warnings: string[] = [];

  for (const repo of repos) {
    let list: z.infer<typeof PullListItem>[];
    try {
      list = parseRows(
        await githubGet(token, `/repos/${repo}/pulls?state=open&per_page=100`),
        PullListItem,
      );
    } catch (err) {
      // One unreachable repository must not lose the others.
      warnings.push(`${repo}: ${(err as Error).message}`);
      continue;
    }

    const mine = list.filter((pr) =>
      pr.requested_reviewers.some((r) => r.login.toLowerCase() === me),
    );

    for (const pr of mine) {
      let detail = { changed_files: 0, additions: 0, deletions: 0 };
      try {
        detail = PullDetail.parse(await githubGet(token, `/repos/${repo}/pulls/${pr.number}`));
      } catch {
        // Losing the line counts must not lose the pull request.
      }
      const author = pr.user?.login ?? 'unknown';
      pullRequests.push({
        id: pr.id,
        repo,
        number: pr.number,
        title: pr.title,
        url: pr.html_url,
        author,
        personSlug: loginToSlug.get(author.toLowerCase()) ?? null,
        changedFiles: detail.changed_files,
        additions: detail.additions,
        deletions: detail.deletions,
        openedAt: pr.created_at,
        draft: pr.draft,
      });
    }
  }

  // Oldest first: the one you have been blocking longest is the one that matters.
  pullRequests.sort((a, b) => a.openedAt.localeCompare(b.openedAt));

  writeCache('github', { fetchedAt: new Date().toISOString(), etag: null, pullRequests });
  return { pullRequests: pullRequests.length, warnings };
}

/** "open 4 days" · "open 6 hours". */
export function openedLabel(openedAt: string, at = now()): string {
  const ms = at - new Date(openedAt).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return 'open just now';
  if (hours < 24) return `open ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  const days = Math.floor(hours / 24);
  return `open ${days} ${days === 1 ? 'day' : 'days'}`;
}
