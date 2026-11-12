/**
 * Zentrale Tabellen-Metadaten. Einzige Quelle für Spaltentypen und Relationen,
 * die von Repository, Undo/Redo, kaskadierendem Löschen und Backup genutzt wird.
 * Alle Längen in Millimetern, alle Geldbeträge in Cent (Integer).
 */
export type ColType = 'text' | 'int' | 'real' | 'json';

export const TABLES = {
  projects: { id: 'text', name: 'text', description: 'text', budget_cents: 'int', project_path: 'text', created_at: 'text', updated_at: 'text' },
  buildings: { id: 'text', project_id: 'text', name: 'text', description: 'text', created_at: 'text', updated_at: 'text' },
  floors: { id: 'text', building_id: 'text', name: 'text', elevation_mm: 'real', height_mm: 'real', sort_order: 'int', background: 'json', created_at: 'text', updated_at: 'text' },
  rooms: { id: 'text', floor_id: 'text', code: 'text', certainty: 'text', name: 'text', usage: 'text', polygon: 'json', area_m2: 'real', status: 'text', description: 'text', budget_cents: 'int', created_at: 'text', updated_at: 'text' },
  components: { id: 'text', floor_id: 'text', room_id: 'text', certainty: 'text', type: 'text', geometry: 'json', material: 'text', props: 'json', status: 'text', host_id: 'text', created_at: 'text', updated_at: 'text' },
  circuits: { id: 'text', project_id: 'text', designation: 'text', name: 'text', distribution: 'text', props: 'json', status: 'text', notes: 'text', created_at: 'text', updated_at: 'text' },
  plan_objects: { id: 'text', floor_id: 'text', certainty: 'text', discipline: 'text', type: 'text', x: 'real', y: 'real', rotation: 'real', mount_height_mm: 'real', room_id: 'text', circuit_id: 'text', label: 'text', name: 'text', props: 'json', status: 'text', notes: 'text', created_at: 'text', updated_at: 'text' },
  lines: { id: 'text', floor_id: 'text', discipline: 'text', line_type: 'text', points: 'json', start_object_id: 'text', end_object_id: 'text', circuit_id: 'text', length_mm: 'real', props: 'json', notes: 'text', created_at: 'text', updated_at: 'text' },
  schematic_pages: { id: 'text', project_id: 'text', name: 'text', sort_order: 'int', created_at: 'text', updated_at: 'text' },
  schematic_symbols: { id: 'text', page_id: 'text', type: 'text', x: 'real', y: 'real', rotation: 'real', label: 'text', plan_object_id: 'text', circuit_id: 'text', props: 'json', created_at: 'text', updated_at: 'text' },
  schematic_wires: { id: 'text', page_id: 'text', from_symbol_id: 'text', from_port: 'text', to_symbol_id: 'text', to_port: 'text', points: 'json', circuit_id: 'text', label: 'text', created_at: 'text', updated_at: 'text' },
  phases: { id: 'text', project_id: 'text', name: 'text', sort_order: 'int', status: 'text', start_date: 'text', end_date: 'text', description: 'text', created_at: 'text', updated_at: 'text' },
  tasks: { id: 'text', project_id: 'text', phase_id: 'text', title: 'text', description: 'text', room_id: 'text', plan_object_id: 'text', trade: 'text', priority: 'text', status: 'text', cost_cents: 'int', due_date: 'text', done_at: 'text', created_at: 'text', updated_at: 'text' },
  task_deps: { id: 'text', task_id: 'text', depends_on_id: 'text', created_at: 'text', updated_at: 'text' },
  materials: { id: 'text', project_id: 'text', name: 'text', category: 'text', unit: 'text', article_no: 'text', unit_price_cents: 'int', stock_qty: 'real', required_qty: 'real', status: 'text', room_id: 'text', task_id: 'text', source: 'text', auto_key: 'text', notes: 'text', created_at: 'text', updated_at: 'text' },
  expenses: { id: 'text', project_id: 'text', description: 'text', amount_cents: 'int', date: 'text', category: 'text', room_id: 'text', task_id: 'text', material_id: 'text', notes: 'text', created_at: 'text', updated_at: 'text' },
  documents: { id: 'text', project_id: 'text', kind: 'text', title: 'text', file_name: 'text', mime: 'text', size: 'int', storage_key: 'text', description: 'text', room_id: 'text', ref_table: 'text', ref_id: 'text', text: 'text', defect_status: 'text', created_at: 'text', updated_at: 'text' },
  room_variants: { id: 'text', room_id: 'text', name: 'text', data: 'json', created_at: 'text', updated_at: 'text' },
  sources: { id: 'text', project_id: 'text', kind: 'text', file_name: 'text', title: 'text', description: 'text', use_as_evidence: 'int', document_id: 'text', created_at: 'text', updated_at: 'text' },
  source_refs: { id: 'text', source_id: 'text', ref_table: 'text', ref_id: 'text', locator: 'text', note: 'text', created_at: 'text', updated_at: 'text' },
  room_links: { id: 'text', project_id: 'text', from_room_id: 'text', to_room_id: 'text', to_label: 'text', kind: 'text', certainty: 'text', note: 'text', created_at: 'text', updated_at: 'text' },
} as const satisfies Record<string, Record<string, ColType>>;

