import { action } from 'storybook/actions';

/**
 * Stands in for the Server Action of the same name so `TaskRow` can be rendered
 * outside a request. The toggle lands in the Actions panel instead of the vault.
 */
export async function toggleTaskAction(id: string, done: boolean): Promise<void> {
  action('toggleTaskAction')(id, done);
}
