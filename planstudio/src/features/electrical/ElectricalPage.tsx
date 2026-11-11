import { useState } from 'react';
import { Plus, Trash2, AlertTriangle, Download } from 'lucide-react';
import { useProject } from '../../store/projectStore';
import { useUi } from '../../store/uiStore';
import { useRun } from '../../store/useRun';
import { PlanWorkspace } from '../plan/PlanWorkspace';
import { SchematicEditor } from '../schematic/SchematicEditor';
import { Badge, Button, Empty, PageHeader, Select, Table, Tabs, Td } from '../../ui/primitives';
import { CommitInput, trimOrNull } from '../../ui/fields';
import { CABLE_TYPES, OBJECT_STATUS, labelOf, symbolDef } from '../../model/catalog';
import { formatMm } from '../../model/geometry';
import { toCsv, exportText } from '../../export/csv';

type Tab = 'plan' | 'circuits' | 'schematic' | 'list';

export function ElectricalPage() {
  const [tab, setTab] = useState<Tab>('plan');
  const tabs = <Tabs value={tab} onChange={setTab} items={[{ v: 'plan', label: 'Installationsplan' }, { v: 'circuits', label: 'Stromkreise' }, { v: 'schematic', label: 'Stromlaufplan' }, { v: 'list', label: 'Betriebsmittelliste' }]} />;
  return (
    <div className="flex h-full flex-col">
      {tab === 'plan' ? <PlanWorkspace fixedMode="electrical" header={tabs} /> : (
        <>
          <div className="shrink-0 border-b border-line bg-panel px-2 py-1.5">{tabs}</div>
          <div className="min-h-0 flex-1 overflow-auto">
            {tab === 'circuits' && <div className="p-4 md:p-6"><Circuits /></div>}
            {tab === 'schematic' && <SchematicEditor />}
            {tab === 'list' && <div className="p-4 md:p-6"><DeviceList /></div>}
          </div>
        </>
      )}
    </div>
  );
}

export function SafetyNote() {
  return (
    <div className="mb-4 flex gap-2 rounded-lg border border-warn/40 bg-warn/10 p-3 text-xs text-warn">
      <AlertTriangle size={15} className="shrink-0" />
      <span>Angaben zu Schutzorganen, Leitungsquerschnitten und FI/RCD werden nur dokumentiert. PlanStudio führt <b>keine</b> Bemessung, Selektivitäts- oder Normprüfung (z. B. DIN VDE 0100) durch. Planung und Ausführung sind durch eine Elektrofachkraft zu prüfen.</span>
    </div>
  );
}

function Circuits() {
  const { data, project } = useProject();
  const run = useRun();
  const circuits = Object.values(data.circuits).sort((a, b) => a.designation.localeCompare(b.designation, 'de', { numeric: true }));
  const next = () => { let i = 1; const used = new Set(circuits.map((c) => c.designation)); while (used.has(`-F${i}`)) i++; return `-F${i}`; };
  const distributions = Object.values(data.plan_objects).filter((o) => o.type === 'distribution');
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Stromkreise" subtitle="Stromkreise anlegen und Betriebsmittel zuordnen (Zuordnung im Installationsplan oder Stromlaufplan)."
        actions={<Button variant="primary" onClick={() => run('Stromkreis anlegen', (tx) => tx.insert('circuits', { project_id: project!.id, designation: next(), name: '', props: { protection: 'B16', cable: 'NYM-J 3x1,5' } }))}><Plus size={15} />Stromkreis</Button>} />
      <SafetyNote />
      {circuits.length === 0 ? <Empty>Noch keine Stromkreise.</Empty> : (
        <Table head={['BMK', 'Bezeichnung', 'Verteilung', 'Schutzorgan (Doku)', 'Leitung (Doku)', 'FI/RCD (Doku)', 'Objekte', 'Leitungslänge', 'Status', '']}>
          {circuits.map((c) => {
            const objs = Object.values(data.plan_objects).filter((o) => o.circuit_id === c.id);
            const len = Object.values(data.lines).filter((l) => l.circuit_id === c.id).reduce((s, l) => s + l.length_mm, 0);
            const dupe = circuits.filter((x) => x.designation === c.designation).length > 1;
            const upd = (patch: Record<string, unknown>) => run('Stromkreis ändern', (tx) => tx.update('circuits', c.id, patch));
            return (
              <tr key={c.id}>
                <Td><CommitInput ariaLabel="BMK" className={'h-8 w-20 ' + (dupe ? 'border-danger' : '')} value={c.designation} parse={trimOrNull} format={(v) => v ?? ''} onCommit={(v) => { if (!v) throw new Error('BMK darf nicht leer sein.'); return upd({ designation: v }); }} /></Td>
                <Td><CommitInput ariaLabel="Bezeichnung" className="h-8 min-w-36" value={c.name} placeholder="z. B. Küche Steckdosen" parse={trimOrNull} format={(v) => v ?? ''} onCommit={(v) => upd({ name: v })} /></Td>
                <Td><Select className="h-8 min-w-28" value={c.distribution ?? ''} onChange={(e) => upd({ distribution: e.target.value || null })}><option value="">–</option>{distributions.map((d) => <option key={d.id} value={d.id}>{d.label} {d.name}</option>)}</Select></Td>
                <Td><CommitInput className="h-8 w-20" value={c.props?.protection ?? null} parse={trimOrNull} format={(v) => v ?? ''} onCommit={(v) => upd({ props: { ...c.props, protection: v ?? undefined } })} /></Td>
                <Td><Select className="h-8 min-w-32" value={c.props?.cable ?? ''} onChange={(e) => upd({ props: { ...c.props, cable: e.target.value || undefined } })}><option value="">–</option>{CABLE_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Td>
                <Td><CommitInput className="h-8 w-24" value={c.props?.rcd ?? null} parse={trimOrNull} format={(v) => v ?? ''} placeholder="-F0" onCommit={(v) => upd({ props: { ...c.props, rcd: v ?? undefined } })} /></Td>
                <Td className="tabular">{objs.length}</Td>
                <Td className="tabular whitespace-nowrap">{formatMm(len, 'm')}</Td>
                <Td><Select className="h-8" value={c.status} onChange={(e) => upd({ status: e.target.value })}>{OBJECT_STATUS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}</Select></Td>
                <Td><Button size="sm" variant="ghost" aria-label="Stromkreis löschen" onClick={() => run('Stromkreis löschen', (tx) => tx.remove('circuits', c.id))}><Trash2 size={13} /></Button></Td>
              </tr>
            );
          })}
        </Table>
      )}
      {circuits.some((c) => circuits.filter((x) => x.designation === c.designation).length > 1) && <p className="mt-2 text-xs text-danger">Doppelte Stromkreis-BMK vorhanden (rot markiert).</p>}
    </div>
  );
}

