'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveAboutAction } from '@/app/people/actions';
import {
  AddIcon,
  Button,
  Card,
  CardBody,
  CardHeader,
  CheckIcon,
  Code,
  EditIcon,
  EmptyState,
  Prose,
  Stack,
  Text,
  Textarea,
} from '@/components/ui';

export function AboutCard({
  slug,
  name,
  body,
  html,
}: {
  slug: string;
  name: string;
  body: string;
  html: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const result = await saveAboutAction(slug, draft);
      if (result.ok) {
        setEditing(false);
        setError(null);
        router.refresh();
      } else {
        setError(result.message);
      }
    });

  const first = name.split(' ')[0] ?? name;

  return (
    <Card>
      <CardHeader
        title="About"
        end={
          editing ? (
            <>
              <Button
                size="sm"
                onClick={() => {
                  setDraft(body);
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={save}
                pending={pending}
                icon={<CheckIcon />}
              >
                Save
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setEditing(true)} icon={<EditIcon />}>
              Edit
            </Button>
          )
        }
      />
      {editing ? (
        <CardBody>
          <Stack gap={2}>
            <Textarea
              mono
              value={draft}
              onChange={setDraft}
              ariaLabel={`About ${name}`}
              rows={12}
            />
            <Text level="small" tone="faint">
              Markdown: <Code>**bold**</Code>, <Code>- bullet</Code>, <Code>### heading</Code>,{' '}
              <Code>`code`</Code>
            </Text>
            {error ? (
              <Text level="small" tone="danger">
                {error}
              </Text>
            ) : null}
          </Stack>
        </CardBody>
      ) : html.trim() ? (
        <CardBody>
          <Prose html={html} />
        </CardBody>
      ) : (
        <EmptyState
          standalone
          title={`Nothing written about ${first} yet.`}
          action={
            <Button variant="primary" onClick={() => setEditing(true)} icon={<AddIcon />}>
              Write it
            </Button>
          }
        >
          How they work, what they want, what to watch.
        </EmptyState>
      )}
    </Card>
  );
}
