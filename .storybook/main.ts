import path from 'node:path';
import type { StorybookConfig } from '@storybook/nextjs-vite';

const stub = (name: string) => path.join(import.meta.dirname, 'stubs', name);

/**
 * The only mocks in here. A Server Action cannot exist in a browser-only build:
 * importing the real module drags the vault, and with it node:fs, into the
 * bundle. A third entry is a decision, not a convenience.
 */
const STUBS: Record<string, string> = {
  '@/app/tasks/actions': stub('tasks-actions.ts'),
  '@/app/actions': stub('app-actions.ts'),
};

/**
 * The design system, rendered from the same CSS modules the app uses — never a
 * copy of them. A story that restates a value is a second place to change it,
 * which is the thing `tokens.css` exists to prevent.
 *
 * Stories live in `src/` on purpose: the token gate (`tests/unit/tokens.test.ts`)
 * walks `src/` and would fail a story that wrote a colour out by hand.
 */
const config: StorybookConfig = {
  framework: { name: '@storybook/nextjs-vite', options: {} },
  stories: ['../src/**/*.mdx', '../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  staticDirs: ['../public'],
  // The app makes no outbound request it has not been asked to make, and the
  // tool that documents it does not get an exemption. Storybook's telemetry and
  // its version check are both on by default.
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  viteFinal(vite) {
    vite.resolve ??= {};
    const resolve = vite.resolve;
    resolve.alias = Array.isArray(resolve.alias)
      ? [
          ...Object.entries(STUBS).map(([find, replacement]) => ({ find, replacement })),
          ...resolve.alias,
        ]
      : { ...STUBS, ...resolve.alias };
    return vite;
  },
};

export default config;
