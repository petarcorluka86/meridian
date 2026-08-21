import { loadConfig } from '@/lib/env';
import { FixtureVaultError, vaultIsInsideApp } from '@/lib/vault/paths';
import { invalidateVault } from '@/lib/vault/index';
import { PersonEntry } from '@/lib/vault/schemas';
import { readForUpdate, withLock, writeJsonAtomic } from '@/lib/vault/write';
import { readCache, writeCache } from '../cache';
import { BambooCache } from './cache';
import {
  bambooGet,
  cachePhoto,
  type DirectoryEmployee,
  DirectoryResponse,
  displayNameOf,
  EmployeeDetail,
  fold,
  slugifyName,
} from './client';

/** The roster: who reports to you, and their HR facts. */

export type SyncResult = { people: number; warning?: string };
/**
 * Refetch the roster. One directory call, then one detail call per direct report
 * for the hire date — not per employee in the company, which would be hundreds.
 */
export async function syncBamboo(): Promise<SyncResult> {
  if (vaultIsInsideApp()) throw new FixtureVaultError();

  const config = loadConfig();
  if (!config.bamboo) throw new Error('BambooHR is not connected.');

  const { subdomain, apiKey, managerId } = config.bamboo;
  const directory = DirectoryResponse.parse(
    await bambooGet(subdomain, apiKey, 'employees/directory'),
  );

  const me = directory.employees.find((e) => e.id === managerId);
  if (!me) {
    throw new Error(
      `No employee with id ${managerId} in the BambooHR directory. Check BAMBOOHR_MANAGER_EMPLOYEE_ID.`,
    );
  }

  const myName = displayNameOf(me);
  const sameName = directory.employees.filter((e) => displayNameOf(e) === myName).length;
  if (sameName > 1) {
    throw new Error(
      `${sameName} people in BambooHR are called "${myName}". Reports are matched by supervisor name, so Meridian cannot tell which of them is you.`,
    );
  }

  const { reports, nearMisses } = selectReports(directory.employees, myName);

  const employees: SyncedEmployee[] = [];
  let detailFailures = 0;
  const wrongSupervisor: string[] = [];
  for (const report of reports) {
    const name = displayNameOf(report);
    let hireDate: string | null = null;
    // The one identifier in this API that a rename cannot move. The detail call
    // already happens for the hire date, so it costs nothing to keep.
    let supervisorEmployeeId: string | null = null;
    try {
      const detail = EmployeeDetail.parse(
        await bambooGet(subdomain, apiKey, `employees/${report.id}?fields=hireDate,supervisorEId`),
      );
      hireDate = detail.hireDate;
      supervisorEmployeeId = detail.supervisorEId;
      // Matched by name, checked by id. Two colleagues who share a supervisor's
      // name is the case the name match cannot see, and this is where it shows.
      if (supervisorEmployeeId !== null && supervisorEmployeeId !== managerId) {
        wrongSupervisor.push(name);
      }
    } catch {
      // Losing a hire date must not lose the person.
      detailFailures++;
    }

    employees.push({
      id: report.id,
      slug: slugifyName(name),
      displayName: name,
      jobTitle: report.jobTitle,
      department: report.division ?? report.department,
      hireDate,
      workEmail: report.workEmail,
      workPhone: report.mobilePhone,
      supervisorEmployeeId,
    });

    await cachePhoto(slugifyName(name), report.photoUrl);
  }

  const rosterWarning = await mergeRoster(employees);

  const previous = readCache('bamboohr', BambooCache).data;
  writeCache('bamboohr', {
    fetchedAt: new Date().toISOString(),
    // Untouched by a roster sync — each dataset runs on its own clock.
    inboxFetchedAt: previous?.inboxFetchedAt ?? null,
    compFetchedAt: previous?.compFetchedAt ?? null,
    etag: null,
    employees,
    // Compensation and absences keep their previous values until their own sync
    // runs — a roster refresh must never blank a pay table.
    compensation: previous?.compensation ?? {},
    timeOff: previous?.timeOff ?? [],
    inbox: previous?.inbox ?? [],
  });

  const warnings = [
    detailFailures
      ? `${detailFailures} hire ${detailFailures === 1 ? 'date' : 'dates'} could not be read.`
      : null,
    // Somebody the directory attributes to a supervisor spelled almost like you.
    // Reports are matched on the name, so these are simply not on your roster,
    // and before this the only sign was a roster quietly shorter than the team.
    ...nearMisses.map(
      (miss) =>
        `${miss.people} ${miss.people === 1 ? 'person lists' : 'people list'} their supervisor as ` +
        `"${miss.supervisor}", which is not exactly "${myName}" — they are not on your roster.`,
    ),
    wrongSupervisor.length
      ? `BambooHR gives a different supervisor id for ${wrongSupervisor.join(', ')}, ` +
        `matched to you by name. Check whether they actually report to you.`
      : null,
    rosterWarning,
  ].filter(Boolean);

  return { people: employees.length, warning: warnings.join(' ') || undefined };
}

export type SyncedEmployee = {
  id: string;
  /** Seeded from the display name, and only ever used for somebody new. */
  slug: string;
  displayName: string;
  jobTitle: string | null;
  department: string | null;
  hireDate: string | null;
  workEmail: string | null;
  workPhone: string | null;
  supervisorEmployeeId: string | null;
};

/**
 * Who reports to you, and who the directory *nearly* attributes to you.
 *
 * The directory reports a supervisor by name rather than id — 0 of 329 records in
 * a real tenant carry supervisorId — so the match has to be on the name, and a
 * name spelled any other way is a person who silently is not on your roster. The
 * near misses are the ones that fold to the same string: diacritics dropped, case
 * different, spacing off. Naming them turns a short roster into a question.
 *
 * Pure, and separate from the fetching, because this is the decision worth
 * testing and the fetching is not.
 */
