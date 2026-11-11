import type { Tx } from '../../store/tx';
import type { BoxGeom, Component, DimensionGeom, Line, OpeningGeom, PlanObject, Pt, Room, WallGeom } from '../../model/types';
import { add, dist, mm2ToM2, norm, openingFits, pointInPolygon, polygonArea, polygonCentroid, polylineLength, rotatePoint, wallLength } from '../../model/geometry';
import { symbolDef } from '../../model/catalog';
import type { Selection } from '../../store/uiStore';

export class GeometryError extends Error {}
const EPS = 1;

export const MIN_WALL = 50; // mm
export const MIN_THICK = 20;

export function validateWall(g: WallGeom) {
  if (![g.x1, g.y1, g.x2, g.y2, g.thickness, g.height].every(Number.isFinite)) throw new GeometryError('Ungültige Wandkoordinaten.');
  if (wallLength(g) < MIN_WALL) throw new GeometryError(`Wand zu kurz (mindestens ${MIN_WALL} mm).`);
  if (g.thickness < MIN_THICK || g.thickness > 2000) throw new GeometryError('Wandstärke muss zwischen 20 und 2000 mm liegen.');
  if (g.height <= 0) throw new GeometryError('Wandhöhe muss größer als 0 sein.');
}

export function validateOpening(wall: WallGeom, o: OpeningGeom, kind: string) {
  if (!(o.width > 0)) throw new GeometryError('Öffnungsbreite muss größer als 0 sein.');
  if (!(o.height > 0)) throw new GeometryError('Öffnungshöhe muss größer als 0 sein.');
  if (o.sill < 0) throw new GeometryError('Brüstungshöhe darf nicht negativ sein.');
  if (o.sill + o.height > wall.height + EPS) throw new GeometryError(`${kind === 'door' ? 'Tür' : 'Fenster'} ist höher als die Wand (${Math.round(wall.height)} mm).`);
  if (!openingFits(wall, o)) throw new GeometryError(`${kind === 'door' ? 'Tür' : 'Fenster'} (${Math.round(o.width)} mm) passt an dieser Position nicht in die Wand (Länge ${Math.round(wallLength(wall))} mm).`);
}

/** Prüft/korrigiert Öffnungen nach einer Wandänderung. Liegt eine Öffnung außerhalb, wird sie
 *  an das Wandende geschoben; passt sie gar nicht, wird die Änderung abgelehnt. */
export function reconcileOpenings(tx: Tx, wallId: string) {
  const wall = tx.get('components', wallId);
  if (!wall) return;
  const g = wall.geometry as WallGeom;
  const L = wallLength(g);
  for (const o of tx.all('components').filter((c) => c.host_id === wallId)) {
    const og = { ...(o.geometry as OpeningGeom) };
    if (og.width > L - EPS) throw new GeometryError(`Wand wäre kürzer als ${o.type === 'door' ? 'die Tür' : 'das Fenster'} (${Math.round(og.width)} mm).`);
    const min = og.width / 2, max = L - og.width / 2;
    const clamped = Math.min(max, Math.max(min, og.offset));
    if (Math.abs(clamped - (o.geometry as OpeningGeom).offset) > 0.01) tx.update('components', o.id, { geometry: { ...og, offset: clamped } });
    if (og.sill + og.height > g.height + EPS) throw new GeometryError(`Wandhöhe kleiner als ${o.type === 'door' ? 'Türhöhe' : 'Fensteroberkante'}.`);
  }
}

export function addWall(tx: Tx, floorId: string, a: Pt, b: Pt, thickness: number, height: number) {
  const g: WallGeom = { x1: a.x, y1: a.y, x2: b.x, y2: b.y, thickness, height };
  validateWall(g);
  return tx.insert('components', { floor_id: floorId, type: 'wall', geometry: g, status: 'geplant', material: null, props: null });
}

