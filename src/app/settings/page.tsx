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
import { changedFiles, repoState, unpushedCount, upstream } from '@/lib/git';
import { getVault } from '@/lib/vault/index';
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
/**
 * "6 notes, 8 tasks and 4 projects" — only what is actually there, and the
 * plural spelled out rather than an `s` bolted on, because one of these is
 * people.
 */
function listOf(parts: Array<[number, string, string]>): string {
  const said = parts
    .filter(([count]) => count > 0)
    .map(([count, one, many]) => `${count} ${count === 1 ? one : many}`);

  if (said.length === 0) return 'nothing yet';
  if (said.length === 1) return said[0]!;
  return `${said.slice(0, -1).join(', ')} and ${said[said.length - 1]}`;
}

/**
 * Whether a copy of this vault exists anywhere else, which is the one thing
 * somebody about to empty it actually needs to know. Every other line in that
 * dialog describes what goes; this one says whether it is gone.
 */
async function safetyNet(): Promise<string> {
  if ((await repoState()).kind !== 'ok') {
    return 'This vault is not a Git repository, so there is no commit anywhere to go back to.';
  }

  const [changed, unpushed, remote] = await Promise.all([
    changedFiles(),
    unpushedCount(),
    upstream(),
  ]);

  if (!remote) {
    return 'This vault has no remote, so every copy of it is the folder itself.';
  }
  if (unpushed > 0 || changed.length > 0) {
    return `${listOf([
      [changed.length, 'change', 'changes'],
      [unpushed, 'commit', 'commits'],
    ])} here ${changed.length + unpushed === 1 ? 'has' : 'have'} not reached ${remote.remote}. Everything before that is on the remote and survives.`;
  }
  return `Everything is committed and pushed to ${remote.remote}, so that copy survives this.`;
}

export default async function SettingsPage() {
  const { theme, envPath, vaultPath, bamboo, calendar, github } = loadConfig();
  const vault = getVault();

  const contents = listOf([
    [vault.notes.length, 'note', 'notes'],
    [vault.tasks.length, 'task', 'tasks'],
    [vault.projects.length, 'project', 'projects'],
    [vault.people.length, 'person', 'people'],
    [vault.time.length, 'hour entry', 'hour entries'],
  ]);

  const sources = [
    {
      name: 'BambooHR',
      // Which step of the wizard connects it. Settings has no connection form of
      // its own — it links back into the wizard, one step at a time.
      step: 'bamboo' as const,
      target: 'roster' as const,
      freshness: readBamboo().freshness,
      reads: 'Roster, absences, approvals and the compensation history.',
      unset: 'The company name, an API key and your employee id.',
      configured: bamboo !== null,
    },
    {
      name: 'Google Calendar',
      step: 'calendar' as const,
      target: 'calendar' as const,
      freshness: readCalendar().freshness,
      reads: 'Your meetings, for the day strip on the Overview.',
      unset: 'Not signed in to Google.',
      configured: calendar !== null,
    },
    {
      name: 'GitHub',
      step: 'github' as const,
      target: 'github' as const,
      freshness: readGithub().freshness,
      reads: 'Pull requests waiting on your review, for the repositories you list.',
      unset: 'A token and your handle.',
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
                  {source.configured ? source.reads : source.unset}
                </Text>
              </Stack>
              <Spacer />
              {source.configured ? (
                <SyncBadge
                  source={source.name}
                  target={source.target}
                  freshness={source.freshness}
                />
              ) : null}
              <ButtonLink href={`/setup?only=${source.step}`} size="sm" variant="neutral">
                {source.configured ? 'Reconnect' : 'Connect'}
              </ButtonLink>
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
          contents={contents}
          safetyNet={await safetyNet()}
        />
      </Stack>
    </Page>
  );
}
