import type { Discipline, LineType } from './types';

/** Symbolbibliothek für Installationspläne (eigene, vereinfachte Darstellung angelehnt an DIN EN 60617). */
export interface PlanSymbolDef {
  type: string;
  discipline: Discipline;
  label: string;
  /** BMK-Kennbuchstaben nach DIN EN IEC 81346-2 (Vorschlag, frei änderbar) */
  bmkPrefix: string;
  /** Standard-Montagehöhe über OKFF in mm, null = Decke / nicht zutreffend */
  mountHeight: number | null;
  /** Materialposition, die pro Objekt als Bedarf erzeugt wird */
  material?: { name: string; category: string; unit: string; perObject?: number; countProp?: string };
  /** Symbolgröße auf dem Plan in mm (Sanitärobjekte maßstäblich) */
  size?: { w: number; d: number };
  /** Anschlusspunkte (Sanitär) */
  connections?: Partial<Record<'cold' | 'hot' | 'waste', boolean>>;
}

export const PLAN_SYMBOLS: PlanSymbolDef[] = [
  { type: 'socket', discipline: 'electrical', label: 'Schutzkontaktsteckdose', bmkPrefix: 'XD', mountHeight: 300, material: { name: 'Schutzkontaktsteckdose (Einsatz)', category: 'Elektro – Schalterprogramm', unit: 'Stk' } },
  { type: 'socket_multi', discipline: 'electrical', label: 'Mehrfachsteckdose', bmkPrefix: 'XD', mountHeight: 300, material: { name: 'Schutzkontaktsteckdose (Einsatz)', category: 'Elektro – Schalterprogramm', unit: 'Stk', countProp: 'count' } },
  { type: 'switch', discipline: 'electrical', label: 'Lichtschalter (Aus)', bmkPrefix: 'SF', mountHeight: 1050, material: { name: 'Ausschalter (Einsatz)', category: 'Elektro – Schalterprogramm', unit: 'Stk' } },
  { type: 'switch_twoway', discipline: 'electrical', label: 'Wechselschalter', bmkPrefix: 'SF', mountHeight: 1050, material: { name: 'Wechselschalter (Einsatz)', category: 'Elektro – Schalterprogramm', unit: 'Stk' } },
  { type: 'switch_cross', discipline: 'electrical', label: 'Kreuzschalter', bmkPrefix: 'SF', mountHeight: 1050, material: { name: 'Kreuzschalter (Einsatz)', category: 'Elektro – Schalterprogramm', unit: 'Stk' } },
  { type: 'pushbutton', discipline: 'electrical', label: 'Taster', bmkPrefix: 'SF', mountHeight: 1050, material: { name: 'Taster (Einsatz)', category: 'Elektro – Schalterprogramm', unit: 'Stk' } },
  { type: 'light', discipline: 'electrical', label: 'Leuchte / Auslass', bmkPrefix: 'EA', mountHeight: null, material: { name: 'Leuchtenauslass / Leuchte', category: 'Elektro – Leuchten', unit: 'Stk' } },
  { type: 'junction_box', discipline: 'electrical', label: 'Geräteanschlussdose', bmkPrefix: 'XG', mountHeight: 300, material: { name: 'Geräteanschlussdose', category: 'Elektro – Dosen', unit: 'Stk' } },
  { type: 'branch_box', discipline: 'electrical', label: 'Abzweigdose', bmkPrefix: 'XG', mountHeight: 2200, material: { name: 'Abzweigdose', category: 'Elektro – Dosen', unit: 'Stk' } },
  { type: 'distribution', discipline: 'electrical', label: 'Unterverteilung', bmkPrefix: 'UV', mountHeight: 1400, material: { name: 'Unterverteilung (Gehäuse)', category: 'Elektro – Verteilung', unit: 'Stk' } },
  { type: 'fixed', discipline: 'electrical', label: 'Festanschluss', bmkPrefix: 'XG', mountHeight: 300, material: { name: 'Festanschlussdose', category: 'Elektro – Dosen', unit: 'Stk' } },
  { type: 'data', discipline: 'electrical', label: 'Datenanschluss', bmkPrefix: 'XF', mountHeight: 300, material: { name: 'Datenanschlussdose', category: 'Elektro – Daten', unit: 'Stk' } },

  { type: 'washbasin', discipline: 'sanitary', label: 'Waschbecken', bmkPrefix: 'WT', mountHeight: 850, size: { w: 600, d: 450 }, connections: { cold: true, hot: true, waste: true }, material: { name: 'Waschbecken', category: 'Sanitär – Objekte', unit: 'Stk' } },
  { type: 'wc', discipline: 'sanitary', label: 'WC', bmkPrefix: 'WC', mountHeight: 400, size: { w: 380, d: 550 }, connections: { cold: true, waste: true }, material: { name: 'WC', category: 'Sanitär – Objekte', unit: 'Stk' } },
  { type: 'shower', discipline: 'sanitary', label: 'Dusche', bmkPrefix: 'DU', mountHeight: 0, size: { w: 900, d: 900 }, connections: { cold: true, hot: true, waste: true }, material: { name: 'Duschwanne / Duschfläche', category: 'Sanitär – Objekte', unit: 'Stk' } },
  { type: 'bathtub', discipline: 'sanitary', label: 'Badewanne', bmkPrefix: 'BW', mountHeight: 0, size: { w: 1700, d: 750 }, connections: { cold: true, hot: true, waste: true }, material: { name: 'Badewanne', category: 'Sanitär – Objekte', unit: 'Stk' } },
  { type: 'sink', discipline: 'sanitary', label: 'Spüle', bmkPrefix: 'SP', mountHeight: 900, size: { w: 800, d: 500 }, connections: { cold: true, hot: true, waste: true }, material: { name: 'Spüle', category: 'Sanitär – Objekte', unit: 'Stk' } },
  { type: 'washing_machine', discipline: 'sanitary', label: 'Waschmaschinenanschluss', bmkPrefix: 'WM', mountHeight: 1000, size: { w: 600, d: 600 }, connections: { cold: true, waste: true }, material: { name: 'Waschmaschinenanschluss (Geräteventil + Siphon)', category: 'Sanitär – Anschlüsse', unit: 'Stk' } },
  { type: 'cold_conn', discipline: 'sanitary', label: 'Kaltwasseranschluss', bmkPrefix: 'KW', mountHeight: 500, connections: { cold: true }, material: { name: 'Kaltwasseranschluss (Wandscheibe)', category: 'Sanitär – Anschlüsse', unit: 'Stk' } },
  { type: 'hot_conn', discipline: 'sanitary', label: 'Warmwasseranschluss', bmkPrefix: 'WW', mountHeight: 500, connections: { hot: true }, material: { name: 'Warmwasseranschluss (Wandscheibe)', category: 'Sanitär – Anschlüsse', unit: 'Stk' } },
  { type: 'waste_conn', discipline: 'sanitary', label: 'Abwasseranschluss', bmkPrefix: 'AW', mountHeight: 450, connections: { waste: true }, material: { name: 'Abwasseranschluss', category: 'Sanitär – Anschlüsse', unit: 'Stk' } },
  { type: 'valve', discipline: 'sanitary', label: 'Absperrventil', bmkPrefix: 'QM', mountHeight: 500, material: { name: 'Absperrventil', category: 'Sanitär – Armaturen', unit: 'Stk' } },
  { type: 'water_heater', discipline: 'sanitary', label: 'Warmwasserbereiter', bmkPrefix: 'WB', mountHeight: 1500, size: { w: 500, d: 500 }, connections: { cold: true, hot: true }, material: { name: 'Warmwasserbereiter', category: 'Sanitär – Geräte', unit: 'Stk' } },
];

