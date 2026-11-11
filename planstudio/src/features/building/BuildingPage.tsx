import { useState } from 'react';
import { Plus, Trash2, PencilRuler, Layers } from 'lucide-react';
import { useProject } from '../../store/projectStore';
import { useUi } from '../../store/uiStore';
import { useRun } from '../../store/useRun';
import { Badge, Button, Card, Dialog, Empty, Field, Input, PageHeader, Select, Table, Td } from '../../ui/primitives';
import { CommitInput, fmtMm, parseLen, parseSignedLen, trimOrNull } from '../../ui/fields';
import { ROOM_STATUS, ROOM_USAGES, labelOf } from '../../model/catalog';
import { parseLength } from '../../model/geometry';
import * as ops from '../plan/ops';
import { eur, num } from '../../lib/format';

export function BuildingPage() {
  const { data, project } = useProject();
  const ui = useUi();
  const run = useRun();
  const [roomDlg, setRoomDlg] = useState<string | null>(null);
  const [delFloor, setDelFloor] = useState<string | null>(null);
  const buildings = Object.values(data.buildings).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const floorsOf = (bid: string) => Object.values(data.floors).filter((f) => f.building_id === bid).sort((a, b) => a.sort_order - b.sort_order);
  const roomsOf = (fid: string) => Object.values(data.rooms).filter((r) => r.floor_id === fid).sort((a, b) => a.name.localeCompare(b.name, 'de', { numeric: true }));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Gebäude, Geschosse & Räume" subtitle="Zentrales Gebäudemodell – alle Module greifen auf diese Struktur zu."
        actions={<Button variant="primary" onClick={() => run('Gebäude anlegen', (tx) => tx.insert('buildings', { project_id: project!.id, name: `Gebäude ${buildings.length + 1}` }))}><Plus size={15} />Gebäude</Button>} />
      <div className="flex flex-col gap-4">
        {buildings.map((b) => (
          <Card key={b.id} title={<span className="flex items-center gap-2"><CommitInput className="h-8 w-64 font-semibold" ariaLabel="Gebäudename" value={b.name} parse={trimOrNull} format={(v) => v ?? ''} onCommit={(v) => { if (!v) throw new Error('Name darf nicht leer sein.'); return run('Gebäude umbenennen', (tx) => tx.update('buildings', b.id, { name: v })); }} /></span>}
            actions={<>
              <Button size="sm" onClick={() => { const fl = floorsOf(b.id); run('Geschoss anlegen', (tx) => tx.insert('floors', { building_id: b.id, name: fl.length === 0 ? 'Erdgeschoss' : `${fl.length}. Obergeschoss`, sort_order: fl.length, elevation_mm: fl.length * 2750, height_mm: 2500 })); }}><Layers size={14} />Geschoss</Button>
              {buildings.length > 1 && <Button size="sm" variant="ghost" aria-label="Gebäude löschen" onClick={() => { if (confirm(`Gebäude „${b.name}“ mit allen Geschossen und Plänen löschen? (Rückgängig möglich)`)) run('Gebäude löschen', (tx) => tx.remove('buildings', b.id)); }}><Trash2 size={14} /></Button>}
            </>}>
            <div className="mb-3"><CommitInput ariaLabel="Gebäudebeschreibung" value={b.description} placeholder="Beschreibung, Baujahr, Bauweise …" parse={trimOrNull} format={(v) => v ?? ''} onCommit={(v) => run('Gebäude', (tx) => tx.update('buildings', b.id, { description: v }))} /></div>
            {floorsOf(b.id).length === 0 && <Empty>Noch kein Geschoss.</Empty>}
            <div className="flex flex-col gap-4">
              {floorsOf(b.id).map((f) => {
                const rooms = roomsOf(f.id);
                return (
                  <div key={f.id} className="rounded-lg border border-line">
                    <div className="flex flex-wrap items-end gap-2 border-b border-line bg-panel2 p-3">
                      <Field label="Geschoss" className="w-48"><CommitInput ariaLabel="Geschossname" value={f.name} parse={trimOrNull} format={(v) => v ?? ''} onCommit={(v) => { if (!v) throw new Error('Name darf nicht leer sein.'); return run('Geschoss', (tx) => tx.update('floors', f.id, { name: v })); }} /></Field>
                      <Field label="Höhenlage OKFF (mm)" className="w-36"><CommitInput value={f.elevation_mm} parse={parseSignedLen} format={fmtMm} onCommit={(v) => run('Geschoss', (tx) => tx.update('floors', f.id, { elevation_mm: v as number }))} /></Field>
                      <Field label="Raumhöhe (mm)" className="w-32"><CommitInput value={f.height_mm} parse={parseLen(1)} format={fmtMm} onCommit={(v) => run('Geschoss', (tx) => tx.update('floors', f.id, { height_mm: v as number }))} /></Field>
                      <Field label="Reihenfolge" className="w-24"><CommitInput value={f.sort_order} parse={(s) => Math.round(Number(s) || 0)} onCommit={(v) => run('Geschoss', (tx) => tx.update('floors', f.id, { sort_order: v }))} /></Field>
                      <div className="flex-1" />
                      <Button size="sm" onClick={() => { ui.set({ floorId: f.id, module: 'plan' }); ui.setMode('architecture'); }}><PencilRuler size={14} />Grundriss öffnen</Button>
                      <Button size="sm" onClick={() => setRoomDlg(f.id)}><Plus size={14} />Raum</Button>
                      <Button size="sm" variant="ghost" aria-label="Geschoss löschen" onClick={() => setDelFloor(f.id)}><Trash2 size={14} /></Button>
                    </div>
                    <div className="p-3">
                      {rooms.length === 0 ? <p className="text-sm text-muted">Keine Räume. Räume im Grundriss mit dem Raumwerkzeug zeichnen oder hier anlegen.</p> : (
                        <Table head={['Raum', 'Nutzung', 'Fläche', 'Status', 'Budget', 'Objekte', '']}>
                          {rooms.map((r) => (
                            <tr key={r.id}>
                              <Td><CommitInput ariaLabel="Raumname" className="h-8" value={r.name} parse={trimOrNull} format={(v) => v ?? ''} onCommit={(v) => { if (!v) throw new Error('Name darf nicht leer sein.'); return run('Raum', (tx) => tx.update('rooms', r.id, { name: v })); }} /></Td>
                              <Td><Select className="h-8" value={r.usage ?? ''} onChange={(e) => run('Raum', (tx) => tx.update('rooms', r.id, { usage: e.target.value || null }))}><option value="">–</option>{ROOM_USAGES.map((u) => <option key={u}>{u}</option>)}</Select></Td>
                              <Td className="tabular whitespace-nowrap">{r.area_m2 != null ? `${num(r.area_m2)} m²` : '–'}</Td>
                              <Td><Badge tone={r.status === 'fertig' ? 'ok' : r.status === 'in_arbeit' ? 'accent' : 'default'}>{labelOf(ROOM_STATUS, r.status)}</Badge></Td>
                              <Td className="tabular">{eur(r.budget_cents)}</Td>
                              <Td className="tabular">{Object.values(data.plan_objects).filter((o) => o.room_id === r.id).length}</Td>
                              <Td className="whitespace-nowrap text-right">
                                <Button size="sm" variant="ghost" onClick={() => { ui.set({ floorId: f.id, module: 'plan', selection: [{ table: 'rooms', id: r.id }] }); ui.setMode('architecture'); }}>Im Plan</Button>
                                <Button size="sm" variant="ghost" aria-label="Raum löschen" onClick={() => run('Raum löschen', (tx) => tx.remove('rooms', r.id))}><Trash2 size={13} /></Button>
                              </Td>
                            </tr>
                          ))}
                        </Table>
                      )}
                      {rooms.length > 0 && <div className="mt-2 text-right text-xs text-muted">Summe: {num(rooms.reduce((s, r) => s + (r.area_m2 ?? 0), 0))} m²</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
      <RoomDialog floorId={roomDlg} onClose={() => setRoomDlg(null)} />
      {delFloor && (
        <Dialog open title="Geschoss löschen?" onClose={() => setDelFloor(null)} footer={<><Button onClick={() => setDelFloor(null)}>Abbrechen</Button><Button variant="danger" onClick={async () => { await run('Geschoss löschen', (tx) => tx.remove('floors', delFloor)); setDelFloor(null); }}>Löschen</Button></>}>
          <p className="text-sm">Das Geschoss „{data.floors[delFloor]?.name}“ wird mit allen Wänden, Räumen, Elektro- und Sanitärobjekten gelöscht. Über „Rückgängig“ wiederherstellbar.</p>
        </Dialog>
      )}
    </div>
  );
}

function RoomDialog({ floorId, onClose }: { floorId: string | null; onClose(): void }) {
  const run = useRun();
  const [name, setName] = useState('');
  const [usage, setUsage] = useState('');
  const [w, setW] = useState('4000');
  const [d, setD] = useState('3000');
  const [x, setX] = useState('0');
  const [y, setY] = useState('0');
  if (!floorId) return null;
  const submit = async () => {
    const W = parseLength(w), D = parseLength(d), X = parseLength(x), Y = parseLength(y);
    if (!name.trim()) { useUi.getState().toast('Bitte einen Raumnamen eingeben.', 'error'); return; }
    if (!W || !D || W <= 0 || D <= 0 || X == null || Y == null) { useUi.getState().toast('Bitte gültige Maße eingeben.', 'error'); return; }
    const r = await run('Raum anlegen', (tx) => { const room = ops.addRoom(tx, floorId, [{ x: X, y: Y }, { x: X + W, y: Y }, { x: X + W, y: Y + D }, { x: X, y: Y + D }], name.trim()); tx.update('rooms', room.id, { usage: usage || null }); return room; });
    if (r) { setName(''); onClose(); }
  };
  return (
    <Dialog open title="Raum anlegen (rechteckig)" onClose={onClose} footer={<><Button onClick={onClose}>Abbrechen</Button><Button variant="primary" onClick={submit}>Anlegen</Button></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" className="col-span-2"><Input aria-label="Neuer Raumname" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <Field label="Nutzungsart" className="col-span-2"><Select value={usage} onChange={(e) => setUsage(e.target.value)}><option value="">–</option>{ROOM_USAGES.map((u) => <option key={u}>{u}</option>)}</Select></Field>
        <Field label="Breite (x)"><Input value={w} onChange={(e) => setW(e.target.value)} /></Field>
        <Field label="Tiefe (y)"><Input value={d} onChange={(e) => setD(e.target.value)} /></Field>
        <Field label="Ursprung X"><Input value={x} onChange={(e) => setX(e.target.value)} /></Field>
        <Field label="Ursprung Y"><Input value={y} onChange={(e) => setY(e.target.value)} /></Field>
      </div>
      <p className="mt-3 text-xs text-muted">Maße in mm (oder mit Einheit: 4,2m / 420cm). Die Raumform kann im Grundriss über die Eckpunkte angepasst werden.</p>
    </Dialog>
  );
}
