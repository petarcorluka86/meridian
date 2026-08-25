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
        desk: { name: 'Desk — the ground', value: 'var(--bg)' },
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
            'Stepper',
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
  /**
   * The design system has two schemes, so its own view of itself has to be able
   * to show either. The toolbar sets exactly what the app's root layout sets —
   * `data-theme`, or nothing at all for system — and `tokens.css` does the rest,
   * which is the point: there is no Storybook-only palette to drift.
   */
  globalTypes: {
    theme: {
      description: 'Colour scheme',
      toolbar: {
        title: 'Theme',
        icon: 'contrast',
        items: [
          { value: 'system', title: 'System' },
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { backgrounds: { value: 'desk' }, theme: 'light' },
  decorators: [
    (Story, { globals }) => {
      if (globals.theme === 'system') delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = globals.theme;

      return (
        <div style={{ fontFamily: 'var(--sans)', color: 'var(--fg)' }}>
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
