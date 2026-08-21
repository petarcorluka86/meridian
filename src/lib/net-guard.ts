/**
 * The hard boundary on outbound traffic.
 *
 * Tests and code review can be bypassed by anyone — a person or an agent —
 * writing new code. This wraps the process's own `fetch`, so a request that
 * breaks the rule fails at the moment it is made, regardless of what the calling
 * code believes it is doing.
 *
 * Two rules:
 *   1. Only hosts on the allow-list can be reached at all — on every hop of a
 *      redirect, not only the first one.
 *   2. Only GET. Nothing this app does to an external service is a write.
 *
 * Local requests (Next's own internals, the dev server) are untouched.
 */

/**
 * Exact hosts, plus the suffixes below. Enumerating BambooHR's photo CDN shards
 * (images1..5) would break the day they add a sixth, so the suffix is matched
 * instead — still only BambooHR, and nothing else gets in by accident.
 */
const ALLOWED_HOSTS = new Set([
  'api.bamboohr.com',
  // A read-only iCal feed. Still a GET, so the rule below is unchanged.
  'calendar.google.com',
  // Calendar events, read with a bearer token. GET only.
  'www.googleapis.com',
  // The OAuth token endpoint. Reachable only by a caller that opts in through
  // allowPostTo — the server does not, and must not.
  'oauth2.googleapis.com',
  // Pull requests awaiting review. Read-only; no exception needed.
  'api.github.com',
]);
const ALLOWED_SUFFIXES = ['.bamboohr.com'];

function hostAllowed(hostname: string): boolean {
  if (ALLOWED_HOSTS.has(hostname)) return true;
  return ALLOWED_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]', '0.0.0.0']);

export class OutboundBlockedError extends Error {}

export type GuardOptions = {
  /**
   * Exact URLs that may be POSTed to. There is one, ever: Google's OAuth token
   * endpoint, which the protocol requires to be a POST and which is
   * authentication rather than a write to anyone's data.
   *
   * **The server does pass it**, in `src/instrumentation.ts`, and that is
   * deliberate. The exchange used to run in a separate process so this file
   * could claim the server made no POST at all; a process spawn and a
   * TypeScript compile every five minutes was too much to pay for the smaller
   * claim. What replaces the claim is narrower than a promise:
   * `tests/unit/readonly.test.ts` names the only two files allowed to pass an
   * allowance and fails if a third does, and the check below matches the exact
   * URL rather than the host, so the rest of oauth2.googleapis.com is as closed
   * as the rest of the internet.
   *
   * A second entry here is not a refactor. It is the same decision as adding a
   * host, and needs asking.
   */
  allowPostTo?: string[];
};

let installed = false;

export function installNetGuard(options: GuardOptions = {}): void {
  if (installed) return;
  installed = true;
  const postable = new Set(options.allowPostTo ?? []);

  const original = globalThis.fetch;

  globalThis.fetch = async function guardedFetch(
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    let parsed: URL;
    try {
      parsed = new URL(url, 'http://127.0.0.1');
    } catch {
      throw new OutboundBlockedError(`Refusing a request to an unparseable URL: ${String(url)}`);
    }

    // Anything on this machine is the app talking to itself.
    if (LOCAL_HOSTS.has(parsed.hostname)) return original(input as RequestInfo, init);

    const method = (
      init?.method ??
      (input instanceof Request ? input.method : undefined) ??
      'GET'
    ).toUpperCase();

    if (method !== 'GET') {
      // Exact-URL match, not host: allowing a host would permit every endpoint on it.
      const permitted = method === 'POST' && postable.has(parsed.href);
      if (!permitted) {
        throw new OutboundBlockedError(
          `Blocked a ${method} request to ${parsed.host}. Meridian only ever reads from external ` +
            `services; every integration is read-only. If a new integration genuinely needs a write, ` +
            `that is a product decision, not an implementation detail — it cannot be added here ` +
            `without changing this guard.`,
        );
      }
    }

    if (!hostAllowed(parsed.hostname)) {
      throw new OutboundBlockedError(
        `Blocked a request to ${parsed.host}, which is not on the outbound allow-list in src/lib/net-guard.ts.`,
      );
    }

    return followSafely(original, input, init, parsed, method);
  } as typeof fetch;
}

/**
 * The allow-list has to survive a redirect.
 *
 * `fetch` follows redirects by itself, inside the runtime, and the guard never
 * sees the hops — so any of the five allowed hosts could send a request anywhere
 * and `.cache/egress.log` would record a clean GET to an allowed host. The audit
 * trail would have been accurate and useless.
 *
 * So redirects are taken manually and every hop is checked like the first. A
 * redirect off the allow-list is refused, naming both ends, because that is the
 * interesting thing to see in the error.
 */
const MAX_HOPS = 5;

/**
 * Where a redirect wants to go, or a refusal. Separated from the fetching so the
 * decision can be tested on its own — the hop that matters is the one to a host
 * nobody controls, and that is not a thing to discover in production.
 */
export function nextHop(from: URL, location: string, method: string, status: number): URL {
  let next: URL;
  try {
    next = new URL(location, from.href);
  } catch {
    throw new OutboundBlockedError(
      `Blocked a redirect from ${from.host} to an unparseable location: ${location}`,
    );
  }

  if (!hostAllowed(next.hostname)) {
    throw new OutboundBlockedError(
      `Blocked a redirect from ${from.host} to ${next.host}, which is not on the outbound ` +
        `allow-list in src/lib/net-guard.ts. The allow-list applies to every hop, not only the first.`,
    );
  }

  // 303, and 301/302 in practice, turn the follow-up into a GET. A 307 or 308
  // preserves the method, so a non-GET one is refused rather than reasoned about.
  if (method !== 'GET' && (status === 307 || status === 308)) {
    throw new OutboundBlockedError(
      `Blocked a ${method} redirect from ${from.host} to ${next.host}: a redirect may not carry a non-GET method.`,
    );
  }

  return next;
}

async function followSafely(
  original: typeof fetch,
  input: string | URL | Request,
  init: RequestInit | undefined,
  parsed: URL,
  method: string,
): Promise<Response> {
  let response = await original(input as RequestInfo, { ...init, redirect: 'manual' });
  let from = parsed;

  for (let hop = 0; hop < MAX_HOPS; hop++) {
    if (response.status < 300 || response.status > 399) return response;

    const location = response.headers.get('location');
    if (!location) return response;

    const next = nextHop(from, location, method, response.status);
    from = next;
    response = await original(next.href, {
      ...init,
      method: 'GET',
      body: undefined,
      redirect: 'manual',
    });
  }

  throw new OutboundBlockedError(
    `Blocked a request that redirected more than ${MAX_HOPS} times, ending at ${from.host}.`,
  );
}
