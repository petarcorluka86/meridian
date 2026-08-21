import styles from './Rail.module.css';

export type Priority = 'urgent' | 'important' | 'normal';

export function Rail({ priority, done }: { priority: Priority; done?: boolean }) {
  return (
    <span
      className={styles.rail}
      data-priority={priority}
      data-done={done || undefined}
      aria-hidden
    />
  );
}
