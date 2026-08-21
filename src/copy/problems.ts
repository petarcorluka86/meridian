/**
 * What the app says when it cannot read part of the vault.
 *
 * These matter more than the empty states they replace. A file the app cannot
 * parse used to render as "No tasks yet. Add the first one above." — which is
 * not a smaller version of the truth, it is the opposite of it, and it sends
 * somebody to add a task on top of data they still have and cannot see.
 */
export const PROBLEMS = {
  one: 'One file in your vault cannot be read.',
  many: (n: number) => `${n} files in your vault cannot be read.`,
  reassurance:
    'Everything else still works, and nothing has been changed. What the app cannot read, it also never overwrites.',
  action: 'Run npm run vault:doctor in the app folder for the same list in a terminal.',
} as const;
