'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { syncSourceAction, type SyncTarget } from '@/app/actions';
import type { Freshness } from '@/lib/sources/cache';
import { Pill } from './Pill';
import { RefreshIcon } from './icons';
import styles from './SyncBadge.module.css';

/**
 * How long ago this card's numbers arrived, and a way to go and look again.
 *
 * It replaced a pill that said "Live" or "Stale · 20m old". Those were states of
 * the cache; what somebody actually wants to know is how old the number in front
 * of them is, and whether they can have a newer one — so the badge says the age
 * and is the button.
 *
 * The age comes down already worked out (`freshness.age`): computing a relative
 * time from the browser's clock disagrees with the server's, which React calls a
 * hydration mismatch and a reader would call a lie.
 *
 * A failure keeps the age and turns red, with the reason on hover. The last good
 * numbers are still on screen and the badge has to say that they are old rather
 * than only that something went wrong.
 */
export function SyncBadge({
  source,
  target,
  freshness,
}: {
  /** Named in the title, so hovering says which system did not answer. */
  source: string;
  target: SyncTarget;
  freshness: Freshness;
}) {
  const router = useRouter();
  const [syncing, startTransition] = useTransition();

  // Nothing to refresh, and nothing to be old: say so and stop.
  if (freshness.state === 'unconfigured') {
    return <Pill tone="warning">{source} is not connected</Pill>;
  }

  const sync = () =>
    startTransition(async () => {
      await syncSourceAction(target);
      router.refresh();
    });

  const tone =
    freshness.state === 'failed'
      ? 'danger'
      : freshness.state === 'stale' || freshness.state === 'missing'
        ? 'warning'
        : undefined;

  const age = freshness.state === 'missing' ? 'never' : (freshness.age ?? 'never');

  const title =
    freshness.state === 'failed'
      ? `${freshness.message}. Press to try again.`
      : freshness.state === 'missing'
        ? `${source} has not answered yet. Press to fetch.`
        : `${source} synced ${age === 'now' ? 'a moment' : age} ago. Press to refresh.`;

  return (
    <button
      type="button"
      className={styles.badge}
      data-tone={tone}
      data-syncing={syncing || undefined}
      disabled={syncing}
      onClick={sync}
      title={title}
      aria-label={title}
    >
      <span className={styles.spin}>
        <RefreshIcon />
      </span>
      {syncing ? 'syncing' : age}
    </button>
  );
}
