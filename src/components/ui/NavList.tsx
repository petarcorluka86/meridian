import Link from 'next/link';
import styles from './NavList.module.css';
import { Text } from './Text';

/**
 * A column of rounded, selectable rows — the sidebar, Help's sections, the vault
 * tree, the changelog's changed files. It carries the inset and the gap so no
 * call site has to remember them, which three of the four did not.
 */
export function NavList({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <nav className={styles.list} aria-label={label}>
      {children}
    </nav>
  );
}

/**
 * One row. `href` makes it a link and `onClick` a button — the vault tree needs
 * buttons for folders, which open and close rather than going anywhere.
 *
 * `label` is the text; anything in `children` sits after it, at the end of the
 * row: a file count, a folder path.
 */
export function NavItem({
  label,
  icon,
  children,
  href,
  onClick,
  selected,
  indent = 0,
  expanded,
}: {
  label: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  selected?: boolean;
  /** Depth in a tree. One spacing step per level. */
  indent?: number;
  /** For a row that opens and closes rather than navigating. */
  expanded?: boolean;
}) {
  const body = (
    <>
      {icon}
      <span className={styles.label}>
        {typeof label === 'string' ? (
          <Text level="small" tone={selected ? 'strong' : 'default'} truncate>
            {label}
          </Text>
        ) : (
          label
        )}
      </span>
      {children}
    </>
  );

  const shared = {
    className: styles.item,
    'data-selected': selected || undefined,
    style: indent
      ? ({ '--indent': `calc(${indent} * var(--space-4))` } as React.CSSProperties)
      : undefined,
  };

  if (href) {
    return (
      <Link {...shared} href={href} scroll={false} aria-current={selected || undefined}>
        {body}
      </Link>
    );
  }
  return (
    <button {...shared} type="button" onClick={onClick} aria-expanded={expanded}>
      {body}
    </button>
  );
}
