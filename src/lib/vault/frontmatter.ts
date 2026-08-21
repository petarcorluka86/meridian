/**
 * Hand-rolled rather than pulling in a YAML parser: a note's front matter carries
 * exactly three scalar keys, and a full YAML engine is attack surface plus a
 * dependency that can reformat a file the user hand-wrote.
 *
 * A note with no front matter still opens — it is treated as generic and not a draft.
 */
export type Frontmatter = Record<string, string | boolean>;

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseFrontmatter(source: string): { data: Frontmatter; body: string } {
  const match = FENCE.exec(source);
  if (!match) return { data: {}, body: source };

  const data: Frontmatter = {};
  for (const raw of (match[1] ?? '').split('\n')) {
    const line = stripComment(raw).trim();
    if (!line) continue;
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!key) continue;
    data[key] = value === 'true' ? true : value === 'false' ? false : value;
  }
  return { data, body: source.slice(match[0].length) };
}

/** `# ` only counts as a comment when it follows whitespace, so `title: a#b` survives. */
function stripComment(line: string): string {
  const at = line.search(/(^|\s)#/);
  return at < 0 ? line : line.slice(0, at);
}

export function serializeFrontmatter(data: Frontmatter, body: string): string {
  const keys = Object.keys(data).filter((k) => data[k] !== undefined && data[k] !== '');
  if (keys.length === 0) return body;
  const lines = keys.map((k) => `${k}: ${String(data[k])}`);
  return `---\n${lines.join('\n')}\n---\n${body.startsWith('\n') ? body.slice(1) : body}`;
}