export const symbolDef = (type: string) => PLAN_SYMBOLS.find((s) => s.type === type);

export interface LineTypeDef { type: LineType; discipline: Discipline; label: string; color: string; dash?: string }
export const LINE_TYPES: LineTypeDef[] = [
  { type: 'cable', discipline: 'electrical', label: 'Elektroleitung', color: '#f59e0b' },
  { type: 'cold', discipline: 'sanitary', label: 'Kaltwasser (PWC)', color: '#2563eb' },
  { type: 'hot', discipline: 'sanitary', label: 'Warmwasser (PWH)', color: '#dc2626', dash: '' },
  { type: 'waste', discipline: 'sanitary', label: 'Abwasser', color: '#78716c', dash: '14 6' },
];
export const lineTypeDef = (t: string) => LINE_TYPES.find((l) => l.type === t) ?? LINE_TYPES[0];

export const CABLE_TYPES = ['NYM-J 3x1,5', 'NYM-J 3x2,5', 'NYM-J 5x1,5', 'NYM-J 5x2,5', 'NYM-J 5x6', 'NYM-J 5x10', 'NYM-O 2x1,5', 'Cat.7 S/FTP', 'J-Y(St)Y 2x2x0,8'];
export const DN_VALUES = ['DN 10', 'DN 12', 'DN 15', 'DN 20', 'DN 25', 'DN 32', 'DN 40', 'DN 50', 'DN 70', 'DN 90', 'DN 100', 'DN 110', 'DN 125'];

