import { Icon } from './Icon';

/*
 * The action glyphs, one per verb.
 *
 * A button's icon is chosen by what the action *does*, never by which screen it
 * is on: Add is the same plus on Tasks, on a person's links and in quick
 * capture, so the shape is readable before the label is. That is the whole value
 * of having a set — a second plus drawn slightly differently would undo it.
 *
 * Cancel and Skip deliberately have none. They are the way out, and an icon
 * there competes with the way forward.
 */

/** Creates something that did not exist. */
export const AddIcon = () => (
  <Icon>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

/** Confirms, saves, or reports that a check passed. */
export const CheckIcon = () => (
  <Icon>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);

/** Edits in place. */
export const EditIcon = () => (
  <Icon>
    <path d="M4 20h4l10-10-4-4L4 16z" />
    <path d="M13.5 6.5l4 4" />
  </Icon>
);

/**
 * Removes. Always the danger tone — a trash glyph means destruction wherever it
 * appears, so the colour is part of the glyph rather than a call-site choice.
 * Paired with a confirm dialog when it cannot be undone.
 */
export const RemoveIcon = () => (
  <Icon tone="danger" size="sm">
    <path d="M4 7h16" />
    <path d="M9 7V5h6v2" />
    <path d="M6 7l1 13h10l1-13" />
  </Icon>
);

/**
 * Puts something out of the way without destroying it: an arrow going down into
 * an open tray.
 *
 * The same tray as `RestoreIcon` with the arrow reversed — two verbs, so two
 * glyphs, rather than one shape doing both jobs and meaning neither. The tray is
 * open rather than a lidded box: every other glyph in this set is a single thin
 * stroke, and a closed box with an arrow inside it turns to mush at 17px.
 */
export const ArchiveIcon = () => (
  <Icon>
    <path d="M4 13v4.5A2.5 2.5 0 006.5 20h11a2.5 2.5 0 002.5-2.5V13" />
    <path d="M12 4v9" />
    <path d="M8.5 9.5 12 13l3.5-3.5" />
  </Icon>
);

/** Brings it back out. Nothing archived was ever deleted, so this always works. */
export const RestoreIcon = () => (
  <Icon>
    <path d="M4 13v4.5A2.5 2.5 0 006.5 20h11a2.5 2.5 0 002.5-2.5V13" />
    <path d="M12 13V4" />
    <path d="M8.5 7.5 12 4l3.5 3.5" />
  </Icon>
);

/** Asks a source for its data again. */
export const RefreshIcon = () => (
  <Icon>
    <path d="M20 12a8 8 0 10-2.6 5.9" />
    <path d="M20 5.5V12h-6" />
  </Icon>
);

/** Goes to another screen in this app. */
export const GoIcon = () => (
  <Icon>
    <path d="M5 12h13" />
    <path d="M12.5 6.5L19 12l-6.5 5.5" />
  </Icon>
);

/**
 * Leaves the app. `ButtonLink` adds this itself for an external link, so no call
 * site has to remember — a link out always looks like a link out.
 */
export const ExternalIcon = () => (
  <Icon size="sm">
    <path d="M14 5h5v5" />
    <path d="M19 5l-8 8" />
    <path d="M17.5 14v3.5a2 2 0 01-2 2H6.5a2 2 0 01-2-2V8.5a2 2 0 012-2H10" />
  </Icon>
);

/**
 * Steps within a control rather than going somewhere — the day stepper's arrows.
 * Distinct from `GoIcon`, which leaves for another screen.
 */
export const PrevIcon = () => (
  <Icon size="sm" weight="bold">
    <path d="M15 6l-6 6 6 6" />
  </Icon>
);

export const NextIcon = () => (
  <Icon size="sm" weight="bold">
    <path d="M9 6l6 6-6 6" />
  </Icon>
);

/** Opens documentation — Help, the setup guide. */
export const GuideIcon = () => (
  <Icon>
    <path d="M4 5.5A1.5 1.5 0 015.5 4H10a2 2 0 012 2v13a2 2 0 00-2-2H4z" />
    <path d="M20 5.5A1.5 1.5 0 0018.5 4H14a2 2 0 00-2 2v13a2 2 0 012-2h6z" />
  </Icon>
);

/** Records the vault's state in its own history. */
export const CommitIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="3.5" />
    <path d="M3 12h5.5M15.5 12H21" />
  </Icon>
);

/** Sends the vault somewhere off this machine. The one irreversible action. */
export const PushIcon = () => (
  <Icon>
    <path d="M12 19V6" />
    <path d="M6.5 11.5L12 6l5.5 5.5" />
  </Icon>
);

/** Shows a number that is blurred, for thirty seconds. */
export const EyeIcon = () => (
  <Icon size="sm">
    <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z" />
    <circle cx="12" cy="12" r="2.6" />
  </Icon>
);

/** Holds a note at the top of its list. */
export const PinIcon = () => (
  <Icon size="sm">
    <path d="M9 4h6l-1 6 4 3v2H6v-2l4-3z" />
    <path d="M12 15v5" />
  </Icon>
);

/** A date, or a jump back to today. */
export const CalendarIcon = () => (
  <Icon>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 10h17M8 3.5v3M16 3.5v3" />
  </Icon>
);

/** Joins a meeting that is happening now. */
export const JoinIcon = () => (
  <Icon>
    <rect x="3" y="6" width="12" height="12" rx="2.5" />
    <path d="M15 11l6-3.5v9L15 13z" />
  </Icon>
);
