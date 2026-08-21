import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Doc, Note, Section, Spec, Specs } from '@/stories/Showcase';
import { Button, ButtonLink } from './Button';
import { Row } from './Layout';
import {
  AddIcon,
  CalendarIcon,
  CheckIcon,
  CommitIcon,
  EditIcon,
  ExternalIcon,
  EyeIcon,
  GoIcon,
  GuideIcon,
  JoinIcon,
  PinIcon,
  PushIcon,
  RefreshIcon,
  RemoveIcon,
} from './icons';

/**
 * The action glyphs, one per verb.
 *
 * A button's icon is chosen by what the action *does*, never by which screen it
 * is on: Add is the same plus on Tasks, on a person's links and in quick
 * capture, so the shape is readable before the label is.
 *
 * Cancel and Skip deliberately have none. They are the way out, and an icon
 * there competes with the way forward.
 */
const meta = {
  title: 'Components/Action glyphs',
  parameters: { layout: 'padded', nextjs: { appDirectory: true } },
} satisfies Meta;

export default meta;

const GLYPHS = [
  [<AddIcon key="a" />, 'Add', 'Creates something that did not exist'],
  [<CheckIcon key="b" />, 'Check', 'Confirms, saves, or reports that a check passed'],
  [<EditIcon key="c" />, 'Edit', 'Edits in place'],
  [<RemoveIcon key="d" />, 'Remove', 'Destroys. Always the danger tone, everywhere'],
  [<RefreshIcon key="e" />, 'Refresh', 'Asks a source for its data again'],
  [<GoIcon key="f" />, 'Go', 'Goes to another screen in this app'],
  [<ExternalIcon key="g" />, 'External', 'Leaves the app — added by ButtonLink itself'],
  [<GuideIcon key="h" />, 'Guide', 'Opens documentation'],
  [<CommitIcon key="i" />, 'Commit', "Records the vault's state in its own history"],
  [<PushIcon key="j" />, 'Push', 'Sends the vault off this machine'],
  [<EyeIcon key="k" />, 'Eye', 'Shows a blurred number, for thirty seconds'],
  [<PinIcon key="l" />, 'Pin', 'Holds a note at the top of its list'],
  [<CalendarIcon key="m" />, 'Calendar', 'A date, or a jump back to today'],
  [<JoinIcon key="n" />, 'Join', 'Joins a meeting happening now'],
] as const;

export const TheSet: StoryObj = {
  name: 'The set',
  render: () => (
    <Doc>
      <Section title="Fourteen verbs, and every button picks one of them">
        <Specs>
          {GLYPHS.map(([glyph, name, meaning]) => (
            <Spec key={name} label={`${name}\n${meaning}`}>
              {glyph}
            </Spec>
          ))}
        </Specs>
      </Section>
      <Note>
        Domain icons — the vault tree's file shapes, the sidebar's sections, the Overview cards'
        marks — live beside the component that uses them. This set is only for what a button does.
      </Note>
    </Doc>
  ),
};

export const OnButtons: StoryObj = {
  name: 'On buttons',
  render: () => (
    <Doc>
      <Section
        title="The verb reads before the label does"
        note="A primary button always carries its glyph: it is the one action of the form, and it should be unmistakable at a glance. The glyph is a prop, not a child, so a button cannot end up with two."
      >
        <Row gap={3}>
          <Button variant="primary" icon={<AddIcon />}>
            Add task
          </Button>
          <Button variant="primary" icon={<CheckIcon />}>
            Save
          </Button>
          <Button icon={<EditIcon />}>Edit</Button>
          <Button iconOnly icon={<RemoveIcon />} ariaLabel="Remove" />
        </Row>
      </Section>
      <Section
        title="Where it goes"
        note="Go for a screen in this app; the external glyph for anything that leaves it — and ButtonLink adds that one itself, so no call site has to remember. Passing icon replaces it, for the rare case where the verb says more than the destination: a meeting's Join is a video call before it is a link out."
      >
        <Row gap={3}>
          <ButtonLink href="/tasks" icon={<GoIcon />}>
            Open Tasks
          </ButtonLink>
          <ButtonLink external href="https://github.com/pulls/review-requested">
            Open GitHub
          </ButtonLink>
          <ButtonLink external variant="primary" href="https://github.com" icon={<JoinIcon />}>
            Join
          </ButtonLink>
        </Row>
      </Section>
      <Section
        title="And where it does not"
        note="Cancel and Skip carry none. They are the way out, and a glyph there competes with the way forward."
      >
        <Row gap={3}>
          <Button>Cancel</Button>
          <Button variant="ghost">Skip for now</Button>
        </Row>
      </Section>
    </Doc>
  ),
};
