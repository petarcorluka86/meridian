import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Note, Section, Spec, Specs, Doc } from '@/stories/Showcase';
import { Chip, ChipLink, Segment, Segmented } from './Chip';
import { Row } from './Layout';

/**
 * A filter. Two sizes: `md` for a page-level filter row, `sm` for a row with no
 * space for one.
 *
 * A chip is never an action — that is `Button`. If pressing it does anything
 * other than narrow what is on screen, it is the wrong component. There used to
 * be four chip sizes differing by two pixels and a shadow; there are two.
 */
const meta = {
  title: 'Components/Chip',
  component: Chip,
  parameters: { layout: 'padded', nextjs: { appDirectory: true } },
} satisfies Meta<typeof Chip>;

export default meta;

export const AFilterRow: StoryObj = {
  name: 'A filter row',
  render: () => (
    <Doc>
      <Section
        title="Selected inverts to near-black, not to the accent"
        note="A filter is a state, and the accent is reserved for the thing that acts. One chip in a row is selected; the row is the control, not each chip."
      >
        <Row gap={2}>
          <ChipLink href="#" selected>
            All (3)
          </ChipLink>
          <ChipLink href="#">Urgent (1)</ChipLink>
          <ChipLink href="#">Important</ChipLink>
          <ChipLink href="#">Normal</ChipLink>
        </Row>
      </Section>
      <Note>
        Most chips are links, because a filtered view has to be shareable and has to survive a
        reload — filters are URL state in this app. `Chip` is the button form, for a filter that is
        genuinely local to an island.
      </Note>
    </Doc>
  ),
};

export const Sizes: StoryObj = {
  render: () => (
    <Doc>
      <Section title="md and sm">
        <Specs>
          <Spec label='size="md"'>
            <Row gap={2}>
              <Chip selected>Open</Chip>
              <Chip>Done</Chip>
              <Chip>All</Chip>
            </Row>
          </Spec>
          <Spec label='size="sm"'>
            <Row gap={2}>
              <Chip size="sm" selected>
                This month
              </Chip>
              <Chip size="sm">Last month</Chip>
              <Chip size="sm">All time</Chip>
            </Row>
          </Spec>
        </Specs>
      </Section>
    </Doc>
  ),
};

export const ASegmentedControl: StoryObj = {
  name: 'Segmented',
  render: () => (
    <Doc>
      <Section
        title="One choice, so it reads as one object"
        note="A sunken track with the selected item lifted out of it. Two or three segments, never more — beyond that it is a Select."
      >
        <Row gap={3}>
          <Segmented label="View">
            <Segment href="#" selected>
              Compact
            </Segment>
            <Segment href="#">Detailed</Segment>
          </Segmented>
          <Segmented label="Diff mode">
            <Segment href="#">Split</Segment>
            <Segment href="#" selected>
              Unified
            </Segment>
          </Segmented>
        </Row>
      </Section>
      <Note>
        Segmented is for switching how the same data is shown. Chips are for narrowing which data is
        shown. They look different because they mean different things.
      </Note>
    </Doc>
  ),
};
