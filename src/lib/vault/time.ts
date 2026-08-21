import { getVault } from './index';
import { TimeEntry } from './schemas';
import { mutateJsonRows } from './write';

const FILE = 'time.json';

async function mutate(fn: (entries: TimeEntry[]) => TimeEntry[]): Promise<void> {
  await mutateJsonRows<TimeEntry>(FILE, TimeEntry, fn);
}

/**
 * Accepts what the placeholder promises — "−2 or +1.5" — including the typographic
 * minus, which is what the app prints and therefore what a user will paste back.
 */
export function parseHours(input: string): number {
  const normalised = input.trim().replace(/[−–—]/g, '-').replace(',', '.');
  if (!/^[+-]?\d+(\.\d+)?$/.test(normalised)) {
    throw new Error('Hours must be a number, like −2 or +1.5.');
  }
  const value = Number(normalised);
  if (value === 0) throw new Error('An entry of zero hours would not change anything.');
  if (Math.abs(value) > 24) throw new Error('That is more than a day. Split it across entries.');
  // Half-hour resolution, matching how the balance is displayed.
  return Math.round(value * 2) / 2;
}

function makeId(date: string, existing: Set<string>): string {
  for (let i = 1; ; i++) {
    const candidate = `${date}-${String(i).padStart(2, '0')}`;
    if (!existing.has(candidate)) return candidate;
  }
}

export async function addTimeEntry(date: string, hours: number, note: string): Promise<void> {
  await mutate((entries) => {
    const now = new Date().toISOString();
    return [
      {
        id: makeId(date, new Set(entries.map((e) => e.id))),
        date,
        hoursDelta: hours,
        note: note.trim(),
        createdAt: now,
        updatedAt: now,
      },
      ...entries,
    ];
  });
}

export async function updateTimeEntry(
  id: string,
  patch: { date: string; hoursDelta: number; note: string },
): Promise<void> {
  await mutate((entries) =>
    entries.map((e) =>
      e.id === id
        ? { ...e, ...patch, note: patch.note.trim(), updatedAt: new Date().toISOString() }
        : e,
    ),
  );
}

export async function deleteTimeEntry(id: string): Promise<void> {
  await mutate((entries) => entries.filter((e) => e.id !== id));
}

/** Never stored — recomputed every read so it cannot drift from the entries. */
export function sumHours(entries: { hoursDelta: number }[]): number {
  return Math.round(entries.reduce((n, e) => n + e.hoursDelta, 0) * 2) / 2;
}

export function allTimeEntries(): TimeEntry[] {
  return getVault()
    .time.slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1));
}

/** "+1.5h" · "−2.0h" · "0.0h". */
export function formatHours(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';
  return `${sign}${Math.abs(n).toFixed(1)}h`;
}
