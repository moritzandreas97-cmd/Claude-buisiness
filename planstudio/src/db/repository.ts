import type { SqlDriver, SqlValue, Statement } from './driver';
import { PROJECT_TABLES, TABLES, type TableName } from '../model/schema';
import type { RowTypes } from '../model/types';

export type AnyRow = Record<string, unknown> & { id: string };

/** Zeile aus DB (JSON als Text) → Objekt. */
export function decodeRow<T extends TableName>(table: T, raw: Record<string, SqlValue>): RowTypes[T] {
  const cols = TABLES[table] as Record<string, string>;
  const out: Record<string, unknown> = {};
  for (const [c, type] of Object.entries(cols)) {
    const v = raw[c];
    if (type === 'json') {
      if (v === null || v === undefined || v === '') out[c] = null;
      else {
        try { out[c] = JSON.parse(String(v)); } catch { out[c] = null; }
      }
    } else out[c] = v ?? null;
  }
  return out as unknown as RowTypes[T];
}

function encodeValue(type: string, v: unknown): SqlValue {
  if (v === undefined || v === null) return null;
  if (type === 'json') return JSON.stringify(v);
  if (type === 'int') return typeof v === 'number' ? Math.round(v) : Number.isFinite(Number(v)) ? Math.round(Number(v)) : null;
  if (type === 'real') return typeof v === 'number' ? v : Number.isFinite(Number(v)) ? Number(v) : null;
  return String(v);
}

export function upsertStatement(table: TableName, row: AnyRow): Statement {
  const cols = Object.entries(TABLES[table] as Record<string, string>);
  const names = cols.map(([c]) => c);
  const params = cols.map(([c, t]) => encodeValue(t, row[c]));
  const updates = names.filter((c) => c !== 'id').map((c) => `${c}=excluded.${c}`).join(', ');
  return {
    sql: `INSERT INTO ${table} (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')}) ON CONFLICT(id) DO UPDATE SET ${updates}`,
    params,
  };
}

export const deleteStatement = (table: TableName, id: string): Statement => ({ sql: `DELETE FROM ${table} WHERE id = ?`, params: [id] });

/** Ein Änderungsdatensatz: Grundlage für Persistenz und Undo/Redo. */
export interface Change { table: TableName; id: string; before: AnyRow | null; after: AnyRow | null }

export function changeToStatement(c: Change, direction: 'forward' | 'backward'): Statement {
  const target = direction === 'forward' ? c.after : c.before;
  return target ? upsertStatement(c.table, target) : deleteStatement(c.table, c.id);
}

export function changesToStatements(changes: Change[], direction: 'forward' | 'backward'): Statement[] {
  const list = direction === 'forward' ? changes : [...changes].reverse();
  return list.map((c) => changeToStatement(c, direction));
}

export type ProjectData = { [K in Exclude<TableName, 'projects'>]: Record<string, RowTypes[K]> };

export function emptyProjectData(): ProjectData {
  const d: Record<string, Record<string, unknown>> = {};
  for (const t of PROJECT_TABLES) d[t] = {};
  return d as ProjectData;
}

/** SQL-Filter je Tabelle, um alle Zeilen eines Projekts zu laden. */
const PROJECT_FILTER: Record<Exclude<TableName, 'projects'>, string> = {
  buildings: 'project_id = ?1',
  floors: 'building_id IN (SELECT id FROM buildings WHERE project_id = ?1)',
  rooms: 'floor_id IN (SELECT f.id FROM floors f JOIN buildings b ON b.id = f.building_id WHERE b.project_id = ?1)',
  components: 'floor_id IN (SELECT f.id FROM floors f JOIN buildings b ON b.id = f.building_id WHERE b.project_id = ?1)',
  plan_objects: 'floor_id IN (SELECT f.id FROM floors f JOIN buildings b ON b.id = f.building_id WHERE b.project_id = ?1)',
  lines: 'floor_id IN (SELECT f.id FROM floors f JOIN buildings b ON b.id = f.building_id WHERE b.project_id = ?1)',
  circuits: 'project_id = ?1',
  schematic_pages: 'project_id = ?1',
  schematic_symbols: 'page_id IN (SELECT id FROM schematic_pages WHERE project_id = ?1)',
  schematic_wires: 'page_id IN (SELECT id FROM schematic_pages WHERE project_id = ?1)',
  phases: 'project_id = ?1',
  tasks: 'project_id = ?1',
  task_deps: 'task_id IN (SELECT id FROM tasks WHERE project_id = ?1)',
  materials: 'project_id = ?1',
  expenses: 'project_id = ?1',
  documents: 'project_id = ?1',
  room_variants: 'room_id IN (SELECT r.id FROM rooms r JOIN floors f ON f.id = r.floor_id JOIN buildings b ON b.id = f.building_id WHERE b.project_id = ?1)',
};

export async function loadProjectData(db: SqlDriver, projectId: string): Promise<ProjectData> {
  const data = emptyProjectData() as Record<string, Record<string, unknown>>;
  for (const t of PROJECT_TABLES) {
    const f = PROJECT_FILTER[t as Exclude<TableName, 'projects'>];
    const rows = await db.select<Record<string, SqlValue>>(`SELECT * FROM ${t} WHERE ${f.replace(/\?1/g, '?')}`, Array(f.split('?1').length - 1).fill(projectId));
    for (const r of rows) {
      const row = decodeRow(t, r) as unknown as AnyRow;
      data[t][row.id] = row;
    }
  }
  return data as ProjectData;
}

export async function listProjects(db: SqlDriver) {
  const rows = await db.select<Record<string, SqlValue>>('SELECT * FROM projects ORDER BY updated_at DESC');
  return rows.map((r) => decodeRow('projects', r));
}

export async function getSetting(db: SqlDriver, key: string): Promise<string | null> {
  const r = await db.select<{ value: string | null }>('SELECT value FROM settings WHERE key = ?', [key]);
  return r[0]?.value ?? null;
}
export async function setSetting(db: SqlDriver, key: string, value: string | null) {
  await db.batch([{ sql: 'INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', params: [key, value] }]);
}
