import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import '@/styles/global.css';
import styles from '@/components/Shell.module.css';
import { Sidebar } from '@/components/Sidebar';
import { SetupPanel } from '@/components/setup/SetupPanel';
import { VaultProblems } from '@/components/VaultProblems';
import { RefreshSources } from '@/components/overview/RefreshSources';
import { redirect } from 'next/navigation';
import { blocksEditing, vaultHealth } from '@/lib/vault/health';
import { loadConfig } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Meridian',
  description: 'A local hub for running a team',
  manifest: '/manifest.webmanifest',
  // Declared rather than left to Next's file convention: mixing the two meant an
  // explicit entry silently replaced the generated ones, and the apple icon
  // vanished. One mechanism is easier to be sure about.
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-96.png', type: 'image/png', sizes: '96x96' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
};

/*
 * `--bg`, both halves of it, written out a second time.
 *
 * This is a manifest value the browser chrome reads before any stylesheet
 * exists, so it cannot be a token — and it is the only place in the app where a
 * colour is duplicated. Change `--bg` in tokens.css and change these.
 */
export const GROUND = { light: '#f2f0ec', dark: '#161310' } as const;

/**
 * Dynamic because the theme is: a stored choice names one colour, and `system`
 * hands the question back to the browser as two media-scoped ones — the same
 * shape as `color-scheme: light dark` in tokens.css, said in the one place that
 * cannot read a token.
 */
export async function generateViewport(): Promise<Viewport> {
  const { theme } = loadConfig();
  if (theme === 'light' || theme === 'dark') return { themeColor: GROUND[theme] };
  return {
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: GROUND.light },
      { media: '(prefers-color-scheme: dark)', color: GROUND.dark },
    ],
  };
}

function RedirectToSetup(): never {
  redirect('/setup');
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const health = vaultHealth();
  const { theme, envPath } = loadConfig();
  const path = (await headers()).get('x-meridian-path') ?? '/';
  // Help still renders, so the page explaining the fix is always reachable.
  // The wizard replaces the bare panel for an unset vault: it can actually fix
  // the problem rather than only describe it. An unwritable vault still gets the
  // panel — the wizard cannot help with a permissions problem it would hit too.
  const onSetup = path.startsWith('/setup');
  const needsSetup = health.state === 'unset' && !path.startsWith('/help') && !onSetup;
  // A vault written by a newer Meridian is not a thing to browse read-only — the
  // first save would drop whatever this build cannot see — and neither is one a
  // migration stopped halfway through. Which states those are lives next to the
  // union, so a new one cannot be forgotten here.
  const blocked = blocksEditing(health) && !path.startsWith('/help');

  return (
    /*
     * The attribute is the whole theme mechanism, and it is absent for `system`
     * — which is what makes system the default rather than a third palette.
     * Rendered here, on the server, so the first paint is already right; a
     * scheme decided in the browser shows the wrong one first, on every load.
     */
    <html lang="en" data-theme={theme === 'system' ? undefined : theme}>
      <body>
        <div className={styles.shell}>
          {/*
           * No sidebar during setup. On a first run every link in it goes
           * somewhere that has no vault to read yet, and the wizard is the only
           * thing to do — a nav that cannot be used is furniture in the way of
           * the one screen that matters. The same holds for one connection
           * reopened from Settings, which carries its own way back.
           */}
          {onSetup ? null : <Sidebar />}
          <div className={`scroll ${styles.main}`} data-solo={onSetup || undefined}>
            {blocked ? (
              <SetupPanel health={health} envPath={envPath} />
            ) : needsSetup ? (
              <RedirectToSetup />
            ) : (
              <>
                <VaultProblems />
                {children}
              </>
            )}
          </div>
          {health.state === 'ok' ? <RefreshSources /> : null}
        </div>
      </body>
    </html>
  );
}
