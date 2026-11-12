/* Typisierte Zeilen des zentralen Gebäudemodells. Einheiten: mm, Cent. */
export interface Pt { x: number; y: number }
type Stamp = { created_at: string; updated_at: string };

export interface Project extends Stamp { id: string; name: string; description: string | null; budget_cents: number | null; project_path: string | null }
export interface Building extends Stamp { id: string; project_id: string; name: string; description: string | null }
/** Hintergrundbild eines Geschosses (z. B. Luftbild): Position/Größe in Modell-mm, nur Orientierung – kein Maßbeleg. */
export interface FloorBackground { document_id: string; x: number; y: number; width_mm: number; rotation: number; opacity: number; visible: boolean }
export interface Floor extends Stamp { id: string; building_id: string; name: string; elevation_mm: number; height_mm: number; sort_order: number; background: FloorBackground | null }
/** Unsicherheitsstufen der Bestandsaufnahme */
export type Certainty = 'beobachtet' | 'nutzerangabe' | 'hypothese' | 'ungeklaert' | 'bestaetigt';
export type RoomStatus = 'geplant' | 'in_arbeit' | 'fertig' | 'bestand';
export interface Room extends Stamp {
  id: string; floor_id: string; code: string | null; certainty: Certainty | null; name: string; usage: string | null; polygon: Pt[] | null; area_m2: number | null;
  status: RoomStatus; description: string | null; budget_cents: number | null;
}

export interface WallGeom { x1: number; y1: number; x2: number; y2: number; thickness: number; height: number }
/** Öffnung relativ zur Wand: offset = Abstand Wandanfang → Öffnungsmitte entlang der Wandachse. */
export interface OpeningGeom { offset: number; width: number; height: number; sill: number; flip: 0 | 1; side: 0 | 1 }
export interface DimensionGeom { x1: number; y1: number; x2: number; y2: number; offset: number }
/** Rechteckiges Einbauteil / Möbel (Mittelpunkt, Breite x Tiefe, Höhe, Drehung in Grad). */
export interface BoxGeom { x: number; y: number; w: number; d: number; h: number; rotation: number; elevation: number }

export type ComponentType = 'wall' | 'door' | 'window' | 'dimension' | 'furniture' | 'podest' | 'beam' | 'plate';
export interface Component extends Stamp {
  id: string; floor_id: string; room_id: string | null; certainty: Certainty | null; type: ComponentType;
  geometry: WallGeom | OpeningGeom | DimensionGeom | BoxGeom; material: string | null;
  props: Record<string, unknown> | null; status: string; host_id: string | null;
}

export type Discipline = 'electrical' | 'sanitary';
export interface PlanObject extends Stamp {
  id: string; floor_id: string; certainty: Certainty | null; discipline: Discipline; type: string; x: number; y: number; rotation: number;
  mount_height_mm: number | null; room_id: string | null; circuit_id: string | null; label: string | null;
  name: string | null; props: Record<string, unknown> | null; status: string; notes: string | null;
}
export interface Circuit extends Stamp {
  id: string; project_id: string; designation: string; name: string | null; distribution: string | null;
  props: { protection?: string; cable?: string; rcd?: string } | null; status: string; notes: string | null;
}
export type LineType = 'cable' | 'cold' | 'hot' | 'waste';
export interface Line extends Stamp {
  id: string; floor_id: string; discipline: Discipline; line_type: LineType; points: Pt[];
  start_object_id: string | null; end_object_id: string | null; circuit_id: string | null; length_mm: number;
  props: { cable?: string; dn?: string; material?: string } | null; notes: string | null;
}
export interface SchematicPage extends Stamp { id: string; project_id: string; name: string; sort_order: number }
export interface SchematicSymbol extends Stamp {
  id: string; page_id: string; type: string; x: number; y: number; rotation: number; label: string | null;
  plan_object_id: string | null; circuit_id: string | null; props: Record<string, unknown> | null;
}
export interface SchematicWire extends Stamp {
  id: string; page_id: string; from_symbol_id: string; from_port: string; to_symbol_id: string; to_port: string;
  points: Pt[] | null; circuit_id: string | null; label: string | null;
}
export interface Phase extends Stamp {
  id: string; project_id: string; name: string; sort_order: number; status: string;
  start_date: string | null; end_date: string | null; description: string | null;
}
export type TaskStatus = 'geplant' | 'offen' | 'in_arbeit' | 'pausiert' | 'erledigt';
export type Priority = 'niedrig' | 'mittel' | 'hoch' | 'kritisch';
export interface Task extends Stamp {
  id: string; project_id: string; phase_id: string | null; title: string; description: string | null;
  room_id: string | null; plan_object_id: string | null; trade: string | null; priority: Priority;
  status: TaskStatus; cost_cents: number | null; due_date: string | null; done_at: string | null;
}
export interface TaskDep extends Stamp { id: string; task_id: string; depends_on_id: string }
export type MaterialStatus = 'benoetigt' | 'vorhanden' | 'reserviert' | 'bestellt' | 'verbaut';
export interface Material extends Stamp {
  id: string; project_id: string; name: string; category: string | null; unit: string; article_no: string | null;
  unit_price_cents: number | null; stock_qty: number; required_qty: number; status: MaterialStatus;
  room_id: string | null; task_id: string | null; source: 'manual' | 'auto'; auto_key: string | null; notes: string | null;
}
export interface Expense extends Stamp {
  id: string; project_id: string; description: string; amount_cents: number; date: string | null; category: string | null;
  room_id: string | null; task_id: string | null; material_id: string | null; notes: string | null;
}
export type DocKind = 'photo' | 'document' | 'note' | 'defect' | 'inventory';
export interface DocumentRow extends Stamp {
  id: string; project_id: string; kind: DocKind; title: string; file_name: string | null; mime: string | null;
  size: number | null; storage_key: string | null; description: string | null; room_id: string | null;
  ref_table: string | null; ref_id: string | null; text: string | null; defect_status: string | null;
}
export interface RoomVariant extends Stamp { id: string; room_id: string; name: string; data: { components: Component[] } }

export type SourceKind = 'video' | 'document' | 'image' | 'user' | 'other';
export interface Source extends Stamp {
  id: string; project_id: string; kind: SourceKind; file_name: string; title: string | null; description: string | null;
  /** 0 = ausdrücklich kein Beleg (z. B. KI-Illustration) */ use_as_evidence: number; document_id: string | null;
}
export interface SourceRef extends Stamp { id: string; source_id: string; ref_table: string; ref_id: string; locator: string | null; note: string | null }
export type LinkKind = 'tuer' | 'durchgang' | 'treppe' | 'luke' | 'aussen' | 'sonstiges';
export interface RoomLink extends Stamp {
  id: string; project_id: string; from_room_id: string; to_room_id: string | null; to_label: string | null;
  kind: LinkKind; certainty: Certainty; note: string | null;
}

export interface RowTypes {
  projects: Project; buildings: Building; floors: Floor; rooms: Room; components: Component; circuits: Circuit;
  plan_objects: PlanObject; lines: Line; schematic_pages: SchematicPage; schematic_symbols: SchematicSymbol;
  schematic_wires: SchematicWire; phases: Phase; tasks: Task; task_deps: TaskDep; materials: Material;
  expenses: Expense; documents: DocumentRow; room_variants: RoomVariant;
  sources: Source; source_refs: SourceRef; room_links: RoomLink;
}
