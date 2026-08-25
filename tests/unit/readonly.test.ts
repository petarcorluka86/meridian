import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '../..');
const SRC = path.join(ROOT, 'src');

/**
 * The one POST the whole repo may contain: the OAuth token exchange, which the
 * protocol requires in order to read a Google calendar at all. Anything else,
 * anywhere, fails this file.
 *
 * It used to live in a script so the server could be shown to make no POST at
 * all. It is now in the library, permitted by exact URL, because a process spawn
 * and a TypeScript compile every five minutes was a large price for a smaller
 * claim. The rule is narrower in return: exactly one URL, named here, and the
 * two files allowed to permit it are named too.
 */
const SANCTIONED_POST = {
  file: 'lib/sources/calendar.ts',
  url: 'https://oauth2.googleapis.com/token',
};

/** The only files that may hand the guard a POST allowance. */
const MAY_ALLOW_POST = ['src/instrumentation.ts', 'scripts/calendar-sync.ts'];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = walk(SRC).map((file) => ({
  file: path.relative(SRC, file),
  source: fs.readFileSync(file, 'utf8'),
}));

// Scripts and the MCP server reach the network too, so they are held to the
// same rule — scanning only src/ would leave the obvious hiding place unchecked.
const everything = [
  ...walk(SRC),
  ...walk(path.join(ROOT, 'scripts')),
  ...walk(path.join(ROOT, 'mcp')),
]
  .map((file) => ({ file: path.relative(ROOT, file), source: fs.readFileSync(file, 'utf8') }))
  // The fixture builder is seed data, not networked code: the URLs in it are
  // example links stored in a vault, never fetched by anything.
  .filter(({ file }) => file !== 'scripts/build-fixture-vault.ts');

/**
 * Integrations are read-only in every direction. That is a promise made to the
 * user on the Help screen, so it is enforced here rather than left to review.
 */
