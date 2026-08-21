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

export const viewport: Viewport = {
  /*
   * The paper ground, so a standalone window does not flash white around it.
   * The one place a colour is written out twice: this is a manifest value read
   * by the browser chrome before any stylesheet exists, so it cannot be a token.
   * It is `--bg`, and it has to be changed in both places.
   */
  themeColor: '#f2f0ec',
};

function RedirectToSetup(): never {
  redirect('/setup');
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const health = vaultHealth();
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
    <html lang="en">
      <body>
        <div className={styles.shell}>
          <Sidebar />
          <div className={`scroll ${styles.main}`}>
            {blocked ? (
              <SetupPanel health={health} envPath={loadConfig().envPath} />
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
