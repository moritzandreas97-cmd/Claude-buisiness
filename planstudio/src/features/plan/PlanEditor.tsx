import { memo, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import {
  MousePointer2, Hand, Square, PenLine, DoorOpen, AppWindow, Ruler, MoveHorizontal, Cable, Plug, Sofa, Box, RectangleHorizontal, Minus,
  ZoomIn, ZoomOut, Maximize, Check, X as XIcon, Spline,
} from 'lucide-react';
import { useProject } from '../../store/projectStore';
import { useUi, type Selection, type Tool } from '../../store/uiStore';
import { Tx, applyChanges } from '../../store/tx';
import type { ProjectData } from '../../db/repository';
import type { OpeningGeom, Pt, WallGeom } from '../../model/types';
import { add, bboxOf, dist, formatMm, mul, norm, openingFrame, parseLength, projectOnSegment, round, sub, toModel, toScreen, wallLength, wallPolygon, type ViewTransform } from '../../model/geometry';
import { PLAN_SYMBOLS, LINE_TYPES, FURNITURE, furnitureDef, CABLE_TYPES } from '../../model/catalog';
import { PlanContent, SCREEN_DARK, SCREEN_LIGHT, type RenderOpts } from './PlanRenderer';
import { SymbolIcon } from './symbols';
import * as ops from './ops';
import { bus } from '../../lib/bus';
import { cn, Button } from '../../ui/primitives';

const MemoPlan = memo(PlanContent);
type Drag =
  | { kind: 'pending'; startScreen: Pt; startModel: Pt; hit: Selection | null; additive: boolean; pointerType: string }
  | { kind: 'pan'; startScreen: Pt; startView: ViewTransform }
  | { kind: 'move'; startModel: Pt; sel: Selection[]; delta: Pt }
  | { kind: 'handle'; target: Selection; index: number; pos: Pt };

const TOOLS: Record<string, { t: Tool; label: string; icon: React.ReactNode; key?: string }[]> = {
  architecture: [
    { t: 'select', label: 'Auswählen / Verschieben (V)', icon: <MousePointer2 size={18} />, key: 'v' },
    { t: 'pan', label: 'Ansicht verschieben (H)', icon: <Hand size={18} />, key: 'h' },
    { t: 'wall', label: 'Wand zeichnen (W)', icon: <PenLine size={18} />, key: 'w' },
    { t: 'room_rect', label: 'Raum als Rechteck (R)', icon: <Square size={18} /> },
    { t: 'room', label: 'Raum als Polygon', icon: <Spline size={18} /> },
    { t: 'door', label: 'Tür setzen (T)', icon: <DoorOpen size={18} />, key: 't' },
    { t: 'window', label: 'Fenster setzen (F)', icon: <AppWindow size={18} />, key: 'f' },
    { t: 'dimension', label: 'Maßlinie (D)', icon: <MoveHorizontal size={18} />, key: 'd' },
    { t: 'measure', label: 'Abstand messen (M)', icon: <Ruler size={18} />, key: 'm' },
  ],
  electrical: [
    { t: 'select', label: 'Auswählen / Verschieben (V)', icon: <MousePointer2 size={18} />, key: 'v' },
    { t: 'pan', label: 'Ansicht verschieben (H)', icon: <Hand size={18} />, key: 'h' },
    { t: 'symbol', label: 'Elektrosymbol platzieren (S)', icon: <Plug size={18} />, key: 's' },
    { t: 'line', label: 'Leitungsweg zeichnen (L)', icon: <Cable size={18} />, key: 'l' },
    { t: 'measure', label: 'Abstand messen (M)', icon: <Ruler size={18} />, key: 'm' },
  ],
  sanitary: [
    { t: 'select', label: 'Auswählen / Verschieben (V)', icon: <MousePointer2 size={18} />, key: 'v' },
    { t: 'pan', label: 'Ansicht verschieben (H)', icon: <Hand size={18} />, key: 'h' },
    { t: 'symbol', label: 'Sanitärobjekt platzieren (S)', icon: <Plug size={18} />, key: 's' },
    { t: 'line', label: 'Rohrleitung zeichnen (L)', icon: <Cable size={18} />, key: 'l' },
    { t: 'measure', label: 'Abstand messen (M)', icon: <Ruler size={18} />, key: 'm' },
  ],
  interior: [
    { t: 'select', label: 'Auswählen / Verschieben (V)', icon: <MousePointer2 size={18} />, key: 'v' },
    { t: 'pan', label: 'Ansicht verschieben (H)', icon: <Hand size={18} />, key: 'h' },
    { t: 'furniture', label: 'Möbel platzieren', icon: <Sofa size={18} /> },
    { t: 'podest', label: 'Podest (rechteckig)', icon: <Box size={18} /> },
    { t: 'beam', label: 'Balken', icon: <Minus size={18} /> },
    { t: 'plate', label: 'Platte', icon: <RectangleHorizontal size={18} /> },
    { t: 'measure', label: 'Abstand messen (M)', icon: <Ruler size={18} />, key: 'm' },
  ],
};

const HINTS: Partial<Record<Tool, string>> = {
  wall: 'Startpunkt antippen, dann Endpunkte. Länge eintippen + Enter für exakte Maße. Doppelklick/Enter/Esc beendet.',
  room_rect: 'Zwei gegenüberliegende Ecken antippen.',
  room: 'Eckpunkte antippen; ersten Punkt erneut antippen oder Enter zum Schließen.',
  door: 'Auf eine Wand tippen, um eine Tür zu setzen.',
  window: 'Auf eine Wand tippen, um ein Fenster zu setzen.',
  dimension: 'Zwei Punkte für die Maßlinie antippen.',
  measure: 'Zwei Punkte antippen, um den Abstand zu messen.',
  symbol: 'Symbol in der Leiste oben wählen und auf den Plan tippen.',
  line: 'Punkte des Leitungswegs antippen (rastet an Objekten ein). Doppelklick/Enter beendet.',
  furniture: 'Möbel in der Leiste wählen und auf den Plan tippen.',
  podest: 'Auf den Plan tippen, um ein Podest anzulegen.',
  beam: 'Auf den Plan tippen, um einen Balken anzulegen.',
  plate: 'Auf den Plan tippen, um eine Platte anzulegen.',
  select: 'Objekt antippen zum Auswählen, ziehen zum Verschieben. Leere Fläche ziehen = Ansicht verschieben. Entf = Löschen, Strg+D = Kopieren, R = Drehen.',
};

function allowedKinds(mode: string): Selection['table'][] {
  if (mode === 'electrical' || mode === 'sanitary') return ['plan_objects', 'lines'];
  if (mode === 'interior') return ['components'];
  return ['components', 'rooms'];
}

export function PlanEditor({ floorId, focusRoomId }: { floorId: string; focusRoomId?: string | null }) {
  const data = useProject((s) => s.data);
  const project = useProject((s) => s.project)!;
  const mutate = useProject((s) => s.mutate);
  const ui = useUi();
  const { mode, tool, selection, layers, grid, snap: snapOn, ortho, theme } = ui;
  const floor = data.floors[floorId];
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lengthRef = useRef<HTMLInputElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [view, setView] = useState<ViewTransform>({ scale: 0.08, ox: 80, oy: 520 });
  const [draft, setDraft] = useState<Pt[]>([]);
  const [draftSnaps, setDraftSnaps] = useState<(string | null)[]>([]);
  const [cursor, setCursor] = useState<{ p: Pt; raw: Pt; snapKind: string | null; objectId: string | null } | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [lengthInput, setLengthInput] = useState('');
  const [measure, setMeasure] = useState<[Pt, Pt] | null>(null);
  const pointers = useRef(new Map<number, Pt>());
  const pinch = useRef<{ d0: number; m0: Pt; v0: ViewTransform } | null>(null);
  const lastTap = useRef<{ t: number; p: Pt }>({ t: 0, p: { x: 0, y: 0 } });
  const fitted = useRef<string | null>(null);
  const palette = theme === 'dark' ? SCREEN_DARK : SCREEN_LIGHT;
  const bgDocKey = floor?.background ? data.documents[floor.background.document_id]?.storage_key ?? null : null;
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null; let alive = true;
    setBgUrl(null);
    if (bgDocKey) void useProject.getState().platform!.files.get(bgDocKey).then((b) => {
      if (!b || !alive) return;
      url = URL.createObjectURL(new Blob([b as BlobPart], { type: data.documents[floor!.background!.document_id]?.mime ?? 'image/png' }));
      setBgUrl(url);
    });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [bgDocKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const selectedIds = useMemo(() => new Set(selection.map((s) => s.id)), [selection]);
  const wallHeight = floor?.height_mm ?? 2500;

  // Größe beobachten
  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const fit = useCallback((roomId?: string | null) => {
    const st = useProject.getState().data;
    let pts = ops.floorPoints(st, floorId);
    const bgc = st.floors[floorId]?.background;
    if (bgc?.visible) pts = [...pts, { x: bgc.x, y: bgc.y }, { x: bgc.x + bgc.width_mm, y: bgc.y - bgc.width_mm * 0.6 }];
    const r = roomId ? st.rooms[roomId] : null;
    if (r?.polygon?.length) pts = r.polygon;
    const bb = bboxOf(pts);
    const el = wrapRef.current;
    const w = el?.clientWidth || size.w, h = el?.clientHeight || size.h;
    if (!bb || (bb.w < 1 && bb.h < 1)) { setView({ scale: 0.06, ox: 80, oy: h - 80 }); return; }
    const pad = 1500;
    const scale = Math.min(w / (bb.w + pad * 2), h / (bb.h + pad * 2), 1);
    const cx = (bb.minX + bb.maxX) / 2, cy = (bb.minY + bb.maxY) / 2;
    setView({ scale, ox: w / 2 - cx * scale, oy: h / 2 + cy * scale });
  }, [floorId, size.w, size.h]);

  useEffect(() => {
    const key = floorId + ':' + (focusRoomId ?? '');
    if (fitted.current !== key && size.w > 0) { fitted.current = key; fit(focusRoomId); }
  }, [floorId, focusRoomId, fit, size.w]);

  const zoomAt = useCallback((sp: Pt, factor: number) => {
    setView((v) => {
      const s = Math.min(3, Math.max(0.004, v.scale * factor));
      const m = toModel(v, sp);
      return { scale: s, ox: sp.x - m.x * s, oy: sp.y + m.y * s };
    });
  }, []);

  useEffect(() => {
    const c = { x: size.w / 2, y: size.h / 2 };
    const offs = [bus.on('zoom-in', () => zoomAt(c, 1.25)), bus.on('zoom-out', () => zoomAt(c, 0.8)), bus.on('zoom-fit', () => fit(focusRoomId)), bus.on('zoom-room', (id) => fit(id as string))];
    return () => offs.forEach((o) => o());
  }, [zoomAt, fit, size, focusRoomId]);

  // Mausrad-Zoom (nicht-passiv, damit die Seite nicht scrollt)
  useEffect(() => {
    const el = svgRef.current; if (!el) return;
    const h = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt({ x: e.clientX - r.left, y: e.clientY - r.top }, Math.exp(-e.deltaY * 0.0015));
    };
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  }, [zoomAt]);

  useEffect(() => {
    const ratio = 96 / 25.4 / view.scale;
    ui.set({ scaleInfo: `1 m = ${Math.round(view.scale * 1000)} px · ca. 1:${Math.round(ratio)}` });
  }, [view.scale]); // eslint-disable-line react-hooks/exhaustive-deps

  // Werkzeugwechsel → Entwurf verwerfen
  useEffect(() => { setDraft([]); setDraftSnaps([]); setLengthInput(''); setMeasure(null); ui.set({ hint: HINTS[tool] ?? '' }); }, [tool, mode, floorId]); // eslint-disable-line react-hooks/exhaustive-deps

  const screenPt = (e: { clientX: number; clientY: number }): Pt => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  /** Fang: Endpunkte → Objekte → Ortho → Raster */
  const snapPoint = useCallback((raw: Pt, opts: { useOrtho?: boolean; objects?: boolean } = {}) => {
    const tol = 12 / view.scale;
    let best: { p: Pt; d: number; kind: string; id: string | null } | null = null;
    const consider = (p: Pt, kind: string, id: string | null = null) => {
      const d = dist(p, raw);
      if (d < tol && (!best || d < best.d)) best = { p, d, kind, id };
    };
    if (opts.objects) for (const o of Object.values(data.plan_objects)) if (o.floor_id === floorId) consider({ x: o.x, y: o.y }, 'Objekt', o.id);
    for (const c of Object.values(data.components)) {
      if (c.floor_id !== floorId || c.type !== 'wall') continue;
      const g = c.geometry as WallGeom;
      consider({ x: g.x1, y: g.y1 }, 'Endpunkt'); consider({ x: g.x2, y: g.y2 }, 'Endpunkt');
    }
    for (const r of Object.values(data.rooms)) if (r.floor_id === floorId && r.polygon) r.polygon.forEach((p) => consider(p, 'Raumecke'));
    if (draft.length) consider(draft[0], 'Startpunkt');
    if (best) { const b = best as { p: Pt; kind: string; id: string | null }; return { p: b.p, snapKind: b.kind, objectId: b.id }; }
    let p = { ...raw };
    const last = draft[draft.length - 1];
    if (opts.useOrtho && ortho && last) {
      if (Math.abs(p.x - last.x) > Math.abs(p.y - last.y)) p.y = last.y; else p.x = last.x;
      if (snapOn) {
        if (p.y === last.y) p.x = last.x + round(p.x - last.x, grid); else p.y = last.y + round(p.y - last.y, grid);
      }
      return { p, snapKind: snapOn ? 'Ortho+Raster' : 'Ortho', objectId: null };
    }
    if (snapOn) p = { x: round(p.x, grid), y: round(p.y, grid) };
    return { p, snapKind: snapOn ? 'Raster' : null, objectId: null };
  }, [data, floorId, view.scale, draft, ortho, snapOn, grid]);

  const hitTest = (e: { clientX: number; clientY: number }): Selection | null => {
    const allowed = allowedKinds(mode);
    const els = document.elementsFromPoint(e.clientX, e.clientY);
    for (const el of els) {
      if (!svgRef.current?.contains(el)) continue;
      const h = (el as Element).closest('[data-id]') as SVGElement | null;
      if (!h) continue;
      const table = h.dataset.kind as Selection['table'];
      const id = h.dataset.id!;
      if (!allowed.includes(table)) continue;
      if (table === 'components') {
        const c = data.components[id];
        const interiorType = c && ['furniture', 'podest', 'beam', 'plate'].includes(c.type);
        if (mode === 'interior' ? !interiorType : interiorType) continue;
      }
      if (table === 'plan_objects' && data.plan_objects[id]?.discipline !== mode) continue;
      if (table === 'lines' && data.lines[id]?.discipline !== mode) continue;
      return { table, id };
    }
    return null;
  };

  const run = useCallback(async <R,>(label: string, fn: (tx: Tx) => R): Promise<R | undefined> => {
    try { return await mutate(label, fn); } catch (e) { ui.toast(e instanceof Error ? e.message : String(e), 'error'); return undefined; }
  }, [mutate]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Wand unter dem Cursor (für Türen/Fenster) */
  const wallAt = useCallback((p: Pt) => {
    let best: { id: string; t: number; d: number; g: WallGeom } | null = null;
    for (const c of Object.values(data.components)) {
      if (c.floor_id !== floorId || c.type !== 'wall') continue;
      const g = c.geometry as WallGeom;
      const pr = projectOnSegment(p, { x: g.x1, y: g.y1 }, { x: g.x2, y: g.y2 });
      if (pr.distance < g.thickness / 2 + 10 / view.scale && (!best || pr.distance < best.d)) best = { id: c.id, t: pr.t, d: pr.distance, g };
    }
    return best;
  }, [data, floorId, view.scale]);

  const openingPreview = useMemo(() => {
    if (!cursor || (tool !== 'door' && tool !== 'window')) return null;
    const w = wallAt(cursor.raw); if (!w) return null;
    const L = wallLength(w.g);
    const width = tool === 'door' ? 885 : 1010;
    const offset = Math.min(L - width / 2, Math.max(width / 2, round(w.t * L, 10)));
    return { wallId: w.id, offset, width, g: w.g, fits: width <= L };
  }, [cursor, tool, wallAt]);

  /** Neuen Raum anlegen oder – falls eine Raumkarte zum Einzeichnen gewählt ist – deren Geometrie setzen. */
  const createOrPlaceRoom = async (poly: Pt[]) => {
    const placeId = useUi.getState().placeRoomId;
    await run(placeId ? 'Raum einzeichnen' : 'Raum anlegen', (tx) => {
      if (placeId && tx.get('rooms', placeId)) {
        if (poly.length < 3) throw new ops.GeometryError('Ein Raum benötigt mindestens 3 Eckpunkte.');
        tx.update('rooms', placeId, { floor_id: floorId });
        ops.setRoomPolygon(tx, placeId, poly);
        ui.select([{ table: 'rooms', id: placeId }]);
        return;
      }
      const r = ops.addRoom(tx, floorId, poly); ui.select([{ table: 'rooms', id: r.id }]);
    });
    if (placeId) useUi.getState().set({ placeRoomId: null });
  };

  const finishDraft = useCallback(async () => {
    const pts = draft;
    if (tool === 'room' && pts.length >= 3) await createOrPlaceRoom(pts);
    if (tool === 'line' && pts.length >= 2) {
      const lt = useUi.getState().lineType;
      const lineDef = LINE_TYPES.find((l) => l.type === lt)!;
      await run('Leitungsweg zeichnen', (tx) => {
        const l = ops.addLine(tx, floorId, {
          discipline: lineDef.discipline, line_type: lt, points: pts,
          start_object_id: draftSnaps[0] ?? null, end_object_id: draftSnaps[draftSnaps.length - 1] ?? null,
          circuit_id: lt === 'cable' ? useUi.getState().activeCircuitId : null,
          props: lt === 'cable' ? { cable: useUi.getState().cableType } : { dn: lt === 'waste' ? 'DN 50' : 'DN 15' },
        });
        ui.select([{ table: 'lines', id: l.id }]);
      });
    }
    setDraft([]); setDraftSnaps([]); setLengthInput('');
  }, [draft, draftSnaps, tool, floorId, run]); // eslint-disable-line react-hooks/exhaustive-deps

  const wallDefaults = () => ({ thickness: useUi.getState().wallThickness, height: wallHeight });

  const addWallSegment = useCallback(async (a: Pt, b: Pt) => {
    const { thickness, height } = wallDefaults();
    const ok = await run('Wand zeichnen', (tx) => ops.addWall(tx, floorId, a, b, thickness, height));
    return !!ok;
  }, [floorId, run, ui.wallThickness, wallHeight]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Einzelner Tipp/Klick mit dem aktiven Werkzeug */
  const handleTap = useCallback(async (raw: Pt, hit: Selection | null, additive: boolean) => {
    const now = Date.now();
    const isDouble = now - lastTap.current.t < 350 && dist(lastTap.current.p, raw) < 12 / view.scale;
    lastTap.current = { t: now, p: raw };
    const sn = snapPoint(raw, { useOrtho: ['wall', 'line', 'room', 'dimension'].includes(tool), objects: tool === 'line' });
    const p = sn.p;
    switch (tool) {
      case 'select':
        if (!hit) ui.select([]);
        else if (additive) ui.select(selectedIds.has(hit.id) ? selection.filter((s) => s.id !== hit.id) : [...selection, hit]);
        else ui.select([hit]);
        return;
      case 'wall': {
        if (isDouble) { setDraft([]); return; }
        if (draft.length === 0) { setDraft([p]); return; }
        const last = draft[draft.length - 1];
        if (dist(last, p) < 1) return;
        if (await addWallSegment(last, p)) {
          if (sn.snapKind === 'Startpunkt') setDraft([]); else setDraft([draft[0], p]);
          setLengthInput('');
        }
        return;
      }
      case 'room_rect': {
        if (draft.length === 0) { setDraft([p]); return; }
        const a = draft[0];
        const poly = [a, { x: p.x, y: a.y }, p, { x: a.x, y: p.y }];
        await createOrPlaceRoom(poly);
        setDraft([]);
        return;
      }
      case 'room':
        if (draft.length >= 3 && (sn.snapKind === 'Startpunkt' || isDouble)) { await finishDraft(); return; }
        setDraft([...draft, p]);
        return;
      case 'line':
        if (isDouble && draft.length >= 2) { await finishDraft(); return; }
        setDraft([...draft, p]); setDraftSnaps([...draftSnaps, sn.objectId]);
        return;
      case 'dimension':
        if (draft.length === 0) { setDraft([p]); return; }
        await run('Maßlinie', (tx) => ops.addDimension(tx, floorId, draft[0], p));
        setDraft([]);
        return;
      case 'measure':
        if (draft.length === 0) { setDraft([p]); setMeasure(null); return; }
        setMeasure([draft[0], p]); setDraft([]);
        return;
      case 'door':
      case 'window': {
        const op = openingPreview;
        if (!op) { ui.toast('Bitte direkt auf eine Wand tippen.', 'error'); return; }
        const t = tool;
        await run(t === 'door' ? 'Tür setzen' : 'Fenster setzen', (tx) => { const c = ops.addOpening(tx, op.wallId, t, op.offset); ui.select([{ table: 'components', id: c.id }]); });
        return;
      }
      case 'symbol': {
        const type = useUi.getState().symbolType;
        await run('Objekt platzieren', (tx) => {
          const o = ops.addPlanObject(tx, floorId, type, p, mode === 'electrical' ? { circuit_id: useUi.getState().activeCircuitId } : {});
          ui.select([{ table: 'plan_objects', id: o.id }]);
        });
        return;
      }
      case 'furniture': case 'podest': case 'beam': case 'plate': {
        const t = tool;
        const f = furnitureDef(useUi.getState().furnitureType);
        const dims = t === 'furniture' ? { w: f?.w ?? 1000, d: f?.d ?? 500, h: f?.h ?? 800, elevation: 0 }
          : t === 'podest' ? { w: 2000, d: 1000, h: 200, elevation: 0 }
          : t === 'beam' ? { w: 3000, d: 120, h: 200, elevation: Math.max(0, wallHeight - 200) }
          : { w: 1250, d: 625, h: 18, elevation: 0 };
        await run('Einbauteil anlegen', (tx) => {
          const c = ops.addBox(tx, floorId, t, { x: p.x, y: p.y, rotation: 0, ...dims }, t === 'furniture' ? { kind: useUi.getState().furnitureType, name: f?.label } : {});
          ui.select([{ table: 'components', id: c.id }]);
        });
        return;
      }
    }
  }, [tool, draft, draftSnaps, snapPoint, view.scale, selection, selectedIds, openingPreview, floorId, mode, run, finishDraft, addWallSegment, wallHeight]); // eslint-disable-line react-hooks/exhaustive-deps

  // Vorschau beim Verschieben/Ziehen von Griffen
  const preview = useMemo((): { data: ProjectData; error: string | null } | null => {
    if (!drag || (drag.kind !== 'move' && drag.kind !== 'handle')) return null;
    const tx = new Tx(data);
    try {
      applyDrag(tx, drag);
      return { data: applyChanges(data, tx.changes, 'forward'), error: null };
    } catch (e) {
      return { data, error: e instanceof Error ? e.message : String(e) };
    }
  }, [drag, data]);

  useEffect(() => { if (preview?.error) ui.set({ hint: '⚠ ' + preview.error }); }, [preview?.error]); // eslint-disable-line react-hooks/exhaustive-deps

  function applyDrag(tx: Tx, d: Drag) {
    if (d.kind === 'move') ops.moveSelection(tx, d.sel, d.delta);
    if (d.kind === 'handle') {
      const { target, index, pos } = d;
      if (target.table === 'components') ops.updateWall(tx, target.id, index === 0 ? { x1: pos.x, y1: pos.y } : { x2: pos.x, y2: pos.y }, { moveConnected: true });
      if (target.table === 'lines') { const l = tx.get('lines', target.id)!; ops.updateLinePoints(tx, l.id, l.points.map((q, i) => (i === index ? pos : q))); }
      if (target.table === 'rooms') { const r = tx.get('rooms', target.id)!; ops.setRoomPolygon(tx, r.id, r.polygon!.map((q, i) => (i === index ? pos : q))); }
    }
  }

  const onPointerDown = (e: RPointerEvent<SVGSVGElement>) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const sp = screenPt(e);
    pointers.current.set(e.pointerId, sp);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d0: dist(a, b), m0: mul(add(a, b), 0.5), v0: view };
      setDrag(null);
      return;
    }
    if (pointers.current.size > 2) return;
    if (e.button === 1 || tool === 'pan') { setDrag({ kind: 'pan', startScreen: sp, startView: view }); return; }
    if (e.button !== 0) return;
    const handle = (e.target as Element).closest('[data-handle]') as SVGElement | null;
    if (handle && tool === 'select') {
      const [table, id, idx] = handle.dataset.handle!.split(':');
      setDrag({ kind: 'handle', target: { table: table as Selection['table'], id }, index: Number(idx), pos: snapPoint(toModel(view, sp)).p });
      return;
    }
    const hit = tool === 'select' ? hitTest(e) : null;
    setDrag({ kind: 'pending', startScreen: sp, startModel: toModel(view, sp), hit, additive: e.shiftKey || e.ctrlKey || e.metaKey, pointerType: e.pointerType });
  };

  const cursorFrame = useRef(0);
  const onPointerMove = (e: RPointerEvent<SVGSVGElement>) => {
    const sp = screenPt(e);
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, sp);
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const { d0, m0, v0 } = pinch.current;
      const s = Math.min(3, Math.max(0.004, v0.scale * (dist(a, b) / (d0 || 1))));
      const mm = toModel(v0, m0); const mid = mul(add(a, b), 0.5);
      setView({ scale: s, ox: mid.x - mm.x * s, oy: mid.y + mm.y * s });
      return;
    }
    const raw = toModel(view, sp);
    const sn = snapPoint(raw, { useOrtho: ['wall', 'line', 'room', 'dimension'].includes(tool), objects: tool === 'line' });
    setCursor({ p: sn.p, raw, snapKind: sn.snapKind, objectId: sn.objectId });
    cancelAnimationFrame(cursorFrame.current);
    cursorFrame.current = requestAnimationFrame(() => useUi.setState({ cursor: sn.p }));
    if (!drag) return;
    if (drag.kind === 'pan') {
      setView({ ...drag.startView, ox: drag.startView.ox + sp.x - drag.startScreen.x, oy: drag.startView.oy + sp.y - drag.startScreen.y });
    } else if (drag.kind === 'pending') {
      const moved = dist(sp, drag.startScreen) > (drag.pointerType === 'touch' ? 8 : 4);
      if (!moved) return;
      if (tool === 'select' && drag.hit) {
        const sel = selectedIds.has(drag.hit.id) ? selection : [drag.hit];
        if (!selectedIds.has(drag.hit.id)) ui.select(sel);
        setDrag({ kind: 'move', startModel: drag.startModel, sel, delta: { x: 0, y: 0 } });
      } else {
        setDrag({ kind: 'pan', startScreen: drag.startScreen, startView: view });
      }
    } else if (drag.kind === 'move') {
      let delta = sub(raw, drag.startModel);
      if (snapOn) delta = { x: round(delta.x, grid), y: round(delta.y, grid) };
      if (e.shiftKey) { if (Math.abs(delta.x) > Math.abs(delta.y)) delta.y = 0; else delta.x = 0; }
      setDrag({ ...drag, delta });
    } else if (drag.kind === 'handle') {
      setDrag({ ...drag, pos: snapPoint(raw).p });
    }
  };

  const onPointerUp = async (e: RPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pinch.current) { if (pointers.current.size < 2) pinch.current = null; setDrag(null); return; }
    const d = drag;
    setDrag(null);
    if (!d) return;
    if (d.kind === 'pending') await handleTap(d.startModel, d.hit, d.additive);
    else if (d.kind === 'move' && (d.delta.x !== 0 || d.delta.y !== 0)) await run('Verschieben', (tx) => applyDrag(tx, d));
    else if (d.kind === 'handle') await run('Punkt verschieben', (tx) => applyDrag(tx, d));
    ui.set({ hint: HINTS[tool] ?? '' });
  };

  // Tastatur
  useEffect(() => {
    const h = async (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const inField = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      const ctrl = e.ctrlKey || e.metaKey;
      if (inField && t !== lengthRef.current) return;
      if (ctrl && e.key.toLowerCase() === 'd' && selection.length) {
        e.preventDefault();
        const off = { x: grid * 5, y: -grid * 5 };
        const res = await run('Kopieren', (tx) => ops.duplicateSelection(tx, selection, off));
        if (res) ui.select(res);
        return;
      }
      if (ctrl) return;
      if (e.key === 'Escape') { setDraft([]); setDraftSnaps([]); setLengthInput(''); setMeasure(null); if (!draft.length) ui.select([]); return; }
      if (e.key === 'Enter') {
        if (tool === 'wall' && draft.length && lengthInput) { e.preventDefault(); await applyLength(); return; }
        if (draft.length) { e.preventDefault(); if (tool === 'wall') setDraft([]); else await finishDraft(); }
        return;
      }
      if (t === lengthRef.current) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection.length) {
        e.preventDefault();
        const sel = selection;
        ui.select([]);
        await run('Löschen', (tx) => ops.deleteSelection(tx, sel));
        return;
      }
      if (tool === 'wall' && draft.length && /^[0-9]$/.test(e.key)) { lengthRef.current?.focus(); return; }
      if (e.key.toLowerCase() === 'r' && selection.length) { await run('Drehen', (tx) => ops.rotateSelection(tx, selection, e.shiftKey ? -90 : 90)); return; }
      const toolDef = (TOOLS[mode] ?? []).find((x) => x.key === e.key.toLowerCase());
      if (toolDef) ui.setTool(toolDef.t);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const applyLength = async () => {
    const L = parseLength(lengthInput);
    if (L == null || L < ops.MIN_WALL) { ui.toast(`Ungültige Länge „${lengthInput}“. Beispiele: 3650, 365cm, 3,65m`, 'error'); return; }
    const last = draft[draft.length - 1];
    let dir = cursor ? sub(cursor.p, last) : { x: 1, y: 0 };
    if (Math.hypot(dir.x, dir.y) < 1) dir = { x: 1, y: 0 };
    if (ortho) dir = Math.abs(dir.x) >= Math.abs(dir.y) ? { x: Math.sign(dir.x) || 1, y: 0 } : { x: 0, y: Math.sign(dir.y) };
    const end = add(last, mul(norm(dir), L));
    const p = { x: Math.round(end.x * 10) / 10, y: Math.round(end.y * 10) / 10 };
    if (await addWallSegment(last, p)) { setDraft([draft[0], p]); setLengthInput(''); svgRef.current?.focus(); }
  };

  if (!floor) return <div className="p-6 text-muted">Kein Geschoss ausgewählt.</div>;

  const renderData = preview?.data ?? data;
  const opts: RenderOpts = { floorId, view, layers, palette, unit: 1, fontSize: 12, selected: selectedIds, interactive: true, focus: mode === 'architecture' ? null : mode, roomFilter: ui.roomFilter, backgroundUrl: bgUrl };

  // Raster
  let gs = grid; while (gs * view.scale < 8) gs *= 10;
  const gpx = gs * view.scale, major = gpx * 10;
  const origin = toScreen(view, { x: 0, y: 0 });

  const last = draft[draft.length - 1];
  const tools = TOOLS[mode] ?? TOOLS.architecture;

  // Griffe für Einzelauswahl
  const handles: { key: string; p: Pt }[] = [];
  if (tool === 'select' && selection.length === 1 && !drag) {
    const s = selection[0];
    if (s.table === 'components' && renderData.components[s.id]?.type === 'wall') {
      const g = renderData.components[s.id].geometry as WallGeom;
      handles.push({ key: `components:${s.id}:0`, p: { x: g.x1, y: g.y1 } }, { key: `components:${s.id}:1`, p: { x: g.x2, y: g.y2 } });
    }
    if (s.table === 'lines' && renderData.lines[s.id]) renderData.lines[s.id].points.forEach((p, i) => handles.push({ key: `lines:${s.id}:${i}`, p }));
    if (s.table === 'rooms' && renderData.rooms[s.id]?.polygon) renderData.rooms[s.id].polygon!.forEach((p, i) => handles.push({ key: `rooms:${s.id}:${i}`, p }));
  }

  const symbolsForMode = PLAN_SYMBOLS.filter((s) => s.discipline === mode);
  const lineTypesForMode = LINE_TYPES.filter((l) => l.discipline === mode);

  return (
    <div className="relative flex h-full min-h-0 w-full">
      {/* Werkzeugleiste */}
      <div className="z-10 flex w-12 shrink-0 flex-col items-center gap-1 border-r border-line bg-panel py-2" aria-label="Werkzeuge">
        {tools.map((t) => (
          <button key={t.t} title={t.label} aria-label={t.label} data-tool={t.t} onClick={() => ui.setTool(t.t)}
            className={cn('flex h-10 w-10 items-center justify-center rounded-md touch-lg', tool === t.t ? 'bg-accent text-accent-fg' : 'text-muted hover:bg-hover hover:text-fg')}>
            {t.icon}
          </button>
        ))}
      </div>

      <div className="relative min-w-0 flex-1">
        {ui.placeRoomId && data.rooms[ui.placeRoomId] && (
          <div className="absolute left-2 right-2 top-14 z-20 flex items-center gap-2 rounded-lg border border-accent bg-panel/95 px-3 py-2 text-sm shadow-xl md:left-1/2 md:right-auto md:-translate-x-1/2" data-testid="place-banner">
            <span>Einzeichnen: <b>{data.rooms[ui.placeRoomId].code ? data.rooms[ui.placeRoomId].code + ' ' : ''}{data.rooms[ui.placeRoomId].name}</b> – Rechteck oder Polygon zeichnen</span>
            <Button size="sm" onClick={() => ui.set({ placeRoomId: null })}><XIcon size={14} />Abbrechen</Button>
          </div>
        )}
        {/* Werkzeugoptionen */}
        {(tool === 'wall' || tool === 'symbol' || tool === 'line' || tool === 'furniture') && (
          <div className="absolute left-2 right-2 top-2 z-10 flex flex-nowrap items-center gap-1.5 overflow-x-auto rounded-lg border border-line bg-panel/95 p-1.5 shadow-lg backdrop-blur md:flex-wrap [&>*]:shrink-0">
            {tool === 'wall' && (
              <>
                <span className="px-1 text-xs text-muted">Wandstärke</span>
                {[115, 175, 240, 300, 365].map((t) => <Button key={t} size="sm" active={ui.wallThickness === t} onClick={() => ui.set({ wallThickness: t })}>{t / 10} cm</Button>)}
                <input aria-label="Wandstärke in mm" className="h-7 w-20 rounded border border-line bg-panel px-1.5 text-xs" type="number" min={20} max={2000} value={ui.wallThickness} onChange={(e) => ui.set({ wallThickness: Math.max(20, Number(e.target.value) || 0) })} />
                <span className="text-xs text-muted">mm · Höhe {formatMm(wallHeight)}</span>
              </>
            )}
            {tool === 'symbol' && symbolsForMode.map((s) => (
              <button key={s.type} title={s.label} aria-label={s.label} data-symbol={s.type} onClick={() => ui.set({ symbolType: s.type })}
                className={cn('flex items-center gap-1.5 rounded-md px-2 py-1 text-xs touch-lg', ui.symbolType === s.type ? 'bg-accent/15 text-accent ring-1 ring-accent/50' : 'hover:bg-hover')}>
                <SymbolIcon type={s.type} size={22} />
                <span className="hidden xl:inline">{s.label}</span>
              </button>
            ))}
            {tool === 'symbol' && mode === 'electrical' && <CircuitPicker />}
            {tool === 'line' && lineTypesForMode.map((l) => (
              <Button key={l.type} size="sm" active={ui.lineType === l.type} onClick={() => ui.set({ lineType: l.type })}>
                <span className="inline-block h-1 w-5 rounded" style={{ background: l.color }} />{l.label}
              </Button>
            ))}
            {tool === 'line' && mode === 'electrical' && (
              <>
                <select aria-label="Leitungstyp" className="h-7 rounded border border-line bg-panel px-1 text-xs" value={ui.cableType} onChange={(e) => ui.set({ cableType: e.target.value })}>
                  {CABLE_TYPES.map((c) => <option key={c}>{c}</option>)}
                </select>
                <CircuitPicker />
              </>
            )}
            {tool === 'furniture' && FURNITURE.map((f) => <Button key={f.type} size="sm" active={ui.furnitureType === f.type} onClick={() => ui.set({ furnitureType: f.type })}>{f.label}</Button>)}
          </div>
        )}

        <div ref={wrapRef} className="absolute inset-0 overflow-hidden bg-canvas" style={{ touchAction: 'none' }}>
          <svg
            ref={svgRef} width={size.w} height={size.h} tabIndex={0} data-testid="plan-canvas" data-view={JSON.stringify(view)}
            className={cn('block outline-none', tool === 'pan' || drag?.kind === 'pan' ? 'cursor-grab' : tool === 'select' ? 'cursor-default' : 'cursor-crosshair')}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
            onPointerCancel={(e) => { pointers.current.delete(e.pointerId); pinch.current = null; setDrag(null); }}
            onPointerLeave={() => setCursor(null)}
            onContextMenu={(e) => { e.preventDefault(); setDraft([]); setDraftSnaps([]); }}
            onDoubleClick={() => { if (draft.length && tool !== 'wall') void finishDraft(); }}
          >
            <defs>
              <pattern id="g-minor" width={gpx} height={gpx} patternUnits="userSpaceOnUse" x={origin.x} y={origin.y}>
                <path d={`M ${gpx} 0 L 0 0 0 ${gpx}`} fill="none" stroke={theme === 'dark' ? '#1c2533' : '#e2e8f0'} strokeWidth={1} />
              </pattern>
              <pattern id="g-major" width={major} height={major} patternUnits="userSpaceOnUse" x={origin.x} y={origin.y}>
                <rect width={major} height={major} fill="url(#g-minor)" />
                <path d={`M ${major} 0 L 0 0 0 ${major}`} fill="none" stroke={theme === 'dark' ? '#2a3648' : '#cbd5e1'} strokeWidth={1} />
              </pattern>
            </defs>
            {ui.gridVisible && <rect width={size.w} height={size.h} fill="url(#g-major)" pointerEvents="none" />}
            {/* Ursprung */}
            <g pointerEvents="none" stroke={theme === 'dark' ? '#334155' : '#94a3b8'} strokeWidth={1}>
              <line x1={origin.x - 14} y1={origin.y} x2={origin.x + 30} y2={origin.y} />
              <line x1={origin.x} y1={origin.y + 14} x2={origin.x} y2={origin.y - 30} />
            </g>

            <MemoPlan data={renderData} {...opts} />

            {/* Vorschau Wand */}
            {tool === 'wall' && last && cursor && (() => {
              const g: WallGeom = { x1: last.x, y1: last.y, x2: cursor.p.x, y2: cursor.p.y, thickness: ui.wallThickness, height: wallHeight };
              const L = wallLength(g); if (L < 1) return null;
              const poly = wallPolygon(g).map((p) => toScreen(view, p));
              const m = toScreen(view, mul(add(last, cursor.p), 0.5));
              return (
                <g pointerEvents="none">
                  <polygon points={poly.map((p) => `${p.x},${p.y}`).join(' ')} fill="rgba(59,130,246,0.35)" stroke="#3b82f6" strokeWidth={1.5} />
                  <rect x={m.x - 34} y={m.y - 26} width={68} height={18} rx={4} fill="#3b82f6" />
                  <text x={m.x} y={m.y - 13} fill="#fff" fontSize={11} textAnchor="middle" fontWeight={600}>{formatMm(L)}</text>
                </g>
              );
            })()}
            {/* Vorschau Raum / Leitung / Maß / Messen */}
            {(tool === 'room' || tool === 'line' || tool === 'dimension' || tool === 'measure') && draft.length > 0 && cursor && (
              <polyline pointerEvents="none" points={[...draft, cursor.p].map((p) => { const s = toScreen(view, p); return `${s.x},${s.y}`; }).join(' ')}
                fill={tool === 'room' ? 'rgba(59,130,246,0.12)' : 'none'} stroke={tool === 'line' ? (LINE_TYPES.find((l) => l.type === ui.lineType)?.color ?? '#3b82f6') : '#3b82f6'} strokeWidth={2} strokeDasharray={tool === 'measure' ? '6 4' : undefined} />
            )}
            {tool === 'room_rect' && draft.length === 1 && cursor && (() => {
              const a = toScreen(view, draft[0]), b = toScreen(view, cursor.p);
              const w = Math.abs(cursor.p.x - draft[0].x), h = Math.abs(cursor.p.y - draft[0].y);
              return <g pointerEvents="none"><rect x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)} width={Math.abs(b.x - a.x)} height={Math.abs(b.y - a.y)} fill="rgba(59,130,246,0.12)" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="6 4" />
                <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2} fill="#3b82f6" fontSize={12} textAnchor="middle">{formatMm(w)} × {formatMm(h)} = {((w * h) / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 2 })} m²</text></g>;
            })()}
            {(tool === 'dimension' || tool === 'measure' || tool === 'line' || tool === 'room') && draft.length > 0 && cursor && (() => {
              const s = toScreen(view, cursor.p);
              return <text pointerEvents="none" x={s.x + 14} y={s.y - 10} fill="#3b82f6" fontSize={12} fontWeight={600}>{formatMm(dist(draft[draft.length - 1], cursor.p))}</text>;
            })()}
            {measure && (() => {
              const a = toScreen(view, measure[0]), b = toScreen(view, measure[1]);
              const d = sub(measure[1], measure[0]);
              return <g pointerEvents="none"><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#22c55e" strokeWidth={2} strokeDasharray="6 4" />
                <circle cx={a.x} cy={a.y} r={4} fill="#22c55e" /><circle cx={b.x} cy={b.y} r={4} fill="#22c55e" />
                <rect x={(a.x + b.x) / 2 - 90} y={(a.y + b.y) / 2 - 34} width={180} height={28} rx={5} fill="#14532d" />
                <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 22} fill="#fff" fontSize={11} textAnchor="middle" fontWeight={600}>{formatMm(dist(measure[0], measure[1]))}</text>
                <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 10} fill="#bbf7d0" fontSize={10} textAnchor="middle">Δx {formatMm(Math.abs(d.x))} · Δy {formatMm(Math.abs(d.y))}</text></g>;
            })()}
            {/* Öffnungsvorschau */}
            {openingPreview && (() => {
              const f = openingFrame(openingPreview.g, { offset: openingPreview.offset, width: openingPreview.width } as OpeningGeom);
              const h = openingPreview.g.thickness / 2 + 40;
              const poly = [add(f.a, mul(f.normal, h)), add(f.b, mul(f.normal, h)), add(f.b, mul(f.normal, -h)), add(f.a, mul(f.normal, -h))].map((p) => toScreen(view, p));
              return <polygon pointerEvents="none" points={poly.map((p) => `${p.x},${p.y}`).join(' ')} fill={openingPreview.fits ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'} stroke={openingPreview.fits ? '#22c55e' : '#ef4444'} />;
            })()}
            {/* Entwurfspunkte */}
            {draft.map((p, i) => { const s = toScreen(view, p); return <circle key={i} cx={s.x} cy={s.y} r={i === 0 ? 5 : 3.5} fill={i === 0 ? '#f59e0b' : '#3b82f6'} pointerEvents="none" />; })}
            {/* Fangmarke */}
            {cursor && tool !== 'select' && tool !== 'pan' && (() => {
              const s = toScreen(view, cursor.p);
              return <g pointerEvents="none">
                <rect x={s.x - 5} y={s.y - 5} width={10} height={10} fill="none" stroke={cursor.snapKind && cursor.snapKind !== 'Raster' && cursor.snapKind !== 'Ortho+Raster' ? '#f59e0b' : '#3b82f6'} strokeWidth={1.5} />
                <line x1={s.x - 12} y1={s.y} x2={s.x + 12} y2={s.y} stroke="#3b82f6" strokeWidth={0.8} /><line x1={s.x} y1={s.y - 12} x2={s.x} y2={s.y + 12} stroke="#3b82f6" strokeWidth={0.8} />
              </g>;
            })()}
            {/* Griffe */}
            {handles.map((h) => { const s = toScreen(view, h.p); return <rect key={h.key} data-handle={h.key} x={s.x - 7} y={s.y - 7} width={14} height={14} rx={2} fill="#fff" stroke="#3b82f6" strokeWidth={2} style={{ cursor: 'move' }} />; })}
          </svg>
        </div>

        {/* Längeneingabe */}
        {tool === 'wall' && draft.length > 0 && (
          <div className="absolute bottom-3 left-2 right-2 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-panel/95 p-2 shadow-xl backdrop-blur md:left-1/2 md:right-auto md:-translate-x-1/2 md:flex-nowrap">
            <span className="text-xs text-muted">Länge</span>
            <input ref={lengthRef} aria-label="Wandlänge" data-testid="wall-length" inputMode="decimal" placeholder="z. B. 3650 / 3,65m"
              className="h-10 min-w-0 flex-1 rounded-md border border-line bg-panel px-2 text-base outline-none focus:border-accent md:h-9 md:w-36 md:flex-none md:text-sm"
              value={lengthInput} onChange={(e) => setLengthInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); void applyLength(); } if (e.key === 'Escape') { setLengthInput(''); svgRef.current?.focus(); } }} />
            <Button size="sm" variant="primary" onClick={() => void applyLength()} disabled={!lengthInput}><Check size={14} />Setzen</Button>
            <Button size="sm" onClick={() => { setDraft([]); setLengthInput(''); }}><XIcon size={14} />Beenden</Button>
          </div>
        )}
        {(tool === 'room' || tool === 'line') && draft.length > 0 && (
          <div className="absolute bottom-3 left-2 right-2 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-panel/95 p-2 shadow-xl md:left-1/2 md:right-auto md:-translate-x-1/2 md:flex-nowrap">
            <span className="text-xs text-muted">{draft.length} Punkt(e)</span>
            <Button size="sm" variant="primary" onClick={() => void finishDraft()} disabled={draft.length < (tool === 'room' ? 3 : 2)}><Check size={14} />Fertig</Button>
            <Button size="sm" onClick={() => setDraft(draft.slice(0, -1))}>Letzten Punkt entfernen</Button>
            <Button size="sm" onClick={() => { setDraft([]); setDraftSnaps([]); }}><XIcon size={14} />Abbrechen</Button>
          </div>
        )}

        {/* Zoom */}
        <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1 rounded-lg border border-line bg-panel/95 p-1 shadow-lg">
          <Button variant="ghost" size="icon" title="Vergrößern" aria-label="Vergrößern" onClick={() => zoomAt({ x: size.w / 2, y: size.h / 2 }, 1.25)}><ZoomIn size={16} /></Button>
          <Button variant="ghost" size="icon" title="Verkleinern" aria-label="Verkleinern" onClick={() => zoomAt({ x: size.w / 2, y: size.h / 2 }, 0.8)}><ZoomOut size={16} /></Button>
          <Button variant="ghost" size="icon" title="Alles zeigen" aria-label="Alles zeigen" onClick={() => fit(focusRoomId)}><Maximize size={16} /></Button>
        </div>
        <div className="pointer-events-none absolute bottom-3 left-3 z-0 hidden text-[11px] text-muted md:block">{project.name} · {floor.name}</div>
      </div>
    </div>
  );
}

function CircuitPicker() {
  const circuits = useProject((s) => s.data.circuits);
  const active = useUi((s) => s.activeCircuitId);
  const set = useUi((s) => s.set);
  return (
    <select aria-label="Aktiver Stromkreis" title="Neue Objekte/Leitungen diesem Stromkreis zuordnen" className="h-7 rounded border border-line bg-panel px-1 text-xs" value={active ?? ''} onChange={(e) => set({ activeCircuitId: e.target.value || null })}>
      <option value="">– kein Stromkreis –</option>
      {Object.values(circuits).sort((a, b) => a.designation.localeCompare(b.designation, 'de', { numeric: true })).map((c) => <option key={c.id} value={c.id}>{c.designation} {c.name ?? ''}</option>)}
    </select>
  );
}

