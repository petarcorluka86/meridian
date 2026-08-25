import { loadConfig } from '@/lib/env';
import { type Only, Wizard } from '@/components/setup/Wizard';

const CONNECTIONS: Only[] = ['bamboo', 'calendar', 'github'];

/**
 * Reachable at any time, but the layout sends you here on first run. Nothing
 * configured is read back into the browser — only whether it is set.
 *
 * `?only=` is how Settings reopens one connection without a screen of its own:
 * the wizard is the connection screen, and this is the URL that says which part
 * of it. A URL rather than a dialog so that it can be linked to, reloaded and
 * gated like any other screen.
 */
export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ only?: string }>;
}) {
  const { only } = await searchParams;
  const config = loadConfig();

  return (
    <Wizard
      only={CONNECTIONS.includes(only as Only) ? (only as Only) : undefined}
      initial={{
        vault: config.vaultPath,
        bamboo: Boolean(config.bamboo),
        calendar: Boolean(config.calendar),
        github: Boolean(config.github),
      }}
    />
  );
}
