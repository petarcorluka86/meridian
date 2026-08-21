import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Note, Section, Spec, Specs, Doc } from '@/stories/Showcase';
import { Stack as Col } from './Layout';
import { Code, CodeBlock, Text } from './Text';

/**
 * All text in the app goes through `Text`. There is no other way to set a size:
 * the gate fails the build on a `font` or `font-size` declared outside the
 * primitives.
 *
 * Nine levels. A tenth is an edit to the scale in `tokens.css` and to this
 * component, deliberately — a one-off size at a call site is what turned
 * nineteen sizes into sixty-four rules.
 */
const meta = {
  title: 'Foundations/Type',
  component: Text,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Text>;

export default meta;

const LEVELS = [
  { level: 'display', where: 'The Overview greeting, and nothing else' },
  { level: 'title', where: 'A screen title' },
  { level: 'heading', where: 'A person name, a section' },
  { level: 'subheading', where: 'A card title, a dialog title' },
  { level: 'body', where: 'A row title, a paragraph' },
  { level: 'small', where: 'A secondary line, a table cell' },
  { level: 'label', where: 'Every button, chip and field label' },
  { level: 'micro', where: 'A pill, a badge, a column header' },
  { level: 'mono', where: 'A path, a hash, a countdown' },
] as const;

const TONES = [
  'strong',
  'default',
  'muted',
  'faint',
  'accent',
  'danger',
  'warning',
  'success',
  'info',
] as const;

export const Scale: StoryObj = {
  name: 'The nine levels',
  render: () => (
    <Doc>
      <Section title="Level sets the look; `as` sets the tag">
        <Specs>
          {LEVELS.map(({ level, where }) => (
            <Spec key={level} label={`level="${level}"\n${where}`}>
              <Text level={level}>The slow work</Text>
            </Spec>
          ))}
        </Specs>
      </Section>
      <Note>
        The four heading levels default to the strong ink without any call site saying so, so a card
        title cannot end up a shade lighter on one screen than another.
      </Note>
    </Doc>
  ),
};

export const Tones: StoryObj = {
  render: () => (
    <Doc>
      <Section
        title="Nine tones, all from the token roles"
        note="Four steps of ink plus the accent and the four meanings. Nothing else — there is no way to ask for a colour that is not one of these."
      >
        <Specs>
          {TONES.map((tone) => (
            <Spec key={tone} label={`tone="${tone}"`}>
              <Text level="body" tone={tone}>
                Balance is even. Nothing owed either way.
              </Text>
            </Spec>
          ))}
        </Specs>
      </Section>
    </Doc>
  ),
};

export const Truncate: StoryObj = {
  name: 'Truncate and numeric',
  render: () => (
    <Doc>
      <Section
        title="One line, ellipsised, and it never pushes its row wider"
        note="truncate carries min-width: 0 with it, which is the part everybody forgets and the reason a long note title used to stretch a card past its column."
      >
        <div style={{ width: 'calc(var(--space-7) * 5)' }}>
          <Text level="body" truncate>
            A note title long enough to need somewhere to stop, and then some more
          </Text>
        </div>
      </Section>
      <Section
        title="Tabular figures"
        note="numeric, for a column of amounts or hours — so the digits line up between rows instead of shuffling."
      >
        <Col gap={1}>
          <Text level="body" numeric>
            1 480,00
          </Text>
          <Text level="body" numeric>
            911,50
          </Text>
          <Text level="body" numeric>
            4 850,00
          </Text>
        </Col>
      </Section>
    </Doc>
  ),
};

export const Literals: StoryObj = {
  name: 'Code and CodeBlock',
  render: () => (
    <Doc>
      <Section
        title="A filename in a sentence, and a command to copy"
        note="Code is inline: a path, a token name, an env var. CodeBlock is a whole line to type, or an error exactly as the system reported it. Never prose — that is Text."
      >
        <Text level="body">
          Point <Code>VAULT_PATH</Code> at a folder in <Code>.env</Code> and restart.
        </Text>
        <CodeBlock>VAULT_PATH=~/meridian/vault</CodeBlock>
      </Section>
    </Doc>
  ),
};
