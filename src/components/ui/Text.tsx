import styles from './Text.module.css';

export type TextLevel =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'small'
  | 'label'
  | 'micro'
  | 'mono';

export type Tone =
  | 'strong'
  | 'default'
  | 'muted'
  | 'faint'
  | 'inverted'
  | 'inherit'
  | 'accent'
  | 'danger'
  | 'warning'
  | 'success'
  | 'info';

type Props = {
  children: React.ReactNode;
  level?: TextLevel;
  tone?: Tone;
  /** `h1`–`h4`, `p`, `span`, `div`, `label`. Level is the look; this is the tag. */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div' | 'label' | 'dt' | 'dd' | 'pre';
  /** One line, ellipsised. For a string the reader can find in full elsewhere. */
  truncate?: boolean;
  /** One line, whole. For a short label that must not lose its end. */
  nowrap?: boolean;
  /** Tabular figures, so a column of amounts lines up on the decimal. */
  numeric?: boolean;
  /** Struck through. For a thing that happened and is over, not a thing removed. */
  strike?: boolean;
  id?: string;
  title?: string;
};

/**
 * All text in the app goes through here. There is no other way to set a font
 * size: `tests/unit/design-system.test.ts` fails on a `font` or `font-size`
 * declared outside this file.
 *
 * Ten levels, and adding an eleventh is an edit to the scale in `tokens.css` and to
 * this component — which is the point. A one-off size at a call site is what
 * turned nineteen sizes into sixty-four rules.
 */
export function Text({
  children,
  level = 'body',
  tone,
  as: Tag = 'span',
  truncate,
  nowrap,
  numeric,
  strike,
  id,
  title,
}: Props) {
  return (
    <Tag
      id={id}
      title={title}
      className={styles.text}
      data-level={level}
      data-tone={tone}
      data-truncate={truncate || undefined}
      data-nowrap={nowrap || undefined}
      data-numeric={numeric || undefined}
      data-strike={strike || undefined}
    >
      {children}
    </Tag>
  );
}

/**
 * A filename, a token name, an env var. The one inline literal style — Help and
 * the stories both used to draw their own.
 */
export function Code({ children }: { children: React.ReactNode }) {
  return <code className={styles.code}>{children}</code>;
}

/**
 * A command to type, or an error exactly as the system reported it. Never used
 * for prose — that is `Text`, and never for a filename in a sentence — that is
 * `Code`.
 */
export function CodeBlock({ children }: { children: React.ReactNode }) {
  return <pre className={styles.block}>{children}</pre>;
}
