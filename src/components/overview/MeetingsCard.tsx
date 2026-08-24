'use client';

import { useState } from 'react';
import { EMPTY_GLYPH } from '@/components/EmptyGlyphs';
import { CalIcon, OVERVIEW_GLYPH } from '@/components/overview/OverviewIcons';
import { EMPTY } from '@/copy/empty';
import type { Freshness } from '@/lib/sources/cache';
import {
  ButtonLink,
  Card,
  CardHeader,
  CardRow,
  type Day,
  DayStepper,
  EmptyState,
  JoinIcon,
  Pill,
  Row,
  SkeletonRows,
  Spacer,
  Stack,
  SyncBadge,
  Text,
} from '@/components/ui';
import styles from '@/components/overview/Overview.module.css';

/**
 * One day of meetings, and only what happens at a time — an all-day entry is a
 * status rather than something you attend, and the page filters those out.
 *
 * Every label is computed on the server: the clock, the duration and the day it
 * belongs to. Working them out here would put the visitor's timezone in charge
 * of what time a meeting is.
 */
export type MeetingView = {
  uid: string;
  /** The day it falls on, as the stepper names days. */
  day: string;
  /** When it starts, "09:30". How long it runs is `duration`; the end is the
      two of them added up, which is not worth a third number. */
  clock: string;
  /** "30 min" */
  duration: string;
  summary: string;
  conference: string | null;
  /** Where it sits relative to now. Resolved on the server, like the clock. */
  state: 'past' | 'now' | 'upcoming';
};

export function MeetingsCard({
  meetings,
  days,
  todayIndex,
  connected,
  freshness,
}: {
  meetings: MeetingView[];
  days: Day[];
  todayIndex: number;
  connected: boolean;
  freshness: Freshness;
}) {
  const [index, setIndex] = useState(todayIndex);
  const day = days[index];
  const shown = meetings.filter((meeting) => meeting.day === day?.iso);

  return (
    <Card>
      <CardHeader
        title={
          <Row gap={3}>
            <CalIcon />
            <Text level="subheading">Meetings</Text>
          </Row>
        }
        count={shown.length || undefined}
        bare={shown.length === 0 && !connected}
        end={
          <>
            <DayStepper days={days} index={index} onChange={setIndex} label="Day of meetings" />
            {connected ? (
              <SyncBadge source="Calendar" target="calendar" freshness={freshness} />
            ) : null}
          </>
        }
      />
      {shown.map((meeting) => {
        // The time is what you scan this card for — "what is next, and have I
        // got twenty minutes" — so it carries the weight and the name stays
        // plain. A meeting that is over is still worth seeing, but it is not
        // what the eye should land on: it steps back a tone, its name is struck
        // through, and its Join stops being the loud one.
        const past = meeting.state === 'past';
        return (
          <CardRow key={meeting.uid}>
            <span className={styles.clock}>
              <Stack gap={0}>
                <Text level="bodyStrong" tone={past ? 'faint' : 'strong'} numeric>
                  {meeting.clock}
                </Text>
                <Text level="mono" tone="faint">
                  {meeting.duration}
                </Text>
              </Stack>
            </span>
            <Text level="body" tone={past ? 'faint' : 'strong'} strike={past}>
              {meeting.summary}
            </Text>
            {meeting.state === 'now' ? <Pill tone="accent">Now</Pill> : null}
            <Spacer />
            {meeting.conference ? (
              // Join is a video call before it is a link out, so the verb replaces
              // the external arrow rather than sitting beside it.
              <ButtonLink
                external
                variant={past ? 'neutral' : 'primary'}
                size="sm"
                href={meeting.conference}
                icon={<JoinIcon />}
              >
                Join
              </ButtonLink>
            ) : null}
          </CardRow>
        );
      })}
      {shown.length === 0 ? (
        connected && freshness.state === 'missing' ? (
          // Never answered yet: a skeleton, not "no meetings", which would be a
          // lie about the day.
          <SkeletonRows rows={2} />
        ) : connected ? (
          <EmptyState
            glyph={OVERVIEW_GLYPH.cal}
            {...(index === todayIndex ? EMPTY.overview.meetings : EMPTY.overview.meetingsOtherDay)}
          />
        ) : (
          <EmptyState glyph={EMPTY_GLYPH.plug} {...EMPTY.sources.calendar} />
        )
      ) : null}
    </Card>
  );
}
