import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Note, RailBox, Section, Spec, Specs, Doc } from '@/stories/Showcase';
import { Rail } from './Rail';
import { Text } from './Text';

/**
 * Priority is a 3px rail down the left edge of a row, never a badge.
 *
 * A badge puts a word beside every title and makes the list about priority. A
 * rail is readable down the whole list at once and costs no horizontal room.
 */
const meta = {
  title: 'Components/Priority rail',
  component: Rail,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Rail>;

export default meta;

export const EveryLevel: StoryObj = {
  name: 'Every level',
  render: () => (
    <Doc>
      <Section title="Urgent · important · normal · done">
        <Specs>
          <Spec label='priority="urgent"'>
            <RailBox>
              <Rail priority="urgent" />
              <Text level="body" tone="strong">
                Sign off the Q3 comp letters
              </Text>
            </RailBox>
          </Spec>
          <Spec label='priority="important"'>
            <RailBox>
              <Rail priority="important" />
              <Text level="body" tone="strong">
                Draft the retro summary
              </Text>
            </RailBox>
          </Spec>
          <Spec label='priority="normal"'>
            <RailBox>
              <Rail priority="normal" />
              <Text level="body" tone="strong">
                Book the offsite room
              </Text>
            </RailBox>
          </Spec>
          <Spec label="done">
            <RailBox>
              <Rail priority="urgent" done />
              <Text level="body" tone="faint">
                Send the onboarding plan
              </Text>
            </RailBox>
          </Spec>
        </Specs>
      </Section>
      <Note>
        The three levels take the danger, warning and info tones — the same four meanings as
        everything else, rather than three colours invented for tasks. Done drops the hue entirely
        rather than fading it: a completed urgent task is not a slightly less urgent task.
      </Note>
    </Doc>
  ),
};
