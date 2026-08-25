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

/**
 * The confirmation names what is actually there rather than what could be —
 * "13 people and 6 notes" is a different decision from "nothing yet", and the
 * app knows which one this is. `safetyNet` is the line that matters most: it
 * says whether a copy of this exists anywhere else.
 */
function confirmations(contents: string, safetyNet: string) {
  return {
    vault: {
      title: 'Empty the vault?',
      body: `${contents} — deleted from the folder, along with its Git history and its snapshots, because both live inside it. ${safetyNet} Your keys and your theme stay.`,
      action: 'Empty the vault',
    },
    everything: {
      title: 'Reset Meridian completely?',
      body: `${contents}, the Git history behind it, the vault path and every API key. ${safetyNet} Nothing is removed from BambooHR, the calendar or GitHub — this app has never been able to write to them.`,
      action: 'Reset everything',
    },
  } satisfies Record<Which, { title: string; body: string; action: string }>;
}

/**
 * The only two things in Meridian that a snapshot cannot undo, which is why they
 * are the only two that say so in the confirmation rather than mentioning
 * `vault:restore`.
 *
 * The result stays on screen instead of fading: what it reports is that
 * somebody's notes are gone, and a message that leaves by itself after three
 * seconds is the wrong shape for that.
 */
export function DangerZone({
  vaultPath,
  envPath,
  contents,
  safetyNet,
}: {
  vaultPath: string;
  envPath: string;
  /** What the vault actually holds right now, already counted and worded. */
  contents: string;
  /** Whether a copy of it exists anywhere else. */
  safetyNet: string;
}) {
  const CONFIRM = confirmations(contents, safetyNet);
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
          <Stack gap={2}>
            <Text level="small" tone="muted">
              Both of these empty <Code>{vaultPath}</Code> — the notes, the Git history and the
              snapshots together, since all three live in that one folder. Nothing here reaches
              BambooHR, Google or GitHub.
            </Text>
            <Text level="small" tone="muted">
              It holds {contents}. {safetyNet}
            </Text>
          </Stack>
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
