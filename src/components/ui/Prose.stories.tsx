import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Note, Section, Doc } from '@/stories/Showcase';
import { Card, CardBody, CardHeader } from './Card';
import { Prose } from './Prose';

/**
 * Rendered Markdown — a person's About and the note reader. The only rule set in
 * the system that reaches for bare element selectors, because the HTML it styles
 * is generated and has no class names to hang off.
 */
const meta = {
  title: 'Components/Prose',
  component: Prose,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Prose>;

export default meta;

const HTML = `
<h1>Heading one</h1>
<p>A paragraph at the body level, in the default ink rather than the strong one — body copy is quieter than the numbers around it. <strong>Strong</strong> lifts back to the strong ink, which is the only emphasis available.</p>
<h2>Heading two</h2>
<ul><li>A list item</li><li>Another, with <code>inline code</code> in the mono stack</li></ul>
<h3>Heading three</h3>
<ol><li>Ordered, same rhythm</li><li>Second</li></ol>
<blockquote>A quote sits behind a 3px line and drops to the muted ink.</blockquote>
<pre>npm run vault:doctor</pre>
<p>The last child never carries a bottom margin, so a card does not gain a stray row of space under the text.</p>
`;

export const RenderedMarkdown: StoryObj = {
  name: 'Every element it styles',
  render: () => (
    <Doc>
      <Section title="Inside a CardBody, which is where it always is">
        <div style={{ maxWidth: 680 }}>
          <Card>
            <CardHeader title="About" />
            <CardBody>
              <Prose html={HTML} />
            </CardBody>
          </Card>
        </div>
      </Section>
      <Note>
        There is no variant. A note and an About render identically, because they are the same kind
        of thing and the reader should not have to work out which one they are looking at. Every
        margin is a spacing step and every size is a type level, so prose moves with the rest of the
        system rather than beside it.
      </Note>
    </Doc>
  ),
};
