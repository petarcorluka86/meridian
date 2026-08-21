'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { EyeIcon } from './icons';
import styles from './Reveal.module.css';

const WINDOW_SECONDS = 30;

/**
 * Money and plans blur until revealed, and the reveal closes itself after thirty
 * seconds. Each card reveals independently, and no setting turns it off.
 */
export function useReveal() {
  const [revealed, setRevealed] = useState(false);
  const [left, setLeft] = useState(WINDOW_SECONDS);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setRevealed(false);
    setLeft(WINDOW_SECONDS);
  }, []);

  const toggle = useCallback(() => {
    if (revealed) {
      stop();
      return;
    }
    const expiry = Date.now() + WINDOW_SECONDS * 1000;
    setRevealed(true);
    setLeft(WINDOW_SECONDS);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((expiry - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining <= 0) stop();
    }, 1000);
  }, [revealed, stop]);

  // A component that unmounts mid-countdown must not leave an interval running.
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  return { revealed, left, toggle };
}

export function RevealButton({
  revealed,
  left,
  onToggle,
  label,
}: {
  revealed: boolean;
  left: number;
  onToggle: () => void;
  label?: string;
}) {
  return (
    <Button
      variant="neutral"
      size="sm"
      onClick={onToggle}
      ariaPressed={revealed}
      icon={<EyeIcon />}
    >
      {revealed ? 'Hide' : (label ?? 'Reveal')}
      {revealed ? <span className={styles.countdown}>· {left}s</span> : null}
    </Button>
  );
}

/** Blurred, unselectable and untouchable — not merely visually obscured. */
export function Blurred({
  revealed,
  children,
  className,
}: {
  revealed: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={[revealed ? undefined : styles.hidden, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
