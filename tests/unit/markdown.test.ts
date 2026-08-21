import { describe, expect, it } from 'vitest';
import { renderMarkdown, splitTitle } from '@/lib/markdown';

/**
 * Note bodies are rendered with dangerouslySetInnerHTML in two places —
 * NoteEditor and AboutCard — and the only thing between them and the DOM is the
 * allow-list in lib/markdown.ts. It had no test, so widening `tagNames` or
 * adding `allowDangerousHtml` broke nothing red.
 *
 * The threat is not a manager attacking themselves. It is that a note arrives
 * from an agent, an editor, or a paste, and this origin can drive every Server
 * Action in the app.
 */
describe('what a note may not render', () => {
  it('drops a script tag', () => {
    const html = renderMarkdown('# Title\n\n<script>alert(1)</script>\n');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert(1)');
  });

  it('drops an event handler on an allowed tag', () => {
    const html = renderMarkdown('<img src="x" onerror="alert(1)">\n');
    expect(html).not.toContain('onerror');
  });

  it('drops an iframe and an object', () => {
    const html = renderMarkdown('<iframe src="https://example.com"></iframe>\n<object></object>\n');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('<object');
  });

  it('keeps a javascript: link from becoming a link', () => {
    // The scheme allow-list, not the tag list, is what stops this one.
    const html = renderMarkdown('[click](javascript:alert(1))\n');
    expect(html).not.toContain('javascript:');
  });

  it('keeps a data: link out too', () => {
    const html = renderMarkdown('[click](data:text/html,<script>alert(1)</script>)\n');
    expect(html).not.toContain('data:text/html');
  });

  it('leaves no way to set a style attribute', () => {
    const html = renderMarkdown('<p style="position:fixed;inset:0">covered</p>\n');
    expect(html).not.toContain('style=');
  });
});

describe('what a note may render', () => {
  it('keeps an ordinary link, and mailto', () => {
    expect(renderMarkdown('[docs](https://example.com/a)\n')).toContain(
      'href="https://example.com/a"',
    );
    expect(renderMarkdown('[mail](mailto:a@b.c)\n')).toContain('href="mailto:a@b.c"');
  });

  it('keeps the GFM a manager actually writes', () => {
    const html = renderMarkdown(
      ['| a | b |', '| --- | --- |', '| 1 | 2 |', '', '- one', '- two', '', '~~gone~~', ''].join(
        '\n',
      ),
    );
    expect(html).toContain('<table>');
    expect(html).toContain('<del>');
    expect(html).toContain('<li>one</li>');
  });

  it('renders a task list as text, because input is not on the list', () => {
    // Not a bug to fix — a checkbox that cannot be clicked back into the file
    // would be worse. Written down because the next person to widen tagNames
    // will be looking at exactly this.
    const html = renderMarkdown('- [ ] todo\n- [x] done\n');
    expect(html).not.toContain('<input');
    expect(html).toContain('todo');
  });

  it('keeps code blocks as text rather than markup', () => {
    const html = renderMarkdown('```\n<script>alert(1)</script>\n```\n');
    expect(html).toContain('<pre>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&#x3C;script>');
  });
});

describe('splitting the title off', () => {
  it('takes the first heading and leaves the rest for the editor', () => {
    expect(splitTitle('# Talked about scope\n\nBody line\n')).toEqual({
      title: 'Talked about scope',
      body: 'Body line\n',
    });
  });

  it('leaves a body with no heading alone', () => {
    expect(splitTitle('Just a body\n')).toEqual({ title: '', body: 'Just a body\n' });
  });
});
