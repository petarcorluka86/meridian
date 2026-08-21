import styles from './Banner.module.css';
import { Icon } from './Icon';
import { Stack } from './Layout';
import { Text } from './Text';

export type BannerTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const WarningGlyph = () => (
  <>
    <path d="M12 4l9 16H3z" />
    <path d="M12 10v4M12 17h.01" />
  </>
);

const MARK: Record<BannerTone, React.ReactNode> = {
  neutral: null,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  success: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </>
  ),
  warning: <WarningGlyph />,
  danger: <WarningGlyph />,
};

/**
 * A message about the screen. Four tones, and the wording comes from
 * `src/copy/` — one wording per situation, never paraphrased here.
 *
 * The mark is part of the message, not decoration: a file the app cannot read is
 * recognisable as a warning before any of it is read. Only the neutral tone has
 * none, because it is not claiming anything.
 *
 * A banner never carries a spinner and never replaces content. When a source
 * fails, the last good data stays on screen and the banner says so.
 */
export function Banner({
  tone = 'neutral',
  title,
  description,
  children,
  end,
}: {
  tone?: BannerTone;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  end?: React.ReactNode;
}) {
  return (
    <div className={styles.banner} data-tone={tone} role={tone === 'danger' ? 'alert' : undefined}>
      {MARK[tone] ? <Icon size="lg">{MARK[tone]}</Icon> : null}
      <div className={styles.body}>
        <Stack gap={2}>
          {title ? <Text level="label">{title}</Text> : null}
          {description ? <Text level="small">{description}</Text> : null}
          {children}
        </Stack>
      </div>
      {end}
    </div>
  );
}
