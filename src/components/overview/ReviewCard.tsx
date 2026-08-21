import { PrIcon } from '@/components/overview/OverviewIcons';
import { EMPTY } from '@/copy/empty';
import { openedLabel, type PullRequest } from '@/lib/sources/github';
import type { Freshness } from '@/lib/sources/cache';
import {
  Avatar,
  Banner,
  ButtonLink,
  Card,
  CardHeader,
  CardRow,
  EmptyState,
  SyncBadge,
  Row,
  SkeletonRows,
  Spacer,
  Stack,
  Text,
  type Tone,
} from '@/components/ui';

/**
 * Pull requests waiting on your review. The longer you have blocked one, the
 * louder its age reads — a week is a warning, two is a problem.
 */
export function ReviewCard({
  prs,
  connected,
  freshness,
  photoOf,
  ageTone,
}: {
  prs: PullRequest[];
  connected: boolean;
  freshness: Freshness;
  photoOf: (slug: string | null) => string | null;
  ageTone: (openedAt: string) => Tone;
}) {
  return (
    <Card>
      <CardHeader
        title={
          <Row gap={3}>
            <PrIcon />
            <Text level="subheading">Pull requests waiting on you</Text>
          </Row>
        }
        count={prs.length || undefined}
        end={
          <>
            {connected ? <SyncBadge source="GitHub" target="github" freshness={freshness} /> : null}
            <ButtonLink external size="sm" href="https://github.com/pulls/review-requested">
              Open GitHub
            </ButtonLink>
          </>
        }
      />
      {prs.map((pr) => (
        <CardRow key={pr.id}>
          <Avatar name={pr.author} photo={photoOf(pr.personSlug)} />
          <Stack gap={1}>
            <Text level="label" tone="strong">
              {pr.title}
            </Text>
            <Row gap={2}>
              <Text level="mono" tone="muted">
                {pr.repo}
              </Text>
              <Text level="mono" tone="muted">
                {pr.changedFiles} {pr.changedFiles === 1 ? 'file' : 'files'} · +{pr.additions} / −
                {pr.deletions}
              </Text>
              <Text level="mono" tone={ageTone(pr.openedAt)}>
                {openedLabel(pr.openedAt)}
              </Text>
            </Row>
          </Stack>
          <Spacer />
          <ButtonLink external variant="primary" size="sm" href={pr.url}>
            Review
          </ButtonLink>
        </CardRow>
      ))}
      {prs.length === 0 ? (
        connected && freshness.state === 'missing' ? (
          <SkeletonRows rows={3} avatar />
        ) : connected ? (
          <EmptyState>{EMPTY.overview.review}</EmptyState>
        ) : (
          <Banner
            tone="warning"
            description="GitHub is not connected. Add GITHUB_TOKEN, GITHUB_LOGIN and GITHUB_REPOS to .env and restart."
          />
        )
      ) : null}
    </Card>
  );
}
