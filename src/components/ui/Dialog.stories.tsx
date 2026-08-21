import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { Confirm } from '@/components/Confirm';
import { Note, Section, Doc } from '@/stories/Showcase';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { Text } from './Text';

/**
 * The one modal in the app. Escape closes it, a click on the scrim closes it, a
 * click that started inside it does not, and `initialFocus` takes focus on open.
 *
 * A dialog is for a decision that cannot be undone, or for the one form with
 * nowhere on the page to live — editing a task, which is reachable from three
 * screens and cannot expand a row on any of them. Anything else belongs on the
 * page.
 *
 * The body is passed through as given, so a sentence arrives wrapped in `Text`
 * and a form arrives as fields.
 */
const meta = {
  title: 'Components/Dialog',
  component: Dialog,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Dialog>;

export default meta;

const BODY =
  'This sends 14 files to origin — every note, task and plan in the vault, including salaries and planned rises. Nothing is redacted.';

export const Danger: StoryObj = {
  name: 'tone="danger"',
  render: () => (
    <Dialog
      open
      title="Push to the remote?"
      tone="danger"
      onClose={() => {}}
      footer={
        <>
          <Button variant="neutral">Cancel</Button>
          <Button variant="danger">Push to origin</Button>
        </>
      }
    >
      <Text level="body" tone="muted">
        {BODY}
      </Text>
    </Dialog>
  ),
};

export const Neutral: StoryObj = {
  name: 'tone="neutral"',
  render: () => (
    <Dialog
      open
      title="Restore this file?"
      onClose={() => {}}
      footer={
        <>
          <Button variant="neutral">Cancel</Button>
          <Button variant="primary">Restore</Button>
        </>
      }
    >
      <Text level="body" tone="muted">
        The snapshot from 19 August 09:12 replaces what is on disk now. The current version is
        snapshotted first, so this is reversible.
      </Text>
    </Dialog>
  ),
};

export const Confirmation: StoryObj = {
  name: 'Confirm — the destructive one',
  render: () => {
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(false);
    return (
      <div style={{ padding: 'var(--space-5)' }}>
        <Doc>
          <Section
            title="Escape closes it, and the confirm button has focus on open"
            note="Confirm is Dialog with the two buttons this app always uses. Its copy names what is at stake rather than asking “are you sure”: the title is the question, the body is what will actually happen, and the button says the verb."
          >
            <Button variant="primary" onClick={() => setOpen(true)}>
              Push to the remote
            </Button>
          </Section>
          <Note>
            Two things open a dialog: pushing to the remote, which is this one, and the pencil on a
            task row, which opens a form rather than a question. A red button exists only in the two
            of them.
          </Note>
        </Doc>
        <Confirm
          open={open}
          title="Push to the remote?"
          body={BODY}
          action="Push to origin"
          pending={pending}
          onCancel={() => {
            setOpen(false);
            setPending(false);
          }}
          onConfirm={() => setPending(true)}
        />
      </div>
    );
  },
};
