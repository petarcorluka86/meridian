'use client';

import { useRouter } from 'next/navigation';
import { ChipLink, DateInput, Row, Text } from '@/components/ui';

type Props = { active: boolean; from: string; to: string };

/**
 * The range lives in the URL like every other filter, so a narrowed log survives a
 * reload and can be linked to.
 */
export function CustomRange({ active, from, to }: Props) {
  const router = useRouter();

  const go = (next: { from?: string; to?: string }) => {
    const params = new URLSearchParams({ range: 'custom' });
    const nextFrom = next.from ?? from;
    const nextTo = next.to ?? to;
    if (nextFrom) params.set('from', nextFrom);
    if (nextTo) params.set('to', nextTo);
    router.push(`/timebalance?${params}`, { scroll: false });
  };

  return (
    <>
      {/* A link like the other three chips — controls that look identical should
          behave identically, and a range belongs in the URL either way. */}
      <ChipLink href="/timebalance?range=custom" selected={active}>
        Custom range
      </ChipLink>
      {active ? (
        <Row gap={2}>
          <DateInput value={from} onChange={(value) => go({ from: value })} ariaLabel="From" />
          <Text level="small" tone="muted">
            to
          </Text>
          <DateInput value={to} onChange={(value) => go({ to: value })} ariaLabel="To" />
        </Row>
      ) : null}
    </>
  );
}
