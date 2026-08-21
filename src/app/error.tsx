'use client';

import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  Code,
  CodeBlock,
  GuideIcon,
  RefreshIcon,
  Page,
  Row,
  Stack,
  Text,
} from '@/components/ui';

/**
 * The app had no error surface at all — no error.tsx anywhere — so a failed
 * mutation (a write conflict, a full disk, a read-only vault) replaced the whole
 * screen with the framework's default page: a bare stack trace in development
 * and a blank apology in production, either way with nothing to do next.
 *
 * The one thing worth saying is the one thing that is always true here: every
 * write is atomic and snapshotted, so a failure means the change did not happen,
 * not that something is half-written.
 */
export default function ScreenError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Page>
      <Card tone="danger">
        <CardHeader
          title={
            <Text level="micro" tone="danger">
              SOMETHING WENT WRONG
            </Text>
          }
          bare
        />
        <CardBody>
          <Stack gap={4} align="start">
            <Text as="h1" level="heading">
              That did not work.
            </Text>
            <Text level="body">
              Nothing in your vault has been changed — every write is atomic, so an action either
              happens completely or not at all. The version before each write is kept in{' '}
              <Code>.snapshots/</Code> either way.
            </Text>
            {/* Next strips a server error's message in production and sends only a
                digest, so without this the panel says nothing at all. The digest is
                what the terminal logged it under. */}
            <CodeBlock>
              {error.message ||
                `No message — the server logged this one as digest ${error.digest ?? 'unknown'}.`}
            </CodeBlock>
            <Row gap={2}>
              <Button onClick={reset} icon={<RefreshIcon />}>
                Try again
              </Button>
              <ButtonLink href="/help?s=vault" icon={<GuideIcon />}>
                What to check
              </ButtonLink>
            </Row>
          </Stack>
        </CardBody>
      </Card>
    </Page>
  );
}
