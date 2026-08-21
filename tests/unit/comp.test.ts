import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildTimeline,
  formatEur,
  lastRiseLabel,
  monthsBetween,
  nextRiseLabel,
  rateAt,
  ym,
} from '@/lib/comp';
import type { PlanEntry } from '@/lib/vault/schemas';

const rows = [
  { startDate: '2023-04-03', endDate: '2025-06-30', rate: 3650, reason: 'New hire', comment: '' },
  { startDate: '2026-04-01', endDate: null, rate: 4200, reason: 'Merit increase', comment: '' },
  { startDate: '2025-07-01', endDate: '2026-03-31', rate: 3900, reason: 'Market', comment: '' },
];

const plan: PlanEntry = {
  id: 'p1',
  amount: 4500,
  month: 4,
  year: 2027,
  promotion: 'Staff Engineer',
};

describe('buildTimeline', () => {
  it('sorts payroll and plans into one chronological sequence', () => {
    const timeline = buildTimeline(rows, [plan]);
    expect(timeline.map((e) => e.ym)).toEqual([202304, 202507, 202604, 202704]);
    expect(timeline.map((e) => e.planned)).toEqual([false, false, false, true]);
  });

  it('handles a person with no payroll rows but a plan', () => {
    expect(buildTimeline([], [plan])).toHaveLength(1);
  });

  it('handles a person with nothing at all', () => {
    expect(buildTimeline([], [])).toEqual([]);
  });
});

describe('rateAt', () => {
  const timeline = buildTimeline(rows, [plan]);

  it('finds what was in force, what preceded it and what comes next', () => {
    const at = rateAt(timeline, ym(2026, 8));
    expect(at.active?.amount).toBe(4200);
    expect(at.previous?.amount).toBe(3900);
    expect(at.next?.amount).toBe(4500);
  });

  it('counts a plan as in force once its month is reached', () => {
    const at = rateAt(timeline, ym(2027, 5));
    expect(at.active?.amount).toBe(4500);
    expect(at.active?.planned).toBe(true);
    expect(at.next).toBeNull();
  });

  it('falls back to the earliest rate before any of it applies', () => {
    const at = rateAt(timeline, ym(2020, 1));
    expect(at.active?.amount).toBe(3650);
    expect(at.previous).toBeNull();
  });

  it('returns nulls for someone with no compensation at all', () => {
    const at = rateAt([], ym(2026, 8));
    expect(at.active).toBeNull();
    expect(at.next).toBeNull();
  });
});

describe('labels', () => {
  const timeline = buildTimeline(rows, [plan]);

  it('words the last rise the way the card shows it', () => {
    expect(lastRiseLabel(rateAt(timeline, ym(2026, 8)), ym(2026, 8))).toBe('4 months ago (+€300)');
    expect(lastRiseLabel(rateAt(timeline, ym(2026, 4)), ym(2026, 4))).toBe('this month (+€300)');
    expect(lastRiseLabel(rateAt(timeline, ym(2023, 5)), ym(2023, 5))).toBe('first rate');
  });

  it('switches from months to years only past two years', () => {
    // 2027-04 plan, seen from 2028-08: 16 months, still counted in months.
    expect(lastRiseLabel(rateAt(timeline, ym(2028, 8)), ym(2028, 8))).toBe('16 months ago (+€300)');
    // Seen from 2029-08: 28 months, now counted in years.
    expect(lastRiseLabel(rateAt(timeline, ym(2029, 8)), ym(2029, 8))).toBe('2 yrs ago (+€300)');
  });

  it('words the next rise, and says so when there is none', () => {
    expect(nextRiseLabel(rateAt(timeline, ym(2026, 8)), ym(2026, 8))).toBe('in 8 months (+€300)');
    expect(nextRiseLabel(rateAt(timeline, ym(2027, 8)), ym(2027, 8))).toBe('none planned');
  });
});

describe('monthsBetween', () => {
  it('spans a year boundary', () => {
    expect(monthsBetween(ym(2025, 11), ym(2026, 2))).toBe(3);
    expect(monthsBetween(ym(2026, 4), ym(2026, 4))).toBe(0);
    expect(monthsBetween(ym(2026, 8), ym(2026, 4))).toBe(-4);
  });
});

describe('formatEur', () => {
  it('groups thousands and drops empty decimals', () => {
    expect(formatEur(4200)).toBe('€4,200');
    expect(formatEur(4200.5)).toBe('€4,200.5');
  });
});

describe('BambooHR custom compensation values', () => {
  it('parses the shapes a real tenant actually returns', async () => {
    const { parseAmountForTests } = await import('@/lib/sources/bamboohr');
    expect(parseAmountForTests('3052.28 EUR')).toBe(3052.28);
    expect(parseAmountForTests('3041.03 ')).toBe(3041.03);
    // A Croatian tenant can return either separator style; both must be right.
    expect(parseAmountForTests('2.047,78')).toBe(2047.78);
    expect(parseAmountForTests('2,047.78')).toBe(2047.78);
    expect(parseAmountForTests('1.234.567,89 EUR')).toBe(1234567.89);
    expect(parseAmountForTests('3052,28')).toBe(3052.28);
    expect(parseAmountForTests('')).toBeNull();
    expect(parseAmountForTests('   ')).toBeNull();
    expect(parseAmountForTests('0')).toBeNull();
    expect(parseAmountForTests('EUR')).toBeNull();
  });
});

describe('initials', () => {
  it('uses one letter per word for a real name', async () => {
    const { initials } = await import('@/components/people/avatar');
    expect(initials('Tvrtko Babić')).toBe('TB');
    expect(initials('Petar Ćorluka')).toBe('PĆ');
  });

  it('uses two characters for a single-word handle', async () => {
    const { initials } = await import('@/components/people/avatar');
    expect(initials('dependabot')).toBe('DE');
    expect(initials('petarcorluka86')).toBe('PE');
  });

  it('survives an empty name', async () => {
    const { initials } = await import('@/components/people/avatar');
    expect(initials('')).toBe('');
    expect(initials('   ')).toBe('');
  });
});

describe('where a company keeps pay', () => {
  const withEnv = async (vars: Record<string, string>) => {
    const previous = { ...process.env };
    Object.assign(process.env, {
      // Point away from the developer's own .env, or "the default" is whatever
      // this machine happens to have configured.
      MERIDIAN_ENV_PATH: path.join(os.tmpdir(), 'meridian-no-such-env'),
      BAMBOOHR_SUBDOMAIN: 'yourcompany',
      BAMBOOHR_API_KEY: 'k',
      BAMBOOHR_MANAGER_EMPLOYEE_ID: '1',
      ...vars,
    });
    const { loadConfig, resetConfig } = await import('@/lib/env');
    resetConfig();
    const comp = loadConfig().bamboo?.comp;
    process.env = previous;
    resetConfig();
    return comp;
  };

  it('defaults to the standard BambooHR table', async () => {
    // Most companies use it. Defaulting to one tenant's custom table is how the
    // feature silently produces nothing for everybody else.
    expect((await withEnv({}))?.table).toBe('compensation');
  });

  it('takes a custom table and its field names from the environment', async () => {
    const comp = await withEnv({
      BAMBOOHR_COMP_TABLE: 'customPayHistory',
      BAMBOOHR_COMP_DATE_FIELD: 'customEffective',
      BAMBOOHR_COMP_AMOUNT_FIELD: 'customMonthly',
    });
    expect(comp?.table).toBe('customPayHistory');
    expect(comp?.dateField).toBe('customEffective');
    expect(comp?.amountField).toBe('customMonthly');
  });
});
