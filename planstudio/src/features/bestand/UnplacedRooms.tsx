import { PencilRuler } from 'lucide-react';
import { useProject } from '../../store/projectStore';
import { useUi } from '../../store/uiStore';
import { Button } from '../../ui/primitives';
import { CertaintyBadge } from './Evidence';

/** Raumkarten ohne Geometrie: werden nicht automatisch platziert, sondern vom Nutzer eingezeichnet. */
export function UnplacedRooms() {
  const data = useProject((s) => s.data);
  const ui = useUi();
  const all = Object.values(data.rooms).filter((r) => !r.polygon || r.polygon.length < 3);
  if (all.length === 0) return null;
  const here = all.filter((r) => r.floor_id === ui.floorId);
  const other = all.filter((r) => r.floor_id !== ui.floorId);
  const card = (r: (typeof all)[number]) => (
    <li key={r.id} className={'rounded-md border px-2 py-1.5 text-xs ' + (ui.placeRoomId === r.id ? 'border-accent bg-accent/10' : 'border-line bg-panel2')} data-testid="unplaced-card">
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0"><div className="truncate font-medium">{r.code ? <span className="font-mono">{r.code} </span> : null}{r.name}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1"><CertaintyBadge v={r.certainty} small />{r.floor_id !== ui.floorId && <span className="text-muted">{data.floors[r.floor_id]?.name}</span>}</div></div>
        <Button size="sm" variant="ghost" title="Im aktuellen Geschoss einzeichnen" aria-label={`${r.name} einzeichnen`} onClick={() => { ui.setMode('architecture'); ui.set({ placeRoomId: r.id, selection: [] }); ui.setTool('room_rect'); }}><PencilRuler size={13} /></Button>
      </div>
    </li>
  );
  return (
    <div className="border-b border-line px-3 py-3" data-testid="unplaced-rooms">
      <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Unplatzierte Räume ({all.length})</h4>
      <p className="mb-2 text-[11px] text-muted">Werden nicht automatisch angeordnet. Karte wählen, dann Rechteck/Polygon zeichnen.</p>
      <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">{here.map(card)}{other.length > 0 && here.length > 0 && <li className="pt-1 text-[10px] uppercase text-muted">Andere Geschosse</li>}{other.map(card)}</ul>
    </div>
  );
}