export function updateWall(tx: Tx, id: string, patch: Partial<WallGeom>, opts: { moveConnected?: boolean } = {}) {
  const w = tx.get('components', id);
  if (!w || w.type !== 'wall') throw new GeometryError('Wand nicht gefunden.');
  const old = w.geometry as WallGeom;
  const g = { ...old, ...patch };
  validateWall(g);
  tx.update('components', id, { geometry: g });
  reconcileOpenings(tx, id);
  if (opts.moveConnected) {
    const moves: [Pt, Pt][] = [[{ x: old.x1, y: old.y1 }, { x: g.x1, y: g.y1 }], [{ x: old.x2, y: old.y2 }, { x: g.x2, y: g.y2 }]];
    for (const [from, to] of moves) {
      if (dist(from, to) < 0.01) continue;
      for (const other of tx.all('components').filter((c) => c.type === 'wall' && c.id !== id && c.floor_id === w.floor_id)) {
        const og = other.geometry as WallGeom;
        let np: Partial<WallGeom> | null = null;
        if (dist({ x: og.x1, y: og.y1 }, from) < EPS) np = { x1: to.x, y1: to.y };
        else if (dist({ x: og.x2, y: og.y2 }, from) < EPS) np = { x2: to.x, y2: to.y };
        if (np) { const ng = { ...og, ...np }; validateWall(ng); tx.update('components', other.id, { geometry: ng }); reconcileOpenings(tx, other.id); }
      }
    }
  }
}

/** Wandlänge numerisch setzen: Anfangspunkt bleibt, Endpunkt wird entlang der Wandrichtung verschoben. */
export function setWallLength(tx: Tx, id: string, length: number, moveConnected = true) {
  const w = tx.get('components', id);
  if (!w) throw new GeometryError('Wand nicht gefunden.');
  const g = w.geometry as WallGeom;
  if (!(length >= MIN_WALL)) throw new GeometryError(`Wandlänge muss mindestens ${MIN_WALL} mm betragen.`);
  const d = norm({ x: g.x2 - g.x1, y: g.y2 - g.y1 });
  updateWall(tx, id, { x2: g.x1 + d.x * length, y2: g.y1 + d.y * length }, { moveConnected });
}

export function addOpening(tx: Tx, wallId: string, type: 'door' | 'window', offset: number, dims?: Partial<OpeningGeom>) {
  const wall = tx.get('components', wallId);
  if (!wall || wall.type !== 'wall') throw new GeometryError('Öffnungen können nur in Wände gesetzt werden.');
  const g: OpeningGeom = type === 'door'
    ? { offset, width: 885, height: 2010, sill: 0, flip: 0, side: 0, ...dims }
    : { offset, width: 1010, height: 1260, sill: 900, flip: 0, side: 0, ...dims };
  const wg = wall.geometry as WallGeom;
  validateOpening(wg, g, type);
  for (const o of tx.all('components').filter((c) => c.host_id === wallId)) {
    const og = o.geometry as OpeningGeom;
    if (Math.abs(og.offset - g.offset) < (og.width + g.width) / 2 - EPS) throw new GeometryError('Öffnung überschneidet sich mit einer vorhandenen Öffnung.');
  }
  return tx.insert('components', { floor_id: wall.floor_id, type, host_id: wallId, geometry: g, status: 'geplant' });
}

export function updateOpening(tx: Tx, id: string, patch: Partial<OpeningGeom>) {
  const o = tx.get('components', id);
  if (!o || !o.host_id) throw new GeometryError('Öffnung nicht gefunden.');
  const wall = tx.get('components', o.host_id)!;
  const g = { ...(o.geometry as OpeningGeom), ...patch };
  validateOpening(wall.geometry as WallGeom, g, o.type);
  for (const x of tx.all('components').filter((c) => c.host_id === o.host_id && c.id !== id)) {
    const og = x.geometry as OpeningGeom;
    if (Math.abs(og.offset - g.offset) < (og.width + g.width) / 2 - EPS) throw new GeometryError('Öffnung überschneidet sich mit einer vorhandenen Öffnung.');
  }
  tx.update('components', id, { geometry: g });
}

export function roomAt(tx: Tx, floorId: string, p: Pt): string | null {
  const rooms = tx.all('rooms').filter((r) => r.floor_id === floorId && r.polygon && r.polygon.length >= 3);
  // kleinster Raum zuerst (verschachtelte Räume)
  rooms.sort((a, b) => polygonArea(a.polygon!) - polygonArea(b.polygon!));
  return rooms.find((r) => pointInPolygon(p, r.polygon!))?.id ?? null;
}

