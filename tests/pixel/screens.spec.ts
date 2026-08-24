import fs from 'node:fs';
import path from 'node:path';
import { expect, type Page, test } from '@playwright/test';

/**
 * Every screen, against a recorded image of itself.
 *
 * This does not prove the app matches anything external — it is the source of
 * truth, so there is nothing above it to match. It proves the screens have not
 * moved since the last time somebody looked at them and agreed. A change here is
 * either intended, and the baseline is updated in the same commit that caused it,
 * or it is a regression nobody noticed.
 *
 *   npm run pixel            check
 *   npm run pixel:accept     record the current screens as the new baseline
 *
 * The gate runs against the fixture vault with the clock pinned, so the data is
 * the same on every run and only the rendering can differ.
 */

const SCREENS = [
  { name: 'overview', url: '/' },
  { name: 'people', url: '/people' },
  { name: 'people-detailed', url: '/people?view=detailed' },
  { name: 'person', url: '/people/ana-horvat' },
  { name: 'tasks', url: '/tasks' },
  { name: 'notes', url: '/notes' },
  { name: 'projects', url: '/projects' },
  { name: 'project', url: '/projects/platform-split' },
  { name: 'timebalance', url: '/timebalance' },
  { name: 'vault', url: '/vault' },
  { name: 'help', url: '/help' },
];

/**
 * Changelog and the setup wizard are measured too, but not from this server.
 * Changelog needs a vault that is its own git repository — global-setup builds
 * one with a known diff, on the second port.
 */
const OTHER = 'http://127.0.0.1:3312';

/**
 * Baselines are per-platform: font rendering differs enough between macOS, Linux
 * and Windows that one machine's image is not another's. Rather than fail a
 * fresh clone on a platform nobody has recorded yet, the gate says so and skips.
 * Recording them is one command, and it has to be a deliberate act — a baseline
 * generated automatically would gate nothing.
 */
function baselineFor(name: string): string {
  return path.join(import.meta.dirname, 'baseline', `${name}-${process.platform}.png`);
}

function skipWithoutBaseline(name: string): void {
  // Not while recording — that is the run whose whole job is to create the file
  // this would skip for being absent.
  if (test.info().config.updateSnapshots !== 'none') return;
  test.skip(
    !fs.existsSync(baselineFor(name)),
    `No ${process.platform} baseline for "${name}". Run: npm run pixel:accept`,
  );
}

for (const screen of SCREENS) {
  test(screen.name, async ({ page }) => {
    skipWithoutBaseline(screen.name);
    await page.goto(screen.url);
    await page.waitForLoadState('networkidle');
    // Let the reveal countdown and any transition settle.
    await page.waitForTimeout(300);
    await expect(page.locator('[data-screen]')).toHaveScreenshot(`${screen.name}.png`, {
      maxDiffPixels: 0,
    });
  });
}

/**
 * The history card is masked, and only the history card. It shows the abbreviated
 * commit hash and how long ago the commit was — and those two cannot both be
 * stable: a fixed commit date gives a stable hash but a relative time that drifts
 * from "1 day ago" to "2 days ago", and a relative date gives a stable time but a
 * new hash on every run. Masking is honest about which part of this screen is not
 * reproducible; the diff itself, which is what the screen is for, is compared to
 * the pixel.
 */
async function changelog(page: Page, name: string, url: string) {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
  await expect(page.locator('[data-screen]')).toHaveScreenshot(`${name}.png`, {
    maxDiffPixels: 0,
    mask: [page.locator('[data-history]')],
  });
}

test('changelog', async ({ page }) => {
  skipWithoutBaseline('changelog');
  await changelog(page, 'changelog', `${OTHER}/changelog`);
});

test('changelog-unified', async ({ page }) => {
  // The other half of the screen: the same diff, drawn as one column.
  skipWithoutBaseline('changelog-unified');
  await changelog(page, 'changelog-unified', `${OTHER}/changelog?mode=unified`);
});

test('setup wizard', async ({ page }) => {
  // The screen a new user sees first, and until now the only one with no gate.
  skipWithoutBaseline('setup');
  await page.goto('/setup');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
  await expect(page.locator('[data-screen]')).toHaveScreenshot('setup.png', {
    maxDiffPixels: 0,
  });
});

test('sidebar', async ({ page }) => {
  // The shell is identical on every page, so it is recorded once on its own. A
  // change to it would otherwise show up as a diff on all nine screens at once.
  skipWithoutBaseline('sidebar');
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-shell-sidebar]')).toHaveScreenshot('sidebar.png', {
    maxDiffPixels: 0,
  });
});
