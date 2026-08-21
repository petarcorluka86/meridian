import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Doc, Note, Section, Spec, Specs } from '@/stories/Showcase';
import { Icon } from './Icon';
import { IconTile } from './IconTile';
import { Row } from './Layout';
import { Text } from './Text';

/**
 * The frame every icon in the app is drawn in: a 24-unit viewBox, stroked, round
 * caps, no fill, and always `aria-hidden` — an icon here never carries meaning
 * its label does not already carry.
 *
 * With no `tone` it inherits the colour around it, which is what makes an icon
 * inside an `IconTile` or a toned `Button` follow without being told.
 */
const meta = {
  title: 'Components/Icon',
  component: Icon,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Icon>;

export default meta;

const Bell = () => (
  <>
    <path d="M6 10a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6" />
    <path d="M10 20a2 2 0 004 0" />
  </>
);

export const Sizes: StoryObj = {
  render: () => (
    <Doc>
      <Section
        title="Four sizes and two weights"
        note="sm sits inside a small chip, md is the default, lg heads a card, xl is the one on a panel about a problem. Bold is for a chevron, which needs to read at 13px."
      >
        <Specs>
          {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
            <Spec key={size} label={`size="${size}"`}>
              <Icon size={size} tone="muted">
                <Bell />
              </Icon>
            </Spec>
          ))}
          <Spec label='weight="bold"'>
            <Icon weight="bold" tone="muted">
              <path d="M9 6l6 6-6 6" />
            </Icon>
          </Spec>
        </Specs>
      </Section>
    </Doc>
  ),
};

export const Tones: StoryObj = {
  render: () => (
    <Doc>
      <Section
        title="A tone, or the colour around it"
        note="Most icons in the app are muted. One that means something takes a tone — the same four meanings as every pill and banner."
      >
        <Row gap={3}>
          {(['muted', 'strong', 'accent', 'danger', 'warning', 'success', 'info'] as const).map(
            (tone) => (
              <Icon key={tone} tone={tone} size="lg">
                <Bell />
              </Icon>
            ),
          )}
        </Row>
      </Section>
      <Section
        title="Inside an IconTile"
        note="The tile sets the colour and the icon follows. An icon that hard-coded its own would fight it."
      >
        <Row gap={3}>
          {(['neutral', 'info', 'success', 'warning', 'danger', 'accent'] as const).map((tone) => (
            <IconTile key={tone} tone={tone}>
              <Icon size="lg">
                <Bell />
              </Icon>
            </IconTile>
          ))}
        </Row>
      </Section>
      <Note>
        <Text level="small" tone="muted">
          Icons live beside the component that uses them, not in one big file: the vault tree's are
          in `FileIcons`, the sidebar's in `NavIcons`, the Overview cards' in `OverviewIcons`.
        </Text>
      </Note>
    </Doc>
  ),
};
