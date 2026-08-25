'use client';

import { useState } from 'react';
import { type Check, checkCalendarAction } from '@/app/setup/actions';
import { Code, Field, Text, TextInput, TextLink } from '@/components/ui';
import { Result } from './StepResult';
import { StepCard } from './StepCard';

/**
 * Four values, typed, checked together, and saved only if all four work.
 *
 * The calendar is the one source that is not a single key, and the one whose
 * values come from somewhere else entirely — a Google Cloud project, and
 * whatever the person used to mint a refresh token. So this step does not try to
 * be a sign-in flow: it takes what they already have, proves the four fit
 * together by asking Google what the account can read, and says which calendar
 * it landed on.
 *
 * Nothing is written until the check passes, which is why a wrong value cannot
 * leave the app looking connected.
 */
export function CalendarStep({
  pending,
  run,
  onDone,
  onSkip,
}: {
  pending: boolean;
  run: (fn: () => void) => void;
  onDone: () => void;
  onSkip?: () => void;
}) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [calendarId, setCalendarId] = useState('');
  const [result, setResult] = useState<Check | null>(null);

  const submit = () =>
    run(async () => {
      const outcome = await checkCalendarAction(clientId, clientSecret, refreshToken, calendarId);
      setResult(outcome);
      if (outcome.ok) setTimeout(onDone, 700);
    });

  return (
    <StepCard
      title="Connect your calendar"
      meta="optional — shows today's meetings"
      action={pending ? 'Checking…' : 'Check and save'}
      onAction={submit}
      pending={pending}
      onSkip={onSkip}
    >
      <Text level="body">
        Meridian reads a Google calendar with an OAuth client of your own — running on your Mac, it
        cannot ship one without publishing its secret. Create one in a{' '}
        <TextLink href="https://console.cloud.google.com/apis/credentials" external>
          Google Cloud project
        </TextLink>{' '}
        with the <strong>Google Calendar API</strong> enabled, and mint a refresh token for it with
        the <strong>calendar.readonly</strong> scope — the{' '}
        <TextLink href="https://developers.google.com/oauthplayground" external>
          OAuth Playground
        </TextLink>{' '}
        does that if you tick <strong>Use your own OAuth credentials</strong>.
      </Text>

      <Field label="Client ID">
        <TextInput
          value={clientId}
          onChange={setClientId}
          placeholder="000000000000-xxxxxxxx.apps.googleusercontent.com"
          ariaLabel="Google OAuth client ID"
        />
      </Field>
      <Field label="Client secret">
        <TextInput
          value={clientSecret}
          onChange={setClientSecret}
          placeholder="GOCSPX-…"
          ariaLabel="Google OAuth client secret"
        />
      </Field>
      <Field
        label="Refresh token"
        hint="The long-lived one. Meridian exchanges it for a short-lived access token when it reads, and never stores that."
      >
        <TextInput
          value={refreshToken}
          onChange={setRefreshToken}
          placeholder="1//0e…"
          ariaLabel="Google refresh token"
        />
      </Field>
      <Field
        label="Calendar ID"
        hint="Usually your work address. In Google Calendar: Settings → the calendar → Integrate calendar."
      >
        <TextInput
          value={calendarId}
          onChange={setCalendarId}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit();
          }}
          placeholder="you@yourcompany.com"
          ariaLabel="Calendar ID"
        />
      </Field>

      <Result result={result} />
      <Text level="small" tone="muted">
        Checked before anything is written: Meridian asks Google which calendars that token can
        read, and saves all four only if yours is among them. They go to <Code>.env</Code> at mode
        600 and are never shown back to you. The scope is read-only, and the one non-GET this app
        makes is the exchange that turns your refresh token into a short-lived access token.
      </Text>
    </StepCard>
  );
}
