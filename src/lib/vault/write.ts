import fs from 'node:fs';
import path from 'node:path';
import { safeVaultPath, relFromVault, SNAPSHOT_DIR, vaultRoot } from './paths';
import { invalidateVault } from './index';

export class VaultConflictError extends Error {
  constructor(public readonly relPath: string) {
    super(`${relPath} changed on disk since it was read`);
  }
}

/** Single-user app, but the UI and an agent can both be writing. Serialise per path. */
const locks = new Map<string, Promise<unknown>>();

export function withLock<T>(relPath: string, fn: () => Promise<T> | T): Promise<T> {
  const previous = locks.get(relPath) ?? Promise.resolve();
  const next = previous.then(fn, fn);
  locks.set(
    relPath,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}

export type Stamped<T> = { data: T; mtimeMs: number };

export function readForUpdate(relPath: string): Stamped<string> | null {
  const abs = safeVaultPath(relPath);
  try {
    const stat = fs.statSync(abs);
    return { data: fs.readFileSync(abs, 'utf8'), mtimeMs: stat.mtimeMs };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

/**
 * Copy the current content aside before it is overwritten. Keeps 20 per file and
 * prunes past 30 days — enough to undo a bad edit, not enough to become an archive.
 */
function snapshot(relPath: string, abs: string): void {
  if (!fs.existsSync(abs)) return;
  const dir = path.join(vaultRoot(), SNAPSHOT_DIR, relPath);
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(abs, path.join(dir, `${stamp}${path.extname(relPath)}`));

  const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
  const kept = fs
    .readdirSync(dir)
    .map((name) => ({ name, full: path.join(dir, name) }))
    .sort((a, b) => (a.name < b.name ? 1 : -1));
  kept.forEach((entry, i) => {
    const stale = i >= 20 || fs.statSync(entry.full).mtimeMs < cutoff;
    if (stale) fs.rmSync(entry.full, { force: true });
  });
}

export type WriteOptions = {
  /** mtime the caller last saw. Omit to write unconditionally (new files, imports). */
  expectMtimeMs?: number;
};

/**
 * Write to a sibling temp file, fsync, then rename over the target. A crash
 * mid-write cannot leave a half-written entries file behind.
 */
export function writeTextAtomic(
  relPath: string,
  content: string,
  options: WriteOptions = {},
): void {
  const abs = safeVaultPath(relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });

  if (options.expectMtimeMs !== undefined) {
    let current: number | null = null;
    try {
      current = fs.statSync(abs).mtimeMs;
    } catch {
      current = null;
    }
    // A tolerance of 1ms: some filesystems round mtime, and a same-millisecond
    // write by us is not an external edit.
    if (current !== null && Math.abs(current - options.expectMtimeMs) > 1) {
      throw new VaultConflictError(relPath);
    }
  }

  snapshot(relPath, abs);

  const tmp = `${abs}.tmp.${process.pid}`;
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeFileSync(fd, content, 'utf8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, abs);
}

/** JSON on disk is formatted and newline-terminated so a human diff stays readable. */
export function writeJsonAtomic(relPath: string, value: unknown, options: WriteOptions = {}): void {
  writeTextAtomic(relPath, `${JSON.stringify(value, null, 2)}\n`, options);
}

export function moveFile(fromRel: string, toRel: string): void {
  const from = safeVaultPath(fromRel);
  const to = safeVaultPath(toRel);
  if (fs.existsSync(to)) throw new Error(`${relFromVault(to)} already exists`);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
}

/**
 * The read-modify-write loop: read with its mtime, transform, write, and retry
 * if the file moved underneath us in between.
 *
 * One implementation, because there were four — one per store. They had already
 * drifted: two parsed JSON outside the try, so a corrupt file threw where the
 * other two fell back to empty and carried on. This is the code that exists to
 * stop an edit being lost, and a fix applied to one copy and not the rest is a
 * silent divergence in exactly the wrong place.
 */
const ATTEMPTS = 3;

export class VaultUnreadableError extends Error {
  constructor(relPath: string, why: string) {
    super(`${relPath} cannot be read — ${why}. Fix the file, or ask vault:doctor what is wrong.`);
  }
}

/**
 * Every row that will not validate, kept exactly as it was found.
 *
 * The read path already works this way: one malformed entry is skipped and
 * named, and the rest still load. The write path used to validate the whole
 * array at once and, on any failure, write `fn([])` over the file — so a vault
 * with one hand-typed `"2026-9-1"` lost its other 199 tasks the first time
 * somebody clicked anything, with the action reporting success. Measured, not
 * imagined: 200 rows in, 1 row out.
 *
 * So rows are validated one at a time here too. The good ones go to `fn`; the
 * bad ones are carried through untouched and written back after it. They move to
 * the end of the file, which is the one visible consequence and is worth it: the
 * row the user typed is still theirs, still exactly as they typed it, and the
 * app keeps working around it.
 */
type Sorted<T> = { valid: T[]; invalid: unknown[] };

function sortRows<T>(
  relPath: string,
  raw: string,
  row: { safeParse: (value: unknown) => { success: boolean; data?: T } },
): Sorted<T> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    // Nothing can be preserved from a file we cannot parse at all, and
    // overwriting it would destroy whatever is in there. Refuse instead.
    throw new VaultUnreadableError(relPath, (err as Error).message);
  }
  if (!Array.isArray(parsed)) throw new VaultUnreadableError(relPath, 'it is not a JSON array');

  const valid: T[] = [];
  const invalid: unknown[] = [];
  for (const entry of parsed) {
    const result = row.safeParse(entry);
    if (result.success && result.data !== undefined) valid.push(result.data);
    else invalid.push(entry);
  }
  return { valid, invalid };
}

export async function mutateJsonRows<T>(
  relPath: string,
  row: { safeParse: (value: unknown) => { success: boolean; data?: T } },
  fn: (rows: T[]) => T[],
): Promise<void> {
  await withLock(relPath, () => {
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const current = readForUpdate(relPath);
      const { valid, invalid } = current
        ? sortRows(relPath, current.data, row)
        : { valid: [] as T[], invalid: [] as unknown[] };

      try {
        writeJsonAtomic(relPath, [...fn(valid), ...invalid], {
          expectMtimeMs: current?.mtimeMs,
        });
        invalidateVault();
        return;
      } catch (err) {
        if (err instanceof VaultConflictError) continue;
        throw err;
      }
    }
    throw new Error(`${relPath} kept changing while saving. Try again.`);
  });
}

/** The same loop for a file whose content is text rather than a record. */
export async function mutateTextFile(
  relPath: string,
  next: (raw: string) => string,
): Promise<void> {
  await withLock(relPath, () => {
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const current = readForUpdate(relPath);
      if (!current) throw new Error(`${relPath} no longer exists.`);

      try {
        writeTextAtomic(relPath, next(current.data), { expectMtimeMs: current.mtimeMs });
        invalidateVault();
        return;
      } catch (err) {
        if (err instanceof VaultConflictError) continue;
        throw err;
      }
    }
    throw new Error(`${relPath} kept changing while saving. Try again.`);
  });
}
