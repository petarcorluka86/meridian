import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { EMPTY } from '@/copy/empty';
import { Caveat, Note, Section, Doc } from '@/stories/Showcase';
import { Card, CardHeader } from './Card';
import { EmptyState } from './EmptyState';

/**
 * What a card says when it has nothing to show. Two sizes: `md` inside a card,
 * `lg` when the whole screen is empty.
 *
 * The words always come from `src/copy/empty.ts`, never from the call site.
 */
const meta = {
  title: 'Components/Empty state',
  component: EmptyState,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof EmptyState>;

export default meta;

export const Sizes: StoryObj = {
  render: () => (
    <Doc>
      <Section title="Inside a card, under a header">
        <div style={{ maxWidth: 520 }}>
          <Card>
            <CardHeader title="Tasks" />
            <EmptyState>{EMPTY.tasks.allDone}</EmptyState>
          </Card>
        </div>
      </Section>
      <Section title="The whole screen">
        <div style={{ maxWidth: 520 }}>
          <Card>
            <EmptyState size="lg" standalone>
              {EMPTY.overview.whole}
            </EmptyState>
          </Card>
        </div>
      </Section>
      <Note>
        Every wording the app has for emptiness is in <code>src/copy/empty.ts</code>, grouped by
        screen. The catalogue exists so that “no tasks” and “nothing open” cannot both be invented
        for the same situation on two different pages.
      </Note>
      <Caveat>
        An unreadable file is not an empty state. Rendering “No tasks yet. Add the first one above.”
        over a <code>tasks.json</code> the app cannot parse is not a smaller version of the truth,
        it is the opposite of it. Those get a <code>Banner</code> naming the exact file.
      </Caveat>
    </Doc>
  ),
};
