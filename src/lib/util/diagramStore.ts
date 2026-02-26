import type { DiagramGroup, SavedDiagram } from '$lib/types';
import { writable } from 'svelte/store';

export const diagramsStore = writable<SavedDiagram[]>([]);
export const groupsStore = writable<DiagramGroup[]>([]);

// ==================== Helper ====================

function mapGroup(raw: Record<string, unknown>): DiagramGroup {
  return {
    createdAt: raw.created_at as number,
    id: raw.id as string,
    name: raw.name as string,
    updatedAt: raw.updated_at as number
  };
}

function mapDiagram(raw: Record<string, unknown>): SavedDiagram {
  return {
    code: raw.code as string,
    createdAt: raw.created_at as number,
    groupId: (raw.group_id as string) ?? null,
    id: raw.id as string,
    mermaid: raw.mermaid as string,
    name: raw.name as string,
    updatedAt: raw.updated_at as number
  };
}

// ==================== Groups ====================

export async function loadGroups(): Promise<void> {
  const res = await fetch('/api/groups');
  const data = (await res.json()) as Record<string, unknown>[];
  groupsStore.set(data.map(mapGroup));
}

export async function addGroup(name: string): Promise<DiagramGroup> {
  const res = await fetch('/api/groups', {
    body: JSON.stringify({ name }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST'
  });
  const raw = (await res.json()) as Record<string, unknown>;
  await loadGroups();
  return mapGroup(raw);
}

export async function editGroup(id: string, name: string): Promise<void> {
  await fetch(`/api/groups/${id}`, {
    body: JSON.stringify({ name }),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT'
  });
  await loadGroups();
}

export async function removeGroup(id: string): Promise<void> {
  await fetch(`/api/groups/${id}`, { method: 'DELETE' });
  await Promise.all([loadDiagrams(), loadGroups()]);
}

// ==================== Diagrams ====================

export async function loadDiagrams(): Promise<void> {
  const res = await fetch('/api/diagrams');
  const data = (await res.json()) as Record<string, unknown>[];
  diagramsStore.set(data.map(mapDiagram));
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
  const res = await fetch('/api/diagrams', {
    body: JSON.stringify({ code, group_id: groupId, mermaid, name }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST'
  });
  const raw = (await res.json()) as Record<string, unknown>;
  await loadDiagrams();
  return mapDiagram(raw);
}

export async function editDiagram(
  id: string,
  updates: Partial<Pick<SavedDiagram, 'code' | 'groupId' | 'mermaid' | 'name'>>
): Promise<void> {
  // Map frontend field names to API field names
  const apiUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) apiUpdates.name = updates.name;
  if (updates.code !== undefined) apiUpdates.code = updates.code;
  if (updates.mermaid !== undefined) apiUpdates.mermaid = updates.mermaid;
  if (updates.groupId !== undefined) apiUpdates.group_id = updates.groupId;

  await fetch(`/api/diagrams/${id}`, {
    body: JSON.stringify(apiUpdates),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT'
  });
  await loadDiagrams();
}

export async function removeDiagram(id: string): Promise<void> {
  await fetch(`/api/diagrams/${id}`, { method: 'DELETE' });
  await loadDiagrams();
}
