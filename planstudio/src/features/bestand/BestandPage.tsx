import { useMemo, useState } from 'react';
import { Plus, Trash2, PencilRuler, AlertTriangle, Info } from 'lucide-react';
import { useProject } from '../../store/projectStore';
import { useUi } from '../../store/uiStore';
import { useRun } from '../../store/useRun';
import { Badge, Button, Card, Empty, Field, Input, PageHeader, Select, Table, Tabs, Td } from '../../ui/primitives';
import { CommitInput, trimOrNull } from '../../ui/fields';
import { CERTAINTY, LINK_KINDS, SOURCE_KINDS, certaintyDef, labelOf } from '../../model/catalog';
import type { Certainty, LinkKind, Room, SourceKind } from '../../model/types';
import { CertaintyBadge, CertaintySelect, EvidenceList, SourceIcon } from './Evidence';
import { useIsMobile } from '../../lib/useMedia';

type Tab = 'overview' | 'sources' | 'rooms' | 'links' | 'graph';

/**
 * Bestandsaufnahme / Rekonstruktion: Quellenkatalog, Raumkarten mit Status, Nachbarschaftsgraph.
 * Grundsatz: Geometrie nur, wenn der Nutzer sie einzeichnet; jede Aussage trägt einen Status und Quellen.
 */
export function BestandPage() {
  const [tab, setTab] = useState<Tab>('overview');
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Bestandsaufnahme" subtitle="Quellen, Raumkarten, Verbindungen – nachvollziehbar und mit Unsicherheitsstufen" />
      <div className="mb-4"><Tabs value={tab} onChange={setTab} items={[{ v: 'overview', label: 'Übersicht' }, { v: 'sources', label: 'Quellen' }, { v: 'rooms', label: 'Raumkarten' }, { v: 'links', label: 'Verbindungen' }, { v: 'graph', label: 'Graph' }]} /></div>
      {tab === 'overview' && <Overview go={setTab} />}
      {tab === 'sources' && <Sources />}
      {tab === 'rooms' && <Rooms />}
      {tab === 'links' && <Links />}
      {tab === 'graph' && <Graph />}
    </div>
  );
}

const roomLabel = (r: Room | undefined) => (r ? `${r.code ? r.code + ' · ' : ''}${r.name}` : '–');

function Overview({ go }: { go(t: Tab): void }) {
  const data = useProject((s) => s.data);
  const rooms = Object.values(data.rooms);
  const placed = rooms.filter((r) => r.polygon && r.polygon.length >= 3).length;
  const links = Object.values(data.room_links);
  const count = (list: { certainty: string | null }[], v: string) => list.filter((x) => x.certainty === v).length;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="Stand">
        <ul className="space-y-1 text-sm">
          <li><button className="hover:text-accent" onClick={() => go('sources')}>{Object.keys(data.sources).length} Quellen</button> · {Object.values(data.sources).filter((s) => !s.use_as_evidence).length} ausdrücklich kein Beleg</li>
          <li><button className="hover:text-accent" onClick={() => go('rooms')}>{rooms.length} Raumkarten</button> · {placed} eingezeichnet · {rooms.length - placed} unplatziert</li>
          <li><button className="hover:text-accent" onClick={() => go('links')}>{links.length} Verbindungen</button></li>
          <li>{Object.keys(data.source_refs).length} Quellenverweise</li>
        </ul>
      </Card>
      <Card title="Unsicherheitsstufen">
        <table className="w-full text-sm"><thead><tr className="text-left text-[11px] uppercase text-muted"><th>Status</th><th className="text-right">Räume</th><th className="text-right">Verb.</th></tr></thead>
          <tbody>{CERTAINTY.map((c) => <tr key={c.v}><td className="py-0.5"><CertaintyBadge v={c.v} /></td><td className="text-right tabular">{count(rooms, c.v)}</td><td className="text-right tabular">{count(links, c.v)}</td></tr>)}
            <tr><td className="py-0.5 text-muted">ohne Status</td><td className="text-right tabular">{rooms.filter((r) => !r.certainty).length}</td><td /></tr></tbody></table>
      </Card>
      <Card title="Vorgehen">
        <ol className="list-decimal space-y-1 pl-4 text-sm">
          <li>Luftbild im Planungsstudio, Geschoss „Außenübersicht“, als <b>Hintergrundbild</b> importieren (Eigenschaften → Hintergrundbild).</li>
          <li>Gebäudeteile A–F als Raumkarten über dem Bild <b>nachzeichnen</b>.</li>
          <li>Je Video Durchgänge mit Zeitstempel als <b>Verbindungen</b> erfassen.</li>
          <li>Raumkarten erst einzeichnen, wenn die Lage belegt ist.</li>
          <li>Nach Aufmaß Maße eintragen und Status <b>„Bestätigt (Aufmaß)“</b> setzen.</li>
        </ol>
      </Card>
      <div className="flex gap-2 rounded-lg border border-warn/40 bg-warn/10 p-3 text-xs text-warn lg:col-span-3"><AlertTriangle size={15} className="shrink-0" />
        Rekonstruktion aus Videos und Dokumenten – kein vermessener Bauplan. Eigentums- oder Mietgrenzen werden nicht rechtlich festgestellt. Sichtbare Schäden sind keine Diagnose; Tragwerk, Elektrik, Feuchte und Brandschutz durch Fachleute prüfen lassen.</div>
    </div>
  );
}

