import { useState } from 'react';
import { FileDown, FileImage, Package, ListChecks, Euro, Archive, Upload, Database, Zap, Info } from 'lucide-react';
import { useProject } from '../../store/projectStore';
import { useUi } from '../../store/uiStore';
import { FilePickButton } from '../../ui/FilePickButton';
import { Button, Card, Field, PageHeader, Select } from '../../ui/primitives';
import { buildPlanSheet, svgToPdf, type PlanExportOpts } from '../../export/planExport';
import { exportText, safeName, toCsv } from '../../export/csv';
import { createBackup, restoreBackup } from '../../export/backup';
import { materialRows } from '../materials/MaterialsPage';
import { PRIORITIES, TASK_STATUS, labelOf } from '../../model/catalog';

/** Exportiert den Plan eines Geschosses. Liefert den Speicherort. */
export async function exportFloorPlan(floorId: string, format: 'pdf' | 'svg', opts: PlanExportOpts) {
  const { data, project, platform } = useProject.getState();
  const sheet = buildPlanSheet(data, floorId, project!.name, opts);
  const base = safeName(`${project!.name} - ${sheet.title.replace(' – ', ' - ')} - M1-${sheet.denominator}`);
  if (format === 'svg') return platform!.saveExport(`${base}.svg`, sheet.svg, 'image/svg+xml');
  return platform!.saveExport(`${base}.pdf`, await svgToPdf(sheet), 'application/pdf');
}

export function ReportsPage() {
  const { data, project, platform } = useProject();
  const ui = useUi();
  const floors = Object.values(data.floors).sort((a, b) => a.sort_order - b.sort_order);
  const [floorId, setFloorId] = useState(ui.floorId ?? floors[0]?.id ?? '');
  const [only, setOnly] = useState<'' | NonNullable<PlanExportOpts['only']>>('');
  const [paper, setPaper] = useState<'auto' | 'A4' | 'A3'>('auto');
  const [busy, setBusy] = useState(false);
  const guard = async (fn: () => Promise<string>) => {
    setBusy(true);
    try { ui.toast(`Gespeichert: ${await fn()}`, 'success'); } catch (e) { ui.toast(e instanceof Error ? e.message : String(e), 'error'); } finally { setBusy(false); }
  };
  let preview: { denominator: number; paper: string; fits: boolean } | null = null;
  try { if (floorId) { const s = buildPlanSheet(data, floorId, project!.name, { only: only || undefined, paper }); preview = s; } } catch { preview = null; }

  const tasksCsv = () => toCsv(Object.values(data.tasks).map((t) => ({ Titel: t.title, Status: labelOf(TASK_STATUS, t.status), Priorität: labelOf(PRIORITIES, t.priority), Gewerk: t.trade ?? '', Raum: t.room_id ? data.rooms[t.room_id]?.name ?? '' : '', Bauabschnitt: t.phase_id ? data.phases[t.phase_id]?.name ?? '' : '', 'Kosten (€)': t.cost_cents != null ? t.cost_cents / 100 : '', Fällig: t.due_date ?? '', Beschreibung: t.description ?? '', ID: t.id })));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Berichte & Export" subtitle="Pläne, Listen und Datensicherung" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Planexport (PDF / SVG)" className="md:col-span-2">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Geschoss"><Select aria-label="Exportgeschoss" value={floorId} onChange={(e) => setFloorId(e.target.value)}>{floors.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select></Field>
            <Field label="Inhalt"><Select aria-label="Planinhalt" value={only} onChange={(e) => setOnly(e.target.value as typeof only)}><option value="">Alle Ebenen</option><option value="architecture">Grundriss (bemaßt)</option><option value="electrical">Elektroinstallationsplan</option><option value="sanitary">Sanitärplan</option><option value="interior">Einrichtungsplan</option></Select></Field>
            <Field label="Papier"><Select value={paper} onChange={(e) => setPaper(e.target.value as typeof paper)}><option value="auto">Automatisch (A4/A3)</option><option value="A4">A4 quer</option><option value="A3">A3 quer</option></Select></Field>
          </div>
          <div className="mt-3 text-sm">{preview ? <>Maßstab <b>1:{preview.denominator}</b> auf <b>{preview.paper}</b>{!preview.fits && <span className="text-danger"> – passt nicht vollständig!</span>}</> : <span className="text-muted">Geschoss enthält noch keine Planinhalte.</span>}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" disabled={busy || !preview} onClick={() => guard(() => exportFloorPlan(floorId, 'pdf', { only: only || undefined, paper }))}><FileDown size={15} />PDF exportieren</Button>
            <Button disabled={busy || !preview} onClick={() => guard(() => exportFloorPlan(floorId, 'svg', { only: only || undefined, paper }))}><FileImage size={15} />SVG exportieren</Button>
          </div>
          <p className="mt-3 flex gap-1.5 text-xs text-muted"><Info size={14} className="shrink-0" />Der Plan wird in Papier-Millimetern mit festem Maßstab, Maßstabsleiste und Wandmaßen (cm) erzeugt. Maßstabsgetreu nur beim Druck in Originalgröße (100 %).</p>
        </Card>
        <Card title="Listen (CSV, Excel-kompatibel)">
          <div className="flex flex-col gap-2">
            <Button onClick={() => guard(() => exportText(`${project!.name}-Materialliste.csv`, toCsv(materialRows(data, Object.values(data.materials))), 'text/csv'))}><Package size={15} />Materialliste</Button>
            <Button onClick={() => guard(() => exportText(`${project!.name}-Aufgabenliste.csv`, tasksCsv(), 'text/csv'))}><ListChecks size={15} />Aufgabenliste</Button>
            <Button onClick={() => ui.set({ module: 'costs' })}><Euro size={15} />Kostenübersicht (im Modul Kosten)</Button>
            <Button onClick={() => ui.set({ module: 'electrical' })}><Zap size={15} />Betriebsmittelliste (im Modul Elektro)</Button>
          </div>
        </Card>
        <Card title="Datensicherung">
          <div className="flex flex-col gap-2">
            <Button variant="primary" onClick={() => guard(async () => { const b = await createBackup(platform!, project!.id); const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'); return exportText(`${project!.name}-Backup-${stamp}.lapb.json`, JSON.stringify(b), 'application/json'); })}><Archive size={15} />Projektbackup erstellen</Button>
            <FilePickButton accept=".json,.lapb,application/json" testId="restore-input" onFiles={async ([f]) => { if (!f) return; await guard(async () => { const r = await restoreBackup(platform!, JSON.parse(await f.text())); await useProject.getState().refreshProjects(); return r.asCopy ? 'als Kopie wiederhergestellt (Projektauswahl)' : 'wiederhergestellt (Projektauswahl)'; }); }}><Upload size={15} />Backup wiederherstellen</FilePickButton>
            {platform?.backupDatabase && <Button onClick={() => guard(() => platform.backupDatabase!())}><Database size={15} />Komplette Datenbank sichern</Button>}
            <p className="text-xs text-muted">Das Projektbackup enthält alle Planungsdaten und importierten Dateien. Wiederherstellen überschreibt nie vorhandene Projekte – bei gleicher Projekt-ID entsteht eine Kopie.</p>
            <p className="text-xs text-muted">Exportziel: {platform?.paths.export_dir}{platform?.paths.backup_dir && platform.paths.backup_dir !== platform.paths.export_dir ? ` · DB-Sicherungen: ${platform.paths.backup_dir}` : ''}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
