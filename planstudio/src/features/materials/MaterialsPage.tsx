import { useMemo, useState } from 'react';
import { Plus, Download, Trash2, RefreshCw, ShoppingCart, AlertTriangle } from 'lucide-react';
import { useProject } from '../../store/projectStore';
import { useUi } from '../../store/uiStore';
import { useRun } from '../../store/useRun';
import { Badge, Button, Empty, Input, PageHeader, Select, Table, Td } from '../../ui/primitives';
import { CommitInput, fmtMoney, parseMoney, parseNumber, trimOrNull } from '../../ui/fields';
import { MATERIAL_STATUS, UNITS, labelOf } from '../../model/catalog';
import { computeAutoDemand, materialTotalCents, possibleDuplicates, syncAutoMaterials, toOrder } from '../../model/materials';
import type { Material } from '../../model/types';
import { eur, num } from '../../lib/format';
import { exportText, toCsv } from '../../export/csv';

export function materialRows(data: ReturnType<typeof useProject.getState>['data'], list: Material[]) {
  return list.map((m) => ({
    Bezeichnung: m.name, Kategorie: m.category ?? '', Einheit: m.unit, Artikelnummer: m.article_no ?? '',
    Bedarf: m.required_qty, Bestand: m.stock_qty, 'Zu beschaffen': toOrder(m), 'Einzelpreis (€)': m.unit_price_cents != null ? m.unit_price_cents / 100 : 'PREIS FEHLT',
    'Gesamt (€)': materialTotalCents(m) != null ? materialTotalCents(m)! / 100 : 'PREIS FEHLT', Status: labelOf(MATERIAL_STATUS, m.status),
    Raum: m.room_id ? data.rooms[m.room_id]?.name ?? '' : '', Aufgabe: m.task_id ? data.tasks[m.task_id]?.title ?? '' : '',
    Quelle: m.source === 'auto' ? 'automatisch aus Planung' : 'manuell', Hinweis: m.notes ?? '', ID: m.id,
  }));
}

