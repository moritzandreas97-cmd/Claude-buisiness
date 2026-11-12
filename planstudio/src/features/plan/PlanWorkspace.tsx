import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PencilRuler, Zap, Droplets, Sofa, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { useIsMobile } from '../../lib/useMedia';
import { useProject } from '../../store/projectStore';
import { useUi, type PlanMode } from '../../store/uiStore';
import { PlanEditor } from './PlanEditor';
import { PropertiesPanel } from '../props/PropertiesPanel';
import { cn } from '../../ui/primitives';
import { UnplacedRooms } from '../bestand/UnplacedRooms';

const MODES: { v: PlanMode; label: string; icon: ReactNode }[] = [
  { v: 'architecture', label: 'Grundriss', icon: <PencilRuler size={15} /> },
  { v: 'electrical', label: 'Elektro', icon: <Zap size={15} /> },
  { v: 'sanitary', label: 'Sanitär', icon: <Droplets size={15} /> },
  { v: 'interior', label: 'Innenausbau', icon: <Sofa size={15} /> },
];

/** Planungsarbeitsplatz: Editor + kontextabhängiges Eigenschaftenfenster. */
export function PlanWorkspace({ modes, fixedMode, focusRoomId, side, header }: { modes?: PlanMode[]; fixedMode?: PlanMode; focusRoomId?: string | null; side?: ReactNode; header?: ReactNode }) {
  const ui = useUi();
  const mobile = useIsMobile();
  const [sheet, setSheet] = useState(false);
  const unplaced = useProject((s) => Object.values(s.data.rooms).filter((r) => !r.polygon || r.polygon.length < 3).length);
  useEffect(() => { if (fixedMode && ui.mode !== fixedMode) ui.setMode(fixedMode); }, [fixedMode]); // eslint-disable-line react-hooks/exhaustive-deps
  // Handy: Auswahl eines Objekts öffnet das Eigenschaftenfenster von unten
  const selKey = ui.selection.map((x) => x.id).join(',');
  const prevSel = useRef(selKey);
  useEffect(() => { if (mobile && selKey && selKey !== prevSel.current) setSheet(true); prevSel.current = selKey; }, [selKey, mobile]);
  useEffect(() => { if (mobile && ui.placeRoomId) setSheet(false); }, [ui.placeRoomId, mobile]);
  if (!ui.floorId) return null;
  const panel = (
    <>
      {side}
      {ui.mode === 'architecture' && <UnplacedRooms />}
      <PropertiesPanel />
    </>
  );
  return (
    <div className="flex h-full min-h-0 flex-col">
      {(modes || header) && (
        <div className={cn('flex shrink-0 items-center gap-2 border-b border-line bg-panel px-2 py-1.5', mobile ? 'flex-nowrap overflow-x-auto' : 'flex-wrap')}>
          {modes && (
            <div className="flex shrink-0 gap-1 rounded-lg bg-panel2 p-1" role="tablist" aria-label="Planungsmodus">
              {MODES.filter((m) => modes.includes(m.v)).map((m) => (
                <button key={m.v} role="tab" data-mode={m.v} aria-selected={ui.mode === m.v} onClick={() => ui.setMode(m.v)}
                  className={cn('flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium touch-lg', ui.mode === m.v ? 'bg-panel shadow-sm text-fg' : 'text-muted hover:text-fg')}>{m.icon}{m.label}</button>
              ))}
            </div>
          )}
          {header}
        </div>
      )}
      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1"><PlanEditor floorId={ui.floorId} focusRoomId={focusRoomId} /></div>
        {!mobile && !ui.propsCollapsed && (
          <aside className="w-72 shrink-0 overflow-y-auto border-l border-line bg-panel" aria-label="Eigenschaften" data-testid="properties">{panel}</aside>
        )}
        {mobile && !sheet && (
          <button aria-label="Eigenschaften anzeigen" onClick={() => setSheet(true)}
            className="absolute bottom-3 left-14 z-20 flex h-11 items-center gap-2 rounded-full border border-line bg-panel px-4 text-sm font-medium shadow-xl">
            <SlidersHorizontal size={16} />{ui.selection.length ? 'Eigenschaften' : unplaced && ui.mode === 'architecture' ? `Räume (${unplaced})` : 'Ebenen & Geschoss'}
          </button>
        )}
        {mobile && sheet && (
          <aside className="absolute inset-x-0 bottom-0 z-30 flex max-h-[62%] flex-col rounded-t-2xl border-t border-line bg-panel shadow-[0_-8px_30px_rgba(0,0,0,0.35)]" aria-label="Eigenschaften" data-testid="properties">
            <button aria-label="Eigenschaften schließen" onClick={() => setSheet(false)} className="flex shrink-0 flex-col items-center gap-0.5 py-1.5 text-muted">
              <span className="h-1 w-10 rounded-full bg-line" /><ChevronDown size={16} />
            </button>
            <div className="min-h-0 flex-1 overflow-y-auto pb-4">{panel}</div>
          </aside>
        )}
      </div>
    </div>
  );
}
