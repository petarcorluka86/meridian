import styles from './IconTile.module.css';
import type { PillTone } from './Pill';

/**
 * An icon on a tinted square, taking one of the four tones. The icon inside
 * should use `currentColor`, so it follows the tone rather than choosing.
 */
export function IconTile({
  children,
  tone = 'neutral',
  size = 'md',
}: {
  children: React.ReactNode;
  tone?: PillTone;
  size?: 'md' | 'sm';
}) {
  return (
    <span className={styles.tile} data-tone={tone} data-size={size}>
      {children}
    </span>
  );
}
