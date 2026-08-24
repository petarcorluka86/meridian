'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  archiveProjectAction,
  deleteProjectAction,
  updateProjectAction,
} from '@/app/projects/actions';
import { Confirm } from '@/components/Confirm';
import {
  ArchiveIcon,
  Banner,
  Button,
  Card,
  CardBody,
  CheckIcon,
  EditIcon,
  Field,
  Pill,
  RestoreIcon,
  Row,
  Spacer,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@/components/ui';

/**
 * The project's name, what it is for, and the two things you can do to the whole
 * of it.
 *
 * Archive asks first only when there is open work on the project, because that is
 * the case where somebody might not realise what they are putting away — and the
 * body counts it rather than warning in general. Restoring never asks: nothing
 * was lost, so there is nothing to be sure about.
 *
 * Delete always asks, and the body says exactly what survives. Its tasks and
 * notes do; they lose the project and stay where they are.
 */
export function ProjectHeader({
  id,
  title,
  description,
  archived,
  openTasks,
  notes,
}: {
  id: string;
  title: string;
  description: string;
  archived: boolean;
  openTasks: number;
  notes: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftDescription, setDraftDescription] = useState(description);
  const [confirm, setConfirm] = useState<'archive' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (work: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) =>
    startTransition(async () => {
      const result = await work();
      if (!result.ok) {
        setError(result.message ?? 'Could not save.');
        return;
      }
      setError(null);
      setConfirm(null);
      if (after) after();
      else router.refresh();
    });

  const archive = () => run(() => archiveProjectAction(id, !archived));

  return (
    <Stack gap={3}>
      <Row gap={3}>
        <Stack gap={1}>
          <Row gap={2}>
            <Text as="h1" level="heading">
              {title}
            </Text>
            {archived ? <Pill>Archived</Pill> : null}
          </Row>
          <Text level="small" tone="muted">
            {description || 'No description yet.'}
          </Text>
        </Stack>
        <Spacer />
        <Button
          size="sm"
          icon={editing ? undefined : <EditIcon />}
          onClick={() => {
            setDraftTitle(title);
            setDraftDescription(description);
            setEditing((v) => !v);
          }}
        >
          {editing ? 'Cancel' : 'Edit'}
        </Button>
        <Button
          size="sm"
          icon={archived ? <RestoreIcon /> : <ArchiveIcon />}
          disabled={pending}
          onClick={() => {
            // Nothing at stake in restoring, and nothing at stake in archiving a
            // project with no open work either.
            if (archived || openTasks === 0) archive();
            else setConfirm('archive');
          }}
        >
          {archived ? 'Restore' : 'Archive'}
        </Button>
        {/* Solid, and the only solid-red button outside a confirm dialog: it is
            the one irreversible thing on this screen, and it should not look
            like Edit with a different word in it.

            No glyph — `RemoveIcon` is always the danger tone, which is what a
            danger button is already made of, and a dark-red trash on a red fill
            is a smudge. `TaskDialog` and `Confirm` carry none either. */}
        <Button size="sm" variant="danger" disabled={pending} onClick={() => setConfirm('delete')}>
          Delete
        </Button>
      </Row>

      {editing ? (
        <Card>
          <CardBody>
            <Stack gap={3}>
              <Field label="Title">
                <TextInput
                  autoFocus
                  value={draftTitle}
                  onChange={setDraftTitle}
                  ariaLabel="Project title"
                />
              </Field>
              <Field label="Description">
                <Textarea
                  value={draftDescription}
                  onChange={setDraftDescription}
                  rows={3}
                  placeholder="What is it, and why does it exist?"
                  ariaLabel="Project description"
                />
              </Field>
              <Row gap={2}>
                <Spacer />
                <Button
                  variant="primary"
                  icon={<CheckIcon />}
                  pending={pending}
                  onClick={() =>
                    run(
                      () =>
                        updateProjectAction(id, {
                          title: draftTitle,
                          description: draftDescription,
                        }),
                      () => {
                        setEditing(false);
                        router.refresh();
                      },
                    )
                  }
                >
                  Save
                </Button>
              </Row>
            </Stack>
          </CardBody>
        </Card>
      ) : null}

      {error ? <Banner tone="danger" description={error} /> : null}

      <Confirm
        open={confirm === 'archive'}
        title="Archive this project?"
        body={`“${title}” moves to the archived list. Nothing is deleted, and its ${openTasks} open ${
          openTasks === 1 ? 'task stays' : 'tasks stay'
        } exactly where ${openTasks === 1 ? 'it is' : 'they are'}. You can restore it any time.`}
        action="Archive"
        pending={pending}
        onCancel={() => setConfirm(null)}
        onConfirm={archive}
      />

      <Confirm
        open={confirm === 'delete'}
        title="Delete this project?"
        body={`“${title}” and its phases leave projects.json. ${describeKept(openTasks, notes)} A snapshot is taken before every write, so npm run vault:restore can bring the project back — nothing in the app can.`}
        action="Delete project"
        pending={pending}
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          run(
            () => deleteProjectAction(id),
            () => router.push('/projects'),
          )
        }
      />
    </Stack>
  );
}

/** What survives, counted. "Nothing else is affected" when there is nothing to count. */
function describeKept(openTasks: number, notes: number): string {
  const parts: string[] = [];
  if (openTasks) parts.push(`${openTasks} open ${openTasks === 1 ? 'task' : 'tasks'}`);
  if (notes) parts.push(`${notes} ${notes === 1 ? 'note' : 'notes'}`);
  if (parts.length === 0) return 'Nothing else is affected.';
  const total = openTasks + notes;
  return `Its ${parts.join(' and ')} ${total === 1 ? 'stays' : 'stay'} where ${
    total === 1 ? 'it is' : 'they are'
  } and simply ${total === 1 ? 'loses' : 'lose'} the project.`;
}
