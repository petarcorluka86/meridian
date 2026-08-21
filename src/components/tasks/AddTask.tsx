'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addTaskAction } from '@/app/tasks/actions';
import { addDays, today } from '@/lib/dates';
import { Button } from '@/components/ui/Button';
import { Card, CardFooter, CardRow } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { DateInput, Select, TextInput } from '@/components/ui/Input';
import { AddIcon } from '@/components/ui/icons';
import { Divider, Spacer } from '@/components/ui/Layout';
import { Text } from '@/components/ui/Text';

type Person = { slug: string; name: string };
type Priority = 'normal' | 'important' | 'urgent';

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'important', label: 'Important' },
  { value: 'urgent', label: 'Urgent' },
];

const WHEN = [
  { value: 'none', label: 'No date' },
  { value: '0', label: 'Today' },
  { value: '1', label: 'Tomorrow' },
  { value: '3', label: 'In 3 days' },
  { value: '7', label: 'Next week' },
  { value: 'custom', label: 'Pick a date…' },
];

const PlusIcon = () => (
  <svg
    aria-hidden="true"
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--icon)"
    strokeWidth="1.8"
    strokeLinecap="round"
    style={{ flex: '0 0 auto' }}
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export function AddTask({ people }: { people: Person[] }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [due, setDue] = useState('none');
  const [customDate, setCustomDate] = useState(today());
  const [person, setPerson] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dueDate = (): string | null => {
    if (due === 'none') return null;
    if (due === 'custom') return customDate || null;
    return addDays(today(), Number(due));
  };

  const submit = () => {
    if (!title.trim() || pending) return;
    startTransition(async () => {
      const result = await addTaskAction({
        title,
        priority,
        dueDate: dueDate(),
        personSlug: person || null,
      });
      if (result.ok) {
        setTitle('');
        setError(null);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <Card>
      <CardRow>
        <PlusIcon />
        <TextInput
          bare
          value={title}
          onChange={setTitle}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit();
          }}
          placeholder="What needs doing?"
          ariaLabel="What needs doing?"
        />
        <Text level="mono" tone="faint" nowrap>
          ↵ to add
        </Text>
      </CardRow>
      <CardFooter>
        {PRIORITIES.map((option) => (
          <Chip
            key={option.value}
            selected={priority === option.value}
            onClick={() => setPriority(option.value)}
          >
            {option.label}
          </Chip>
        ))}
        <Divider orientation="vertical" />
        <Select options={WHEN} value={due} onChange={setDue} ariaLabel="Due date" />
        {due === 'custom' ? (
          <DateInput value={customDate} onChange={setCustomDate} ariaLabel="Pick a due date" />
        ) : null}
        <Select
          options={[
            { value: '', label: 'Nobody' },
            ...people.map((p) => ({ value: p.slug, label: p.name })),
          ]}
          value={person}
          onChange={setPerson}
          ariaLabel="Person"
        />
        <Spacer />
        <Button variant="primary" onClick={submit} pending={pending} icon={<AddIcon />}>
          Add task
        </Button>
      </CardFooter>
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
