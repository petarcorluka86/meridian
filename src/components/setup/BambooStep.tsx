'use client';

import { useState } from 'react';
import { checkBambooAction, saveBambooAction, type BambooCheck } from '@/app/setup/actions';
import { Card, CardRowButton, Code, Field, Spacer, Stack, Text, TextInput } from '@/components/ui';
import { Result } from './StepResult';
import { StepCard } from './StepCard';

export function BambooStep({
  pending,
  run,
  onDone,
  onSkip,
}: {
  pending: boolean;
  run: (fn: () => void) => void;
  onDone: () => void;
  onSkip: () => void;
}) {
  const [subdomain, setSubdomain] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<BambooCheck | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);

  const check = () =>
    run(async () => {
      const res = await checkBambooAction(subdomain, apiKey, search);
      setResult(res);
      setChosen(res.ok && res.candidates?.length === 1 ? (res.candidates[0]?.id ?? null) : null);
    });

  const save = () =>
    run(async () => {
      if (!chosen) return;
      const res = await saveBambooAction(subdomain, apiKey, chosen);
      setResult(res);
      if (res.ok) setTimeout(onDone, 700);
    });

  const picking = Boolean(result?.ok && result.candidates?.length);

  return (
    <StepCard
      title="Connect BambooHR"
      meta="optional — brings in your team"
      action={
        picking
          ? pending
            ? 'Saving…'
            : 'That is me — connect'
          : pending
            ? 'Checking…'
            : 'Check the key'
      }
      onAction={picking ? save : check}
      pending={pending}
      onSkip={onSkip}
    >
      <Text level="body">
        This fills in who reports to you, their roles, hire dates, absences and pay history. Read
        only: Meridian can never write anything back to BambooHR.
      </Text>
      <Field
        label="Company"
        hint={
          <>
            The part before <Code>.bamboohr.com</Code>. Pasting the whole address works too.
          </>
        }
      >
        <TextInput
          value={subdomain}
          onChange={setSubdomain}
          placeholder="yourcompany"
          ariaLabel="BambooHR company"
        />
      </Field>
      <Field
        label="API key"
        hint="In BambooHR: your avatar → API Keys → Add New Key. The key only ever sees what you can see."
      >
        <TextInput
          password
          value={apiKey}
          onChange={setApiKey}
          placeholder="••••••••••••••••"
          ariaLabel="BambooHR API key"
        />
      </Field>
      <Field label="Your surname">
        <TextInput
          value={search}
          onChange={setSearch}
          onKeyDown={(event) => {
            if (event.key === 'Enter') check();
          }}
          placeholder="so we can find you in the directory"
          ariaLabel="Your surname"
        />
      </Field>

      <Result result={result} />

      {result?.ok && result.candidates?.length ? (
        <Stack gap={3}>
          <Text level="body">Which of these is you? The number of reports should look right.</Text>
          <Card>
            {result.candidates.map((candidate) => (
              <CardRowButton
                key={candidate.id}
                selected={candidate.id === chosen}
                onClick={() => setChosen(candidate.id)}
              >
                <Text level="small" tone="strong">
                  {candidate.name}
                </Text>
                <Spacer />
                <Text level="mono" tone="muted">
                  {candidate.reports} {candidate.reports === 1 ? 'report' : 'reports'}
                </Text>
              </CardRowButton>
            ))}
          </Card>
        </Stack>
      ) : null}
    </StepCard>
  );
}
