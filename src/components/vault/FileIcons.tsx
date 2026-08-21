import { Icon } from '@/components/ui/Icon';

/*
 * The vault tree's icons. The shape says what a thing is — a folder, a record, a
 * note — so the colour does not have to, and all of them are muted.
 */
export const FolderIcon = () => (
  <Icon tone="muted">
    <path d="M3 7.5A2.5 2.5 0 015.5 5h3l2 2.5h6A2.5 2.5 0 0119 10v7a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
  </Icon>
);

/** Folded-corner page — a record. Never the lined page, which means a note. */
export const FileIcon = () => (
  <Icon tone="muted">
    <path d="M6 3h8l5 5v13H6z" />
    <path d="M14 3v5h5" />
  </Icon>
);

export const NoteIcon = () => (
  <Icon tone="muted">
    <path d="M6 3h8l5 5v13H6z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6M9 16.5h4" />
  </Icon>
);

export const HeaderFileIcon = () => (
  <Icon tone="muted" size="lg">
    <path d="M6 3h8l5 5v13H6z" />
    <path d="M14 3v5h5" />
  </Icon>
);

export const Chevron = ({ className }: { className?: string }) => (
  <Icon tone="muted" size="sm" weight="bold" className={className}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
);
