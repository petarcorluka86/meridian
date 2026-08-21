'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addPlanAction, removePlanAction } from '@/app/people/actions';
import { Confirm } from '@/components/Confirm';
import { EMPTY_GLYPH } from '@/components/EmptyGlyphs';
import { EMPTY } from '@/copy/empty';
import { MONTHS } from '@/lib/comp';
import {
  AddIcon,
  Blurred,
  Button,
  Card,
  CardFooter,
  CardHeader,
  CardRow,
  EmptyState,
  RemoveIcon,
  RevealButton,
  Select,
  Spacer,
  Text,
  TextInput,
  useReveal,
} from '@/components/ui';
import styles from './Person.module.css';

export type PlanView = { id: string; when: string; amount: string; promotion: string };

export function PlansCard({
  slug,
  plans,
  thisYear,
}: {
  slug: string;
  plans: PlanView[];
  thisYear: number;
}) {
  const router = useRouter();
  const { revealed, left, toggle } = useReveal();
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(1);
  const [year, setYear] = useState(thisYear + 1);
  const [promotion, setPromotion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<PlanView | null>(null);
  const [pending, startTransition] = useTransition();

  const add = () =>
    startTransition(async () => {
      const result = await addPlanAction(slug, Number(amount), month, year, promotion);
      if (result.ok) {
        setAmount('');
        setPromotion('');
        setError(null);
        router.refresh();
      } else {
        setError(result.message);
      }
    });

  return (
    <Card>
      <CardHeader
        title="Planned promotions and pay rises"
        end={<RevealButton revealed={revealed} left={left} onToggle={toggle} />}
      />

      <Blurred revealed={revealed}>
        {plans.map((plan) => (
          <CardRow key={plan.id}>
            <Text level="label" tone="info">
              {plan.when}
            </Text>
            <Text level="label" tone="strong" numeric>
              {plan.amount}
            </Text>
            {plan.promotion ? (
              <Text level="small" tone="muted">
                {plan.promotion}
              </Text>
            ) : null}
            <Spacer />
            <Button
              iconOnly
              size="sm"
              onClick={() => setConfirming(plan)}
              icon={<RemoveIcon />}
              ariaLabel={`Remove the plan for ${plan.when}`}
            />
          </CardRow>
        ))}
      </Blurred>

      {plans.length === 0 ? <EmptyState glyph={EMPTY_GLYPH.rise} {...EMPTY.person.plans} /> : null}

      <CardFooter>
        <span className={styles.amount}>
          <TextInput
            value={amount}
            onChange={setAmount}
            placeholder="€"
            ariaLabel="Planned amount"
          />
        </span>
        <Select
          value={String(month)}
          onChange={(value) => setMonth(Number(value))}
          ariaLabel="Planned month"
          options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
        />
        <Select
          value={String(year)}
          onChange={(value) => setYear(Number(value))}
          ariaLabel="Planned year"
          options={[thisYear, thisYear + 1, thisYear + 2].map((y) => ({
            value: String(y),
            label: String(y),
          }))}
        />
        <span className={styles.grow}>
          <TextInput
            value={promotion}
            onChange={setPromotion}
            placeholder="Promotion (optional)"
            ariaLabel="Promotion"
          />
        </span>
        <Button variant="primary" onClick={add} pending={pending} icon={<AddIcon />}>
          Add plan
        </Button>
        {error ? (
          <Text level="small" tone="danger">
            {error}
          </Text>
        ) : null}
      </CardFooter>

      <CardRow>
        <Text level="small" tone="muted">
          Yours only — never written to BambooHR.
        </Text>
      </CardRow>

      <Confirm
        open={confirming !== null}
        title="Remove this plan?"
        body={
          confirming
            ? `${confirming.when} · ${confirming.amount}${confirming.promotion ? ` — ${confirming.promotion}` : ''}. It will stop showing in the compensation history.`
            : ''
        }
        action="Remove plan"
        pending={pending}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          const plan = confirming;
          setConfirming(null);
          if (!plan) return;
          startTransition(async () => {
            await removePlanAction(slug, plan.id);
            router.refresh();
          });
        }}
      />
    </Card>
  );
}