export function DeviceList() {
  const { data, project } = useProject();
  const toast = useUi((s) => s.toast);
  const [room, setRoom] = useState('');
  const objs = Object.values(data.plan_objects).filter((o) => o.discipline === 'electrical' && (!room || o.room_id === room)).sort((a, b) => (a.label ?? '').localeCompare(b.label ?? '', 'de', { numeric: true }));
  const labels = objs.map((o) => o.label).filter(Boolean);
  const dupes = new Set(labels.filter((l, i) => labels.indexOf(l) !== i));
  const rows = objs.map((o) => ({
    BMK: o.label ?? '', Bezeichnung: o.name ?? '', Typ: symbolDef(o.type)?.label ?? o.type, Geschoss: data.floors[o.floor_id]?.name ?? '',
    Raum: o.room_id ? data.rooms[o.room_id]?.name ?? '' : '', 'Montagehöhe (mm)': o.mount_height_mm ?? 'Decke', Stromkreis: o.circuit_id ? data.circuits[o.circuit_id]?.designation ?? '' : '',
    Status: labelOf(OBJECT_STATUS, o.status), 'X (mm)': Math.round(o.x), 'Y (mm)': Math.round(o.y), Notizen: o.notes ?? '', ID: o.id,
  }));
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Betriebsmittelliste" subtitle={`${objs.length} Elektroobjekte`} actions={<>
        <Select className="w-48" aria-label="Nach Raum filtern" value={room} onChange={(e) => setRoom(e.target.value)}><option value="">Alle Räume</option>{Object.values(data.rooms).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select>
        <Button onClick={async () => toast(`Exportiert: ${await exportText(`${project!.name}-Betriebsmittel.csv`, toCsv(rows), 'text/csv')}`, 'success')}><Download size={14} />CSV</Button>
      </>} />
      {objs.length === 0 ? <Empty>Keine Elektroobjekte. Im Installationsplan Symbole platzieren.</Empty> : (
        <Table head={['BMK', 'Bezeichnung', 'Typ', 'Raum', 'Höhe', 'Stromkreis', 'Status']}>
          {objs.map((o, i) => (
            <tr key={o.id} className="cursor-pointer" onClick={() => useUi.getState().set({ module: 'electrical', floorId: o.floor_id, selection: [{ table: 'plan_objects', id: o.id }] })}>
              <Td className="font-mono">{o.label}{dupes.has(o.label) && <Badge tone="danger">doppelt</Badge>}</Td><Td>{o.name}</Td><Td>{rows[i].Typ}</Td><Td>{rows[i].Raum || <span className="text-muted">–</span>}</Td>
              <Td className="tabular">{o.mount_height_mm != null ? formatMm(o.mount_height_mm) : 'Decke'}</Td>
              <Td>{rows[i].Stromkreis ? <Badge tone="accent">{rows[i].Stromkreis}</Badge> : <Badge tone="warn">ohne</Badge>}</Td><Td>{rows[i].Status}</Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
