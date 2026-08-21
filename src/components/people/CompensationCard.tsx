'use client';

import {
  Blurred,
  Card,
  CardBody,
  CardGroup,
  CardHeader,
  CardRow,
  EmptyState,
  Pill,
  RevealButton,
  Row,
  Spacer,
  Stat,
  Text,
  useReveal,
} from '@/components/ui';

export type CompHistoryRow = {
  when: string;
  delta: string;
  rate: string;
  planned: boolean;
  reason: string;
};

export function CompensationCard({
  name,
  rate,
  paidPer,
  history,
  bonuses,
  footnote,
  hasData,
  note,
}: {
  name: string;
  rate: string;
  paidPer: string;
  history: CompHistoryRow[];
  bonuses: { when: string; amount: string; reason: string }[];
  footnote: string;
  hasData: boolean;
  /** Why there is nothing here, when the app knows. */
  note: string | null;
}) {
  const { revealed, left, toggle } = useReveal();
  const first = name.split(' ')[0] ?? name;

  if (!hasData) {
    return (
      <Card>
        <CardHeader
          title="Compensation"
          end={<RevealButton revealed={revealed} left={left} onToggle={toggle} />}
        />
        <EmptyState>
          BambooHR has no compensation rows for {first}.{note ? ` ${note}` : ''}
        </EmptyState>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Compensation"
        end={<RevealButton revealed={revealed} left={left} onToggle={toggle} />}
      />

      <Blurred revealed={revealed}>
        <CardBody>
          <Stat label={`per ${paidPer}`} value={rate} size="lg" />
        </CardBody>

        <CardGroup label="Rises" />
        {history.map((row) => (
          <CardRow key={`${row.when}-${row.rate}`}>
            <Text level="small" tone="muted">
              {row.when}
            </Text>
            <Text level="mono" tone={row.planned ? 'info' : 'success'}>
              {row.delta}
            </Text>
            {row.planned ? <Pill tone="info">Planned</Pill> : null}
            <Spacer />
            <Text level="mono" tone="strong">
              {row.rate}
            </Text>
          </CardRow>
        ))}

        {bonuses.length ? (
          <>
            <CardGroup label="Bonuses" />
            {bonuses.map((bonus) => (
              <CardRow key={`${bonus.when}-${bonus.reason}-${bonus.amount}`}>
                <Text level="small" tone="muted">
                  {bonus.when}
                </Text>
                <Row gap={2}>
                  <Text level="small" tone="muted">
                    {bonus.reason}
                  </Text>
                </Row>
                <Spacer />
                <Text level="mono" tone="strong">
                  {bonus.amount}
                </Text>
              </CardRow>
            ))}
          </>
        ) : null}
      </Blurred>

      <CardRow>
        <Text level="small" tone="muted">
          {footnote}
        </Text>
      </CardRow>
    </Card>
  );
}
