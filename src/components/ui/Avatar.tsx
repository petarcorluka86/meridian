import { initials } from '@/components/people/avatar';
import styles from './Avatar.module.css';

/**
 * Four sizes, named by the row they go in rather than by a number: `sm` in a
 * dense row (a task, a table), `md` in a row about a person, `lg` on a person's
 * page, `xl` on the roster card that is only that person.
 *
 * The monogram is always rendered and the photo is layered over it, so a photo
 * that fails to load leaves the initials rather than an empty circle. It used to
 * be one or the other, which meant a path that had gone stale showed nothing at
 * all.
 *
 * The photo is served from `.cache/photos/` through the app's own route — never
 * fetched from the internet, which the CSP forbids and the privacy promise rules
 * out.
 */
export function Avatar({
  name,
  photo,
  size = 'md',
}: {
  name: string;
  photo: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  return (
    <span className={styles.avatar} data-size={size} aria-hidden>
      {initials(name)}
      {photo ? (
        // biome-ignore lint/performance/noImgElement: next/image would optimise through a loader; this is a 32px file already on disk, served by the app's own route, and the optimiser would be a second copy of it in .next
        <img
          className={styles.photo}
          src={`/vault-file?path=${encodeURIComponent(photo)}`}
          alt=""
        />
      ) : null}
    </span>
  );
}
