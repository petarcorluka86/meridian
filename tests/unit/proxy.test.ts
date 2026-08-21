import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { proxy } from '@/proxy';

/**
 * This is the control that stops a website the user is browsing from driving
 * this server through their browser. Binding to 127.0.0.1 does not do it: a page
 * on any origin can point a hostname at 127.0.0.1 and issue requests, and the
 * only thing that tells the two apart is the Host header. It had no test.
 */

const URL_ = 'http://127.0.0.1:3210/tasks';

function request(headers: Record<string, string>, method = 'GET'): NextRequest {
  return new NextRequest(URL_, { method, headers });
}

/** The middleware lets a request through by returning a 200 that carries headers. */
function allowed(headers: Record<string, string>, method = 'GET'): boolean {
  return proxy(request(headers, method)).status === 200;
}

describe('Host check — DNS rebinding', () => {
  it('allows the hosts the app is actually served on', () => {
    expect(allowed({ host: '127.0.0.1:3210' })).toBe(true);
    expect(allowed({ host: 'localhost:3210' })).toBe(true);
    expect(allowed({ host: '[::1]:3210' })).toBe(true);
    // A port is not required.
    expect(allowed({ host: '127.0.0.1' })).toBe(true);
    expect(allowed({ host: 'localhost' })).toBe(true);
  });

  it('refuses a foreign host', () => {
    expect(allowed({ host: 'evil.com' })).toBe(false);
    expect(allowed({ host: 'evil.com:3210' })).toBe(false);
  });

  it('refuses a host that merely contains an allowed one', () => {
    // The rebinding payload: a name the attacker controls, resolving to 127.0.0.1.
    expect(allowed({ host: 'localhost.evil.com' })).toBe(false);
    expect(allowed({ host: '127.0.0.1.evil.com' })).toBe(false);
    expect(allowed({ host: 'notlocalhost' })).toBe(false);
    expect(allowed({ host: 'evil-localhost' })).toBe(false);
    expect(allowed({ host: 'localhostx:3210' })).toBe(false);
  });

  it('refuses a missing or empty Host', () => {
    expect(allowed({})).toBe(false);
    expect(allowed({ host: '' })).toBe(false);
  });

  it('refuses an IPv6 loopback that is not the bracketed form', () => {
    // Fail closed: an address the app is never served on is refused rather than
    // parsed generously.
    expect(allowed({ host: '::1' })).toBe(false);
    expect(allowed({ host: '[::ffff:127.0.0.1]:3210' })).toBe(false);
  });

  it('refuses a port that is not a port', () => {
    // Host is host[:port]. Splitting on the last colon and trusting the left half
    // would read "localhost:3210.evil.com" as localhost.
    expect(allowed({ host: 'localhost:3210.evil.com' })).toBe(false);
    expect(allowed({ host: '127.0.0.1:evil' })).toBe(false);
    expect(allowed({ host: 'localhost:' })).toBe(false);
  });

  it('applies the Host check to every method, not only reads', () => {
    expect(allowed({ host: 'evil.com' }, 'POST')).toBe(false);
    expect(allowed({ host: 'evil.com' }, 'HEAD')).toBe(false);
  });
});

describe('cross-origin mutations', () => {
  const host = { host: '127.0.0.1:3210' };

  it('allows a mutation the app itself made', () => {
    expect(allowed({ ...host, 'sec-fetch-site': 'same-origin' }, 'POST')).toBe(true);
    expect(allowed({ ...host, origin: 'http://127.0.0.1:3210' }, 'POST')).toBe(true);
    expect(allowed({ ...host, origin: 'http://localhost:3210' }, 'POST')).toBe(true);
  });

  it('refuses a mutation from another site', () => {
    expect(allowed({ ...host, 'sec-fetch-site': 'cross-site' }, 'POST')).toBe(false);
    expect(allowed({ ...host, 'sec-fetch-site': 'same-site' }, 'POST')).toBe(false);
    expect(allowed({ ...host, origin: 'http://evil.com' }, 'POST')).toBe(false);
    expect(allowed({ ...host, origin: 'https://localhost.evil.com' }, 'POST')).toBe(false);
  });

  it('refuses a mutation that vouches for itself with neither header', () => {
    // A browser sends Sec-Fetch-Site on every request and Origin on every
    // cross-origin one. A POST carrying neither did not come from a browser this
    // app has any reason to trust, so it is refused rather than waved through.
    expect(allowed(host, 'POST')).toBe(false);
    expect(allowed(host, 'DELETE')).toBe(false);
    expect(allowed({ ...host, origin: 'not a url' }, 'POST')).toBe(false);
  });

  it('lets a mutation through when only one of the two vouches for it', () => {
    // Sec-Fetch-Site: none is a user-initiated navigation, which carries no Origin.
    expect(allowed({ ...host, 'sec-fetch-site': 'none' }, 'POST')).toBe(true);
  });

  it('never lets an Origin override a refusing Sec-Fetch-Site', () => {
    expect(
      allowed({ ...host, 'sec-fetch-site': 'cross-site', origin: 'http://127.0.0.1:3210' }, 'POST'),
    ).toBe(false);
  });

  it('leaves reads alone', () => {
    // Reading is not the risk; a cross-site read of a page it cannot see is not
    // worth refusing, and GET is where the whole UI lives.
    expect(allowed({ ...host, 'sec-fetch-site': 'cross-site' })).toBe(true);
    expect(allowed({ ...host, 'sec-fetch-site': 'cross-site' }, 'HEAD')).toBe(true);
  });
});

describe('the route header the layout reads', () => {
  it('reports the real path', () => {
    const response = proxy(request({ host: '127.0.0.1:3210' }));
    expect(response.headers.get('x-middleware-override-headers')).toContain('x-meridian-path');
    expect(response.headers.get('x-middleware-request-x-meridian-path')).toBe('/tasks');
  });

  it('overwrites one the client supplied', () => {
    // The layout decides from this header whether to render the setup panel. A
    // page that could set it could hide the panel.
    const response = proxy(request({ host: '127.0.0.1:3210', 'x-meridian-path': '/help' }));
    expect(response.headers.get('x-middleware-request-x-meridian-path')).toBe('/tasks');
  });
});
