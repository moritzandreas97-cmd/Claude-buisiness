import { useState } from 'react';
import { Plus, Trash2, Download, AlertTriangle } from 'lucide-react';
import { useProject } from '../../store/projectStore';
import { useUi } from '../../store/uiStore';
import { useRun } from '../../store/useRun';
import { Badge, Button, Card, Empty, Field, Input, PageHeader, Select, Table, Td } from '../../ui/primitives';
import { CommitInput, fmtMoney, parseMoney, trimOrNull } from '../../ui/fields';
import { materialTotalCents } from '../../model/materials';
import { eur, parseEuro } from '../../lib/format';
import { exportText, toCsv } from '../../export/csv';
import type { ProjectData } from '../../db/repository';

const CATS = ['Material', 'Handwerker', 'Werkzeug/Miete', 'Entsorgung', 'Gebühren', 'Sonstiges'];

export function costSummary(data: ProjectData) {
  const mats = Object.values(data.materials);
  const plannedMaterial = mats.reduce((s, m) => s + (materialTotalCents(m) ?? 0), 0);
  const missingPrices = mats.filter((m) => m.unit_price_cents == null && m.required_qty > 0);
  const plannedTasks = Object.values(data.tasks).reduce((s, t) => s + (t.cost_cents ?? 0), 0);
  const actual = Object.values(data.expenses).reduce((s, e) => s + e.amount_cents, 0);
  const rooms = Object.values(data.rooms).map((r) => ({
    room: r,
    planned: mats.filter((m) => m.room_id === r.id).reduce((s, m) => s + (materialTotalCents(m) ?? 0), 0) + Object.values(data.tasks).filter((t) => t.room_id === r.id).reduce((s, t) => s + (t.cost_cents ?? 0), 0),
    actual: Object.values(data.expenses).filter((e) => e.room_id === r.id).reduce((s, e) => s + e.amount_cents, 0),
    missing: mats.filter((m) => m.room_id === r.id && m.unit_price_cents == null && m.required_qty > 0).length,
  }));
  return { plannedMaterial, plannedTasks, planned: plannedMaterial + plannedTasks, actual, missingPrices, rooms };
}

