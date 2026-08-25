'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BrandMark } from '@/components/NavIcons';
import {
  Banner,
  ButtonLink,
  Code,
  Page,
  PrevIcon,
  Row,
  Stack,
  type Step,
  Stepper,
  Text,
} from '@/components/ui';
import { BambooStep } from './BambooStep';
import { CalendarStep } from './CalendarStep';
import { DoneStep } from './DoneStep';
import { GithubStep } from './GithubStep';
import { VaultStep } from './VaultStep';

type StepId = 'vault' | 'bamboo' | 'calendar' | 'github' | 'done';

/** The three a Settings row can send you back into, one at a time. */
export type Only = 'bamboo' | 'calendar' | 'github';

/** The numbers are the stepper's, drawn in its discs, so the labels are words. */
const STEPS: Array<{ id: StepId; label: string }> = [
  { id: 'vault', label: 'Your folder' },
  { id: 'bamboo', label: 'BambooHR' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'github', label: 'GitHub' },
  { id: 'done', label: 'Done' },
];

export type WizardState = {
  vault: string | null;
  bamboo: boolean;
  calendar: boolean;
  github: boolean;
};

/**
 * The first run, and every connection made after it.
 *
 * `only` is what makes the second case possible: Settings links to
 * `/setup?only=github` and gets exactly the step it asked for — the same
 * component, the same checks, the same copy — with the progress pills gone and
 * the way back named. One connection screen, reached from two places, rather
 * than a wizard and a second thing that drifts from it.
 */
export function Wizard({ initial, only }: { initial: WizardState; only?: Only }) {
  const router = useRouter();
  const [step, setStep] = useState<StepId>(only ?? (initial.vault ? 'bamboo' : 'vault'));
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
    router.refresh();
    // One connection, reached from Settings, goes back to Settings when it is
    // made. Nothing else here is the next thing that person wanted to do.
    if (only) router.push('/settings');
    else setStep(to);
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
            {only ? 'Connect it' : "Let's set Meridian up"}
          </Text>
          <Text level="body" tone="muted">
            {only
              ? 'One connection, checked before it is saved. Everything you type stays on this machine.'
              : 'Four steps, and only the first is required. Everything you type here is checked before it is saved, and stays on this machine.'}
          </Text>
          {only ? (
            <Row>
              <ButtonLink href="/settings" variant="ghost" size="sm" icon={<PrevIcon />}>
                Back to Settings
              </ButtonLink>
            </Row>
          ) : null}
        </Stack>

        {only ? null : (
          <Stepper
            label="Setting Meridian up"
            steps={STEPS.map<Step>((s) => ({
              label: s.label,
              // Current wins over done: coming back to a step you have already
              // finished should show you standing on it, not behind it.
              state: s.id === step ? 'current' : done.has(s.id) ? 'done' : 'upcoming',
            }))}
          />
        )}

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
            onSkip={only ? undefined : () => advance('bamboo', 'calendar')}
          />
        ) : null}
        {step === 'calendar' ? (
          <CalendarStep
            pending={pending}
            run={startTransition}
            onDone={() => advance('calendar', 'github')}
            onSkip={only ? undefined : () => advance('calendar', 'github')}
          />
        ) : null}
        {step === 'github' ? (
          <GithubStep
            pending={pending}
            run={startTransition}
            onDone={() => advance('github', 'done')}
            onSkip={only ? undefined : () => advance('github', 'done')}
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
