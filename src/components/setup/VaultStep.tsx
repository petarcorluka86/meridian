'use client';

import { useState } from 'react';
import { checkVaultAction, type Check } from '@/app/setup/actions';
import { Field, Text, TextInput } from '@/components/ui';
import { Result } from './StepResult';
import { StepCard } from './StepCard';

export function VaultStep({
  pending,
  run,
  onDone,
}: {
  pending: boolean;
  run: (fn: () => void) => void;
  onDone: () => void;
}) {
  const [value, setValue] = useState('~/meridian/vault');
  const [result, setResult] = useState<Check | null>(null);

  const submit = () =>
    run(async () => {
      const res = await checkVaultAction(value);
      setResult(res);
      if (res.ok) setTimeout(onDone, 700);
    });

  return (
    <StepCard
      title="Where should your notes live?"
      meta="required"
      action={pending ? 'Checking…' : 'Use this folder'}
      onAction={submit}
      pending={pending}
    >
      <Text level="body">
        Meridian keeps everything in one folder of ordinary files — Markdown notes and JSON records
        you can open in any editor. Pick somewhere permanent. If the folder does not exist yet, it
        will be created.
      </Text>
      <Field
        label="Folder"
        hint="Keep it out of Dropbox or iCloud — two machines writing the same files will fight."
      >
        <TextInput
          value={value}
          onChange={setValue}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit();
          }}
          ariaLabel="Vault folder"
        />
      </Field>
      <Result result={result} />
    </StepCard>
  );
}
