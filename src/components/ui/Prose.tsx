import styles from './Prose.module.css';

/**
 * Rendered Markdown. There is no variant: a note and an About look identical,
 * because they are the same kind of thing and the reader should not have to work
 * out which one they are looking at.
 *
 * `html` has already been through `rehype-sanitize` by the time it arrives —
 * this component does not sanitise and must never be handed anything raw.
 */
export function Prose({ html }: { html: string }) {
  // biome-ignore lint/security/noDangerouslySetInnerHtml: rendered Markdown, sanitised by rehype-sanitize in lib/markdown
  return <div className={styles.prose} dangerouslySetInnerHTML={{ __html: html }} />;
}
