import type { ProjectData } from '../../db/repository';
import type { BoxGeom, Component, DimensionGeom, Line, OpeningGeom, PlanObject, Pt, Room, WallGeom } from '../../model/types';
import { add, boxCorners, dist, mul, norm, openingFrame, perp, polygonCentroid, sub, toScreen, wallLength, wallPolygon, type ViewTransform } from '../../model/geometry';
import { lineTypeDef, furnitureDef, symbolDef, certaintyDef } from '../../model/catalog';
import { SymbolShape } from './symbols';

const FONT = 'Helvetica, Arial, sans-serif';

export interface Layers { rooms: boolean; walls: boolean; dims: boolean; electrical: boolean; sanitary: boolean; interior: boolean; labels: boolean; links?: boolean; background?: boolean }
export const ALL_LAYERS: Layers = { rooms: true, walls: true, dims: true, electrical: true, sanitary: true, interior: true, labels: true, links: true, background: true };

export interface Palette {
  paper: string; wallFill: string; wallStroke: string; roomFill: string; roomStroke: string; text: string; textMuted: string;
  dim: string; select: string; symbol: string; symbolFill: string; opening: string; interior: string; interiorFill: string;
}
export const SCREEN_DARK: Palette = { paper: '#0f141b', wallFill: '#4b5563', wallStroke: '#cbd5e1', roomFill: 'rgba(59,130,246,0.07)', roomStroke: 'rgba(148,163,184,0.35)', text: '#e2e8f0', textMuted: '#94a3b8', dim: '#7dd3fc', select: '#3b82f6', symbol: '#fbbf24', symbolFill: '#0f141b', opening: '#e2e8f0', interior: '#a78bfa', interiorFill: 'rgba(167,139,250,0.10)' };
export const SCREEN_LIGHT: Palette = { paper: '#f8fafc', wallFill: '#9ca3af', wallStroke: '#1f2937', roomFill: 'rgba(59,130,246,0.06)', roomStroke: 'rgba(71,85,105,0.35)', text: '#0f172a', textMuted: '#475569', dim: '#0369a1', select: '#2563eb', symbol: '#b45309', symbolFill: '#f8fafc', opening: '#1f2937', interior: '#7c3aed', interiorFill: 'rgba(124,58,237,0.08)' };
export const PRINT: Palette = { paper: '#ffffff', wallFill: '#bfbfbf', wallStroke: '#000000', roomFill: 'none', roomStroke: '#9ca3af', text: '#000000', textMuted: '#444444', dim: '#000000', select: '#000000', symbol: '#b45309', symbolFill: '#ffffff', opening: '#000000', interior: '#5b21b6', interiorFill: 'none' };

export interface RenderOpts {
  floorId: string; view: ViewTransform; layers: Layers; palette: Palette;
  /** Strichstärke-/Textbasis in Ausgabe-Einheiten (px am Bildschirm, mm im Export) */
  unit: number; fontSize: number; selected?: Set<string>; interactive?: boolean;
  /** Fachbereichsfilter: andere Fachbereiche abgeschwächt darstellen */
  focus?: 'electrical' | 'sanitary' | 'interior' | null; roomFilter?: string | null;
  /** Objekt-URL des Hintergrundbilds (nur Bildschirm) */ backgroundUrl?: string | null;
}

const pts = (v: ViewTransform, list: Pt[]) => list.map((p) => { const s = toScreen(v, p); return `${s.x.toFixed(2)},${s.y.toFixed(2)}`; }).join(' ');
const fmtLen = (mm: number) => `${(mm / 10).toLocaleString('de-DE', { maximumFractionDigits: 1 })}`;

/** Lesbarer Textwinkel (Grad, Bildschirm) entlang einer Richtung. */
function textAngle(a: Pt, b: Pt) {
  let ang = (Math.atan2(-(b.y - a.y), b.x - a.x) * 180) / Math.PI;
  if (ang > 90) ang -= 180;
  if (ang < -90) ang += 180;
  return ang;
}

