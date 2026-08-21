import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetConfig } from '@/lib/env';
import type { PersonEntry } from '@/lib/vault/schemas';

/**
 * The BambooHR sync writes the roster, and had no test.
 *
 * Two facts about this API shape the whole thing. The directory reports a
 * supervisor by *name*, not id — 0 of 329 records in a real tenant carry
 * supervisorId — so reports have to be matched on a name. And a person's name
 * changes: marriage, an added middle name, a corrected typo. Keying the vault on
 * a name-derived slug meant the second of those minted a second row and a second
 * folder, and left a year of 1:1 notes attached to the person who no longer
 * appeared to exist.
 */
let dir: string;

const employee = (over: Partial<Roster> = {}): Roster => ({
  id: '123',
  slug: 'ana-horvat',
  displayName: 'Ana Horvat',
  jobTitle: 'Engineer',
  department: 'Platform',
  hireDate: '2024-03-01',
  workEmail: 'ana@yourcompany.com',
  workPhone: null,
  supervisorEmployeeId: '100',
  ...over,
});

type Roster = {
  id: string;
  slug: string;
  displayName: string;
  jobTitle: string | null;
  department: string | null;
  hireDate: string | null;
  workEmail: string | null;
  workPhone: string | null;
  supervisorEmployeeId: string | null;
};

const directoryRow = (over: Record<string, unknown> = {}) => ({
  id: '1',
  displayName: 'Somebody',
  firstName: null,
  lastName: null,
  jobTitle: null,
  department: null,
  division: null,
  workEmail: null,
  mobilePhone: null,
  supervisor: null,
  photoUrl: null,
  ...over,
});

const roster = (): PersonEntry[] =>
  JSON.parse(fs.readFileSync(path.join(dir, 'people/entries.json'), 'utf8')) as PersonEntry[];

const setRoster = (rows: unknown) => {
  fs.mkdirSync(path.join(dir, 'people'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'people/entries.json'), `${JSON.stringify(rows, null, 2)}\n`);
};

const existing = (over: Record<string, unknown> = {}) => ({
  slug: 'ana-horvat',
  displayName: 'Ana Horvat',
  hr: {
    jobTitle: 'Engineer',
    department: 'Platform',
    hireDate: '2024-03-01',
    supervisorEmployeeId: '100',
    workEmail: 'ana@yourcompany.com',
    workPhone: null,
    employeeId: '123',
  },
  mine: { contactCadenceDays: 21, growth: { currentLevel: 'M2', targetLevel: 'M3' } },
  status: 'active',
  ...over,
});

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-roster-'));
  process.env.VAULT_PATH = dir;
  resetConfig();
  setRoster([]);
  fs.writeFileSync(path.join(dir, 'tasks.json'), '[]\n');
  fs.writeFileSync(path.join(dir, 'time.json'), '[]\n');
  fs.writeFileSync(path.join(dir, 'config.json'), '{"dataVersion":1}\n');
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  delete process.env.VAULT_PATH;
  resetConfig();
});

describe('who counts as a direct report', () => {
  it('matches on the supervisor name exactly', async () => {
    const { selectReports } = await import('@/lib/sources/bamboohr/roster');
    const { reports } = selectReports(
      [
        directoryRow({ id: '1', supervisor: 'Petar Ćorluka' }),
        directoryRow({ id: '2', supervisor: 'Someone Else' }),
        directoryRow({ id: '3', supervisor: null }),
      ],
      'Petar Ćorluka',
    );

    expect(reports.map((r) => r.id)).toEqual(['1']);
  });

  it('names the people a near-miss spelling hides', async () => {
    // This is the failure the name match cannot avoid, and before this there was
    // no sign of it at all: the roster was simply shorter than the team.
    const { selectReports } = await import('@/lib/sources/bamboohr/roster');
    const { reports, nearMisses } = selectReports(
      [
        directoryRow({ id: '1', supervisor: 'Petar Ćorluka' }),
        directoryRow({ id: '2', supervisor: 'Petar Corluka' }),
        directoryRow({ id: '3', supervisor: 'petar corluka' }),
        directoryRow({ id: '4', supervisor: 'Someone Else' }),
      ],
      'Petar Ćorluka',
    );

    expect(reports.map((r) => r.id)).toEqual(['1']);
    expect(nearMisses).toEqual([
      { supervisor: 'Petar Corluka', people: 1 },
      { supervisor: 'petar corluka', people: 1 },
    ]);
  });

  it('says nothing when every spelling agrees', async () => {
    const { selectReports } = await import('@/lib/sources/bamboohr/roster');
    const { nearMisses } = selectReports(
      [directoryRow({ id: '1', supervisor: 'Ana Horvat' })],
      'Ana Horvat',
    );
    expect(nearMisses).toEqual([]);
  });
});

