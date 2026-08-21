import Link from 'next/link';
import styles from './Chip.module.css';

type Shared = {
  children: React.ReactNode;
  size?: 'md' | 'sm';
  selected?: boolean;
};

/**
 * A filter. Two sizes: `md` for a page-level filter row, `sm` for a row that has
 * no space for one.
 *
 * A chip is never an action — that is what `Button` is for. If pressing it does
 * something other than narrowing what is on screen, it is the wrong component.
 */
export function Chip({
  children,
  size = 'md',
  selected,
  onClick,
  disabled,
  ariaLabel,
}: Shared & { onClick?: () => void; disabled?: boolean; ariaLabel?: string }) {
  return (
    <button
      type="button"
      className={styles.chip}
      data-size={size}
      data-selected={selected || undefined}
      aria-pressed={selected}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/**
 * The same chip as a link. Filters are URL state in this app — a filtered view
 * has to be shareable and has to survive a reload — so most chips are links.
 */
export function ChipLink({ children, href, size = 'md', selected }: Shared & { href: string }) {
  return (
    <Link
      href={href}
      className={styles.chip}
      data-size={size}
      data-selected={selected || undefined}
      aria-current={selected || undefined}
    >
      {children}
    </Link>
  );
}

/** The track. Two or three segments, never more — beyond that it is a Select. */
export function Segmented({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset brings a legend and its own box; this is a view switch, not a group of form fields
    <div className={styles.track} role="group" aria-label={label}>
      {children}
    </div>
  );
}

export function Segment({
  children,
  href,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  href?: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  if (href) {
    return (
      <Link
        href={href}
        className={styles.segment}
        data-selected={selected || undefined}
        aria-current={selected || undefined}
      >
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={styles.segment}
      data-selected={selected || undefined}
      aria-pressed={selected}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
