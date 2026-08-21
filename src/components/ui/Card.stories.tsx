import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { EMPTY } from '@/copy/empty';
import { Caveat, Note, Section, Doc } from '@/stories/Showcase';
import { ButtonLink } from './Button';
import { Card, CardBody, CardFooter, CardHeader, CardRow, CardToolbar } from './Card';
import { ChipLink } from './Chip';
import { EmptyState } from './EmptyState';
import { SyncBadge } from './SyncBadge';
import { Pill } from './Pill';
import { Rail } from './Rail';
import { Spacer } from './Layout';
import { Text } from './Text';

/**
 * The container the whole app is built out of. It was declared twenty-one times
 * across eleven modules; it is declared once.
 *
 * White surface, one line, `--radius-card`, and `overflow: hidden` so a row's
 * border disappears into the corner. Depth comes from the sunken header, not
 * from a shadow. There is no elevated variant and no borderless variant.
 */
const meta = {
  title: 'Components/Card',
  component: Card,
  parameters: { layout: 'padded', nextjs: { appDirectory: true } },
} satisfies Meta<typeof Card>;

export default meta;

export const Anatomy: StoryObj = {
  render: () => (
    <Doc>
      <Section
        title="Header, toolbar, rows"
        note="The header carries the title, an optional count, and whatever holds state — a freshness pill, a link out — in that order, on every card in the app."
      >
        <div style={{ maxWidth: 560 }}>
          <Card>
            <CardHeader
              title="Due today"
              count={3}
              end={
                <>
                  <SyncBadge
                    source="BambooHR"
                    target="roster"
                    freshness={{ state: 'live', fetchedAt: '', age: '2m' }}
                  />
                  <ButtonLink href="/tasks" size="sm">
                    Open Tasks
                  </ButtonLink>
                </>
              }
            />
            <CardToolbar>
              <ChipLink href="#" size="sm" selected>
                All (3)
              </ChipLink>
              <ChipLink href="#" size="sm">
                Urgent (1)
              </ChipLink>
            </CardToolbar>
            <CardRow>
              <Rail priority="urgent" />
              <Text level="body" tone="strong">
                Sign off the comp letters
              </Text>
              <Spacer />
              <Pill tone="danger">3 days late</Pill>
            </CardRow>
            <CardRow>
              <Rail priority="normal" />
              <Text level="body" tone="strong">
                Book the offsite room
              </Text>
              <Spacer />
              <Pill tone="info">Today</Pill>
            </CardRow>
          </Card>
        </div>
      </Section>

      <Section
        title="CardBody — prose or a form, rather than a list"
        note="Padded once, at --space-4, like everything else in the card."
      >
        <div style={{ maxWidth: 560 }}>
          <Card>
            <CardHeader title="About" />
            <CardBody>
              <Text level="body" tone="muted">
                Joined in March. Owns the ingestion pipeline and has been asking for a second pair
                of hands on it since June.
              </Text>
            </CardBody>
          </Card>
        </div>
      </Section>

      <Section
        title="CardHeader bare — no rows follow"
        note="Dropping the bottom border stops the header looking like it is waiting for content that never arrives."
      >
        <div style={{ maxWidth: 380 }}>
          <Card>
            <CardHeader
              title="Out today"
              bare
              end={
                <SyncBadge
                  source="BambooHR"
                  target="roster"
                  freshness={{ state: 'unconfigured' }}
                />
              }
            />
          </Card>
        </div>
      </Section>

      <Section title="CardFooter — the actions belonging to the card">
        <div style={{ maxWidth: 380 }}>
          <Card>
            <CardHeader title="Vault" />
            <CardBody>
              <Text level="small" tone="muted">
                14 files changed since the last save.
              </Text>
            </CardBody>
            <CardFooter>
              <ButtonLink href="/changelog" size="sm">
                Review
              </ButtonLink>
            </CardFooter>
          </Card>
        </div>
      </Section>
    </Doc>
  ),
};

export const Empty: StoryObj = {
  name: 'Empty states',
  render: () => (
    <Doc>
      <Section
        title="The words come from src/copy, never from the call site"
        note="One wording per situation, used everywhere. Two screens describing the same emptiness differently is how somebody learns to distrust both."
      >
        <div style={{ maxWidth: 560 }}>
          <Card>
            <CardHeader title="Waiting on you" />
            <EmptyState>{EMPTY.overview.inbox}</EmptyState>
          </Card>
        </div>
      </Section>
      <Section title="The whole screen, empty">
        <div style={{ maxWidth: 560 }}>
          <Card>
            <EmptyState size="lg" standalone>
              {EMPTY.overview.whole}
            </EmptyState>
          </Card>
        </div>
      </Section>
      <Caveat>
        An empty state and an unreadable file are opposite claims. A <code>tasks.json</code> the app
        cannot parse must never render as “No tasks yet. Add the first one above.” — that sends
        somebody to add a task on top of data they still have and cannot see. Those get a
        <code>Banner</code> and the exact filename instead, from <code>src/copy/problems.ts</code>.
      </Caveat>
      <Note>
        Every string on this page is imported from <code>@/copy/empty</code>, so this story cannot
        drift from the app: if the wording changes, this changes with it.
      </Note>
    </Doc>
  ),
};
