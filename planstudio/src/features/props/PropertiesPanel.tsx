import { Copy, RotateCw, Trash2, Link2, ZoomIn } from 'lucide-react';
import type { ReactNode } from 'react';
import { useProject } from '../../store/projectStore';
import { useUi, type Selection } from '../../store/uiStore';
import type { Tx } from '../../store/tx';
import type { BoxGeom, Component, DimensionGeom, Line, OpeningGeom, PlanObject, Room, WallGeom } from '../../model/types';
import { formatMm, wallLength } from '../../model/geometry';
import { CABLE_TYPES, DN_VALUES, FURNITURE, LINE_TYPES, OBJECT_STATUS, PLAN_SYMBOLS, ROOM_STATUS, ROOM_USAGES, lineTypeDef, symbolDef } from '../../model/catalog';
import * as ops from '../plan/ops';
import { Badge, Button, Field } from '../../ui/primitives';
import { CommitInput, LengthField, SelectField, TextField, fmtMoney, parseMoney, parseNumber } from '../../ui/fields';
import { bus } from '../../lib/bus';
import type { Layers } from '../plan/PlanRenderer';

function useRun() {
  const mutate = useProject((s) => s.mutate);
  const toast = useUi((s) => s.toast);
  return async (label: string, fn: (tx: Tx) => unknown) => {
    try { return await mutate(label, fn); } catch (e) { toast(e instanceof Error ? e.message : String(e), 'error'); throw Object.assign(e instanceof Error ? e : new Error(String(e)), { toasted: true }); }
  };
}

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="border-b border-line px-3 py-3">
    <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{title}</h4>
    <div className="flex flex-col gap-2.5">{children}</div>
  </div>
);
const Grid2 = ({ children }: { children: ReactNode }) => <div className="grid grid-cols-2 gap-2">{children}</div>;
const ro = (v: ReactNode) => <div className="flex h-9 items-center rounded-md bg-panel2 px-2.5 text-sm tabular">{v}</div>;

export function PropertiesPanel() {
  const selection = useUi((s) => s.selection);
  const data = useProject((s) => s.data);
  if (selection.length === 0) return <NothingSelected />;
  if (selection.length > 1) return <MultiSelection sel={selection} />;
  const s = selection[0];
  if (s.table === 'components') {
    const c = data.components[s.id];
    if (!c) return <NothingSelected />;
    if (c.type === 'wall') return <WallProps c={c} />;
    if (c.type === 'door' || c.type === 'window') return <OpeningProps c={c} />;
    if (c.type === 'dimension') return <DimProps c={c} />;
    return <BoxProps c={c} />;
  }
  if (s.table === 'plan_objects') { const o = data.plan_objects[s.id]; return o ? <ObjectProps o={o} /> : <NothingSelected />; }
  if (s.table === 'lines') { const l = data.lines[s.id]; return l ? <LineProps l={l} /> : <NothingSelected />; }
  if (s.table === 'rooms') { const r = data.rooms[s.id]; return r ? <RoomProps r={r} /> : <NothingSelected />; }
  return <NothingSelected />;
}

function Actions({ sel, rotate = true, copy = true }: { sel: Selection[]; rotate?: boolean; copy?: boolean }) {
  const run = useRun();
  const ui = useUi();
  return (
    <div className="flex flex-wrap gap-1.5 border-b border-line px-3 py-2.5">
      {copy && <Button size="sm" onClick={async () => { const r = await run('Kopieren', (tx) => ops.duplicateSelection(tx, sel, { x: ui.grid * 5, y: -ui.grid * 5 })).catch(() => null); if (r) ui.select(r as Selection[]); }}><Copy size={13} />Kopieren</Button>}
      {rotate && <Button size="sm" onClick={() => run('Drehen', (tx) => ops.rotateSelection(tx, sel, 90)).catch(() => null)}><RotateCw size={13} />Drehen</Button>}
      <Button size="sm" variant="danger" onClick={async () => { ui.select([]); await run('Löschen', (tx) => ops.deleteSelection(tx, sel)).catch(() => null); }}><Trash2 size={13} />Löschen</Button>
    </div>
  );
}

