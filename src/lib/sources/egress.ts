import fs from 'node:fs';
import path from 'node:path';
import { CACHE_DIR, vaultRoot } from '@/lib/vault/paths';

export type EgressRecord = {
  /**
   * Recorded truthfully, because the log is the evidence. The only POST that can
   * ever appear here is the OAuth token exchange in scripts/calendar-sync.ts,
   * and it should be visible rather than dressed up as a read.
   */
  method: 'GET' | 'POST';
  host: string;
  path: string;
  status: number;
  ms: number;
};

/**
 * Every outbound request the app makes, appended where the user can read it. The
 * privacy claim is only checkable if there is a record to check.
 */
export function logEgress(record: EgressRecord): void {
  try {
    const abs = path.join(vaultRoot(), CACHE_DIR, 'egress.log');
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    const line = [
      new Date().toISOString(),
      record.method,
      record.host,
      record.path,
      record.status,
      `${record.ms}ms`,
    ].join(' ');
    fs.appendFileSync(abs, `${line}\n`);
  } catch {
    // Logging must never take down the request it is recording.
  }
}

export function readEgress(limit = 200): string[] {
  try {
    const abs = path.join(vaultRoot(), CACHE_DIR, 'egress.log');
    return fs.readFileSync(abs, 'utf8').split('\n').filter(Boolean).slice(-limit).reverse();
  } catch {
    return [];
  }
}
