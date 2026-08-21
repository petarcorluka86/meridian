import type { PlanEntry } from '@/lib/vault/schemas';

export type CompRow = {
  startDate: string;
  endDate: string | null;
  rate: number;
  reason: string;
  comment: string;
};

/** A year-month as a comparable integer: August 2026 is 202608. */
export type YearMonth = number;

export function ym(year: number, month: number): YearMonth {
  return year * 100 + month;
}

export function ymOfIso(iso: string): YearMonth {
  const [y, m] = iso.split('-').map(Number);
  return ym(y ?? 1970, m ?? 1);
}

export function monthsBetween(from: YearMonth, to: YearMonth): number {
  return (Math.floor(to / 100) - Math.floor(from / 100)) * 12 + ((to % 100) - (from % 100));
}

export type TimelineEntry = { ym: YearMonth; amount: number; planned: boolean };

/**
 * Payroll history and your own planned rises on one timeline, so a plan shows up
 * in the same sequence as a real rise — marked as planned, never written back to
 * BambooHR.
 */
export function buildTimeline(rows: CompRow[], plans: PlanEntry[]): TimelineEntry[] {
  return [
    ...rows.map((r) => ({ ym: ymOfIso(r.startDate), amount: r.rate, planned: false })),
    ...plans.map((p) => ({ ym: ym(p.year, p.month), amount: p.amount, planned: true })),
  ].sort((a, b) => a.ym - b.ym || Number(a.planned) - Number(b.planned));
}

export type RateAt = {
  active: TimelineEntry | null;
  previous: TimelineEntry | null;
  next: TimelineEntry | null;
};

/** What was in force at a given month, what came before it, and what comes next. */
export function rateAt(timeline: TimelineEntry[], at: YearMonth): RateAt {
  const applied = timeline.filter((e) => e.ym <= at);
  return {
    active: applied[applied.length - 1] ?? timeline[0] ?? null,
    previous: applied.length >= 2 ? (applied[applied.length - 2] ?? null) : null,
    next: timeline.find((e) => e.ym > at) ?? null,
  };
}

export function formatEur(amount: number): string {
  return `€${amount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function monthsAgo(months: number): string {
  if (months <= 0) return 'this month';
  if (months === 1) return '1 month ago';
  if (months < 24) return `${months} months ago`;
  return `${Math.floor(months / 12)} yrs ago`;
}

function monthsAhead(months: number): string {
  if (months <= 0) return 'this month';
  if (months === 1) return 'in 1 month';
  if (months < 24) return `in ${months} months`;
  return `in ${Math.floor(months / 12)} yrs`;
}

export function lastRiseLabel(at: RateAt, asOf: YearMonth): string {
  if (!at.active || !at.previous) return 'first rate';
  const delta = at.active.amount - at.previous.amount;
  const sign = delta >= 0 ? '+' : '−';
  return `${monthsAgo(monthsBetween(at.active.ym, asOf))} (${sign}${formatEur(Math.abs(delta))})`;
}

export function nextRiseLabel(at: RateAt, asOf: YearMonth): string {
  if (!at.next || !at.active) return 'none planned';
  const delta = at.next.amount - at.active.amount;
  const sign = delta >= 0 ? '+' : '−';
  return `${monthsAhead(monthsBetween(asOf, at.next.ym))} (${sign}${formatEur(Math.abs(delta))})`;
}

export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
