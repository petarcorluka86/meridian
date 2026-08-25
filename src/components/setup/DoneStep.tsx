'use client';

import {
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

export function DoneStep() {
  return (
    <Card>
      <CardHeader title="That is everything" />
      <CardBody>
        <Stack gap={3}>
          <Text level="body">
            Meridian will fetch what it needs the first time you open a page, and keep it current
            from then on. There is nothing to run and nothing to remember.
          </Text>
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