function Header({ title, sub, id }: { title: string; sub?: ReactNode; id: string }) {
  return (
    <div className="border-b border-line px-3 py-3">
      <div className="text-sm font-semibold">{title}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
      <div className="mt-1 font-mono text-[10px] text-muted/70" title="Eindeutige Objekt-ID">ID {id}</div>
    </div>
  );
}

function WallProps({ c }: { c: Component }) {
  const run = useRun();
  const g = c.geometry as WallGeom;
  const data = useProject((s) => s.data);
  const openings = Object.values(data.components).filter((x) => x.host_id === c.id);
  const L = wallLength(g);
  const angle = ((Math.atan2(g.y2 - g.y1, g.x2 - g.x1) * 180) / Math.PI + 360) % 360;
  const upd = (patch: Partial<WallGeom>) => run('Wand ändern', (tx) => ops.updateWall(tx, c.id, patch, { moveConnected: true }));
  return (
    <div>
      <Header title="Wand" sub={`${formatMm(L)} · ${formatMm(g.thickness)} stark`} id={c.id} />
      <Actions sel={[{ table: 'components', id: c.id }]} />
      <Section title="Geometrie">
        <LengthField label="Länge" value={L} min={ops.MIN_WALL} onCommit={(v) => run('Wandlänge ändern', (tx) => ops.setWallLength(tx, c.id, v!))} hint="Endpunkt wird entlang der Wandachse verschoben; angeschlossene Wände folgen." />
        <Grid2>
          <LengthField label="Stärke" value={g.thickness} min={ops.MIN_THICK} onCommit={(v) => upd({ thickness: v! })} />
          <LengthField label="Höhe" value={g.height} min={1} onCommit={(v) => upd({ height: v! })} />
        </Grid2>
        <Grid2>
          <LengthField label="Start X" value={g.x1} onCommit={(v) => upd({ x1: v! })} />
          <LengthField label="Start Y" value={g.y1} onCommit={(v) => upd({ y1: v! })} />
          <LengthField label="Ende X" value={g.x2} onCommit={(v) => upd({ x2: v! })} />
          <LengthField label="Ende Y" value={g.y2} onCommit={(v) => upd({ y2: v! })} />
        </Grid2>
        <Field label="Winkel">{ro(`${angle.toFixed(1)}°`)}</Field>
      </Section>
      <Section title="Bauteil">
        <TextField label="Material / Aufbau" value={c.material} placeholder="z. B. KS 24 cm, Bestand" onCommit={(v) => run('Material', (tx) => tx.update('components', c.id, { material: v }))} />
        <SelectField label="Status" value={c.status} options={[...OBJECT_STATUS, { v: 'abbruch', label: 'Abbruch' }]} onChange={(v) => run('Status', (tx) => tx.update('components', c.id, { status: v ?? 'geplant' }))} />
        <TextField label="Notizen" multiline value={(c.props?.notes as string) ?? null} onCommit={(v) => run('Notiz', (tx) => tx.update('components', c.id, { props: { ...c.props, notes: v } }))} />
      </Section>
      <Section title={`Öffnungen (${openings.length})`}>
        {openings.length === 0 && <div className="text-xs text-muted">Keine. Werkzeug „Tür“ oder „Fenster“ wählen und auf die Wand tippen.</div>}
        {openings.map((o) => { const og = o.geometry as OpeningGeom; return (
          <button key={o.id} className="flex items-center justify-between rounded-md bg-panel2 px-2 py-1.5 text-left text-xs hover:bg-hover" onClick={() => useUi.getState().select([{ table: 'components', id: o.id }])}>
            <span>{o.type === 'door' ? 'Tür' : 'Fenster'} {Math.round(og.width)}×{Math.round(og.height)}</span><span className="text-muted">bei {formatMm(og.offset)}</span>
          </button>); })}
      </Section>
    </div>
  );
}

