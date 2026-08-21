import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetConfig } from '@/lib/env';

/**
 * Everything you write about a person yourself: the prose, the links, and the
 * pay rises you are planning. BambooHR does not know any of it and cannot give
 * it back, so this is the store where a bug costs something nobody can restore.
 *
 * It had no direct test. The MCP tests call some of these functions, but they
 * are checking the MCP wiring, not these rules.
 */
let dir: string;

const read = (rel: string) => JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8'));

const person = (slug: string) => ({
  slug,
  displayName: slug,
  hr: {
    jobTitle: null,
    department: null,
    hireDate: null,
    supervisorEmployeeId: null,
    workEmail: null,
    workPhone: null,
    employeeId: null,
  },
  mine: { contactCadenceDays: 14, growth: { currentLevel: null, targetLevel: null } },
  status: 'active',
});

async function people() {
  const { invalidateVault } = await import('@/lib/vault/index');
  invalidateVault();
  return import('@/lib/vault/people');
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-people-'));
  fs.mkdirSync(path.join(dir, 'people/ana-horvat'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'notes/inbox'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'people/entries.json'), JSON.stringify([person('ana-horvat')]));
  fs.writeFileSync(path.join(dir, 'tasks.json'), '[]\n');
  fs.writeFileSync(path.join(dir, 'time.json'), '[]\n');
  fs.writeFileSync(path.join(dir, 'config.json'), '{"dataVersion":1}\n');
  process.env.VAULT_PATH = dir;
  resetConfig();
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  delete process.env.VAULT_PATH;
  resetConfig();
});

describe('who can be written to', () => {
  it('refuses a slug that is not in the roster', async () => {
    const { addLink, addPlan, saveAbout } = await people();

    // Otherwise a typo creates a folder for somebody who does not exist, and
    // their notes go somewhere nobody will look.
    await expect(addLink('ana-hovrat', 'Docs', 'https://example.com')).rejects.toThrow(
      /No person with the slug/,
    );
    await expect(
      addPlan('ana-hovrat', { amount: 100, month: 4, year: 2026, promotion: '' }),
    ).rejects.toThrow(/No person with the slug/);
    await expect(saveAbout('ana-hovrat', 'text')).rejects.toThrow(/No person with the slug/);

    expect(fs.existsSync(path.join(dir, 'people/ana-hovrat'))).toBe(false);
  });
});

