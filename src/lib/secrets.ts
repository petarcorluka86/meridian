/**
 * Refuses to commit a credential into the vault.
 *
 * The vault is a git repository that can have a remote, and it is written by
 * hand, by an agent, and by paste. A key that reaches a commit is a key that has
 * to be rotated, and a key that reaches a push is one that has left the machine.
 *
 * The patterns are the shapes that are unambiguous — a prefix and a length that
 * nothing else produces. Deliberately not "any long random string": a check that
 * blocks ordinary notes gets turned off, and a check that is off protects
 * nothing.
 */

export type SecretHit = { file: string; line: number; what: string };

const PATTERNS: Array<{ what: string; re: RegExp }> = [
  { what: 'a GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { what: 'a GitHub fine-grained token', re: /\bgithub_pat_[A-Za-z0-9_]{60,}\b/ },
  { what: 'a Google API key', re: /\bAIza[0-9A-Za-z\-_]{35}\b/ },
  { what: 'a Google OAuth client secret', re: /\bGOCSPX-[A-Za-z0-9\-_]{20,}\b/ },
  { what: 'a Slack token', re: /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/ },
  { what: 'an AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { what: 'a private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  // Not a shape but a name: a .env pasted into a note keeps its key names.
  {
    what: 'an API key assignment',
    re: /\b[A-Z][A-Z0-9_]*(?:API_KEY|SECRET|TOKEN|PASSWORD)\s*=\s*\S/,
  },
];

/** Every credential shape in one file's text, with the line it sits on. */
export function scanText(file: string, text: string): SecretHit[] {
  const hits: SecretHit[] = [];
  const lines = text.split('\n');

  for (const [index, line] of lines.entries()) {
    for (const { what, re } of PATTERNS) {
      if (re.test(line)) {
        hits.push({ file, line: index + 1, what });
        // One report per line is enough to stop the commit; listing every
        // pattern that matched the same line only makes the message longer.
        break;
      }
    }
  }
  return hits;
}

/** The refusal a person reads. Never quotes the value it found. */
export function refusalFor(hits: SecretHit[]): string {
  const where = hits
    .slice(0, 5)
    .map((h) => `  ${h.file}:${h.line} — looks like ${h.what}`)
    .join('\n');
  const more = hits.length > 5 ? `\n  …and ${hits.length - 5} more` : '';

  return [
    'Refusing to save: this looks like a credential.',
    '',
    where + more,
    '',
    'Credentials belong in .env, never in the vault — the vault can have a remote.',
    'Remove it, then save again. If it is a false alarm, edit the line so it does',
    'not read as a key.',
  ].join('\n');
}