function OpeningProps({ c }: { c: Component }) {
  const run = useRun();
  const g = c.geometry as OpeningGeom;
  const wall = useProject((s) => (c.host_id ? s.data.components[c.host_id] : undefined));
  const wg = wall?.geometry as WallGeom | undefined;
  const upd = (patch: Partial<OpeningGeom>) => run('Öffnung ändern', (tx) => ops.updateOpening(tx, c.id, patch));
  const L = wg ? wallLength(wg) : 0;
  return (
    <div>
      <Header title={c.type === 'door' ? 'Tür' : 'Fenster'} sub={wall ? `in Wand (${formatMm(L)})` : 'ohne Wand!'} id={c.id} />
      <Actions sel={[{ table: 'components', id: c.id }]} copy={false} />
      <Section title="Abmessungen">
        <Grid2>
          <LengthField label="Breite" value={g.width} min={100} onCommit={(v) => upd({ width: v! })} />
          <LengthField label="Höhe" value={g.height} min={100} onCommit={(v) => upd({ height: v! })} />
        </Grid2>
        <Grid2>
          <LengthField label="Brüstung" value={g.sill} onCommit={(v) => upd({ sill: v! })} />
          <LengthField label="Abstand Mitte" value={g.offset} onCommit={(v) => upd({ offset: v! })} hint="ab Wandanfang" />
        </Grid2>
        <Field label="Abstand linke Kante / rechte Kante">{ro(`${formatMm(g.offset - g.width / 2)} / ${formatMm(L - g.offset - g.width / 2)}`)}</Field>
        {c.type === 'door' && (
          <Grid2>
            <Button size="sm" onClick={() => upd({ flip: g.flip ? 0 : 1 })}>Anschlag wechseln</Button>
            <Button size="sm" onClick={() => upd({ side: g.side ? 0 : 1 })}>Aufschlag wechseln</Button>
          </Grid2>
        )}
      </Section>
      <Section title="Bauteil">
        <TextField label="Typ / Material" value={c.material} placeholder="z. B. Innentür Röhrenspan" onCommit={(v) => run('Material', (tx) => tx.update('components', c.id, { material: v }))} />
        <SelectField label="Status" value={c.status} options={[...OBJECT_STATUS]} onChange={(v) => run('Status', (tx) => tx.update('components', c.id, { status: v ?? 'geplant' }))} />
      </Section>
    </div>
  );
}

function DimProps({ c }: { c: Component }) {
  const run = useRun();
  const g = c.geometry as DimensionGeom;
  return (
    <div>
      <Header title="Maßlinie" sub={formatMm(Math.hypot(g.x2 - g.x1, g.y2 - g.y1))} id={c.id} />
      <Actions sel={[{ table: 'components', id: c.id }]} rotate={false} />
      <Section title="Darstellung">
        <Field label="Abstand zur Messstrecke (mm, negativ = andere Seite)">
          <CommitInput value={g.offset} parse={parseNumber} onCommit={(v) => run('Maßlinie', (tx) => tx.update('components', c.id, { geometry: { ...g, offset: v as number } }))} />
        </Field>
      </Section>
    </div>
  );
}

