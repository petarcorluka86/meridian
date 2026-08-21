'use client';

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Caveat, Doc, Note, Section } from '@/stories/Showcase';
import { Card, CardHeader, CardRow } from './Card';
import { type Day, DayStepper } from './DayStepper';
import { Row, Spacer, Stack } from './Layout';
import { SyncBadge } from './SyncBadge';
import { Text } from './Text';

/**
 * Walks a card through the days its cache can answer for.
 *
 * The ends are disabled rather than hidden, so the control keeps its width and
 * the header does not shuffle as you reach the edge of what is cached — and the
 * label column is as wide as its longest word, so stepping does not move the
 * arrows either.
 */
const meta = {
  title: 'Components/Day stepper',
  component: DayStepper,
  parameters: { layout: 'padded', nextjs: { appDirectory: true } },
} satisfies Meta<typeof DayStepper>;

export default meta;

/** As `dayWindow()` builds it on the server: today, and what surrounds it. */
const DAYS: Day[] = [
  { iso: '2026-08-17', label: 'Mon 17 Aug' },
  { iso: '2026-08-18', label: 'Yesterday' },
  { iso: '2026-08-19', label: 'Today' },
  { iso: '2026-08-20', label: 'Tomorrow' },
  { iso: '2026-08-21', label: 'Fri 21 Aug' },
];

export const Stepping: StoryObj = {
  render: () => {
    const [index, setIndex] = useState(2);
    return (
      <Doc>
        <Section title="Walk to either end and the arrow stops">
          <Row gap={4}>
            <DayStepper days={DAYS} index={index} onChange={setIndex} />
            <Text level="small" tone="muted">
              {DAYS[index]?.iso}
            </Text>
          </Row>
        </Section>
        <Note>
          Today, yesterday and tomorrow are named rather than dated, because that is what somebody
          looking at a dashboard is asking about. Everything else is a weekday and a date.
        </Note>
        <Caveat>
          The days come down as a list built on the server, and this steps an index into it. Doing
          the date arithmetic here would put the visitor's clock in charge: for an hour either side
          of midnight their "today" is not the server's, and every other label on the card is
          computed against the server's.
        </Caveat>
      </Doc>
    );
  },
};

export const InACardHeader: StoryObj = {
  name: 'In a card header',
  render: () => {
    const [index, setIndex] = useState(2);
    return (
      <Doc>
        <Section
          title="Beside the sync badge, which is where both live"
          note="One says which day you are looking at; the other says how old the answer is. A card that steps through days needs both."
        >
          <div style={{ maxWidth: 460 }}>
            <Card>
              <CardHeader
                title="Meetings"
                count={index === 2 ? 2 : undefined}
                end={
                  <>
                    <DayStepper days={DAYS} index={index} onChange={setIndex} label="Day" />
                    <SyncBadge
                      source="Calendar"
                      target="calendar"
                      freshness={{ state: 'live', fetchedAt: '', age: '4m' }}
                    />
                  </>
                }
              />
              {index === 2 ? (
                <>
                  <CardRow>
                    <Stack gap={0}>
                      <Text level="label" tone="strong" numeric>
                        09:30 – 10:00
                      </Text>
                      <Text level="mono" tone="faint">
                        30 min
                      </Text>
                    </Stack>
                    <Text level="body">1:1 with Petra Kovač</Text>
                    <Spacer />
                  </CardRow>
                  <CardRow>
                    <Stack gap={0}>
                      <Text level="label" tone="strong" numeric>
                        11:00 – 12:00
                      </Text>
                      <Text level="mono" tone="faint">
                        1 h
                      </Text>
                    </Stack>
                    <Text level="body">Platform sync</Text>
                    <Spacer />
                  </CardRow>
                </>
              ) : (
                <CardRow>
                  <Text level="small" tone="muted">
                    Nothing on this day.
                  </Text>
                </CardRow>
              )}
            </Card>
          </div>
        </Section>
      </Doc>
    );
  },
};
