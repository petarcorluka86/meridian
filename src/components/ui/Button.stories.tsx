import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Caveat, Section, Spec, Specs, Doc } from '@/stories/Showcase';
import { Button, ButtonLink } from './Button';
import { Row } from './Layout';

/**
 * Every button in the app. Three levels and two sizes, and that is the whole
 * set: one primary per form, neutral for everything beside it, danger only
 * inside a confirm dialog, ghost for an action that must not compete.
 *
 * The neutral level used to be declared in four modules with four different
 * paddings. There is now one rule and one height.
 */
const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: { layout: 'padded', nextjs: { appDirectory: true } },
  args: { children: 'Add task', variant: 'primary', size: 'md' },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof Button>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Doc>
      <Section
        title="Four levels, one shape"
        note="Primary is the only blue-filled thing on a screen, and there is one per form. Danger exists only inside the confirm dialog. Ghost is for an action that must not compete with the row it sits in."
      >
        <Specs>
          <Spec label='variant="primary"'>
            <Button variant="primary">Add task</Button>
          </Spec>
          <Spec label='variant="neutral"'>
            <Button variant="neutral">Cancel</Button>
          </Spec>
          <Spec label='variant="danger"'>
            <Button variant="danger">Push to origin</Button>
          </Spec>
          <Spec label='variant="ghost"'>
            <Button variant="ghost">Skip for now</Button>
          </Spec>
        </Specs>
      </Section>
    </Doc>
  ),
};

export const Sizes: Story = {
  render: () => (
    <Doc>
      <Section
        title="Two heights, from --control-md and --control-sm"
        note="Both come from tokens, so a button, a select and a chip standing in a row line up without anybody nudging padding."
      >
        <Row gap={3}>
          <Button variant="primary" size="md">
            Add task
          </Button>
          <Button variant="primary" size="sm">
            Add task
          </Button>
        </Row>
      </Section>
    </Doc>
  ),
};

export const States: Story = {
  render: () => (
    <Doc>
      <Section
        title="Disabled and pending"
        note="Greying out is reserved for genuinely disabled. A button whose form is merely empty stays lit and does nothing when pressed — a screen of dead controls with no explanation is worse."
      >
        <Specs>
          <Spec label="default">
            <Button variant="primary">Add task</Button>
          </Spec>
          <Spec label="disabled">
            <Button variant="primary" disabled>
              Add task
            </Button>
          </Spec>
          <Spec label="pending">
            <Button variant="primary" pending>
              Working…
            </Button>
          </Spec>
        </Specs>
      </Section>
    </Doc>
  ),
};

export const AsALink: Story = {
  name: 'ButtonLink',
  render: () => (
    <Doc>
      <Section
        title="The same thing that navigates"
        note="A link is never styled as a button by hand. external adds target and rel, which is the only difference."
      >
        <Row gap={3}>
          <ButtonLink href="/tasks">Open Tasks</ButtonLink>
          <ButtonLink href="/tasks" variant="primary" size="sm">
            Add a task
          </ButtonLink>
        </Row>
      </Section>
      <Caveat>
        There is no icon-only variant and no full-width variant beyond `full`. If a button needs to
        look like something not on this page, the answer is usually that it is not a button.
      </Caveat>
    </Doc>
  ),
};
