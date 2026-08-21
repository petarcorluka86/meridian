'use client';

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Doc, Note, Section } from '@/stories/Showcase';
import { Row } from './Layout';
import { Toggle } from './Toggle';

/**
 * A setting that takes effect the moment it is flipped. A `Checkbox` implies a
 * form to submit; this does not, so it is what the filter switches use.
 */
const meta = {
  title: 'Components/Toggle',
  component: Toggle,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Toggle>;

export default meta;

export const Interactive: StoryObj = {
  render: () => {
    const [drafts, setDrafts] = useState(false);
    const [draft, setDraft] = useState(true);
    return (
      <Doc>
        <Section title="Off and on">
          <Row gap={5}>
            <Toggle checked={drafts} onChange={setDrafts} label="Drafts only" />
            <Toggle checked={draft} onChange={setDraft} label="Draft" />
          </Row>
        </Section>
        <Note>
          There are two of these in the whole app: the Notes filter, and a note's own draft flag.
          Both change what is on screen immediately, which is the only case this component is for.
        </Note>
      </Doc>
    );
  },
};
