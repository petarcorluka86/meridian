import { InboxIcon } from '@/components/overview/OverviewIcons';
import { EMPTY } from '@/copy/empty';
import type { Freshness } from '@/lib/sources/cache';
import {
  Avatar,
  Card,
  CardFooter,
  CardHeader,
  CardRow,
  ButtonLink,
  EmptyState,
  SyncBadge,
  Row,
  SkeletonRows,
  Spacer,
  Pill,
  Text,
} from '@/components/ui';

/**
 * What BambooHR is waiting on you for. Time-off requests only — the API exposes
 * nothing else of the inbox, and the card says so rather than pretending to be
 * the whole of it.
 */
type InboxRow = { kind: string; title: string; name: string; photo: string | null };

export function InboxCard({
  inbox,
  subdomain,
  freshness,
}: {
  inbox: InboxRow[];
  subdomain: string | null;
  freshness: Freshness;
}) {
  return (
    <Card>
      <CardHeader
        title={
          <Row gap={3}>
            <InboxIcon />
            <Text level="subheading">BambooHR inbox</Text>
          </Row>
        }
        end={
          <>
            <SyncBadge source="BambooHR" target="inbox" freshness={freshness} />
            {subdomain ? (
              <ButtonLink external size="sm" href={`https://${subdomain}.bamboohr.com/inbox`}>
                Open BambooHR
              </ButtonLink>
            ) : null}
          </>
        }
      />
      {inbox.map((row) => (
        <CardRow key={`${row.kind}-${row.title}`}>
          <Avatar name={row.name} photo={row.photo} />
          <Text level="body" tone="strong">
            {row.title}
          </Text>
          <Spacer />
          <Pill tone="warning">{row.kind}</Pill>
        </CardRow>
      ))}
      {inbox.length === 0 ? (
        subdomain && freshness.state === 'missing' ? (
          <SkeletonRows rows={2} avatar />
        ) : (
          <EmptyState>{subdomain ? EMPTY.overview.inbox : 'BambooHR is not connected.'}</EmptyState>
        )
      ) : null}
      {subdomain ? (
        <CardFooter>
          <Text level="small" tone="muted">
            Covers time-off requests only — BambooHR&rsquo;s API does not expose documents awaiting
            signature or onboarding tasks. Check BambooHR itself for those.
          </Text>
        </CardFooter>
      ) : null}
    </Card>
  );
}
