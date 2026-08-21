'use client';

import styles from './DayStepper.module.css';
import { NextIcon, PrevIcon } from './icons';
import { Text } from './Text';

/** One day the cache can answer for, and how to say it. */
export type Day = { iso: string; label: string };

/**
 * Walks a card through the days the cache actually holds.
 *
 * It steps an index into a list built on the server rather than doing date
 * arithmetic here: a day worked out from the visitor's clock is a different day
 * from the server's for an hour either side of midnight, and every label on the
 * card is computed against the server's.
 *
 * The ends are disabled rather than hidden, so the control keeps its width and
 * the header does not shuffle as you reach the edge of what is cached.
 */
export function DayStepper({
  days,
  index,
  onChange,
  label = 'Day',
}: {
  days: Day[];
  index: number;
  onChange: (index: number) => void;
  /** What is being stepped, for anyone who cannot see the arrows. */
  label?: string;
}) {
  const day = days[index];
  if (!day) return null;

  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset brings a legend and its own box; this is two buttons and a readout, not a group of form fields
    <span className={styles.stepper} role="group" aria-label={label}>
      <button
        type="button"
        className={styles.step}
        onClick={() => onChange(index - 1)}
        disabled={index === 0}
        aria-label="Previous day"
      >
        <PrevIcon />
      </button>
      <span className={styles.label}>
        <Text level="label" tone="strong">
          {day.label}
        </Text>
      </span>
      <button
        type="button"
        className={styles.step}
        onClick={() => onChange(index + 1)}
        disabled={index === days.length - 1}
        aria-label="Next day"
      >
        <NextIcon />
      </button>
    </span>
  );
}
