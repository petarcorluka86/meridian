import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Note, Section, Doc } from '@/stories/Showcase';
import { Card, CardHeader, CardRow } from './Card';
import { CATEGORIES, categoryOf } from './Category';
import { Spacer } from './Layout';
import { CategoryPill } from './Pill';
import { Text } from './Text';

/**
 * `CATEGORIES` is data — value and label, and nothing else. The colours are the
 * category palette in `tokens.css`, applied by `CategoryPill`.
 *
 * It used to be a table of hues plus a function returning inline styles, which
 * meant a category's colour was the one colour in the app that did not live with
 * the others.
 */
const meta = {
  title: 'Components/Category chip',
  parameters: { layout: 'padded', nextjs: { appDirectory: true } },
} satisfies Meta;

export default meta;

const NOTES = [
  { title: 'Career conversation', category: '1on1', when: '12 Aug' },
  { title: 'Deploy postmortem', category: 'incident', when: '9 Aug' },
  { title: 'Q4 headcount sketch', category: 'planning', when: '4 Aug' },
  { title: 'Idea: split the ingestion queue', category: 'idea', when: '1 Aug' },
];

export const AllSix: StoryObj = {
  name: 'All six',
  render: () => (
    <Doc>
      <Section title="One colour per category, from the palette in tokens.css">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {CATEGORIES.map((category) => (
            <CategoryPill key={category.value} category={category.value} label={category.label} />
          ))}
        </div>
      </Section>
      <Note>
        Generic is the only grey one, and it is also the fallback: <code>categoryOf</code> returns
        it for an unknown value rather than throwing or picking a colour of its own.
      </Note>
    </Doc>
  ),
};

export const OnANoteRow: StoryObj = {
  name: 'On a note row',
  render: () => (
    <div style={{ maxWidth: 560 }}>
      <Card>
        <CardHeader title="Notes" count={NOTES.length} />
        {NOTES.map((note) => (
          <CardRow key={note.title}>
            <Text level="body" tone="strong" truncate>
              {note.title}
            </Text>
            <Spacer />
            <CategoryPill category={note.category} label={categoryOf(note.category).label} />
            <Text level="small" tone="muted">
              {note.when}
            </Text>
          </CardRow>
        ))}
      </Card>
    </div>
  ),
};
