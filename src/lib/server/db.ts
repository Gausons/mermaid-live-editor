import Database from 'better-sqlite3';
import { v4 as uuidV4 } from 'uuid';
import path from 'node:path';

const DB_PATH = process.env.MERMAID_DB_PATH || path.resolve('data', 'mermaid.db');

// Ensure data directory exists
import { mkdirSync } from 'node:fs';
mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS diagrams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    group_id TEXT,
    code TEXT NOT NULL,
    mermaid TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_diagrams_group_id ON diagrams(group_id);
  CREATE INDEX IF NOT EXISTS idx_diagrams_updated_at ON diagrams(updated_at);
`);

// ==================== Types ====================

export interface DBGroup {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
}

export interface DBDiagram {
  id: string;
  name: string;
  group_id: string | null;
  code: string;
  mermaid: string;
  created_at: number;
  updated_at: number;
}

// ==================== Groups ====================

const stmtGetAllGroups = db.prepare('SELECT * FROM groups ORDER BY name ASC');
const stmtGetGroup = db.prepare('SELECT * FROM groups WHERE id = ?');
const stmtInsertGroup = db.prepare(
  'INSERT INTO groups (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)'
);
const stmtUpdateGroup = db.prepare('UPDATE groups SET name = ?, updated_at = ? WHERE id = ?');
const stmtDeleteGroup = db.prepare('DELETE FROM groups WHERE id = ?');

export function getAllGroups(): DBGroup[] {
  return stmtGetAllGroups.all() as DBGroup[];
}

export function getGroup(id: string): DBGroup | undefined {
  return stmtGetGroup.get(id) as DBGroup | undefined;
}

export function createGroup(name: string): DBGroup {
  const id = uuidV4();
  const now = Date.now();
  stmtInsertGroup.run(id, name, now, now);
  return { created_at: now, id, name, updated_at: now };
}

export function updateGroup(id: string, name: string): boolean {
  const now = Date.now();
  const result = stmtUpdateGroup.run(name, now, id);
  return result.changes > 0;
}

export function deleteGroup(id: string): boolean {
  const result = stmtDeleteGroup.run(id);
  return result.changes > 0;
}

// ==================== Diagrams ====================

const stmtGetAllDiagrams = db.prepare('SELECT * FROM diagrams ORDER BY updated_at DESC');
const stmtGetDiagram = db.prepare('SELECT * FROM diagrams WHERE id = ?');
const stmtGetDiagramsByGroup = db.prepare(
  'SELECT * FROM diagrams WHERE group_id = ? ORDER BY updated_at DESC'
);
const stmtGetUngroupedDiagrams = db.prepare(
  'SELECT * FROM diagrams WHERE group_id IS NULL ORDER BY updated_at DESC'
);
const stmtInsertDiagram = db.prepare(
  'INSERT INTO diagrams (id, name, group_id, code, mermaid, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
);
const stmtUpdateDiagram = db.prepare(
  'UPDATE diagrams SET name = ?, group_id = ?, code = ?, mermaid = ?, updated_at = ? WHERE id = ?'
);
const stmtDeleteDiagram = db.prepare('DELETE FROM diagrams WHERE id = ?');

export function getAllDiagrams(): DBDiagram[] {
  return stmtGetAllDiagrams.all() as DBDiagram[];
}

export function getDiagram(id: string): DBDiagram | undefined {
  return stmtGetDiagram.get(id) as DBDiagram | undefined;
}

export function getDiagramsByGroup(groupId: string | null): DBDiagram[] {
  if (groupId === null) {
    return stmtGetUngroupedDiagrams.all() as DBDiagram[];
  }
  return stmtGetDiagramsByGroup.all(groupId) as DBDiagram[];
}

export function createDiagram(
  name: string,
  code: string,
  mermaid: string,
  groupId: string | null
): DBDiagram {
  const id = uuidV4();
  const now = Date.now();
  stmtInsertDiagram.run(id, name, groupId, code, mermaid, now, now);
  return { code, created_at: now, group_id: groupId, id, mermaid, name, updated_at: now };
}

export function updateDiagramRecord(
  id: string,
  updates: { code?: string; group_id?: string | null; mermaid?: string; name?: string }
): boolean {
  const existing = getDiagram(id);
  if (!existing) return false;

  const now = Date.now();
  const name = updates.name ?? existing.name;
  const groupId = updates.group_id !== undefined ? updates.group_id : existing.group_id;
  const code = updates.code ?? existing.code;
  const mermaid = updates.mermaid ?? existing.mermaid;

  const result = stmtUpdateDiagram.run(name, groupId, code, mermaid, now, id);
  return result.changes > 0;
}

export function deleteDiagram(id: string): boolean {
  const result = stmtDeleteDiagram.run(id);
  return result.changes > 0;
}
