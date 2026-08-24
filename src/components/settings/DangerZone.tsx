'use client';

import { useState, useTransition } from 'react';
import { fullResetAction, resetVaultAction } from '@/app/settings/actions';
import { Confirm } from '@/components/Confirm';
import {
  Banner,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardRow,
  Code,
  Spacer,
  Stack,
  Text,
} from '@/components/ui';

type Which = 'vault' | 'everything';

const CONFIRM: Record<Which, { title: string; body: string; action: string }> = {
  vault: {
    title: 'Empty the vault?',
    body: 'Every note, task, hour, plan and project is deleted from the folder — and so are its Git history and its snapshots, because both live inside it. There is no commit and no snapshot to go back to. Your keys and your theme stay.',
    action: 'Empty the vault',
  },
  everything: {
    title: 'Reset Meridian completely?',
    body: 'The vault and .env both go: every note, the Git history behind them, the vault path and every API key. Nothing is removed from BambooHR, the calendar or GitHub — this app has never been able to write to them.',
    action: 'Reset everything',
  },
};

/**
 * The only two things in Meridian that a snapshot cannot undo, which is why they
 * are the only two that say so in the confirmation rather than mentioning
 * `vault:restore`.
 *
 * The result stays on screen instead of fading: what it reports is that
 * somebody's notes are gone, and a message that leaves by itself after three
 * seconds is the wrong shape for that.
 */
export function DangerZone({ vaultPath, envPath }: { vaultPath: string; envPath: string }) {
  const [asking, setAsking] = useState<Which | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (which: Which) =>
    startTransition(async () => {
      const outcome = which === 'vault' ? await resetVaultAction() : await fullResetAction();
      setAsking(null);
      setResult(outcome);
    });

  return (
    <>
      {result ? <Banner tone={result.ok ? 'success' : 'danger'}>{result.message}</Banner> : null}

      <Card>
        <CardHeader
          title="Reset"
          end={
            <Text level="small" tone="muted">
              no undo
            </Text>
          }
        />
        <CardBody>
          <Text level="small" tone="muted">
            Both of these empty <Code>{vaultPath}</Code> — the notes, the Git history and the
            snapshots together, since all three live in that one folder. Nothing here reaches
            BambooHR, Google or GitHub.
          </Text>
        </CardBody>

        <CardRow>
          <Stack gap={1}>
            <Text level="bodyStrong">Empty the vault</Text>
            <Text level="small" tone="muted">
              Notes, tasks, hours, plans and projects. Your keys and your theme stay.
            </Text>
          </Stack>
          <Spacer />
          <Button variant="neutral" onClick={() => setAsking('vault')} disabled={pending}>
            Reset vault
          </Button>
        </CardRow>

        <CardRow>
          <Stack gap={1}>
            <Text level="bodyStrong">Full reset</Text>
            <Text level="small" tone="muted">
              The vault and <Code>{envPath}</Code> — Meridian reopens at the setup wizard, as
              freshly installed.
            </Text>
          </Stack>
          <Spacer />
          <Button variant="danger" onClick={() => setAsking('everything')} disabled={pending}>
            Full reset
          </Button>
        </CardRow>
      </Card>

      <Confirm
        open={asking !== null}
        title={asking ? CONFIRM[asking].title : ''}
        body={asking ? CONFIRM[asking].body : ''}
        action={asking ? CONFIRM[asking].action : ''}
        pending={pending}
        onCancel={() => setAsking(null)}
        onConfirm={() => asking && run(asking)}
      />
    </>
  );
}
