'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { type SyncTarget, syncSourceAction } from '@/app/actions';
import { setupStateAction } from '@/app/setup/actions';
import { BrandMark } from '@/components/NavIcons';
import { Meter, Page, Pill, Row, Spacer, Stack, Text } from '@/components/ui';
import styles from './Setup.module.css';

type Source = { key: 'bamboo' | 'calendar' | 'github'; name: string; targets: SyncTarget[] };

const ALL: Source[] = [
  {
    key: 'bamboo',
    // Three requests, one source. Somebody watching this screen is waiting for
    // "my team is in", not for a list of endpoints.
    name: 'BambooHR',
    targets: ['roster', 'inbox', 'compensation'],
  },
  { key: 'calendar', name: 'Google Calendar', targets: ['calendar'] },
  { key: 'github', name: 'GitHub', targets: ['github'] },
];

type State = 'waiting' | 'fetching' | 'done' | 'failed';

const SAID: Record<State, { label: string; tone: 'neutral' | 'info' | 'success' | 'danger' }> = {
  waiting: { label: 'queued', tone: 'neutral' },
  fetching: { label: 'fetching', tone: 'info' },
  done: { label: 'in', tone: 'success' },
  failed: { label: 'failed', tone: 'danger' },
};

export type Settled = { attempted: number; failures: string[] };

/**
 * The screen between the wizard and the app, and the only one in Meridian that
 * is a wait.
 *
 * It takes the whole window on purpose: nothing else is worth doing while this
 * runs, and the wizard's own chrome behind it — a stepper of finished steps, a
 * card, a banner about where credentials go — would be furniture around a
 * progress bar. What is left is the mark, one sentence, and the sources going in
 * one at a time.
 *
 * The bar is a `Meter` rather than a spinner, which is the rule this app already
 * holds elsewhere: there is a denominator here — the sources that are actually
 * connected — so the wait can be shown as a proportion instead of as motion that
 * means nothing.
 *
 * One source at a time rather than all at once: these credentials are being used
 * for the first time, and a failure should name itself rather than arrive in a
 * pile of three. A clean run goes straight into the app; anything else stops
 * here and hands back what went wrong, because a wait that ends in silence is
 * worse than one that ends in a sentence.
 */
export function SettingUp({ onStop }: { onStop: (settled: Settled) => void }) {
  const router = useRouter();
  const [sources, setSources] = useState<Source[]>([]);
  const [states, setStates] = useState<Record<string, State>>({});
  const started = useRef(false);

  useEffect(() => {
    // No abort on cleanup, deliberately. React's StrictMode mounts effects twice
    // while keeping the instance and its refs, so a cleanup that cancelled the
    // run would leave the ref saying "started" and nothing running.
    if (started.current) return;
    started.current = true;

    void (async () => {
      // Asked rather than passed down: what is connected changed several times
      // on the way to this screen, and the server is the only thing that knows
      // how that ended.
      const state = await setupStateAction();
      const connected = ALL.filter((source) => state[source.key]);
      setSources(connected);
      setStates(Object.fromEntries(connected.map((source) => [source.key, 'waiting' as State])));

      if (connected.length === 0) {
        onStop({ attempted: 0, failures: [] });
        return;
      }

      const failures: string[] = [];

      for (const source of connected) {
        setStates((current) => ({ ...current, [source.key]: 'fetching' }));

        let ok = true;
        for (const target of source.targets) {
          const result = await syncSourceAction(target);
          if (!result.ok) {
            ok = false;
            failures.push(`${source.name} — ${result.message ?? 'it did not answer'}`);
            break;
          }
        }

        setStates((current) => ({ ...current, [source.key]: ok ? 'done' : 'failed' }));
      }

      if (failures.length > 0) {
        onStop({ attempted: connected.length, failures });
        return;
      }

      // Nothing to read, so nothing to stop for.
      router.push('/');
    })();
  }, [onStop, router]);

  const settled = sources.filter(
    (source) => states[source.key] === 'done' || states[source.key] === 'failed',
  ).length;

  return (
    <Page width="narrow">
      <div className={styles.splash}>
        <Stack gap={5} align="center">
          <BrandMark size={60} />

          <Stack gap={2} align="center">
            <Text as="h1" level="title">
              Meridian is setting up&hellip;
            </Text>
            <Text level="body" tone="muted">
              Bringing in your team, your meetings and your reviews, once — so the first screen you
              see already has them on it.
            </Text>
          </Stack>

          <div className={styles.progress}>
            <Stack gap={3}>
              <Meter value={settled} total={Math.max(sources.length, 1)} label="Sources fetched" />
              <Stack gap={2}>
                {sources.map((source) => (
                  <Row key={source.key} gap={3}>
                    <Text
                      level="small"
                      tone={states[source.key] === 'waiting' ? 'faint' : 'default'}
                      nowrap
                    >
                      {source.name}
                    </Text>
                    <Spacer />
                    <Pill tone={SAID[states[source.key] ?? 'waiting'].tone}>
                      {SAID[states[source.key] ?? 'waiting'].label}
                    </Pill>
                  </Row>
                ))}
              </Stack>
            </Stack>
          </div>
        </Stack>
      </div>
    </Page>
  );
}
