import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { Note, Section, Spec, Specs, Doc } from '@/stories/Showcase';
import { Row } from './Layout';
import { Button } from './Button';
import { Card, CardRow } from './Card';
import { Checkbox, DateInput, Field, Select, Textarea, TextInput } from './Input';

/**
 * Every field in the app, at one height and one radius. Text, textarea, select,
 * date and checkbox — nothing else takes typing.
 *
 * There is no label component: this app has no labelled forms. Each field takes
 * `ariaLabel`, and the surrounding row says what it is.
 */
const meta = {
  title: 'Components/Input',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;

const PEOPLE = [
  { value: 'ana', label: 'Ana Horvat' },
  { value: 'marko', label: 'Marko Novak' },
  { value: 'none', label: 'Nobody' },
];

export const EveryField: StoryObj = {
  name: 'Every field',
  render: () => (
    <Doc>
      <Section title="One height, one radius, one border">
        <Specs>
          <Spec label="TextInput">
            <TextInput placeholder="What happened?" ariaLabel="Note title" />
          </Spec>
          <Spec label="Select">
            <Select options={PEOPLE} defaultValue="ana" ariaLabel="Person" />
          </Spec>
          <Spec label="DateInput">
            <DateInput defaultValue="2026-08-21" ariaLabel="Due date" />
          </Spec>
          <Spec label="Textarea">
            <Textarea placeholder="Two lines is a note." ariaLabel="Note body" rows={3} />
          </Spec>
          <Spec label="Checkbox">
            <Row gap={2}>
              <Checkbox checked={false} ariaLabel="Mark as done" />
              <Checkbox checked ariaLabel="Mark as not done" />
            </Row>
          </Spec>
        </Specs>
      </Section>
      <Note>
        The select draws its own chevron as an inline SVG data URI rather than loading an icon — the
        CSP allows nothing from the internet, and an icon font would be a request. The date picker
        is the browser's; nothing in this app renders a calendar of its own.
      </Note>
    </Doc>
  ),
};

export const Disabled: StoryObj = {
  render: () => (
    <Doc>
      <Section title="Disabled">
        <Row gap={3}>
          <TextInput defaultValue="Cannot type here" ariaLabel="Disabled" disabled />
          <Select options={PEOPLE} defaultValue="ana" ariaLabel="Person" disabled />
          <Checkbox checked ariaLabel="Locked" disabled />
        </Row>
      </Section>
    </Doc>
  ),
};

export const Bare: StoryObj = {
  name: 'bare — inside a card row',
  render: () => (
    <Doc>
      <Section
        title="The card is the frame, so the field draws no second one"
        note="Quick capture and the note title are this. A bordered field inside a bordered row is a box in a box."
      >
        <Card>
          <CardRow>
            <TextInput bare placeholder="Capture a thought…" ariaLabel="Quick capture" />
            <Select options={PEOPLE} defaultValue="none" size="sm" ariaLabel="Person" />
            <Button variant="primary" size="sm">
              Save
            </Button>
          </CardRow>
        </Card>
      </Section>
    </Doc>
  ),
};

export const Interactive: StoryObj = {
  name: 'A checkbox that toggles',
  render: () => {
    const [done, setDone] = useState(false);
    return (
      <Row gap={3}>
        <Checkbox checked={done} onToggle={() => setDone(!done)} ariaLabel="Mark as done" />
        <span>{done ? 'Done' : 'Open'}</span>
      </Row>
    );
  },
};

export const Labelled: StoryObj = {
  name: 'Field — the one labelled form',
  render: () => (
    <Doc>
      <Section
        title="A label above, a hint below"
        note="The only labelled shape in the app: the setup wizard and the hours form. Everywhere else the surrounding row says what a field is, and the field takes ariaLabel."
      >
        <Row gap={3} align="end">
          <Field
            label="Folder"
            hint="Keep it out of Dropbox — two machines writing the same files will fight."
          >
            <TextInput defaultValue="~/meridian/vault" ariaLabel="Vault folder" />
          </Field>
          <Field label="Hours (+/−)">
            <TextInput placeholder="−2 or +1.5" ariaLabel="Hours" />
          </Field>
        </Row>
      </Section>
    </Doc>
  ),
};