export interface FurnitureDef { type: string; label: string; w: number; d: number; h: number }
export const FURNITURE: FurnitureDef[] = [
  { type: 'bed', label: 'Bett 180×200', w: 1800, d: 2000, h: 450 },
  { type: 'bed_single', label: 'Bett 90×200', w: 900, d: 2000, h: 450 },
  { type: 'sofa', label: 'Sofa', w: 2200, d: 900, h: 850 },
  { type: 'table', label: 'Tisch', w: 1600, d: 900, h: 750 },
  { type: 'chair', label: 'Stuhl', w: 450, d: 500, h: 900 },
  { type: 'wardrobe', label: 'Schrank', w: 2000, d: 600, h: 2200 },
  { type: 'shelf', label: 'Regal', w: 1000, d: 350, h: 1800 },
  { type: 'desk', label: 'Schreibtisch', w: 1400, d: 700, h: 750 },
  { type: 'kitchen', label: 'Küchenzeile', w: 2400, d: 600, h: 900 },
  { type: 'fridge', label: 'Kühlschrank', w: 600, d: 650, h: 1850 },
  { type: 'custom', label: 'Freies Möbel', w: 1000, d: 500, h: 800 },
];
export const furnitureDef = (t: string) => FURNITURE.find((f) => f.type === t);

export const ROOM_USAGES = ['Wohnen', 'Schlafen', 'Küche', 'Bad', 'WC', 'Flur', 'Arbeiten', 'Kind', 'Technik', 'Abstellraum', 'Keller', 'Werkstatt', 'Lager', 'Sonstiges'];
export const TRADES = ['Rohbau', 'Abbruch', 'Elektro', 'Sanitär', 'Heizung', 'Trockenbau', 'Putz', 'Estrich', 'Fliesen', 'Maler', 'Boden', 'Tischler', 'Dach', 'Fenster/Türen', 'Außenanlage', 'Sonstiges'];
export const TASK_STATUS = [
  { v: 'geplant', label: 'Geplant' }, { v: 'offen', label: 'Offen' }, { v: 'in_arbeit', label: 'In Arbeit' },
  { v: 'pausiert', label: 'Pausiert' }, { v: 'erledigt', label: 'Erledigt' },
] as const;
export const PRIORITIES = [
  { v: 'niedrig', label: 'Niedrig' }, { v: 'mittel', label: 'Mittel' }, { v: 'hoch', label: 'Hoch' }, { v: 'kritisch', label: 'Kritisch' },
] as const;
export const MATERIAL_STATUS = [
  { v: 'benoetigt', label: 'Benötigt' }, { v: 'vorhanden', label: 'Vorhanden' }, { v: 'reserviert', label: 'Reserviert' },
  { v: 'bestellt', label: 'Bestellt' }, { v: 'verbaut', label: 'Verbaut' },
] as const;
export const OBJECT_STATUS = [
  { v: 'geplant', label: 'Geplant' }, { v: 'in_arbeit', label: 'In Arbeit' }, { v: 'installiert', label: 'Installiert' },
  { v: 'geprueft', label: 'Geprüft' }, { v: 'bestand', label: 'Bestand' },
] as const;
export const ROOM_STATUS = [
  { v: 'geplant', label: 'Geplant' }, { v: 'in_arbeit', label: 'In Arbeit' }, { v: 'fertig', label: 'Fertig' }, { v: 'bestand', label: 'Bestand' },
] as const;
export const UNITS = ['Stk', 'm', 'm²', 'm³', 'kg', 'l', 'Sack', 'Paket', 'Rolle', 'Satz', 'pauschal'];
export const labelOf = (list: readonly { v: string; label: string }[], v: string | null | undefined) => list.find((x) => x.v === v)?.label ?? v ?? '–';

