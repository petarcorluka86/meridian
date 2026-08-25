'use client';

import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CheckIcon,
  Stack,
  Text,
} from '@/components/ui';

/**
 * Every wizard step is this: a card that says what the step is for, some fields,
 * the result of checking them, and one primary action with an optional Skip.
 *
 * The five steps used to repeat this markup five times, which is how the third
 * one ended up with a different footer.
 */
export function StepCard({
  title,
  meta,
  children,
  action,
  actionIcon,
  onAction,
  pending,
  onSkip,
}: {
  title: string;
  /** "required", or what the step brings in if it is skipped. */
  meta: string;
  children: React.ReactNode;
  action: string;
  /**
   * The glyph is chosen by what the action does, so a step that checks what you
   * typed keeps the tick and one that hands you to Google does not.
   */
  actionIcon?: React.ReactNode;
  onAction: () => void;
  pending?: boolean;
  onSkip?: () => void;
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        end={
          <Text level="small" tone="muted">
            {meta}
          </Text>
        }
      />
      <CardBody>
        <Stack gap={4}>{children}</Stack>
      </CardBody>
      <CardFooter>
        <Button
          variant="primary"
          onClick={onAction}
          pending={pending}
          icon={actionIcon ?? <CheckIcon />}
        >
          {action}
        </Button>
        {onSkip ? (
          <Button variant="ghost" onClick={onSkip}>
            Skip for now
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
