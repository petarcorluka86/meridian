import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ageLabel, freshnessOf } from '@/lib/sources/cache';
import { resetConfig } from '@/lib/env';

/**
 * What the pill on a card header says, and the one rule underneath it: an old
 * number must never be able to pose as a current one.
 *
 * If this breaks, nothing looks wrong. The screens still render, the figures are
 * still there, and they are quietly from last Tuesday — which is a worse failure
 * than a blank card, because a blank card is obvious.
 */
const at = Date.parse('2026-08-19T12:00:00.000Z');
const ago = (ms: number) => new Date(at - ms).toISOString();

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('how fresh a source is', () => {
  it('says nothing at all about a source that is not connected', () => {
    // Not connected and never answered are different facts, and only one of them
    // is the user's problem.
    expect(freshnessOf(ago(HOUR), 300, false, at)).toEqual({ state: 'unconfigured' });
    expect(freshnessOf(null, 300, false, at)).toEqual({ state: 'unconfigured' });
  });

  it('is live inside its window', () => {
    expect(freshnessOf(ago(4 * MINUTE), 300, true, at).state).toBe('live');
    // Exactly at the edge is still live: the window is how long it stays good.
    expect(freshnessOf(ago(5 * MINUTE), 300, true, at).state).toBe('live');
  });

  it('goes stale one moment past it, and says how old', () => {
    const stale = freshnessOf(ago(5 * MINUTE + 1), 300, true, at);
    expect(stale.state).toBe('stale');
    expect(stale.state === 'stale' && stale.ageLabel).toBe('5m old');
  });

  it('has never been answered when there is nothing cached', () => {
    expect(freshnessOf(null, 300, true, at)).toEqual({ state: 'missing' });
  });

  it('respects each source having its own window', () => {
    // Approvals refresh every five minutes; the roster hourly. The same age is
    // stale for one and live for the other.
    const age = ago(30 * MINUTE);
    expect(freshnessOf(age, 300, true, at).state).toBe('stale');
    expect(freshnessOf(age, 3600, true, at).state).toBe('live');
  });
});

describe('when a source has failed', () => {
  const failure = { at: ago(1 * MINUTE), message: 'Could not reach BambooHR.' };

  it('says so, and still says how old the numbers are', () => {
    const result = freshnessOf(ago(2 * HOUR), 3600, true, at, failure);
    expect(result.state).toBe('failed');
    expect(result.state === 'failed' && result.message).toBe('Could not reach BambooHR.');
    expect(result.state === 'failed' && result.ageLabel).toBe('2h old');
  });

  it('says so even when there is nothing cached at all', () => {
    const result = freshnessOf(null, 3600, true, at, failure);
    expect(result.state).toBe('failed');
    expect(result.state === 'failed' && result.ageLabel).toBeNull();
  });

  it('forgets it once something has succeeded since', () => {
    // A failure is only news while it is the most recent thing that happened.
    const older = { at: ago(3 * HOUR), message: 'Could not reach BambooHR.' };
    expect(freshnessOf(ago(1 * MINUTE), 3600, true, at, older).state).toBe('live');
    expect(freshnessOf(ago(2 * HOUR), 3600, true, at, older).state).toBe('stale');
  });

  it('never mentions a failure for a source that is not connected', () => {
    expect(freshnessOf(ago(HOUR), 3600, false, at, failure)).toEqual({ state: 'unconfigured' });
  });
});

describe('the age in words', () => {
  it('reads the way a person would say it', () => {
    expect(ageLabel(ago(20_000), at)).toBe('just now');
    expect(ageLabel(ago(3 * MINUTE), at)).toBe('3m old');
    expect(ageLabel(ago(59 * MINUTE), at)).toBe('59m old');
    expect(ageLabel(ago(HOUR), at)).toBe('1h old');
    expect(ageLabel(ago(23 * HOUR), at)).toBe('23h old');
    expect(ageLabel(ago(DAY), at)).toBe('1d old');
    expect(ageLabel(ago(9 * DAY), at)).toBe('9d old');
  });
});

describe('recording a failure on disk', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-fresh-'));
    fs.mkdirSync(path.join(dir, '.cache'), { recursive: true });
    process.env.VAULT_PATH = dir;
    resetConfig();
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    delete process.env.VAULT_PATH;
    resetConfig();
  });

  it('remembers one per source, and does not confuse them', async () => {
    const { clearFailure, failureOf, noteFailure } = await import('@/lib/sources/cache');

    noteFailure('bamboohr', 'BambooHR rejected the key.');
    noteFailure('github', 'GitHub could not be reached.');

    expect(failureOf('bamboohr')?.message).toBe('BambooHR rejected the key.');
    expect(failureOf('github')?.message).toBe('GitHub could not be reached.');
    expect(failureOf('calendar')).toBeNull();

    clearFailure('bamboohr');
    expect(failureOf('bamboohr')).toBeNull();
    // Clearing one must not clear the others.
    expect(failureOf('github')?.message).toBe('GitHub could not be reached.');
  });

  it('survives a failures file somebody has broken', async () => {
    const { failureOf, noteFailure } = await import('@/lib/sources/cache');
    fs.writeFileSync(path.join(dir, '.cache/failures.json'), 'not json');

    // Reading it must not throw on a page render, and writing must still work.
    expect(failureOf('bamboohr')).toBeNull();
    noteFailure('bamboohr', 'Something.');
    expect(failureOf('bamboohr')?.message).toBe('Something.');
  });

  it('clearing something that never failed does nothing', async () => {
    const { clearFailure, failureOf } = await import('@/lib/sources/cache');
    clearFailure('calendar');
    expect(failureOf('calendar')).toBeNull();
  });
});

describe('the cache itself', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-cache-'));
    process.env.VAULT_PATH = dir;
    resetConfig();
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    delete process.env.VAULT_PATH;
    resetConfig();
  });

  it('reads back what it wrote', async () => {
    const { readCache, writeCache } = await import('@/lib/sources/cache');
    const { z } = await import('zod');
    const schema = z.object({ fetchedAt: z.string(), pullRequests: z.array(z.string()) });

    writeCache('github', { fetchedAt: '2026-08-19T12:00:00.000Z', etag: 'abc', pullRequests: [] });
    const read = readCache('github', schema);

    expect(read.data?.pullRequests).toEqual([]);
    expect(read.fetchedAt).toBe('2026-08-19T12:00:00.000Z');
    expect(read.etag).toBe('abc');
  });

  it('treats a corrupt cache as absent rather than as a problem to fix', async () => {
    const { readCache, writeCache } = await import('@/lib/sources/cache');
    const { z } = await import('zod');
    const schema = z.object({ fetchedAt: z.string() });

    writeCache('github', { fetchedAt: '2026-08-19T12:00:00.000Z' });
    fs.writeFileSync(path.join(dir, '.cache/github.json'), '{ half a file');

    // It is disposable: the next successful fetch replaces it, and nothing
    // should ask the user to repair a file they never wrote.
    expect(readCache('github', schema)).toEqual({ data: null, fetchedAt: null, etag: null });
  });
});
