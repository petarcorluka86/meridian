import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PROBLEMS } from '@/copy/problems';
import { Note, Section, Doc } from '@/stories/Showcase';
import { Banner } from './Banner';
import { Stack as Col } from './Layout';
import { Button } from './Button';

/**
 * A message about the screen rather than about one row: a save confirmed, a file
 * the app cannot read, a warning before something leaves the machine.
 *
 * Four tones, the same four as everything else. The left border carries the
 * tone, so a stack of banners reads down its edge.
 */
const meta = {
  title: 'Components/Banner',
  component: Banner,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Banner>;

export default meta;

export const Tones: StoryObj = {
  render: () => (
    <Doc>
      <Section title="Four tones and a neutral">
        <Col gap={3}>
          <Banner tone="success" description="Saved to the vault. 14 files committed." />
          <Banner tone="warning" title={PROBLEMS.one} description={PROBLEMS.reassurance} />
          <Banner
            tone="danger"
            title="BambooHR did not answer"
            description="Showing data from yesterday 18:00. Notes, tasks and hours are unaffected."
          />
          <Banner tone="info">No remote configured. Saving works; sharing needs a remote.</Banner>
          <Banner description="Nothing has changed since the last save." />
        </Col>
      </Section>
      <Note>
        A banner never carries a spinner and never replaces content. When a source fails the last
        good data stays on screen and the banner says so — which is why the danger tone reads as an
        explanation rather than an error page.
      </Note>
    </Doc>
  ),
};

export const WithAnAction: StoryObj = {
  name: 'With an action',
  render: () => (
    <Section title="One action, on the right">
      <Banner tone="warning" title={PROBLEMS.many(3)} description={PROBLEMS.action} />
      <Banner
        tone="danger"
        title="Uncommitted changes for 6 days"
        end={<Button size="sm">Review</Button>}
      >
        Nothing is lost — the files are on disk. They are only not in git yet.
      </Banner>
    </Section>
  ),
};
