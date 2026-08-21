import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Note, Section, Spec, Specs, Doc as Wrap } from '@/stories/Showcase';
import { Button } from './Button';
import { Card, CardHeader } from './Card';
import { Columns, Divider, PageHeader, Row, Spacer, Stack } from './Layout';
import { Text } from './Text';

/**
 * Space, and the only components in the app that spend it. A gap is picked by
 * step number — `gap={4}` is `--space-4` — so there is no way to ask for eleven
 * pixels.
 */
const meta = {
  title: 'Components/Layout',
  parameters: { layout: 'padded', nextjs: { appDirectory: true } },
} satisfies Meta;

export default meta;

const Block = ({ label }: { label: string }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '0 var(--space-3)',
      minHeight: 'var(--control-md)',
      background: 'var(--accent-bg)',
      border: '1px solid var(--accent-border)',
      borderRadius: 'var(--radius-control)',
      font: 'var(--type-label)',
      color: 'var(--accent)',
    }}
  >
    {label}
  </span>
);

export const Gaps: StoryObj = {
  name: 'The seven steps',
  render: () => (
    <Wrap>
      <Section title="Row gap={1} … gap={7}">
        <Specs>
          {([1, 2, 3, 4, 5, 6, 7] as const).map((gap) => (
            <Spec key={gap} label={`gap={${gap}}`}>
              <Row gap={gap}>
                <Block label="one" />
                <Block label="two" />
                <Block label="three" />
              </Row>
            </Spec>
          ))}
        </Specs>
      </Section>
      <Note>
        `Row` wraps by default, because every row in this app eventually has to. `Stack` is the same
        thing vertically and defaults to <code>gap={4}</code>, which is the gap between cards.
      </Note>
    </Wrap>
  ),
};

export const SpacerAndDivider: StoryObj = {
  name: 'Spacer and Divider',
  render: () => (
    <Wrap>
      <Section
        title="Spacer eats the leftover width"
        note="Nothing has to reach for margin-left: auto. The old code wrote that onto whichever element happened to be last, which is why a chip once flew to the far side of a form."
      >
        <div style={{ maxWidth: 520 }}>
          <Card>
            <CardHeader title="Due today" count={3} end={<Button size="sm">Open Tasks</Button>} />
          </Card>
        </div>
      </Section>
      <Section title="Divider, both orientations">
        <Row gap={3}>
          <Block label="one" />
          <Divider orientation="vertical" />
          <Block label="two" />
          <Spacer />
          <Block label="far right" />
        </Row>
        <Divider />
      </Section>
    </Wrap>
  ),
};

export const PageFrame: StoryObj = {
  name: 'Page frame',
  render: () => (
    <Wrap>
      <Section
        title="PageHeader — one width and one inset, shared by every screen"
        note="Only the Overview greeting uses level=display. Every other screen is title."
      >
        <PageHeader title="People" end={<Button variant="primary">Sync roster</Button>} />
        <PageHeader title="Good morning" level="display" />
      </Section>
      <Section
        title="Columns — the wide column, then the narrow one"
        note="The fold happens when the content needs it: the widths are flex bases rather than a media query, so there is one breakpoint in the app and nobody has to maintain it."
      >
        <Columns
          main={
            <>
              <Card>
                <CardHeader title="Due today" count={3} />
              </Card>
              <Card>
                <CardHeader title="Waiting on you" />
              </Card>
            </>
          }
          side={
            <>
              <Card>
                <CardHeader title="Out today" />
              </Card>
              <Card>
                <CardHeader title="Hours" />
              </Card>
            </>
          }
        />
      </Section>
      <Section title="Stack, for anything else">
        <Stack gap={2}>
          <Text level="body">A stack of paragraphs at gap 2.</Text>
          <Text level="body" tone="muted">
            Which is eight pixels, and there is no way to make it nine.
          </Text>
        </Stack>
      </Section>
    </Wrap>
  ),
};
