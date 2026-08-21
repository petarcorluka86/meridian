import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Note, Section, Spec, Specs, Doc } from '@/stories/Showcase';
import { CATEGORIES } from './Category';
import { CategoryPill, Pill } from './Pill';
import { Row } from './Layout';

/**
 * A status, never a sentence and never a control. Five tones, and they mean the
 * same thing everywhere: danger failed, warning is old or unfinished, success is
 * settled, info is scheduled, neutral is merely a fact.
 *
 * The due pill, the freshness pill, the waiting badge, the draft badge and the
 * category chip were five components. They are this one.
 */
const meta = {
  title: 'Components/Pill',
  component: Pill,
  parameters: { layout: 'padded' },
  args: { children: 'Live', tone: 'success', size: 'sm' },
} satisfies Meta<typeof Pill>;

export default meta;

export const Playground: StoryObj<typeof Pill> = {};

export const Tones: StoryObj = {
  render: () => (
    <Doc>
      <Section title="Five tones, and nothing clickable is a pill">
        <Specs>
          <Spec label='tone="neutral"'>
            <Pill>In 4 days</Pill>
          </Spec>
          <Spec label='tone="info"'>
            <Pill tone="info">Today</Pill>
          </Spec>
          <Spec label='tone="success"'>
            <Pill tone="success">Live</Pill>
          </Spec>
          <Spec label='tone="warning"'>
            <Pill tone="warning">Stale · 2 hours ago</Pill>
          </Spec>
          <Spec label='tone="danger"'>
            <Pill tone="danger">3 days late</Pill>
          </Spec>
          <Spec label='tone="accent"'>
            <Pill tone="accent">Pinned</Pill>
          </Spec>
        </Specs>
      </Section>
      <Note>
        If it can be pressed it is a `Chip` or a `Button`. A pill that toggles something is the most
        common way a design system starts leaking.
      </Note>
    </Doc>
  ),
};

export const Sizes: StoryObj = {
  render: () => (
    <Doc>
      <Section
        title="sm carries a word, md carries a sentence"
        note="A failed source names what went wrong, which does not fit in eleven-pixel caps."
      >
        <Row gap={3}>
          <Pill tone="danger">Late</Pill>
          <Pill tone="danger" size="md">
            GitHub did not answer · showing data from yesterday 18:00
          </Pill>
        </Row>
      </Section>
    </Doc>
  ),
};

export const Categories: StoryObj = {
  name: 'CategoryPill',
  render: () => (
    <Doc>
      <Section
        title="Six fixed labels, from the category palette"
        note="Not four tones with two invented. The colours are tokens in tokens.css rather than a hue computed at the call site, so recolouring a category is one edit in the same file as every other colour decision."
      >
        <Row gap={2}>
          {CATEGORIES.map((category) => (
            <CategoryPill key={category.value} category={category.value} label={category.label} />
          ))}
        </Row>
      </Section>
      <Note>
        Generic is the only grey one, and it is also the fallback: an unknown category renders as
        Generic rather than throwing or picking a colour of its own.
      </Note>
    </Doc>
  ),
};
