'use client';

import { useRef } from 'react';
import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';

type Props = {
  open: boolean;
  title: string;
  body: string;
  action: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * The destructive confirmation, which is `Dialog` with the two buttons this app
 * always uses. Its copy names what is at stake rather than asking "are you
 * sure": the title is the question, the body is what will actually happen, and
 * the button says the verb.
 */
export function Confirm({ open, title, body, action, pending, onCancel, onConfirm }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      open={open}
      title={title}
      tone="danger"
      onClose={onCancel}
      initialFocus={confirmRef}
      footer={
        <>
          <Button variant="neutral" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} pending={pending} focusRef={confirmRef}>
            {pending ? 'Working…' : action}
          </Button>
        </>
      }
    >
      {body}
    </Dialog>
  );
}
