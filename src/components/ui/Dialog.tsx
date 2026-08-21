'use client';

import { useEffect, useRef } from 'react';
import styles from './Dialog.module.css';
import { Text } from './Text';

const WarningIcon = () => (
  <svg
    aria-hidden="true"
    className={styles.icon}
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--danger)"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 4l9 16H3z" />
    <path d="M12 10v4M12 17h.01" />
  </svg>
);

/**
 * The one modal in the app. Escape closes it, a click on the scrim closes it, a
 * click that started inside it does not, and the element named by `initialFocus`
 * takes focus on open.
 *
 * A dialog is for a decision that cannot be undone, or for the one form that has
 * nowhere on the page to live — editing a task, which is reachable from three
 * screens and cannot expand a row on any of them. Anything else belongs on the
 * page.
 *
 * The body is passed through as given: a sentence arrives already wrapped in
 * `Text`, and a form arrives as fields. Wrapping it here put the fields inside a
 * span.
 */
export function Dialog({
  open,
  title,
  tone = 'neutral',
  children,
  footer,
  onClose,
  initialFocus,
}: {
  open: boolean;
  title: string;
  tone?: 'neutral' | 'danger';
  children: React.ReactNode;
  footer: React.ReactNode;
  onClose: () => void;
  initialFocus?: React.RefObject<HTMLElement | null>;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    (initialFocus?.current ?? dialogRef.current)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, initialFocus]);

  if (!open) return null;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: dismiss-on-backdrop; Escape is bound to the document above, so the scrim carries no keyboard duty of its own
    <div
      className={styles.scrim}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: `aria-modal` is valid on both roles this can take; the rule cannot see through the ternary and reads the element as having no role at all */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={styles.dialog}
        // An alert interrupts; a form does not. The tone is what tells them apart.
        role={tone === 'danger' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-label={title}
      >
        <header className={styles.header} data-tone={tone}>
          {tone === 'danger' ? <WarningIcon /> : null}
          <Text as="h2" level="subheading" tone={tone === 'danger' ? 'danger' : 'strong'}>
            {title}
          </Text>
        </header>
        <div className={styles.body}>{children}</div>
        <div className={styles.footer}>{footer}</div>
      </div>
    </div>
  );
}
