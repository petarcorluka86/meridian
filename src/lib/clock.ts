/**
 * One clock, so the pixel gate can stop it.
 *
 * Every relative label in the app — "3 days late", "1h old", "open 4 days" — is
 * computed from the current instant, which means a screenshot taken at 13:48 and
 * compared at 15:20 is comparing two different truths. Pinning only the date was
 * not enough: the freshness pill flips from Live to Stale inside a single
 * afternoon, and that is a real change the gate should have caught and did not.
 *
 * MERIDIAN_NOW is an ISO instant. Refused in production: a hub that lies about
 * what time it is would be worse than one that fails to start.
 */
export function now(): number {
  const pinned = process.env.MERIDIAN_NOW;
  if (pinned && process.env.NODE_ENV !== 'production') {
    const parsed = Date.parse(pinned);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
}

export function nowDate(): Date {
  return new Date(now());
}
