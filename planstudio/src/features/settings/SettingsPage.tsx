import { useProject } from '../../store/projectStore';
import { useUi } from '../../store/uiStore';
import { Button, Card, Field, PageHeader, Select } from '../../ui/primitives';
import { MIGRATIONS } from '../../db/migrations';

export function SettingsPage() {
  const ui = useUi();
  const { platform, save } = useProject();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Einstellungen" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Darstellung">
          <div className="flex flex-col gap-3">
            <Field label="Farbschema"><Select value={ui.theme} onChange={(e) => ui.set({ theme: e.target.value as 'dark' | 'light' })}><option value="dark">Dunkel</option><option value="light">Hell</option></Select></Field>
            <Field label="Standard-Raster"><Select value={ui.grid} onChange={(e) => ui.set({ grid: Number(e.target.value) })}>{[5, 10, 25, 50, 100, 250, 500].map((g) => <option key={g} value={g}>{g} mm</option>)}</Select></Field>
            <Field label="Standard-Wandstärke (mm)"><input className="h-9 rounded-md border border-line bg-panel px-2" type="number" min={20} value={ui.wallThickness} onChange={(e) => ui.set({ wallThickness: Math.max(20, Number(e.target.value)) })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ui.navCollapsed} onChange={() => ui.set({ navCollapsed: !ui.navCollapsed })} />Navigation eingeklappt</label>
          </div>
        </Card>
        <Card title="Speicherorte">
          <dl className="grid gap-2 text-sm">
            <div><dt className="text-xs text-muted">Plattform</dt><dd>{platform?.paths.platform}</dd></div>
            <div><dt className="text-xs text-muted">Datenbank</dt><dd className="break-all font-mono text-xs">{platform?.paths.db_path}</dd></div>
            <div><dt className="text-xs text-muted">Projektdateien (Fotos/Dokumente)</dt><dd className="break-all font-mono text-xs">{platform?.paths.files_dir}</dd></div>
            <div><dt className="text-xs text-muted">Exporte</dt><dd className="break-all font-mono text-xs">{platform?.paths.export_dir}</dd></div>
            <div><dt className="text-xs text-muted">Datenbank-Sicherungen</dt><dd className="break-all font-mono text-xs">{platform?.paths.backup_dir}</dd></div>
            <div><dt className="text-xs text-muted">Schema-Version</dt><dd>{MIGRATIONS[MIGRATIONS.length - 1].version}</dd></div>
          </dl>
          <Button className="mt-3" onClick={() => save().then(() => ui.toast('Datenbank auf Datenträger geschrieben.', 'success'))}>Jetzt speichern</Button>
        </Card>
        <Card title="Über / Hinweise" className="md:col-span-2">
          <div className="space-y-2 text-sm text-muted">
            <p><b className="text-fg">Lebenswerk Adorf PlanStudio 0.1 (MVP)</b> – lokale, offline nutzbare Planungssoftware. Keine Cloud, keine Konten.</p>
            <p>Alle Änderungen werden sofort transaktional in SQLite gespeichert. „Speichern“ erzwingt zusätzlich das Schreiben auf den Datenträger.</p>
            <p>Elektro- und Sanitärfunktionen dienen der Planung und Dokumentation. Es erfolgt keine Bemessung oder Normprüfung; Sicherheit und Normkonformität sind durch Fachbetriebe zu prüfen.</p>
            <p>Tastenkürzel: Strg+Z/Y Rückgängig/Wiederholen · Strg+S Speichern · Entf Löschen · Strg+D Kopieren · R Drehen · Esc Abbrechen · V/H/W/T/F/D/M/S/L Werkzeuge.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
