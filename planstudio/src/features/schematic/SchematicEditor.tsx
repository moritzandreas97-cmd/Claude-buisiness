import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { MousePointer2, Cable, Plus, Trash2, RotateCw, Link2, AlertTriangle, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { useProject } from '../../store/projectStore';
import { useUi } from '../../store/uiStore';
import { useRun } from '../../store/useRun';
import { SCHEM_PAGE, SCHEM_SYMBOLS, schemDef, symbolDef } from '../../model/catalog';
import type { Pt, SchematicSymbol, SchematicWire } from '../../model/types';
import { rotatePoint, round } from '../../model/geometry';
import { Button, cn, Field, Select } from '../../ui/primitives';
import { CommitInput, SelectField, TextField, trimOrNull } from '../../ui/fields';
import type { Tx } from '../../store/tx';
import type { ProjectData } from '../../db/repository';

const GRID = 5;

export function portPos(s: Pick<SchematicSymbol, 'x' | 'y' | 'rotation' | 'type'>, portId: string): Pt {
  const p = schemDef(s.type).ports.find((q) => q.id === portId) ?? { x: 0, y: 0 };
  return rotatePoint({ x: s.x + p.x, y: s.y + p.y }, { x: s.x, y: s.y }, s.rotation);
}

/** Orthogonale Verbindung (Manhattan-Routing) */
export function wirePath(a: Pt, b: Pt): Pt[] {
  if (a.x === b.x || a.y === b.y) return [a, b];
  const my = round((a.y + b.y) / 2, GRID);
  return [a, { x: a.x, y: my }, { x: b.x, y: my }, b];
}

export function gridRef(p: Pt) {
  const { w, h, cols, rows, margin } = SCHEM_PAGE;
  const c = Math.min(cols, Math.max(1, Math.floor(((p.x - margin) / (w - 2 * margin)) * cols) + 1));
  const r = Math.min(rows, Math.max(1, Math.floor(((p.y - margin) / (h - 2 * margin)) * rows) + 1));
  return `${c}${String.fromCharCode(64 + r)}`;
}

export function nextSchemLabel(tx: Tx, prefix: string) {
  const used = new Set<number>();
  const re = new RegExp(`^-?${prefix}(\\d+)$`);
  for (const s of tx.all('schematic_symbols')) { const m = re.exec(s.label ?? ''); if (m) used.add(Number(m[1])); }
  let i = 1; while (used.has(i)) i++;
  return `-${prefix}${i}`;
}

/** Querverweise eines Symbols: gleiche BMK auf anderen Blättern + verknüpftes Planobjekt. */
export function crossRefs(data: ProjectData, s: SchematicSymbol): string[] {
  const out: string[] = [];
  if (s.label) {
    for (const o of Object.values(data.schematic_symbols)) {
      if (o.id === s.id || o.label !== s.label) continue;
      const page = data.schematic_pages[o.page_id];
      out.push(`/${page?.sort_order ?? '?'}.${gridRef(o)}`);
    }
  }
  if (s.plan_object_id) {
    const po = data.plan_objects[s.plan_object_id];
    if (po) out.push(`⌂ ${data.floors[po.floor_id]?.name ?? ''}${po.room_id ? ' / ' + (data.rooms[po.room_id]?.name ?? '') : ''}`);
  }
  return out;
}

function SchemShape({ type, color }: { type: string; color: string }) {
  const s = { stroke: color, strokeWidth: 0.5, fill: 'none', strokeLinecap: 'round' as const };
  switch (type) {
    case 'feed': return <g><rect x={-10} y={-5} width={20} height={10} {...s} /><text x={0} y={1.8} fontSize={4.5} textAnchor="middle" fill={color} stroke="none">L N</text><line x1={-5} y1={5} x2={-5} y2={10} {...s} /><line x1={5} y1={5} x2={5} y2={10} {...s} /></g>;
    case 'mcb': return <g><line x1={0} y1={-10} x2={0} y2={-5} {...s} /><line x1={0} y1={-5} x2={-4} y2={4} {...s} /><line x1={0} y1={4} x2={0} y2={10} {...s} /><rect x={-1.5} y={-6.5} width={3} height={3} {...s} /></g>;
    case 'rcd': return <g>{[-5, 5].map((x) => <g key={x}><line x1={x} y1={-10} x2={x} y2={-5} {...s} /><line x1={x} y1={-5} x2={x - 4} y2={4} {...s} /><line x1={x} y1={4} x2={x} y2={10} {...s} /></g>)}<ellipse cx={0} cy={6} rx={8} ry={2.2} {...s} /><line x1={-9} y1={-1} x2={7} y2={-1} {...s} strokeDasharray="1 1" /></g>;
    case 'switch': case 'contact_no': return <g><line x1={0} y1={-10} x2={0} y2={-5} {...s} /><line x1={0} y1={5} x2={-4} y2={-4} {...s} /><line x1={0} y1={5} x2={0} y2={10} {...s} />{type === 'switch' && <line x1={-2} y1={0} x2={-7} y2={0} {...s} strokeDasharray="1 1" />}</g>;
    case 'pushbutton': return <g><line x1={0} y1={-10} x2={0} y2={-5} {...s} /><line x1={0} y1={5} x2={-4} y2={-4} {...s} /><line x1={0} y1={5} x2={0} y2={10} {...s} /><path d="M -2 0 L -7 0 M -7 -2 L -7 2" {...s} /></g>;
    case 'twoway': return <g><line x1={0} y1={10} x2={0} y2={4} {...s} /><line x1={0} y1={4} x2={-5} y2={-4} {...s} /><line x1={-5} y1={-5} x2={-5} y2={-10} {...s} /><line x1={5} y1={-5} x2={5} y2={-10} {...s} /><line x1={5} y1={-5} x2={3} y2={-5} {...s} /></g>;
    case 'coil': return <g><line x1={0} y1={-10} x2={0} y2={-4} {...s} /><rect x={-7} y={-4} width={14} height={8} {...s} /><line x1={0} y1={4} x2={0} y2={10} {...s} /></g>;
    case 'light': return <g><line x1={0} y1={-10} x2={0} y2={-5} {...s} /><circle r={5} {...s} /><line x1={-3.5} y1={-3.5} x2={3.5} y2={3.5} {...s} /><line x1={-3.5} y1={3.5} x2={3.5} y2={-3.5} {...s} /><line x1={0} y1={5} x2={0} y2={10} {...s} /></g>;
    case 'socket': return <g><line x1={-4} y1={-8} x2={-4} y2={-2} {...s} /><line x1={4} y1={-8} x2={4} y2={-2} {...s} /><path d="M -7 -2 L 7 -2 M -7 -2 A 7 7 0 0 0 7 -2" {...s} /></g>;
    case 'terminal': return <g><line x1={0} y1={-5} x2={0} y2={-1.5} {...s} /><circle r={1.5} {...s} /><line x1={0} y1={1.5} x2={0} y2={5} {...s} /></g>;
    case 'load': return <g><line x1={0} y1={-8} x2={0} y2={-6} {...s} /><circle r={6} {...s} /><text y={2} fontSize={5} textAnchor="middle" fill={color} stroke="none">M</text><line x1={0} y1={6} x2={0} y2={8} {...s} /></g>;
    case 'pe': return <g><line x1={0} y1={-5} x2={0} y2={0} {...s} /><line x1={-5} y1={0} x2={5} y2={0} {...s} /><line x1={-3} y1={2} x2={3} y2={2} {...s} /><line x1={-1} y1={4} x2={1} y2={4} {...s} /></g>;
  }
  return <rect x={-5} y={-5} width={10} height={10} {...s} />;
}

type Sel = { kind: 'symbol' | 'wire'; id: string } | null;

export function SchematicEditor() {
  const { data, project } = useProject();
  const run = useRun();
  const toast = useUi((s) => s.toast);
  const theme = useUi((s) => s.theme);
  const pages = Object.values(data.schematic_pages).sort((a, b) => a.sort_order - b.sort_order);
  const [pageId, setPageId] = useState<string | null>(pages[0]?.id ?? null);
  const [tool, setTool] = useState<'select' | 'place' | 'wire'>('select');
  const [symType, setSymType] = useState('mcb');
  const [sel, setSel] = useState<Sel>(null);
  const [wireStart, setWireStart] = useState<{ sym: string; port: string } | null>(null);
  const [drag, setDrag] = useState<{ id: string; start: Pt; orig: Pt; cur: Pt; moved: boolean } | null>(null);
  const [cursor, setCursor] = useState<Pt | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 900, h: 640 });
  useEffect(() => { const el = wrap.current; if (!el) return; const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight })); ro.observe(el); return () => ro.disconnect(); }, []);
  useEffect(() => { if (!pageId || !data.schematic_pages[pageId]) setPageId(pages[0]?.id ?? null); }, [pages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const [zoom, setZoom] = useState({ z: 1, px: 0, py: 0 });
  const [pan, setPan] = useState<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const base = Math.min(size.w / (SCHEM_PAGE.w + 20), size.h / (SCHEM_PAGE.h + 20));
  const scale = base * zoom.z;
  const ox = (size.w - SCHEM_PAGE.w * scale) / 2 + zoom.px, oy = (size.h - SCHEM_PAGE.h * scale) / 2 + zoom.py;
  const zoomAt = (sx: number, sy: number, f: number) => setZoom((zz) => {
    const z = Math.min(8, Math.max(0.5, zz.z * f));
    const s0 = base * zz.z, s1 = base * z;
    const ox0 = (size.w - SCHEM_PAGE.w * s0) / 2 + zz.px, oy0 = (size.h - SCHEM_PAGE.h * s0) / 2 + zz.py;
    const mx = (sx - ox0) / s0, my = (sy - oy0) / s0;
    return { z, px: sx - mx * s1 - (size.w - SCHEM_PAGE.w * s1) / 2, py: sy - my * s1 - (size.h - SCHEM_PAGE.h * s1) / 2 };
  });
  useEffect(() => {
    const el = svg.current; if (!el) return;
    const h = (e: WheelEvent) => { e.preventDefault(); const r = el.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015)); };
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  });
  const toPage = (e: { clientX: number; clientY: number }): Pt => { const r = svg.current!.getBoundingClientRect(); return { x: (e.clientX - r.left - ox) / scale, y: (e.clientY - r.top - oy) / scale }; };
  const snapP = (p: Pt) => ({ x: round(p.x, GRID), y: round(p.y, GRID) });

  const symbols = useMemo(() => Object.values(data.schematic_symbols).filter((s) => s.page_id === pageId), [data.schematic_symbols, pageId]);
  const wires = useMemo(() => Object.values(data.schematic_wires).filter((w) => w.page_id === pageId), [data.schematic_wires, pageId]);
  const symPos = (s: SchematicSymbol) => (drag && drag.id === s.id ? { ...s, x: drag.cur.x, y: drag.cur.y } : s);
  const fg = theme === 'dark' ? '#e2e8f0' : '#0f172a';
  const paper = theme === 'dark' ? '#111821' : '#ffffff';

  const onDown = async (e: RPointerEvent<SVGSVGElement>) => {
    const p = toPage(e);
    const portEl = (e.target as Element).closest('[data-port]') as SVGElement | null;
    const symEl = (e.target as Element).closest('[data-sym]') as SVGElement | null;
    const wireEl = (e.target as Element).closest('[data-wire]') as SVGElement | null;
    if (tool === 'wire') {
      if (!portEl) { setWireStart(null); return; }
      const [sym, port] = portEl.dataset.port!.split(':');
      if (!wireStart) { setWireStart({ sym, port }); return; }
      if (wireStart.sym === sym && wireStart.port === port) { setWireStart(null); return; }
      const dup = wires.some((w) => (w.from_symbol_id === wireStart.sym && w.from_port === wireStart.port && w.to_symbol_id === sym && w.to_port === port) || (w.to_symbol_id === wireStart.sym && w.to_port === wireStart.port && w.from_symbol_id === sym && w.from_port === port));
      if (dup) { toast('Diese Verbindung existiert bereits.', 'error'); setWireStart(null); return; }
      const ws = wireStart;
      const circuit = data.schematic_symbols[ws.sym]?.circuit_id ?? data.schematic_symbols[sym]?.circuit_id ?? null;
      await run('Verbindung', (tx) => { const w = tx.insert('schematic_wires', { page_id: pageId!, from_symbol_id: ws.sym, from_port: ws.port, to_symbol_id: sym, to_port: port, circuit_id: circuit }); setSel({ kind: 'wire', id: w.id }); });
      setWireStart(null);
      return;
    }
    if (tool === 'place') {
      const sp = snapP(p);
      if (sp.x < 0 || sp.y < 0 || sp.x > SCHEM_PAGE.w || sp.y > SCHEM_PAGE.h) return;
      const def = schemDef(symType);
      await run('Symbol platzieren', (tx) => { const s = tx.insert('schematic_symbols', { page_id: pageId!, type: symType, x: sp.x, y: sp.y, rotation: 0, label: nextSchemLabel(tx, def.bmkPrefix), props: {} }); setSel({ kind: 'symbol', id: s.id }); });
      return;
    }
    if (symEl) {
      const id = symEl.dataset.sym!;
      setSel({ kind: 'symbol', id });
      const s = data.schematic_symbols[id];
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      setDrag({ id, start: p, orig: { x: s.x, y: s.y }, cur: { x: s.x, y: s.y }, moved: false });
      return;
    }
    if (wireEl) { setSel({ kind: 'wire', id: wireEl.dataset.wire! }); return; }
    setSel(null);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setPan({ sx: e.clientX, sy: e.clientY, px: zoom.px, py: zoom.py });
  };
  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    const p = toPage(e);
    setCursor(p);
    if (pan) { setZoom((zz) => ({ ...zz, px: pan.px + e.clientX - pan.sx, py: pan.py + e.clientY - pan.sy })); return; }
    if (drag) { const cur = snapP({ x: drag.orig.x + p.x - drag.start.x, y: drag.orig.y + p.y - drag.start.y }); setDrag({ ...drag, cur, moved: drag.moved || cur.x !== drag.orig.x || cur.y !== drag.orig.y }); }
  };
  const onUp = async () => {
    setPan(null);
    const d = drag; setDrag(null);
    if (d?.moved) await run('Symbol verschieben', (tx) => tx.update('schematic_symbols', d.id, { x: d.cur.x, y: d.cur.y }));
  };

  useEffect(() => {
    const h = async (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (e.key === 'Escape') { setWireStart(null); setTool('select'); }
      if (!sel) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { const s = sel; setSel(null); await run('Löschen', (tx) => tx.remove(s.kind === 'symbol' ? 'schematic_symbols' : 'schematic_wires', s.id)); }
      if (e.key.toLowerCase() === 'r' && sel.kind === 'symbol' && !e.ctrlKey) { const s = data.schematic_symbols[sel.id]; await run('Drehen', (tx) => tx.update('schematic_symbols', s.id, { rotation: (s.rotation + 90) % 360 })); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const addPage = () => run('Blatt anlegen', (tx) => { const n = pages.length + 1; const pg = tx.insert('schematic_pages', { project_id: project!.id, name: `Blatt ${n}`, sort_order: (pages[pages.length - 1]?.sort_order ?? 0) + 1 }); setPageId(pg.id); });

  if (!pageId) return <div className="p-6"><Button variant="primary" onClick={addPage}><Plus size={15} />Erstes Stromlaufplan-Blatt anlegen</Button></div>;
  const page = data.schematic_pages[pageId];
  const { w: PW, h: PH, cols, rows, margin: M } = SCHEM_PAGE;

  return (
    <div className="flex h-full min-h-0">
      <div className="flex w-56 shrink-0 flex-col border-r border-line bg-panel">
        <div className="border-b border-line p-2">
          <div className="mb-1.5 flex items-center justify-between"><span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Blätter</span><Button size="sm" variant="ghost" onClick={addPage} aria-label="Blatt hinzufügen"><Plus size={13} /></Button></div>
          {pages.map((p) => <button key={p.id} onClick={() => { setPageId(p.id); setSel(null); }} className={cn('block w-full truncate rounded px-2 py-1.5 text-left text-sm', p.id === pageId ? 'bg-accent/15 text-accent' : 'hover:bg-hover')}>/{p.sort_order} {p.name}</button>)}
        </div>
        <div className="flex gap-1 border-b border-line p-2">
          <Button size="sm" active={tool === 'select'} onClick={() => setTool('select')} title="Auswählen/Verschieben"><MousePointer2 size={14} /></Button>
          <Button size="sm" active={tool === 'wire'} onClick={() => { setTool('wire'); setWireStart(null); }} title="Verbinden: Anschluss → Anschluss"><Cable size={14} />Verbinden</Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Symbolpalette</div>
          {SCHEM_SYMBOLS.map((s) => (
            <button key={s.type} data-schem-symbol={s.type} onClick={() => { setSymType(s.type); setTool('place'); }}
              className={cn('flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs touch-lg', tool === 'place' && symType === s.type ? 'bg-accent/15 text-accent' : 'hover:bg-hover')}>
              <svg width={22} height={22} viewBox="-12 -12 24 24"><SchemShape type={s.type} color="currentColor" /></svg>{s.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={wrap} className="relative min-w-0 flex-1 bg-canvas" style={{ touchAction: 'none' }}>
        <svg ref={svg} width={size.w} height={size.h} data-testid="schematic-canvas" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} className={tool === 'select' ? '' : 'cursor-crosshair'}>
          <g transform={`translate(${ox} ${oy}) scale(${scale})`}>
            <rect width={PW} height={PH} fill={paper} stroke={fg} strokeWidth={0.3} />
            {Array.from({ length: Math.floor(PW / GRID) }).map((_, i) => <line key={'gx' + i} x1={i * GRID} y1={M} x2={i * GRID} y2={PH - M} stroke={fg} strokeOpacity={0.05} strokeWidth={0.2} />)}
            {Array.from({ length: Math.floor(PH / GRID) }).map((_, i) => <line key={'gy' + i} x1={M} y1={i * GRID} x2={PW - M} y2={i * GRID} stroke={fg} strokeOpacity={0.05} strokeWidth={0.2} />)}
            <rect x={M} y={M} width={PW - 2 * M} height={PH - 2 * M} fill="none" stroke={fg} strokeWidth={0.5} />
            {Array.from({ length: cols }).map((_, i) => <text key={'c' + i} x={M + ((i + 0.5) * (PW - 2 * M)) / cols} y={M - 3} fontSize={4} textAnchor="middle" fill={fg}>{i + 1}</text>)}
            {Array.from({ length: rows }).map((_, i) => <text key={'r' + i} x={M - 4} y={M + ((i + 0.5) * (PH - 2 * M)) / rows} fontSize={4} textAnchor="middle" fill={fg}>{String.fromCharCode(65 + i)}</text>)}
            {/* Schriftfeld */}
            <g fontSize={3.5} fill={fg}>
              <rect x={PW - M - 130} y={PH - M - 18} width={130} height={18} fill="none" stroke={fg} strokeWidth={0.4} />
              <text x={PW - M - 127} y={PH - M - 12}>{project!.name}</text>
              <text x={PW - M - 127} y={PH - M - 6}>Stromlaufplan · {page.name}</text>
              <text x={PW - M - 127} y={PH - M - 1.5} fontSize={2.6} opacity={0.7}>Planungsentwurf – fachliche Prüfung durch Elektrofachkraft erforderlich</text>
              <text x={PW - M - 4} y={PH - M - 6} textAnchor="end" fontSize={6}>/{page.sort_order}</text>
            </g>

            {wires.map((w) => {
              const a = data.schematic_symbols[w.from_symbol_id], b = data.schematic_symbols[w.to_symbol_id];
              if (!a || !b) return null;
              const pts = wirePath(portPos(symPos(a), w.from_port), portPos(symPos(b), w.to_port));
              const d = pts.map((p) => `${p.x},${p.y}`).join(' ');
              const isSel = sel?.kind === 'wire' && sel.id === w.id;
              const mid = pts[Math.floor(pts.length / 2)];
              return (
                <g key={w.id} data-wire={w.id}>
                  <polyline points={d} fill="none" stroke="transparent" strokeWidth={3} />
                  <polyline points={d} fill="none" stroke={isSel ? '#3b82f6' : fg} strokeWidth={isSel ? 0.8 : 0.45} />
                  {w.label && <text x={mid.x + 1} y={mid.y - 1} fontSize={2.8} fill={fg} opacity={0.8}>{w.label}</text>}
                </g>
              );
            })}
            {tool === 'wire' && wireStart && cursor && (() => { const s = data.schematic_symbols[wireStart.sym]; if (!s) return null; const a = portPos(s, wireStart.port); return <line x1={a.x} y1={a.y} x2={cursor.x} y2={cursor.y} stroke="#3b82f6" strokeWidth={0.5} strokeDasharray="1.5 1" pointerEvents="none" />; })()}

            {symbols.map((s0) => {
              const s = symPos(s0);
              const def = schemDef(s.type);
              const isSel = sel?.kind === 'symbol' && sel.id === s.id;
              const refs = crossRefs(data, s0);
              const col = isSel ? '#3b82f6' : fg;
              return (
                <g key={s.id}>
                  <g data-sym={s.id} transform={`translate(${s.x} ${s.y}) rotate(${s.rotation})`} style={{ cursor: tool === 'select' ? 'move' : undefined }}>
                    <rect x={-def.w / 2 - 1} y={-def.h / 2 - 1} width={def.w + 2} height={def.h + 2} fill="transparent" stroke={isSel ? '#3b82f6' : 'none'} strokeWidth={0.3} strokeDasharray="1 1" />
                    <SchemShape type={s.type} color={col} />
                  </g>
                  <text x={s.x + def.w / 2 + 2} y={s.y - 1} fontSize={3.4} fill={col} fontWeight={600} pointerEvents="none">{s.label}</text>
                  {s.circuit_id && <text x={s.x + def.w / 2 + 2} y={s.y + 3} fontSize={2.6} fill="#f59e0b" pointerEvents="none">{data.circuits[s.circuit_id]?.designation}</text>}
                  {refs.length > 0 && <text x={s.x + def.w / 2 + 2} y={s.y + 6.5} fontSize={2.4} fill={col} opacity={0.75} pointerEvents="none">{refs.join('  ')}</text>}
                  {(s.props?.rating as string) && <text x={s.x - def.w / 2 - 2} y={s.y} fontSize={2.8} fill={col} textAnchor="end" pointerEvents="none">{String(s.props?.rating)}</text>}
                  {(tool === 'wire' || isSel) && def.ports.map((p) => { const pp = portPos(s, p.id); const active = wireStart?.sym === s.id && wireStart.port === p.id; return (
                    <g key={p.id} data-port={`${s.id}:${p.id}`} style={{ cursor: 'pointer' }}>
                      <circle cx={pp.x} cy={pp.y} r={tool === 'wire' ? 2.2 : 1} fill={active ? '#3b82f6' : 'rgba(59,130,246,0.25)'} stroke="#3b82f6" strokeWidth={0.3} />
                      <text x={pp.x + 1.6} y={pp.y - 1.2} fontSize={2} fill="#3b82f6" pointerEvents="none">{p.id}</text>
                    </g>); })}
                </g>
              );
            })}
          </g>
        </svg>
        <div className="absolute bottom-3 right-3 flex flex-col gap-1 rounded-lg border border-line bg-panel/95 p-1 shadow-lg">
          <Button variant="ghost" size="icon" aria-label="Vergrößern" onClick={() => zoomAt(size.w / 2, size.h / 2, 1.25)}><ZoomIn size={16} /></Button>
          <Button variant="ghost" size="icon" aria-label="Verkleinern" onClick={() => zoomAt(size.w / 2, size.h / 2, 0.8)}><ZoomOut size={16} /></Button>
          <Button variant="ghost" size="icon" aria-label="Ganzes Blatt" onClick={() => setZoom({ z: 1, px: 0, py: 0 })}><Maximize size={16} /></Button>
        </div>
        <div className="pointer-events-none absolute left-3 top-3 rounded bg-panel/90 px-2 py-1 text-xs text-muted">
          {tool === 'place' ? `Platzieren: ${schemDef(symType).label} – auf Blatt tippen` : tool === 'wire' ? (wireStart ? 'Zielanschluss antippen (Esc = abbrechen)' : 'Startanschluss antippen') : 'Symbol ziehen = verschieben · Fläche ziehen = Ansicht verschieben · Mausrad = Zoom · R = drehen · Entf = löschen'}
        </div>
      </div>

      <aside className="w-72 shrink-0 overflow-y-auto border-l border-line bg-panel" aria-label="Eigenschaften Stromlaufplan">
        <div className="border-b border-line p-3">
          <TextField label="Blattname" value={page.name} onCommit={(v) => { if (!v) throw new Error('Name darf nicht leer sein.'); return run('Blatt', (tx) => tx.update('schematic_pages', page.id, { name: v })); }} />
          {pages.length > 1 && <Button className="mt-2" size="sm" variant="ghost" onClick={() => { if (confirm(`Blatt „${page.name}“ mit allen Symbolen löschen?`)) run('Blatt löschen', (tx) => tx.remove('schematic_pages', page.id)); }}><Trash2 size={13} />Blatt löschen</Button>}
        </div>
        {sel?.kind === 'symbol' && data.schematic_symbols[sel.id] && <SymbolProps s={data.schematic_symbols[sel.id]} onDelete={() => setSel(null)} />}
        {sel?.kind === 'wire' && data.schematic_wires[sel.id] && <WireProps w={data.schematic_wires[sel.id]} onDelete={() => setSel(null)} />}
        {!sel && <div className="p-3 text-xs leading-relaxed text-muted">Symbol aus der Palette wählen und auf das Blatt tippen. Mit „Verbinden“ Anschlüsse verknüpfen. Querverweise entstehen über gleiche BMK auf anderen Blättern und über die Verknüpfung mit Objekten im Installationsplan.</div>}
        <div className="m-3 flex gap-2 rounded-lg border border-warn/40 bg-warn/10 p-2 text-[11px] text-warn"><AlertTriangle size={14} className="shrink-0" />Der Stromlaufplan ist eine Dokumentationshilfe. Bemessung, Schutzmaßnahmen und Selektivität werden nicht geprüft.</div>
      </aside>
    </div>
  );
}

function SymbolProps({ s, onDelete }: { s: SchematicSymbol; onDelete(): void }) {
  const { data } = useProject();
  const run = useRun();
  const upd = (patch: Partial<SchematicSymbol>) => run('Symbol ändern', (tx) => tx.update('schematic_symbols', s.id, patch));
  const refs = crossRefs(data, s);
  const elObjects = Object.values(data.plan_objects).filter((o) => o.discipline === 'electrical');
  return (
    <div className="flex flex-col gap-2.5 p-3">
      <div className="text-sm font-semibold">{schemDef(s.type).label}</div>
      <TextField label="Betriebsmittelkennzeichnung (BMK)" value={s.label} onCommit={(v) => upd({ label: v })} />
      <SelectField label="Symbol" value={s.type} options={SCHEM_SYMBOLS.map((d) => ({ v: d.type, label: d.label }))} onChange={(v) => v && upd({ type: v })} />
      <SelectField label="Stromkreis" value={s.circuit_id} allowEmpty="–" options={Object.values(data.circuits).map((c) => ({ v: c.id, label: `${c.designation} ${c.name ?? ''}` }))} onChange={(v) => upd({ circuit_id: v })} />
      <Field label="Verknüpftes Objekt im Installationsplan">
        <Select value={s.plan_object_id ?? ''} onChange={(e) => upd({ plan_object_id: e.target.value || null })}>
          <option value="">– keine Verknüpfung –</option>
          {elObjects.map((o) => <option key={o.id} value={o.id}>{o.label ?? ''} {o.name ?? symbolDef(o.type)?.label} {o.room_id ? `(${data.rooms[o.room_id]?.name})` : ''}</option>)}
        </Select>
      </Field>
      <TextField label="Kenndaten (Dokumentation)" value={(s.props?.rating as string) ?? null} placeholder="z. B. B16, 30 mA Typ A" onCommit={(v) => upd({ props: { ...s.props, rating: v } })} />
      <TextField label="Funktionstext" value={(s.props?.text as string) ?? null} onCommit={(v) => upd({ props: { ...s.props, text: v } })} />
      <Field label="Querverweise">{refs.length ? <div className="flex flex-col gap-1 text-xs">{refs.map((r, i) => <span key={i} className="flex items-center gap-1"><Link2 size={11} />{r}</span>)}</div> : <span className="text-xs text-muted">keine</span>}</Field>
      <Field label="Position">{<span className="text-xs tabular">Spalte/Zeile {gridRef(s)} · x {s.x} y {s.y}</span>}</Field>
      <div className="flex gap-1.5">
        <Button size="sm" onClick={() => upd({ rotation: (s.rotation + 90) % 360 })}><RotateCw size={13} />Drehen</Button>
        <Button size="sm" variant="danger" onClick={async () => { onDelete(); await run('Symbol löschen', (tx) => tx.remove('schematic_symbols', s.id)); }}><Trash2 size={13} />Löschen</Button>
      </div>
    </div>
  );
}

function WireProps({ w, onDelete }: { w: SchematicWire; onDelete(): void }) {
  const { data } = useProject();
  const run = useRun();
  const a = data.schematic_symbols[w.from_symbol_id], b = data.schematic_symbols[w.to_symbol_id];
  return (
    <div className="flex flex-col gap-2.5 p-3">
      <div className="text-sm font-semibold">Verbindung</div>
      <div className="text-xs">{a?.label}:{w.from_port} → {b?.label}:{w.to_port}</div>
      <Field label="Bezeichnung / Ader"><CommitInput value={w.label} parse={trimOrNull} format={(v) => v ?? ''} placeholder="z. B. L1, N, PE, 1" onCommit={(v) => run('Verbindung', (tx) => tx.update('schematic_wires', w.id, { label: v }))} /></Field>
      <SelectField label="Stromkreis" value={w.circuit_id} allowEmpty="–" options={Object.values(data.circuits).map((c) => ({ v: c.id, label: c.designation }))} onChange={(v) => run('Verbindung', (tx) => tx.update('schematic_wires', w.id, { circuit_id: v }))} />
      <Button size="sm" variant="danger" onClick={async () => { onDelete(); await run('Verbindung löschen', (tx) => tx.remove('schematic_wires', w.id)); }}><Trash2 size={13} />Löschen</Button>
    </div>
  );
}