export function wallsOf(data: ProjectData, floorId: string) {
  return Object.values(data.components).filter((c) => c.floor_id === floorId && c.type === 'wall');
}

/** Endpunkte, an denen eine weitere Wand anschließt → Wandpolygon dort verlängern (saubere Ecken). */
function wallExtensions(walls: Component[]) {
  const ends: Pt[] = [];
  for (const w of walls) { const g = w.geometry as WallGeom; ends.push({ x: g.x1, y: g.y1 }, { x: g.x2, y: g.y2 }); }
  const count = (p: Pt) => ends.filter((q) => dist(p, q) < 1).length;
  return (g: WallGeom) => [count({ x: g.x1, y: g.y1 }) > 1 ? g.thickness / 2 : 0, count({ x: g.x2, y: g.y2 }) > 1 ? g.thickness / 2 : 0];
}

export function PlanContent(o: RenderOpts & { data: ProjectData }) {
  const { data, floorId, view: v, layers, palette: P, unit: u, fontSize: fs, selected, interactive } = o;
  const comps = Object.values(data.components).filter((c) => c.floor_id === floorId);
  const walls = comps.filter((c) => c.type === 'wall');
  const wallById = new Map(walls.map((w) => [w.id, w]));
  const openings = comps.filter((c) => (c.type === 'door' || c.type === 'window') && c.host_id && wallById.has(c.host_id));
  const dims = comps.filter((c) => c.type === 'dimension');
  const interior = comps.filter((c) => ['furniture', 'podest', 'beam', 'plate'].includes(c.type));
  const rooms = Object.values(data.rooms).filter((r) => r.floor_id === floorId && r.polygon && r.polygon.length >= 3);
  const objects = Object.values(data.plan_objects).filter((p) => p.floor_id === floorId);
  const lines = Object.values(data.lines).filter((l) => l.floor_id === floorId);
  const ext = wallExtensions(walls);
  const sel = (id: string) => selected?.has(id) ?? false;
  const dimOp = (d: 'electrical' | 'sanitary' | 'interior') => (o.focus && o.focus !== d ? 0.35 : 1);
  const roomOk = (roomId: string | null) => !o.roomFilter || roomId === o.roomFilter;
  const hit = interactive ? 'all' : 'none';

  const floor = data.floors[floorId];
  const bg = floor?.background;
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const links = layers.links !== false ? Object.values(data.room_links ?? {}).filter((l) => roomById.has(l.from_room_id) && l.to_room_id && roomById.has(l.to_room_id)) : [];
  return (
    <g>
      {o.backgroundUrl && bg && bg.visible && layers.background !== false && (() => {
        const tl = toScreen(v, { x: bg.x, y: bg.y });
        const w = bg.width_mm * v.scale;
        return <image href={o.backgroundUrl} x={tl.x} y={tl.y} width={w} opacity={bg.opacity} preserveAspectRatio="xMinYMin meet" transform={`rotate(${-bg.rotation} ${tl.x} ${tl.y})`} pointerEvents="none" style={{ imageRendering: 'auto' }} />;
      })()}
      {layers.rooms && rooms.map((r) => <RoomShape key={r.id} r={r} o={o} sel={sel(r.id)} />)}
      {links.map((l) => {
        const a = toScreen(v, polygonCentroid(roomById.get(l.from_room_id)!.polygon!)), b = toScreen(v, polygonCentroid(roomById.get(l.to_room_id!)!.polygon!));
        const c = certaintyDef(l.certainty);
        return <g key={l.id} pointerEvents="none"><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={c?.color ?? P.textMuted} strokeWidth={1.6 * u} strokeDasharray={c?.dash ? c.dash.split(' ').map((n) => Number(n) * u).join(' ') : undefined} strokeLinecap="round" /><circle cx={a.x} cy={a.y} r={2.5 * u} fill={c?.color ?? P.textMuted} /><circle cx={b.x} cy={b.y} r={2.5 * u} fill={c?.color ?? P.textMuted} /></g>;
      })}

      {layers.interior && <g opacity={dimOp('interior')}>{interior.map((c) => <BoxShape key={c.id} c={c} o={o} sel={sel(c.id)} />)}</g>}

      {layers.walls && (
        <g>
          {walls.map((w) => { const g = w.geometry as WallGeom; const [a, b] = ext(g); return <polygon key={'s' + w.id} points={pts(v, wallPolygon(g, a, b))} fill={P.wallStroke} stroke={sel(w.id) ? P.select : P.wallStroke} strokeWidth={(sel(w.id) ? 3 : 1.6) * u} strokeLinejoin="miter" />; })}
          {walls.map((w) => { const g = w.geometry as WallGeom; const [a, b] = ext(g); return <polygon key={'f' + w.id} data-kind="components" data-id={w.id} pointerEvents={hit} points={pts(v, wallPolygon(g, a, b))} fill={sel(w.id) ? P.select : P.wallFill} fillOpacity={sel(w.id) ? 0.55 : 1} />; })}
          {openings.map((c) => <OpeningShape key={c.id} c={c} wall={wallById.get(c.host_id!)!} o={o} sel={sel(c.id)} />)}
        </g>
      )}

      {layers.dims && layers.walls && walls.map((w) => {
        const g = w.geometry as WallGeom; const a = { x: g.x1, y: g.y1 }, b = { x: g.x2, y: g.y2 };
        const L = wallLength(g); if (L < 1) return null;
        const n = perp(norm(sub(b, a)));
        const m = toScreen(v, add(mul(add(a, b), 0.5), mul(n, g.thickness / 2)));
        const off = 0.8 * fs;
        const ang = textAngle(a, b);
        // Text auf Seite der Wandnormalen verschieben (Bildschirmkoordinaten)
        const sn = { x: n.x, y: -n.y };
        return <text key={'l' + w.id} x={m.x + sn.x * off} y={m.y + sn.y * off} fontSize={fs * 0.9} fill={P.dim} textAnchor="middle" dominantBaseline="middle" fontFamily={FONT} transform={`rotate(${ang} ${m.x + sn.x * off} ${m.y + sn.y * off})`} pointerEvents="none">{fmtLen(L)}</text>;
      })}

      {layers.dims && dims.map((c) => <DimShape key={c.id} c={c} o={o} sel={sel(c.id)} />)}

      {lines.map((l) => {
        const vis = l.discipline === 'electrical' ? layers.electrical : layers.sanitary;
        if (!vis) return null;
        return <LineShape key={l.id} l={l} o={o} sel={sel(l.id)} opacity={dimOp(l.discipline)} />;
      })}

      {objects.map((p) => {
        const vis = p.discipline === 'electrical' ? layers.electrical : layers.sanitary;
        if (!vis || !roomOk(p.room_id)) return null;
        return <ObjectShape key={p.id} p={p} o={o} sel={sel(p.id)} opacity={dimOp(p.discipline)} />;
      })}
    </g>
  );
}

