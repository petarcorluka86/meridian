'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import styles from './Shell.module.css';

/**
 * The sidebar and the scrolling column, and the one screen that has neither.
 *
 * The decision is made here, from `usePathname`, rather than in the root layout
 * from the request header — because a root layout is rendered once per document
 * and kept across every client navigation after it. Deciding there meant the
 * wizard's own "Open Meridian" left you in the app with no sidebar until a hard
 * reload, which is a bug nobody would guess the cause of.
 *
 * `usePathname` renders on the server too, so the first paint is still right.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const onSetup = usePathname().startsWith('/setup');

  return (
    <>
      {/*
       * No sidebar during setup. On a first run every link in it goes somewhere
       * that has no vault to read yet, and the wizard is the only thing to do —
       * a nav that cannot be used is furniture in the way of the one screen that
       * matters. The same holds for one connection reopened from Settings, which
       * carries its own way back.
       */}
      {onSetup ? null : <Sidebar />}
      <div className={`scroll ${styles.main}`} data-solo={onSetup || undefined}>
        {children}
      </div>
    </>
  );
}
