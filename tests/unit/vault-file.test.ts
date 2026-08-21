import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetConfig } from '@/lib/env';

/**
 * The one route handler in the app. It exists so the browser never fetches an
 * avatar from the internet, which means it reads a file off disk at a path the
 * page asked for — the shape of every path-traversal bug ever written. It had no
 * test.
 *
 * Two things are being checked, and the second matters more: that the route's
 * own prefix and extension checks hold, and that safeVaultPath() catches what
 * gets past them. Either alone would be enough on a good day.
 */

let vault: string;
let outside: string;

const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d494844520000000100000001080600000' +
    '01f15c4890000000a49444154789c6300010000050001',
  'hex',
);

async function serve(pathParam: string | null): Promise<Response> {
  const { GET } = await import('@/app/vault-file/route');
  const url = new URL('http://127.0.0.1:3210/vault-file');
  if (pathParam !== null) url.searchParams.set('path', pathParam);
  return GET(new NextRequest(url, { headers: { host: '127.0.0.1:3210' } }));
}

beforeEach(() => {
  vault = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-vaultfile-'));
  outside = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-outside-'));
  fs.mkdirSync(path.join(vault, '.cache', 'photos'), { recursive: true });
  fs.writeFileSync(path.join(vault, '.cache', 'photos', 'ana-horvat.png'), PNG);
  fs.writeFileSync(path.join(vault, '.cache', 'bamboohr.json'), '{"secret":true}');
  fs.mkdirSync(path.join(vault, 'people', 'ana-horvat'), { recursive: true });
  fs.writeFileSync(path.join(vault, 'people', 'ana-horvat', 'about.md'), 'private');
  fs.writeFileSync(path.join(outside, 'passwd'), 'root:x:0:0');
  process.env.VAULT_PATH = vault;
  resetConfig();
});

afterEach(() => {
  fs.rmSync(vault, { recursive: true, force: true });
  fs.rmSync(outside, { recursive: true, force: true });
  delete process.env.VAULT_PATH;
  resetConfig();
});

describe('serving a cached photo', () => {
  it('serves the photo it was asked for, as an image', async () => {
    const response = await serve('.cache/photos/ana-horvat.png');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    // Never as a download, and never in a shared cache.
    expect(response.headers.get('Content-Disposition')).toBe('inline');
    expect(response.headers.get('Cache-Control')).toBe('private, max-age=300');
    expect(Buffer.from(await response.arrayBuffer())).toEqual(PNG);
  });

  it('knows the three image types it serves, whatever the case', async () => {
    for (const [name, type] of [
      ['a.jpg', 'image/jpeg'],
      ['a.jpeg', 'image/jpeg'],
      ['a.webp', 'image/webp'],
      ['A.PNG', 'image/png'],
    ] as const) {
      fs.writeFileSync(path.join(vault, '.cache', 'photos', name), PNG);
      const response = await serve(`.cache/photos/${name}`);
      expect(response.status, name).toBe(200);
      expect(response.headers.get('Content-Type'), name).toBe(type);
    }
  });

  it('is 404, not 403, when the path is fine and the file is not there', async () => {
    // The difference matters: a missing avatar is normal, and should not read as
    // an attempt at something.
    expect((await serve('.cache/photos/nobody.png')).status).toBe(404);
  });

  it('wants a path', async () => {
    expect((await serve(null)).status).toBe(400);
    expect((await serve('')).status).toBe(400);
  });
});

describe('what it refuses to serve', () => {
  const refused = async (rel: string) => (await serve(rel)).status;

  it('refuses anything outside .cache/photos/', async () => {
    expect(await refused('people/ana-horvat/about.md')).toBe(403);
    expect(await refused('.cache/bamboohr.json')).toBe(403);
    expect(await refused('tasks.json')).toBe(403);
    // The prefix is a folder, not a string to start with.
    expect(await refused('.cache/photosecret/a.png')).toBe(403);
    expect(await refused('.cache/photos.png')).toBe(403);
  });

  it('refuses a type it does not serve, even inside the photo folder', async () => {
    fs.writeFileSync(path.join(vault, '.cache', 'photos', 'x.svg'), '<svg onload="alert(1)"/>');
    fs.writeFileSync(path.join(vault, '.cache', 'photos', 'x.html'), '<script>alert(1)</script>');
    // An SVG or an HTML file served inline from this origin runs script against
    // the app. The extension list is what stops that, so it is not a formality.
    expect(await refused('.cache/photos/x.svg')).toBe(403);
    expect(await refused('.cache/photos/x.html')).toBe(403);
    expect(await refused('.cache/photos/x')).toBe(403);
    expect(await refused('.cache/photos/x.png.md')).toBe(403);
  });

  it('refuses a traversal that starts inside the photo folder', async () => {
    // Passes the prefix check and the extension check; safeVaultPath is what
    // catches it.
    expect(await refused('.cache/photos/../../../etc/passwd.png')).toBe(403);
    // Lands back inside the vault, so nothing escaped — but it is not in the
    // photo folder, and the route says it only serves the photo folder.
    expect(await refused('.cache/photos/../bamboohr.json.png')).toBe(403);
    expect(await refused('.cache/photos/./../../people/ana-horvat/about.md.png')).toBe(403);
    expect(await refused(`.cache/photos/..${path.sep}..${path.sep}secret.png`)).toBe(403);
  });

  it('refuses an absolute path', async () => {
    expect(await refused('/etc/passwd.png')).toBe(403);
    expect(await refused(path.join(outside, 'passwd.png'))).toBe(403);
  });

  it('refuses a null byte', async () => {
    expect(await refused('.cache/photos/ana-horvat.png\0.txt')).toBe(403);
  });

  it('refuses a symlink that leaves the vault', async () => {
    // The prefix, the extension and the resolved path all look right. Only
    // realpath tells the truth.
    fs.symlinkSync(path.join(outside, 'passwd'), path.join(vault, '.cache', 'photos', 'link.png'));
    expect(await refused('.cache/photos/link.png')).toBe(403);
  });

  it('follows a symlink that stays inside the vault', async () => {
    // The check is where the file is, not whether a link was involved.
    fs.symlinkSync(
      path.join(vault, '.cache', 'photos', 'ana-horvat.png'),
      path.join(vault, '.cache', 'photos', 'same.png'),
    );
    expect(await refused('.cache/photos/same.png')).toBe(200);
  });
});