export function selectReports(
  employees: DirectoryEmployee[],
  myName: string,
): { reports: DirectoryEmployee[]; nearMisses: { supervisor: string; people: number }[] } {
  const reports = employees.filter((e) => e.supervisor === myName);

  const folded = fold(myName);
  const misses = new Map<string, number>();
  for (const employee of employees) {
    const supervisor = employee.supervisor;
    if (!supervisor || supervisor === myName) continue;
    if (fold(supervisor) !== folded) continue;
    misses.set(supervisor, (misses.get(supervisor) ?? 0) + 1);
  }

  return {
    reports,
    nearMisses: [...misses].map(([supervisor, people]) => ({ supervisor, people })),
  };
}

/**
 * The roster in the vault is what the app reads; the cache is only the raw pull.
 * Sync overwrites the `hr` block and never touches `mine` — the growth notes and
 * contact cadence are the manager's, not BambooHR's.
 *
 * Nobody is ever removed or archived automatically: an API hiccup must not be
 * able to drop a person and orphan their folder.
 */
/**
 * A slug for somebody new that is not already taken by somebody else. Two
 * colleagues with the same name used to collapse into one row, because the second
 * one overwrote the first under the same key.
 */
function freeSlug(seed: string, taken: Map<string, PersonEntry>): string {
  const base = seed || 'person';
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

export async function mergeRoster(employees: SyncedEmployee[]): Promise<string | null> {
  const file = 'people/entries.json';
  let missing = 0;
  const renamed: string[] = [];

  await withLock(file, () => {
    const current = readForUpdate(file);
    const existing: PersonEntry[] = [];
    const unreadable: unknown[] = [];
    if (current) {
      // Per row, and keeping what does not validate. Treating the whole file as
      // empty on one bad entry resets every person's `mine` block — contact
      // cadence, growth levels, the things BambooHR cannot give back — and drops
      // anyone the sync happens not to see. That is the opposite of the comment
      // above this function.
      const rows: unknown = (() => {
        try {
          return JSON.parse(current.data);
        } catch {
          return null;
        }
      })();
      if (!Array.isArray(rows)) {
        throw new Error(
          'people/entries.json cannot be read, so the roster was not merged. Fix the file first — nothing has been changed.',
        );
      }
      for (const row of rows) {
        const parsed = PersonEntry.safeParse(row);
        if (parsed.success) existing.push(parsed.data);
        else unreadable.push(row);
      }
    }

    const bySlug = new Map(existing.map((p) => [p.slug, p]));
    // A person is their BambooHR employee id. The slug is a local name, seeded
    // from the display name the first time they are seen and never changed after.
    //
    // Keying the merge on the slug instead meant a rename in HR — a marriage, an
    // added middle name, a corrected typo — minted a second row and a second
    // folder, while the old row stayed (nobody is ever removed) and kept a year
    // of 1:1 notes attached to a person who now appears twice. The orphan check
    // in the index cannot see it either, because the old row still exists.
    const byEmployeeId = new Map(
      existing.filter((p) => p.hr.employeeId).map((p) => [p.hr.employeeId as string, p]),
    );

    // The roster as it was before this round, so the fallback below cannot match
    // a row this same loop just wrote: two colleagues with the same name would
    // both have resolved onto the first one's row and collapsed into it.
    const before = new Map(bySlug);

    const written = new Set<string>();
    for (const employee of employees) {
      const previous =
        byEmployeeId.get(employee.id) ??
        // A row written before employee ids were stored, matched the old way —
        // unless somebody else in this round has already claimed it.
        (written.has(employee.slug) ? undefined : before.get(employee.slug));
      const slug = previous?.slug ?? freeSlug(employee.slug, bySlug);
      if (previous && previous.displayName !== employee.displayName) {
        renamed.push(`${previous.displayName} is now ${employee.displayName}`);
      }

      written.add(slug);
      bySlug.set(slug, {
        slug,
        displayName: employee.displayName,
        hr: {
          jobTitle: employee.jobTitle,
          department: employee.department,
          hireDate: employee.hireDate,
          supervisorEmployeeId: employee.supervisorEmployeeId,
          workEmail: employee.workEmail,
          workPhone: employee.workPhone,
          employeeId: employee.id,
        },
        mine: previous?.mine ?? {
          contactCadenceDays: 14,
          growth: { currentLevel: null, targetLevel: null },
        },
        status: previous?.status ?? 'active',
      });
    }

    // The slugs actually written, not the ones the sync proposed: after a rename
    // those differ, and comparing against the proposal reported the renamed
    // person as one who had gone missing.
    missing = existing.filter((p) => !written.has(p.slug) && p.status === 'active').length;

    const next = [...bySlug.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
    // Rows the app could not read are written back exactly as they were found.
    writeJsonAtomic(file, [...next, ...unreadable], { expectMtimeMs: current?.mtimeMs });
    invalidateVault();
  });

  return (
    [
      // Said out loud, because the folder and every note in it stay under the old
      // slug on purpose — the alternative is moving somebody's notes behind their
      // back the first time HR fixes a spelling.
      renamed.length ? `Renamed in BambooHR: ${renamed.join('; ')}.` : null,
      missing
        ? `${missing} ${missing === 1 ? 'person is' : 'people are'} in the vault but not in this sync — left untouched.`
        : null,
    ]
      .filter(Boolean)
      .join(' ') || null
  );
}
