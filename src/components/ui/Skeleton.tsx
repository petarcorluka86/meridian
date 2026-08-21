import styles from './Skeleton.module.css';

/**
 * Shown only when there is no cache to paint from — a first ever load, before a
 * source has ever answered. A revalidation of data already on screen never
 * blanks it; the freshness pill carries that state instead.
 */
export function SkeletonRows({ rows = 3, avatar = false }: { rows?: number; avatar?: boolean }) {
  return (
    <div aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: placeholder rows have no identity but their position
        <div key={i} className={styles.row}>
          {avatar ? <span className={styles.avatar} /> : null}
          <span className={styles.lines}>
            <span className={styles.line} style={{ width: `${72 - i * 9}%` }} />
            <span className={styles.lineShort} style={{ width: `${38 - i * 5}%` }} />
          </span>
        </div>
      ))}
      <span className={styles.srOnly} role="status">
        Loading…
      </span>
    </div>
  );
}
