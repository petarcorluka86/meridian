import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Caveat, Doc, Note, Section, Spec, Specs } from '@/stories/Showcase';
import { Card, CardHeader, CardRow } from './Card';
import { Row } from './Layout';
import { SyncBadge } from './SyncBadge';
import { Text } from './Text';

/**
 * How long ago this card's numbers arrived, and a way to go and look again.
 *
 * It replaced a pill that said "Live" or "Stale · 20m old". Those were states of
 * the cache; what somebody wants to know is how old the number in front of them
 * is, and whether they can have a newer one — so the badge says the age and *is*
 * the button.
 *
 * Press it and the story logs the target in the Actions panel. In the app it
 * refetches that one dataset, ignoring the freshness window, and refreshes the
 * page in place.
 */
const meta = {
  title: 'Components/Sync badge',
  component: SyncBadge,
  parameters: { layout: 'padded', nextjs: { appDirectory: true } },
} satisfies Meta<typeof SyncBadge>;

export default meta;

const AT = '2026-08-21T08:00:00.000Z';

export const EveryState: StoryObj = {
  name: 'Every state',
  render: () => (
    <Doc>
      <Section title="The age is the label, and the label is the button">
        <Specs>
          <Spec label="fresh — inside its window">
            <SyncBadge
              source="BambooHR"
              target="roster"
              freshness={{ state: 'live', fetchedAt: AT, age: '2m' }}
            />
          </Spec>
          <Spec label="ageing — past its window">
            <SyncBadge
              source="BambooHR"
              target="roster"
              freshness={{ state: 'stale', fetchedAt: AT, ageLabel: '2h old', age: '2h' }}
            />
          </Spec>
          <Spec label="failed — the reason is on hover">
            <SyncBadge
              source="GitHub"
              target="github"
              freshness={{
                state: 'failed',
                fetchedAt: AT,
                ageLabel: '3h old',
                age: '3h',
                message: 'GitHub did not answer',
              }}
            />
          </Spec>
          <Spec label="never answered">
            <SyncBadge source="Calendar" target="calendar" freshness={{ state: 'missing' }} />
          </Spec>
          <Spec label="not connected — nothing to refresh">
            <SyncBadge source="Calendar" target="calendar" freshness={{ state: 'unconfigured' }} />
          </Spec>
        </Specs>
      </Section>
      <Note>
        A failure keeps the age and turns red rather than replacing the number with an error. The
        last good data is still on screen, and the badge has to say that it is old — not only that
        something went wrong.
      </Note>
      <Caveat>
        The age comes down already worked out. Computing a relative time in the browser means the
        visitor's clock decides how fresh the numbers look, which disagrees with the server's across
        a minute boundary — React calls that a hydration mismatch and a reader would call it a lie.
      </Caveat>
    </Doc>
  ),
};

export const OnACard: StoryObj = {
  name: 'On a card',
  render: () => (
    <Doc>
      <Section
        title="One per card, on the right of its header"
        note="Every card that shows data from a source carries one. A card built only from the vault carries none — there is nothing to sync."
      >
        <div style={{ maxWidth: 520 }}>
          <Card>
            <CardHeader
              title="BambooHR inbox"
              count={2}
              end={
                <SyncBadge
                  source="BambooHR"
                  target="inbox"
                  freshness={{ state: 'live', fetchedAt: AT, age: '4m' }}
                />
              }
            />
            <CardRow>
              <Text level="body">Ana Horvat — annual leave, 1–5 September</Text>
            </CardRow>
            <CardRow>
              <Text level="body">Marko Marić — annual leave, 25–29 August</Text>
            </CardRow>
          </Card>
        </div>
      </Section>
      <Section title="Side by side, so the ages can be compared">
        <Row gap={2}>
          <SyncBadge
            source="BambooHR"
            target="roster"
            freshness={{ state: 'live', fetchedAt: AT, age: 'now' }}
          />
          <SyncBadge
            source="Calendar"
            target="calendar"
            freshness={{ state: 'stale', fetchedAt: AT, ageLabel: '41m old', age: '41m' }}
          />
          <SyncBadge
            source="GitHub"
            target="github"
            freshness={{ state: 'live', fetchedAt: AT, age: '1h' }}
          />
        </Row>
      </Section>
    </Doc>
  ),
};
