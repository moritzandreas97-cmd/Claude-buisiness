import { useEffect, type ReactNode } from 'react';
import { PencilRuler, Zap, Droplets, Sofa } from 'lucide-react';
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
  useEffect(() => { if (fixedMode && ui.mode !== fixedMode) ui.setMode(fixedMode); }, [fixedMode]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ui.floorId) return null;
  return (
    <div className="flex h-full min-h-0 flex-col">
      {(modes || header) && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-panel px-2 py-1.5">
          {modes && (
            <div className="flex gap-1 rounded-lg bg-panel2 p-1" role="tablist" aria-label="Planungsmodus">
              {MODES.filter((m) => modes.includes(m.v)).map((m) => (
                <button key={m.v} role="tab" data-mode={m.v} aria-selected={ui.mode === m.v} onClick={() => ui.setMode(m.v)}
                  className={cn('flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium touch-lg', ui.mode === m.v ? 'bg-panel shadow-sm text-fg' : 'text-muted hover:text-fg')}>{m.icon}{m.label}</button>
              ))}
            </div>
          )}
          {header}
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1"><PlanEditor floorId={ui.floorId} focusRoomId={focusRoomId} /></div>
        {!ui.propsCollapsed && (
          <aside className="w-72 shrink-0 overflow-y-auto border-l border-line bg-panel max-md:absolute max-md:bottom-7 max-md:right-0 max-md:top-24 max-md:z-20 max-md:shadow-2xl" aria-label="Eigenschaften" data-testid="properties">
            {side}
            {ui.mode === 'architecture' && <UnplacedRooms />}
            <PropertiesPanel />
          </aside>
        )}
      </div>
    </div>
  );
}
