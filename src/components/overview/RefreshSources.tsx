'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { refreshSourcesAction } from '@/app/actions';

/**
 * Cache first, then revalidate. The page has already painted from .cache/; this
 * asks the server to refetch whatever has passed its window, and refreshes in
 * place when something did. Values swap without the page ever blanking.
 *
 * Mounted in the layout, so any screen you sit on stays current — not only the
 * one that happens to show the data.
 */
export function RefreshSources() {
  const router = useRouter();
  const running = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (running.current) return;
      running.current = true;
      try {
        const { refreshed } = await refreshSourcesAction();
        if (refreshed && !cancelled) router.refresh();
      } finally {
        running.current = false;
      }
    };

    void tick();
    // A hub left open all day should not go stale. The action itself is a no-op
    // inside the freshness window, so this costs nothing most of the time.
    const timer = setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [router]);

  return null;
}
