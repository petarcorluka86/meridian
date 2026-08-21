import Link from 'next/link';
import styles from './Button.module.css';
import { ExternalIcon } from './icons';

export type ButtonVariant = 'primary' | 'neutral' | 'danger' | 'ghost';
export type ButtonSize = 'md' | 'sm';

type Shared = {
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * One glyph, from `icons.tsx`, chosen by what the action does.
   *
   * A prop rather than a child, so a button cannot end up with two — which is
   * exactly what happened when `ButtonLink external` added its own arrow beside a
   * caller's. `tests/unit/design-system.test.ts` fails on a glyph in the
   * children.
   */
  icon?: React.ReactNode;
  full?: boolean;
};

/**
 * Every button in the app. Three levels and two sizes, and that is the whole
 * set: one primary per form, neutral for everything beside it, danger only
 * inside a confirm dialog, ghost for an action that must not compete.
 *
 * Changing the accent, the radius or the control height in `tokens.css` changes
 * every button on every screen, because no screen declares one.
 */
export function Button({
  children,
  variant = 'neutral',
  size = 'md',
  icon,
  iconOnly,
  full,
  type = 'button',
  disabled,
  pending,
  onClick,
  name,
  value,
  ariaLabel,
  ariaPressed,
  focusRef,
}: Shared & {
  /** Square, with no label. `ariaLabel` is then the only thing announcing it. */
  iconOnly?: boolean;
  type?: 'button' | 'submit';
  disabled?: boolean;
  /** In flight. Shows as busy without going grey, and refuses further clicks. */
  pending?: boolean;
  onClick?: () => void;
  name?: string;
  value?: string;
  ariaLabel?: string;
  ariaPressed?: boolean;
  /** For the one control a dialog focuses when it opens. */
  focusRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={focusRef}
      type={type}
      className={styles.button}
      data-variant={variant}
      data-size={size}
      data-full={full || undefined}
      data-icon={iconOnly || undefined}
      data-pending={pending || undefined}
      disabled={disabled || pending}
      onClick={onClick}
      name={name}
      value={value}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
    >
      {icon}
      {children}
    </button>
  );
}

/**
 * The same thing that navigates. A link is never styled as a button by hand.
 *
 * `external` adds `target`, `rel` — and the external glyph, so a link that leaves
 * the app always looks like one without any call site remembering. Passing `icon`
 * replaces it, for the rare case where the verb says more than the destination:
 * a meeting's Join is a video call before it is a link out.
 *
 * A verb leads and a destination trails: `icon` sits before the label, the
 * external arrow after it. "Open GitHub ↗" reads in that order; "↗ Open GitHub"
 * does not.
 */
export function ButtonLink({
  children,
  href,
  variant = 'neutral',
  size = 'md',
  icon,
  full,
  external,
}: Shared & { href: string; external?: boolean }) {
  const shared = {
    className: styles.button,
    'data-variant': variant,
    'data-size': size,
    'data-full': full || undefined,
  };

  if (external) {
    return (
      <a {...shared} href={href} target="_blank" rel="noreferrer">
        {icon}
        {children}
        {icon ? null : <ExternalIcon />}
      </a>
    );
  }
  return (
    <Link {...shared} href={href}>
      {icon}
      {children}
    </Link>
  );
}
