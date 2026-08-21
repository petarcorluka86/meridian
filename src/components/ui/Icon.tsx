import styles from './Icon.module.css';

const SIZE = { sm: 13, md: 15, lg: 17, xl: 20 } as const;

export type IconTone = 'muted' | 'strong' | 'accent' | 'danger' | 'warning' | 'success' | 'info';

/**
 * The frame every icon in the app is drawn in: a 24-unit viewBox, stroked, round
 * caps, no fill, and `aria-hidden` — an icon in this app never carries meaning
 * its label does not already carry.
 *
 * With no `tone` it inherits the colour around it, which is what makes an icon
 * inside an `IconTile` or a toned `Button` follow without being told.
 */
export function Icon({
  children,
  size = 'md',
  weight = 'regular',
  tone,
  className,
}: {
  children: React.ReactNode;
  size?: keyof typeof SIZE;
  weight?: 'regular' | 'bold';
  tone?: IconTone;
  /** For the one icon that animates — the vault tree's chevron. */
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      width={SIZE[size]}
      height={SIZE[size]}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={weight === 'bold' ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={[styles.icon, className].filter(Boolean).join(' ')}
      data-tone={tone}
    >
      {children}
    </svg>
  );
}
