'use client';

import styles from './Toggle.module.css';
import { Text } from './Text';

/**
 * A setting that takes effect the moment it is flipped. A `Checkbox` implies a
 * form to submit; this does not, so it is what the filter switches use.
 */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className={styles.toggle}>
      <input
        type="checkbox"
        className={styles.input}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={styles.track} aria-hidden>
        <span className={styles.knob} />
      </span>
      <Text level="small" tone="muted">
        {label}
      </Text>
    </label>
  );
}
