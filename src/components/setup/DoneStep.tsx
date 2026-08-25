'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { type SyncTarget, syncSourceAction } from '@/app/actions';
import { setupStateAction } from '@/app/setup/actions';
import {
  Banner,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardRow,
  CheckIcon,
  GoIcon,
  GuideIcon,
  Pill,
  Spacer,
  Stack,
  Text,
} from '@/components/ui';

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

/**
 * The last screen of the wizard, which is a wait rather than a full stop.
 *
 * Everything configured is fetched here, once, before the app opens — so the
 * first Overview somebody sees has their team, their meetings and their reviews
 * on it rather than three empty cards filling in one at a time. Sources go one
 * after another rather than at once: this is the first time these credentials
 * have been used, and a failure should name itself rather than arrive in a pile
 * of three.
 *
 * A failure does not trap anybody here. It is said plainly, the wait ends, and
 * the way into the app stays open — whichever card wanted that source has a
 * badge that tries it again.
 */
export function DoneStep() {
  const router = useRouter();
  const [sources, setSources] = useState<Source[]>([]);
  const [states, setStates] = useState<Record<string, State>>({});
  const [failures, setFailures] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    // Once per mount. React runs effects twice in development, and each of these
    // is a real request to somebody's HR system.
    if (started.current) return;
    // No abort on cleanup, deliberately. React's StrictMode mounts effects
    // twice while keeping the instance and its refs, so a cleanup that cancelled
    // the run would leave the ref saying "started" and nothing running.
    started.current = true;

    void (async () => {
      // Asked rather than passed down: what is connected changed several times
      // on the way to this screen, and the server is the only thing that knows
      // how that ended.
      const state = await setupStateAction();
      const sources = ALL.filter((source) => state[source.key]);
      setSources(sources);
      setStates(Object.fromEntries(sources.map((source) => [source.key, 'waiting' as State])));

      const failed: string[] = [];

      for (const source of sources) {
        setStates((current) => ({ ...current, [source.key]: 'fetching' }));

        let ok = true;
        for (const target of source.targets) {
          const result = await syncSourceAction(target);
          if (!result.ok) {
            ok = false;
            failed.push(`${source.name} — ${result.message ?? 'it did not answer'}`);
            break;
          }
        }

        setStates((current) => ({ ...current, [source.key]: ok ? 'done' : 'failed' }));
      }

      setFailures(failed);
      setFinished(true);
      // Nothing went wrong, so there is nothing on this screen worth reading.
      if (failed.length === 0) router.push('/');
    })();
  }, [router]);

  return (
    <Card>
      <CardHeader
        title={finished ? 'That is everything' : 'Bringing your data in'}
        end={
          sources.length > 0 ? (
            <Text level="small" tone="muted">
              {finished ? 'first fetch done' : 'first fetch, one source at a time'}
            </Text>
          ) : undefined
        }
      />
      <CardBody>
        <Stack gap={3}>
          <Text level="body">
            {sources.length === 0
              ? 'Nothing is connected yet, which is a fine place to start: notes, tasks and hours all work without a single source. Connect one whenever you like, from Settings.'
              : 'Fetching everything once, so the first screen you see already has your team on it. After this, Meridian keeps itself current in the background.'}
          </Text>
          <Text level="body">
            Anything you skipped can be connected later from Settings, which reopens exactly this
            step and shows what is connected right now.
          </Text>
        </Stack>
      </CardBody>

      {sources.map((source) => (
        <CardRow key={source.key}>
          <Text level="bodyStrong">{source.name}</Text>
          <Spacer />
          <Pill tone={SAID[states[source.key] ?? 'waiting'].tone}>
            {SAID[states[source.key] ?? 'waiting'].label}
          </Pill>
        </CardRow>
      ))}

      {failures.length > 0 ? (
        <CardBody>
          <Banner
            tone="warning"
            title="Some of it did not come in."
            description={`${failures.join(' · ')}. Everything else is ready, and each card has a badge that tries its own source again.`}
          />
        </CardBody>
      ) : null}

      <CardFooter>
        {finished ? (
          <ButtonLink href="/" variant="primary" icon={<GoIcon />}>
            Open Meridian
          </ButtonLink>
        ) : (
          <Button variant="primary" pending icon={<CheckIcon />} onClick={() => undefined}>
            Fetching…
          </Button>
        )}
        <ButtonLink href="/help" variant="ghost" icon={<GuideIcon />}>
          Read the guide
        </ButtonLink>
      </CardFooter>
    </Card>
  );
}
