import styles from './IconTile.module.css';
import type { PillTone } from './Pill';

/**
 * An icon on a tinted square, taking one of the four tones. The icon inside
 * should use `currentColor`, so it follows the tone rather than choosing.
 *
 * `lg` is the empty state's tile: bigger than a control, because it is the first
 * thing read on a card with nothing in it, and outlined so it holds its shape
 * against the white of the card.
 */
export function IconTile({
  children,
  tone = 'neutral',
  size = 'md',
}: {
  children: React.ReactNode;
  tone?: PillTone;
  size?: 'md' | 'sm' | 'lg';
}) {
  return (
    <span className={styles.tile} data-tone={tone} data-size={size}>
      {children}
    </span>
  );
}
