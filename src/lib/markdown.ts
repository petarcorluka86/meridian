import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

/**
 * Notes are the manager's own Markdown, but they can also arrive from an editor, an
 * agent, or a paste. Sanitised on render regardless — the CSP would stop a script
 * from doing much, but a note is never allowed to inject markup either way.
 */
const schema = {
  ...defaultSchema,
  tagNames: [
    'p',
    'br',
    'strong',
    'em',
    'del',
    'code',
    'pre',
    'blockquote',
    'h1',
    'h2',
    'h3',
    'h4',
    'ul',
    'ol',
    'li',
    'hr',
    'a',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: ['href'],
  },
  // Scheme allow-listing is what actually stops javascript: and data: links.
  protocols: { ...defaultSchema.protocols, href: ['http', 'https', 'mailto'] },
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize, schema)
  .use(rehypeStringify);

export function renderMarkdown(source: string): string {
  return String(processor.processSync(source));
}

/** The title is the first heading; the body is what is left for the editor. */
export function splitTitle(source: string): { title: string; body: string } {
  const match = /^#\s+(.+?)\s*(?:\r?\n|$)/.exec(source);
  if (!match) return { title: '', body: source };
  return { title: match[1]!.trim(), body: source.slice(match[0].length).replace(/^\r?\n/, '') };
}
