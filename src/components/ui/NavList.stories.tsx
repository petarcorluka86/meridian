import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Caveat, Doc, Note, Section } from '@/stories/Showcase';
import { Card, CardGroup } from './Card';
import { Icon } from './Icon';
import { NavItem, NavList } from './NavList';
import { Stack } from './Layout';
import { Text } from './Text';

/**
 * A column of rounded, selectable rows — the sidebar, Help's sections, the vault
 * tree, the changelog's changed files.
 *
 * All four were written by hand, and three of them forgot the inset: the rows sat
 * flush against the card they were in, and the gap between them was whatever the
 * line-height happened to leave. This carries both, so no call site can forget.
 */
const meta = {
  title: 'Components/Nav list',
  component: NavList,
  parameters: { layout: 'padded', nextjs: { appDirectory: true } },
} satisfies Meta<typeof NavList>;

export default meta;

const FileGlyph = () => (
  <Icon size="sm">
    <path d="M6 3h8l5 5v13H6z" />
    <path d="M14 3v5h5" />
  </Icon>
);

const FolderGlyph = () => (
  <Icon size="sm">
    <path d="M3 7.5A2.5 2.5 0 015.5 5h3l2 2.5h6A2.5 2.5 0 0119 10v7a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
  </Icon>
);

export const InACard: StoryObj = {
  name: 'In a card',
  render: () => (
    <Doc>
      <Section
        title="Inset from the card, with a gap between the rows"
        note="A CardRow is the other kind of list: full width, a hairline above it, for rows that are the card's content. These are controls that happen to be stacked."
      >
        <div style={{ maxWidth: 280 }}>
          <Card>
            <CardGroup label="Changed files" />
            <NavList label="Changed files">
              <NavItem href="#" label="All files" selected />
              <NavItem
                href="#"
                icon={<FileGlyph />}
                label={
                  <Stack gap={0}>
                    <Text level="label" tone="strong" truncate>
                      2026-08-14-zahtjevi.md
                    </Text>
                    <Text level="mono" tone="faint" truncate>
                      notes/general
                    </Text>
                  </Stack>
                }
              />
              <NavItem href="#" icon={<FileGlyph />} label="tasks.json" />
            </NavList>
          </Card>
        </div>
      </Section>
    </Doc>
  ),
};

export const Indented: StoryObj = {
  name: 'A tree',
  render: () => (
    <Doc>
      <Section
        title="One spacing step per level"
        note="The only thing that uses indent. A trailing child sits at the end of the row — a folder's file count."
      >
        <div style={{ maxWidth: 300, background: 'var(--surface)' }}>
          <NavList label="Vault files">
            <NavItem icon={<FolderGlyph />} label="people" expanded onClick={() => {}}>
              <Text level="mono" tone="faint">
                4
              </Text>
            </NavItem>
            <NavItem
              indent={1}
              icon={<FolderGlyph />}
              label="ana-horvat"
              expanded
              onClick={() => {}}
            >
              <Text level="mono" tone="faint">
                4
              </Text>
            </NavItem>
            <NavItem indent={2} icon={<FileGlyph />} label="about.md" onClick={() => {}} />
            <NavItem
              indent={2}
              icon={<FileGlyph />}
              label="links.json"
              selected
              onClick={() => {}}
            />
            <NavItem indent={1} icon={<FolderGlyph />} label="marko-maric" onClick={() => {}} />
          </NavList>
        </div>
      </Section>
      <Note>
        `href` makes a row a link and `onClick` a button. The tree needs buttons for folders, which
        open and close rather than going anywhere.
      </Note>
      <Caveat>
        The row owns its colour. Without that, a row that is a link takes the anchor colour from the
        global sheet — which turned every icon in the sidebar blue, and was only visible because the
        pixel gate compared it against the day before.
      </Caveat>
    </Doc>
  ),
};
