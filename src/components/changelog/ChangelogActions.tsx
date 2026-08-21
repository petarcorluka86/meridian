'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { commitAction, pushAction, type ActionResult } from '@/app/changelog/actions';
import type { Upstream } from '@/lib/git';
import { Confirm } from '@/components/Confirm';
import { Banner, Button, CommitIcon, PushIcon, TextInput } from '@/components/ui';
import styles from './Changelog.module.css';

type Props = {
  canCommit: boolean;
  canPush: boolean;
  neverPushed: boolean;
  /** Where a push would go, read from git. Null when nothing is tracking. */
  upstream: Upstream | null;
};

export function ChangelogActions({ canCommit, canPush, neverPushed, upstream }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<ActionResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const commit = () => {
    if (!canCommit || pending) return;
    const form = new FormData();
    form.set('message', message);
    startTransition(async () => {
      const res = await commitAction(null, form);
      setResult(res);
      if (res.ok) setMessage('');
      router.refresh();
    });
  };

  const doPush = () => {
    setConfirming(false);
    startTransition(async () => {
      setResult(await pushAction());
      router.refresh();
    });
  };

  return (
    <>
      <span className={styles.message}>
        <TextInput
          value={message}
          onChange={setMessage}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit();
          }}
          placeholder="Commit message (optional)"
          ariaLabel="Commit message"
        />
      </span>
      <Button
        variant="primary"
        onClick={commit}
        disabled={!canCommit}
        pending={pending}
        icon={<CommitIcon />}
      >
        Commit
      </Button>
      {/* Push is neutral, not primary: Commit is the action of this screen, and
          a second filled button would make the irreversible one look routine. */}
      <Button
        onClick={() => setConfirming(true)}
        disabled={!canPush}
        pending={pending}
        icon={<PushIcon />}
      >
        Push
      </Button>

      {result ? (
        <Banner tone={result.ok ? 'success' : 'danger'} description={result.message} />
      ) : null}

      {/* Everything about the destination comes from git. It used to say "GitHub"
          and "origin/main" whatever the remote was, on the one operation that
          cannot be taken back. */}
      <Confirm
        open={confirming}
        title={upstream ? `Push to ${upstream.remote}/${upstream.branch}?` : 'Push?'}
        body={
          neverPushed
            ? `This is the first push. The vault contains private notes, evaluations and pay-rise plans — all of it will exist on ${upstream?.url ?? 'the remote'} from now on.`
            : `The vault contains private notes and pay-rise plans. Pushing sends them to ${upstream?.url ?? 'the remote'}.`
        }
        action={upstream ? `Push to ${upstream.remote}` : 'Push'}
        pending={pending}
        onCancel={() => setConfirming(false)}
        onConfirm={doPush}
      />
    </>
  );
}