function BoxProps({ c }: { c: Component }) {
  const run = useRun();
  const g = c.geometry as BoxGeom;
  const rooms = useProject((s) => s.data.rooms);
  const upd = (patch: Partial<BoxGeom>) => run('Einbauteil ändern', (tx) => { if ((patch.w ?? 1) <= 0 || (patch.d ?? 1) <= 0) throw new Error('Maße müssen > 0 sein.'); tx.update('components', c.id, { geometry: { ...g, ...patch } }); });
  const title = c.type === 'furniture' ? 'Möbel' : c.type === 'podest' ? 'Podest' : c.type === 'beam' ? 'Balken' : 'Platte';
  return (
    <div>
      <Header title={title} sub={`${formatMm(g.w)} × ${formatMm(g.d)} × ${formatMm(g.h)}`} id={c.id} />
      <Actions sel={[{ table: 'components', id: c.id }]} />
      <Section title="Parameter">
        <TextField label="Bezeichnung" value={(c.props?.name as string) ?? null} onCommit={(v) => run('Bezeichnung', (tx) => tx.update('components', c.id, { props: { ...c.props, name: v } }))} />
        {c.type === 'furniture' && <SelectField label="Möbeltyp" value={(c.props?.kind as string) ?? 'custom'} options={FURNITURE.map((f) => ({ v: f.type, label: f.label }))} onChange={(v) => run('Möbeltyp', (tx) => tx.update('components', c.id, { props: { ...c.props, kind: v } }))} />}
        <Grid2>
          <LengthField label="Breite" value={g.w} min={1} onCommit={(v) => upd({ w: v! })} />
          <LengthField label="Tiefe" value={g.d} min={1} onCommit={(v) => upd({ d: v! })} />
          <LengthField label="Höhe/Stärke" value={g.h} onCommit={(v) => upd({ h: v! })} />
          <LengthField label="Unterkante" value={g.elevation} onCommit={(v) => upd({ elevation: v! })} />
          <LengthField label="Mitte X" value={g.x} onCommit={(v) => upd({ x: v! })} />
          <LengthField label="Mitte Y" value={g.y} onCommit={(v) => upd({ y: v! })} />
        </Grid2>
        <Field label="Drehung (°)"><CommitInput value={g.rotation} parse={parseNumber} onCommit={(v) => upd({ rotation: v as number })} /></Field>
        {(c.type === 'podest' || c.type === 'plate' || c.type === 'beam') && <Field label="Volumen">{ro(`${((g.w * g.d * g.h) / 1e9).toLocaleString('de-DE', { maximumFractionDigits: 3 })} m³ · Fläche ${((g.w * g.d) / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 2 })} m²`)}</Field>}
      </Section>
      <Section title="Zuordnung">
        <TextField label="Material" value={c.material} placeholder="z. B. KVH 6×12, OSB 18 mm" onCommit={(v) => run('Material', (tx) => tx.update('components', c.id, { material: v }))} />
        <SelectField label="Raum" value={c.room_id} allowEmpty="– kein Raum –" options={Object.values(rooms).filter((r) => r.floor_id === c.floor_id).map((r) => ({ v: r.id, label: r.name }))} onChange={(v) => run('Raum', (tx) => tx.update('components', c.id, { room_id: v }))} />
        <SelectField label="Status" value={c.status} options={[...OBJECT_STATUS]} onChange={(v) => run('Status', (tx) => tx.update('components', c.id, { status: v ?? 'geplant' }))} />
      </Section>
    </div>
  );
}

