import type { DiagramGroup, SavedDiagram } from '$lib/types';
import { v4 as uuidV4 } from 'uuid';

const DB_NAME = 'mermaid-diagram-manager';
const DB_VERSION = 1;
const DIAGRAMS_STORE = 'diagrams';
const GROUPS_STORE = 'groups';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(DIAGRAMS_STORE)) {
        const diagramStore = db.createObjectStore(DIAGRAMS_STORE, { keyPath: 'id' });
        diagramStore.createIndex('groupId', 'groupId', { unique: false });
        diagramStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        diagramStore.createIndex('name', 'name', { unique: false });
      }

      if (!db.objectStoreNames.contains(GROUPS_STORE)) {
        const groupStore = db.createObjectStore(GROUPS_STORE, { keyPath: 'id' });
        groupStore.createIndex('name', 'name', { unique: false });
      }
    };
  });
}

function withTransaction<T>(
  storeName: string | string[],
  mode: IDBTransactionMode,
  callback: (tx: IDBTransaction) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    void openDB().then((db) => {
      const tx = db.transaction(storeName, mode);
      const request = callback(tx);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  });
}

// ==================== Groups ====================

export async function getAllGroups(): Promise<DiagramGroup[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GROUPS_STORE, 'readonly');
    const store = tx.objectStore(GROUPS_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const groups = request.result as DiagramGroup[];
      groups.sort((a, b) => a.name.localeCompare(b.name));
      resolve(groups);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function createGroup(name: string): Promise<DiagramGroup> {
  const now = Date.now();
  const group: DiagramGroup = {
    id: uuidV4(),
    name,
    createdAt: now,
    updatedAt: now
  };
  await withTransaction(GROUPS_STORE, 'readwrite', (tx) => {
    const store = tx.objectStore(GROUPS_STORE);
    return store.add(group);
  });
  return group;
}

export async function updateGroup(id: string, name: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GROUPS_STORE, 'readwrite');
    const store = tx.objectStore(GROUPS_STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const group = getReq.result as DiagramGroup;
      if (group) {
        group.name = name;
        group.updatedAt = Date.now();
        store.put(group);
      }
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function deleteGroup(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([GROUPS_STORE, DIAGRAMS_STORE], 'readwrite');
    const groupStore = tx.objectStore(GROUPS_STORE);
    const diagramStore = tx.objectStore(DIAGRAMS_STORE);

    // Delete the group
    groupStore.delete(id);

    // Move diagrams in this group to ungrouped
    const index = diagramStore.index('groupId');
    const request = index.openCursor(IDBKeyRange.only(id));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const diagram = cursor.value as SavedDiagram;
        diagram.groupId = null;
        cursor.update(diagram);
        cursor.continue();
      }
    };

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

// ==================== Diagrams ====================

export async function getAllDiagrams(): Promise<SavedDiagram[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DIAGRAMS_STORE, 'readonly');
    const store = tx.objectStore(DIAGRAMS_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const diagrams = request.result as SavedDiagram[];
      diagrams.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(diagrams);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getDiagramsByGroup(groupId: string | null): Promise<SavedDiagram[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DIAGRAMS_STORE, 'readonly');
    const store = tx.objectStore(DIAGRAMS_STORE);
    const index = store.index('groupId');
    const keyRange = groupId === null ? IDBKeyRange.only('') : IDBKeyRange.only(groupId);

    // For null groupId, we need to iterate all and filter
    if (groupId === null) {
      const request = store.getAll();
      request.onsuccess = () => {
        const diagrams = (request.result as SavedDiagram[]).filter((d) => !d.groupId);
        diagrams.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(diagrams);
      };
      request.onerror = () => reject(request.error);
    } else {
      const request = index.getAll(keyRange);
      request.onsuccess = () => {
        const diagrams = request.result as SavedDiagram[];
        diagrams.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(diagrams);
      };
      request.onerror = () => reject(request.error);
    }

    tx.oncomplete = () => db.close();
  });
}

export async function saveDiagram(
  name: string,
  code: string,
  mermaid: string,
  groupId: string | null
): Promise<SavedDiagram> {
  const now = Date.now();
  const diagram: SavedDiagram = {
    code,
    createdAt: now,
    groupId,
    id: uuidV4(),
    mermaid,
    name,
    updatedAt: now
  };
  await withTransaction(DIAGRAMS_STORE, 'readwrite', (tx) => {
    const store = tx.objectStore(DIAGRAMS_STORE);
    return store.add(diagram);
  });
  return diagram;
}

export async function updateDiagram(
  id: string,
  updates: Partial<Pick<SavedDiagram, 'name' | 'code' | 'mermaid' | 'groupId'>>
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DIAGRAMS_STORE, 'readwrite');
    const store = tx.objectStore(DIAGRAMS_STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const diagram = getReq.result as SavedDiagram;
      if (diagram) {
        Object.assign(diagram, updates, { updatedAt: Date.now() });
        store.put(diagram);
      }
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function deleteDiagram(id: string): Promise<void> {
  await withTransaction(DIAGRAMS_STORE, 'readwrite', (tx) => {
    const store = tx.objectStore(DIAGRAMS_STORE);
    return store.delete(id);
  });
}