export function addRoom(tx: Tx, floorId: string, polygon: Pt[], name?: string) {
  if (polygon.length < 3) throw new GeometryError('Ein Raum benötigt mindestens 3 Eckpunkte.');
  const area = polygonArea(polygon);
  if (area < 100_000) throw new GeometryError('Raumfläche zu klein (< 0,1 m²).');
  const n = tx.all('rooms').filter((r) => r.floor_id === floorId).length + 1;
  return tx.insert('rooms', { floor_id: floorId, name: name ?? `Raum ${n}`, polygon, area_m2: Math.round(mm2ToM2(area) * 100) / 100, status: 'geplant' });
}

export function setRoomPolygon(tx: Tx, id: string, polygon: Pt[]) {
  tx.update('rooms', id, { polygon, area_m2: Math.round(mm2ToM2(polygonArea(polygon)) * 100) / 100 });
}

/** Nächste freie Betriebsmittelkennzeichnung, z. B. -XD3 */
export function nextLabel(tx: Tx, prefix: string) {
  const used = new Set<number>();
  const re = new RegExp(`^-?${prefix}(\\d+)$`);
  for (const o of tx.all('plan_objects')) { const m = re.exec(o.label ?? ''); if (m) used.add(Number(m[1])); }
  let i = 1; while (used.has(i)) i++;
  return `-${prefix}${i}`;
}

export function addPlanObject(tx: Tx, floorId: string, type: string, p: Pt, extra: Partial<PlanObject> = {}) {
  const def = symbolDef(type);
  if (!def) throw new GeometryError(`Unbekannter Objekttyp: ${type}`);
  const props: Record<string, unknown> = {};
  if (type === 'socket_multi') props.count = 3;
  if (def.connections) props.connections = { ...def.connections };
  return tx.insert('plan_objects', {
    floor_id: floorId, discipline: def.discipline, type, x: p.x, y: p.y, rotation: 0,
    mount_height_mm: def.mountHeight, room_id: roomAt(tx, floorId, p), label: nextLabel(tx, def.bmkPrefix),
    name: def.label, props, status: 'geplant', ...extra,
  });
}

export function addLine(tx: Tx, floorId: string, line: Pick<Line, 'discipline' | 'line_type' | 'points'> & Partial<Line>) {
  if (line.points.length < 2) throw new GeometryError('Ein Leitungsweg benötigt mindestens 2 Punkte.');
  const length = polylineLength(line.points);
  if (length < 1) throw new GeometryError('Leitungsweg hat keine Länge.');
  return tx.insert('lines', { floor_id: floorId, ...line, length_mm: Math.round(length) });
}

export function updateLinePoints(tx: Tx, id: string, points: Pt[]) {
  tx.update('lines', id, { points, length_mm: Math.round(polylineLength(points)) });
}

export function addBox(tx: Tx, floorId: string, type: 'furniture' | 'podest' | 'beam' | 'plate', g: BoxGeom, props: Record<string, unknown> = {}) {
  if (!(g.w > 0 && g.d > 0 && g.h >= 0)) throw new GeometryError('Abmessungen müssen größer als 0 sein.');
  return tx.insert('components', { floor_id: floorId, type, geometry: g, room_id: roomAt(tx, floorId, g), props, status: 'geplant' });
}

export function addDimension(tx: Tx, floorId: string, a: Pt, b: Pt, offset = 400) {
  if (dist(a, b) < 1) throw new GeometryError('Maßlinie hat keine Länge.');
  const g: DimensionGeom = { x1: a.x, y1: a.y, x2: b.x, y2: b.y, offset };
  return tx.insert('components', { floor_id: floorId, type: 'dimension', geometry: g, status: 'geplant' });
}

const movePt = (p: Pt, d: Pt) => add(p, d);