function ObjectProps({ o }: { o: PlanObject }) {
  const run = useRun();
  const data = useProject((s) => s.data);
  const def = symbolDef(o.type);
  const upd = (patch: Partial<PlanObject>) => run('Objekt ändern', (tx) => tx.update('plan_objects', o.id, patch));
  const crossRefs = Object.values(data.schematic_symbols).filter((s) => s.plan_object_id === o.id);
  const lines = Object.values(data.lines).filter((l) => l.start_object_id === o.id || l.end_object_id === o.id);
  const conns = (o.props?.connections ?? {}) as Record<string, boolean>;
  return (
    <div>
      <Header title={o.name || def?.label || o.type} sub={`${o.discipline === 'electrical' ? 'Elektro' : 'Sanitär'} · ${def?.label ?? o.type}`} id={o.id} />
      <Actions sel={[{ table: 'plan_objects', id: o.id }]} />
      <Section title="Kennzeichnung">
        <TextField label="Bezeichnung" value={o.name} onCommit={(v) => upd({ name: v })} />
        <TextField label="Betriebsmittelkennzeichnung (BMK)" value={o.label} placeholder="z. B. -XD1" onCommit={(v) => upd({ label: v })} />
        <SelectField label="Objekttyp" value={o.type} options={PLAN_SYMBOLS.filter((s) => s.discipline === o.discipline).map((s) => ({ v: s.type, label: s.label }))} onChange={(v) => v && upd({ type: v })} />
      </Section>
      <Section title="Position">
        <SelectField label="Raum" value={o.room_id} allowEmpty="– kein Raum –" options={Object.values(data.rooms).filter((r) => r.floor_id === o.floor_id).map((r) => ({ v: r.id, label: r.name }))} onChange={(v) => upd({ room_id: v })} />
        <Grid2>
          <LengthField label="X" value={o.x} onCommit={(v) => run('Position', (tx) => tx.update('plan_objects', o.id, { x: v!, room_id: ops.roomAt(tx, o.floor_id, { x: v!, y: o.y }) }))} />
          <LengthField label="Y" value={o.y} onCommit={(v) => run('Position', (tx) => tx.update('plan_objects', o.id, { y: v!, room_id: ops.roomAt(tx, o.floor_id, { x: o.x, y: v! }) }))} />
        </Grid2>
        <Grid2>
          <Field label="Drehung (°)"><CommitInput value={o.rotation} parse={parseNumber} onCommit={(v) => upd({ rotation: (((v as number) % 360) + 360) % 360 })} /></Field>
          <LengthField label="Montagehöhe" nullable value={o.mount_height_mm} onCommit={(v) => upd({ mount_height_mm: v })} />
        </Grid2>
      </Section>
      {o.discipline === 'electrical' && (
        <Section title="Elektro">
          <SelectField label="Stromkreis" value={o.circuit_id} allowEmpty="– nicht zugeordnet –" options={Object.values(data.circuits).sort((a, b) => a.designation.localeCompare(b.designation, 'de', { numeric: true })).map((c) => ({ v: c.id, label: `${c.designation} ${c.name ?? ''}` }))} onChange={(v) => upd({ circuit_id: v })} />
          {o.type === 'socket_multi' && <Field label="Anzahl Steckdosen"><CommitInput value={Number(o.props?.count ?? 2)} parse={parseNumber} onCommit={(v) => { const n = Math.round(v as number); if (n < 1 || n > 12) throw new Error('Anzahl 1–12'); return upd({ props: { ...o.props, count: n } }); }} /></Field>}
          <TextField label="Leistung / Gerät (Doku)" value={(o.props?.device as string) ?? null} placeholder="z. B. Backofen 3,5 kW" onCommit={(v) => upd({ props: { ...o.props, device: v } })} />
        </Section>
      )}
      {o.discipline === 'sanitary' && (
        <Section title="Anschlusspunkte">
          <div className="flex flex-wrap gap-3 text-sm">
            {(['cold', 'hot', 'waste'] as const).map((k) => (
              <label key={k} className="flex items-center gap-1.5"><input type="checkbox" checked={!!conns[k]} onChange={(e) => upd({ props: { ...o.props, connections: { ...conns, [k]: e.target.checked } } })} />{k === 'cold' ? 'Kaltwasser' : k === 'hot' ? 'Warmwasser' : 'Abwasser'}</label>
            ))}
          </div>
          <Grid2>
            <SelectField label="Nennweite Zulauf" value={(o.props?.dn_supply as string) ?? null} allowEmpty="–" options={DN_VALUES.map((d) => ({ v: d, label: d }))} onChange={(v) => upd({ props: { ...o.props, dn_supply: v } })} />
            <SelectField label="Nennweite Ablauf" value={(o.props?.dn_waste as string) ?? null} allowEmpty="–" options={DN_VALUES.map((d) => ({ v: d, label: d }))} onChange={(v) => upd({ props: { ...o.props, dn_waste: v } })} />
          </Grid2>
        </Section>
      )}
      <Section title="Status & Material">
        <SelectField label="Status" value={o.status} options={[...OBJECT_STATUS]} onChange={(v) => upd({ status: v ?? 'geplant' })} />
        {def?.material && <Field label="Materialposition (automatisch)">{ro(<span className="truncate">{def.material.name}</span>)}</Field>}
        <TextField label="Notizen" multiline value={o.notes} onCommit={(v) => upd({ notes: v })} />
      </Section>
      {(crossRefs.length > 0 || lines.length > 0) && (
        <Section title="Querverweise">
          {crossRefs.map((s) => <div key={s.id} className="flex items-center gap-1.5 text-xs"><Link2 size={12} />Stromlaufplan: {data.schematic_pages[s.page_id]?.name} · {s.label}</div>)}
          {lines.map((l) => <div key={l.id} className="flex items-center gap-1.5 text-xs"><Link2 size={12} />{lineTypeDef(l.line_type).label} {formatMm(l.length_mm, 'm')}</div>)}
        </Section>
      )}
    </div>
  );
}