function RoomShape({ r, o, sel }: { r: Room; o: RenderOpts; sel: boolean }) {
  const { view: v, palette: P, unit: u, fontSize: fs } = o;
  const c = toScreen(v, polygonCentroid(r.polygon!));
  const cert = certaintyDef(r.certainty);
  return (
    <g>
      <polygon data-kind="rooms" data-id={r.id} pointerEvents={o.interactive ? 'all' : 'none'} points={pts(v, r.polygon!)} fill={sel ? 'rgba(59,130,246,0.18)' : P.roomFill} stroke={sel ? P.select : cert ? cert.color : P.roomStroke} strokeWidth={(sel ? 2 : cert ? 1.5 : 1) * u} strokeDasharray={cert ? (cert.dash ? cert.dash.split(' ').map((n) => Number(n) * u).join(' ') : undefined) : `${4 * u} ${3 * u}`} />
      {o.layers.labels && (
        <text x={c.x} y={c.y} textAnchor="middle" fontFamily={FONT} pointerEvents="none">
          <tspan x={c.x} fontFamily={FONT} fontSize={fs * 1.1} fontWeight={600} fill={P.text}>{r.code ? `${r.code} ` : ''}{r.name}</tspan>
          {r.area_m2 != null && <tspan x={c.x} fontFamily={FONT} dy={fs * 1.3} fontSize={fs * 0.9} fill={P.textMuted}>{r.area_m2.toLocaleString('de-DE', { maximumFractionDigits: 2 })} m²</tspan>}
        </text>
      )}
    </g>
  );
}

