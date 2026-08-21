import { describe, expect, it } from 'vitest';
import { refusalFor, scanText } from '@/lib/secrets';

/**
 * The vault can have a remote. A credential that reaches a commit has to be
 * rotated; one that reaches a push has left the machine.
 *
 * The second half of this file matters as much as the first: a check that stops
 * ordinary notes gets switched off, and a check that is off protects nothing.
 */

const found = (text: string) => scanText('note.md', text).map((h) => h.what);

describe('shapes that are refused', () => {
  it('catches the tokens a manager is most likely to paste', () => {
    expect(found(`GITHUB_TOKEN=ghp_${'a'.repeat(36)}`)).toContain('a GitHub token');
    expect(found(`token: github_pat_${'b'.repeat(60)}`)).toContain('a GitHub fine-grained token');
    expect(found(`key AIza${'C'.repeat(35)} here`)).toContain('a Google API key');
    expect(found(`GOCSPX-${'d'.repeat(24)}`)).toContain('a Google OAuth client secret');
    expect(found(`xoxb-${'1'.repeat(20)}`)).toContain('a Slack token');
    expect(found(`AKIA${'E'.repeat(16)}`)).toContain('an AWS access key id');
  });

  it('catches a private key block', () => {
    expect(found('-----BEGIN OPENSSH PRIVATE KEY-----')).toContain('a private key block');
    expect(found('-----BEGIN PRIVATE KEY-----')).toContain('a private key block');
  });

  it('catches a .env pasted into a note, by its key names', () => {
    // The values may be redacted or fake; the shape of the paste is the tell.
    expect(found('BAMBOOHR_API_KEY=whatever')).toContain('an API key assignment');
    expect(found('SOME_SECRET = x')).toContain('an API key assignment');
    expect(found('DB_PASSWORD=hunter2')).toContain('an API key assignment');
  });

  it('reports the line, so it can be found', () => {
    const hits = scanText('notes/general/a.md', `one\ntwo\nAKIA${'F'.repeat(16)}\nfour`);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.line).toBe(3);
    expect(hits[0]?.file).toBe('notes/general/a.md');
  });

  it('reports a line once, however many patterns it matches', () => {
    expect(scanText('a.md', `GITHUB_TOKEN=ghp_${'a'.repeat(36)}`)).toHaveLength(1);
  });
});

describe('what it must not refuse', () => {
  it('leaves an ordinary note alone', () => {
    const note = [
      '# 1:1 with Ana',
      '',
      'She wants to move towards platform work. Agreed a rise of 4200 from April,',
      'and to revisit the level in six months. Her PASSWORD manager is fine, she',
      'just needs access to the staging environment.',
      '',
      'Follow up: talk to Marko about the handover.',
    ].join('\n');
    expect(scanText('note.md', note)).toEqual([]);
  });

  it('leaves prose about secrets alone', () => {
    // Talking about a token is not pasting one.
    expect(found('He rotated the GitHub token after the leak.')).toEqual([]);
    expect(found('Ask IT for an API key for the reporting tool.')).toEqual([]);
    expect(found('The secret is that nobody reads the changelog.')).toEqual([]);
  });

  it('leaves a short random-looking string alone', () => {
    // Deliberately not "any long base64 blob": a commit hash, a UUID and a slug
    // all look like that, and a check that fires on those gets turned off.
    expect(found('commit 9ea8008af7ebc00664dfd08d43a2f17eb50c9d8')).toEqual([]);
    expect(found('id: 3f2504e0-4f89-11d3-9a0c-0305e82c3301')).toEqual([]);
    expect(found('ghp_short')).toEqual([]);
  });
});

describe('the refusal a person reads', () => {
  const hits = scanText('notes/general/oops.md', `AKIA${'G'.repeat(16)}`);

  it('says where, and what it looks like', () => {
    const message = refusalFor(hits);
    expect(message).toContain('notes/general/oops.md:1');
    expect(message).toContain('an AWS access key id');
    expect(message).toContain('Credentials belong in .env');
  });

  it('never quotes the value it found', () => {
    // A refusal that echoes the key puts it in a terminal, a scrollback and
    // possibly a bug report.
    expect(refusalFor(hits)).not.toContain('AKIA');
  });

  it('does not list a hundred lines', () => {
    const many = scanText(
      'a.md',
      Array(30)
        .fill(`AKIA${'H'.repeat(16)}`)
        .join('\n'),
    );
    const message = refusalFor(many);
    expect(message).toContain('…and 25 more');
    expect(message.split('\n').length).toBeLessThan(20);
  });
});
