'use client';

import { useState } from 'react';
import { EMPTY } from '@/copy/empty';
import { HomeIcon, OutIcon } from '@/components/overview/OverviewIcons';
import type { Freshness } from '@/lib/sources/cache';
import {
  Avatar,
  Card,
  CardHeader,
  CardRow,
  type Day,
  DayStepper,
  EmptyState,
  Row,
  Stack,
  SyncBadge,
  Text,
  TextLink,
} from '@/components/ui';

/**
 * Who is not at their desk on a given day. Two cards of the same shape — the only
 * difference is that being out has a reason and a date to come back, and working
 * from home does not.
 *
 * Presence arrives with the BambooHR inbox rather than the roster: both are on
 * the five-minute clock, and both answer "what is happening now". So both cards
 * carry the inbox's sync badge, and pressing either refreshes the same fetch.
 *
 * BambooHR is only asked for time off from today onwards. Leave that is still
 * running is therefore known for a past day, and leave that had already ended is
 * not — so an empty card on a past day would read as "nobody was away" when what
 * is true is "nothing that ended is here". It says the second thing.
 */
export type PresenceRow = {
  slug: string;
  name: string;
  type: string;
  /** Inclusive. Both are ISO days, so a day is matched by string comparison. */
  start: string;
  end: string;
  /** Back the day after the leave ends, worded as a date on the server. */
  backLabel: string;
  photo: string | null;
};

type Props = {
  rows: PresenceRow[];
  days: Day[];
  todayIndex: number;
  connected: boolean;
  freshness: Freshness;
};

function Presence({
  title,
  icon,
  rows,
  days,
  todayIndex,
  connected,
  freshness,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  rows: PresenceRow[];
  days: Day[];
  todayIndex: number;
  connected: boolean;
  freshness: Freshness;
  children: (onDay: PresenceRow[]) => React.ReactNode;
}) {
  const [index, setIndex] = useState(todayIndex);
  const day = days[index]?.iso ?? '';
  const onDay = rows.filter((row) => row.start <= day && row.end >= day);
  const beforeToday = index < todayIndex;

  return (
    <Card>
      <CardHeader
        bare={onDay.length === 0}
        title={
          <Row gap={3}>
            {icon}
            <Text level="subheading">{title}</Text>
          </Row>
        }
        count={onDay.length || undefined}
        end={
          <>
            <DayStepper days={days} index={index} onChange={setIndex} label={`Day for ${title}`} />
            <SyncBadge source="BambooHR" target="inbox" freshness={freshness} />
          </>
        }
      />
      {children(onDay)}
      {onDay.length === 0 ? (
        <EmptyState>
          {!connected
            ? 'BambooHR is not connected.'
            : beforeToday
              ? 'Meridian only asks BambooHR for time off from today onwards, so it cannot say who was away before that.'
              : EMPTY.overview.presence}
        </EmptyState>
      ) : null}
    </Card>
  );
}

export function WorkingFromHomeCard(props: Props) {
  return (
    <Presence title="Working from home" icon={<HomeIcon />} {...props}>
      {(onDay) =>
        onDay.map((row) => (
          <CardRow key={row.slug}>
            <TextLink href={`/people/${row.slug}`}>
              <Avatar name={row.name} photo={row.photo} />
              <Text level="label" tone="inherit">
                {row.name}
              </Text>
            </TextLink>
          </CardRow>
        ))
      }
    </Presence>
  );
}

export function OutCard(props: Props) {
  return (
    <Presence title="Out" icon={<OutIcon />} {...props}>
      {(onDay) =>
        onDay.map((row) => (
          <CardRow key={row.slug}>
            <TextLink href={`/people/${row.slug}`}>
              <Avatar name={row.name} photo={row.photo} />
              {/* No gap: the name and why they are away are one thought, and the
                  leading of the two lines is already the space between them. */}
              <Stack gap={0}>
                <Text level="label" tone="inherit">
                  {row.name}
                </Text>
                <Text level="small" tone="info">
                  {row.type} · back {row.backLabel}
                </Text>
              </Stack>
            </TextLink>
          </CardRow>
        ))
      }
    </Presence>
  );
}
