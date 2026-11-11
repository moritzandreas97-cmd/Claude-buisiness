import { useState } from 'react';
import { FolderOpen, Plus, Trash2, Upload, Building2, PencilRuler, ListChecks, Package, Euro, Zap, Droplets, AlertTriangle } from 'lucide-react';
import { useProject } from '../../store/projectStore';
import { useUi } from '../../store/uiStore';
import { Badge, Button, Card, Dialog, Field, Input, PageHeader, Textarea } from '../../ui/primitives';
import { CommitInput, fmtMoney, parseMoney, TextField } from '../../ui/fields';
import { dateTime, eur, num } from '../../lib/format';
import { restoreBackup } from '../../export/backup';
import { FilePickButton } from '../../ui/FilePickButton';
import { materialTotalCents } from '../../model/materials';

/** Projektauswahl, wenn kein Projekt geöffnet ist. */
export function ProjectGate() {
  const { projects, createProject, openProject, deleteProject, platform } = useProject();
  const toast = useUi((s) => s.toast);
  const [name, setName] = useState(projects.length ? '' : 'Lebenswerk Adorf');
  const [desc, setDesc] = useState('');
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const create = async () => {
    try { const p = await createProject(name, desc); await openProject(p.id); useUi.getState().set({ module: 'dashboard' }); }
    catch (e) { toast(e instanceof Error ? e.message : String(e), 'error'); }
  };
  const restore = async ([f]: File[]) => {
    if (!f) return;
    try {
      const res = await restoreBackup(platform!, JSON.parse(await f.text()));
      await useProject.getState().refreshProjects();
      toast(res.asCopy ? 'Sicherung als Kopie wiederhergestellt.' : 'Sicherung wiederhergestellt.', 'success');
    } catch (e) { toast(`Wiederherstellung fehlgeschlagen: ${e instanceof Error ? e.message : e}`, 'error'); }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-sm font-bold text-accent-fg">LA</div>
          <div><h1 className="text-2xl font-semibold tracking-tight">Lebenswerk Adorf PlanStudio</h1><p className="text-sm text-muted">Gebäude-, Installations- und Bauplanung – vollständig offline</p></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Neues Projekt">
            <div className="flex flex-col gap-3">
              <Field label="Projektname"><Input aria-label="Projektname" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Lebenswerk Adorf" onKeyDown={(e) => e.key === 'Enter' && create()} /></Field>
              <Field label="Beschreibung (optional)"><Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
              <Button variant="primary" onClick={create} disabled={!name.trim()}><Plus size={16} />Projekt anlegen</Button>
              <p className="text-xs text-muted">Legt automatisch ein Gebäude „Hauptgebäude“ mit Geschoss „Erdgeschoss“ an.</p>
            </div>
          </Card>
          <Card title={`Vorhandene Projekte (${projects.length})`} actions={<FilePickButton size="sm" accept=".json,.lapb,application/json" testId="restore-input" onFiles={restore}><Upload size={14} />Sicherung laden</FilePickButton>}>
            {projects.length === 0 && <p className="text-sm text-muted">Noch keine Projekte.</p>}
            <ul className="flex flex-col gap-1.5">
              {projects.map((p) => (
                <li key={p.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
                  <div className="min-w-0 flex-1"><div className="truncate font-medium">{p.name}</div><div className="text-xs text-muted">geändert {dateTime(p.updated_at)}</div></div>
                  <Button size="sm" variant="primary" onClick={() => openProject(p.id)}><FolderOpen size={14} />Öffnen</Button>
                  <Button size="icon" variant="ghost" aria-label="Projekt löschen" onClick={() => setConfirmDel(p.id)}><Trash2 size={15} /></Button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <p className="mt-6 text-xs text-muted">Datenbank: {platform?.paths.db_path}</p>
      </div>
      <Dialog open={!!confirmDel} title="Projekt endgültig löschen?" onClose={() => setConfirmDel(null)}
        footer={<><Button onClick={() => setConfirmDel(null)}>Abbrechen</Button><Button variant="danger" onClick={async () => { await deleteProject(confirmDel!); setConfirmDel(null); toast('Projekt gelöscht.'); }}>Endgültig löschen</Button></>}>
        <p className="text-sm">„{projects.find((p) => p.id === confirmDel)?.name}“ und alle zugehörigen Pläne, Aufgaben, Materialien und Dokumenteinträge werden gelöscht. Dies kann nicht rückgängig gemacht werden. Erstellen Sie vorher eine Sicherung unter „Berichte“.</p>
      </Dialog>
    </div>
  );
}

export function Dashboard() {
  const { project, data, updateProject, closeProject, undoStack } = useProject();
  const ui = useUi();
  const rooms = Object.values(data.rooms);
  const tasks = Object.values(data.tasks);
  const mats = Object.values(data.materials);
  const area = rooms.reduce((s, r) => s + (r.area_m2 ?? 0), 0);
  const open = tasks.filter((t) => t.status !== 'erledigt').length;
  const matCost = mats.reduce((s, m) => s + (materialTotalCents(m) ?? 0), 0);
  const missingPrices = mats.filter((m) => m.unit_price_cents == null && m.required_qty > 0).length;
  const spent = Object.values(data.expenses).reduce((s, e) => s + e.amount_cents, 0);
  const el = Object.values(data.plan_objects).filter((o) => o.discipline === 'electrical').length;
  const san = Object.values(data.plan_objects).filter((o) => o.discipline === 'sanitary').length;
  const walls = Object.values(data.components).filter((c) => c.type === 'wall').length;
  const go = (m: Parameters<typeof ui.set>[0]['module']) => ui.set({ module: m });
  const kpi = (label: string, value: string, icon: React.ReactNode, m: Parameters<typeof go>[0], sub?: string) => (
    <button onClick={() => go(m)} className="rounded-xl border border-line bg-panel p-4 text-left transition hover:border-accent/60">
      <div className="flex items-center justify-between text-muted"><span className="text-xs font-medium uppercase tracking-wide">{label}</span>{icon}</div>
      <div className="mt-2 text-2xl font-semibold tabular">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </button>
  );
  const budget = project!.budget_cents;
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={project!.name} subtitle={project!.description ?? 'Projektübersicht'} actions={<Button onClick={closeProject}>Projekt wechseln</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpi('Räume', String(rooms.length), <Building2 size={16} />, 'building', `${num(area)} m² Nutzfläche`)}
        {kpi('Grundriss', `${walls} Wände`, <PencilRuler size={16} />, 'plan', `${Object.values(data.floors).length} Geschoss(e)`)}
        {kpi('Elektro', `${el} Objekte`, <Zap size={16} />, 'electrical', `${Object.values(data.circuits).length} Stromkreise`)}
        {kpi('Sanitär', `${san} Objekte`, <Droplets size={16} />, 'sanitary', `${Object.values(data.lines).filter((l) => l.discipline === 'sanitary').length} Leitungen`)}
        {kpi('Aufgaben offen', String(open), <ListChecks size={16} />, 'tasks', `${tasks.length - open} erledigt`)}
        {kpi('Materialien', String(mats.length), <Package size={16} />, 'materials', missingPrices ? `${missingPrices} ohne Preis` : 'alle Preise erfasst')}
        {kpi('Materialkosten (geplant)', eur(matCost), <Euro size={16} />, 'costs', missingPrices ? 'unvollständig – Preise fehlen' : undefined)}
        {kpi('Ausgaben (tatsächlich)', eur(spent), <Euro size={16} />, 'costs', budget != null ? `Budget ${eur(budget)}` : 'kein Budget erfasst')}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Projektdaten" className="lg:col-span-2">
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Projektname" value={project!.name} onCommit={(v) => updateProject({ name: v ?? '' })} />
            <Field label="Gesamtbudget (€)"><CommitInput value={budget} parse={parseMoney} format={fmtMoney} placeholder="z. B. 85000" onCommit={(v) => updateProject({ budget_cents: v as number | null })} /></Field>
            <div className="md:col-span-2"><TextField label="Beschreibung" multiline value={project!.description} onCommit={(v) => updateProject({ description: v })} /></div>
            <div className="text-xs text-muted">Erstellt {dateTime(project!.created_at)} · Geändert {dateTime(project!.updated_at)}</div>
            <div className="text-xs text-muted">Projekt-ID <span className="font-mono">{project!.id}</span></div>
          </div>
        </Card>
        <Card title="Letzte Änderungen (Sitzung)">
          {undoStack.length === 0 ? <p className="text-sm text-muted">Noch keine Änderungen in dieser Sitzung.</p> : (
            <ul className="flex flex-col gap-1 text-sm">{[...undoStack].reverse().slice(0, 8).map((u, i) => <li key={i} className="flex justify-between gap-2"><span className="truncate">{u.label}</span><span className="shrink-0 text-xs text-muted">{dateTime(u.at)}</span></li>)}</ul>
          )}
        </Card>
      </div>
      {budget != null && spent > budget && <div className="mt-4 flex items-center gap-2 rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm text-warn"><AlertTriangle size={16} />Tatsächliche Ausgaben überschreiten das Budget um {eur(spent - budget)}.</div>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone="accent">Offline</Badge><Badge>Alle Änderungen werden sofort gespeichert</Badge>
      </div>
    </div>
  );
}
