import styles from './Meter.module.css';

export type MeterTone = 'accent' | 'success';

/**
 * A proportion of a known total, drawn as a bar.
 *
 * The one thing the system had no way to say. A project with phases has a
 * fraction done, and "3 of 5" as text is a number the eye has to work out;
 * a bar is the same fact read at a glance, and the text stays beside it.
 *
 * Two tones, and the second is the whole reason there are two: `success` when
 * the total is reached, so a finished project is a different colour from one
 * that is merely far along. Nothing decorative is a `Meter` — if there is no
 * denominator, this is the wrong component.
 *
 * The width is the only length in this app that comes from data rather than from
 * the scale, so it is passed in as a custom property and the stylesheet is still
 * the only thing that decides what to do with it.
 */
export function Meter({
  value,
  total,
  tone = 'accent',
  label,
}: {
  value: number;
  total: number;
  tone?: MeterTone;
  /** What the bar is measuring, for anyone not looking at it. */
  label: string;
}) {
  const percent = total > 0 ? Math.round((Math.min(value, total) / total) * 100) : 0;

  return (
    <div
      className={styles.track}
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={total}
    >
      <span
        className={styles.fill}
        data-tone={tone}
        style={{ '--meter-fill': `${percent}%` } as React.CSSProperties}
      />
    </div>
  );
}
