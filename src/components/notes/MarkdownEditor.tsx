'use client';

import { useMemo } from 'react';
import Prism from 'prismjs/components/prism-core';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-markdown';
import styles from './MarkdownEditor.module.css';

/**
 * The writing surface: a textarea with its own text coloured underneath it.
 *
 * A textarea cannot colour what is in it, so this is the one technique that
 * works — a `pre` painted with the highlighted Markdown, and the real textarea
 * laid over it with transparent text and a visible caret. The two share a font,
 * a measure and a wrapping rule, which is the whole of what keeps them aligned;
 * changing either one's type without the other is what makes the caret drift.
 *
 * Two things fall out of it for free. The `pre` sizes the box, so the editor
 * grows with the note instead of scrolling inside itself. And every key still
 * belongs to a real textarea — Tab, ⌘S, Escape, the undo stack, spellcheck —
 * rather than to a contenteditable pretending to be one.
 *
 * Prism escapes the text it tokenises, so the painted copy of somebody's own
 * note cannot become markup. It is the same trust boundary the preview has, one
 * step earlier.
 */
export function MarkdownEditor({
  value,
  onChange,
  onKeyDown,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  ariaLabel: string;
}) {
  // The trailing newline is load-bearing: a `pre` drops the last one, so without
  // it the box is a line short of the text exactly when the caret is on a fresh
  // final line — the one moment the writer is looking at it.
  const painted = useMemo(
    () => `${Prism.highlight(value, Prism.languages.markdown!, 'markdown')}\n`,
    [value],
  );

  return (
    <div className={styles.editor}>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Prism escapes the text it tokenises, and this is the note's own body */}
      <pre className={styles.paint} aria-hidden dangerouslySetInnerHTML={{ __html: painted }} />
      <textarea
        className={styles.input}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        spellCheck={false}
      />
    </div>
  );
}
