'use server';

import { vaultChanged } from '@/app/changed';
import {
  addPhase,
  addProjectLink,
  createProject,
  deleteProject,
  removePhase,
  removeProjectLink,
  setPhaseDone,
  setProjectArchived,
  updatePhase,
  updateProject,
  type NewProject,
} from '@/lib/vault/projects';

export type ProjectResult = { ok: true } | { ok: false; message: string };
export type CreateResult = { ok: true; id: string } | { ok: false; message: string };

/**
 * Every project change touches `projects.json` and shows on three screens: the
 * list, the project itself, and wherever its tasks appear. Naming all three here
 * is why no action has to remember.
 */
function changed(id?: string): void {
  vaultChanged('/projects', '/tasks', '/notes', id ? `/projects/${id}` : null);
}

async function run(work: () => Promise<void>, id?: string): Promise<ProjectResult> {
  try {
    await work();
    changed(id);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function createProjectAction(input: NewProject): Promise<CreateResult> {
  try {
    const id = await createProject(input);
    changed(id);
    return { ok: true, id };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function updateProjectAction(
  id: string,
  input: { title: string; description: string },
): Promise<ProjectResult> {
  return run(() => updateProject(id, input), id);
}

export async function archiveProjectAction(id: string, archived: boolean): Promise<ProjectResult> {
  return run(() => setProjectArchived(id, archived), id);
}

/**
 * The project only. Its tasks and notes lose the project and stay where they are,
 * which is what the confirmation says will happen.
 */
export async function deleteProjectAction(id: string): Promise<ProjectResult> {
  return run(() => deleteProject(id));
}

export async function addPhaseAction(id: string, label: string): Promise<ProjectResult> {
  return run(() => addPhase(id, label), id);
}

export async function editPhaseAction(
  id: string,
  phase: string,
  input: { label: string; note: string; projectOnly: boolean },
): Promise<ProjectResult> {
  return run(() => updatePhase(id, phase, input), id);
}

export async function togglePhaseAction(
  id: string,
  phase: string,
  done: boolean,
): Promise<ProjectResult> {
  return run(() => setPhaseDone(id, phase, done), id);
}

export async function removePhaseAction(id: string, phase: string): Promise<ProjectResult> {
  return run(() => removePhase(id, phase), id);
}

export async function addProjectLinkAction(
  id: string,
  label: string,
  url: string,
): Promise<ProjectResult> {
  return run(() => addProjectLink(id, label, url), id);
}

export async function removeProjectLinkAction(id: string, index: number): Promise<ProjectResult> {
  return run(() => removeProjectLink(id, index), id);
}
