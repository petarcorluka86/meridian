import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Note, Section } from '@/stories/Showcase';
import { Stack } from './Layout';
import { Stepper } from './Stepper';

/**
 * Where you are in a sequence you cannot leave the middle of. The wizard is the
 * only thing in the app that has one.
 *
 * It replaced a row of pills reading "✓ 1 · Your folder", "2 · BambooHR" — a
 * sentence to read rather than a shape to glance at, and one that gave a
 * finished step and the current step the same weight.
 */
const meta = {
  title: 'Components/Stepper',
  component: Stepper,
  parameters: { layout: 'padded' },
  args: {
    label: 'Setting Meridian up',
    steps: [
      { label: 'Your folder', state: 'done' },
      { label: 'BambooHR', state: 'current' },
      { label: 'Calendar', state: 'upcoming' },
      { label: 'GitHub', state: 'upcoming' },
      { label: 'Done', state: 'upcoming' },
    ],
  },
} satisfies Meta<typeof Stepper>;

export default meta;

export const Playground: StoryObj<typeof Stepper> = {};

export const ThreeStates: StoryObj = {
  name: 'Three states, and the trail behind you',
  render: () => (
    <Stack gap={6}>
      <Section title="At the start">
        <Stepper
          label="At the start"
          steps={[
            { label: 'Your folder', state: 'current' },
            { label: 'BambooHR', state: 'upcoming' },
            { label: 'Calendar', state: 'upcoming' },
            { label: 'GitHub', state: 'upcoming' },
            { label: 'Done', state: 'upcoming' },
          ]}
        />
        <Note>
          An upcoming disc is dashed and a hairline joins it. Nothing here is pressable: this
          reports progress, and a step somebody has not reached is not somewhere they can go.
        </Note>
      </Section>

      <Section title="Part way">
        <Stepper
          label="Part way"
          steps={[
            { label: 'Your folder', state: 'done' },
            { label: 'BambooHR', state: 'done' },
            { label: 'Calendar', state: 'current' },
            { label: 'GitHub', state: 'upcoming' },
            { label: 'Done', state: 'upcoming' },
          ]}
        />
        <Note>
          The line arriving at a disc is coloured when the step before it is finished, so the trail
          behind you is drawn rather than described. The current disc is `--selected`, not the
          accent: a selection is a state, and the accent means action.
        </Note>
      </Section>

      <Section title="Coming back to a step already finished">
        <Stepper
          label="Coming back"
          steps={[
            { label: 'Your folder', state: 'done' },
            { label: 'BambooHR', state: 'current' },
            { label: 'Calendar', state: 'done' },
            { label: 'GitHub', state: 'done' },
            { label: 'Done', state: 'upcoming' },
          ]}
        />
        <Note>
          Current wins over done. Standing on a step you have already filled in shows you standing
          on it, not behind it.
        </Note>
      </Section>
    </Stack>
  ),
};
