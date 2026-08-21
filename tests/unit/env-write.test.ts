import { describe, expect, it } from 'vitest';
import { applyEnvEdits } from '@/lib/env-write';

const FILE = `# vault
VAULT_PATH=~/meridian/vault

# server
HOST=127.0.0.1
PORT=3210

# BambooHR (read only)
# BAMBOOHR_SUBDOMAIN=yourcompany
# BAMBOOHR_API_KEY=
BAMBOOHR_MAX_AGE=3600            # roster and pay tables
`;

describe('applyEnvEdits', () => {
  it('replaces a key in place, leaving everything else byte-identical', () => {
    const out = applyEnvEdits(FILE, { PORT: '4000' });
    expect(out).toContain('PORT=4000');
    expect(out.replace('PORT=4000', 'PORT=3210')).toBe(FILE);
  });

  it('uncomments a key the user was told to fill in', () => {
    const out = applyEnvEdits(FILE, { BAMBOOHR_SUBDOMAIN: 'yourcompany' });
    expect(out).toContain('\nBAMBOOHR_SUBDOMAIN=yourcompany\n');
    expect(out).not.toContain('# BAMBOOHR_SUBDOMAIN=');
  });

  it('keeps comments, blank lines and ordering', () => {
    const out = applyEnvEdits(FILE, { VAULT_PATH: '/tmp/v', BAMBOOHR_API_KEY: 'k' });
    expect(out).toContain('# vault');
    expect(out).toContain('# server');
    expect(out).toContain('# BambooHR (read only)');
    // Order is preserved: vault before server before BambooHR.
    expect(out.indexOf('VAULT_PATH')).toBeLessThan(out.indexOf('HOST'));
    expect(out.indexOf('HOST')).toBeLessThan(out.indexOf('BAMBOOHR_API_KEY'));
  });

  it('appends a key that is not in the file, under a heading', () => {
    const out = applyEnvEdits(FILE, { GITHUB_TOKEN: 'ghp_x' });
    expect(out).toContain('# Added by the setup wizard');
    expect(out.trimEnd().endsWith('GITHUB_TOKEN=ghp_x')).toBe(true);
  });

  it('does not touch a trailing comment on another line', () => {
    const out = applyEnvEdits(FILE, { PORT: '4000' });
    expect(out).toContain('BAMBOOHR_MAX_AGE=3600            # roster and pay tables');
  });

  it('leaves a key alone when it is not being edited', () => {
    const out = applyEnvEdits(FILE, { PORT: '4000' });
    expect(out).toContain('HOST=127.0.0.1');
  });

  it('handles an empty file', () => {
    const out = applyEnvEdits('', { VAULT_PATH: '/tmp/v' });
    expect(out).toContain('VAULT_PATH=/tmp/v');
  });

  it('never writes the same key twice', () => {
    const out = applyEnvEdits(FILE, { PORT: '4000', BAMBOOHR_API_KEY: 'k' });
    expect(out.match(/^PORT=/gm)).toHaveLength(1);
    expect(out.match(/^BAMBOOHR_API_KEY=/gm)).toHaveLength(1);
  });
});

describe('name matching in the wizard', () => {
  it('finds a name typed without its diacritics', async () => {
    // The same fold the wizard uses, asserted through the slug helper that
    // shares its rules — Croatian names are the common case here.
    const { slugifyTitle } = await import('@/lib/vault/notes');
    expect(slugifyTitle('Ćorluka')).toBe('corluka');
    expect(slugifyTitle('Šimić')).toBe('simic');
    expect(slugifyTitle('Đurđević')).toBe('durdevic');
    expect(slugifyTitle('Jeržabek')).toBe('jerzabek');
  });
});
