import Link from 'next/link';
import { ExternalIcon } from './icons';
import { Text, type TextLevel } from './Text';
import styles from './TextLink.module.css';

/**
 * A link in a line of text or a row. `ButtonLink` is the control; this is the
 * words.
 *
 * `external` makes it the accent colour, adds the glyph, and opens in a new tab —
 * all three together, so a link that leaves the app cannot look like one that
 * does not. It is the same promise `ButtonLink external` makes, and neither call
 * site has to remember any part of it.
 *
 * A link within the app takes the row's ink instead: the whole row is usually the
 * target, and colouring the words as well would say it twice.
 *
 * A string child becomes a `Text` at `level`; anything else is rendered as it is,
 * so a face and a name can be one target. `NavItem.label` reads its children the
 * same way.
 */
export function TextLink({
  children,
  href,
  external,
  level = 'label',
  truncate,
}: {
  children: React.ReactNode;
  href: string;
  /** Leaves the app: accent, glyph, new tab. */
  external?: boolean;
  level?: TextLevel;
  truncate?: boolean;
}) {
  const body = (
    <>
      {typeof children === 'string' ? (
        <Text level={level} tone="inherit" truncate={truncate}>
          {children}
        </Text>
      ) : (
        children
      )}
      {external ? <ExternalIcon /> : null}
    </>
  );

  if (external) {
    return (
      <a
        className={styles.link}
        data-external
        href={href}
        target="_blank"
        rel="noreferrer noopener"
      >
        {body}
      </a>
    );
  }
  return (
    <Link className={styles.link} href={href}>
      {body}
    </Link>
  );
}