function OpeningShape({ c, wall, o, sel }: { c: Component; wall: Component; o: RenderOpts; sel: boolean }) {
  const { view: v, palette: P, unit: u, fontSize: fs } = o;
  const wg = wall.geometry as WallGeom, g = c.geometry as OpeningGeom;
  const f = openingFrame(wg, g);
  const h = wg.thickness / 2 + 0.5;
  const gap = [add(f.a, mul(f.normal, h)), add(f.b, mul(f.normal, h)), add(f.b, mul(f.normal, -h)), add(f.a, mul(f.normal, -h))];
  const col = sel ? P.select : P.opening;
  const sw = (sel ? 2.4 : 1.4) * u;
  const els = [];
  els.push(<polygon key="gap" points={pts(v, gap)} fill={P.paper} stroke="none" />);
  if (c.type === 'door') {
    const hinge = g.flip ? f.b : f.a;
    const other = g.flip ? f.a : f.b;
    const sideN = mul(f.normal, g.side ? -1 : 1);
    const face = add(hinge, mul(sideN, wg.thickness / 2));
    const leafEnd = add(face, mul(sideN, g.width));
    const otherFace = add(other, mul(sideN, wg.thickness / 2));
    const hs = toScreen(v, face), le = toScreen(v, leafEnd), of = toScreen(v, otherFace);
    const r = g.width * v.scale;
    // Bogenrichtung bestimmen
    const cross = (le.x - hs.x) * (of.y - hs.y) - (le.y - hs.y) * (of.x - hs.x);
    els.push(<line key="leaf" x1={hs.x} y1={hs.y} x2={le.x} y2={le.y} stroke={col} strokeWidth={sw * 1.3} />);
    els.push(<path key="arc" d={`M ${le.x} ${le.y} A ${r} ${r} 0 0 ${cross > 0 ? 1 : 0} ${of.x} ${of.y}`} fill="none" stroke={col} strokeWidth={sw * 0.7} strokeDasharray={`${3 * u} ${2 * u}`} />);
    els.push(<line key="j1" {...seg(v, add(f.a, mul(f.normal, h)), add(f.a, mul(f.normal, -h)))} stroke={col} strokeWidth={sw} />);
    els.push(<line key="j2" {...seg(v, add(f.b, mul(f.normal, h)), add(f.b, mul(f.normal, -h)))} stroke={col} strokeWidth={sw} />);
  } else {
    const t = wg.thickness / 2;
    for (const k of [t, t * 0.25, -t * 0.25, -t]) els.push(<line key={'w' + k} {...seg(v, add(f.a, mul(f.normal, k)), add(f.b, mul(f.normal, k)))} stroke={col} strokeWidth={k === t || k === -t ? sw : sw * 0.7} />);
    els.push(<line key="j1" {...seg(v, add(f.a, mul(f.normal, t)), add(f.a, mul(f.normal, -t)))} stroke={col} strokeWidth={sw} />);
    els.push(<line key="j2" {...seg(v, add(f.b, mul(f.normal, t)), add(f.b, mul(f.normal, -t)))} stroke={col} strokeWidth={sw} />);
  }
  const hitPoly = [add(f.a, mul(f.normal, h + 60)), add(f.b, mul(f.normal, h + 60)), add(f.b, mul(f.normal, -h - 60)), add(f.a, mul(f.normal, -h - 60))];
  const lbl = toScreen(v, add(f.center, mul(f.normal, -(wg.thickness / 2 + 2 * fs / v.scale))));
  return (
    <g>
      {els}
      {o.layers.labels && o.layers.dims && <text x={lbl.x} y={lbl.y} fontSize={fs * 0.75} fill={P.textMuted} textAnchor="middle" dominantBaseline="middle" fontFamily={FONT} pointerEvents="none">{c.type === 'door' ? 'T' : 'F'} {Math.round(g.width / 10)}/{Math.round(g.height / 10)}</text>}
      <polygon data-kind="components" data-id={c.id} pointerEvents={o.interactive ? 'all' : 'none'} points={pts(v, hitPoly)} fill="transparent" stroke="none" />
    </g>
  );
}

