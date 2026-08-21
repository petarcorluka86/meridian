'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BrandMark } from '@/components/NavIcons';
import { Banner, Code, Page, Pill, Row, Stack, Text } from '@/components/ui';
import { BambooStep } from './BambooStep';
import { CalendarStep } from './CalendarStep';
import { DoneStep } from './DoneStep';
import { GithubStep } from './GithubStep';
import { VaultStep } from './VaultStep';

type StepId = 'vault' | 'bamboo' | 'calendar' | 'github' | 'done';

const STEPS: Array<{ id: StepId; label: string }> = [
  { id: 'vault', label: '1 · Your folder' },
  { id: 'bamboo', label: '2 · BambooHR' },
  { id: 'calendar', label: '3 · Calendar' },
  { id: 'github', label: '4 · GitHub' },
  { id: 'done', label: 'Done' },
];

export type WizardState = {
  vault: string | null;
  bamboo: boolean;
  calendar: boolean;
  github: boolean;
};

export function Wizard({ initial }: { initial: WizardState }) {
  const router = useRouter();
  const [step, setStep] = useState<StepId>(initial.vault ? 'bamboo' : 'vault');
  const [done, setDone] = useState<Set<StepId>>(
    new Set<StepId>([
      ...(initial.vault ? (['vault'] as StepId[]) : []),
      ...(initial.bamboo ? (['bamboo'] as StepId[]) : []),
      ...(initial.calendar ? (['calendar'] as StepId[]) : []),
      ...(initial.github ? (['github'] as StepId[]) : []),
    ]),
  );
  const [pending, startTransition] = useTransition();

  const advance = (from: StepId, to: StepId) => {
    setDone((d) => new Set(d).add(from));
    setStep(to);
    router.refresh();
  };

  return (
    <Page width="narrow">
      <Stack gap={5}>
        <Stack gap={3}>
          {/* The mark rather than the full logo: below about 120px the MERIDIAN
                wordmark stops being legible and reads as a smudge, which is worse
                than not showing it. Same geometry the sidebar draws. */}
          <BrandMark size={60} />
          <Text as="h1" level="title">
            Let&rsquo;s set Meridian up
          </Text>
          <Text level="body" tone="muted">
            Four steps, and only the first is required. Everything you type here is checked before
            it is saved, and stays on this machine.
          </Text>
        </Stack>

        <Row gap={2}>
          {STEPS.map((s) => (
            <Pill
              key={s.id}
              size="md"
              tone={s.id === step ? 'info' : done.has(s.id) ? 'success' : 'neutral'}
            >
              {done.has(s.id) && s.id !== step ? `✓ ${s.label}` : s.label}
            </Pill>
          ))}
        </Row>

        {step === 'vault' ? (
          <VaultStep
            pending={pending}
            run={startTransition}
            onDone={() => advance('vault', 'bamboo')}
          />
        ) : null}
        {step === 'bamboo' ? (
          <BambooStep
            pending={pending}
            run={startTransition}
            onDone={() => advance('bamboo', 'calendar')}
            onSkip={() => advance('bamboo', 'calendar')}
          />
        ) : null}
        {step === 'calendar' ? (
          <CalendarStep
            pending={pending}
            run={startTransition}
            onDone={() => advance('calendar', 'github')}
            onSkip={() => advance('calendar', 'github')}
          />
        ) : null}
        {step === 'github' ? (
          <GithubStep
            pending={pending}
            run={startTransition}
            onDone={() => advance('github', 'done')}
            onSkip={() => advance('github', 'done')}
          />
        ) : null}
        {step === 'done' ? <DoneStep /> : null}

        <Banner
          tone="warning"
          title="Where this goes."
          description={
            <>
              Anything you type is sent to Meridian running on this machine, and written to{' '}
              <Code>.env</Code> in the app folder with permissions that only let you read it. It is
              never sent anywhere else, never put in the vault, and never shown back to you once
              saved. Meridian only ever reads from BambooHR, Google and GitHub — it cannot write to
              them.
            </>
          }
        />
      </Stack>
    </Page>
  );
}
