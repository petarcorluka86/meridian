'use client';

import { useOptimistic, useTransition } from 'react';
import { setThemeAction } from '@/app/settings/actions';
import { Segment, Segmented } from '@/components/ui';
import type { Theme } from '@/lib/env';

const CHOICES: Array<{ value: Theme; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/**
 * Three states, one of which is "do not have an opinion".
 *
 * The scheme itself is applied by the server: the action writes .env and
 * revalidates the layout, which re-renders `data-theme` on the document. The
 * optimistic value exists only so the pressed segment lights on the press
 * rather than after the round trip — the writing down is still the server's.
 */
export function ThemeChoice({ value }: { value: Theme }) {
  const [pending, startTransition] = useTransition();
  const [shown, showChosen] = useOptimistic(value);

  return (
    <Segmented label="Theme">
      {CHOICES.map((choice) => (
        <Segment
          key={choice.value}
          selected={shown === choice.value}
          onClick={() => {
            if (pending || shown === choice.value) return;
            startTransition(async () => {
              showChosen(choice.value);
              await setThemeAction(choice.value);
            });
          }}
        >
          {choice.label}
        </Segment>
      ))}
    </Segmented>
  );
}
