import styles from './Layout.module.css';
import { Text } from './Text';

/**
 * The seven spacing steps, and zero.
 *
 * Zero is on the scale because "no space" is a decision, not an absence: a name
 * with its reason under it is one thought, and the leading of the two lines is
 * already the gap between them.
 */
export type Space = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

type Align = 'start' | 'center' | 'end' | 'baseline' | 'stretch';
type Justify = 'start' | 'center' | 'end' | 'between';

type FlexProps = {
  children: React.ReactNode;
  gap?: Space;
  align?: Align;
  justify?: Justify;
};

/** A column. */
export function Stack({ children, gap = 4, align, justify }: FlexProps) {
  return (
    <div className={styles.stack} data-gap={gap} data-align={align} data-justify={justify}>
      {children}
    </div>
  );
}

/** A row. Wraps by default, because every row in this app eventually has to. */
export function Row({
  children,
  gap = 2,
  align = 'center',
  justify,
  wrap = true,
}: FlexProps & { wrap?: boolean }) {
  return (
    <div
      className={styles.row}
      data-gap={gap}
      data-align={align}
      data-justify={justify}
      data-wrap={wrap || undefined}
    >
      {children}
    </div>
  );
}

/** Eats the leftover width, so nothing has to reach for `margin-left: auto`. */
export function Spacer() {
  return <span className={styles.spacer} />;
}

export function Divider({
  orientation = 'horizontal',
}: {
  orientation?: 'horizontal' | 'vertical';
}) {
  return <span className={styles.divider} data-orientation={orientation} aria-hidden />;
}

/**
 * The page frame: one inset, shared by every screen, and two widths — wide for
 * the two-column screens, narrow for the ones that are a single list.
 */
export function Page({
  children,
  width = 'wide',
  flush,
}: {
  children: React.ReactNode;
  width?: 'wide' | 'narrow';
  /** No space underneath, for something sitting directly above a page. */
  flush?: boolean;
}) {
  return (
    // `data-screen` is what the pixel gate measures: the frame including its
    // gutter, not the content inside it.
    <div className={styles.page} data-width={width} data-flush={flush || undefined} data-screen>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  level = 'title',
  end,
}: {
  title: React.ReactNode;
  /** A count or a date, under the title. Never beside it — it is not an action. */
  subtitle?: React.ReactNode;
  /** `display` is the Overview greeting. Every other screen is `title`. */
  level?: 'display' | 'title';
  end?: React.ReactNode;
}) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageTitle}>
        <Text as="h1" level={level}>
          {title}
        </Text>
        {subtitle ? (
          <Text level="small" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </div>
      {end ? (
        <>
          <Spacer />
          {end}
        </>
      ) : null}
    </header>
  );
}

/** The two-column body: the wide column, then the narrow one. */
export function Columns({ main, side }: { main: React.ReactNode; side: React.ReactNode }) {
  return (
    <div className={styles.columns}>
      <div className={styles.columnMain}>{main}</div>
      <div className={styles.columnSide}>{side}</div>
    </div>
  );
}
