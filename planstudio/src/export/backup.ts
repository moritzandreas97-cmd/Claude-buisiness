import type { Platform } from '../lib/platform';
import { fromBase64, toBase64 } from '../lib/platform';
import { INSERT_ORDER, RELATIONS, TABLES, normalizeRow, type TableName } from '../model/schema';
import { MIGRATIONS } from '../db/migrations';
import { decodeRow, loadProjectData, upsertStatement, type AnyRow } from '../db/repository';
import type { Project } from '../model/types';
import { newId, nowIso } from '../lib/ids';

export const BACKUP_FORMAT = 'lebenswerk-planstudio-backup';
export interface BackupFile {
  format: typeof BACKUP_FORMAT; version: 1; schema_version: number; exported_at: string; app: string;
  project: Project; tables: Partial<Record<TableName, AnyRow[]>>; files: Record<string, string>;
}

export async function createBackup(platform: Platform, projectId: string): Promise<BackupFile> {
  const db = platform.db;
  const [raw] = await db.select<Record<string, string | number | null>>('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (!raw) throw new Error('Projekt nicht gefunden.');
  const project = decodeRow('projects', raw);
  const data = await loadProjectData(db, projectId);
  const tables: BackupFile['tables'] = {};
  for (const [t, rows] of Object.entries(data)) tables[t as TableName] = Object.values(rows) as unknown as AnyRow[];
  const files: Record<string, string> = {};
  for (const d of Object.values(data.documents)) {
    if (!d.storage_key) continue;
    const bytes = await platform.files.get(d.storage_key);
    if (bytes) files[d.storage_key] = toBase64(bytes);
  }
  return { format: BACKUP_FORMAT, version: 1, schema_version: MIGRATIONS[MIGRATIONS.length - 1].version, exported_at: nowIso(), app: 'Lebenswerk Adorf PlanStudio 0.1.1', project, tables, files };
}

export function validateBackup(x: unknown): asserts x is BackupFile {
  const b = x as BackupFile;
  if (!b || typeof b !== 'object' || b.format !== BACKUP_FORMAT) throw new Error('Keine gültige PlanStudio-Sicherungsdatei.');
  if (b.version !== 1) throw new Error(`Nicht unterstützte Backup-Version ${b.version}.`);
  if (b.schema_version > MIGRATIONS[MIGRATIONS.length - 1].version) throw new Error('Sicherung stammt aus einer neueren Programmversion.');
  if (!b.project?.id || !b.project?.name) throw new Error('Sicherung enthält keine Projektdaten.');
  for (const t of Object.keys(b.tables ?? {})) if (!(t in TABLES)) throw new Error(`Unbekannte Tabelle in Sicherung: ${t}`);
}

/**
 * Stellt eine Sicherung wieder her. Existiert das Projekt bereits, wird eine Kopie mit
 * neuen IDs angelegt (bestehende Daten werden nie überschrieben). Alles in einer Transaktion.
 */
export async function restoreBackup(platform: Platform, backup: unknown): Promise<{ projectId: string; asCopy: boolean }> {
  validateBackup(backup);
  const b = backup;
  const exists = (await platform.db.select('SELECT id FROM projects WHERE id = ?', [b.project.id])).length > 0;
  const idMap = new Map<string, string>();
  const mapId = (id: string | null | undefined) => {
    if (!id || !exists) return id ?? null;
    if (!idMap.has(id)) idMap.set(id, newId());
    return idMap.get(id)!;
  };
  const fkCols = new Map<string, string[]>();
  for (const r of RELATIONS) fkCols.set(r.table, [...(fkCols.get(r.table) ?? []), r.column]);

  const project = { ...b.project, id: mapId(b.project.id)!, updated_at: nowIso() } as AnyRow;
  if (exists) project.name = `${b.project.name} (Wiederherstellung ${new Date().toLocaleString('de-DE')})`;
  project.project_path = `projects/${project.id}`;
  const statements = [upsertStatement('projects', normalizeRow('projects', project) as AnyRow)];
  const fileCopies: [string, string][] = [];
  for (const t of INSERT_ORDER) {
    if (t === 'projects') continue;
    // Selbstreferenz (Öffnungen → Wand): Wände zuerst
    const rows = [...(b.tables[t] ?? [])].sort((a, c) => (a.host_id ? 1 : 0) - (c.host_id ? 1 : 0));
    for (const r of rows) {
      const row: AnyRow = { ...r, id: mapId(r.id)! };
      for (const c of fkCols.get(t) ?? []) row[c] = mapId(r[c] as string | null);
      if (t === 'documents') {
        if (r.ref_id) row.ref_id = mapId(r.ref_id as string);
        if (r.storage_key && exists) {
          const key = `projects/${project.id}/documents/${row.id}-${r.file_name ?? 'datei'}`;
          fileCopies.push([r.storage_key as string, key]);
          row.storage_key = key;
        }
      }
      if (t === 'room_variants' && exists) {
        const d = r.data as { components?: AnyRow[] } | null;
        row.data = { components: (d?.components ?? []).map((c) => ({ ...c, id: newId(), room_id: row.room_id, floor_id: mapId(c.floor_id as string) })) };
      }
      statements.push(upsertStatement(t, normalizeRow(t, row) as AnyRow));
    }
  }
  // Dateien zuerst ablegen, dann Datenbank transaktional schreiben
  for (const [key, b64] of Object.entries(b.files ?? {})) {
    const target = fileCopies.find(([from]) => from === key)?.[1] ?? key;
    await platform.files.put(target, fromBase64(b64));
  }
  await platform.db.batch(statements);
  await platform.db.flush();
  return { projectId: project.id, asCopy: exists };
}
