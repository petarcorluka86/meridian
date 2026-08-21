import { Icon } from '@/components/ui/Icon';

/*
 * The sidebar set. All of them inherit the nav item's colour, so the active row
 * lights its icon with it.
 */

export const OverviewIcon = () => (
  <Icon size="lg">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Icon>
);

export const PeopleIcon = () => (
  <Icon size="lg">
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" />
  </Icon>
);

export const TasksIcon = () => (
  <Icon size="lg">
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l2.5 2.5L16 9.5" />
  </Icon>
);

/** The lined page. Never swapped with the folded-corner file icon. */
export const NotesIcon = () => (
  <Icon size="lg">
    <rect x="4.5" y="3.5" width="15" height="17" rx="2.5" />
    <path d="M8.5 9h7" />
    <path d="M8.5 13h7" />
    <path d="M8.5 17h4" />
  </Icon>
);

export const TimebalanceIcon = () => (
  <Icon size="lg">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);

export const VaultIcon = () => (
  <Icon size="lg">
    <path d="M3 7.5A2.5 2.5 0 015.5 5h3l2 2.5h6A2.5 2.5 0 0119 10v7a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
  </Icon>
);

export const ChangelogIcon = () => (
  <Icon size="lg">
    <circle cx="7" cy="6" r="2.5" />
    <circle cx="7" cy="18" r="2.5" />
    <circle cx="17" cy="12" r="2.5" />
    <path d="M7 8.5v7" />
    <path d="M9.5 6h3A2 2 0 0114.5 8v2" />
  </Icon>
);

/** The folded-corner page. Carried by Help, Vault rows and diff headers. */
export const HelpIcon = () => (
  <Icon size="lg">
    <path d="M6 3h8l5 5v13H6z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6M9 16.5h4" />
  </Icon>
);

/**
 * The mark: a rounded square broken where the diagonal crosses it, with the
 * diagonal running past both corners. The break is the mark, not a gap.
 *
 * The favicon, the sidebar and the setup screen draw these same paths, so they
 * are one shape rather than three near-misses.
 */
export const BrandMark = ({ size = 30 }: { size?: number }) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 30 30"
    fill="none"
    stroke="var(--fg-strong)"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 4 H9 A5 5 0 0 0 4 9 V20" />
    <path d="M8 26 H21 A5 5 0 0 0 26 21 V10" />
    <path d="M3.5 26.5 L26.5 3.5" />
  </svg>
);
