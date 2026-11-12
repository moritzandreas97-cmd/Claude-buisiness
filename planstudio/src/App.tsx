import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Building2, ScanSearch, PencilRuler, Sofa, Zap, Droplets, Milestone, ListChecks, Package, Euro, Camera, FileBarChart, Settings,
  Save, Undo2, Redo2, Menu, MoreVertical, X as XIcon, ZoomIn, ZoomOut, Maximize, Download, Sun, Moon, PanelRightClose, PanelRightOpen, PanelLeftClose, PanelLeftOpen, Loader2, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { createPlatform } from './lib/platform';
import { getSetting } from './db/repository';
import { useProject } from './store/projectStore';
import { useUi, type ModuleId } from './store/uiStore';
import { Button, cn } from './ui/primitives';
import { bus } from './lib/bus';
import { useIsMobile } from './lib/useMedia';
import { formatMm } from './model/geometry';
import { dateTime } from './lib/format';
import { Dashboard, ProjectGate } from './features/dashboard/Dashboard';
import { BuildingPage } from './features/building/BuildingPage';
import { BestandPage } from './features/bestand/BestandPage';
import { PlanWorkspace } from './features/plan/PlanWorkspace';
import { RoomStudio } from './features/room/RoomStudio';
import { ElectricalPage } from './features/electrical/ElectricalPage';
import { SanitaryPage } from './features/sanitary/SanitaryPage';
import { PhasesPage } from './features/tasks/PhasesPage';
import { TasksPage } from './features/tasks/TasksPage';
import { MaterialsPage } from './features/materials/MaterialsPage';
import { CostsPage } from './features/costs/CostsPage';
import { DocsPage } from './features/docs/DocsPage';
import { ReportsPage, exportFloorPlan } from './features/reports/ReportsPage';
import { SettingsPage } from './features/settings/SettingsPage';

const NAV: { id: ModuleId; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'building', label: 'Gebäude', icon: <Building2 size={18} /> },
  { id: 'bestand', label: 'Bestandsaufnahme', icon: <ScanSearch size={18} /> },
  { id: 'plan', label: 'Planungsstudio', icon: <PencilRuler size={18} /> },
  { id: 'room', label: 'Raumstudio', icon: <Sofa size={18} /> },
  { id: 'electrical', label: 'Elektro', icon: <Zap size={18} /> },
  { id: 'sanitary', label: 'Sanitär', icon: <Droplets size={18} /> },
  { id: 'phases', label: 'Bauabschnitte', icon: <Milestone size={18} /> },
  { id: 'tasks', label: 'Aufgaben', icon: <ListChecks size={18} /> },
  { id: 'materials', label: 'Materialien', icon: <Package size={18} /> },
  { id: 'costs', label: 'Kosten', icon: <Euro size={18} /> },
  { id: 'docs', label: 'Dokumentation', icon: <Camera size={18} /> },
  { id: 'reports', label: 'Berichte', icon: <FileBarChart size={18} /> },
  { id: 'settings', label: 'Einstellungen', icon: <Settings size={18} /> },
];
const MODE_LABEL = { architecture: 'Grundriss', electrical: 'Elektroinstallation', sanitary: 'Sanitär', interior: 'Innenausbau' } as const;
const PLAN_MODULES: ModuleId[] = ['plan', 'room', 'electrical', 'sanitary'];

export function App() {
  const { ready, fatal, project, init } = useProject();
  const theme = useUi((s) => s.theme);
  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); }, [theme]);
  useEffect(() => {
    createPlatform().then(async (p) => {
      await init(p);
      let last: string | null = null;
      last = await getSetting(p.db, 'lastProject').catch(() => null);
      if (!last) { try { last = localStorage.getItem('planstudio.lastProject'); } catch { /* ältere Version */ } }
      const s = useProject.getState();
      if (last && s.projects.some((x) => x.id === last)) await s.openProject(last).catch(() => undefined);
    }).catch((e) => useProject.setState({ fatal: String(e) }));
  }, [init]);

  if (fatal) return <div className="flex h-full items-center justify-center p-8"><div className="max-w-lg rounded-xl border border-danger bg-panel p-6"><h1 className="mb-2 flex items-center gap-2 font-semibold text-danger"><AlertTriangle size={18} />Fehler beim Start</h1><p className="text-sm">{fatal}</p></div></div>;
  if (!ready) return <div className="flex h-full items-center justify-center gap-2 text-muted"><Loader2 className="animate-spin" size={18} />PlanStudio wird gestartet …</div>;
  if (!project) return <ProjectGate />;
  return <Shell />;
}

