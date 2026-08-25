import { z } from 'zod';
import { loadConfig } from '@/lib/env';
import { FixtureVaultError, vaultIsInsideApp } from '@/lib/vault/paths';
import { readCache, writeCache } from '../cache';
import { BambooCache } from './cache';
import { bambooGet, parseRows } from './client';

/** Pay history, one call per direct report, on its own clock. */
/**
 * Where a company keeps pay is not a given.
 *
 * BambooHR's standard `compensation` table is the default, and is what most
 * tenants use. Some leave it empty for every employee and keep pay in a custom
 * table instead, which is a per-company decision the app cannot guess — so it is
 * configured, and the two shapes are parsed differently.
 *
 * `meta/tables` and `meta/fields` on your own subdomain are the reliable way to
 * find out which table a tenant actually uses, and what its fields are called.
 */
const StandardCompRow = z.object({
  startDate: z.string(),
  endDate: z.string().nullable().default(null),
  // The API returns either a plain string or {value, currency} depending on the
  // endpoint and the age of the account.
  rate: z
    .union([z.string(), z.object({ value: z.string(), currency: z.string().optional() })])
    .nullable()
    .default(null),
  type: z.string().nullable().default(null),
  reason: z.string().nullable().default(null),
  comment: z.string().nullable().default(null),
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A custom table's fields are named by the tenant, so they are read by key. */
const CustomCompRow = z.record(z.string(), z.unknown());

type CompRow = {
  startDate: string;
  endDate: string | null;
  rate: number;
  gross: number | null;
  reason: string;
  comment: string;
};

function rateOf(rate: z.infer<typeof StandardCompRow>['rate']): number | null {
  if (rate === null) return null;
  return parseAmount(typeof rate === 'string' ? rate : rate.value);
}

function field(row: Record<string, unknown>, name: string | null): string {
  if (!name) return '';
  const value = row[name];
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';
}

/** Values arrive as "3052.28 EUR", "3041.03 " or "". Only a number is wanted. */
export function parseAmountForTests(raw: string): number | null {
  return parseAmount(raw);
}

function parseAmount(raw: string): number | null {
  const digits = raw.replace(/[^0-9.,]/g, '').trim();
  if (!digits) return null;

  // This tenant returns "3052.28", but a Croatian BambooHR can equally return
  // "3.052,28". Whichever separator appears last is the decimal one; anything
  // before it groups thousands. Getting this backwards misreads a salary by
  // three orders of magnitude, so it is decided explicitly rather than guessed.
  const lastDot = digits.lastIndexOf('.');
  const lastComma = digits.lastIndexOf(',');
  let normalised: string;
  if (lastDot === -1 && lastComma === -1) {
    normalised = digits;
  } else if (lastComma > lastDot) {
    normalised = digits.replace(/\./g, '').replace(',', '.');
  } else {
    normalised = digits.replace(/,/g, '');
  }

  const value = Number(normalised);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Compensation history, one call per direct report. Kept separate from the
 * roster sync so a pay table is only refetched when its own window expires.
 */
export type CompTable = { table: string; rows: number; fields: string[] };

/**
 * Which table this company actually keeps pay in, asked of BambooHR rather than
 * typed by somebody who has to go and find out.
 *
 * The standard `compensation` table is empty at plenty of companies, which looks
 * on screen exactly like paying nobody — that is the confusion this removes. It
 * is asked once, during setup, against the one employee whose id we have just
 * confirmed: the manager's own.
 *
 * Candidates are the tables whose names look like pay, standard one first, and
 * the first that returns a row wins. Thirty-four tables exist on a typical
 * tenant and probing all of them would be thirty-four requests to somebody's HR
 * system to answer a question three of them can.
 */
export async function findCompensationTable(
  subdomain: string,
  apiKey: string,
  employeeId: string,
): Promise<CompTable | null> {
  let names: string[];
  try {
    const raw = await bambooGet(subdomain, apiKey, 'meta/tables');
    names = Array.isArray(raw)
      ? raw
          .map((table) => (table as { alias?: unknown }).alias)
          .filter((alias): alias is string => typeof alias === 'string')
      : [];
  } catch {
    // Not being able to ask is not a failure of the step this runs inside: the
    // key works, the roster is there, and the table can be set by hand.
    return null;
  }

  const candidates = [
    ...names.filter((name) => name === 'compensation'),
    ...names.filter((name) => name !== 'compensation' && /comp|salar|pay/i.test(name)),
  ];

  for (const table of candidates) {
    try {
      const raw = await bambooGet(subdomain, apiKey, `employees/${employeeId}/tables/${table}`);
      const rows = Array.isArray(raw) ? raw : [];
      const first = rows[0];
      if (!first || typeof first !== 'object') continue;
      return { table, rows: rows.length, fields: Object.keys(first as object) };
    } catch {
      // A table this key cannot read is not the table we are looking for.
    }
  }

  return null;
}

export async function syncBambooCompensation(): Promise<{ people: number; rows: number }> {
  if (vaultIsInsideApp()) throw new FixtureVaultError();

  const config = loadConfig();
  if (!config.bamboo) throw new Error('BambooHR is not connected.');
  const { subdomain, apiKey } = config.bamboo;

  const cached = readCache('bamboohr', BambooCache).data;
  const employees = cached?.employees ?? [];
  if (employees.length === 0) {
    throw new Error('Sync the roster first — there is nobody to fetch compensation for.');
  }

  const comp = config.bamboo.comp;
  const table = comp.table;
  const standard = table === 'compensation';

  const compensation: Record<string, unknown> = { ...(cached?.compensation ?? {}) };
  const failures: string[] = [];
  let totalRows = 0;

  for (const employee of employees) {
    let rows: CompRow[] = [];
    try {
      const raw = await bambooGet(subdomain, apiKey, `employees/${employee.id}/tables/${table}`);
      rows = (
        standard
          ? parseRows(raw, StandardCompRow)
              .filter((r) => ISO_DATE.test(r.startDate.trim()))
              .map((r) => ({
                startDate: r.startDate.trim(),
                endDate: r.endDate,
                rate: rateOf(r.rate) ?? 0,
                gross: null,
                reason: r.reason ?? '',
                comment: r.comment ?? '',
              }))
          : parseRows(raw, CustomCompRow)
              // A custom table carries blank rows; one with no date places nothing.
              .filter((r) => ISO_DATE.test(field(r, comp.dateField).trim()))
              .map((r) => ({
                startDate: field(r, comp.dateField).trim(),
                endDate: null,
                // Total compensation is what the manager actually negotiates;
                // gross alone understates it where the two differ.
                rate: parseAmount(field(r, comp.amountField)) ?? 0,
                gross: parseAmount(field(r, comp.grossField)),
                reason: '',
                comment: '',
              }))
      )
        .filter((r) => r.rate > 0)
        .sort((a, b) => a.startDate.localeCompare(b.startDate));
    } catch (err) {
      // One unreadable pay table must not lose the other twelve — but a silent
      // skip hides a systematic failure, so say which person and why.
      failures.push(`${employee.slug}: ${(err as Error).message}`);
      continue;
    }

    if (rows.length === 0) continue;
    totalRows += rows.length;
    compensation[employee.slug] = {
      type: 'Salary',
      paidPer: 'Month',
      paySchedule: 'Monthly',
      currency: 'EUR',
      rows,
      bonus: [],
    };
  }

  // Blank for everybody is the normal outcome of pointing at the wrong table,
  // and it looks identical on screen to a company that simply pays nobody. Say
  // which it is, in the interface, rather than in a server log nobody reads.
  const compNote =
    Object.keys(compensation).length === 0
      ? standard
        ? 'BambooHR returned no compensation for anyone. Many companies keep pay in a custom table instead of the standard one — set BAMBOOHR_COMP_TABLE in .env to its name.'
        : `The table "${table}" returned no compensation for anyone. Check the name, and the field names, against meta/tables and meta/fields on your BambooHR.`
      : null;

  writeCache('bamboohr', {
    ...(cached ?? { fetchedAt: new Date().toISOString(), employees: [] }),
    compFetchedAt: new Date().toISOString(),
    compNote,
    compensation,
  });

  if (failures.length) {
    console.warn(`Compensation could not be read for ${failures.length}:`);
    for (const failure of failures) console.warn(`  ${failure}`);
  }

  return { people: Object.keys(compensation).length, rows: totalRows };
}