export type TableName = keyof typeof TABLES;
export const TABLE_NAMES = Object.keys(TABLES) as TableName[];
/** Tabellen, die zu einem geöffneten Projekt gehören (ohne `projects`). */
export const PROJECT_TABLES = TABLE_NAMES.filter((t) => t !== 'projects');

export interface Relation {
  table: TableName;
  column: string;
  ref: TableName;
  onDelete: 'cascade' | 'setnull';
}

export const RELATIONS: Relation[] = [
  { table: 'buildings', column: 'project_id', ref: 'projects', onDelete: 'cascade' },
  { table: 'floors', column: 'building_id', ref: 'buildings', onDelete: 'cascade' },
  { table: 'rooms', column: 'floor_id', ref: 'floors', onDelete: 'cascade' },
  { table: 'components', column: 'floor_id', ref: 'floors', onDelete: 'cascade' },
  { table: 'components', column: 'room_id', ref: 'rooms', onDelete: 'setnull' },
  { table: 'components', column: 'host_id', ref: 'components', onDelete: 'cascade' },
  { table: 'circuits', column: 'project_id', ref: 'projects', onDelete: 'cascade' },
  { table: 'plan_objects', column: 'floor_id', ref: 'floors', onDelete: 'cascade' },
  { table: 'plan_objects', column: 'room_id', ref: 'rooms', onDelete: 'setnull' },
  { table: 'plan_objects', column: 'circuit_id', ref: 'circuits', onDelete: 'setnull' },
  { table: 'lines', column: 'floor_id', ref: 'floors', onDelete: 'cascade' },
  { table: 'lines', column: 'start_object_id', ref: 'plan_objects', onDelete: 'setnull' },
  { table: 'lines', column: 'end_object_id', ref: 'plan_objects', onDelete: 'setnull' },
  { table: 'lines', column: 'circuit_id', ref: 'circuits', onDelete: 'setnull' },
  { table: 'schematic_pages', column: 'project_id', ref: 'projects', onDelete: 'cascade' },
  { table: 'schematic_symbols', column: 'page_id', ref: 'schematic_pages', onDelete: 'cascade' },
  { table: 'schematic_symbols', column: 'plan_object_id', ref: 'plan_objects', onDelete: 'setnull' },
  { table: 'schematic_symbols', column: 'circuit_id', ref: 'circuits', onDelete: 'setnull' },
  { table: 'schematic_wires', column: 'page_id', ref: 'schematic_pages', onDelete: 'cascade' },
  { table: 'schematic_wires', column: 'from_symbol_id', ref: 'schematic_symbols', onDelete: 'cascade' },
  { table: 'schematic_wires', column: 'to_symbol_id', ref: 'schematic_symbols', onDelete: 'cascade' },
  { table: 'schematic_wires', column: 'circuit_id', ref: 'circuits', onDelete: 'setnull' },
  { table: 'phases', column: 'project_id', ref: 'projects', onDelete: 'cascade' },
  { table: 'tasks', column: 'project_id', ref: 'projects', onDelete: 'cascade' },
  { table: 'tasks', column: 'phase_id', ref: 'phases', onDelete: 'setnull' },
  { table: 'tasks', column: 'room_id', ref: 'rooms', onDelete: 'setnull' },
  { table: 'tasks', column: 'plan_object_id', ref: 'plan_objects', onDelete: 'setnull' },
  { table: 'task_deps', column: 'task_id', ref: 'tasks', onDelete: 'cascade' },
  { table: 'task_deps', column: 'depends_on_id', ref: 'tasks', onDelete: 'cascade' },
  { table: 'materials', column: 'project_id', ref: 'projects', onDelete: 'cascade' },
  { table: 'materials', column: 'room_id', ref: 'rooms', onDelete: 'setnull' },
  { table: 'materials', column: 'task_id', ref: 'tasks', onDelete: 'setnull' },
  { table: 'expenses', column: 'project_id', ref: 'projects', onDelete: 'cascade' },
  { table: 'expenses', column: 'room_id', ref: 'rooms', onDelete: 'setnull' },
  { table: 'expenses', column: 'task_id', ref: 'tasks', onDelete: 'setnull' },
  { table: 'expenses', column: 'material_id', ref: 'materials', onDelete: 'setnull' },
  { table: 'documents', column: 'project_id', ref: 'projects', onDelete: 'cascade' },
  { table: 'documents', column: 'room_id', ref: 'rooms', onDelete: 'setnull' },
  { table: 'room_variants', column: 'room_id', ref: 'rooms', onDelete: 'cascade' },
  { table: 'sources', column: 'project_id', ref: 'projects', onDelete: 'cascade' },
  { table: 'sources', column: 'document_id', ref: 'documents', onDelete: 'setnull' },
  { table: 'source_refs', column: 'source_id', ref: 'sources', onDelete: 'cascade' },
  { table: 'room_links', column: 'project_id', ref: 'projects', onDelete: 'cascade' },
  { table: 'room_links', column: 'from_room_id', ref: 'rooms', onDelete: 'cascade' },
  { table: 'room_links', column: 'to_room_id', ref: 'rooms', onDelete: 'cascade' },
];

