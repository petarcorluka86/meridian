/**
 * The design system. Everything the app is built from is exported here, and
 * `tests/unit/design-system.test.ts` is what stops a screen building its own.
 *
 * A screen imports from `@/components/ui` and writes CSS only for layout that is
 * genuinely its own. If a rule sets a colour, a font, a radius or a spacing
 * value, it belongs in a primitive instead.
 */
export { Avatar } from './Avatar';
export { Banner, type BannerTone } from './Banner';
export { Button, ButtonLink, type ButtonSize, type ButtonVariant } from './Button';
export {
  Card,
  CardBody,
  CardFooter,
  CardGroup,
  CardHeader,
  CardLink,
  CardRow,
  CardRowButton,
  CardRowLink,
  CardToolbar,
} from './Card';
export { CATEGORIES, type CategoryValue, categoryOf } from './Category';
export { Chip, ChipLink, Segment, Segmented } from './Chip';
export { type Day, DayStepper } from './DayStepper';
export { Dialog } from './Dialog';
export { EmptyState } from './EmptyState';
export { SyncBadge } from './SyncBadge';
export { Icon, type IconTone } from './Icon';
export {
  AddIcon,
  ArchiveIcon,
  CalendarIcon,
  CheckIcon,
  CommitIcon,
  EditIcon,
  ExternalIcon,
  EyeIcon,
  GoIcon,
  GuideIcon,
  JoinIcon,
  NextIcon,
  PinIcon,
  PrevIcon,
  PushIcon,
  RefreshIcon,
  RemoveIcon,
  RestoreIcon,
} from './icons';
export { IconTile } from './IconTile';
export { Checkbox, DateInput, Field, type Option, Select, Textarea, TextInput } from './Input';
export {
  Columns,
  Divider,
  Page,
  PageHeader,
  Row,
  type Space,
  Spacer,
  Stack,
} from './Layout';
export { Meter, type MeterTone } from './Meter';
export { NavItem, NavList } from './NavList';
export { CategoryPill, Pill, type PillTone } from './Pill';
export { Prose } from './Prose';
export { type Priority, Rail } from './Rail';
export { Blurred, RevealButton, useReveal } from './Reveal';
export { SkeletonRows } from './Skeleton';
export { Stat } from './Stat';
export { Table, TBody, TD, TH, THead, TR } from './Table';
export { type TaskView, TaskRow } from './TaskRow';
export { Code, CodeBlock, Text, type TextLevel, type Tone } from './Text';
export { TextLink } from './TextLink';
export { Toggle } from './Toggle';
