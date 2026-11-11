import { useState } from 'react';
import { Download } from 'lucide-react';
import { useProject } from '../../store/projectStore';
import { useUi } from '../../store/uiStore';
import { PlanWorkspace } from '../plan/PlanWorkspace';
import { Badge, Button, Card, Empty, PageHeader, Table, Tabs, Td } from '../../ui/primitives';
import { LINE_TYPES, OBJECT_STATUS, labelOf, lineTypeDef, symbolDef } from '../../model/catalog';
import { formatMm } from '../../model/geometry';
import { exportText, toCsv } from '../../export/csv';
import { exportFloorPlan } from '../reports/ReportsPage';

export function SanitaryPage() {
  const [tab, setTab] = useState<'plan' | 'list'>('plan');
  const tabs = <Tabs value={tab} onChange={setTab} items={[{ v: 'plan', label: 'Sanitärplan' }, { v: 'list', label: 'Objekte & Leitungen' }]} />;
  return tab === 'plan' ? <PlanWorkspace fixedMode="sanitary" header={tabs} /> : (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-line bg-panel px-2 py-1.5">{tabs}</div>
      <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6"><SanitaryList /></div>
    </div>
  );
}

function SanitaryList() {
  const { data, project } = useProject();
  const ui = useUi();
  const objs = Object.values(data.plan_objects).filter((o) => o.discipline === 'sanitary').sort((a, b) => (a.label ?? '').localeCompare(b.label ?? '', 'de', { numeric: true }));
  const lines = Object.values(data.lines).filter((l) => l.discipline === 'sanitary');
  const sums = LINE_TYPES.filter((t) => t.discipline === 'sanitary').map((t) => ({ t, len: lines.filter((l) => l.line_type === t.type).reduce((s, l) => s + l.length_mm, 0) }));
  const csv = () => toCsv([
    ...objs.map((o) => ({ Art: 'Objekt', Kennung: o.label, Bezeichnung: o.name, Typ: symbolDef(o.type)?.label, Geschoss: data.floors[o.floor_id]?.name, Raum: o.room_id ? data.rooms[o.room_id]?.name : '', 'Montagehöhe (mm)': o.mount_height_mm, Anschlüsse: Object.entries((o.props?.connections ?? {}) as Record<string, boolean>).filter(([, v]) => v).map(([k]) => (k === 'cold' ? 'KW' : k === 'hot' ? 'WW' : 'AW')).join(' '), Nennweite: [o.props?.dn_supply, o.props?.dn_waste].filter(Boolean).join(' / '), 'Länge (m)': '', Status: labelOf(OBJECT_STATUS, o.status) })),
    ...lines.map((l) => ({ Art: 'Leitung', Kennung: '', Bezeichnung: lineTypeDef(l.line_type).label, Typ: l.props?.material ?? '', Geschoss: data.floors[l.floor_id]?.name, Raum: '', 'Montagehöhe (mm)': '', Anschlüsse: '', Nennweite: l.props?.dn ?? '', 'Länge (m)': Math.round(l.length_mm) / 1000, Status: '' })),
  ]);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Sanitär – Objekte & Leitungen" subtitle="Gefälle und hydraulische Berechnungen sind nicht Bestandteil dieser Version."
        actions={<>
          <Button onClick={async () => ui.toast(`Exportiert: ${await exportText(`${project!.name}-Sanitaer.csv`, csv(), 'text/csv')}`, 'success')}><Download size={14} />CSV</Button>
          <Button variant="primary" onClick={async () => { if (!ui.floorId) return; try { ui.toast(`Exportiert: ${await exportFloorPlan(ui.floorId, 'pdf', { only: 'sanitary' })}`, 'success'); } catch (e) { ui.toast(String(e), 'error'); } }}><Download size={14} />Sanitärplan PDF</Button>
        </>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {sums.map(({ t, len }) => <Card key={t.type}><div className="flex items-center gap-2 text-sm"><span className="h-1.5 w-6 rounded" style={{ background: t.color }} />{t.label}</div><div className="mt-1 text-xl font-semibold tabular">{formatMm(len, 'm')}</div><div className="text-xs text-muted">gezeichnete 2D-Länge</div></Card>)}
      </div>
      <h3 className="mb-2 text-sm font-semibold">Objekte ({objs.length})</h3>
      {objs.length === 0 ? <Empty>Keine Sanitärobjekte.</Empty> : (
        <Table head={['Kennung', 'Objekt', 'Raum', 'Höhe', 'Anschlüsse', 'Nennweiten', 'Status']}>
          {objs.map((o) => { const c = (o.props?.connections ?? {}) as Record<string, boolean>; return (
            <tr key={o.id} className="cursor-pointer" onClick={() => ui.set({ module: 'sanitary', floorId: o.floor_id, selection: [{ table: 'plan_objects', id: o.id }] })}>
              <Td className="font-mono">{o.label}</Td><Td>{o.name}</Td><Td>{o.room_id ? data.rooms[o.room_id]?.name : '–'}</Td><Td className="tabular">{o.mount_height_mm != null ? formatMm(o.mount_height_mm) : '–'}</Td>
              <Td>{c.cold && <Badge tone="accent">KW</Badge>} {c.hot && <Badge tone="danger">WW</Badge>} {c.waste && <Badge>AW</Badge>}</Td>
              <Td className="text-xs">{[o.props?.dn_supply, o.props?.dn_waste].filter(Boolean).join(' / ') || '–'}</Td><Td>{labelOf(OBJECT_STATUS, o.status)}</Td>
            </tr>); })}
        </Table>
      )}
      <h3 className="mb-2 mt-6 text-sm font-semibold">Leitungen ({lines.length})</h3>
      {lines.length === 0 ? <Empty>Keine Leitungen.</Empty> : (
        <Table head={['Art', 'Nennweite', 'Material', 'Von', 'Nach', 'Länge']}>
          {lines.map((l) => (
            <tr key={l.id} className="cursor-pointer" onClick={() => ui.set({ module: 'sanitary', floorId: l.floor_id, selection: [{ table: 'lines', id: l.id }] })}>
              <Td><span className="mr-1.5 inline-block h-1 w-4 rounded align-middle" style={{ background: lineTypeDef(l.line_type).color }} />{lineTypeDef(l.line_type).label}</Td>
              <Td>{l.props?.dn ?? '–'}</Td><Td>{l.props?.material ?? '–'}</Td>
              <Td>{l.start_object_id ? data.plan_objects[l.start_object_id]?.label : '–'}</Td><Td>{l.end_object_id ? data.plan_objects[l.end_object_id]?.label : '–'}</Td>
              <Td className="tabular">{formatMm(l.length_mm, 'm')}</Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