const seg = (v: ViewTransform, a: Pt, b: Pt) => { const s = toScreen(v, a), e = toScreen(v, b); return { x1: s.x, y1: s.y, x2: e.x, y2: e.y }; };

function DimShape({ c, o, sel }: { c: Component; o: RenderOpts; sel: boolean }) {
  const { view: v, palette: P, unit: u, fontSize: fs } = o;
  const g = c.geometry as DimensionGeom;
  const a = { x: g.x1, y: g.y1 }, b = { x: g.x2, y: g.y2 };
  const n = perp(norm(sub(b, a)));
  const a2 = add(a, mul(n, g.offset)), b2 = add(b, mul(n, g.offset));
  const col = sel ? P.select : P.dim;
  const sa = toScreen(v, a2), sb = toScreen(v, b2);
  const tick = 5 * u;
  const d = norm({ x: sb.x - sa.x, y: sb.y - sa.y });
  const tk = { x: (d.x - d.y) * tick * 0.7, y: (d.y + d.x) * tick * 0.7 };
  const m = { x: (sa.x + sb.x) / 2, y: (sa.y + sb.y) / 2 };
  const ang = textAngle(a, b);
  const nScreen = { x: n.x, y: -n.y };
  const tp = { x: m.x + nScreen.x * fs * 0.7, y: m.y + nScreen.y * fs * 0.7 };
  return (
    <g data-kind="components" data-id={c.id} pointerEvents={o.interactive ? 'all' : 'none'}>
      <line {...seg(v, a, add(a, mul(n, g.offset + Math.sign(g.offset || 1) * 80)))} stroke={col} strokeWidth={0.8 * u} />
      <line {...seg(v, b, add(b, mul(n, g.offset + Math.sign(g.offset || 1) * 80)))} stroke={col} strokeWidth={0.8 * u} />
      <line x1={sa.x} y1={sa.y} x2={sb.x} y2={sb.y} stroke={col} strokeWidth={(sel ? 2 : 1) * u} />
      <line x1={sa.x - tk.x} y1={sa.y - tk.y} x2={sa.x + tk.x} y2={sa.y + tk.y} stroke={col} strokeWidth={1.4 * u} />
      <line x1={sb.x - tk.x} y1={sb.y - tk.y} x2={sb.x + tk.x} y2={sb.y + tk.y} stroke={col} strokeWidth={1.4 * u} />
      <line x1={sa.x} y1={sa.y} x2={sb.x} y2={sb.y} stroke="transparent" strokeWidth={10 * u} />
      <text x={tp.x} y={tp.y} fontSize={fs} fill={col} textAnchor="middle" dominantBaseline="middle" fontFamily={FONT} transform={`rotate(${ang} ${tp.x} ${tp.y})`}>{fmtLen(dist(a, b))}</text>
    </g>
  );
}

