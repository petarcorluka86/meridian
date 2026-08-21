import fs from 'node:fs';
import path from 'node:path';
import { NextResponse, type NextRequest } from 'next/server';
import { CACHE_DIR, relFromVault, safeVaultPath } from '@/lib/vault/paths';

const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/**
 * Serves cached employee photos from disk so no avatar is ever fetched by the
 * browser — the CSP has no external image origin, and this is what fills the gap.
 *
 * Deliberately narrow: only .cache/photos/, only known image extensions. A general
 * "serve any vault file" route would turn one path bug into a way to read notes.
 */
const PHOTOS = `${CACHE_DIR}/photos/`;

export async function GET(request: NextRequest) {
  const asked = request.nextUrl.searchParams.get('path');
  if (!asked) return new NextResponse('Missing path', { status: 400 });

  // Resolve first, then check where it landed. Testing the prefix against the
  // string the browser sent lets `.cache/photos/../elsewhere.png` claim to be in
  // the photo folder while reading from somewhere else in the vault.
  let abs: string;
  try {
    abs = safeVaultPath(asked);
  } catch {
    return new NextResponse('Not servable', { status: 403 });
  }

  const rel = relFromVault(abs);
  if (!rel.startsWith(PHOTOS)) {
    return new NextResponse('Not servable', { status: 403 });
  }

  const type = TYPES[path.extname(rel).toLowerCase()];
  if (!type) return new NextResponse('Not servable', { status: 403 });

  try {
    const body = fs.readFileSync(abs);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        'Content-Type': type,
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
