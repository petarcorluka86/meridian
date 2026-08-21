import { loadConfig } from '@/lib/env';
import { Wizard } from '@/components/setup/Wizard';

/**
 * Reachable at any time, but the layout sends you here on first run. Nothing
 * configured is read back into the browser — only whether it is set.
 */
export default async function SetupPage() {
  const config = loadConfig();
  return (
    <Wizard
      initial={{
        vault: config.vaultPath,
        bamboo: Boolean(config.bamboo),
        calendar: Boolean(config.calendar),
        github: Boolean(config.github),
      }}
    />
  );
}
