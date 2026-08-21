import styles from './EmptyState.module.css';
import { Stack } from './Layout';
import { Text } from './Text';

/**
 * What a card says when it has nothing to show.
 *
 * The words always come from `src/copy/empty.ts`, never from the call site: two
 * screens describing the same emptiness differently is how somebody learns to
 * distrust both.
 *
 * With `title` and `action` it becomes the fuller shape a card uses the first
 * time somebody opens it — what is missing, why it is worth having, and the one
 * button that starts it.
 *
 * An unreadable file is not an empty state — it is the opposite claim, and it
 * gets a `Banner` naming the file. Rendering "No tasks yet" over a `tasks.json`
 * the app cannot parse sends somebody to add a task on top of data they still
 * have and cannot see.
 */
export function EmptyState({
  children,
  title,
  action,
  size = 'md',
  standalone,
}: {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
  size?: 'md' | 'lg';
  standalone?: boolean;
}) {
  return (
    <div className={styles.empty} data-size={size} data-standalone={standalone || undefined}>
      <Stack gap={3} align="start">
        {title ? (
          <Text level="label" tone="strong">
            {title}
          </Text>
        ) : null}
        <div className={styles.copy}>
          <Text level={size === 'lg' ? 'body' : 'small'} tone="muted">
            {children}
          </Text>
        </div>
        {action}
      </Stack>
    </div>
  );
}
