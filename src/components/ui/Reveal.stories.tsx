import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Note, Section, Doc } from '@/stories/Showcase';
import { Card, CardBody, CardHeader } from './Card';
import { Blurred, RevealButton, useReveal } from './Reveal';
import { Text } from './Text';
import { Row } from './Layout';

/**
 * Shoulder-surfing is the threat this app actually has: it is open on a laptop in
 * an office, and it holds salaries.
 *
 * Money and planned rises blur until revealed, the reveal closes itself after
 * thirty seconds with a visible countdown, each card reveals independently, and
 * no setting turns it off.
 */
const meta = {
  title: 'Components/Reveal',
  parameters: { layout: 'padded', nextjs: { appDirectory: true } },
} satisfies Meta;

export default meta;

function Compensation() {
  const { revealed, left, toggle } = useReveal();
  return (
    <div style={{ maxWidth: 340 }}>
      <Card>
        <CardHeader
          title="Compensation"
          end={<RevealButton revealed={revealed} left={left} onToggle={toggle} />}
        />
        <CardBody>
          <Blurred revealed={revealed}>
            <Text as="div" level="title" numeric>
              € 4 850
            </Text>
            <Text as="div" level="small" tone="muted">
              Gross monthly, since March 2026
            </Text>
          </Blurred>
        </CardBody>
      </Card>
    </div>
  );
}

export const OneCard: StoryObj = {
  name: 'A card that reveals',
  render: () => (
    <Doc>
      <Section title="Press Reveal, then watch it close itself">
        <Compensation />
      </Section>
      <Note>
        Blurred is not merely visually obscured: it is unselectable, so a screenshot is the only way
        to take the number out, and it has pointer-events off, so nothing behind it is clickable
        while it is hidden.
      </Note>
    </Doc>
  ),
};

export const Independently: StoryObj = {
  name: 'Each card, independently',
  render: () => (
    <Doc>
      <Section
        title="Two cards, two countdowns"
        note="Revealing one does not reveal the other. There is no global unlock, because a global unlock is the thing somebody leaves on."
      >
        <Row gap={4}>
          <Compensation />
          <Compensation />
        </Row>
      </Section>
    </Doc>
  ),
};