function LineProps({ l }: { l: Line }) {
  const run = useRun();
  const data = useProject((s) => s.data);
  const upd = (patch: Partial<Line>) => run('Leitung ändern', (tx) => tx.update('lines', l.id, patch));
  const objName = (id: string | null) => { const o = id ? data.plan_objects[id] : null; return o ? `${o.label ?? ''} ${o.name ?? ''}` : '– frei –'; };
  return (
    <div>
      <Header title={lineTypeDef(l.line_type).label} sub={`${l.points.length} Punkte`} id={l.id} />
      <Actions sel={[{ table: 'lines', id: l.id }]} rotate={false} />
      <Section title="Leitung">
        <Field label="Länge (aus gezeichnetem Weg)">{ro(`${formatMm(l.length_mm, 'm')}`)}</Field>
        <SelectField label="Leitungsart" value={l.line_type} options={LINE_TYPES.filter((t) => t.discipline === l.discipline).map((t) => ({ v: t.type, label: t.label }))} onChange={(v) => v && upd({ line_type: v as Line['line_type'] })} />
        {l.discipline === 'electrical' ? (
          <>
            <SelectField label="Leitungstyp" value={l.props?.cable ?? null} allowEmpty="– nicht festgelegt –" options={CABLE_TYPES.map((c) => ({ v: c, label: c }))} onChange={(v) => upd({ props: { ...l.props, cable: v ?? undefined } })} />
            <SelectField label="Stromkreis" value={l.circuit_id} allowEmpty="– nicht zugeordnet –" options={Object.values(data.circuits).map((c) => ({ v: c.id, label: `${c.designation} ${c.name ?? ''}` }))} onChange={(v) => upd({ circuit_id: v })} />
          </>
        ) : (
          <Grid2>
            <SelectField label="Nennweite" value={l.props?.dn ?? null} allowEmpty="–" options={DN_VALUES.map((d) => ({ v: d, label: d }))} onChange={(v) => upd({ props: { ...l.props, dn: v ?? undefined } })} />
            <TextField label="Rohrmaterial" value={l.props?.material ?? null} placeholder="z. B. Verbundrohr, HT" onCommit={(v) => upd({ props: { ...l.props, material: v ?? undefined } })} />
          </Grid2>
        )}
        <Field label="Von → Nach">{ro(<span className="truncate text-xs">{objName(l.start_object_id)} → {objName(l.end_object_id)}</span>)}</Field>
        <TextField label="Notizen" multiline value={l.notes} onCommit={(v) => upd({ notes: v })} />
      </Section>
    </div>
  );
}

function RoomProps({ r }: { r: Room }) {
  const run = useRun();
  const data = useProject((s) => s.data);
  const upd = (patch: Partial<Room>) => run('Raum ändern', (tx) => tx.update('rooms', r.id, patch));
  const objs = Object.values(data.plan_objects).filter((o) => o.room_id === r.id);
  const tasks = Object.values(data.tasks).filter((t) => t.room_id === r.id);
  return (
    <div>
      <Header title={r.name} sub={`${r.area_m2?.toLocaleString('de-DE') ?? '–'} m²`} id={r.id} />
      <Actions sel={[{ table: 'rooms', id: r.id }]} />
      <div className="px-3 pt-2"><Button size="sm" onClick={() => bus.emit('zoom-room', r.id)}><ZoomIn size={13} />Auf Raum zoomen</Button></div>
      <Section title="Raumdaten">
        <TextField label="Name" value={r.name} onCommit={(v) => { if (!v) throw new Error('Name darf nicht leer sein.'); return upd({ name: v }); }} />
        <SelectField label="Nutzungsart" value={r.usage} allowEmpty="–" options={ROOM_USAGES.map((u) => ({ v: u, label: u }))} onChange={(v) => upd({ usage: v })} />
        <SelectField label="Status" value={r.status} options={[...ROOM_STATUS]} onChange={(v) => upd({ status: (v ?? 'geplant') as Room['status'] })} />
        <Field label="Fläche (aus Raumpolygon)">{ro(`${r.area_m2?.toLocaleString('de-DE', { maximumFractionDigits: 2 }) ?? '–'} m²`)}</Field>
        <Field label="Raumbudget (€)"><CommitInput value={r.budget_cents} parse={parseMoney} format={fmtMoney} placeholder="leer = kein Budget" onCommit={(v) => upd({ budget_cents: v as number | null })} /></Field>
        <TextField label="Beschreibung" multiline value={r.description} onCommit={(v) => upd({ description: v })} />
      </Section>
      <Section title="Verknüpft">
        <div className="flex flex-wrap gap-1.5"><Badge>{objs.length} Planobjekte</Badge><Badge>{tasks.length} Aufgaben</Badge><Badge>{Object.values(data.materials).filter((m) => m.room_id === r.id).length} Materialien</Badge></div>
      </Section>
    </div>
  );
}

