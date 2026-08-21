'use client';

import { useState } from 'react';
import { checkCalendarIcalAction, type Check } from '@/app/setup/actions';
import { Field, Text, TextInput } from '@/components/ui';
import { Result } from './StepResult';
import { StepCard } from './StepCard';

export function CalendarStep({
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
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<Check | null>(null);

  const submit = () =>
    run(async () => {
      const res = await checkCalendarIcalAction(url);
      setResult(res);
      if (res.ok) setTimeout(onDone, 700);
    });

  return (
    <StepCard
      title="Connect your calendar"
      meta="optional — shows today's meetings"
      action={pending ? 'Checking…' : 'Check the address'}
      onAction={submit}
      pending={pending}
      onSkip={onSkip}
    >
      <Text level="body">
        The simplest way is a private calendar address, which needs no Google project and no
        sign-in. In Google Calendar: <strong>Settings</strong> → click your calendar →{' '}
        <strong>Integrate calendar</strong> → <strong>Secret address in iCal format</strong>.
      </Text>
      <Field
        label="Secret address"
        hint="Treat this like a password — anyone holding it can read the calendar. Google can reset it from the same page."
      >
        <TextInput
          value={url}
          onChange={setUrl}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit();
          }}
          placeholder="https://calendar.google.com/calendar/ical/…/private-…/basic.ics"
          ariaLabel="Secret iCal address"
        />
      </Field>
      <Result result={result} />
      <Text level="small" tone="muted">
        Some workplaces switch secret addresses off. If yours has, skip this — Meridian also
        supports Google sign-in, which is set up from Help afterwards.
      </Text>
    </StepCard>
  );
}
