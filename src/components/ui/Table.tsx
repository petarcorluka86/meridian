import Link from 'next/link';
import styles from './Table.module.css';

type Align = 'start' | 'center' | 'end';

/**
 * Columns, headers and cells. Wrap it in a `Card` — the table draws no border of
 * its own, so the card's radius clips it and there is never a double edge.
 */
export function Table({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <table className={styles.table} aria-label={label}>
      {children}
    </table>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr>{children}</tr>
    </thead>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className={styles.tbody}>{children}</tbody>;
}

export function TR({
  children,
  interactive,
}: {
  children: React.ReactNode;
  interactive?: boolean;
}) {
  return (
    <tr className={styles.tr} data-interactive={interactive || undefined}>
      {children}
    </tr>
  );
}

export function TH({
  children,
  align,
  onSort,
  sorted,
}: {
  children: React.ReactNode;
  align?: Align;
  /** Makes the header a control. Pressing it sorts by this column. */
  onSort?: () => void;
  /** Which way, if this is the column being sorted by. */
  sorted?: 'asc' | 'desc';
}) {
  return (
    <th
      scope="col"
      className={styles.th}
      data-align={align}
      aria-sort={sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : undefined}
    >
      {onSort ? (
        <button type="button" className={styles.sort} onClick={onSort}>
          {children}
          {sorted ? <span aria-hidden>{sorted === 'asc' ? '↑' : '↓'}</span> : null}
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export function TD({
  children,
  align,
  numeric,
  link,
}: {
  children: React.ReactNode;
  align?: Align;
  /** Tabular figures and no wrapping, for a column of amounts or hours. */
  numeric?: boolean;
  /**
   * Makes the whole row navigable. One real anchor, in the cell that names the
   * thing, stretched over the row — a link per cell would be five links to the
   * same place, and a click handler on the row would not be a link at all.
   */
  link?: string;
}) {
  return (
    <td
      className={styles.td}
      data-align={align}
      data-numeric={numeric || undefined}
      data-link={link ? '' : undefined}
    >
      {link ? (
        <Link href={link} className={styles.rowLink}>
          {children}
        </Link>
      ) : (
        children
      )}
    </td>
  );
}
