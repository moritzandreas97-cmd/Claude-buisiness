import type { BoxGeom, OpeningGeom, Pt, WallGeom } from './types';

/** Modellkoordinaten: Millimeter, Ursprung (0,0), x nach rechts, y nach oben (kartesisch). */
export const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);
export const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
export const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
export const mul = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k });
export const len = (a: Pt) => Math.hypot(a.x, a.y);
export const norm = (a: Pt): Pt => { const l = len(a) || 1; return { x: a.x / l, y: a.y / l }; };
export const perp = (a: Pt): Pt => ({ x: -a.y, y: a.x });
export const round = (v: number, step = 1) => Math.round(v / step) * step;

export function polylineLength(pts: Pt[]): number {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1], pts[i]);
  return s;
}

/** Fläche nach Gaußscher Trapezformel, Ergebnis in mm². */
export function polygonArea(pts: Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}
export const mm2ToM2 = (a: number) => a / 1_000_000;

export function polygonCentroid(pts: Pt[]): Pt {
  let cx = 0, cy = 0, a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    const f = p.x * q.y - q.x * p.y;
    cx += (p.x + q.x) * f; cy += (p.y + q.y) * f; a += f;
  }
  if (Math.abs(a) < 1e-9) {
    const n = pts.length || 1;
    return { x: pts.reduce((s, p) => s + p.x, 0) / n, y: pts.reduce((s, p) => s + p.y, 0) / n };
  }
  return { x: cx / (3 * a), y: cy / (3 * a) };
}

export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Projektion eines Punktes auf eine Strecke: t∈[0,1], Abstand, Fußpunkt. */
export function projectOnSegment(p: Pt, a: Pt, b: Pt) {
  const ab = sub(b, a);
  const l2 = ab.x * ab.x + ab.y * ab.y;
  const tRaw = l2 === 0 ? 0 : ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / l2;
  const t = Math.max(0, Math.min(1, tRaw));
  const foot = add(a, mul(ab, t));
  return { t, tRaw, foot, distance: dist(p, foot) };
}

export const wallStart = (w: WallGeom): Pt => ({ x: w.x1, y: w.y1 });
export const wallEnd = (w: WallGeom): Pt => ({ x: w.x2, y: w.y2 });
export const wallLength = (w: WallGeom) => Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
export const wallDir = (w: WallGeom) => norm({ x: w.x2 - w.x1, y: w.y2 - w.y1 });

/** Wand als Polygon (4 Ecken), optional an Enden um ext verlängert. */
export function wallPolygon(w: WallGeom, extStart = 0, extEnd = 0): Pt[] {
  const d = wallDir(w), n = perp(d), h = w.thickness / 2;
  const a = add(wallStart(w), mul(d, -extStart)), b = add(wallEnd(w), mul(d, extEnd));
  return [add(a, mul(n, h)), add(b, mul(n, h)), add(b, mul(n, -h)), add(a, mul(n, -h))];
}

/** Mittelpunkt und Ausdehnung einer Öffnung in Modellkoordinaten. */
export function openingFrame(w: WallGeom, o: OpeningGeom) {
  const d = wallDir(w), n = perp(d);
  const c = add(wallStart(w), mul(d, o.offset));
  const a = add(c, mul(d, -o.width / 2)), b = add(c, mul(d, o.width / 2));
  return { center: c, a, b, dir: d, normal: n };
}

/** Prüft, ob eine Öffnung vollständig in ihrer Wand liegt. */
export function openingFits(w: WallGeom, o: OpeningGeom): boolean {
  const L = wallLength(w);
  return o.width > 0 && o.offset - o.width / 2 >= -0.5 && o.offset + o.width / 2 <= L + 0.5;
}

export function boxCorners(b: BoxGeom): Pt[] {
  const r = (b.rotation * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  const hw = b.w / 2, hd = b.d / 2;
  return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([x, y]) => ({ x: b.x + x * c - y * s, y: b.y + x * s + y * c }));
}

export function rotatePoint(p: Pt, c: Pt, deg: number): Pt {
  const r = (deg * Math.PI) / 180, co = Math.cos(r), si = Math.sin(r);
  const dx = p.x - c.x, dy = p.y - c.y;
  return { x: c.x + dx * co - dy * si, y: c.y + dx * si + dy * co };
}

export function bboxOf(pts: Pt[]) {
  if (pts.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

/** Modell (mm, y nach oben) ↔ Bildschirm (px, y nach unten). */
export interface ViewTransform { scale: number; /* px pro mm */ ox: number; oy: number /* Bildschirmposition des Ursprungs */ }
export const toScreen = (v: ViewTransform, p: Pt): Pt => ({ x: v.ox + p.x * v.scale, y: v.oy - p.y * v.scale });
export const toModel = (v: ViewTransform, p: Pt): Pt => ({ x: (p.x - v.ox) / v.scale, y: (v.oy - p.y) / v.scale });

export function formatMm(mm: number, unit: 'mm' | 'cm' | 'm' = 'cm'): string {
  if (unit === 'mm') return `${Math.round(mm)} mm`;
  if (unit === 'm') return `${(mm / 1000).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} m`;
  return `${(mm / 10).toLocaleString('de-DE', { maximumFractionDigits: 1 })} cm`;
}

/** Parst Benutzereingaben wie "3,5m", "350cm", "3500", "3500mm" → Millimeter. Ohne Einheit: mm. */
export function parseLength(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, '').replace(',', '.');
  const m = /^(-?\d+(?:\.\d+)?)(mm|cm|m)?$/.exec(s);
  if (!m) return null;
  const v = parseFloat(m[1]);
  const unit = m[2] ?? 'mm';
  return unit === 'm' ? v * 1000 : unit === 'cm' ? v * 10 : v;
}
