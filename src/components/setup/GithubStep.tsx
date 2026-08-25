'use client';

import { useState } from 'react';
import { checkGithubAction, type Check } from '@/app/setup/actions';
import { Field, Text, TextInput } from '@/components/ui';
import { Result } from './StepResult';
import { StepCard } from './StepCard';

export function GithubStep({
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
  const [token, setToken] = useState('');
  const [login, setLogin] = useState('');
  const [repos, setRepos] = useState('');
  const [result, setResult] = useState<Check | null>(null);

  const submit = () =>
    run(async () => {
      const res = await checkGithubAction(token, login, repos);
      setResult(res);
      if (res.ok) setTimeout(onDone, 900);
    });

  return (
    <StepCard
      title="Connect GitHub"
      meta="optional — reviews you are blocking"
      action={pending ? 'Checking…' : 'Check and connect'}
      onAction={submit}
      pending={pending}
      onSkip={onSkip}
    >
      <Text level="body">
        Shows pull requests waiting on your review, oldest first. In GitHub:{' '}
        <strong>Settings → Developer settings → Personal access tokens → Fine-grained</strong>,
        scoped to the repositories below, with <strong>Pull requests: read-only</strong> and nothing
        else.
      </Text>
      <Field label="Token">
        <TextInput
          password
          value={token}
          onChange={setToken}
          placeholder="github_pat_…"
          ariaLabel="GitHub token"
        />
      </Field>
      <Field label="Your GitHub handle">
        <TextInput
          value={login}
          onChange={setLogin}
          placeholder="your-handle"
          ariaLabel="GitHub handle"
        />
      </Field>
      <Field label="Repositories" hint="Comma separated. Any that cannot be reached are left out.">
        <TextInput
          value={repos}
          onChange={setRepos}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit();
          }}
          placeholder="owner/repo, owner/another"
          ariaLabel="Repositories"
        />
      </Field>
      <Result result={result} />
    </StepCard>
  );
}