/** Reihenfolge für Einfügen (Eltern vor Kindern) – wird z. B. beim Backup-Import genutzt. */
export const INSERT_ORDER: TableName[] = [
  'projects', 'buildings', 'floors', 'rooms', 'circuits', 'components', 'plan_objects', 'lines',
  'schematic_pages', 'schematic_symbols', 'schematic_wires', 'phases', 'tasks', 'task_deps',
  'materials', 'expenses', 'documents', 'room_variants', 'sources', 'source_refs', 'room_links',
];

/** Standardwerte für neue Zeilen (entsprechen den DB-Defaults). */
export const DEFAULTS: Partial<Record<TableName, Record<string, unknown>>> = {
  floors: { elevation_mm: 0, height_mm: 2500, sort_order: 0 },
  rooms: { status: 'geplant' },
  components: { status: 'geplant' },
  circuits: { status: 'geplant' },
  plan_objects: { rotation: 0, status: 'geplant' },
  lines: { length_mm: 0 },
  schematic_pages: { sort_order: 0 },
  schematic_symbols: { rotation: 0 },
  phases: { sort_order: 0, status: 'geplant' },
  tasks: { priority: 'mittel', status: 'offen' },
  sources: { use_as_evidence: 1 },
  room_links: { kind: 'durchgang', certainty: 'ungeklaert' },
  materials: { unit: 'Stk', stock_qty: 0, required_qty: 0, status: 'benoetigt', source: 'manual' },
};

/** Vervollständigt eine Zeile: fehlende Spalten → Default oder null, unbekannte Spalten entfernen. */
export function normalizeRow(table: TableName, row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const defs = DEFAULTS[table] ?? {};
  for (const c of Object.keys(TABLES[table])) out[c] = row[c] !== undefined ? row[c] : (defs[c] ?? null);
  return out;
}
