'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createNoteAction } from '@/app/notes/actions';
import { AddIcon, Button, Row, Stack, Text, TextInput } from '@/components/ui';

/** A note can start from the Notes screen, not only from Overview's capture. */
export function NewNote({ person }: { person: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const create = () => {
    if (!title.trim() || pending) return;
    startTransition(async () => {
      // Filtering by a person means a note written here is about them.
      const slug = person !== 'all' && person !== 'general' ? person : null;
      const result = await createNoteAction(title, slug);
      if (result.ok) {
        setTitle('');
        setOpen(false);
        setError(null);
        router.push(`/notes?note=${encodeURIComponent(result.path)}`);
      } else {
        setError(result.message);
      }
    });
  };

  if (!open) {
    return (
      <Button variant="primary" full onClick={() => setOpen(true)} icon={<AddIcon />}>
        New note
      </Button>
    );
  }

  return (
    <Stack gap={2}>
      <TextInput
        value={title}
        autoFocus
        onChange={setTitle}
        onKeyDown={(event) => {
          if (event.key === 'Enter') create();
          if (event.key === 'Escape') setOpen(false);
        }}
        placeholder="What is it about?"
        ariaLabel="New note title"
      />
      <Row gap={2}>
        <Button full onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button variant="primary" full onClick={create} pending={pending} icon={<AddIcon />}>
          Create
        </Button>
      </Row>
      {error ? (
        <Text level="small" tone="danger">
          {error}
        </Text>
      ) : null}
    </Stack>
  );
}