function Shell() {
  const ui = useUi();
  const { project, data, undoStack, redoStack, undo, redo, save } = useProject();
  const floors = Object.values(data.floors).sort((a, b) => a.sort_order - b.sort_order || a.elevation_mm - b.elevation_mm);
  const [exportOpen, setExportOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const mobile = useIsMobile();

  // Geschoss automatisch wählen
  useEffect(() => {
    if (!ui.floorId || !data.floors[ui.floorId]) ui.set({ floorId: floors[0]?.id ?? null, selection: [] });
  }, [data.floors, ui.floorId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Globale Kürzel
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const inField = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 's') { e.preventDefault(); void save().then(() => ui.toast('Gespeichert', 'success')); }
      if (inField) return;
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); void undo(); }
      if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); void redo(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [save, undo, redo]); // eslint-disable-line react-hooks/exhaustive-deps

  const isPlan = PLAN_MODULES.includes(ui.module);
  const lastUndo = undoStack[undoStack.length - 1];
  const lastRedo = redoStack[redoStack.length - 1];

  const go = (id: ModuleId) => { ui.set({ module: id, selection: [] }); if (id === 'plan') ui.setMode('architecture'); if (id === 'room') ui.setMode('interior'); setNavOpen(false); };
  const exportPlan = async (f: 'pdf' | 'svg') => { setExportOpen(false); setMoreOpen(false); if (ui.floorId) { try { const where = await exportFloorPlan(ui.floorId, f, {}); ui.toast(`Exportiert: ${where}`, 'success'); } catch (e) { ui.toast(String(e), 'error'); } } };
  const navItems = (labels: boolean) => NAV.map((n) => (
    <button key={n.id} title={n.label} data-nav={n.id} onClick={() => go(n.id)}
      className={cn('flex items-center gap-3 rounded-md px-3 text-sm touch-lg', labels && mobile ? 'h-12 text-base' : 'h-10', ui.module === n.id ? 'bg-accent/15 font-medium text-accent' : 'text-muted hover:bg-hover hover:text-fg')}>
      <span className="shrink-0">{n.icon}</span>{labels && <span className="truncate">{n.label}</span>}
    </button>
  ));
  const floorSelect = (
    <select aria-label="Geschoss" data-testid="floor-select" className={cn('h-8 rounded-md border border-line bg-panel2 px-2 text-sm', mobile ? 'w-28 shrink-0' : 'max-w-40')} value={ui.floorId ?? ''} onChange={(e) => ui.set({ floorId: e.target.value, selection: [] })}>
      {floors.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
    </select>
  );
  const menuItem = (label: string, icon: React.ReactNode, onClick: () => void, disabled = false) => (
    <button disabled={disabled} className="flex w-full items-center gap-3 rounded px-3 py-3 text-left text-sm hover:bg-hover disabled:opacity-40" onClick={() => { setMoreOpen(false); onClick(); }}>{icon}{label}</button>
  );

  return (
    <div className="flex h-full flex-col">
      {/* Obere Werkzeugleiste */}
      {mobile ? (
        <header className="flex h-12 shrink-0 items-center gap-1 border-b border-line bg-panel px-1" data-layout="mobile">
          <Button variant="ghost" size="icon" aria-label="Menü öffnen" onClick={() => setNavOpen(true)}><Menu size={20} /></Button>
          <button className="min-w-0 flex-1 truncate text-left text-sm font-semibold" onClick={() => go('dashboard')} data-testid="project-name">{project!.name}</button>
          {floorSelect}
          <Button variant="ghost" size="icon" aria-label="Rückgängig" disabled={!lastUndo} onClick={() => void undo()}><Undo2 size={18} /></Button>
          <Button variant="ghost" size="icon" aria-label="Weitere Funktionen" onClick={() => setMoreOpen(!moreOpen)}><MoreVertical size={18} /></Button>
          {moreOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
              <div className="fixed right-2 top-12 z-50 w-64 rounded-lg border border-line bg-panel p-1 shadow-2xl" role="menu">
                {menuItem('Speichern', <Save size={17} />, () => void save().then(() => ui.toast('Projekt gespeichert', 'success')))}
                {menuItem(lastRedo ? `Wiederholen: ${lastRedo.label}` : 'Wiederholen', <Redo2 size={17} />, () => void redo(), !lastRedo)}
                {isPlan && menuItem('Gesamtansicht', <Maximize size={17} />, () => bus.emit('zoom-fit'))}
                {menuItem(ui.theme === 'dark' ? 'Helles Design' : 'Dunkles Design', ui.theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />, () => ui.set({ theme: ui.theme === 'dark' ? 'light' : 'dark' }))}
                {menuItem('Grundriss als PDF', <Download size={17} />, () => void exportPlan('pdf'))}
                {menuItem('Weitere Exporte & Backup', <Download size={17} />, () => go('reports'))}
              </div>
            </>
          )}
        </header>
      ) : (
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-panel px-2">
        <Button variant="ghost" size="icon" aria-label="Navigation ein-/ausklappen" onClick={() => ui.set({ navCollapsed: !ui.navCollapsed })}>{ui.navCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</Button>
        <div className="flex min-w-0 items-center gap-2">
          <div className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent text-xs font-bold text-accent-fg sm:flex">LA</div>
          <button className="min-w-0 truncate text-sm font-semibold hover:text-accent" title="Projekt" onClick={() => ui.set({ module: 'dashboard' })} data-testid="project-name">{project!.name}</button>
        </div>
        <div className="mx-1 h-6 w-px bg-line" />
        {floorSelect}
        {isPlan && <span className="hidden rounded-md bg-accent/15 px-2 py-1 text-xs font-medium text-accent md:inline">{MODE_LABEL[ui.mode]}</span>}
        <div className="flex-1" />
        <Button variant="ghost" size="icon" title="Speichern (Strg+S)" aria-label="Speichern" onClick={() => void save().then(() => ui.toast('Projekt gespeichert', 'success'))}><Save size={17} /></Button>
        <Button variant="ghost" size="icon" title={lastUndo ? `Rückgängig: ${lastUndo.label} (Strg+Z)` : 'Rückgängig'} aria-label="Rückgängig" disabled={!lastUndo} onClick={() => void undo()}><Undo2 size={17} /></Button>
        <Button variant="ghost" size="icon" title={lastRedo ? `Wiederholen: ${lastRedo.label} (Strg+Y)` : 'Wiederholen'} aria-label="Wiederholen" disabled={!lastRedo} onClick={() => void redo()}><Redo2 size={17} /></Button>
        <div className="mx-1 hidden h-6 w-px bg-line sm:block" />
        <div className={cn('hidden items-center sm:flex', !isPlan && 'opacity-40 pointer-events-none')}>
          <Button variant="ghost" size="icon" title="Vergrößern" aria-label="Zoom +" onClick={() => bus.emit('zoom-in')}><ZoomIn size={17} /></Button>
          <Button variant="ghost" size="icon" title="Verkleinern" aria-label="Zoom −" onClick={() => bus.emit('zoom-out')}><ZoomOut size={17} /></Button>
          <Button variant="ghost" size="icon" title="Gesamtansicht" aria-label="Gesamtansicht" onClick={() => bus.emit('zoom-fit')}><Maximize size={17} /></Button>
        </div>
        <Button variant="ghost" size="icon" title="Hell/Dunkel" aria-label="Hell/Dunkel umschalten" onClick={() => ui.set({ theme: ui.theme === 'dark' ? 'light' : 'dark' })}>{ui.theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</Button>
        {isPlan && <Button variant="ghost" size="icon" title="Eigenschaften ein-/ausblenden" aria-label="Eigenschaften ein-/ausblenden" onClick={() => ui.set({ propsCollapsed: !ui.propsCollapsed })}>{ui.propsCollapsed ? <PanelRightOpen size={17} /> : <PanelRightClose size={17} />}</Button>}
        <div className="relative">
          <Button variant="primary" size="sm" onClick={() => setExportOpen(!exportOpen)}><Download size={15} /><span className="hidden sm:inline">Export</span></Button>
          {exportOpen && (
            <div className="absolute right-0 top-10 z-40 w-56 rounded-lg border border-line bg-panel p-1 shadow-xl" onMouseLeave={() => setExportOpen(false)}>
              {[['pdf', 'Grundriss als PDF'], ['svg', 'Grundriss als SVG']].map(([f, l]) => (
                <button key={f} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-hover" onClick={() => void exportPlan(f as 'pdf' | 'svg')}>{l}</button>
              ))}
              <button className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-hover" onClick={() => { setExportOpen(false); ui.set({ module: 'reports' }); }}>Weitere Exporte & Backup …</button>
            </div>
          )}
        </div>
      </header>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Linke Navigation (Desktop/Tablet) */}
        {!mobile && (
          <nav className={cn('flex shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-line bg-panel p-1.5', ui.navCollapsed ? 'w-14' : 'w-52')} aria-label="Module">
            {navItems(!ui.navCollapsed)}
          </nav>
        )}
        {/* Smartphone: ausklappbares Menü */}
        {mobile && navOpen && (
          <div className="fixed inset-0 z-50 flex" data-testid="mobile-menu">
            <nav className="flex w-72 max-w-[85vw] flex-col gap-0.5 overflow-y-auto bg-panel p-2 shadow-2xl" aria-label="Module">
              <div className="mb-2 flex items-center justify-between px-2 pt-1">
                <div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-xs font-bold text-accent-fg">LA</div><span className="text-sm font-semibold">PlanStudio</span></div>
                <Button variant="ghost" size="icon" aria-label="Menü schließen" onClick={() => setNavOpen(false)}><XIcon size={18} /></Button>
              </div>
              {navItems(true)}
            </nav>
            <div className="flex-1 bg-black/50" onClick={() => setNavOpen(false)} />
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-hidden">
          <ModuleView />
        </main>
      </div>

      <StatusBar />
      <Toasts />
    </div>
  );
}

function ModuleView() {
  const module = useUi((s) => s.module);
  const floorId = useUi((s) => s.floorId);
  const scroll = (el: React.ReactNode) => <div className="h-full overflow-y-auto overflow-x-hidden p-3 md:p-6">{el}</div>;
  switch (module) {
    case 'dashboard': return scroll(<Dashboard />);
    case 'building': return scroll(<BuildingPage />);
    case 'bestand': return scroll(<BestandPage />);
    case 'plan': return floorId ? <PlanWorkspace modes={['architecture', 'electrical', 'sanitary', 'interior']} /> : null;
    case 'room': return <RoomStudio />;
    case 'electrical': return <ElectricalPage />;
    case 'sanitary': return <SanitaryPage />;
    case 'phases': return scroll(<PhasesPage />);
    case 'tasks': return scroll(<TasksPage />);
    case 'materials': return scroll(<MaterialsPage />);
    case 'costs': return scroll(<CostsPage />);
    case 'docs': return scroll(<DocsPage />);
    case 'reports': return scroll(<ReportsPage />);
    case 'settings': return scroll(<SettingsPage />);
  }
}

function StatusBar() {
  const ui = useUi();
  const { saveState, lastSavedAt, lastError, clearError } = useProject();
  const isPlan = PLAN_MODULES.includes(ui.module);
  const TOOL_LABEL: Record<string, string> = { select: 'Auswahl', pan: 'Verschieben', wall: 'Wand', room: 'Raum (Polygon)', room_rect: 'Raum (Rechteck)', door: 'Tür', window: 'Fenster', dimension: 'Maßlinie', measure: 'Messen', symbol: 'Symbol', line: 'Leitung', furniture: 'Möbel', podest: 'Podest', beam: 'Balken', plate: 'Platte' };
  return (
    <footer className="hidden h-7 shrink-0 md:flex items-center gap-4 overflow-hidden whitespace-nowrap border-t border-line bg-panel px-3 text-[11px] text-muted tabular [&>*]:shrink-0" data-testid="statusbar">
      {isPlan && <>
        <span title="Cursor (Modellkoordinaten)">X {ui.cursor ? formatMm(ui.cursor.x, 'm') : '–'} · Y {ui.cursor ? formatMm(ui.cursor.y, 'm') : '–'}</span>
        <span className="hidden md:inline">{ui.scaleInfo}</span>
        <button className="hover:text-fg" onClick={() => ui.set({ gridVisible: !ui.gridVisible })}>Raster {ui.gridVisible ? `an (${ui.grid} mm)` : 'aus'}</button>
        <button className="hover:text-fg" onClick={() => ui.set({ snap: !ui.snap })}>Fang {ui.snap ? 'an' : 'aus'}</button>
        <button className="hover:text-fg" onClick={() => ui.set({ ortho: !ui.ortho })}>Ortho {ui.ortho ? 'an' : 'aus'}</button>
        <span>Werkzeug: {TOOL_LABEL[ui.tool] ?? ui.tool}</span>
        <span className="hidden min-w-0 truncate lg:inline">{ui.hint}</span>
      </>}
      <div className="flex-1" />
      {lastError && <button className="flex min-w-0 items-center gap-1 truncate text-danger" onClick={clearError} title="Meldung schließen"><AlertTriangle size={12} />{lastError}</button>}
      <span className="flex shrink-0 items-center gap-1" data-testid="save-state">
        {saveState === 'saving' && <><Loader2 size={12} className="animate-spin" />Speichert …</>}
        {saveState === 'saved' && <><CheckCircle2 size={12} className="text-ok" />Gespeichert {dateTime(lastSavedAt)}</>}
        {saveState === 'idle' && <>Bereit</>}
        {saveState === 'error' && <span className="text-danger">Speicherfehler</span>}
      </span>
    </footer>
  );
}

function Toasts() {
  const toasts = useUi((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-4 left-3 right-3 z-[60] flex flex-col items-end gap-2 md:bottom-10 md:left-auto md:right-4" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} role="status" className={cn('pointer-events-auto max-w-sm rounded-lg border px-3 py-2 text-sm shadow-lg', t.kind === 'error' ? 'border-danger/50 bg-panel text-danger' : t.kind === 'success' ? 'border-ok/40 bg-panel' : 'border-line bg-panel')}>{t.text}</div>
      ))}
    </div>
  );
}
