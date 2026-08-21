import styles from './Pill.module.css';

export type PillTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';

/**
 * A status, never a sentence and never a control. Five tones, and they mean
 * what they mean everywhere: danger failed, warning is old or unfinished,
 * success is settled, info is scheduled, neutral is merely a fact.
 *
 * Nothing clickable is a pill. If it can be pressed it is a `Chip` or a
 * `Button`.
 */
export function Pill({
  children,
  tone = 'neutral',
  size = 'sm',
}: {
  children: React.ReactNode;
  tone?: PillTone;
  size?: 'sm' | 'md';
}) {
  return (
    <span className={styles.pill} data-tone={tone} data-size={size}>
      {children}
    </span>
  );
}

/**
 * A note's category. Its colour comes from the category palette in `tokens.css`
 * rather than from a tone, because the six are a fixed set of labels rather than
 * four meanings — and the same label has to read the same colour on every page.
 */
export function CategoryPill({ category, label }: { category: string; label: string }) {
  return (
    <span className={styles.pill} data-category={category}>
      {label}
    </span>
  );
}
