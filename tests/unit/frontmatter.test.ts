import { describe, expect, it } from 'vitest';
import { parseFrontmatter, serializeFrontmatter } from '@/lib/vault/frontmatter';

describe('frontmatter', () => {
  it('reads the three keys a note carries', () => {
    const { data, body } = parseFrontmatter(
      '---\ncategory: 1on1\ndraft: false\npinned: true\n---\n# Title\n\nBody.\n',
    );
    expect(data).toEqual({ category: '1on1', draft: false, pinned: true });
    expect(body).toBe('# Title\n\nBody.\n');
  });

  it('treats a note with no front matter as plain content', () => {
    const { data, body } = parseFrontmatter('# Just a note\n');
    expect(data).toEqual({});
    expect(body).toBe('# Just a note\n');
  });

  it('strips a trailing comment but keeps a hash inside a value', () => {
    const { data } = parseFrontmatter('---\ncategory: idea # while unfiled\ntitle: a#b\n---\nx');
    expect(data.category).toBe('idea');
    expect(data.title).toBe('a#b');
  });

  it('round-trips', () => {
    const source = serializeFrontmatter(
      { category: 'feedback', draft: true, pinned: false },
      '# X\n',
    );
    expect(parseFrontmatter(source).data).toEqual({
      category: 'feedback',
      draft: true,
      pinned: false,
    });
  });

  it('omits front matter entirely when there is nothing to write', () => {
    expect(serializeFrontmatter({}, '# X\n')).toBe('# X\n');
  });
});
