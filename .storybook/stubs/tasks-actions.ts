import { action } from 'storybook/actions';

/**
 * Stands in for the Server Actions of the same names so `TaskRow` and the dialog
 * it opens can be rendered outside a request. Every call lands in the Actions
 * panel instead of the vault.
 *
 * The module has to export all three: `TaskRow` imports the toggle, and the
 * dialog behind its pencil imports the other two. A missing one is not a type
 * error here — the alias hides it until somebody presses the button.
 */
export async function toggleTaskAction(id: string, done: boolean): Promise<void> {
  action('toggleTaskAction')(id, done);
}

type Result = { ok: true } | { ok: false; message: string };

export async function editTaskAction(id: string, patch: unknown): Promise<Result> {
  action('editTaskAction')(id, patch);
  return { ok: true };
}

export async function deleteTaskAction(id: string): Promise<Result> {
  action('deleteTaskAction')(id);
  return { ok: true };
}