describe('links', () => {
  it('refuses anything that is not http or https', async () => {
    const { addLink } = await people();

    // A javascript: URL has no business in a vault, and the rest would be
    // blocked on click anyway.
    for (const bad of ['javascript:alert(1)', 'file:///etc/passwd', 'example.com', '']) {
      await expect(addLink('ana-horvat', 'x', bad)).rejects.toThrow(/http:\/\/ or https:\/\//);
    }
    expect(fs.existsSync(path.join(dir, 'people/ana-horvat/links.json'))).toBe(false);
  });

  it('falls back to the host when no label is given', async () => {
    const { addLink } = await people();
    await addLink('ana-horvat', '   ', 'https://github.com/ana/notes');

    expect(read('people/ana-horvat/links.json')).toEqual([
      { label: 'github.com', url: 'https://github.com/ana/notes' },
    ]);
  });

  it('keeps the label and the url as given, trimmed', async () => {
    const { addLink } = await people();
    await addLink('ana-horvat', '  Design doc  ', '  https://example.com/d  ');

    expect(read('people/ana-horvat/links.json')[0]).toEqual({
      label: 'Design doc',
      url: 'https://example.com/d',
    });
  });

  it('removes by position, and leaves the rest in order', async () => {
    const { addLink, removeLink } = await people();
    await addLink('ana-horvat', 'One', 'https://example.com/1');
    await addLink('ana-horvat', 'Two', 'https://example.com/2');
    await addLink('ana-horvat', 'Three', 'https://example.com/3');

    await removeLink('ana-horvat', 1);

    expect(read('people/ana-horvat/links.json').map((l: { label: string }) => l.label)).toEqual([
      'One',
      'Three',
    ]);
  });

  it('does nothing rather than something wrong when the position is not there', async () => {
    const { addLink, removeLink } = await people();
    await addLink('ana-horvat', 'One', 'https://example.com/1');

    await removeLink('ana-horvat', 7);
    expect(read('people/ana-horvat/links.json')).toHaveLength(1);
  });
});

describe('planned rises', () => {
  const plan = (
    over: Partial<{ amount: number; month: number; year: number; promotion: string }>,
  ) => ({ amount: 4200, month: 4, year: 2026, promotion: '', ...over });

  it('needs a real amount', async () => {
    const { addPlan } = await people();
    for (const amount of [0, -100, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(addPlan('ana-horvat', plan({ amount }))).rejects.toThrow(/needs an amount/);
    }
    expect(fs.existsSync(path.join(dir, 'people/ana-horvat/plans.json'))).toBe(false);
  });

  it('names a rise by when it happens', async () => {
    const { addPlan } = await people();
    await addPlan('ana-horvat', plan({ month: 4, year: 2026 }));
    expect(read('people/ana-horvat/plans.json')[0].id).toBe('2026-04-rise');
  });

  it('names a promotion by what it is called', async () => {
    const { addPlan } = await people();
    await addPlan('ana-horvat', plan({ promotion: 'Senior Staff Engineer' }));
    expect(read('people/ana-horvat/plans.json')[0].id).toBe('2026-04-senior-staff-engineer');
  });

  it('does not let two rises in one month collide', async () => {
    const { addPlan } = await people();
    await addPlan('ana-horvat', plan({ amount: 4200 }));
    await addPlan('ana-horvat', plan({ amount: 4400 }));

    const ids = read('people/ana-horvat/plans.json').map((p: { id: string }) => p.id);
    // Without the suffix the second write would replace the first, silently.
    expect(new Set(ids).size).toBe(2);
    expect(read('people/ana-horvat/plans.json')).toHaveLength(2);
  });

  it('keeps the soonest first', async () => {
    const { addPlan } = await people();
    await addPlan('ana-horvat', plan({ month: 1, year: 2027, promotion: 'a' }));
    await addPlan('ana-horvat', plan({ month: 9, year: 2026, promotion: 'b' }));
    await addPlan('ana-horvat', plan({ month: 12, year: 2026, promotion: 'c' }));

    expect(read('people/ana-horvat/plans.json').map((p: { id: string }) => p.id)).toEqual([
      '2027-01-a',
      '2026-12-c',
      '2026-09-b',
    ]);
  });

  it('removes by id, not by position', async () => {
    const { addPlan, removePlan } = await people();
    await addPlan('ana-horvat', plan({ promotion: 'first' }));
    await addPlan('ana-horvat', plan({ month: 9, promotion: 'second' }));

    await removePlan('ana-horvat', '2026-04-first');

    const left = read('people/ana-horvat/plans.json');
    expect(left).toHaveLength(1);
    expect(left[0].id).toBe('2026-09-second');
  });
});

describe('about', () => {
  it('writes the prose and always ends it with a newline', async () => {
    const { saveAbout } = await people();
    await saveAbout('ana-horvat', '# Ana\n\nWants platform work.');

    expect(fs.readFileSync(path.join(dir, 'people/ana-horvat/about.md'), 'utf8')).toBe(
      '# Ana\n\nWants platform work.\n',
    );
  });

  it('does not double the newline it already has', async () => {
    const { saveAbout } = await people();
    await saveAbout('ana-horvat', 'One line.\n');
    expect(fs.readFileSync(path.join(dir, 'people/ana-horvat/about.md'), 'utf8')).toBe(
      'One line.\n',
    );
  });

  it('keeps the previous version aside', async () => {
    const { saveAbout } = await people();
    await saveAbout('ana-horvat', 'First.');
    await saveAbout('ana-horvat', 'Second.');

    const snapshots = fs.readdirSync(path.join(dir, '.snapshots/people/ana-horvat/about.md'));
    expect(snapshots.length).toBeGreaterThan(0);
  });
});

describe('a link file that cannot be read costs only itself', () => {
  it('keeps the row it cannot parse and still adds the new one', async () => {
    const { addLink } = await people();
    fs.writeFileSync(
      path.join(dir, 'people/ana-horvat/links.json'),
      JSON.stringify([{ label: 'Good', url: 'https://example.com/1' }, { nonsense: true }]),
    );

    await addLink('ana-horvat', 'New', 'https://example.com/2');

    const saved = read('people/ana-horvat/links.json');
    expect(saved).toHaveLength(3);
    expect(saved).toContainEqual({ nonsense: true });
  });
});