export function CostsPage() {
  const { data, project, updateProject } = useProject();
  const ui = useUi();
  const run = useRun();
  const s = costSummary(data);
  const budget = project!.budget_cents;
  const [n, setN] = useState({ description: '', amount: '', date: new Date().toISOString().slice(0, 10), category: 'Material', room_id: '', task_id: '' });
  const expenses = Object.values(data.expenses).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const addExpense = async () => {
    const cents = parseEuro(n.amount);
    if (!n.description.trim()) { ui.toast('Beschreibung fehlt.', 'error'); return; }
    if (cents == null || Number.isNaN(cents)) { ui.toast('Ungültiger Betrag.', 'error'); return; }
    const ok = await run('Ausgabe erfassen', (tx) => tx.insert('expenses', { project_id: project!.id, description: n.description.trim(), amount_cents: cents, date: n.date || null, category: n.category, room_id: n.room_id || null, task_id: n.task_id || null }));
    if (ok) setN({ ...n, description: '', amount: '' });
  };
  const exportCsv = async () => {
    const rows = [
      { Bereich: 'Projektbudget', Bezeichnung: project!.name, 'Geplant (€)': budget != null ? budget / 100 : '', 'Tatsächlich (€)': '', Hinweis: '' },
      { Bereich: 'Summe', Bezeichnung: 'Materialkosten geplant', 'Geplant (€)': s.plannedMaterial / 100, 'Tatsächlich (€)': '', Hinweis: s.missingPrices.length ? `${s.missingPrices.length} Positionen ohne Preis – unvollständig` : '' },
      { Bereich: 'Summe', Bezeichnung: 'Aufgabenkosten geplant', 'Geplant (€)': s.plannedTasks / 100, 'Tatsächlich (€)': '', Hinweis: '' },
      { Bereich: 'Summe', Bezeichnung: 'Ausgaben tatsächlich', 'Geplant (€)': '', 'Tatsächlich (€)': s.actual / 100, Hinweis: '' },
      ...s.rooms.map((r) => ({ Bereich: 'Raum', Bezeichnung: r.room.name, 'Geplant (€)': r.planned / 100, 'Tatsächlich (€)': r.actual / 100, Hinweis: `Budget ${r.room.budget_cents != null ? r.room.budget_cents / 100 : '–'}${r.missing ? `; ${r.missing} ohne Preis` : ''}` })),
      ...expenses.map((e) => ({ Bereich: 'Ausgabe', Bezeichnung: `${e.date ?? ''} ${e.description}`, 'Geplant (€)': '', 'Tatsächlich (€)': e.amount_cents / 100, Hinweis: [e.category, e.room_id ? data.rooms[e.room_id]?.name : ''].filter(Boolean).join(' · ') })),
    ];
    ui.toast(`Exportiert: ${await exportText(`${project!.name}-Kosten.csv`, toCsv(rows), 'text/csv')}`, 'success');
  };
  const pct = budget ? Math.min(100, Math.round((s.actual / budget) * 100)) : 0;
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Kosten & Budget" subtitle="Geplante Kosten (Material + Aufgaben) und tatsächliche Ausgaben" actions={<Button onClick={exportCsv}><Download size={14} />Kostenübersicht CSV</Button>} />
      <div className="grid gap-3 md:grid-cols-4">
        <Card><Field label="Projektbudget (€)"><CommitInput ariaLabel="Projektbudget" value={budget} parse={parseMoney} format={fmtMoney} placeholder="nicht erfasst" onCommit={(v) => updateProject({ budget_cents: v as number | null })} /></Field></Card>
        <Card><div className="text-xs uppercase tracking-wide text-muted">Geplant</div><div className="mt-1 text-2xl font-semibold tabular">{eur(s.planned)}</div><div className="text-xs text-muted">Material {eur(s.plannedMaterial)} · Aufgaben {eur(s.plannedTasks)}</div></Card>
        <Card><div className="text-xs uppercase tracking-wide text-muted">Tatsächlich ausgegeben</div><div className="mt-1 text-2xl font-semibold tabular">{eur(s.actual)}</div>{budget != null && <div className="mt-2 h-1.5 overflow-hidden rounded bg-hover"><div className={s.actual > budget ? 'h-full bg-danger' : 'h-full bg-ok'} style={{ width: `${pct}%` }} /></div>}</Card>
        <Card><div className="text-xs uppercase tracking-wide text-muted">Verbleibend (Budget − Ausgaben)</div><div className={'mt-1 text-2xl font-semibold tabular ' + (budget != null && s.actual > budget ? 'text-danger' : '')}>{budget != null ? eur(budget - s.actual) : '–'}</div></Card>
      </div>
      {s.missingPrices.length > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm text-warn"><AlertTriangle size={16} className="mt-0.5 shrink-0" /><div><b>Kostenplanung unvollständig:</b> {s.missingPrices.length} Materialposition(en) ohne Preis: {s.missingPrices.slice(0, 6).map((m) => m.name).join(', ')}{s.missingPrices.length > 6 ? ' …' : ''}. <button className="underline" onClick={() => ui.set({ module: 'materials' })}>Zu den Materialien</button></div></div>
      )}
      <h3 className="mb-2 mt-6 text-sm font-semibold">Budget pro Raum</h3>
      {s.rooms.length === 0 ? <Empty>Keine Räume.</Empty> : (
        <Table head={['Raum', 'Budget', 'Geplant', 'Tatsächlich', 'Abweichung', '']}>
          {s.rooms.map(({ room, planned, actual, missing }) => (
            <tr key={room.id}>
              <Td>{room.name}</Td>
              <Td><CommitInput ariaLabel="Raumbudget" className="h-8 w-28" value={room.budget_cents} parse={parseMoney} format={fmtMoney} placeholder="–" onCommit={(v) => run('Raumbudget', (tx) => tx.update('rooms', room.id, { budget_cents: v as number | null }))} /></Td>
              <Td className="tabular">{eur(planned)} {missing > 0 && <Badge tone="warn">{missing} ohne Preis</Badge>}</Td>
              <Td className="tabular">{eur(actual)}</Td>
              <Td className={'tabular ' + (room.budget_cents != null && actual > room.budget_cents ? 'text-danger' : '')}>{room.budget_cents != null ? eur(room.budget_cents - actual) : '–'}</Td><Td />
            </tr>
          ))}
        </Table>
      )}
      <h3 className="mb-2 mt-6 text-sm font-semibold">Tatsächliche Ausgaben</h3>
      <Card className="mb-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-7">
          <Input className="col-span-2" aria-label="Ausgabe Beschreibung" placeholder="Beschreibung (z. B. Rechnung Baumarkt)" value={n.description} onChange={(e) => setN({ ...n, description: e.target.value })} />
          <Input aria-label="Ausgabe Betrag" inputMode="decimal" placeholder="Betrag €" value={n.amount} onChange={(e) => setN({ ...n, amount: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addExpense()} />
          <Input type="date" aria-label="Datum" value={n.date} onChange={(e) => setN({ ...n, date: e.target.value })} />
          <Select aria-label="Kategorie" value={n.category} onChange={(e) => setN({ ...n, category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</Select>
          <Select aria-label="Raum" value={n.room_id} onChange={(e) => setN({ ...n, room_id: e.target.value })}><option value="">Raum –</option>{Object.values(data.rooms).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select>
          <Button variant="primary" onClick={addExpense}><Plus size={14} />Erfassen</Button>
        </div>
      </Card>
      {expenses.length === 0 ? <Empty>Noch keine Ausgaben erfasst.</Empty> : (
        <Table head={['Datum', 'Beschreibung', 'Kategorie', 'Raum', 'Betrag', '']}>
          {expenses.map((e) => (
            <tr key={e.id}>
              <Td className="whitespace-nowrap">{e.date ? new Date(e.date).toLocaleDateString('de-DE') : '–'}</Td>
              <Td><CommitInput className="h-8" value={e.description} parse={trimOrNull} format={(v) => v ?? ''} onCommit={(v) => { if (!v) throw new Error('Beschreibung fehlt.'); return run('Ausgabe', (tx) => tx.update('expenses', e.id, { description: v })); }} /></Td>
              <Td>{e.category}</Td><Td>{e.room_id ? data.rooms[e.room_id]?.name : '–'}</Td>
              <Td><CommitInput className="h-8 w-28" value={e.amount_cents} parse={parseMoney} format={fmtMoney} onCommit={(v) => { if (v == null) throw new Error('Betrag fehlt.'); return run('Ausgabe', (tx) => tx.update('expenses', e.id, { amount_cents: v as number })); }} /></Td>
              <Td><Button size="sm" variant="ghost" aria-label="Ausgabe löschen" onClick={() => run('Ausgabe löschen', (tx) => tx.remove('expenses', e.id))}><Trash2 size={13} /></Button></Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
