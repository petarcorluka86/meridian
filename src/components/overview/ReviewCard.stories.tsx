import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Doc, Note, Section } from '@/stories/Showcase';
import type { PullRequest } from '@/lib/sources/github';
import { ReviewCard } from './ReviewCard';

/**
 * Pull requests waiting on your review. The fixture vault has none, so the pixel
 * gate never draws this card with rows in it — which is exactly why it needs a
 * story.
 *
 * A photo appears when the author is one of your reports *and* their
 * `links.json` holds a plain `github.com/<login>` link:
 * `githubLoginToSlug()` matches the two, and the page resolves the cached photo
 * from the slug. Without that link the row falls back to a monogram, because
 * guessing a person from a login would be wrong more often than right — and
 * fetching the avatar from GitHub is not an option the CSP allows.
 */
const meta = {
  title: 'Components/Review card',
  component: ReviewCard,
  parameters: { layout: 'padded', nextjs: { appDirectory: true } },
} satisfies Meta<typeof ReviewCard>;

export default meta;

const PRS: PullRequest[] = [
  {
    id: 1,
    repo: 'platform/core',
    number: 812,
    title: 'Split the ingestion queue by tenant',
    url: 'https://github.com/platform/core/pull/812',
    author: 'ana-horvat',
    personSlug: 'ana-horvat',
    changedFiles: 14,
    additions: 402,
    deletions: 118,
    openedAt: '2026-08-15T09:00:00.000Z',
    draft: false,
  },
  {
    id: 2,
    repo: 'platform/core',
    number: 811,
    title: 'Retry the webhook once before giving up',
    url: 'https://github.com/platform/core/pull/811',
    author: 'marko-maric',
    personSlug: 'marko-maric',
    changedFiles: 3,
    additions: 41,
    deletions: 9,
    openedAt: '2026-08-18T14:00:00.000Z',
    draft: false,
  },
  {
    id: 3,
    repo: 'platform/web',
    number: 205,
    title: 'Tidy the settings form',
    url: 'https://github.com/platform/web/pull/205',
    author: 'someone-outside',
    // Not on the roster, or with no github.com link: a monogram, not a photo.
    personSlug: null,
    changedFiles: 1,
    additions: 12,
    deletions: 4,
    openedAt: '2026-08-19T11:00:00.000Z',
    draft: false,
  },
];

/** As the page resolves it: a slug to a cached photo path, or nothing. */
const photoOf = (slug: string | null) => (slug ? `.cache/photos/${slug}.jpg` : null);

export const WithReviews: StoryObj = {
  name: 'Waiting on you',
  render: () => (
    <Doc>
      <Section
        title="A face per row, and the age of the oldest reads loudest"
        note="Four days and it is red, two and it is amber — the longer you have blocked a review, the more the row says so."
      >
        <div style={{ maxWidth: 620 }}>
          <ReviewCard
            prs={PRS}
            connected
            freshness={{ state: 'live', fetchedAt: '2026-08-19T11:55:00.000Z', age: '5m' }}
            photoOf={photoOf}
            ageTone={(openedAt) => {
              const days = (Date.parse('2026-08-19T12:00:00.000Z') - Date.parse(openedAt)) / 864e5;
              return days >= 4 ? 'danger' : days >= 2 ? 'warning' : 'muted';
            }}
          />
        </div>
      </Section>
      <Note>
        The photos are 404s here — Storybook has no vault to serve them from — so every row falls
        back to its monogram. In the app the first two would show a face and the third would not.
      </Note>
    </Doc>
  ),
};

export const NothingWaiting: StoryObj = {
  name: 'Nothing waiting',
  render: () => (
    <div style={{ maxWidth: 620 }}>
      <ReviewCard
        prs={[]}
        connected
        freshness={{ state: 'live', fetchedAt: '2026-08-19T11:55:00.000Z', age: '5m' }}
        photoOf={() => null}
        ageTone={() => 'muted'}
      />
    </div>
  ),
};

export const NotConnected: StoryObj = {
  name: 'GitHub not connected',
  render: () => (
    <div style={{ maxWidth: 620 }}>
      <ReviewCard
        prs={[]}
        connected={false}
        freshness={{ state: 'unconfigured' }}
        photoOf={() => null}
        ageTone={() => 'muted'}
      />
    </div>
  ),
};