describe('outbound requests are read-only', () => {
  it('has exactly one non-GET request in the whole repo', () => {
    const withWrites = files
      .filter(({ source }) => /method:\s*['"`](POST|PUT|PATCH|DELETE)/i.test(source))
      .map(({ file }) => file);
    expect(withWrites).toEqual([SANCTIONED_POST.file]);
  });

  it('aims it at the token endpoint and nothing else', () => {
    const source = files.find((f) => f.file === SANCTIONED_POST.file)!.source;
    // PUT, PATCH and DELETE are never acceptable, anywhere, including here.
    expect(/method:\s*['"`](PUT|PATCH|DELETE)/i.test(source)).toBe(false);
    expect(source).toContain(`export const TOKEN_ENDPOINT = '${SANCTIONED_POST.url}'`);
    // The POST names the constant rather than a URL of its own.
    expect(source).toMatch(/fetch\(TOKEN_ENDPOINT,\s*\{\s*\n?\s*method: 'POST'/);
  });

  it('lets exactly two files permit a POST, and only that one URL', () => {
    const optIns = everything
      .filter(({ file }) => !file.endsWith('net-guard.ts'))
      .filter(({ source }) => /allowPostTo/.test(source))
      .map(({ file }) => file);
    expect(optIns.sort()).toEqual([...MAY_ALLOW_POST].sort());

    // Each permits the named constant, never a literal and never a second entry.
    for (const file of MAY_ALLOW_POST) {
      const source = everything.find((f) => f.file === file)!.source;
      expect(source, file).toContain('allowPostTo: [TOKEN_ENDPOINT]');
      expect(source, file).not.toMatch(/allowPostTo:\s*\[[^\]]*,/);
    }
  });

  it('permits it by exact URL, not by host', () => {
    // A host allowance would open every endpoint on oauth2.googleapis.com.
    const guard = fs.readFileSync(path.join(SRC, 'lib/net-guard.ts'), 'utf8');
    expect(guard).toContain('postable.has(parsed.href)');
  });

  it('makes every other fetch state method: GET explicitly', () => {
    const offenders: string[] = [];
    for (const { file, source } of files) {
      // Each fetch( ... ) call must carry an explicit method within its options.
      const calls = source.split('fetch(').slice(1);
      for (const call of calls) {
        const head = call.slice(0, 400);
        const get = /method:\s*['"`]GET['"`]/.test(head);
        const sanctioned = file === SANCTIONED_POST.file && /method:\s*'POST'/.test(head);
        if (!get && !sanctioned) offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  /**
   * A host the app *fetches* and a host it renders a link to are different
   * risks. Fetching is what the guard governs; a link is something the user
   * chooses to follow. Both are pinned, but separately — conflating them makes
   * the test cry wolf over an ordinary anchor.
   */
  /**
   * Every external host that appears anywhere in the repo, classified. Matching
   * every https:// literal rather than only the ones next to a fetch() means a
   * URL built across a line break, or reached some new way, cannot slip past —
   * it simply lands in the wrong bucket and fails.
   */
  const CONTACTED = [
    'api.bamboohr.com',
    'api.github.com',
    // The OAuth token endpoint, POSTed to by exact URL and nothing else.
    'oauth2.googleapis.com',
    'www.googleapis.com',
  ];

  /**
   * Rendered as links for the user to follow. Never fetched.
   *
   * The two Google ones are where somebody goes to make an OAuth client and to
   * mint a refresh token for it. Which bucket they are in is the point: Meridian
   * shows the addresses and the person visits them, and the guard would refuse
   * either if it ever appeared in a `fetch`.
   */
  const LINKED = ['github.com', 'console.cloud.google.com', 'developers.google.com'];

  /** Appears in source but is never a destination. */
  const NOT_A_DESTINATION = ['www.w3.org', '127.0.0.1', 'localhost'];

  it('contains no external host that has not been accounted for', () => {
    const seen = new Set<string>();
    for (const { source } of everything) {
      for (const match of source.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
        seen.add(match[1]!.toLowerCase());
      }
    }
    const accounted = new Set([...CONTACTED, ...LINKED, ...NOT_A_DESTINATION]);
    const unaccounted = [...seen].filter((h) => !accounted.has(h));
    expect(unaccounted).toEqual([]);
  });

  it('links out to no host that has not been agreed', () => {
    const linked = new Set<string>();
    for (const { source } of files) {
      for (const match of source.matchAll(/href=[{]?[`'"](https?:\/\/[^`'"\s]+)/gi)) {
        const host = match[1]!
          .replace(/^https?:\/\//i, '')
          .split('/')[0]!
          .toLowerCase();
        // Template literals interpolate the configured subdomain.
        if (host.includes('${')) continue;
        linked.add(host);
      }
    }
    expect([...linked].sort()).toEqual([...LINKED].sort());
  });

  it('refuses a BambooHR endpoint that is not a plain path', async () => {
    const { assertPlainEndpoint } = await import('@/lib/sources/bamboohr');
    expect(() => assertPlainEndpoint('employees/directory')).not.toThrow();
    expect(() => assertPlainEndpoint('employees/216?fields=hireDate')).not.toThrow();
    expect(() => assertPlainEndpoint('../../admin')).toThrow();
    expect(() => assertPlainEndpoint('employees/1 HTTP/1.1')).toThrow();
    expect(() => assertPlainEndpoint('https://evil.example.com/')).toThrow();
  });
});

describe('the runtime guard', () => {
  it('blocks every write method, whichever way it is expressed', async () => {
    const { installNetGuard, OutboundBlockedError } = await import('@/lib/net-guard');
    installNetGuard();

    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'post']) {
      await expect(fetch('https://api.bamboohr.com/x', { method })).rejects.toBeInstanceOf(
        OutboundBlockedError,
      );
    }
    await expect(
      fetch(new Request('https://api.bamboohr.com/x', { method: 'POST' })),
    ).rejects.toBeInstanceOf(OutboundBlockedError);
  });

  it('blocks any host that is not allow-listed', async () => {
    const { OutboundBlockedError } = await import('@/lib/net-guard');
    // Every URL here must be refused before a socket is opened, so this test
    // touches the network only if the guard has broken.
    for (const url of [
      'https://evil.example.com/',
      'https://gitlab.com/api/v4/user',
      // Lookalike domains must not pass the suffix check.
      'https://api.bamboohr.com.evil.example/',
      'https://calendar.google.com.evil.example/',
      'https://api.github.com.evil.example/',
    ]) {
      await expect(fetch(url)).rejects.toBeInstanceOf(OutboundBlockedError);
    }
  });

  it('blocks a POST to the token endpoint unless the caller opted in', async () => {
    const { OutboundBlockedError } = await import('@/lib/net-guard');
    // This is how the server installs the guard — with no allowPostTo.
    await expect(
      fetch('https://oauth2.googleapis.com/token', { method: 'POST' }),
    ).rejects.toBeInstanceOf(OutboundBlockedError);
  });
});

/**
 * `fetch` follows redirects inside the runtime, so the guard never saw the hops:
 * any of the five allowed hosts could have sent a request anywhere, and
 * .cache/egress.log would have recorded a clean GET to an allowed host. The
 * audit trail would have been accurate and useless.
 */
describe('the allow-list survives a redirect', () => {
  const from = new URL('https://api.bamboohr.com/api/photo/1');

  it('follows a hop that stays on the allow-list', async () => {
    const { nextHop } = await import('@/lib/net-guard');
    expect(nextHop(from, 'https://images3.bamboohr.com/p/1.jpg', 'GET', 302).host).toBe(
      'images3.bamboohr.com',
    );
    // Relative locations resolve against where they came from.
    expect(nextHop(from, '/api/photo/2', 'GET', 302).href).toBe(
      'https://api.bamboohr.com/api/photo/2',
    );
  });

  it('refuses a hop off it', async () => {
    const { nextHop, OutboundBlockedError } = await import('@/lib/net-guard');
    expect(() => nextHop(from, 'https://evil.example/x', 'GET', 302)).toThrow(OutboundBlockedError);
    // The lookalike suffix trick, on the hop rather than the first request.
    expect(() => nextHop(from, 'https://api.bamboohr.com.evil.example/x', 'GET', 302)).toThrow(
      OutboundBlockedError,
    );
    expect(() => nextHop(from, 'http://169.254.169.254/latest/meta-data/', 'GET', 302)).toThrow(
      OutboundBlockedError,
    );
  });

  it('names both ends, because that is the interesting part', async () => {
    const { nextHop } = await import('@/lib/net-guard');
    expect(() => nextHop(from, 'https://evil.example/x', 'GET', 302)).toThrow(
      /api\.bamboohr\.com to evil\.example/,
    );
  });

  it('refuses a location that will not parse', async () => {
    const { nextHop, OutboundBlockedError } = await import('@/lib/net-guard');
    expect(() => nextHop(from, 'http://', 'GET', 302)).toThrow(OutboundBlockedError);
  });

  it('never lets a redirect carry a non-GET method', async () => {
    const { nextHop, OutboundBlockedError } = await import('@/lib/net-guard');
    const token = new URL('https://oauth2.googleapis.com/token');
    // 307 and 308 preserve the method; the sanctioned POST must not become a
    // POST to somewhere else on the list.
    expect(() => nextHop(token, 'https://www.googleapis.com/x', 'POST', 307)).toThrow(
      OutboundBlockedError,
    );
    expect(() => nextHop(token, 'https://www.googleapis.com/x', 'POST', 308)).toThrow(
      OutboundBlockedError,
    );
    // A 303 is defined to become a GET, so it is allowed through.
    expect(nextHop(token, 'https://www.googleapis.com/x', 'POST', 303).host).toBe(
      'www.googleapis.com',
    );
  });
});

/**
 * The MCP server reads caches and never fills them.
 *
 * Every sync is a GET, so this is not the read-only rule — it is a separate
 * decision, and it is the user's: an agent may not make this app go to the
 * network. It can see that a cache is four hours old and say so; it cannot spend
 * somebody's API quota to make it younger. Refreshing is a person pressing a
 * badge, or the shell's own minute timer.
 *
 * Enforced here because the alternative is remembering. Adding `syncCalendar` to
 * a tool is one import, it type-checks, every other test stays green, and the
 * only thing that changes is that an agent can now reach BambooHR.
 */
describe('the MCP server never goes to the network', () => {
  const OUTBOUND = [
    // The syncs themselves.
    /\bsync[A-Z]\w*/,
    // The Server Actions that call them.
    /\bsyncSourceAction\b/,
    /\brefreshSourcesAction\b/,
    // The layers underneath, in case a tool ever reaches past the syncs.
    /\bbambooGet\b/,
    /\bcachePhoto\b/,
    /\baccessToken\b/,
    /\bfetch\s*\(/,
  ];

  /** Prose may name a sync; code may not. */
  const withoutComments = (source: string) =>
    source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  it('reaches nothing that would make a request', () => {
    const offenders = everything
      .filter(({ file }) => file.startsWith('mcp/'))
      .flatMap(({ file, source }) => {
        const code = withoutComments(source);
        return OUTBOUND.filter((pattern) => pattern.test(code)).map(
          (pattern) => `${file}: ${pattern}`,
        );
      });

    expect(offenders).toEqual([]);
  });
});
