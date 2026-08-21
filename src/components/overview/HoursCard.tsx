import { ClockIcon } from '@/components/overview/OverviewIcons';
import { EMPTY } from '@/copy/empty';
import { formatHours } from '@/lib/vault/time';
import { CardBody, CardLink, Row, Spacer, Stack, Text } from '@/components/ui';

/** Hours owed and owing, as one number. The ledger behind it is its own screen. */
export function HoursCard({ balance }: { balance: number }) {
  return (
    <CardLink href="/timebalance">
      <CardBody>
        <Stack gap={2}>
          <Row gap={3}>
            <ClockIcon />
            <Text level="subheading">Your hours</Text>
            <Spacer />
            <Text level="heading" tone={balance >= 0 ? 'success' : 'danger'} numeric>
              {formatHours(balance)}
            </Text>
          </Row>
          {balance === 0 ? (
            <Text level="small" tone="muted">
              {EMPTY.overview.hours}
            </Text>
          ) : null}
        </Stack>
      </CardBody>
    </CardLink>
  );
}