/* ---------------- Stromlaufplan-Symbole ---------------- */
export interface SchemPort { id: string; x: number; y: number }
export interface SchemSymbolDef { type: string; label: string; bmkPrefix: string; ports: SchemPort[]; w: number; h: number }
/** Lokale Koordinaten in Raster-Einheiten (1 Einheit = 1 mm auf A3-Blatt, Raster 5). Ursprung = Symbolmitte. */
export const SCHEM_SYMBOLS: SchemSymbolDef[] = [
  { type: 'feed', label: 'Einspeisung L/N', bmkPrefix: 'X', w: 20, h: 10, ports: [{ id: 'L', x: -5, y: 10 }, { id: 'N', x: 5, y: 10 }] },
  { type: 'mcb', label: 'Leitungsschutzschalter', bmkPrefix: 'F', w: 10, h: 20, ports: [{ id: '1', x: 0, y: -10 }, { id: '2', x: 0, y: 10 }] },
  { type: 'rcd', label: 'Fehlerstromschutzschalter', bmkPrefix: 'F', w: 20, h: 20, ports: [{ id: '1', x: -5, y: -10 }, { id: '3', x: 5, y: -10 }, { id: '2', x: -5, y: 10 }, { id: '4', x: 5, y: 10 }] },
  { type: 'switch', label: 'Schalter (Schließer)', bmkPrefix: 'S', w: 10, h: 20, ports: [{ id: '1', x: 0, y: -10 }, { id: '2', x: 0, y: 10 }] },
  { type: 'twoway', label: 'Wechselschalter', bmkPrefix: 'S', w: 20, h: 20, ports: [{ id: 'P', x: 0, y: 10 }, { id: '1', x: -5, y: -10 }, { id: '2', x: 5, y: -10 }] },
  { type: 'pushbutton', label: 'Taster', bmkPrefix: 'S', w: 10, h: 20, ports: [{ id: '3', x: 0, y: -10 }, { id: '4', x: 0, y: 10 }] },
  { type: 'contact_no', label: 'Schließerkontakt', bmkPrefix: 'K', w: 10, h: 20, ports: [{ id: '13', x: 0, y: -10 }, { id: '14', x: 0, y: 10 }] },
  { type: 'coil', label: 'Relais-/Schützspule', bmkPrefix: 'K', w: 16, h: 20, ports: [{ id: 'A1', x: 0, y: -10 }, { id: 'A2', x: 0, y: 10 }] },
  { type: 'light', label: 'Leuchte', bmkPrefix: 'E', w: 14, h: 20, ports: [{ id: '1', x: 0, y: -10 }, { id: '2', x: 0, y: 10 }] },
  { type: 'socket', label: 'Steckdose', bmkPrefix: 'X', w: 16, h: 16, ports: [{ id: 'L', x: -4, y: -8 }, { id: 'N', x: 4, y: -8 }] },
  { type: 'terminal', label: 'Klemme', bmkPrefix: 'X', w: 6, h: 10, ports: [{ id: '1', x: 0, y: -5 }, { id: '2', x: 0, y: 5 }] },
  { type: 'load', label: 'Verbraucher / Festanschluss', bmkPrefix: 'M', w: 16, h: 16, ports: [{ id: '1', x: 0, y: -8 }, { id: '2', x: 0, y: 8 }] },
  { type: 'pe', label: 'Schutzleiter / Erdung', bmkPrefix: 'PE', w: 10, h: 10, ports: [{ id: 'PE', x: 0, y: -5 }] },
];
export const schemDef = (t: string) => SCHEM_SYMBOLS.find((s) => s.type === t) ?? SCHEM_SYMBOLS[0];
/** A3-Querformat in mm, Spalten 1–8, Zeilen A–F für Querverweise. */
export const SCHEM_PAGE = { w: 420, h: 297, cols: 8, rows: 6, margin: 10 };

/* ---------------- Bestandsaufnahme ---------------- */
export const CERTAINTY = [
  { v: 'beobachtet', label: 'Beobachtet (Video/Foto)', color: '#3b82f6', dash: '' },
  { v: 'nutzerangabe', label: 'Nutzerangabe', color: '#a855f7', dash: '6 3' },
  { v: 'hypothese', label: 'Hypothese', color: '#f59e0b', dash: '4 4' },
  { v: 'ungeklaert', label: 'Ungeklärt', color: '#ef4444', dash: '1 4' },
  { v: 'bestaetigt', label: 'Bestätigt (Aufmaß)', color: '#22c55e', dash: '' },
] as const;
export const certaintyDef = (v: string | null | undefined) => CERTAINTY.find((c) => c.v === v);
export const LINK_KINDS = [
  { v: 'tuer', label: 'Tür' }, { v: 'durchgang', label: 'Durchgang/Öffnung' }, { v: 'treppe', label: 'Treppe' },
  { v: 'luke', label: 'Luke' }, { v: 'aussen', label: 'Außenzugang' }, { v: 'sonstiges', label: 'Sonstiges' },
] as const;
export const SOURCE_KINDS = [
  { v: 'video', label: 'Video' }, { v: 'document', label: 'Dokument' }, { v: 'image', label: 'Bild/Luftbild' },
  { v: 'user', label: 'Nutzerangabe' }, { v: 'other', label: 'Sonstiges' },
] as const;
