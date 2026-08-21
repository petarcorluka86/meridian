import { z } from 'zod';
import { loadConfig } from '@/lib/env';
import { failureOf, freshnessOf, readCache, type Freshness } from '../cache';

/** The shape of everything the app keeps from BambooHR, and how fresh it is. */
/** What the app keeps from BambooHR. Everything here is read; nothing is written. */
export const BambooCache = z.object({
  fetchedAt: z.string(),
  /** Approvals and absences refresh on their own, faster, clock. */
  inboxFetchedAt: z.string().nullable().default(null),
  /** Compensation is one call per person, so it keeps its own clock too. */
  compFetchedAt: z.string().nullable().default(null),
  /** Why compensation is empty, when it is — shown on the screens that want it. */
  compNote: z.string().nullable().default(null),
  etag: z.string().nullable().default(null),
  employees: z
    .array(
      z.object({
        id: z.string(),
        slug: z.string(),
        displayName: z.string(),
        jobTitle: z.string().nullable().default(null),
        department: z.string().nullable().default(null),
        hireDate: z.string().nullable().default(null),
        workEmail: z.string().nullable().default(null),
        workPhone: z.string().nullable().default(null),
        supervisorId: z.string().nullable().default(null),
      }),
    )
    .default([]),
  compensation: z
    .record(
      z.string(),
      z.object({
        type: z.string().default('Salary'),
        paidPer: z.string().default('Month'),
        paySchedule: z.string().default('Monthly'),
        currency: z.string().default('EUR'),
        rows: z
          .array(
            z.object({
              startDate: z.string(),
              endDate: z.string().nullable().default(null),
              /** Total compensation for the month — what the UI calls the rate. */
              rate: z.number(),
              /** Gross salary alone, before allowances and benefits. */
              gross: z.number().nullable().default(null),
              reason: z.string().default(''),
              comment: z.string().default(''),
            }),
          )
          .default([]),
        bonus: z
          .array(z.object({ date: z.string(), amount: z.number(), reason: z.string().default('') }))
          .default([]),
      }),
    )
    .default({}),
  timeOff: z
    .array(
      z.object({
        slug: z.string(),
        name: z.string().default(''),
        type: z.string(),
        start: z.string(),
        end: z.string(),
        /** "Work From Home" is a leave type here, so presence splits on it. */
        wfh: z.boolean().default(false),
      }),
    )
    .default([]),
  inbox: z
    .array(
      z.object({
        kind: z.enum(['time off', 'document', 'onboarding']),
        slug: z.string().nullable().default(null),
        title: z.string(),
        detail: z.string().default(''),
        since: z.string(),
      }),
    )
    .default([]),
});

export type BambooCache = z.infer<typeof BambooCache>;

export type BambooRead = {
  data: BambooCache | null;
  /** The roster. */
  freshness: Freshness;
  /** Approvals and absences, on the shorter window. */
  inboxFreshness: Freshness;
  /** Compensation, on the roster's window but its own timestamp. */
  compFreshness: Freshness;
};

export function readBamboo(): BambooRead {
  const config = loadConfig();
  const { data, fetchedAt } = readCache('bamboohr', BambooCache);
  const configured = Boolean(config.bamboo);
  return {
    data,
    freshness: freshnessOf(
      fetchedAt,
      config.bamboo?.maxAge ?? 3600,
      configured,
      undefined,
      failureOf('bamboohr'),
    ),
    inboxFreshness: freshnessOf(
      data?.inboxFetchedAt ?? null,
      config.bamboo?.inboxMaxAge ?? 300,
      configured,
    ),
    compFreshness: freshnessOf(
      data?.compFetchedAt ?? null,
      config.bamboo?.maxAge ?? 3600,
      configured,
    ),
  };
}
