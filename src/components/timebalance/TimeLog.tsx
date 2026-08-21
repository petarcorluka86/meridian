'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteEntryAction, editEntryAction, logEntryAction } from '@/app/timebalance/actions';
import { Confirm } from '@/components/Confirm';
import {
  AddIcon,
  Button,
  Card,
  CardBody,
  CardRow,
  DateInput,
  CheckIcon,
  EditIcon,
  Field,
  Icon,
  IconTile,
  RemoveIcon,
  Row,
  Stack,
  Text,
  TextInput,
} from '@/components/ui';
import styles from './Time.module.css';

const TrendIcon = ({ up }: { up: boolean }) => (
  <Icon size="lg" weight="bold">
    {up ? (
      <>
        <path d="M4 17l6-6 4 4 6-7" />
        <path d="M15 8h5v5" />
      </>
    ) : (
      <>
        <path d="M4 7l6 6 4-4 6 7" />
        <path d="M20 11v5h-5" />
      </>
    )}
  </Icon>
);

export function LogEntry({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [date, setDate] = useState(defaultDate);
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!hours.trim() || pending) return;
    startTransition(async () => {
      const result = await logEntryAction(date, hours, note);
      if (result.ok) {
        setHours('');
        setNote('');
        setError(null);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  };

  const onKey = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') submit();
  };

  return (
    <Card>
      <CardBody>
        <Stack gap={3}>
          <Row gap={2}>
            <AddIcon />
            <Text level="subheading">Log an entry</Text>
          </Row>
          <Row gap={3} align="end">
            <Field label="Date">
              <DateInput value={date} onChange={setDate} ariaLabel="Date" />
            </Field>
            <Field label="Hours (+/−)">
              <span className={styles.hours}>
                <TextInput
                  value={hours}
                  onChange={setHours}
                  onKeyDown={onKey}
                  placeholder="−2 or +1.5"
                  ariaLabel="Hours"
                />
              </span>
            </Field>
            <Field label="Reason (optional)" grow>
              <TextInput
                value={note}
                onChange={setNote}
                onKeyDown={onKey}
                placeholder="Left early, release night…"
                ariaLabel="Reason"
              />
            </Field>
            <Button variant="primary" onClick={submit} pending={pending} icon={<AddIcon />}>
              Log
            </Button>
          </Row>
        </Stack>
      </CardBody>
      {error ? (
        <CardRow tone="danger">
          <Text level="small" tone="danger">
            {error}
          </Text>
        </CardRow>
      ) : null}
    </Card>
  );
}

export type EntryView = {
  id: string;
  date: string;
  dateLabel: string;
  hoursDelta: number;
  amount: string;
  note: string;
};

export function EntryRow({ entry }: { entry: EntryView }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [date, setDate] = useState(entry.date);
  const [hours, setHours] = useState((entry.hoursDelta > 0 ? '+' : '') + String(entry.hoursDelta));
  const [note, setNote] = useState(entry.note);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const up = entry.hoursDelta >= 0;

  const save = () =>
    startTransition(async () => {
      const result = await editEntryAction(entry.id, date, hours, note);
      if (result.ok) {
        setEditing(false);
        setError(null);
        router.refresh();
      } else {
        setError(result.message);
      }
    });

  const remove = () => {
    setConfirming(false);
    startTransition(async () => {
      await deleteEntryAction(entry.id);
      router.refresh();
    });
  };

  return (
    <>
      <CardRow pending={pending}>
        <IconTile tone={up ? 'success' : 'danger'}>
          <TrendIcon up={up} />
        </IconTile>

        {editing ? (
          <div className={styles.editing}>
            <DateInput value={date} onChange={setDate} ariaLabel="Date" />
            <span className={styles.hours}>
              <TextInput value={hours} onChange={setHours} ariaLabel="Hours" />
            </span>
            <span className={styles.reason}>
              <TextInput value={note} onChange={setNote} ariaLabel="Reason" />
            </span>
          </div>
        ) : (
          <div className={styles.main}>
            <Stack gap={1}>
              <Row gap={2} align="baseline">
                <Text level="mono">{entry.dateLabel}</Text>
                <Text level="label" tone={up ? 'success' : 'danger'} numeric>
                  {entry.amount}
                </Text>
              </Row>
              <Text level="small" tone="muted">
                {entry.note}
              </Text>
            </Stack>
          </div>
        )}

        {editing ? (
          <>
            <Button onClick={() => setEditing(false)}>Cancel</Button>
            <Button variant="primary" onClick={save} pending={pending} icon={<CheckIcon />}>
              Save
            </Button>
          </>
        ) : (
          <>
            <Button
              iconOnly
              onClick={() => setEditing(true)}
              icon={<EditIcon />}
              ariaLabel={`Edit entry for ${entry.dateLabel}`}
            />
            {/* Neutral with a danger icon: a solid red button on every row would
                shout, and the confirm dialog is where the red belongs. */}
            <Button
              iconOnly
              onClick={() => setConfirming(true)}
              icon={<RemoveIcon />}
              ariaLabel={`Remove entry for ${entry.dateLabel}`}
            />
          </>
        )}
      </CardRow>
      {error ? (
        <CardRow tone="danger">
          <Text level="small" tone="danger">
            {error}
          </Text>
        </CardRow>
      ) : null}

      <Confirm
        open={confirming}
        title="Delete this entry?"
        body={`${entry.dateLabel} · ${entry.amount}${entry.note ? ` — ${entry.note}` : ''}. This cannot be undone.`}
        action="Delete entry"
        pending={pending}
        onCancel={() => setConfirming(false)}
        onConfirm={remove}
      />
    </>
  );
}
