import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Caveat, Doc, Note, Section, Spec, Specs } from '@/stories/Showcase';
import { Avatar } from './Avatar';
import { Card, CardRow } from './Card';
import { Spacer, Stack } from './Layout';
import { Text } from './Text';
import { TextLink } from './TextLink';

/**
 * A link in a line of text or a row. `ButtonLink` is the control; this is the
 * words.
 *
 * Two behaviours, and the difference is whether it leaves the app.
 */
const meta = {
  title: 'Components/Text link',
  component: TextLink,
  parameters: { layout: 'padded', nextjs: { appDirectory: true } },
} satisfies Meta<typeof TextLink>;

export default meta;

export const Both: StoryObj = {
  name: 'In and out',
  render: () => (
    <Doc>
      <Section title="Out is the accent and the glyph; in takes the row's ink">
        <Specs>
          <Spec label="external">
            {/* github.com and nothing else: `tests/unit/readonly.test.ts` pins
                every host that appears anywhere in src/, a story included. A new
                one has to be agreed, which is the point of the list. */}
            <TextLink href="https://github.com/platform/core" external>
              platform/core
            </TextLink>
          </Spec>
          <Spec label="internal">
            <TextLink href="/people/ana-horvat">Ana Horvat</TextLink>
          </Spec>
        </Specs>
      </Section>
      <Note>
        `external` sets the colour, adds the glyph and opens a new tab — all three together, so a
        link that leaves the app cannot look like one that does not. It is the same promise
        `ButtonLink external` makes, and neither call site has to remember any part of it.
      </Note>
      <Caveat>
        A link within the app is deliberately *not* blue. On these screens the whole row is usually
        the target, and colouring the words as well would say it twice. Leaving the app is a real
        change of context; moving inside it is not.
      </Caveat>
    </Doc>
  ),
};

export const APersonIsOneTarget: StoryObj = {
  name: 'A person is one target',
  render: () => (
    <Doc>
      <Section
        title="The face and the name, not the name alone"
        note="A string child becomes a Text; anything else is rendered as it is, so an avatar can sit inside the link. NavItem reads its label the same way."
      >
        <div style={{ maxWidth: 520 }}>
          <Card>
            <CardRow>
              <TextLink href="/people/ana-horvat">
                <Avatar name="Ana Horvat" photo={null} />
                <Stack gap={0}>
                  <Text level="label" tone="inherit">
                    Ana Horvat
                  </Text>
                  <Text level="small" tone="info">
                    Annual leave · back 22 Aug
                  </Text>
                </Stack>
              </TextLink>
            </CardRow>
            <CardRow>
              <Text level="body">Write Ana&rsquo;s evaluation draft</Text>
              <Spacer />
              <TextLink href="/people/ana-horvat">
                <Text level="small" tone="inherit">
                  Ana Horvat
                </Text>
                <Avatar name="Ana Horvat" photo={null} size="sm" />
              </TextLink>
            </CardRow>
          </Card>
        </div>
      </Section>
      <Note>
        A task can name somebody who is not on the roster. There is nowhere to send you, so those
        rows stay text — the name does not pretend to be a link.
      </Note>
    </Doc>
  ),
};