export function MaterialsPage() {
  const { data, project } = useProject();
  const ui = useUi();
  const run = useRun();
  const [f, setF] = useState({ q: '', category: '', status: '', room: '', shopping: false });
  const all = Object.values(data.materials);
  const dupes = useMemo(() => possibleDuplicates(all), [data.materials]); // eslint-disable-line react-hooks/exhaustive-deps
  const categories = [...new Set(all.map((m) => m.category).filter(Boolean))].sort() as string[];
  const list = all.filter((m) => (!f.q || m.name.toLowerCase().includes(f.q.toLowerCase()) || (m.article_no ?? '').includes(f.q)) && (!f.category || m.category === f.category) && (!f.status || m.status === f.status) && (!f.room || m.room_id === f.room) && (!f.shopping || (toOrder(m) > 0 && m.status !== 'verbaut' && m.status !== 'bestellt')))
    .sort((a, b) => (a.category ?? '').localeCompare(b.category ?? '', 'de') || a.name.localeCompare(b.name, 'de'));
  const total = list.reduce((s, m) => s + (materialTotalCents(m) ?? 0), 0);
  const missing = list.filter((m) => m.unit_price_cents == null && m.required_qty > 0).length;

  const sync = async () => {
    const demand = computeAutoDemand(data);
    const r = await run('Bedarf aus Planung übernehmen', (tx) => syncAutoMaterials(tx, project!.id, demand));
    if (r) ui.toast(`Materialbedarf übernommen: ${r.created} neu, ${r.updated} aktualisiert${r.zeroed ? `, ${r.zeroed} ohne Bedarf` : ''}.`, 'success');
  };
  const add = () => run('Material anlegen', (tx) => tx.insert('materials', { project_id: project!.id, name: 'Neues Material', unit: 'Stk', required_qty: 1, source: 'manual' }));
  const exportList = async (shopping: boolean) => {
    const src = shopping ? all.filter((m) => toOrder(m) > 0 && m.status !== 'verbaut' && m.status !== 'bestellt') : list;
    const name = shopping ? 'Einkaufsliste' : 'Materialliste';
    ui.toast(`Exportiert: ${await exportText(`${project!.name}-${name}.csv`, toCsv(materialRows(data, src)), 'text/csv')}`, 'success');
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Materialien" subtitle={`${all.length} Positionen · Summe Auswahl ${eur(total)}${missing ? ` (unvollständig, ${missing} ohne Preis)` : ''}`}
        actions={<>
          <Button onClick={sync} title="Erzeugt/aktualisiert Positionen aus platzierten Elektro-/Sanitärobjekten und gezeichneten Leitungen"><RefreshCw size={14} />Bedarf aus Planung</Button>
          <Button onClick={() => exportList(true)}><ShoppingCart size={14} />Einkaufsliste CSV</Button>
          <Button onClick={() => exportList(false)}><Download size={14} />Materialliste CSV</Button>
          <Button variant="primary" onClick={add}><Plus size={15} />Material</Button>
        </>} />
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-6">
        <Input className="col-span-2" placeholder="Suchen (Name, Artikelnr.)" aria-label="Material suchen" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        <Select aria-label="Kategorie" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}><option value="">Alle Kategorien</option>{categories.map((c) => <option key={c}>{c}</option>)}</Select>
        <Select aria-label="Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">Alle Status</option>{MATERIAL_STATUS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}</Select>
        <Select aria-label="Raum" value={f.room} onChange={(e) => setF({ ...f, room: e.target.value })}><option value="">Alle Räume</option>{Object.values(data.rooms).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.shopping} onChange={(e) => setF({ ...f, shopping: e.target.checked })} />Nur Einkaufsliste</label>
      </div>
      {dupes.size > 0 && <div className="mb-3 flex items-center gap-2 rounded-lg border border-warn/40 bg-warn/10 p-2.5 text-xs text-warn"><AlertTriangle size={14} />{dupes.size} manuelle Position(en) haben denselben Namen wie automatisch erzeugter Bedarf – mögliche Doppelzählung prüfen (markiert).</div>}
      {all.length === 0 ? <Empty>Noch keine Materialien. Manuell anlegen oder „Bedarf aus Planung“ verwenden.</Empty> : (
        <Table head={['Bezeichnung', 'Kategorie', 'Einheit', 'Art.-Nr.', 'Bedarf', 'Bestand', 'Zu beschaffen', 'Einzelpreis €', 'Gesamt', 'Status', 'Raum', 'Aufgabe', '']}>
          {list.map((m) => {
            const upd = (patch: Partial<Material>) => run('Material ändern', (tx) => tx.update('materials', m.id, patch));
            const nonNeg = (s: string) => { const v = parseNumber(s); return typeof v === 'number' && v < 0 ? (parseNumber('x') as never) : v; };
            return (
              <tr key={m.id} className={dupes.has(m.id) ? 'bg-warn/5' : ''}>
                <Td><div className="flex items-center gap-1.5"><CommitInput ariaLabel="Materialbezeichnung" className="h-8 min-w-48" value={m.name} parse={trimOrNull} format={(v) => v ?? ''} onCommit={(v) => { if (!v) throw new Error('Bezeichnung darf nicht leer sein.'); return upd({ name: v }); }} />{m.source === 'auto' && <Badge tone="accent">auto</Badge>}{dupes.has(m.id) && <Badge tone="warn">doppelt?</Badge>}</div></Td>
                <Td><CommitInput className="h-8 w-36" value={m.category} parse={trimOrNull} format={(v) => v ?? ''} onCommit={(v) => upd({ category: v })} /></Td>
                <Td><Select className="h-8 w-20" value={m.unit} onChange={(e) => upd({ unit: e.target.value })}>{[...new Set([...UNITS, m.unit])].map((u) => <option key={u}>{u}</option>)}</Select></Td>
                <Td><CommitInput className="h-8 w-24" value={m.article_no} parse={trimOrNull} format={(v) => v ?? ''} onCommit={(v) => upd({ article_no: v })} /></Td>
                <Td>{m.source === 'auto' ? <span className="tabular" title="Aus Planung – Änderung über die Planung bzw. „Bedarf aus Planung“">{num(m.required_qty)}</span> : <CommitInput ariaLabel="Bedarf" className="h-8 w-20" value={m.required_qty} parse={nonNeg} onCommit={(v) => upd({ required_qty: v as number })} />}</Td>
                <Td><CommitInput ariaLabel="Bestand" className="h-8 w-20" value={m.stock_qty} parse={nonNeg} onCommit={(v) => upd({ stock_qty: v as number })} /></Td>
                <Td className="tabular">{num(toOrder(m))}</Td>
                <Td><CommitInput ariaLabel="Einzelpreis" className={'h-8 w-24 ' + (m.unit_price_cents == null ? 'border-warn' : '')} value={m.unit_price_cents} parse={parseMoney} format={fmtMoney} placeholder="fehlt" onCommit={(v) => upd({ unit_price_cents: v as number | null })} /></Td>
                <Td className="tabular whitespace-nowrap">{materialTotalCents(m) == null ? <Badge tone="warn">Preis fehlt</Badge> : eur(materialTotalCents(m))}</Td>
                <Td><Select className="h-8 w-28" value={m.status} onChange={(e) => upd({ status: e.target.value as Material['status'] })}>{MATERIAL_STATUS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}</Select></Td>
                <Td><Select className="h-8 w-28" value={m.room_id ?? ''} onChange={(e) => upd({ room_id: e.target.value || null })}><option value="">–</option>{Object.values(data.rooms).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></Td>
                <Td><Select className="h-8 w-32" value={m.task_id ?? ''} onChange={(e) => upd({ task_id: e.target.value || null })}><option value="">–</option>{Object.values(data.tasks).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</Select></Td>
                <Td><Button size="sm" variant="ghost" aria-label="Material löschen" onClick={() => run('Material löschen', (tx) => tx.remove('materials', m.id))}><Trash2 size={13} /></Button></Td>
              </tr>
            );
          })}
        </Table>
      )}
      <p className="mt-3 text-xs text-muted">Automatischer Bedarf: 1 Position je platziertem Objekt (Mehrfachsteckdose = Anzahl Einsätze) und Summe der tatsächlich gezeichneten Leitungswege – ohne Verschnitt, Zuschläge oder Kleinmaterial. Preise werden nie geschätzt; fehlende Preise sind markiert.</p>
    </div>
  );
}
