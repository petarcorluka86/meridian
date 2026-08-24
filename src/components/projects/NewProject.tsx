'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProjectAction } from '@/app/projects/actions';
import {
  AddIcon,
  Button,
  Card,
  CardRow,
  Dialog,
  Field,
  RemoveIcon,
  Row,
  Spacer,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@/components/ui';

/**
 * Creating a project, in a dialog rather than a row at the top of the list.
 *
 * A project is a title, a description and a list of phases, which is more than
 * a row can hold without pushing the list it belongs to off the screen — the
 * same reason `TaskDialog` is a dialog.
 *
 * Phases are optional here and the label says so: a project you have not thought
 * through yet is still worth writing down, and the phases can be added on its
 * own page the moment you know them.
 *
 * Mounted only while open, so it starts empty every time rather than from
 * whatever was typed into it and abandoned.
 */
/** A phase typed into the dialog but not yet written to the vault. */
type Draft = { key: number; label: string };

let keys = 0;
const nextKey = () => ++keys;

export function NewProject() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" icon={<AddIcon />} onClick={() => setOpen(true)}>
        New project
      </Button>
      {open ? <NewProjectDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function NewProjectDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // A key of its own rather than the index: two phases may legitimately be
  // called the same thing, and removing one from the middle must not make the
  // rows below it swap their identity.
  const [phases, setPhases] = useState<Draft[]>([]);
  const [phase, setPhase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const addPhase = () => {
    const trimmed = phase.trim();
    if (!trimmed) return;
    setPhases((current) => [...current, { key: nextKey(), label: trimmed }]);
    setPhase('');
  };

  const create = async () => {
    if (pending) return;
    setPending(true);
    const result = await createProjectAction({
      title,
      description,
      phases: phases.map((p) => p.label),
    });
    if (!result.ok) {
      setPending(false);
      setError(result.message);
      return;
    }
    onClose();
    // Straight to the new project: you made it in order to fill it in.
    router.push(`/projects/${result.id}`);
  };

  return (
    <Dialog
      open
      title="New project"
      onClose={onClose}
      footer={
        <>
          <Button variant="neutral" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={create} pending={pending} icon={<AddIcon />}>
            Create project
          </Button>
        </>
      }
    >
      <Stack gap={4}>
        <Field label="Title">
          <TextInput
            autoFocus
            value={title}
            onChange={setTitle}
            placeholder="Platform split"
            ariaLabel="Project title"
            onKeyDown={(event) => {
              if (event.key === 'Enter') create();
            }}
          />
        </Field>

        <Field label="Description">
          <Textarea
            value={description}
            onChange={setDescription}
            rows={3}
            placeholder="What is it, and why does it exist?"
            ariaLabel="Project description"
          />
        </Field>

        {/* Not a `Field`: a `Field` is a `label`, and this group holds a Remove
            button per row as well as a field. A button inside a label is not a
            control the label can name — the same reason `TaskDialog` keeps its
            clear button beside the label rather than inside it. */}
        <Stack gap={2}>
          <Text level="label" tone="strong">
            Phases
          </Text>
          <Stack gap={2}>
            {phases.length ? (
              <Card>
                {phases.map((draft, index) => (
                  <CardRow key={draft.key}>
                    <Text level="mono" tone="faint" numeric>
                      {String(index + 1).padStart(2, '0')}
                    </Text>
                    <Text level="body">{draft.label}</Text>
                    <Spacer />
                    <Button
                      iconOnly
                      size="sm"
                      icon={<RemoveIcon />}
                      ariaLabel={`Remove ${draft.label}`}
                      onClick={() =>
                        setPhases((current) => current.filter((p) => p.key !== draft.key))
                      }
                    />
                  </CardRow>
                ))}
              </Card>
            ) : null}
            <Row gap={2} wrap={false}>
              <TextInput
                value={phase}
                onChange={setPhase}
                placeholder="Add a phase…"
                ariaLabel="Phase name"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addPhase();
                  }
                }}
              />
              <Button onClick={addPhase} icon={<AddIcon />}>
                Add
              </Button>
            </Row>
            <Text level="small" tone="muted">
              Optional — add them on the project itself if you prefer.
            </Text>
          </Stack>
        </Stack>

        {error ? (
          <Text level="small" tone="danger">
            {error}
          </Text>
        ) : null}
      </Stack>
    </Dialog>
  );
}
