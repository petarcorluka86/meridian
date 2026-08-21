'use server';

import { vaultChanged } from '@/app/changed';
import { syncBamboo, bambooErrorCopy } from '@/lib/sources/bamboohr';
import { addPlan, removePlan, addLink, removeLink, saveAbout } from '@/lib/vault/people';

export type Result = { ok: true; message?: string } | { ok: false; message: string };

export async function syncBambooAction(): Promise<Result> {
  try {
    const { people } = await syncBamboo();
    vaultChanged('/people');
    return {
      ok: true,
      message: `Synced ${people} ${people === 1 ? 'person' : 'people'} from BambooHR.`,
    };
  } catch (err) {
    return { ok: false, message: bambooErrorCopy(err) };
  }
}

export async function saveAboutAction(slug: string, body: string): Promise<Result> {
  try {
    await saveAbout(slug, body);
    vaultChanged('/people', slug);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function addLinkAction(slug: string, label: string, url: string): Promise<Result> {
  try {
    await addLink(slug, label, url);
    vaultChanged('/people', slug);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function removeLinkAction(slug: string, index: number): Promise<Result> {
  try {
    await removeLink(slug, index);
    vaultChanged('/people', slug);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function addPlanAction(
  slug: string,
  amount: number,
  month: number,
  year: number,
  promotion: string,
): Promise<Result> {
  try {
    await addPlan(slug, { amount, month, year, promotion });
    vaultChanged('/people', slug);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function removePlanAction(slug: string, id: string): Promise<Result> {
  try {
    await removePlan(slug, id);
    vaultChanged('/people', slug);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
