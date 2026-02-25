import type { DiagramGroup, SavedDiagram } from '$lib/types';
import { writable } from 'svelte/store';
import {
  createGroup,
  deleteDiagram as dbDeleteDiagram,
  deleteGroup,
  getAllDiagrams,
  getAllGroups,
  saveDiagram,
  updateDiagram,
  updateGroup
} from './diagramDB';

export const diagramsStore = writable<SavedDiagram[]>([]);
export const groupsStore = writable<DiagramGroup[]>([]);

export async function loadDiagrams(): Promise<void> {
  const diagrams = await getAllDiagrams();
  diagramsStore.set(diagrams);
}

export async function loadGroups(): Promise<void> {
  const groups = await getAllGroups();
  groupsStore.set(groups);
}

export async function loadAll(): Promise<void> {
  await Promise.all([loadDiagrams(), loadGroups()]);
}

export async function addDiagram(
  name: string,
  code: string,
  mermaid: string,
  groupId: string | null
): Promise<SavedDiagram> {
  const diagram = await saveDiagram(name, code, mermaid, groupId);
  await loadDiagrams();
  return diagram;
}

export async function editDiagram(
  id: string,
  updates: Partial<Pick<SavedDiagram, 'name' | 'code' | 'mermaid' | 'groupId'>>
): Promise<void> {
  await updateDiagram(id, updates);
  await loadDiagrams();
}

export async function removeDiagram(id: string): Promise<void> {
  await dbDeleteDiagram(id);
  await loadDiagrams();
}

export async function addGroup(name: string): Promise<DiagramGroup> {
  const group = await createGroup(name);
  await loadGroups();
  return group;
}

export async function editGroup(id: string, name: string): Promise<void> {
  await updateGroup(id, name);
  await loadGroups();
}

export async function removeGroup(id: string): Promise<void> {
  await deleteGroup(id);
  await Promise.all([loadDiagrams(), loadGroups()]);
}
