'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import styles from './Shell.module.css';

/**
 * The sidebar and the scrolling column, and the two screens that have neither.
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
  const path = usePathname();
  const onSetup = path.startsWith('/setup');
  // The note page, which is a mode rather than a place: it takes the window and
  // carries its own way out.
  const onNote = path.startsWith('/notes/edit');

  return (
    <>
      {/*
       * No sidebar during setup. On a first run every link in it goes somewhere
       * that has no vault to read yet, and the wizard is the only thing to do —
       * a nav that cannot be used is furniture in the way of the one screen that
       * matters. The same holds for one connection reopened from Settings, which
       * carries its own way back.
       *
       * And none while writing a note, for the other half of the same reason:
       * leaving is a decision there — unsaved changes ask first — so a nav that
       * walks straight out of it is a way to lose what was typed. Cancel, Save
       * and the back link are the three ways out, and all three know about it.
       */}
      {onSetup || onNote ? null : <Sidebar />}
      <div className={`scroll ${styles.main}`} data-solo={onSetup || undefined}>
        {children}
      </div>
    </>
  );
}