/** Verschiebt eine Auswahl um delta (mm). Öffnungen gleiten entlang ihrer Wand. */
export function moveSelection(tx: Tx, sel: Selection[], delta: Pt, stretchConnected = true) {
  const ids = new Set(sel.map((s) => s.id));
  const movedEnds: Pt[] = [];
  let floorId: string | null = null;
  for (const s of sel) {
    if (s.table === 'plan_objects') {
      const o = tx.get('plan_objects', s.id); if (!o) continue;
      const p = movePt(o, delta);
      tx.update('plan_objects', o.id, { x: p.x, y: p.y, room_id: roomAt(tx, o.floor_id, p) });
    } else if (s.table === 'lines') {
      const l = tx.get('lines', s.id); if (!l) continue;
      tx.update('lines', l.id, { points: l.points.map((p) => movePt(p, delta)) });
    } else if (s.table === 'rooms') {
      const r = tx.get('rooms', s.id); if (!r?.polygon) continue;
      setRoomPolygon(tx, r.id, r.polygon.map((p) => movePt(p, delta)));
    } else {
      const c = tx.get('components', s.id); if (!c) continue;
      floorId = c.floor_id;
      if (c.type === 'wall') {
        const g = c.geometry as WallGeom;
        movedEnds.push({ x: g.x1, y: g.y1 }, { x: g.x2, y: g.y2 });
        tx.update('components', c.id, { geometry: { ...g, x1: g.x1 + delta.x, y1: g.y1 + delta.y, x2: g.x2 + delta.x, y2: g.y2 + delta.y } });
      } else if (c.type === 'door' || c.type === 'window') {
        if (c.host_id && ids.has(c.host_id)) continue; // wandert mit der Wand
        const wall = tx.get('components', c.host_id)!;
        const wg = wall.geometry as WallGeom;
        const d = norm({ x: wg.x2 - wg.x1, y: wg.y2 - wg.y1 });
        const og = c.geometry as OpeningGeom;
        const along = delta.x * d.x + delta.y * d.y;
        const L = wallLength(wg);
        updateOpening(tx, c.id, { offset: Math.min(L - og.width / 2, Math.max(og.width / 2, og.offset + along)) });
      } else if (c.type === 'dimension') {
        const g = c.geometry as DimensionGeom;
        tx.update('components', c.id, { geometry: { ...g, x1: g.x1 + delta.x, y1: g.y1 + delta.y, x2: g.x2 + delta.x, y2: g.y2 + delta.y } });
      } else {
        const g = c.geometry as BoxGeom;
        const p = movePt(g, delta);
        tx.update('components', c.id, { geometry: { ...g, x: p.x, y: p.y }, room_id: roomAt(tx, c.floor_id, p) });
      }
    }
  }
  // Angeschlossene (nicht ausgewählte) Wände werden an den gemeinsamen Endpunkten mitgezogen
  if (stretchConnected && movedEnds.length) {
    for (const w of tx.all('components').filter((c) => c.type === 'wall' && !ids.has(c.id) && (floorId === null || c.floor_id === floorId))) {
      const g = w.geometry as WallGeom;
      const p1 = movedEnds.some((e) => dist(e, { x: g.x1, y: g.y1 }) < EPS);
      const p2 = movedEnds.some((e) => dist(e, { x: g.x2, y: g.y2 }) < EPS);
      if (!p1 && !p2) continue;
      const ng = { ...g, ...(p1 ? { x1: g.x1 + delta.x, y1: g.y1 + delta.y } : {}), ...(p2 ? { x2: g.x2 + delta.x, y2: g.y2 + delta.y } : {}) };
      validateWall(ng);
      tx.update('components', w.id, { geometry: ng });
      reconcileOpenings(tx, w.id);
    }
  }
}

/** Kopiert eine Auswahl (inkl. Öffnungen kopierter Wände) mit Versatz. Liefert neue Auswahl. */
export function duplicateSelection(tx: Tx, sel: Selection[], delta: Pt): Selection[] {
  const out: Selection[] = [];
  const strip = <T extends { id: string; created_at: string; updated_at: string }>(r: T) => { const { id: _i, created_at: _c, updated_at: _u, ...rest } = r; return rest; };
  for (const s of sel) {
    if (s.table === 'plan_objects') {
      const o = tx.get('plan_objects', s.id); if (!o) continue;
      const def = symbolDef(o.type);
      const n = tx.insert('plan_objects', { ...strip(o), x: o.x + delta.x, y: o.y + delta.y, label: def ? nextLabel(tx, def.bmkPrefix) : o.label, room_id: roomAt(tx, o.floor_id, add(o, delta)) });
      out.push({ table: 'plan_objects', id: n.id });
    } else if (s.table === 'lines') {
      const l = tx.get('lines', s.id); if (!l) continue;
      const n = tx.insert('lines', { ...strip(l), points: l.points.map((p) => add(p, delta)), start_object_id: null, end_object_id: null });
      out.push({ table: 'lines', id: n.id });
    } else if (s.table === 'rooms') {
      const r = tx.get('rooms', s.id); if (!r?.polygon) continue;
      const n = tx.insert('rooms', { ...strip(r), name: `${r.name} (Kopie)`, polygon: r.polygon.map((p) => add(p, delta)) });
      out.push({ table: 'rooms', id: n.id });
    } else {
      const c = tx.get('components', s.id); if (!c) continue;
      if (c.type === 'door' || c.type === 'window') continue; // Öffnungen nur mit ihrer Wand
      let geometry = c.geometry;
      if (c.type === 'wall' || c.type === 'dimension') { const g = c.geometry as WallGeom; geometry = { ...g, x1: g.x1 + delta.x, y1: g.y1 + delta.y, x2: g.x2 + delta.x, y2: g.y2 + delta.y }; }
      else { const g = c.geometry as BoxGeom; geometry = { ...g, x: g.x + delta.x, y: g.y + delta.y }; }
      const n = tx.insert('components', { ...strip(c), geometry });
      out.push({ table: 'components', id: n.id });
      if (c.type === 'wall') for (const o of tx.all('components').filter((x) => x.host_id === c.id)) tx.insert('components', { ...strip(o), host_id: n.id });
    }
  }
  return out;
}

