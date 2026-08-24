import { ThemeChoice } from '@/components/settings/ThemeChoice';
import { Card, CardBody, CardHeader, Code, Page, PageHeader, Stack, Text } from '@/components/ui';
import { loadConfig, tildeHome } from '@/lib/env';

/**
 * The one screen that is about the app rather than about the team.
 *
 * Everything else configurable lives in two places on purpose — thresholds in
 * the vault's config.json, credentials in .env — and neither belongs on a screen
 * behind a text field. What is here is what has no other home: a choice about
 * this display, on this machine, that nobody would think to look for in a file.
 */
export default async function SettingsPage() {
  const { theme, envPath } = loadConfig();

  return (
    <Page width="narrow">
      <PageHeader title="Settings" subtitle="How Meridian looks on this Mac" />

      <Card>
        <CardHeader
          title="Theme"
          end={
            <Text level="small" tone="muted">
              {theme === 'system' ? 'following your Mac' : `${theme}, always`}
            </Text>
          }
        />
        <CardBody>
          <Stack gap={3}>
            <ThemeChoice value={theme} />
            <Text level="small" tone="muted">
              System follows the appearance your Mac is set to, and changes with it — including when
              it switches itself at sunset. Light and Dark ignore the Mac and stay put.
            </Text>
            <Text level="small" tone="faint">
              Kept in <Code>{tildeHome(envPath)}</Code> as <Code>MERIDIAN_THEME</Code>, so it is the
              app's own setting and never travels with the vault.
            </Text>
          </Stack>
        </CardBody>
      </Card>
    </Page>
  );
}
