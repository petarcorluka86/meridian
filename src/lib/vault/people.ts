import { getVault, invalidateVault } from './index';
import { LinkEntry, PersonEntry, PlanEntry } from './schemas';
import { mutateJsonRows, readForUpdate, withLock, writeTextAtomic } from './write';

async function mutateJson<T>(
  file: string,
  row: { safeParse: (v: unknown) => { success: boolean; data?: T } },
  fn: (current: T[]) => T[],
): Promise<void> {
  await mutateJsonRows(file, row, fn);
}

function requirePerson(slug: string): void {
  if (!getVault().peopleBySlug.has(slug)) {
    throw new Error(`No person with the slug ${slug} in people/entries.json.`);
  }
}

/**
 * The fields in `entries.json` that are yours rather than BambooHR's: the
 * contact cadence, the growth levels, and whether the person is archived. The
 * HR block is deliberately not here — it is a copy of what BambooHR said, and
 * the next roster sync would silently put an edit back.
 */
export type PersonPatch = {
  contactCadenceDays?: number;
  currentLevel?: string | null;
  targetLevel?: string | null;
  status?: 'active' | 'archived';
};

export async function updatePerson(slug: string, patch: PersonPatch): Promise<void> {
  requirePerson(slug);
  if (
    patch.contactCadenceDays !== undefined &&
    (!Number.isInteger(patch.contactCadenceDays) || patch.contactCadenceDays <= 0)
  ) {
    throw new Error('A contact cadence is a positive number of days.');
  }
  await mutateJson<PersonEntry>('people/entries.json', PersonEntry, (rows) => {
    if (!rows.some((r) => r.slug === slug)) {
      throw new Error(`No person with the slug ${slug} in people/entries.json.`);
    }
    return rows.map((r) =>
      r.slug === slug
        ? {
            ...r,
            status: patch.status ?? r.status,
            mine: {
              ...r.mine,
              contactCadenceDays: patch.contactCadenceDays ?? r.mine.contactCadenceDays,
              growth: {
                currentLevel:
                  patch.currentLevel === undefined
                    ? r.mine.growth.currentLevel
                    : patch.currentLevel,
                targetLevel:
                  patch.targetLevel === undefined ? r.mine.growth.targetLevel : patch.targetLevel,
              },
            },
          }
        : r,
    );
  });
}

export async function saveAbout(slug: string, body: string): Promise<void> {
  requirePerson(slug);
  const file = `people/${slug}/about.md`;
  await withLock(file, () => {
    const current = readForUpdate(file);
    writeTextAtomic(file, body.endsWith('\n') ? body : `${body}\n`, {
      expectMtimeMs: current?.mtimeMs,
    });
    invalidateVault();
  });
}

export async function addLink(slug: string, label: string, url: string): Promise<void> {
  requirePerson(slug);
  const trimmed = url.trim();
  // A link that is not http(s) would be blocked on click anyway, and a
  // javascript: URL has no business in the vault.
  if (!/^https?:\/\//i.test(trimmed))
    throw new Error('A link needs to start with http:// or https://');

  const name = label.trim() || trimmed.replace(/^https?:\/\//i, '').split('/')[0] || trimmed;
  await mutateJson<LinkEntry>(`people/${slug}/links.json`, LinkEntry, (links) => [
    ...links,
    { label: name, url: trimmed },
  ]);
}

export async function removeLink(slug: string, index: number): Promise<void> {
  requirePerson(slug);
  await mutateJson<LinkEntry>(`people/${slug}/links.json`, LinkEntry, (links) =>
    links.filter((_, i) => i !== index),
  );
}

export async function addPlan(
  slug: string,
  input: { amount: number; month: number; year: number; promotion: string },
): Promise<void> {
  requirePerson(slug);
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('A planned rise needs an amount.');
  }
  await mutateJson<PlanEntry>(`people/${slug}/plans.json`, PlanEntry, (plans) => {
    const id = `${input.year}-${String(input.month).padStart(2, '0')}-${
      input.promotion ? input.promotion.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'rise'
    }`;
    const unique = plans.some((p) => p.id === id) ? `${id}-${plans.length + 1}` : id;
    return [...plans, { id: unique, ...input }].sort(
      (a, b) => b.year * 100 + b.month - (a.year * 100 + a.month),
    );
  });
}

export async function removePlan(slug: string, id: string): Promise<void> {
  requirePerson(slug);
  await mutateJson<PlanEntry>(`people/${slug}/plans.json`, PlanEntry, (plans) =>
    plans.filter((p) => p.id !== id),
  );
}
