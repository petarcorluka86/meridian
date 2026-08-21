import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { EMPTY_GLYPH } from '@/components/EmptyGlyphs';
import { NAV_GLYPH } from '@/components/NavIcons';
import { EMPTY } from '@/copy/empty';
import { Caveat, Note, Section, Doc } from '@/stories/Showcase';
import { Card, CardHeader } from './Card';
import { EmptyState } from './EmptyState';

/**
 * What a card says when it has nothing to show: the card's own icon on a tinted
 * tile, a title naming what is missing, and one line saying why filling it is
 * worth doing.
 *
 * The words and the tone both come from `src/copy/empty.ts`, never from the call
 * site, so an entry spreads in whole. The four tones are the four kinds of
 * empty: good news, content you have not written yet, a source with no
 * credentials, and a filter that matched nothing.
 */
const meta = {
  title: 'Components/Empty state',
  component: EmptyState,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof EmptyState>;

export default meta;

export const Kinds: StoryObj = {
  name: 'The four kinds of empty',
  render: () => (
    <Doc>
      <Section title="Good news — nothing is owed, and the card says so">
        <div style={{ maxWidth: 520 }}>
          <Card>
            <CardHeader title="Tasks" />
            <EmptyState glyph={NAV_GLYPH.tasks} {...EMPTY.tasks.allDone} />
          </Card>
        </div>
      </Section>
      <Section title="An invitation — content you have not written yet">
        <div style={{ maxWidth: 520 }}>
          <Card>
            <CardHeader title="Notes" />
            <EmptyState glyph={NAV_GLYPH.notes} {...EMPTY.notes.none} />
          </Card>
        </div>
      </Section>
      <Section title="A source with no credentials. Nothing is broken">
        <div style={{ maxWidth: 520 }}>
          <Card>
            <CardHeader title="Pull requests" />
            <EmptyState glyph={EMPTY_GLYPH.plug} {...EMPTY.sources.github} />
          </Card>
        </div>
      </Section>
      <Section
        title="A filter matched nothing, which is not the same as having nothing"
        note="The copy points back at the filter, and the tile drops to neutral: there is data, it is just not this."
      >
        <div style={{ maxWidth: 520 }}>
          <Card>
            <EmptyState glyph={EMPTY_GLYPH.search} {...EMPTY.notes.filtered} standalone />
          </Card>
        </div>
      </Section>
      <Note>
        Every wording the app has for emptiness is in <code>src/copy/empty.ts</code>, grouped by
        screen, and each entry carries its tone. The catalogue exists so that “no tasks” and
        “nothing open” cannot both be invented for the same situation on two different pages — and
        so the same emptiness cannot be green on one screen and grey on the next.
      </Note>
      <Note>
        No empty state carries a button. Every one of them sits in a card that already has the
        control — Add link, Edit, the field at the top — and a second one in the middle of the card
        competes with it.
      </Note>
      <Caveat>
        An unreadable file is not an empty state. Rendering “No tasks yet. Add the first one above.”
        over a <code>tasks.json</code> the app cannot parse is not a smaller version of the truth,
        it is the opposite of it. Those get a <code>Banner</code> naming the exact file.
      </Caveat>
    </Doc>
  ),
};
