'use client';

import { useTransition } from 'react';
import { reloadAppAction } from '@/app/settings/actions';
import { Button } from '@/components/ui';

type DesktopShell = { postMessage: (message: string) => void };

/**
 * Installed by the desktop bundle's WKWebView and by nothing else, so its
 * presence is what tells the page it is a window rather than a tab.
 */
function desktopShell(): DesktopShell | undefined {
  const host = window as unknown as {
    webkit?: { messageHandlers?: { meridian?: DesktopShell } };
  };
  return host.webkit?.messageHandlers?.meridian;
}

/**
 * The order matters: caches drop on the server first, then the page comes back,
 * so what is rendered is built from disk rather than from the memory this exists
 * to flush. Neither ending resolves into anything — the pending state simply
 * lasts until the new page, or the new process, replaces this one.
 *
 * In the desktop app the window is the app, so starting over means quitting and
 * opening again rather than reloading the document — which takes the dev server
 * with it when the app was the one that started it. The Server Action still runs
 * first, because a server somebody else started survives the restart and would
 * come back holding the same caches.
 */
export function ReloadApp() {
  const [pending, startTransition] = useTransition();

  const reload = () => {
    startTransition(async () => {
      await reloadAppAction();

      const shell = desktopShell();
      if (shell) shell.postMessage('restart');
      else window.location.reload();
    });
  };

  return (
    <Button onClick={reload} disabled={pending} size="sm">
      {pending ? 'Reloading…' : 'Reload Meridian'}
    </Button>
  );
}
