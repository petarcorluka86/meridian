import { z } from 'zod';
import { loadConfig } from '@/lib/env';
import { FixtureVaultError, vaultIsInsideApp } from '@/lib/vault/paths';
import { readCache, writeCache } from '../cache';
import { BambooCache } from './cache';
import { bambooGet, parseRows } from './client';
import { getVault } from '@/lib/vault/index';

/** Approvals and absences — the dataset on the short clock. */
const TimeOffRequest = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  employeeId: z.union([z.string(), z.number()]).transform(String),
  name: z.string().nullable().default(null),
  start: z.string(),
  end: z.string(),
  created: z.string().nullable().default(null),
  type: z
    .object({ name: z.string().nullable().default(null) })
    .nullable()
    .default(null),
});

/**
 * Validates one row at a time and drops only what fails. Parsing the array as a
 * whole means a single unexpected row discards every good one beside it — which
 * is how thirteen absences became zero.
 */

function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/**
 * Approvals and absences. Kept separate from the roster sync because it runs on a
 * five-minute clock rather than an hourly one.
 *
 * The BambooHR API exposes time-off requests and nothing else of the inbox —
 * documents awaiting signature and onboarding tasks are not available. The card
 * has to say so rather than imply it is showing everything.
 */
export async function syncBambooInbox(): Promise<{ pending: number; away: number; wfh: number }> {
  if (vaultIsInsideApp()) throw new FixtureVaultError();

  const config = loadConfig();
  if (!config.bamboo) throw new Error('BambooHR is not connected.');
  const { subdomain, apiKey } = config.bamboo;

  const cached = readCache('bamboohr', BambooCache).data;

  // Who reports to you comes from the cache when it is there, and from the vault
  // roster when it is not. Depending on the cache alone made this silently
  // return nothing on a cold start, because the roster had not synced yet —
  // ordering should not be load-bearing.
  const roster = cached?.employees.length
    ? cached.employees.map((e) => ({ id: e.id, slug: e.slug }))
    : getVault()
        .people.filter((p) => p.hr.employeeId)
        .map((p) => ({ id: p.hr.employeeId!, slug: p.slug }));

  const mine = new Set(roster.map((e) => e.id));
  const slugOf = new Map(roster.map((e) => [e.id, e.slug]));

  const start = isoDay(0);
  const end = isoDay(120);

  const requestsRaw = await bambooGet(
    subdomain,
    apiKey,
    `time_off/requests?start=${start}&end=${end}&status=requested`,
  );
  const requests = parseRows(requestsRaw, TimeOffRequest);

  // Approved requests rather than whos_out: only these carry the leave type, and
  // the type is what separates working from home from actually being away.
  const approvedRaw = await bambooGet(
    subdomain,
    apiKey,
    `time_off/requests?start=${start}&end=${end}&status=approved`,
  );
  const approved = parseRows(approvedRaw, TimeOffRequest);

  // Only your own reports — the endpoints return the whole company.
  const inbox = requests
    .filter((r) => mine.has(r.employeeId))
    .map((r) => ({
      kind: 'time off' as const,
      slug: slugOf.get(r.employeeId) ?? null,
      title: `${r.name ?? 'Someone'} — ${r.type?.name ?? 'time off'}, ${r.start} to ${r.end}`,
      detail: 'Waiting on your approval',
      since: r.created?.slice(0, 10) ?? r.start,
    }));

  const timeOff = approved
    .filter((r) => mine.has(r.employeeId))
    .map((r) => {
      const type = r.type?.name ?? 'Time off';
      return {
        slug: slugOf.get(r.employeeId) ?? r.employeeId,
        name: r.name ?? '',
        type,
        start: r.start,
        end: r.end,
        wfh: /work from home/i.test(type),
      };
    });

  writeCache('bamboohr', {
    ...(cached ?? { fetchedAt: new Date().toISOString(), employees: [], compensation: {} }),
    inboxFetchedAt: new Date().toISOString(),
    inbox,
    timeOff,
  });

  return {
    pending: inbox.length,
    away: timeOff.filter((t) => !t.wfh).length,
    wfh: timeOff.filter((t) => t.wfh).length,
  };
}
