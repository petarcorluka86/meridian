import { NextResponse, type NextRequest } from 'next/server';

/**
 * Binding to 127.0.0.1 stops another machine reaching the app. It does not stop a
 * website the user is browsing from pointing a hostname at 127.0.0.1 and driving
 * this server through their browser — DNS rebinding. Only a Host check does that.
 */
const ALLOWED_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

/**
 * Host is `host` or `host:port`, and the port has to be digits. Splitting on the
 * last colon and trusting whatever is to the left of it reads
 * `localhost:3210.evil.com` as `localhost`.
 */
function hostnameOf(header: string | null): string | null {
  if (!header) return null;

  if (header.startsWith('[')) {
    const close = header.indexOf(']');
    if (close < 0) return null;
    return isPort(header.slice(close + 1)) ? header.slice(0, close + 1) : null;
  }

  const colon = header.lastIndexOf(':');
  if (colon < 0) return header;
  if (colon === 0) return null;
  return isPort(header.slice(colon)) ? header.slice(0, colon) : null;
}

/** Either nothing, or a colon followed by digits. */
function isPort(rest: string): boolean {
  return rest === '' || /^:\d+$/.test(rest);
}

function originHostOf(origin: string): string | null {
  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const host = hostnameOf(request.headers.get('host'));
  if (!host || !ALLOWED_HOSTS.has(host)) {
    return new NextResponse('Forbidden host', { status: 403 });
  }

  // Mutations must come from this app's own origin, and must say so. A browser
  // sends Sec-Fetch-Site on every request and Origin on every cross-origin one,
  // so a mutation carrying neither did not come from one — refused rather than
  // waved through for want of evidence.
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const site = request.headers.get('sec-fetch-site');
    const origin = request.headers.get('origin');

    // `none` is a user-initiated navigation, which carries no Origin.
    const siteVouches = site === 'same-origin' || site === 'none';
    const originHost = origin === null ? null : originHostOf(origin);
    const originVouches = originHost !== null && ALLOWED_HOSTS.has(originHost);

    const refused =
      (site !== null && !siteVouches) ||
      (origin !== null && !originVouches) ||
      (!siteVouches && !originVouches);

    if (refused) {
      return new NextResponse('Cross-origin request refused', { status: 403 });
    }
  }

  // The layout renders the setup panel for every route except Help, and a
  // layout cannot otherwise see which route it is rendering.
  const headers = new Headers(request.headers);
  headers.set('x-meridian-path', request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: '/((?!_next/static|_next/image|favicon.ico).*)' };
