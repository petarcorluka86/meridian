import { Icon } from '@/components/ui/Icon';

/*
 * The vault tree's icons. The shape says what a thing is — a folder, a record, a
 * note — so the colour does not have to, and all of them are muted.
 */
/*
 * The geometry, apart from the presentation: the tree draws these small and
 * muted, the preview's empty state draws the same shape on a tinted tile.
 */
export const FILE_GLYPH = {
  folder: (
    <path d="M3 7.5A2.5 2.5 0 015.5 5h3l2 2.5h6A2.5 2.5 0 0119 10v7a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
  ),
  /** Folded-corner page — a record. Never the lined page, which means a note. */
  file: (
    <>
      <path d="M6 3h8l5 5v13H6z" />
      <path d="M14 3v5h5" />
    </>
  ),
  note: (
    <>
      <path d="M6 3h8l5 5v13H6z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 16.5h4" />
    </>
  ),
} as const;

export const FolderIcon = () => <Icon tone="muted">{FILE_GLYPH.folder}</Icon>;

export const FileIcon = () => <Icon tone="muted">{FILE_GLYPH.file}</Icon>;

export const NoteIcon = () => <Icon tone="muted">{FILE_GLYPH.note}</Icon>;

export const HeaderFileIcon = () => (
  <Icon tone="muted" size="lg">
    {FILE_GLYPH.file}
  </Icon>
);

export const Chevron = ({ className }: { className?: string }) => (
  <Icon tone="muted" size="sm" weight="bold" className={className}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
);
