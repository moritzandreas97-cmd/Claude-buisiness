/**
 * Versionierte Datenbankmigrationen. Neue Migrationen nur anhängen, niemals ändern.
 */
export interface Migration { version: number; name: string; sql: string }

const ts = `created_at TEXT NOT NULL, updated_at TEXT NOT NULL`;

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial schema',
    sql: `
CREATE TABLE projects (
  id TEXT PRIMARY KEY, name TEXT NOT NULL CHECK(length(trim(name)) > 0), description TEXT,
  budget_cents INTEGER CHECK(budget_cents IS NULL OR budget_cents >= 0), project_path TEXT, ${ts});
CREATE TABLE buildings (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT, ${ts});
CREATE TABLE floors (
  id TEXT PRIMARY KEY, building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  name TEXT NOT NULL, elevation_mm REAL NOT NULL DEFAULT 0, height_mm REAL NOT NULL DEFAULT 2500,
  sort_order INTEGER NOT NULL DEFAULT 0, ${ts});
CREATE TABLE rooms (
  id TEXT PRIMARY KEY, floor_id TEXT NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  name TEXT NOT NULL, usage TEXT, polygon TEXT, area_m2 REAL, status TEXT NOT NULL DEFAULT 'geplant',
  description TEXT, budget_cents INTEGER, ${ts});
CREATE TABLE components (
  id TEXT PRIMARY KEY, floor_id TEXT NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL, type TEXT NOT NULL, geometry TEXT NOT NULL,
  material TEXT, props TEXT, status TEXT NOT NULL DEFAULT 'geplant',
  host_id TEXT REFERENCES components(id) ON DELETE CASCADE, ${ts});
CREATE TABLE circuits (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  designation TEXT NOT NULL, name TEXT, distribution TEXT, props TEXT, status TEXT NOT NULL DEFAULT 'geplant',
  notes TEXT, ${ts});
CREATE TABLE plan_objects (
  id TEXT PRIMARY KEY, floor_id TEXT NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  discipline TEXT NOT NULL, type TEXT NOT NULL, x REAL NOT NULL, y REAL NOT NULL, rotation REAL NOT NULL DEFAULT 0,
  mount_height_mm REAL, room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL,
  circuit_id TEXT REFERENCES circuits(id) ON DELETE SET NULL, label TEXT, name TEXT, props TEXT,
  status TEXT NOT NULL DEFAULT 'geplant', notes TEXT, ${ts});
CREATE TABLE lines (
  id TEXT PRIMARY KEY, floor_id TEXT NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  discipline TEXT NOT NULL, line_type TEXT NOT NULL, points TEXT NOT NULL,
  start_object_id TEXT REFERENCES plan_objects(id) ON DELETE SET NULL,
  end_object_id TEXT REFERENCES plan_objects(id) ON DELETE SET NULL,
  circuit_id TEXT REFERENCES circuits(id) ON DELETE SET NULL, length_mm REAL NOT NULL DEFAULT 0,
  props TEXT, notes TEXT, ${ts});
CREATE TABLE schematic_pages (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, ${ts});
CREATE TABLE schematic_symbols (
  id TEXT PRIMARY KEY, page_id TEXT NOT NULL REFERENCES schematic_pages(id) ON DELETE CASCADE,
  type TEXT NOT NULL, x REAL NOT NULL, y REAL NOT NULL, rotation REAL NOT NULL DEFAULT 0, label TEXT,
  plan_object_id TEXT REFERENCES plan_objects(id) ON DELETE SET NULL,
  circuit_id TEXT REFERENCES circuits(id) ON DELETE SET NULL, props TEXT, ${ts});
CREATE TABLE schematic_wires (
  id TEXT PRIMARY KEY, page_id TEXT NOT NULL REFERENCES schematic_pages(id) ON DELETE CASCADE,
  from_symbol_id TEXT NOT NULL REFERENCES schematic_symbols(id) ON DELETE CASCADE, from_port TEXT NOT NULL,
  to_symbol_id TEXT NOT NULL REFERENCES schematic_symbols(id) ON DELETE CASCADE, to_port TEXT NOT NULL,
  points TEXT, circuit_id TEXT REFERENCES circuits(id) ON DELETE SET NULL, label TEXT, ${ts});
CREATE TABLE phases (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'geplant',
  start_date TEXT, end_date TEXT, description TEXT, ${ts});
CREATE TABLE tasks (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id TEXT REFERENCES phases(id) ON DELETE SET NULL, title TEXT NOT NULL CHECK(length(trim(title)) > 0),
  description TEXT, room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL,
  plan_object_id TEXT REFERENCES plan_objects(id) ON DELETE SET NULL, trade TEXT,
  priority TEXT NOT NULL DEFAULT 'mittel', status TEXT NOT NULL DEFAULT 'offen', cost_cents INTEGER,
  due_date TEXT, done_at TEXT, ${ts});
CREATE TABLE task_deps (
  id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, ${ts},
  CHECK(task_id <> depends_on_id), UNIQUE(task_id, depends_on_id));
CREATE TABLE materials (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK(length(trim(name)) > 0), category TEXT, unit TEXT NOT NULL DEFAULT 'Stk',
  article_no TEXT, unit_price_cents INTEGER CHECK(unit_price_cents IS NULL OR unit_price_cents >= 0),
  stock_qty REAL NOT NULL DEFAULT 0, required_qty REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'benoetigt',
  room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL, task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual', auto_key TEXT, notes TEXT, ${ts});
CREATE UNIQUE INDEX materials_auto_key ON materials(project_id, auto_key) WHERE auto_key IS NOT NULL;
CREATE TABLE expenses (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL, amount_cents INTEGER NOT NULL, date TEXT, category TEXT,
  room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL, task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  material_id TEXT REFERENCES materials(id) ON DELETE SET NULL, notes TEXT, ${ts});
CREATE TABLE documents (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, title TEXT NOT NULL, file_name TEXT, mime TEXT, size INTEGER, storage_key TEXT,
  description TEXT, room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL, ref_table TEXT, ref_id TEXT,
  text TEXT, defect_status TEXT, ${ts});
CREATE TABLE room_variants (
  id TEXT PRIMARY KEY, room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL, data TEXT NOT NULL, ${ts});
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
CREATE INDEX idx_buildings_project ON buildings(project_id);
CREATE INDEX idx_floors_building ON floors(building_id);
CREATE INDEX idx_rooms_floor ON rooms(floor_id);
CREATE INDEX idx_components_floor ON components(floor_id);
CREATE INDEX idx_plan_objects_floor ON plan_objects(floor_id);
CREATE INDEX idx_lines_floor ON lines(floor_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_materials_project ON materials(project_id);
`,
  },
];
