'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { syncBambooAction } from '@/app/people/actions';
import { Button, RefreshIcon, Text } from '@/components/ui';

export function SyncButton({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const sync = () =>
    startTransition(async () => {
      const result = await syncBambooAction();
      setFailed(!result.ok);
      setMessage(result.message ?? null);
      if (result.ok) router.refresh();
    });

  return (
    <>
      <Button
        variant="primary"
        onClick={sync}
        disabled={!configured}
        pending={pending}
        icon={<RefreshIcon />}
      >
        {pending ? 'Syncing…' : 'Sync with BambooHR'}
      </Button>
      {message ? (
        <Text level="small" tone={failed ? 'danger' : 'success'}>
          {message}
        </Text>
      ) : null}
    </>
  );
}
