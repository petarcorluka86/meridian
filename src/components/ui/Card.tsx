import Link from 'next/link';
import styles from './Card.module.css';
import { Row, Spacer } from './Layout';
import { Pill } from './Pill';
import { Text, type Tone } from './Text';

/**
 * One container, and every panel in the app is it. There is no second card, no
 * elevated variant and no borderless variant: a change to the radius or the
 * border in `tokens.css` moves every panel on every screen at once.
 */
export function Card({
  children,
  tone,
}: {
  children: React.ReactNode;
  /** For a panel about a problem rather than about data. */
  tone?: 'warning' | 'danger';
}) {
  return (
    <section className={styles.card} data-tone={tone}>
      {children}
    </section>
  );
}

/** A card that is a link. The whole card is the target, not a word inside it. */
export function CardLink({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <Link href={href} className={styles.link}>
      {children}
    </Link>
  );
}

/**
 * Title, then an optional count, then whatever carries state — a freshness pill,
 * a Reveal button, a link out. In that order, on every card.
 */
export function CardHeader({
  title,
  count,
  end,
  bare,
}: {
  title: React.ReactNode;
  count?: number;
  end?: React.ReactNode;
  /** No rows follow, so the header carries no bottom border. */
  bare?: boolean;
}) {
  return (
    <header className={styles.header} data-bare={bare || undefined}>
      {/* One level for every card on every screen. There used to be a second,
          smaller title for the narrow column, and no rule for which went where —
          so Meetings and Out ended up different sizes side by side. */}
      <Text as="h2" level="subheading" tone="strong">
        {title}
      </Text>
      {count === undefined ? null : (
        <Text level="small" tone="muted" numeric>
          {count}
        </Text>
      )}
      {end ? (
        <>
          <Spacer />
          <Row gap={2}>{end}</Row>
        </>
      ) : null}
    </header>
  );
}

/** Prose, a form, a chart — anything that is not a list of rows. */
export function CardBody({ children }: { children: React.ReactNode }) {
  return <div className={styles.body}>{children}</div>;
}

/** One row of a list. `tone` tints it: a form's error, a saved confirmation. */
export function CardRow({
  children,
  pending,
  tone,
}: {
  children: React.ReactNode;
  pending?: boolean;
  tone?: 'danger' | 'warning' | 'success';
}) {
  return (
    <div className={styles.row} data-pending={pending || undefined} data-tone={tone}>
      {children}
    </div>
  );
}

/**
 * A heading between groups of rows — Late, Today, Upcoming. The count is a pill
 * rather than a bare number, so it cannot be mistaken for part of the label.
 */
export function CardGroup({ label, tone, count }: { label: string; tone?: Tone; count?: number }) {
  return (
    <div className={styles.group}>
      <Text level="micro" tone={tone ?? 'muted'}>
        {label.toUpperCase()}
      </Text>
      {count === undefined ? null : <Pill>{count}</Pill>}
    </div>
  );
}

/** A row that picks one of several options — the whole row is the control. */
export function CardRowButton({
  children,
  onClick,
  selected,
}: {
  children: React.ReactNode;
  onClick: () => void;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      className={styles.row}
      data-interactive
      data-selected={selected || undefined}
      aria-pressed={selected}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** A row that is a link. The whole row is the target, not a word inside it. */
export function CardRowLink({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <a className={styles.row} data-interactive href={href}>
      {children}
    </a>
  );
}

export function CardToolbar({ children }: { children: React.ReactNode }) {
  return <div className={styles.toolbar}>{children}</div>;
}

export function CardFooter({ children }: { children: React.ReactNode }) {
  return <div className={styles.footer}>{children}</div>;
}
