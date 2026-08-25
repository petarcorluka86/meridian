import { CheckIcon } from './icons';
import styles from './Stepper.module.css';
import { Text } from './Text';

export type StepState = 'done' | 'current' | 'upcoming';

export type Step = {
  label: string;
  state: StepState;
};

/**
 * Where you are in a sequence you cannot leave the middle of.
 *
 * It replaced a row of pills that said the same thing in words — "✓ 1 · Your
 * folder", "2 · BambooHR" — which is a sentence to read rather than a shape to
 * glance at, and which gave a done step and a current step the same weight.
 * Here the trail behind you is drawn: a finished step is a tick on a filled
 * disc, the line up to it is coloured, and everything past the one you are on is
 * a hairline.
 *
 * The current step is `--selected` rather than the accent, for the same reason a
 * selected chip is: a selection is a state, and the accent means action. Nothing
 * here is pressable — this reports progress, it does not offer navigation, and a
 * step somebody has not reached is not somewhere they can go.
 *
 * Only the wizard uses it. It is a primitive because it draws, and everything
 * that draws lives here.
 */
export function Stepper({ steps, label }: { steps: Step[]; label: string }) {
  const current = steps.findIndex((step) => step.state === 'current');

  return (
    <ol className={styles.stepper} aria-label={label}>
      {steps.map((step, index) => (
        <li
          key={step.label}
          className={styles.step}
          data-state={step.state}
          aria-current={step.state === 'current' ? 'step' : undefined}
        >
          <span className={styles.disc} data-state={step.state}>
            {step.state === 'done' ? (
              <CheckIcon />
            ) : (
              <Text level="micro" tone="inherit">
                {String(index + 1)}
              </Text>
            )}
          </span>
          <Text
            level="small"
            tone={step.state === 'current' ? 'strong' : step.state === 'done' ? 'muted' : 'faint'}
          >
            {step.label}
          </Text>
        </li>
      ))}
      {/* Said in words for anyone not looking at it, since the discs carry the
          state in colour and shape alone. */}
      <span className={styles.said}>
        {current >= 0 ? `Step ${current + 1} of ${steps.length}` : `${steps.length} steps`}
      </span>
    </ol>
  );
}