function MultiSelection({ sel }: { sel: Selection[] }) {
  return (
    <div>
      <div className="border-b border-line px-3 py-3 text-sm font-semibold">{sel.length} Objekte ausgewählt</div>
      <Actions sel={sel} />
      <div className="px-3 py-3 text-xs text-muted">Gemeinsam verschieben: ziehen. Shift/Strg + Antippen fügt hinzu oder entfernt.</div>
    </div>
  );
}

function NothingSelected() {
  const ui = useUi();
  const floor = useProject((s) => (ui.floorId ? s.data.floors[ui.floorId] : undefined));
  const data = useProject((s) => s.data);
  const run = useRun();
  const toggle = (k: keyof Layers) => ui.set({ layers: { ...ui.layers, [k]: !ui.layers[k] } });
  const rooms = Object.values(data.rooms).filter((r) => r.floor_id === ui.floorId);
  const layerNames: [keyof Layers, string][] = [['walls', 'Wände & Öffnungen'], ['rooms', 'Räume'], ['dims', 'Bemaßung'], ['electrical', 'Elektroebene'], ['sanitary', 'Sanitärebene'], ['interior', 'Innenausbau / Möbel'], ['labels', 'Beschriftungen']];
  return (
    <div>
      <div className="border-b border-line px-3 py-3"><div className="text-sm font-semibold">Eigenschaften</div><div className="text-xs text-muted">Kein Objekt ausgewählt</div></div>
      {floor && (
        <Section title="Geschoss">
          <TextField label="Name" value={floor.name} onCommit={(v) => { if (!v) throw new Error('Name darf nicht leer sein.'); return run('Geschoss', (tx) => tx.update('floors', floor.id, { name: v })); }} />
          <Grid2>
            <LengthField label="Höhenlage" value={floor.elevation_mm} onCommit={(v) => run('Geschoss', (tx) => tx.update('floors', floor.id, { elevation_mm: v! }))} />
            <LengthField label="Geschosshöhe" value={floor.height_mm} min={1} onCommit={(v) => run('Geschoss', (tx) => tx.update('floors', floor.id, { height_mm: v! }))} />
          </Grid2>
        </Section>
      )}
      <Section title="Ebenen">
        {layerNames.map(([k, label]) => (
          <label key={k} className="flex items-center justify-between text-sm"><span>{label}</span><input type="checkbox" aria-label={`Ebene ${label}`} checked={ui.layers[k]} onChange={() => toggle(k)} /></label>
        ))}
      </Section>
      <Section title="Filter">
        <SelectField label="Objekte nach Raum filtern" value={ui.roomFilter} allowEmpty="– alle Räume –" options={rooms.map((r) => ({ v: r.id, label: r.name }))} onChange={(v) => ui.set({ roomFilter: v })} />
      </Section>
      <Section title="Zeichenhilfen">
        <Field label="Rastergröße (mm)">
          <select aria-label="Rastergröße" className="h-9 rounded-md border border-line bg-panel px-2 text-sm" value={ui.grid} onChange={(e) => ui.set({ grid: Number(e.target.value) })}>
            {[5, 10, 25, 50, 100, 250, 500, 1000].map((g) => <option key={g} value={g}>{g} mm</option>)}
          </select>
        </Field>
        <label className="flex items-center justify-between text-sm"><span>Raster anzeigen</span><input type="checkbox" checked={ui.gridVisible} onChange={() => ui.set({ gridVisible: !ui.gridVisible })} /></label>
        <label className="flex items-center justify-between text-sm"><span>Fangen (Raster/Punkte)</span><input type="checkbox" checked={ui.snap} onChange={() => ui.set({ snap: !ui.snap })} /></label>
        <label className="flex items-center justify-between text-sm"><span>Orthogonal (0°/90°)</span><input type="checkbox" checked={ui.ortho} onChange={() => ui.set({ ortho: !ui.ortho })} /></label>
      </Section>
      <div className="px-3 py-3 text-xs leading-relaxed text-muted">{ui.hint}</div>
    </div>
  );
}