function Sources() {
  const { data, project } = useProject();
  const run = useRun();
  const [n, setN] = useState({ kind: 'video' as SourceKind, file_name: '', title: '', description: '' });
  const list = Object.values(data.sources).sort((a, b) => a.kind.localeCompare(b.kind) || a.file_name.localeCompare(b.file_name, 'de', { numeric: true }));
  const refCount = (id: string) => Object.values(data.source_refs).filter((r) => r.source_id === id).length;
  const add = async () => {
    if (!n.file_name.trim()) { useUi.getState().toast('Dateiname / Bezeichnung fehlt.', 'error'); return; }
    const ok = await run('Quelle anlegen', (tx) => tx.insert('sources', { project_id: project!.id, kind: n.kind, file_name: n.file_name.trim(), title: n.title.trim() || null, description: n.description.trim() || null }));
    if (ok) setN({ ...n, file_name: '', title: '', description: '' });
  };
  return (
    <div>
      <Card className="mb-3">
        <div className="grid gap-2 md:grid-cols-6">
          <Select aria-label="Quellenart" value={n.kind} onChange={(e) => setN({ ...n, kind: e.target.value as SourceKind })}>{SOURCE_KINDS.map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}</Select>
          <Input className="md:col-span-2" aria-label="Dateiname" placeholder="Dateiname, z. B. rundgang-01.mp4" value={n.file_name} onChange={(e) => setN({ ...n, file_name: e.target.value })} />
          <Input className="md:col-span-2" aria-label="Beschreibung" placeholder="Inhalt / Bemerkung" value={n.description} onChange={(e) => setN({ ...n, description: e.target.value })} />
          <Button variant="primary" onClick={add}><Plus size={14} />Quelle</Button>
        </div>
      </Card>
      {list.length === 0 ? <Empty>Noch keine Quellen.</Empty> : (
        <Table head={['', 'Datei / Quelle', 'Art', 'Beschreibung', 'Beleg?', 'Verweise', '']}>
          {list.map((s) => (
            <tr key={s.id}>
              <Td><SourceIcon s={s} /></Td>
              <Td className="font-medium">{s.file_name}</Td>
              <Td>{labelOf(SOURCE_KINDS, s.kind)}</Td>
              <Td><CommitInput className="h-8 min-w-64 text-xs" value={s.description} parse={trimOrNull} format={(v) => v ?? ''} onCommit={(v) => run('Quelle', (tx) => tx.update('sources', s.id, { description: v }))} /></Td>
              <Td><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!s.use_as_evidence} onChange={() => run('Quelle', (tx) => tx.update('sources', s.id, { use_as_evidence: s.use_as_evidence ? 0 : 1 }))} />{s.use_as_evidence ? 'ja' : <span className="text-danger">kein Beleg</span>}</label></Td>
              <Td className="tabular">{refCount(s.id)}</Td>
              <Td><Button size="sm" variant="ghost" aria-label="Quelle löschen" onClick={() => { if (confirm(`Quelle „${s.file_name}“ und ihre ${refCount(s.id)} Verweise löschen?`)) void run('Quelle löschen', (tx) => tx.remove('sources', s.id)); }}><Trash2 size={13} /></Button></Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

function Rooms() {
  const { data } = useProject();
  const ui = useUi();
  const mobile = useIsMobile();
  const run = useRun();
  const floors = Object.values(data.floors).sort((a, b) => a.sort_order - b.sort_order);
  const [f, setF] = useState({ floor: '', certainty: '', placed: '' });
  const [open, setOpen] = useState<string | null>(null);
  const [n, setN] = useState({ code: '', name: '', floor_id: floors[0]?.id ?? '', certainty: 'ungeklaert' as Certainty, description: '' });
  const rooms = Object.values(data.rooms).filter((r) => (!f.floor || r.floor_id === f.floor) && (!f.certainty || (r.certainty ?? '') === f.certainty) && (!f.placed || (f.placed === 'ja') === !!(r.polygon && r.polygon.length >= 3)))
    .sort((a, b) => (data.floors[a.floor_id]?.sort_order ?? 0) - (data.floors[b.floor_id]?.sort_order ?? 0) || (a.code ?? 'zz').localeCompare(b.code ?? 'zz', 'de', { numeric: true }) || a.name.localeCompare(b.name, 'de'));
  const add = async () => {
    if (!n.name.trim() || !n.floor_id) { useUi.getState().toast('Name und Geschoss angeben.', 'error'); return; }
    const ok = await run('Raumkarte anlegen', (tx) => tx.insert('rooms', { floor_id: n.floor_id, code: n.code.trim() || null, name: n.name.trim(), certainty: n.certainty, description: n.description.trim() || null, polygon: null, area_m2: null }));
    if (ok) setN({ ...n, code: '', name: '', description: '' });
  };
  return (
    <div>
      <Card className="mb-3" title="Raumkarte anlegen (ohne Geometrie)">
        <div className="grid gap-2 md:grid-cols-6">
          <Input aria-label="Raum-ID" placeholder="ID, z. B. R-02" value={n.code} onChange={(e) => setN({ ...n, code: e.target.value })} />
          <Input className="md:col-span-2" aria-label="Raumname" placeholder="Name / Beschreibung" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} />
          <Select aria-label="Geschoss" value={n.floor_id} onChange={(e) => setN({ ...n, floor_id: e.target.value })}>{floors.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>
          <Select aria-label="Status" value={n.certainty} onChange={(e) => setN({ ...n, certainty: e.target.value as Certainty })}>{CERTAINTY.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}</Select>
          <Button variant="primary" onClick={add}><Plus size={14} />Raumkarte</Button>
        </div>
      </Card>
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Select aria-label="Filter Geschoss" value={f.floor} onChange={(e) => setF({ ...f, floor: e.target.value })}><option value="">Alle Geschosse</option>{floors.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>
        <Select aria-label="Filter Status" value={f.certainty} onChange={(e) => setF({ ...f, certainty: e.target.value })}><option value="">Alle Status</option>{CERTAINTY.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}</Select>
        <Select aria-label="Filter eingezeichnet" value={f.placed} onChange={(e) => setF({ ...f, placed: e.target.value })}><option value="">eingezeichnet + unplatziert</option><option value="ja">nur eingezeichnet</option><option value="nein">nur unplatziert</option></Select>
      </div>
      {rooms.length === 0 ? <Empty>Keine Raumkarten.</Empty> : mobile ? (
        <ul className="flex flex-col gap-2" data-testid="room-cards">
          {rooms.map((r) => {
            const placed = !!(r.polygon && r.polygon.length >= 3);
            const nref = Object.values(data.source_refs).filter((x) => x.ref_table === 'rooms' && x.ref_id === r.id).length;
            return (
              <li key={r.id} className="rounded-xl border border-line bg-panel">
                <button className="flex w-full flex-col gap-1.5 p-3 text-left" onClick={() => setOpen(open === r.id ? null : r.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><div className="font-medium">{r.code && <span className="mr-1.5 font-mono text-xs text-muted">{r.code}</span>}{r.name}</div>
                      <div className="text-xs text-muted">{data.floors[r.floor_id]?.name} · {nref} Quelle(n)</div></div>
                    {placed ? <Badge tone="ok">eingezeichnet</Badge> : <Badge>unplatziert</Badge>}
                  </div>
                  <CertaintyBadge v={r.certainty} />
                </button>
                {open === r.id && <div className="border-t border-line p-3">{details(r)}<div className="mt-3"><Button className="w-full" onClick={() => placeAction(r)}><PencilRuler size={14} />{placed ? 'Im Plan zeigen' : 'Im Plan einzeichnen'}</Button></div></div>}
              </li>
            );
          })}
        </ul>
      ) : (
        <Table head={['ID', 'Raum', 'Geschoss', 'Status', 'Lage', 'Quellen', '']}>
          {rooms.map((r) => {
            const placed = !!(r.polygon && r.polygon.length >= 3);
            const nref = Object.values(data.source_refs).filter((x) => x.ref_table === 'rooms' && x.ref_id === r.id).length;
            return [
              <tr key={r.id} className="cursor-pointer" onClick={() => setOpen(open === r.id ? null : r.id)}>
                <Td className="font-mono text-xs">{r.code ?? '–'}</Td>
                <Td><div className="font-medium">{r.name}</div>{r.description && <div className="max-w-md truncate text-xs text-muted">{r.description}</div>}</Td>
                <Td className="whitespace-nowrap">{data.floors[r.floor_id]?.name}</Td>
                <Td><CertaintyBadge v={r.certainty} /></Td>
                <Td>{placed ? <Badge tone="ok">eingezeichnet</Badge> : <Badge>unplatziert</Badge>}</Td>
                <Td className="tabular">{nref}</Td>
                <Td className="whitespace-nowrap text-right" >
                  <Button size="sm" variant="ghost" title={placed ? 'Im Plan zeigen' : 'Einzeichnen'} onClick={(e) => { e.stopPropagation(); placeAction(r); }}><PencilRuler size={13} />{placed ? 'Plan' : 'Einzeichnen'}</Button>
                </Td>
              </tr>,
              open === r.id && (
                <tr key={r.id + '-d'}><td colSpan={7} className="bg-panel2/60 p-3">{details(r)}</td></tr>
              ),
            ];
          })}
        </Table>
      )}
    </div>
  );

  function placeAction(r: Room) {
    const placed = !!(r.polygon && r.polygon.length >= 3);
    ui.setMode('architecture');
    ui.set({ module: 'plan', floorId: r.floor_id, selection: placed ? [{ table: 'rooms', id: r.id }] : [], placeRoomId: placed ? null : r.id });
    if (!placed) ui.setTool('room_rect');
  }

  function details(r: Room) {
    return (
      <>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="flex flex-col gap-2">
                      <Field label="Raum-ID"><CommitInput value={r.code} parse={trimOrNull} format={(v) => v ?? ''} onCommit={(v) => run('Raum', (tx) => tx.update('rooms', r.id, { code: v }))} /></Field>
                      <Field label="Name"><CommitInput value={r.name} parse={trimOrNull} format={(v) => v ?? ''} onCommit={(v) => { if (!v) throw new Error('Name fehlt.'); return run('Raum', (tx) => tx.update('rooms', r.id, { name: v })); }} /></Field>
                      <Field label="Geschoss"><Select value={r.floor_id} onChange={(e) => { const v = e.target.value; void run('Geschoss ändern', (tx) => tx.update('rooms', r.id, { floor_id: v })); }}>{floors.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>
                      <CertaintySelect value={r.certainty} onChange={(v) => run('Status', (tx) => tx.update('rooms', r.id, { certainty: v }))} />
                    </div>
                    <Field label="Befund / Notiz"><CommitInput multiline value={r.description} parse={trimOrNull} format={(v) => v ?? ''} onCommit={(v) => run('Raum', (tx) => tx.update('rooms', r.id, { description: v }))} /></Field>
                    <div><div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">Quellen</div><EvidenceList table="rooms" id={r.id} /></div>
                  </div>
                  <div className="mt-2 flex justify-end"><Button size="sm" variant="danger" onClick={() => { if (confirm(`Raumkarte „${r.name}“ löschen? (rückgängig möglich)`)) void run('Raum löschen', (tx) => tx.remove('rooms', r.id)); }}><Trash2 size={13} />Löschen</Button></div>
      </>
    );
  }
}

function Links() {
  const { data, project } = useProject();
  const mobile = useIsMobile();
  const run = useRun();
  const rooms = Object.values(data.rooms).sort((a, b) => (data.floors[a.floor_id]?.sort_order ?? 0) - (data.floors[b.floor_id]?.sort_order ?? 0) || roomLabel(a).localeCompare(roomLabel(b), 'de', { numeric: true }));
  const [n, setN] = useState({ from: '', to: '', to_label: '', kind: 'durchgang' as LinkKind, certainty: 'ungeklaert' as Certainty, note: '' });
  const [open, setOpen] = useState<string | null>(null);
  const links = Object.values(data.room_links);
  const add = async () => {
    if (!n.from || (!n.to && !n.to_label.trim())) { useUi.getState().toast('Von-Raum und Ziel (Raum oder Bezeichnung, z. B. „Hof“) angeben.', 'error'); return; }
    if (n.to && n.to === n.from) { useUi.getState().toast('Ein Raum kann nicht mit sich selbst verbunden werden.', 'error'); return; }
    const ok = await run('Verbindung anlegen', (tx) => tx.insert('room_links', { project_id: project!.id, from_room_id: n.from, to_room_id: n.to || null, to_label: n.to ? null : n.to_label.trim(), kind: n.kind, certainty: n.certainty, note: n.note.trim() || null }));
    if (ok) setN({ ...n, to: '', to_label: '', note: '' });
  };
  const opts = rooms.map((r) => <option key={r.id} value={r.id}>{data.floors[r.floor_id]?.name} · {roomLabel(r)}</option>);
  return (
    <div>
      <Card className="mb-3" title="Verbindung erfassen (unabhängig von der Lage im Plan)">
        <div className="grid gap-2 md:grid-cols-7">
          <Select className="md:col-span-2" aria-label="Von Raum" value={n.from} onChange={(e) => setN({ ...n, from: e.target.value })}><option value="">Von Raum …</option>{opts}</Select>
          <Select className="md:col-span-2" aria-label="Nach Raum" value={n.to} onChange={(e) => setN({ ...n, to: e.target.value })}><option value="">Nach: Außen / unbestimmt (Bezeichnung) …</option>{opts}</Select>
          {!n.to && <Input aria-label="Ziel-Bezeichnung" placeholder="z. B. Straße, Hof" value={n.to_label} onChange={(e) => setN({ ...n, to_label: e.target.value })} />}
          <Select aria-label="Art" value={n.kind} onChange={(e) => setN({ ...n, kind: e.target.value as LinkKind })}>{LINK_KINDS.map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}</Select>
          <Select aria-label="Status Verbindung" value={n.certainty} onChange={(e) => setN({ ...n, certainty: e.target.value as Certainty })}>{CERTAINTY.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}</Select>
          <Input className="md:col-span-5" aria-label="Notiz" placeholder="Notiz, z. B. Blickrichtung, Tür links" value={n.note} onChange={(e) => setN({ ...n, note: e.target.value })} />
          <Button variant="primary" onClick={add}><Plus size={14} />Verbindung</Button>
        </div>
      </Card>
      {links.length === 0 ? <Empty>Noch keine Verbindungen.</Empty> : mobile ? (
        <ul className="flex flex-col gap-2" data-testid="link-cards">
          {links.map((l) => (
            <li key={l.id} className="rounded-xl border border-line bg-panel">
              <button className="flex w-full flex-col gap-1.5 p-3 text-left" onClick={() => setOpen(open === l.id ? null : l.id)}>
                <div className="text-sm font-medium">{roomLabel(data.rooms[l.from_room_id])}</div>
                <div className="text-sm">→ {l.to_room_id ? roomLabel(data.rooms[l.to_room_id]) : <i>{l.to_label}</i>}</div>
                <div className="flex flex-wrap items-center gap-1.5"><Badge>{labelOf(LINK_KINDS, l.kind)}</Badge><CertaintyBadge v={l.certainty} /></div>
                {l.note && <div className="text-xs text-muted">{l.note}</div>}
              </button>
              {open === l.id && (
                <div className="flex flex-col gap-3 border-t border-line p-3">
                  <CertaintySelect value={l.certainty} onChange={(v) => run('Status Verbindung', (tx) => tx.update('room_links', l.id, { certainty: v ?? 'ungeklaert' }))} />
                  <Field label="Notiz"><CommitInput multiline value={l.note} parse={trimOrNull} format={(v) => v ?? ''} onCommit={(v) => run('Verbindung', (tx) => tx.update('room_links', l.id, { note: v }))} /></Field>
                  <div><div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">Quellen (Video + Zeitstempel)</div><EvidenceList table="room_links" id={l.id} /></div>
                  <Button variant="danger" onClick={() => run('Verbindung löschen', (tx) => tx.remove('room_links', l.id))}><Trash2 size={14} />Löschen</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Table head={['Von', 'Nach', 'Art', 'Status', 'Notiz', 'Quellen', '']}>
          {links.map((l) => {
            const nref = Object.values(data.source_refs).filter((x) => x.ref_table === 'room_links' && x.ref_id === l.id).length;
            return [
              <tr key={l.id} className="cursor-pointer" onClick={() => setOpen(open === l.id ? null : l.id)}>
                <Td>{roomLabel(data.rooms[l.from_room_id])}</Td>
                <Td>{l.to_room_id ? roomLabel(data.rooms[l.to_room_id]) : <i>{l.to_label}</i>}</Td>
                <Td>{labelOf(LINK_KINDS, l.kind)}</Td>
                <Td><Select className="h-8 w-44 text-xs" value={l.certainty} onClick={(e) => e.stopPropagation()} onChange={(e) => { const v = e.target.value as Certainty; void run('Status Verbindung', (tx) => tx.update('room_links', l.id, { certainty: v })); }}>{CERTAINTY.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}</Select></Td>
                <Td className="max-w-xs truncate text-xs">{l.note}</Td>
                <Td className="tabular">{nref}</Td>
                <Td><Button size="sm" variant="ghost" aria-label="Verbindung löschen" onClick={(e) => { e.stopPropagation(); void run('Verbindung löschen', (tx) => tx.remove('room_links', l.id)); }}><Trash2 size={13} /></Button></Td>
              </tr>,
              open === l.id && <tr key={l.id + '-d'}><td colSpan={7} className="bg-panel2/60 p-3"><div className="grid gap-3 md:grid-cols-2">
                <Field label="Notiz"><CommitInput multiline value={l.note} parse={trimOrNull} format={(v) => v ?? ''} onCommit={(v) => run('Verbindung', (tx) => tx.update('room_links', l.id, { note: v }))} /></Field>
                <div><div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">Quellen (Video + Zeitstempel)</div><EvidenceList table="room_links" id={l.id} /></div>
              </div></td></tr>,
            ];
          })}
        </Table>
      )}
    </div>
  );
}

/** Nachbarschaftsgraph: Spalten je Geschoss, Kanten nach Unsicherheitsstufe gestrichelt. Unabhängig von der Planlage. */
function Graph() {
  const data = useProject((s) => s.data);
  const theme = useUi((s) => s.theme);
  const fg = theme === 'dark' ? '#e2e8f0' : '#0f172a';
  const floors = Object.values(data.floors).sort((a, b) => a.sort_order - b.sort_order);
  const links = Object.values(data.room_links);
  const nodeW = 210, colW = 380, rowH = 46, top = 50;
  const layout = useMemo(() => {
    const pos = new Map<string, { x: number; y: number; label: string; cert?: string | null }>();
    const cols = floors.map((f) => ({ key: f.id, name: f.name, rooms: Object.values(data.rooms).filter((r) => r.floor_id === f.id) }));
    cols.forEach((c, i) => {
      c.rooms.sort((a, b) => (a.code ?? 'zz').localeCompare(b.code ?? 'zz', 'de', { numeric: true }) || a.name.localeCompare(b.name, 'de'))
        .forEach((r, j) => pos.set(r.id, { x: 20 + i * colW, y: top + j * rowH, label: roomLabel(r), cert: r.certainty }));
    });
    const h = Math.max(...cols.map((c) => c.rooms.length), 1) * rowH + top + 20;
    return { pos, cols, w: cols.length * colW + 20, h };
  }, [data.rooms, floors]); // eslint-disable-line react-hooks/exhaustive-deps
  if (links.length === 0 && Object.keys(data.rooms).length === 0) return <Empty>Keine Räume / Verbindungen.</Empty>;
  const extCount = new Map<string, number>();
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3 text-xs">{CERTAINTY.map((c) => <span key={c.v} className="flex items-center gap-1"><svg width="28" height="6"><line x1="0" y1="3" x2="28" y2="3" stroke={c.color} strokeWidth="2" strokeDasharray={c.dash || undefined} /></svg>{c.label}</span>)}
        <span className="flex items-center gap-1 text-muted"><Info size={12} />Graph zeigt nur Nachbarschaft, keine Lage. ↗ = Ziel außen/unbestimmt.</span></div>
      <div className="overflow-auto rounded-xl border border-line bg-canvas">
        <svg width={layout.w} height={layout.h} data-testid="link-graph" fontFamily="Inter, Arial, sans-serif">
          {layout.cols.map((c, i) => <text key={c.key} x={20 + i * colW} y={28} fontSize={13} fontWeight={700} fill={fg}>{c.name}</text>)}
          {links.filter((l) => l.to_room_id).map((l) => {
            const a = layout.pos.get(l.from_room_id), b = layout.pos.get(l.to_room_id!);
            if (!a || !b) return null;
            const c = certaintyDef(l.certainty);
            const y1 = a.y + 15, y2 = b.y + 15;
            let d: string;
            if (a.x === b.x) d = `M ${a.x} ${y1} C ${a.x - 45} ${y1}, ${a.x - 45} ${y2}, ${a.x} ${y2}`;
            else { const [l1, r1] = a.x < b.x ? [a, b] : [b, a]; const ly = l1 === a ? y1 : y2, ry = l1 === a ? y2 : y1; const x1 = l1.x + nodeW, x2 = r1.x; d = `M ${x1} ${ly} C ${x1 + 60} ${ly}, ${x2 - 60} ${ry}, ${x2} ${ry}`; }
            return <path key={l.id} d={d} fill="none" stroke={c?.color ?? '#94a3b8'} strokeWidth={2} strokeDasharray={c?.dash || undefined}><title>{`${labelOf(LINK_KINDS, l.kind)} · ${c?.label ?? ''}${l.note ? ' · ' + l.note : ''}`}</title></path>;
          })}
          {links.filter((l) => !l.to_room_id).map((l) => {
            const a = layout.pos.get(l.from_room_id); if (!a) return null;
            const k = extCount.get(l.from_room_id) ?? 0; extCount.set(l.from_room_id, k + 1);
            const c = certaintyDef(l.certainty);
            const y = a.y + 8 + k * 15, x0 = a.x + nodeW, x1 = x0 + 18;
            const txt = (l.to_label ?? '?');
            return <g key={l.id} data-ext-link>
              <line x1={x0} y1={y} x2={x1} y2={y} stroke={c?.color ?? '#94a3b8'} strokeWidth={2} strokeDasharray={c?.dash || undefined} />
              <text x={x1 + 3} y={y + 3.5} fontSize={10} fill={c?.color ?? fg}>↗ {txt.length > 26 ? txt.slice(0, 25) + '…' : txt}<title>{`${txt} · ${labelOf(LINK_KINDS, l.kind)} · ${c?.label ?? ''}${l.note ? ' · ' + l.note : ''}`}</title></text>
            </g>;
          })}
          {[...layout.pos.entries()].map(([id, p]) => {
            const c = certaintyDef(p.cert);
            return <g key={id}>
              <rect x={p.x} y={p.y} width={nodeW} height={30} rx={6} fill={theme === 'dark' ? '#18202b' : '#ffffff'} stroke={c?.color ?? '#64748b'} strokeWidth={1.5} strokeDasharray={c?.dash || undefined} />
              <text x={p.x + 8} y={p.y + 19} fontSize={11} fill={fg}>{p.label.length > 32 ? p.label.slice(0, 31) + '…' : p.label}<title>{p.label}</title></text>
            </g>;
          })}
        </svg>
      </div>
    </div>
  );
}
