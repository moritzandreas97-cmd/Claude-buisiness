import { RELATIONS, normalizeRow, type TableName } from '../model/schema';
import type { RowTypes } from '../model/types';
import type { AnyRow, Change, ProjectData } from '../db/repository';
import { newId, nowIso } from '../lib/ids';

type DataTable = Exclude<TableName, 'projects'>;
const key = (t: string, id: string) => `${t}:${id}`;

/**
 * Sammelt Änderungen am Projektmodell. Liest konsistent (eigene Änderungen sind sichtbar),
 * löst kaskadierendes Löschen/Nullsetzen gemäß RELATIONS auf und liefert eine geordnete
 * Änderungsliste, die atomar persistiert und als eine Undo-Einheit gespeichert wird.
 */
export class Tx {
  readonly changes: Change[] = [];
  private overlay = new Map<string, AnyRow | null>();
  constructor(private data: ProjectData) {}

  get<T extends DataTable>(table: T, id: string | null | undefined): RowTypes[T] | undefined {
    if (!id) return undefined;
    const k = key(table, id);
    if (this.overlay.has(k)) return (this.overlay.get(k) ?? undefined) as RowTypes[T] | undefined;
    return (this.data[table] as Record<string, RowTypes[T]>)[id];
  }

  all<T extends DataTable>(table: T): RowTypes[T][] {
    const base = this.data[table] as Record<string, RowTypes[T]>;
    const out = new Map<string, RowTypes[T]>(Object.entries(base));
    for (const [k, v] of this.overlay) {
      const [t, id] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)];
      if (t !== table) continue;
      if (v) out.set(id, v as unknown as RowTypes[T]); else out.delete(id);
    }
    return [...out.values()];
  }

  private record(table: DataTable, id: string, before: AnyRow | null, after: AnyRow | null) {
    const idx = this.changes.findIndex((c) => c.table === table && c.id === id);
    if (idx >= 0) {
      const existing = this.changes[idx];
      this.changes.splice(idx, 1);
      if (existing.before === null && after === null) { /* insert+delete → nichts */ }
      else if (after === null) this.changes.push({ table, id, before: existing.before, after: null });
      else this.changes.splice(idx, 0, { table, id, before: existing.before, after });
    } else this.changes.push({ table, id, before, after });
    this.overlay.set(key(table, id), after);
  }

  insert<T extends DataTable>(table: T, row: Partial<RowTypes[T]>): RowTypes[T] {
    const ts = nowIso();
    const full = normalizeRow(table, { created_at: ts, updated_at: ts, ...row, id: (row as AnyRow).id ?? newId() }) as AnyRow;
    if (this.get(table, full.id)) throw new Error(`Doppelte ID in ${table}: ${full.id}`);
    this.record(table, full.id, null, full);
    return full as unknown as RowTypes[T];
  }

  update<T extends DataTable>(table: T, id: string, patch: Partial<RowTypes[T]>): RowTypes[T] {
    const cur = this.get(table, id);
    if (!cur) throw new Error(`Objekt nicht gefunden (${table}/${id})`);
    const next = normalizeRow(table, { ...cur, ...patch, id, updated_at: nowIso() }) as AnyRow;
    this.record(table, id, cur as unknown as AnyRow, next);
    return next as unknown as RowTypes[T];
  }

  /** Löscht ein Objekt inklusive abhängiger Objekte (Kaskade) bzw. löst Referenzen (SET NULL). */
  remove(table: DataTable, id: string) {
    const cur = this.get(table, id);
    if (!cur) return;
    for (const rel of RELATIONS) {
      if (rel.ref !== table || rel.table === 'projects') continue;
      const t = rel.table as DataTable;
      for (const r of this.all(t)) {
        if ((r as unknown as AnyRow)[rel.column] !== id) continue;
        if (rel.onDelete === 'cascade') this.remove(t, (r as unknown as AnyRow).id);
        else this.update(t, (r as unknown as AnyRow).id, { [rel.column]: null } as never);
      }
    }
    // Generische Quellenverweise auf dieses Objekt mitlöschen (keine verwaisten Belege)
    if (table !== 'source_refs') for (const r of this.all('source_refs')) if (r.ref_table === table && r.ref_id === id) this.record('source_refs', r.id, r as unknown as AnyRow, null);
    this.record(table, id, cur as unknown as AnyRow, null);
  }
}

export function applyChanges(data: ProjectData, changes: Change[], direction: 'forward' | 'backward'): ProjectData {
  const next = { ...data } as Record<string, Record<string, unknown>>;
  const touched = new Set<string>();
  const list = direction === 'forward' ? changes : [...changes].reverse();
  for (const c of list) {
    if (c.table === 'projects') continue;
    if (!touched.has(c.table)) { next[c.table] = { ...next[c.table] }; touched.add(c.table); }
    const target = direction === 'forward' ? c.after : c.before;
    if (target) next[c.table][c.id] = target; else delete next[c.table][c.id];
  }
  return next as ProjectData;
}
