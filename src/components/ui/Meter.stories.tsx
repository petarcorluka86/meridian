import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Caveat, Note, Section, Spec, Specs, Doc } from '@/stories/Showcase';
import { Card, CardBody, CardHeader } from './Card';
import { Meter } from './Meter';
import { Row, Spacer, Stack } from './Layout';
import { Pill } from './Pill';
import { Text } from './Text';

/**
 * A proportion of a known total. The only thing in the app with a denominator, so
 * the only thing that gets a bar.
 *
 * Two tones, and the second is the reason there are two: `success` when the total
 * is reached, so a finished project reads differently from one that is merely far
 * along.
 */
const meta = {
  title: 'Components/Meter',
  component: Meter,
  parameters: { layout: 'padded' },
  args: { value: 2, total: 5, tone: 'accent', label: 'Phases done' },
} satisfies Meta<typeof Meter>;

export default meta;

export const Playground: StoryObj<typeof Meter> = {};

export const Tones: StoryObj = {
  name: 'Two tones, and where it sits',
  render: () => (
    <Doc>
      <Section title="Under way, and finished">
        <Specs>
          <Spec label="value={0} total={5}">
            <div style={{ width: 260 }}>
              <Meter value={0} total={5} label="Nothing done yet" />
            </div>
          </Spec>
          <Spec label="value={2} total={5}">
            <div style={{ width: 260 }}>
              <Meter value={2} total={5} label="Two of five" />
            </div>
          </Spec>
          <Spec label='tone="success"'>
            <div style={{ width: 260 }}>
              <Meter value={5} total={5} tone="success" label="All five" />
            </div>
          </Spec>
        </Specs>
      </Section>

      <Section
        title="Never on its own"
        note="The bar is the fact you can see; the fraction beside it is the one you can quote. A bar with no number next to it makes the reader estimate."
      >
        <div style={{ maxWidth: 520 }}>
          <Card>
            <CardHeader
              title="Phases"
              count={5}
              end={
                <>
                  <Text level="small" tone="muted">
                    2 of 5 done
                  </Text>
                  <Pill tone="info">40%</Pill>
                </>
              }
            />
            <CardBody>
              <Stack gap={2}>
                <Meter value={2} total={5} label="Phases done" />
                <Row gap={2}>
                  <Text level="small" tone="muted">
                    Next: Payments service extracted
                  </Text>
                  <Spacer />
                </Row>
              </Stack>
            </CardBody>
          </Card>
        </div>
      </Section>

      <Note>
        The width is the one length in the app that comes from data rather than from the scale, so
        it is passed in as a custom property and <code>Meter.module.css</code> is still the only
        thing that decides what to do with it.
      </Note>
      <Caveat>
        Nothing without a denominator is a <code>Meter</code>. A project with no phases gets no bar
        at all rather than an empty one: 0% claims no progress has been made, when the truth is that
        this project is not measured that way.
      </Caveat>
    </Doc>
  ),
};
