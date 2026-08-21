import type { VaultHealth } from '@/lib/vault/health';
import {
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  Code,
  CodeBlock,
  GuideIcon,
  Icon,
  Page,
  Row,
  Stack,
  Text,
} from '@/components/ui';

const WarnIcon = ({ tone }: { tone: 'warning' | 'danger' }) => (
  <Icon size="xl" tone={tone}>
    <path d="M12 4l9 16H3z" />
    <path d="M12 10v4M12 17h.01" />
  </Icon>
);

/**
 * The app always opens. A missing key disables the screens that need it, never
 * the shell, the sidebar or Help — so it can explain itself instead of looking
 * broken.
 *
 * One shape for all four states: a toned card, a label, a title, what happened,
 * the command to run, and one way out. Amber means nothing is broken and
 * something has not been pointed at yet; red means editing is blocked.
 */
export function SetupPanel({ health, envPath }: { health: VaultHealth; envPath: string }) {
  if (health.state === 'ok') return null;

  const panel = describe(health, envPath);

  return (
    <Page>
      <Card tone={panel.tone}>
        <CardHeader
          title={
            <Row gap={3}>
              <WarnIcon tone={panel.tone} />
              <Text level="micro" tone={panel.tone}>
                {panel.label.toUpperCase()}
              </Text>
            </Row>
          }
          bare
        />
        <CardBody>
          <Stack gap={4} align="start">
            <Text as="h1" level="heading">
              {panel.title}
            </Text>
            {panel.body}
            <ButtonLink href={panel.href} icon={<GuideIcon />}>
              {panel.action}
            </ButtonLink>
          </Stack>
        </CardBody>
      </Card>
    </Page>
  );
}

type Panel = {
  tone: 'warning' | 'danger';
  label: string;
  title: string;
  body: React.ReactNode;
  href: string;
  action: string;
};

function describe(health: Exclude<VaultHealth, { state: 'ok' }>, envPath: string): Panel {
  if (health.state === 'app-too-old') {
    return {
      tone: 'danger',
      label: 'Vault is newer',
      title: 'This vault needs a newer Meridian.',
      href: '/help?s=setup',
      action: 'Read the setup guide',
      body: (
        <>
          <Text level="body">
            <Code>{health.vaultPath}</Code> was written in format {health.found}, and this copy of
            Meridian understands format {health.supported}. Nothing has been read or changed — an
            older version writing a newer vault would quietly drop whatever it does not recognise.
          </Text>
          <Text level="body">
            Update Meridian, or point <Code>VAULT_PATH</Code> at a different folder.
          </Text>
        </>
      ),
    };
  }

  if (health.state === 'migration-failed') {
    return {
      tone: 'danger',
      label: 'Half converted',
      title: 'The vault was not brought forward.',
      href: '/help?s=vault',
      action: 'What to check',
      body: (
        <>
          <Text level="body">
            <Code>{health.vaultPath}</Code> is at format {health.at}, and the step to {health.what}{' '}
            did not finish. Editing is blocked: writing to a vault that is part converted is how the
            half that did convert gets lost.
          </Text>
          <CodeBlock>{health.reason}</CodeBlock>
          <Text level="body">
            The version on disk is still {health.at}, so nothing has been recorded as done and a
            restart tries the same step again. Snapshots of every file touched are in{' '}
            <Code>.snapshots/</Code> — <Code>npm run vault:restore</Code> lists them.
          </Text>
        </>
      ),
    };
  }

  if (health.state === 'unwritable') {
    return {
      tone: 'danger',
      label: 'Cannot write',
      title: 'Cannot write to the vault folder.',
      href: '/help?s=setup',
      action: 'Read the setup guide',
      body: (
        <>
          <Text level="body">
            Meridian can see <Code>{health.vaultPath}</Code> but cannot write to it, so editing is
            blocked rather than silently losing your work. Fix the folder&rsquo;s permissions and
            reload — nothing has been changed in the meantime.
          </Text>
          <CodeBlock>{`chmod u+rwx ${health.vaultPath}`}</CodeBlock>
          <Text level="body">The system reported: {health.reason}</Text>
        </>
      ),
    };
  }

  return {
    tone: 'warning',
    label: 'Not configured',
    title: 'Meridian has no vault yet',
    href: '/help?s=setup',
    action: 'Read the setup guide',
    body: (
      <>
        <Text level="body">
          Point <Code>VAULT_PATH</Code> at a folder in <Code>{envPath}</Code> and restart.
          Everything else — BambooHR, the calendar, GitHub — is optional and can be added later.
        </Text>
        {health.envMissing ? (
          <Text level="body">
            No <Code>.env</Code> found. Copy <Code>.env.example</Code> and fill in what you have.
          </Text>
        ) : null}
        <CodeBlock>VAULT_PATH=~/meridian/vault</CodeBlock>
      </>
    ),
  };
}
