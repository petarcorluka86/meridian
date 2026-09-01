'use client';

import { useTransition } from 'react';
import { reloadAppAction } from '@/app/settings/actions';
import { Button } from '@/components/ui';

/**
 * The order matters: caches drop on the server first, then the window reloads,
 * so the page that comes back is built from disk rather than from the memory
 * this exists to flush. `location.reload()` never resolves into anything —
 * the pending state simply lasts until the new page replaces this one.
 */
export function ReloadApp() {
  const [pending, startTransition] = useTransition();

  const reload = () => {
    startTransition(async () => {
      await reloadAppAction();
      window.location.reload();
    });
  };

  return (
    <Button onClick={reload} disabled={pending} size="sm">
      {pending ? 'Reloading…' : 'Reload Meridian'}
    </Button>
  );
}
