import os from 'node:os';
import path from 'node:path';
import { defineConfig } from '@playwright/test';

/**
 * The gate owns its servers, and nothing about what it renders may come from the
 * machine it runs on.
 *
 * Each has its own build directory, so the gate runs while `npm run dev` is up —
 * Next allows one dev server per directory, and sharing `.next` with the app you
 * are working on meant stopping it first and remembering to start it again.
 *
 * That means three things are pinned, not one. The vault, so the people and
 * notes are the fixture's rather than whoever's. The clock, as a full instant —
 * pinning only the date left the freshness pill free to flip from Live to Stale
 * inside an afternoon, which it did. And the credentials, because whether a
 * source is configured changes what every card shows, and until now that came
 * from the developer's own .env: a clone with no BambooHR would have rendered
 * different screens and failed every baseline.
 *
 * The values are fake and no request is ever made with them — VAULT_PATH points
 * inside the repository, so every sync refuses before it fetches.
 *
 * The theme is the fourth pinned thing, and it takes two: the stored setting is
 * pinned to `system` so the app defers to the browser, and the browser is then
 * told which scheme it is — once per project, below. Neither alone is enough. A
 * developer who had chosen Dark on this machine would otherwise have recorded
 * the light baselines in the dark.
 */
const APP = path.resolve(import.meta.dirname, '../..');

const PINNED = {
  VAULT_PATH: './src/fixtures/vault',
  MERIDIAN_NOW: '2026-08-19T12:00:00.000Z',
  MERIDIAN_ENV_PATH: path.join(APP, 'tests/pixel/gate.env'),
  MERIDIAN_THEME: 'system',
  BAMBOOHR_SUBDOMAIN: 'yourcompany',
  BAMBOOHR_API_KEY: 'gate-not-a-real-key',
  BAMBOOHR_MANAGER_EMPLOYEE_ID: '100',
  BAMBOOHR_MAX_AGE: '3600',
  BAMBOOHR_INBOX_MAX_AGE: '300',
  GITHUB_TOKEN: 'gate-not-a-real-token',
  GITHUB_LOGIN: 'you',
  GITHUB_REPOS: 'platform/core',
  GITHUB_MAX_AGE: '300',
  CALENDAR_ICAL_ADDRESS: 'https://calendar.google.com/calendar/ical/gate/private-gate/basic.ics',
  CALENDAR_MAX_AGE: '300',
  GOOGLE_CLIENT_ID: '',
  GOOGLE_CLIENT_SECRET: '',
  GOOGLE_CALENDAR_ID: '',
  GOOGLE_REFRESH_TOKEN: '',
};

export default defineConfig({
  testDir: '.',
  outputDir: '../../artifacts/pixel',
  snapshotPathTemplate: '{testDir}/baseline/{arg}-{projectName}-{platform}{ext}',
  globalSetup: './global-setup.ts',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    baseURL: 'http://127.0.0.1:3311',
  },
  timeout: 60_000,
  expect: { timeout: 15_000 },
  /*
   * Every screen twice, because there are two of every screen now. The scheme is
   * emulated rather than stored — `prefers-color-scheme`, which is what
   * `color-scheme: light dark` in tokens.css reads — so the two runs differ by
   * nothing but the browser's answer to that one question, and the app under
   * them is byte for byte the same.
   */
  projects: [
    { name: 'light', use: { colorScheme: 'light' } },
    { name: 'dark', use: { colorScheme: 'dark' } },
  ],
  webServer: [
    {
      command: 'npx next dev -H 127.0.0.1 -p 3311',
      url: 'http://127.0.0.1:3311',
      reuseExistingServer: false,
      timeout: 120_000,
      cwd: APP,
      env: { ...PINNED, PORT: '3311', NEXT_DIST_DIR: '.next-gate-screens' },
    },
    {
      // Changelog renders `git status` of the vault, and the fixture vault lives
      // inside this repository — so it has to be somewhere else, with a known
      // diff. global-setup builds it.
      command: 'npx next dev -H 127.0.0.1 -p 3312',
      url: 'http://127.0.0.1:3312',
      reuseExistingServer: false,
      timeout: 120_000,
      cwd: APP,
      env: {
        ...PINNED,
        PORT: '3312',
        NEXT_DIST_DIR: '.next-gate-changelog',
        VAULT_PATH: path.join(os.tmpdir(), 'meridian-gate-vault'),
        // Nothing configured. This vault is outside the repository, so the
        // fixture guard would not stop a sync — and a sync is not what is being
        // measured here.
        BAMBOOHR_SUBDOMAIN: '',
        BAMBOOHR_API_KEY: '',
        BAMBOOHR_MANAGER_EMPLOYEE_ID: '',
        GITHUB_TOKEN: '',
        GITHUB_LOGIN: '',
        GITHUB_REPOS: '',
        CALENDAR_ICAL_ADDRESS: '',
      },
    },
  ],
});
