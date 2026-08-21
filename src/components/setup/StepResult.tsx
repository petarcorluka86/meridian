'use client';

import type { Check } from '@/app/setup/actions';
import { Banner } from '@/components/ui';

/** The one line every step shows after it has checked something. */
export function Result({ result }: { result: Check | null }) {
  if (!result) return null;
  if (result.ok) return <Banner tone="success" description={result.detail} />;
  return <Banner tone="danger" title={result.problem} description={result.hint} />;
}
