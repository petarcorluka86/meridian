import type { Preview } from '@storybook/nextjs-vite';
import '../src/styles/global.css';

/**
 * The app's own global sheet is the only styling here, so a story cannot look
 * right in Storybook and wrong in the app. `global.css` imports `tokens.css`,
 * which is what puts every custom property on `:root` for the token gallery to
 * read back at runtime.
 */
const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
    docs: { toc: true },
    backgrounds: {
      options: {
        desk: { name: 'Desk — the paper ground', value: 'var(--desk)' },
        surface: { name: 'Surface — a card', value: 'var(--surface)' },
        sunken: { name: 'Sunken — a card header', value: 'var(--surface-sunken)' },
      },
    },
    options: {
      // Deliberate, not alphabetical: form controls, then containers, then the
      // pieces that only exist because this app has tasks and sources.
      storySort: {
        order: [
          'Rules',
          'Catalogue',
          'Foundations',
          ['Tokens', 'Type'],
          'Components',
          [
            'Layout',
            'Button',
            'Chip',
            'Toggle',
            'Input',
            'Card',
            'Nav list',
            'Text link',
            'Table',
            'Dialog',
            'Banner',
            'Pill',
            'Empty state',
            'Stat',
            'Prose',
            'Icon',
            'Action glyphs',
            'Avatar',
            'Priority rail',
            'Category chip',
            'Day stepper',
            'Sync badge',
            'Skeleton',
            'Reveal',
            'Task row',
            'Review card',
            'Sidebar',
          ],
        ],
      },
    },
  },
  initialGlobals: { backgrounds: { value: 'desk' } },
  decorators: [
    (Story) => (
      <div style={{ fontFamily: 'var(--sans)', color: 'var(--text-body)' }}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