function BoxShape({ c, o, sel }: { c: Component; o: RenderOpts; sel: boolean }) {
  const { view: v, palette: P, unit: u, fontSize: fs } = o;
  const g = c.geometry as BoxGeom;
  const col = sel ? P.select : P.interior;
  const center = toScreen(v, { x: g.x, y: g.y });
  const label = c.type === 'furniture' ? (furnitureDef(String(c.props?.kind ?? ''))?.label ?? String(c.props?.name ?? 'Möbel')) : c.type === 'podest' ? 'Podest' : c.type === 'beam' ? 'Balken' : 'Platte';
  const name = (c.props?.name as string) || label;
  return (
    <g data-kind="components" data-id={c.id} pointerEvents={o.interactive ? 'all' : 'none'}>
      <polygon points={pts(v, boxCorners(g))} fill={sel ? 'rgba(59,130,246,0.2)' : P.interiorFill} stroke={col} strokeWidth={(sel ? 2 : 1.1) * u} strokeDasharray={c.type === 'beam' ? `${6 * u} ${3 * u}` : undefined} />
      {c.type === 'podest' && <polygon points={pts(v, boxCorners({ ...g, w: Math.max(0, g.w - 100), d: Math.max(0, g.d - 100) }))} fill="none" stroke={col} strokeWidth={0.6 * u} />}
      {o.layers.labels && <text x={center.x} y={center.y} fontSize={fs * 0.8} fill={col} textAnchor="middle" dominantBaseline="middle" fontFamily={FONT} pointerEvents="none">{name}</text>}
    </g>
  );
}

function LineShape({ l, o, sel, opacity }: { l: Line; o: RenderOpts; sel: boolean; opacity: number }) {
  const { view: v, palette: P, unit: u, fontSize: fs } = o;
  const def = lineTypeDef(l.line_type);
  const p = pts(v, l.points);
  const mid = l.points.length >= 2 ? toScreen(v, { x: (l.points[0].x + l.points[1].x) / 2, y: (l.points[0].y + l.points[1].y) / 2 }) : null;
  const spec = l.line_type === 'cable' ? l.props?.cable : l.props?.dn;
  return (
    <g opacity={opacity} data-kind="lines" data-id={l.id} pointerEvents={o.interactive ? 'all' : 'none'}>
      <polyline points={p} fill="none" stroke="transparent" strokeWidth={12 * u} />
      {sel && <polyline points={p} fill="none" stroke={P.select} strokeWidth={6 * u} strokeOpacity={0.45} />}
      <polyline points={p} fill="none" stroke={def.color} strokeWidth={(l.line_type === 'waste' ? 2.6 : 1.8) * u} strokeDasharray={def.dash ? def.dash.split(' ').map((x) => Number(x) * u * 0.5).join(' ') : undefined} strokeLinejoin="round" strokeLinecap="round" />
      {o.layers.labels && mid && spec && <text x={mid.x} y={mid.y - fs * 0.5} fontSize={fs * 0.7} fill={def.color} textAnchor="middle" fontFamily={FONT} pointerEvents="none">{String(spec)}</text>}
    </g>
  );
}

function ObjectShape({ p, o, sel, opacity }: { p: PlanObject; o: RenderOpts; sel: boolean; opacity: number }) {
  const { view: v, palette: P, unit: u, fontSize: fs } = o;
  const s = toScreen(v, { x: p.x, y: p.y });
  const k = v.scale;
  const def = symbolDef(p.type);
  const color = sel ? P.select : p.discipline === 'sanitary' ? (o.palette === PRINT ? '#1e3a8a' : '#60a5fa') : P.symbol;
  const sw = (sel ? 2.4 : 1.5) * u / k;
  const ext = def?.size ? Math.max(def.size.w, def.size.d) / 2 : 160;
  return (
    <g opacity={opacity} data-kind="plan_objects" data-id={p.id} pointerEvents={o.interactive ? 'all' : 'none'}>
      <g transform={`translate(${s.x.toFixed(2)} ${s.y.toFixed(2)}) rotate(${-p.rotation}) scale(${k})`}>
        <circle r={ext + 40} fill="transparent" />
        {sel && <circle r={ext + 60} fill="none" stroke={P.select} strokeWidth={sw} strokeDasharray={`${40} ${30}`} />}
        <SymbolShape type={p.type} sw={sw} color={color} fill={P.symbolFill} props={p.props} />
      </g>
      {o.layers.labels && p.label && <text x={s.x + (ext + 50) * k} y={s.y - (ext * 0.4) * k} fontSize={fs * 0.75} fill={color} fontFamily={FONT} pointerEvents="none">{p.label}</text>}
    </g>
  );
}

