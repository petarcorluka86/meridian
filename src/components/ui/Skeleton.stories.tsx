import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Note, Section, Doc } from '@/stories/Showcase';
import { Card, CardHeader } from './Card';
import { SkeletonRows } from './Skeleton';

/**
 * The only skeleton in the app, and it appears rarely on purpose: a source that
 * has answered once has a cache, and the cache renders instead.
 */
const meta = {
  title: 'Components/Skeleton',
  component: SkeletonRows,
  parameters: { layout: 'padded' },
  args: { rows: 3, avatar: false },
} satisfies Meta<typeof SkeletonRows>;

export default meta;

type Story = StoryObj<typeof SkeletonRows>;

export const Rows: Story = {
  render: (args) => (
    <div style={{ maxWidth: 520 }}>
      <Card>
        <CardHeader title="Waiting on you" />
        <SkeletonRows {...args} />
      </Card>
    </div>
  ),
};

export const WithAvatars: Story = {
  args: { rows: 4, avatar: true },
  render: Rows.render,
};

export const WhenItAppears: Story = {
  name: 'When it appears',
  render: () => (
    <Doc>
      <Section title="First ever load, and nothing else">
        <Note>
          Shown only when there is no cache to paint from — a first load, before a source has ever
          answered. Line widths taper by row so the block reads as text rather than as bars, and one
          shared pulse keeps the rows breathing together instead of shimmering apart. The animation
          is behind prefers-reduced-motion.
        </Note>
      </Section>
    </Doc>
  ),
};