/** Dreht Auswahl um 90° (bzw. deg). Wände um ihren Mittelpunkt, Öffnungen: Anschlag wechseln. */
export function rotateSelection(tx: Tx, sel: Selection[], deg = 90) {
  for (const s of sel) {
    if (s.table === 'plan_objects') {
      const o = tx.get('plan_objects', s.id); if (!o) continue;
      tx.update('plan_objects', o.id, { rotation: (((o.rotation + deg) % 360) + 360) % 360 });
    } else if (s.table === 'rooms') {
      const r = tx.get('rooms', s.id); if (!r?.polygon) continue;
      const c = polygonCentroid(r.polygon);
      setRoomPolygon(tx, r.id, r.polygon.map((p) => rotatePoint(p, c, deg)));
    } else if (s.table === 'components') {
      const c = tx.get('components', s.id); if (!c) continue;
      if (c.type === 'wall') {
        const g = c.geometry as WallGeom;
        const m = { x: (g.x1 + g.x2) / 2, y: (g.y1 + g.y2) / 2 };
        const a = rotatePoint({ x: g.x1, y: g.y1 }, m, deg), b = rotatePoint({ x: g.x2, y: g.y2 }, m, deg);
        tx.update('components', c.id, { geometry: { ...g, x1: a.x, y1: a.y, x2: b.x, y2: b.y } });
      } else if (c.type === 'door' || c.type === 'window') {
        const g = c.geometry as OpeningGeom;
        // Zyklus: Anschlag links/rechts und Aufschlag innen/außen
        const state = g.flip * 2 + g.side, next = (state + 1) % 4;
        tx.update('components', c.id, { geometry: { ...g, flip: (next >> 1) as 0 | 1, side: (next & 1) as 0 | 1 } });
      } else if (c.type !== 'dimension') {
        const g = c.geometry as BoxGeom;
        tx.update('components', c.id, { geometry: { ...g, rotation: (((g.rotation + deg) % 360) + 360) % 360 } });
      }
    }
  }
}

export function deleteSelection(tx: Tx, sel: Selection[]) {
  for (const s of sel) tx.remove(s.table, s.id);
}

/** Alle Objekte des Geschosses (für Zoom auf Inhalt). */
export function floorPoints(data: { components: Record<string, Component>; rooms: Record<string, Room>; plan_objects: Record<string, PlanObject>; lines: Record<string, Line> }, floorId: string): Pt[] {
  const pts: Pt[] = [];
  for (const c of Object.values(data.components)) {
    if (c.floor_id !== floorId) continue;
    if (c.type === 'wall' || c.type === 'dimension') { const g = c.geometry as WallGeom; pts.push({ x: g.x1, y: g.y1 }, { x: g.x2, y: g.y2 }); }
    else if (c.type !== 'door' && c.type !== 'window') { const g = c.geometry as BoxGeom; pts.push({ x: g.x - g.w / 2, y: g.y - g.d / 2 }, { x: g.x + g.w / 2, y: g.y + g.d / 2 }); }
  }
  for (const r of Object.values(data.rooms)) if (r.floor_id === floorId && r.polygon) pts.push(...r.polygon);
  for (const o of Object.values(data.plan_objects)) if (o.floor_id === floorId) pts.push({ x: o.x, y: o.y });
  for (const l of Object.values(data.lines)) if (l.floor_id === floorId) pts.push(...l.points);
  return pts;
}

