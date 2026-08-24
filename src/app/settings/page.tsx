import { DangerZone } from '@/components/settings/DangerZone';
import { ThemeChoice } from '@/components/settings/ThemeChoice';
import {
  ButtonLink,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardRow,
  Code,
  Page,
  PageHeader,
  Spacer,
  Stack,
  SyncBadge,
  Text,
} from '@/components/ui';
import { loadConfig, tildeHome } from '@/lib/env';
import { readBamboo } from '@/lib/sources/bamboohr';
import { readCalendar } from '@/lib/sources/calendar';
import { readGithub } from '@/lib/sources/github';

/**
 * The one screen that is about the app rather than about the team.
 *
 * Everything configurable still lives in a file — thresholds in the vault's
 * config.json, credentials in .env — and this screen does not become a form over
 * them. What is here is what has no other home: a choice about this display, a
 * view of whether the three sources are actually answering, and the two
 * destructive actions, which have to be somewhere a person can find them and
 * nowhere they can be hit by accident.
 */
export default async function SettingsPage() {
  const { theme, envPath, vaultPath, bamboo, calendar, github } = loadConfig();

  const sources = [
    {
      name: 'BambooHR',
      target: 'roster' as const,
      freshness: readBamboo().freshness,
      reads: 'Roster, absences, approvals and the compensation history.',
      unset: 'BAMBOOHR_SUBDOMAIN, BAMBOOHR_API_KEY and BAMBOOHR_MANAGER_EMPLOYEE_ID',
      configured: bamboo !== null,
    },
    {
      name: 'Google Calendar',
      target: 'calendar' as const,
      freshness: readCalendar().freshness,
      reads: 'Your meetings, for the day strip on the Overview.',
      unset: 'CALENDAR_ICAL_ADDRESS, or the four GOOGLE_ keys',
      configured: calendar !== null,
    },
    {
      name: 'GitHub',
      target: 'github' as const,
      freshness: readGithub().freshness,
      reads: 'Pull requests waiting on your review, for the repositories you list.',
      unset: 'GITHUB_TOKEN and GITHUB_LOGIN',
      configured: github !== null,
    },
  ];

  const connected = sources.filter((source) => source.configured).length;

  return (
    <Page width="narrow">
      <PageHeader title="Settings" subtitle="How Meridian looks and what it is connected to" />

      <Stack gap={4}>
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
                System follows the appearance your Mac is set to, and changes with it — including
                when it switches itself at sunset. Light and Dark ignore the Mac and stay put.
              </Text>
              <Text level="small" tone="faint">
                Kept in <Code>{tildeHome(envPath)}</Code> as <Code>MERIDIAN_THEME</Code>, so it is
                the app's own setting and never travels with the vault.
              </Text>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Connections"
            end={
              <Text level="small" tone="muted">
                {connected} of {sources.length} set up
              </Text>
            }
          />
          {sources.map((source) => (
            <CardRow key={source.name}>
              <Stack gap={1}>
                <Text level="bodyStrong">{source.name}</Text>
                <Text level="small" tone="muted">
                  {source.configured ? source.reads : `${source.unset} are unset.`}
                </Text>
              </Stack>
              <Spacer />
              {source.configured ? (
                <SyncBadge
                  source={source.name}
                  target={source.target}
                  freshness={source.freshness}
                />
              ) : (
                <ButtonLink href="/help?s=setup" size="sm" variant="neutral">
                  How to connect it
                </ButtonLink>
              )}
            </CardRow>
          ))}
          <CardFooter>
            <Text level="small" tone="muted">
              Read only, in both directions: every request these make is a read, and nothing is ever
              written back to them. The badge says how old each answer is and fetches a new one.
              Credentials live in <Code>{tildeHome(envPath)}</Code>, and a key changed by hand there
              needs a restart.
            </Text>
          </CardFooter>
        </Card>

        <DangerZone
          vaultPath={vaultPath ? tildeHome(vaultPath) : 'the vault'}
          envPath={tildeHome(envPath)}
        />
      </Stack>
    </Page>
  );
}
