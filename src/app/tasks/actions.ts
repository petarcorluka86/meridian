'use server';

import { vaultChanged } from '@/app/changed';
import {
  addTask,
  deleteTask,
  setTaskStatus,
  updateTask,
  type NewTask,
  type TaskPatch,
} from '@/lib/vault/tasks';

export async function toggleTaskAction(id: string, done: boolean): Promise<void> {
  await setTaskStatus(id, done);
  vaultChanged('/tasks');
}

export type AddResult = { ok: true } | { ok: false; message: string };

export async function addTaskAction(input: NewTask): Promise<AddResult> {
  try {
    await addTask(input);
    vaultChanged('/tasks');
    return { ok: true };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function editTaskAction(id: string, patch: TaskPatch): Promise<AddResult> {
  try {
    await updateTask(id, patch);
    vaultChanged('/tasks');
    return { ok: true };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function deleteTaskAction(id: string): Promise<AddResult> {
  try {
    await deleteTask(id);
    vaultChanged('/tasks');
    return { ok: true };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
