import { Text, type Tone } from './Text';
import styles from './Stat.module.css';

/**
 * A labelled number. `lg` is the one figure a screen is about; `md` is the
 * others standing beside it.
 *
 * The value is always tabular, so a row of them lines up on the digits.
 */
export function Stat({
  label,
  value,
  size = 'md',
  tone,
}: {
  label: string;
  value: React.ReactNode;
  size?: 'lg' | 'md';
  tone?: Tone;
}) {
  return (
    <div className={styles.stat}>
      <Text level="small" tone="muted">
        {label}
      </Text>
      <Text level={size === 'lg' ? 'title' : 'heading'} tone={tone} numeric>
        {value}
      </Text>
    </div>
  );
}
