'use server';

import { vaultChanged } from '@/app/changed';
import { addTimeEntry, deleteTimeEntry, parseHours, updateTimeEntry } from '@/lib/vault/time';

export type Result = { ok: true } | { ok: false; message: string };

export async function logEntryAction(date: string, hours: string, note: string): Promise<Result> {
  try {
    await addTimeEntry(date, parseHours(hours), note);
    vaultChanged('/timebalance');
    return { ok: true };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function editEntryAction(
  id: string,
  date: string,
  hours: string,
  note: string,
): Promise<Result> {
  try {
    await updateTimeEntry(id, { date, hoursDelta: parseHours(hours), note });
    vaultChanged('/timebalance');
    return { ok: true };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function deleteEntryAction(id: string): Promise<Result> {
  try {
    await deleteTimeEntry(id);
    vaultChanged('/timebalance');
    return { ok: true };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
