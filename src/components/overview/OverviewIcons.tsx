import { Icon } from '@/components/ui/Icon';

/*
 * One icon per section of the Overview.
 *
 * All of them are muted. They used to carry a hue each, which looked like a code
 * and was not one — the card's title is what names the section.
 */

export const InboxIcon = () => (
  <Icon tone="muted" size="lg">
    <path d="M3 13l3-8h12l3 8" />
    <path d="M3 13h5l1.5 3h5L16 13h5v5a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
  </Icon>
);

export const TasksIcon = () => (
  <Icon tone="muted" size="lg">
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l2.5 2.5L16 9.5" />
  </Icon>
);

export const PrIcon = () => (
  <Icon tone="muted" size="lg">
    <circle cx="6.5" cy="6" r="2.5" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="17.5" cy="18" r="2.5" />
    <path d="M6.5 8.5v7" />
    <path d="M17.5 15.5V9a3 3 0 00-3-3h-3" />
  </Icon>
);

export const CalIcon = () => (
  <Icon tone="muted" size="lg">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M8 3v4M16 3v4M3 11h18" />
  </Icon>
);

export const HomeIcon = () => (
  <Icon tone="muted" size="lg">
    <path d="M4 11l8-6.5 8 6.5" />
    <path d="M6 10v9h12v-9" />
    <path d="M10 19v-5h4v5" />
  </Icon>
);

export const OutIcon = () => (
  <Icon tone="muted" size="lg">
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 15.5l7-7M8.5 8.5l7 7" />
  </Icon>
);

export const ClockIcon = () => (
  <Icon tone="muted" size="lg">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);

export const UploadIcon = () => (
  <Icon tone="muted" size="lg">
    <path d="M12 16V4" />
    <path d="M7.5 8.5L12 4l4.5 4.5" />
    <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
  </Icon>
);
