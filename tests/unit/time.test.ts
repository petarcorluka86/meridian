import { describe, expect, it } from 'vitest';
import { formatHours, parseHours, sumHours } from '@/lib/vault/time';
import { daysBetween, dueLabel, dueTone } from '@/lib/dates';

describe('parseHours', () => {
  it('accepts the forms the placeholder promises', () => {
    expect(parseHours('+1.5')).toBe(1.5);
    expect(parseHours('-2')).toBe(-2);
    expect(parseHours('2')).toBe(2);
  });

  it('accepts the typographic minus the app itself prints', () => {
    expect(parseHours('−1.5')).toBe(-1.5);
    expect(parseHours('–2')).toBe(-2);
  });

  it('accepts a decimal comma', () => {
    expect(parseHours('1,5')).toBe(1.5);
  });

  it('rounds to the half hour the balance is displayed in', () => {
    expect(parseHours('1.3')).toBe(1.5);
    expect(parseHours('1.1')).toBe(1);
  });

  it('refuses what it cannot mean', () => {
    expect(() => parseHours('abc')).toThrow(/must be a number/);
    expect(() => parseHours('')).toThrow(/must be a number/);
    expect(() => parseHours('0')).toThrow(/zero hours/);
    expect(() => parseHours('30')).toThrow(/more than a day/);
  });
});

describe('formatHours', () => {
  it('signs and fixes to one decimal', () => {
    expect(formatHours(1)).toBe('+1.0h');
    expect(formatHours(-2.5)).toBe('−2.5h');
    expect(formatHours(0)).toBe('0.0h');
  });
});

describe('sumHours', () => {
  it('sums to the half hour without float drift', () => {
    const entries = [0.1, 0.2, -0.3].map((hoursDelta) => ({ hoursDelta }));
    expect(sumHours(entries)).toBe(0);
    expect(sumHours([{ hoursDelta: -1.5 }, { hoursDelta: 0.5 }])).toBe(-1);
  });
});

describe('dates', () => {
  it('counts whole days across a month boundary', () => {
    expect(daysBetween('2026-08-31', '2026-09-01')).toBe(1);
    expect(daysBetween('2026-08-19', '2026-08-12')).toBe(-7);
  });

  it('does not shift a day across a DST change', () => {
    // Europe/Zagreb springs forward on 2026-03-29.
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
  });

  it('labels a due date the way a task row shows it', () => {
    expect(dueLabel(null)).toBe('no date');
    expect(dueLabel('2026-08-19', '2026-08-19')).toBe('today');
    expect(dueLabel('2026-08-16', '2026-08-19')).toBe('3 days late');
    expect(dueLabel('2026-08-18', '2026-08-19')).toBe('1 day late');
    expect(dueLabel('2026-08-22', '2026-08-19')).toBe('22 Aug');
  });

  it('tones a done task as done regardless of its date', () => {
    expect(dueTone('2026-08-01', true, '2026-08-19')).toBe('done');
    expect(dueTone('2026-08-01', false, '2026-08-19')).toBe('late');
  });
});
