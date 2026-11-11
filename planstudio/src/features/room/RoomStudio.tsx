import { useEffect, useState } from 'react';
import { Save, Trash2, RotateCcw } from 'lucide-react';
import { useProject } from '../../store/projectStore';
import { useUi } from '../../store/uiStore';
import { useRun } from '../../store/useRun';
import { PlanWorkspace } from '../plan/PlanWorkspace';
import { Button, Field, Input, Select } from '../../ui/primitives';
import type { BoxGeom, Component } from '../../model/types';
import { num, dateTime } from '../../lib/format';
import { bus } from '../../lib/bus';
import { newId } from '../../lib/ids';

const INTERIOR = ['furniture', 'podest', 'beam', 'plate'];
const TYPE_LABEL: Record<string, string> = { furniture: 'Möbel', podest: 'Podest', beam: 'Balken', plate: 'Platte' };

/** Raumstudio: Innenausbau eines Raums mit Möbeln, Podesten, Balken, Platten und Gestaltungsvarianten. */
export function RoomStudio() {
  const ui = useUi();
  const data = useProject((s) => s.data);
  const rooms = Object.values(data.rooms).filter((r) => r.floor_id === ui.floorId).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const [roomId, setRoomId] = useState<string | null>(null);
  useEffect(() => { if (!roomId || !data.rooms[roomId] || data.rooms[roomId].floor_id !== ui.floorId) setRoomId(rooms[0]?.id ?? null); }, [ui.floorId, rooms.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ui.mode !== 'interior') ui.setMode('interior'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const room = roomId ? data.rooms[roomId] : null;
  return (
    <PlanWorkspace fixedMode="interior" focusRoomId={roomId}
      header={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">Raum</span>
          <Select aria-label="Raum wählen" className="h-8 w-48" value={roomId ?? ''} onChange={(e) => { setRoomId(e.target.value || null); setTimeout(() => bus.emit('zoom-room', e.target.value), 0); }}>
            {rooms.length === 0 && <option value="">– keine Räume im Geschoss –</option>}
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
          {room && <span className="text-xs text-muted">{room.usage ?? 'ohne Nutzung'} · {num(room.area_m2 ?? 0)} m²</span>}
        </div>
      }
      side={room ? <RoomInfo roomId={room.id} /> : <div className="p-3 text-sm text-muted">Legen Sie zuerst im Grundriss Räume an (Werkzeug „Raum“).</div>}
    />
  );
}

function RoomInfo({ roomId }: { roomId: string }) {
  const data = useProject((s) => s.data);
  const run = useRun();
  const room = data.rooms[roomId];
  const [variantName, setVariantName] = useState('');
  const items = Object.values(data.components).filter((c) => c.room_id === roomId && INTERIOR.includes(c.type));
  const variants = Object.values(data.room_variants).filter((v) => v.room_id === roomId).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const footprint = items.filter((c) => c.type !== 'beam').reduce((s, c) => s + ((c.geometry as BoxGeom).w * (c.geometry as BoxGeom).d) / 1e6, 0);

  const saveVariant = () => run('Variante speichern', (tx) => tx.insert('room_variants', { room_id: roomId, name: variantName.trim() || `Variante ${variants.length + 1}`, data: { components: items } })).then(() => setVariantName(''));
  const applyVariant = (vid: string) => run('Variante laden', (tx) => {
    const v = tx.get('room_variants', vid)!;
    for (const c of tx.all('components').filter((c) => c.room_id === roomId && INTERIOR.includes(c.type))) tx.remove('components', c.id);
    for (const c of v.data.components as Component[]) {
      if (!tx.get('floors', c.floor_id)) continue;
      tx.insert('components', { ...c, id: newId(), room_id: roomId });
    }
  });

  return (
    <div className="border-b border-line">
      <div className="px-3 py-3">
        <div className="text-sm font-semibold">{room.name}</div>
        <div className="text-xs text-muted">{num(room.area_m2 ?? 0)} m² · {items.length} Einbauten · belegt {num(footprint)} m²</div>
      </div>
      <div className="px-3 pb-3">
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Einbauten im Raum</h4>
        {items.length === 0 && <p className="text-xs text-muted">Werkzeuge links: Möbel, Podest, Balken, Platte – in den Raum tippen.</p>}
        <ul className="flex flex-col gap-1">
          {items.map((c) => { const g = c.geometry as BoxGeom; return (
            <li key={c.id}><button className="flex w-full justify-between rounded bg-panel2 px-2 py-1 text-left text-xs hover:bg-hover" onClick={() => useUi.getState().select([{ table: 'components', id: c.id }])}>
              <span className="truncate">{(c.props?.name as string) || TYPE_LABEL[c.type] || c.type}</span><span className="text-muted">{Math.round(g.w)}×{Math.round(g.d)}×{Math.round(g.h)}</span></button></li>); })}
        </ul>
      </div>
      <div className="border-t border-line px-3 py-3">
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Gestaltungsvarianten</h4>
        <div className="flex gap-1.5"><Input aria-label="Variantenname" className="h-8" placeholder="Name der Variante" value={variantName} onChange={(e) => setVariantName(e.target.value)} /><Button size="sm" onClick={saveVariant}><Save size={13} />Sichern</Button></div>
        <ul className="mt-2 flex flex-col gap-1">
          {variants.map((v) => (
            <li key={v.id} className="flex items-center gap-1 rounded bg-panel2 px-2 py-1 text-xs">
              <span className="min-w-0 flex-1 truncate" title={dateTime(v.created_at)}>{v.name} <span className="text-muted">({v.data.components.length})</span></span>
              <Button size="sm" variant="ghost" title="Variante laden (ersetzt aktuelle Einbauten, rückgängig möglich)" onClick={() => applyVariant(v.id)}><RotateCcw size={12} />Laden</Button>
              <Button size="sm" variant="ghost" aria-label="Variante löschen" onClick={() => run('Variante löschen', (tx) => tx.remove('room_variants', v.id))}><Trash2 size={12} /></Button>
            </li>
          ))}
        </ul>
        <Field label="" className="mt-1"><span className="text-[11px] text-muted">Eine Variante speichert alle Einbauten des Raums. Laden ersetzt die aktuellen Einbauten (rückgängig möglich).</span></Field>
      </div>
    </div>
  );
}