describe('a person is their employee id, not their name', () => {
  it('follows a rename onto the existing row and keeps the slug', async () => {
    const { mergeRoster } = await import('@/lib/sources/bamboohr/roster');
    setRoster([existing()]);

    const warning = await mergeRoster([employee({ displayName: 'Ana Novak', slug: 'ana-novak' })]);

    // One row, not two: the folder and every note in it stay where they are.
    expect(roster()).toHaveLength(1);
    expect(roster()[0]?.slug).toBe('ana-horvat');
    expect(roster()[0]?.displayName).toBe('Ana Novak');
    expect(warning).toContain('Ana Horvat is now Ana Novak');
  });

  it('does not report the renamed person as one who went missing', async () => {
    const { mergeRoster } = await import('@/lib/sources/bamboohr/roster');
    setRoster([existing()]);

    const warning = await mergeRoster([employee({ displayName: 'Ana Novak', slug: 'ana-novak' })]);
    expect(warning).not.toContain('not in this sync');
  });

  it("keeps the manager's own fields across a rename", async () => {
    const { mergeRoster } = await import('@/lib/sources/bamboohr/roster');
    setRoster([existing()]);

    await mergeRoster([employee({ displayName: 'Ana Novak', slug: 'ana-novak' })]);

    // Contact cadence and growth levels are the manager's, and BambooHR cannot
    // give them back.
    expect(roster()[0]?.mine).toEqual({
      contactCadenceDays: 21,
      growth: { currentLevel: 'M2', targetLevel: 'M3' },
    });
  });

  it('writes the supervisor id it used to throw away', async () => {
    const { mergeRoster } = await import('@/lib/sources/bamboohr/roster');
    await mergeRoster([employee()]);

    expect(roster()[0]?.hr.employeeId).toBe('123');
    expect(roster()[0]?.hr.supervisorEmployeeId).toBe('100');
  });

  it('gives two people with the same name a row each', async () => {
    const { mergeRoster } = await import('@/lib/sources/bamboohr/roster');
    await mergeRoster([
      employee({ id: '123', displayName: 'Ana Horvat', slug: 'ana-horvat' }),
      employee({ id: '124', displayName: 'Ana Horvat', slug: 'ana-horvat' }),
    ]);

    expect(
      roster()
        .map((p) => p.slug)
        .sort(),
    ).toEqual(['ana-horvat', 'ana-horvat-2']);
    expect(
      roster()
        .map((p) => p.hr.employeeId)
        .sort(),
    ).toEqual(['123', '124']);
  });

  it('leaves somebody the sync did not see, and says so', async () => {
    const { mergeRoster } = await import('@/lib/sources/bamboohr/roster');
    setRoster([
      existing(),
      // A distinct employee id, or both rows key onto the same person and this
      // passes while updating the wrong one.
      existing({
        slug: 'marko-maric',
        displayName: 'Marko Marić',
        hr: { ...existing().hr, employeeId: '124' },
      }),
    ]);

    const warning = await mergeRoster([employee()]);

    expect(
      roster()
        .map((p) => p.slug)
        .sort(),
    ).toEqual(['ana-horvat', 'marko-maric']);
    expect(warning).toContain('1 person is in the vault but not in this sync');
  });

  it('carries a row it cannot validate through untouched', async () => {
    const { mergeRoster } = await import('@/lib/sources/bamboohr/roster');
    setRoster([existing(), { slug: 'BROKEN', typo: true }]);

    await mergeRoster([employee()]);

    const raw = JSON.parse(
      fs.readFileSync(path.join(dir, 'people/entries.json'), 'utf8'),
    ) as unknown[];
    expect(raw).toHaveLength(2);
    expect(raw[1]).toEqual({ slug: 'BROKEN', typo: true });
  });

  it('refuses rather than merging into a roster it cannot read', async () => {
    const { mergeRoster } = await import('@/lib/sources/bamboohr/roster');
    fs.writeFileSync(path.join(dir, 'people/entries.json'), 'not json at all');

    await expect(mergeRoster([employee()])).rejects.toThrow(/cannot be read/);
    // And the file is exactly as it was.
    expect(fs.readFileSync(path.join(dir, 'people/entries.json'), 'utf8')).toBe('not json at all');
  });
});
