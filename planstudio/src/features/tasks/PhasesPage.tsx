import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useProject } from '../../store/projectStore';
import { useRun } from '../../store/useRun';
import { Badge, Button, Card, Empty, Field, PageHeader, Select } from '../../ui/primitives';
import { CommitInput, trimOrNull } from '../../ui/fields';
import { TASK_STATUS, labelOf } from '../../model/catalog';
import { eur } from '../../lib/format';

const PHASE_STATUS = [{ v: 'geplant', label: 'Geplant' }, { v: 'aktiv', label: 'Aktiv' }, { v: 'pausiert', label: 'Pausiert' }, { v: 'abgeschlossen', label: 'Abgeschlossen' }];

export function PhasesPage() {
  const { data, project } = useProject();
  const run = useRun();
  const phases = Object.values(data.phases).sort((a, b) => a.sort_order - b.sort_order);
  const swap = (i: number, j: number) => run('Reihenfolge', (tx) => { tx.update('phases', phases[i].id, { sort_order: phases[j].sort_order }); tx.update('phases', phases[j].id, { sort_order: phases[i].sort_order }); });
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Bauabschnitte" subtitle="Abschnitte gliedern Aufgaben zeitlich (z. B. Rückbau, Rohinstallation, Ausbau)."
        actions={<Button variant="primary" onClick={() => run('Bauabschnitt anlegen', (tx) => tx.insert('phases', { project_id: project!.id, name: `Bauabschnitt ${phases.length + 1}`, sort_order: (phases[phases.length - 1]?.sort_order ?? 0) + 1 }))}><Plus size={15} />Bauabschnitt</Button>} />
      {phases.length === 0 && <Empty>Noch keine Bauabschnitte. Beispiel: 1 Rückbau · 2 Rohinstallation Elektro/Sanitär · 3 Trockenbau · 4 Oberflächen.</Empty>}
      <div className="flex flex-col gap-3">
        {phases.map((p, i) => {
          const tasks = Object.values(data.tasks).filter((t) => t.phase_id === p.id);
          const done = tasks.filter((t) => t.status === 'erledigt').length;
          const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
          const cost = tasks.reduce((s, t) => s + (t.cost_cents ?? 0), 0);
          const upd = (patch: Record<string, unknown>) => run('Bauabschnitt', (tx) => tx.update('phases', p.id, patch));
          return (
            <Card key={p.id}>
              <div className="flex flex-wrap items-end gap-3">
                <Field label={`Abschnitt ${i + 1}`} className="min-w-56 flex-1"><CommitInput ariaLabel="Name des Bauabschnitts" value={p.name} parse={trimOrNull} format={(v) => v ?? ''} onCommit={(v) => { if (!v) throw new Error('Name darf nicht leer sein.'); return upd({ name: v }); }} /></Field>
                <Field label="Status" className="w-40"><Select value={p.status} onChange={(e) => upd({ status: e.target.value })}>{PHASE_STATUS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}</Select></Field>
                <Field label="Beginn" className="w-40"><input type="date" className="h-9 rounded-md border border-line bg-panel px-2 text-sm" value={p.start_date ?? ''} onChange={(e) => upd({ start_date: e.target.value || null })} /></Field>
                <Field label="Ende" className="w-40"><input type="date" className="h-9 rounded-md border border-line bg-panel px-2 text-sm" value={p.end_date ?? ''} onChange={(e) => upd({ end_date: e.target.value || null })} /></Field>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" aria-label="nach oben" disabled={i === 0} onClick={() => swap(i, i - 1)}><ArrowUp size={14} /></Button>
                  <Button size="icon" variant="ghost" aria-label="nach unten" disabled={i === phases.length - 1} onClick={() => swap(i, i + 1)}><ArrowDown size={14} /></Button>
                  <Button size="icon" variant="ghost" aria-label="Bauabschnitt löschen" onClick={() => run('Bauabschnitt löschen', (tx) => tx.remove('phases', p.id))}><Trash2 size={14} /></Button>
                </div>
              </div>
              <div className="mt-3"><CommitInput ariaLabel="Beschreibung" value={p.description} placeholder="Beschreibung" parse={trimOrNull} format={(v) => v ?? ''} onCommit={(v) => upd({ description: v })} /></div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded bg-hover"><div className="h-full bg-ok" style={{ width: `${pct}%` }} /></div>
                <span className="text-xs text-muted tabular">{done}/{tasks.length} Aufgaben · {pct}% · {eur(cost)}</span>
              </div>
              {tasks.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{tasks.map((t) => <Badge key={t.id} tone={t.status === 'erledigt' ? 'ok' : t.status === 'in_arbeit' ? 'accent' : 'default'}>{t.title} · {labelOf(TASK_STATUS, t.status)}</Badge>)}</div>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
