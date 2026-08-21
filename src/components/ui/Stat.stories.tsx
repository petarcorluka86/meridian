import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Doc, Note, Section } from '@/stories/Showcase';
import { Card, CardBody } from './Card';
import { Row } from './Layout';
import { Stat } from './Stat';

/**
 * A labelled number: a balance, an amount, hours owed. `lg` is the one figure a
 * screen is about; `md` is the others standing beside it.
 */
const meta = {
  title: 'Components/Stat',
  component: Stat,
  parameters: { layout: 'padded' },
  args: { label: 'Total balance', value: '+1.0h', size: 'lg', tone: 'success' },
} satisfies Meta<typeof Stat>;

export default meta;

export const Playground: StoryObj<typeof Stat> = {};

export const InARow: StoryObj = {
  name: 'The Timebalance summary',
  render: () => (
    <Doc>
      <Section title="One figure the screen is about, then the ones beside it">
        <div style={{ maxWidth: 560 }}>
          <Card>
            <CardBody>
              <Row gap={6}>
                <Stat label="Total balance" value="+1.0h" size="lg" tone="success" />
                <Stat label="This week" value="0.0h" tone="success" />
                <Stat label="This month" value="−2.0h" tone="danger" />
              </Row>
            </CardBody>
          </Card>
        </div>
      </Section>
      <Note>
        The value is always tabular, so a column or a row of them lines up on the digits rather than
        shuffling as the numbers change.
      </Note>
    </Doc>
  ),
};
