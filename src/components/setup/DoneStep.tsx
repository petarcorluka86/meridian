'use client';

import {
  Banner,
  ButtonLink,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  GoIcon,
  GuideIcon,
  Stack,
  Text,
} from '@/components/ui';

/**
 * The end of the wizard, and only ever reached when the wait had something to
 * say: nothing was connected to fetch, or something did not answer.
 *
 * A clean first fetch never gets here — `SettingUp` walks straight into the app,
 * because a screen whose whole content is "that worked" is a screen to press a
 * button on for no reason.
 */
export function DoneStep({ failures }: { failures: string[] }) {
  return (
    <Card>
      <CardHeader title="That is everything" />
      <CardBody>
        <Stack gap={3}>
          {failures.length > 0 ? (
            <Banner
              tone="warning"
              title="Some of it did not come in."
              description={`${failures.join(' · ')}. Everything else is ready, and each card has a badge that tries its own source again.`}
            />
          ) : (
            <Text level="body">
              Nothing is connected yet, which is a fine place to start: notes, tasks and hours all
              work without a single source.
            </Text>
          )}
          <Text level="body">
            Anything you skipped can be connected later from Settings, which reopens exactly this
            step and shows what is connected right now.
          </Text>
        </Stack>
      </CardBody>
      <CardFooter>
        <ButtonLink href="/" variant="primary" icon={<GoIcon />}>
          Open Meridian
        </ButtonLink>
        <ButtonLink href="/help" variant="ghost" icon={<GuideIcon />}>
          Read the guide
        </ButtonLink>
      </CardFooter>
    </Card>
  );
}
