import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Note, Section, Spec, Specs, Doc } from '@/stories/Showcase';
import { Avatar } from './Avatar';
import { Row } from './Layout';

/**
 * Four sizes, named by the row they go in rather than by a number: `sm` in a
 * dense row, `md` in a row about a person, `lg` on a person's page, `xl` on the
 * roster card that is only that person. There is no size in between and no
 * square variant.
 *
 * Until a photo has been cached through the app, a person is their initials —
 * never a remote avatar, because that would be the browser fetching from the
 * internet, which the CSP forbids and the privacy promise rules out.
 */
const meta = {
  title: 'Components/Avatar',
  component: Avatar,
  parameters: { layout: 'padded' },
  args: { name: 'Ana Horvat', photo: null, size: 'md' },
} satisfies Meta<typeof Avatar>;

export default meta;

export const Playground: StoryObj<typeof Avatar> = {};

export const Sizes: StoryObj = {
  render: () => (
    <Doc>
      <Section title="sm · md · lg · xl">
        <Specs>
          <Spec label='size="sm" — a dense row: a task, a table'>
            <Avatar name="Ana Horvat" photo={null} size="sm" />
          </Spec>
          <Spec label='size="md" — a row about a person'>
            <Avatar name="Ana Horvat" photo={null} size="md" />
          </Spec>
          <Spec label='size="lg" — a person page header'>
            <Avatar name="Ana Horvat" photo={null} size="lg" />
          </Spec>
          <Spec label='size="xl" — the roster card'>
            <Avatar name="Ana Horvat" photo={null} size="xl" />
          </Spec>
        </Specs>
      </Section>
      <Note>
        A one-word name — a GitHub login — takes its first two characters rather than a lone letter,
        so it reads as a monogram rather than an accident.
      </Note>
    </Doc>
  ),
};

export const AListOfPeople: StoryObj = {
  name: 'A list of people',
  render: () => (
    <Row gap={2}>
      {['Ana Horvat', 'Marko Novak', 'Iva Perić', 'petarc'].map((name) => (
        <Avatar key={name} name={name} photo={null} />
      ))}
    </Row>
  ),
};
