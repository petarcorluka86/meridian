'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { captureNoteAction, captureTaskAction, type CaptureResult } from '@/app/actions';
import { addDays, today } from '@/lib/dates';
import type { NoteCategory } from '@/lib/vault/schemas';
import {
  AddIcon,
  Banner,
  Button,
  Card,
  CardFooter,
  CardRow,
  CATEGORIES,
  Chip,
  Code,
  DateInput,
  Icon,
  Segment,
  Segmented,
  Select,
  Spacer,
  Stack,
  Text,
  TextInput,
  Toggle,
} from '@/components/ui';

const TaskIcon = () => (
  <Icon size="sm">
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l2.5 2.5L16 9.5" />
  </Icon>
);

const NoteIcon = () => (
  <Icon size="sm">
    <rect x="4.5" y="3.5" width="15" height="17" rx="2.5" />
    <path d="M8.5 9h7" />
    <path d="M8.5 13h7" />
    <path d="M8.5 17h4" />
  </Icon>
);

type Person = { slug: string; name: string };
type Project = { id: string; title: string };
type Priority = 'normal' | 'important' | 'urgent';

const WHEN = [
  { value: 'none', label: 'No date' },
  { value: '0', label: 'Today' },
  { value: '1', label: 'Tomorrow' },
  { value: '3', label: 'In 3 days' },
  { value: '7', label: 'Next week' },
  { value: 'custom', label: 'Pick a date…' },
];

/**
 * One field at the top of Overview. Task is the default; a note captured without
 * a person is a note about nobody, and the field says where it lands.
 */
export function QuickCapture({ people, projects }: { people: Person[]; projects: Project[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<'task' | 'note'>('task');
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [due, setDue] = useState('none');
  const [customDate, setCustomDate] = useState(today());
  const [person, setPerson] = useState('');
  const [project, setProject] = useState('');
  const [category, setCategory] = useState<NoteCategory>('idea');
  const [draft, setDraft] = useState(true);
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [pending, startTransition] = useTransition();

  const dueDate = () => {
    if (due === 'none') return null;
    if (due === 'custom') return customDate || null;
    return addDays(today(), Number(due));
  };

  const save = () => {
    if (!text.trim() || pending) return;
    startTransition(async () => {
      const res =
        mode === 'task'
          ? await captureTaskAction({
              title: text,
              priority,
              dueDate: dueDate(),
              personSlug: person || null,
              projectId: project || null,
            })
          : await captureNoteAction({
              title: text,
              category,
              personSlug: person || null,
              project: project || null,
              draft,
            });
      setResult(res);
      if (res.ok) setText('');
      router.refresh();
    });
  };

  return (
    <Stack gap={4}>
      <Card>
        <CardFooter>
          <Segmented label="What to capture">
            <Segment selected={mode === 'task'} onClick={() => setMode('task')}>
              <TaskIcon />
              Task
            </Segment>
            <Segment selected={mode === 'note'} onClick={() => setMode('note')}>
              <NoteIcon />
              Note
            </Segment>
          </Segmented>

          <Spacer />

          {mode === 'task' ? (
            <>
              {(['normal', 'important', 'urgent'] as const).map((p) => (
                <Chip key={p} size="sm" selected={priority === p} onClick={() => setPriority(p)}>
                  {p[0]!.toUpperCase() + p.slice(1)}
                </Chip>
              ))}
              <Select size="sm" value={due} onChange={setDue} ariaLabel="Due date" options={WHEN} />
              {due === 'custom' ? (
                <DateInput
                  size="sm"
                  value={customDate}
                  onChange={setCustomDate}
                  ariaLabel="Pick a due date"
                />
              ) : null}
            </>
          ) : (
            <>
              <Toggle checked={draft} onChange={setDraft} label="Draft" />
              <Select
                size="sm"
                value={category}
                onChange={(value) => setCategory(value as NoteCategory)}
                ariaLabel="Category"
                options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
              />
            </>
          )}
          <Select
            size="sm"
            value={person}
            onChange={setPerson}
            ariaLabel="Person"
            options={[
              { value: '', label: mode === 'task' ? 'Nobody' : 'Not about a person' },
              ...people.map((p) => ({ value: p.slug, label: p.name })),
            ]}
          />
          <Select
            size="sm"
            value={project}
            onChange={setProject}
            ariaLabel="Project"
            options={[
              { value: '', label: 'No project' },
              ...projects.map((p) => ({ value: p.id, label: p.title })),
            ]}
          />
        </CardFooter>

        <CardRow>
          <TextInput
            bare
            value={text}
            onChange={setText}
            onKeyDown={(event) => {
              if (event.key === 'Enter') save();
            }}
            placeholder={mode === 'task' ? 'What needs doing?' : 'What is on your mind?'}
            ariaLabel={mode === 'task' ? 'What needs doing?' : 'What is on your mind?'}
          />
          <Button variant="primary" onClick={save} pending={pending} icon={<AddIcon />}>
            {mode === 'task' ? 'Add task' : 'Save note'}
          </Button>
        </CardRow>

        {mode === 'note' && !person ? (
          <CardRow>
            <Text level="small" tone="muted">
              Lands in <Code>notes/general/</Code>. Give it a person and it moves to their folder.
            </Text>
          </CardRow>
        ) : null}
      </Card>

      {result ? (
        <Banner tone={result.ok ? 'success' : 'danger'} description={result.message} />
      ) : null}
    </Stack>
  );
}
