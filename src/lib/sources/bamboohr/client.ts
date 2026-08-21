import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { CACHE_DIR, safeVaultPath, vaultIsInsideApp } from '@/lib/vault/paths';
import { logEgress } from '../egress';

/**
 * Transport. One function makes every request, so the read-only rule and the
 * egress log are enforced in a single place rather than at each call site.
 */
/**
 * The single outbound function. Hardcoded GET — there is no code path in this app
 * that can write to BambooHR, and adding one would mean changing this line.
 */
/**
 * The endpoint is always a literal from this module plus, at most, a numeric
 * employee id. Asserted rather than trusting call sites to stay careful.
 */
export function assertPlainEndpoint(endpoint: string): void {
  // Letters, digits and underscore per segment — table names are camelCase.
  // No dots, so `..` cannot appear; no scheme, no spaces, no encoded slashes.
  // A trailing bare `-` in a character class reads as a truncated range, and this
  // guard is worth being obvious about, so the hyphen stays escaped.
  // biome-ignore lint/complexity/noUselessEscapeInRegex: kept for legibility, see above
  if (!/^[A-Za-z_]+(\/[A-Za-z0-9_]+)*(\?[A-Za-z0-9_=&,\-]*)?$/.test(endpoint)) {
    throw new Error(`Refusing to call a BambooHR endpoint that is not a plain path: ${endpoint}`);
  }
}

export async function bambooGet(
  subdomain: string,
  apiKey: string,
  endpoint: string,
): Promise<unknown> {
  assertPlainEndpoint(endpoint);
  const url = `https://api.bamboohr.com/api/gateway.php/${encodeURIComponent(subdomain)}/v1/${endpoint}`;
  const started = Date.now();
  let status = 0;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(`${apiKey}:x`).toString('base64')}`,
      },
      signal: AbortSignal.timeout(20_000),
    });
    status = response.status;

    if (response.status === 401) throw new BambooError('BambooHR rejected the API key.', 401);
    if (response.status === 429) throw new BambooError('BambooHR is rate limiting.', 429);
    if (!response.ok)
      throw new BambooError(`BambooHR returned ${response.status}.`, response.status);

    return await response.json();
  } finally {
    logEgress({
      method: 'GET',
      host: 'api.bamboohr.com',
      path: `/v1/${endpoint}`,
      status,
      ms: Date.now() - started,
    });
  }
}

export class BambooError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

/** Copy differs by cause, because the fix differs. */
export function bambooErrorCopy(err: unknown): string {
  if (err instanceof BambooError) {
    if (err.status === 401) return 'BambooHR rejected the API key.';
    if (err.status === 429) return 'BambooHR is rate limiting; try again in a few minutes.';
  }
  return 'Could not reach BambooHR.';
}

/**
 * The directory is one call and carries everything except hire date — and it
 * reports a supervisor by *name*, not id: 0 of 329 records in a real tenant
 * carry supervisorId. Direct reports are therefore matched on the manager's own
 * display name within this same response, which is why the name has to be unique.
 */
export const DirectoryResponse = z.object({
  employees: z
    .array(
      z.object({
        id: z.union([z.string(), z.number()]).transform(String),
        displayName: z.string().nullable().default(null),
        firstName: z.string().nullable().default(null),
        lastName: z.string().nullable().default(null),
        jobTitle: z.string().nullable().default(null),
        department: z.string().nullable().default(null),
        division: z.string().nullable().default(null),
        workEmail: z.string().nullable().default(null),
        mobilePhone: z.string().nullable().default(null),
        supervisor: z.string().nullable().default(null),
        photoUrl: z.string().nullable().default(null),
      }),
    )
    .default([]),
});

/** Per-employee detail, fetched only for the manager's own reports. */
export const EmployeeDetail = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  hireDate: z.string().nullable().default(null),
  supervisorEId: z
    .union([z.string(), z.number()])
    .nullable()
    .default(null)
    .transform((v) => (v == null ? null : String(v))),
});

/**
 * Case and diacritics folded, so "Corluka" and "\u0106orluka" compare equal. Croatian
 * names carry them and half the systems that hold those names do not, which is
 * why two spellings of one person keep having to be recognised as one person.
 */
export function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd');
}

export function slugifyName(name: string): string {
  return fold(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export type DirectoryEmployee = z.infer<typeof DirectoryResponse>['employees'][number];

/** What the directory calls somebody, however sparsely it filled the record in. */
export function displayNameOf(employee: {
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
}): string {
  return employee.displayName ?? [employee.firstName, employee.lastName].filter(Boolean).join(' ');
}

/** Magic bytes, so only a real image can ever land in the photo cache. */
function imageKind(bytes: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png';
  }
  if (
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

/** Photos come down at sync time so the browser never fetches an avatar. */
export async function cachePhoto(slug: string, url: string | null): Promise<void> {
  if (!url) return;
  if (vaultIsInsideApp()) return;
  const started = Date.now();
  let status = 0;
  try {
    const response = await fetch(url, {
      // Explicit, not relying on the default: every outbound call in this app
      // states its method so an audit can read it without knowing the spec.
      method: 'GET',
      signal: AbortSignal.timeout(20_000),
    });
    status = response.status;
    if (!response.ok) return;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 5 * 1024 * 1024) return;
    // BambooHR serves photos as application/octet-stream, and a content-type
    // header is not evidence of anything anyway. Sniff the actual bytes.
    const ext = imageKind(bytes);
    if (!ext) return;
    const abs = safeVaultPath(`${CACHE_DIR}/photos/${slug}.${ext}`);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    // Temp then rename, like every other write in the app. Writing straight to
    // the target left a half-downloaded avatar behind if the process died
    // mid-write, and the next read would serve those bytes as an image.
    const tmp = `${abs}.tmp.${process.pid}`;
    fs.writeFileSync(tmp, bytes);
    fs.renameSync(tmp, abs);
  } catch {
    // A missing photo is cosmetic; initials stand in.
  } finally {
    try {
      logEgress({
        method: 'GET',
        host: new URL(url).host,
        path: '/photo',
        status,
        ms: Date.now() - started,
      });
    } catch {
      /* ignore */
    }
  }
}

export function parseRows<T>(raw: unknown, schema: z.ZodType<T>): T[] {
  if (!Array.isArray(raw)) return [];
  const out: T[] = [];
  for (const row of raw) {
    const result = schema.safeParse(row);
    if (result.success) out.push(result.data);
  }
  return out;
}
