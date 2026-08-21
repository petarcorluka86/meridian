'use server';

import { vaultIsInsideApp } from '@/lib/vault/paths';
import { configChanged, vaultChanged } from '@/app/changed';
import { addTask } from '@/lib/vault/tasks';
import { createNote } from '@/lib/vault/notes';
import { syncBambooInbox } from '@/lib/sources/bamboohr';
import { clearFailure, noteFailure } from '@/lib/sources/cache';
import { loadConfig } from '@/lib/env';
import { readBamboo } from '@/lib/sources/bamboohr';
import type { NoteCategory } from '@/lib/vault/schemas';

export type CaptureResult = { ok: true; message: string } | { ok: false; message: string };

export async function captureTaskAction(input: {
  title: string;
  priority: 'urgent' | 'important' | 'normal';
  dueDate: string | null;
  personSlug: string | null;
}): Promise<CaptureResult> {
  try {
    await addTask(input);
    vaultChanged('/tasks');
    return { ok: true, message: 'Lands in your task list.' };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function captureNoteAction(input: {
  title: string;
  category: NoteCategory;
  personSlug: string | null;
  draft: boolean;
}): Promise<CaptureResult> {
  try {
    const path = await createNote({
      title: input.title,
      category: input.category,
      // No person means the inbox, until you give it one.
      personSlug: input.personSlug,
      draft: input.draft,
    });
    vaultChanged('/notes');
    return { ok: true, message: `Saved to ${path}` };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

/**
 * Refreshing the calendar needs an OAuth token exchange, which is a POST — the
 * only non-GET this process makes, permitted by exact URL rather than by host.
 * It happens here, in this process; `TOKEN_ENDPOINT` in lib/sources/calendar.ts
 * says why it stopped being a child process, and readonly.test.ts is what keeps
 * it to one URL.
 */
async function refreshCalendar(): Promise<boolean> {
  const { readCalendar, syncCalendar } = await import('@/lib/sources/calendar');
  if (readCalendar().freshness.state === 'live') return false;

  try {
    await syncCalendar();
    clearFailure('calendar');
    return true;
  } catch (err) {
    // The last good cache stays on screen, and the pill says why it is not
    // moving rather than only how old it is.
    noteFailure('calendar', `The calendar could not be refreshed — ${(err as Error).message}`);
    return true;
  }
}

/**
 * Cache first, then revalidate: the page has already painted from .cache/, and
 * this runs beside it. A refresh inside the freshness window is a no-op, so
 * every card on the page can ask without causing more than one fetch.
 */
export async function refreshSourcesAction(): Promise<{ refreshed: boolean }> {
  // The fixture vault is committed test data. Refreshing into it would replace
  // invented people with real ones and commit them.
  if (vaultIsInsideApp()) return { refreshed: false };

  const config = loadConfig();
  let refreshed = false;

  if (config.bamboo) {
    const { freshness, inboxFreshness, compFreshness } = readBamboo();

    // Each dataset on its own clock: approvals and presence every five minutes,
    // the roster and pay tables hourly. A failure leaves the last good cache on
    // screen and is written down, so the pill can say what happened instead of
    // only how old the numbers are.
    const stale = [freshness, inboxFreshness, compFreshness].some((f) => f.state !== 'live');
    if (stale) {
      const { syncBamboo, syncBambooCompensation, bambooErrorCopy } = await import(
        '@/lib/sources/bamboohr'
      );
      try {
        if (freshness.state !== 'live') {
          await syncBamboo();
          refreshed = true;
        }
        if (inboxFreshness.state !== 'live') {
          await syncBambooInbox();
          refreshed = true;
        }
        if (compFreshness.state !== 'live') {
          await syncBambooCompensation();
          refreshed = true;
        }
        clearFailure('bamboohr');
      } catch (err) {
        noteFailure('bamboohr', bambooErrorCopy(err));
        refreshed = true;
      }
    }
  }

  if (config.calendar && (await refreshCalendar())) refreshed = true;

  if (config.github) {
    const { readGithub, syncGithub, githubLoginToSlug } = await import('@/lib/sources/github');
    if (readGithub().freshness.state !== 'live') {
      try {
        const { getVault } = await import('@/lib/vault/index');
        await syncGithub(githubLoginToSlug(getVault().links));
        clearFailure('github');
        refreshed = true;
      } catch (err) {
        noteFailure('github', `GitHub could not be reached — ${(err as Error).message}`);
        refreshed = true;
      }
    }
  }

  if (refreshed) {
    // Every screen reads the same cache, so refresh the lot rather than only
    // the page that happened to trigger it.
    configChanged();
  }
  return { refreshed };
}

/** Which dataset a sync badge refreshes. Each has its own cache and its own clock. */
export type SyncTarget = 'roster' | 'inbox' | 'compensation' | 'calendar' | 'github';

/**
 * One dataset, refetched because somebody asked — so it ignores the freshness
 * window that `refreshSourcesAction` respects. Pressing a badge that says "2m"
 * has to actually go and look, or the badge is a decoration.
 *
 * A failure is written down rather than thrown: the last good cache stays on
 * screen and the badge turns red with the reason, which is the same contract the
 * background refresh has.
 */
export async function syncSourceAction(
  target: SyncTarget,
): Promise<{ ok: boolean; message?: string }> {
  // The fixture vault is committed test data. Refreshing into it would replace
  // invented people with real ones and commit them.
  if (vaultIsInsideApp()) return { ok: false, message: 'Not while pointed at the fixture vault.' };

  const config = loadConfig();

  try {
    if (target === 'calendar') {
      if (!config.calendar) return { ok: false, message: 'Calendar is not connected.' };
      const { syncCalendar } = await import('@/lib/sources/calendar');
      await syncCalendar();
      clearFailure('calendar');
    } else if (target === 'github') {
      if (!config.github) return { ok: false, message: 'GitHub is not connected.' };
      const { syncGithub, githubLoginToSlug } = await import('@/lib/sources/github');
      const { getVault } = await import('@/lib/vault/index');
      await syncGithub(githubLoginToSlug(getVault().links));
      clearFailure('github');
    } else {
      if (!config.bamboo) return { ok: false, message: 'BambooHR is not connected.' };
      const { syncBamboo, syncBambooCompensation } = await import('@/lib/sources/bamboohr');
      if (target === 'roster') await syncBamboo();
      if (target === 'inbox') await syncBambooInbox();
      if (target === 'compensation') await syncBambooCompensation();
      clearFailure('bamboohr');
    }
  } catch (err) {
    const source = target === 'calendar' || target === 'github' ? target : 'bamboohr';
    if (source === 'bamboohr') {
      const { bambooErrorCopy } = await import('@/lib/sources/bamboohr');
      noteFailure(source, bambooErrorCopy(err));
    } else {
      noteFailure(source, (err as Error).message);
    }
    return { ok: false, message: (err as Error).message };
  }

  configChanged();
  return { ok: true };
}
