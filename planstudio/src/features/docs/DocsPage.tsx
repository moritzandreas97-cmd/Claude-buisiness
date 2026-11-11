import { useEffect, useState } from 'react';
import { Upload, Trash2, FileText, StickyNote, Bug, Download, Image as ImageIcon, Archive } from 'lucide-react';
import { useProject } from '../../store/projectStore';
import { useUi } from '../../store/uiStore';
import { pickFiles, useRun } from '../../store/useRun';
import { Badge, Button, Card, Dialog, Empty, Field, Input, PageHeader, Select, Tabs, Textarea } from '../../ui/primitives';
import { CommitInput, trimOrNull } from '../../ui/fields';
import type { DocKind, DocumentRow } from '../../model/types';
import { dateTime } from '../../lib/format';
import { newId } from '../../lib/ids';
import { exportText, safeName } from '../../export/csv';

const KIND: Record<DocKind, string> = { photo: 'Foto', document: 'Dokument', note: 'Notiz', defect: 'Mangel', inventory: 'Bestand' };
const DEFECT = [{ v: 'offen', label: 'Offen' }, { v: 'in_bearbeitung', label: 'In Bearbeitung' }, { v: 'behoben', label: 'Behoben' }];
const MAX_FILE = 50 * 1024 * 1024;

function Thumb({ d }: { d: DocumentRow }) {
  const files = useProject((s) => s.platform!.files);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    if (d.kind === 'photo' && d.storage_key) files.get(d.storage_key).then((b) => { if (b) { u = URL.createObjectURL(new Blob([b as BlobPart], { type: d.mime ?? 'image/jpeg' })); setUrl(u); } });
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [d.storage_key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (url) return <img src={url} alt={d.title} className="h-36 w-full rounded-md object-cover" />;
  return <div className="flex h-36 w-full items-center justify-center rounded-md bg-panel2 text-muted">{d.kind === 'photo' ? <ImageIcon /> : d.kind === 'note' ? <StickyNote /> : d.kind === 'defect' ? <Bug /> : d.kind === 'inventory' ? <Archive /> : <FileText />}</div>;
}

export function DocsPage() {
  const { data, project, platform } = useProject();
  const ui = useUi();
  const run = useRun();
  const [tab, setTab] = useState<'all' | DocKind>('all');
  const [room, setRoom] = useState('');
  const [noteDlg, setNoteDlg] = useState<DocKind | null>(null);
  const docs = Object.values(data.documents).filter((d) => (tab === 'all' || d.kind === tab) && (!room || d.room_id === room)).sort((a, b) => b.created_at.localeCompare(a.created_at));

  const importFiles = async (kind: 'photo' | 'document') => {
    const files = await pickFiles(kind === 'photo' ? 'image/*' : '*/*', true);
    let n = 0;
    for (const f of files) {
      if (f.size > MAX_FILE) { ui.toast(`${f.name}: größer als 50 MB – übersprungen.`, 'error'); continue; }
      const id = newId();
      const key = `projects/${project!.id}/documents/${id}-${safeName(f.name)}`;
      try {
        await platform!.files.put(key, new Uint8Array(await f.arrayBuffer()));
        const ok = await run('Datei importieren', (tx) => tx.insert('documents', { id, project_id: project!.id, kind: kind === 'photo' || f.type.startsWith('image/') ? 'photo' : 'document', title: f.name.replace(/\.[^.]+$/, ''), file_name: f.name, mime: f.type || null, size: f.size, storage_key: key, room_id: room || null }));
        if (ok) n++; else await platform!.files.remove(key);
      } catch (e) { ui.toast(`${f.name}: ${e instanceof Error ? e.message : e}`, 'error'); }
    }
    if (n) ui.toast(`${n} Datei(en) importiert.`, 'success');
  };
  const download = async (d: DocumentRow) => {
    const b = d.storage_key ? await platform!.files.get(d.storage_key) : null;
    if (!b) { ui.toast('Datei nicht gefunden.', 'error'); return; }
    ui.toast(`Gespeichert: ${await exportText(d.file_name ?? d.title, b, d.mime ?? 'application/octet-stream')}`, 'success');
  };
  const remove = async (d: DocumentRow) => {
    if (!confirm(`„${d.title}“ löschen?`)) return;
    // Datei bleibt bis zum Löschen des Eintrags erhalten; Eintrag zuerst löschen (rückgängig möglich – Datei wird daher nicht entfernt)
    await run('Dokument löschen', (tx) => tx.remove('documents', d.id));
  };
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Dokumentation" subtitle="Fotos, Dokumente, Notizen, Mängel und Bestandsinformationen – dauerhaft Räumen und Objekten zugeordnet."
        actions={<>
          <Button onClick={() => importFiles('photo')}><Upload size={14} />Fotos importieren</Button>
          <Button onClick={() => importFiles('document')}><Upload size={14} />Dokumente importieren</Button>
          <Button onClick={() => setNoteDlg('note')}><StickyNote size={14} />Notiz</Button>
          <Button onClick={() => setNoteDlg('defect')}><Bug size={14} />Mangel</Button>
          <Button onClick={() => setNoteDlg('inventory')}><Archive size={14} />Bestand</Button>
        </>} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Tabs value={tab} onChange={setTab} items={[{ v: 'all', label: 'Alle' }, { v: 'photo', label: 'Fotos' }, { v: 'document', label: 'Dokumente' }, { v: 'note', label: 'Notizen' }, { v: 'defect', label: 'Mängel' }, { v: 'inventory', label: 'Bestand' }]} />
        <Select className="w-48" aria-label="Raum" value={room} onChange={(e) => setRoom(e.target.value)}><option value="">Alle Räume</option>{Object.values(data.rooms).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select>
      </div>
      {docs.length === 0 ? <Empty>Keine Einträge. Importierte Dateien werden lokal im Projektordner gespeichert.</Empty> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((d) => (
            <Card key={d.id}>
              <Thumb d={d} />
              <div className="mt-2 flex items-center gap-1.5"><Badge tone={d.kind === 'defect' ? 'danger' : 'default'}>{KIND[d.kind]}</Badge>{d.kind === 'defect' && <Badge tone={d.defect_status === 'behoben' ? 'ok' : 'warn'}>{DEFECT.find((x) => x.v === d.defect_status)?.label ?? 'Offen'}</Badge>}<span className="ml-auto text-[11px] text-muted">{dateTime(d.created_at)}</span></div>
              <div className="mt-2 flex flex-col gap-2">
                <CommitInput ariaLabel="Titel" className="h-8 font-medium" value={d.title} parse={trimOrNull} format={(v) => v ?? ''} onCommit={(v) => { if (!v) throw new Error('Titel fehlt.'); return run('Dokument', (tx) => tx.update('documents', d.id, { title: v })); }} />
                {(d.kind === 'note' || d.kind === 'defect' || d.kind === 'inventory') && <CommitInput multiline ariaLabel="Text" value={d.text} parse={trimOrNull} format={(v) => v ?? ''} onCommit={(v) => run('Dokument', (tx) => tx.update('documents', d.id, { text: v }))} />}
                <CommitInput ariaLabel="Beschreibung" className="h-8 text-xs" value={d.description} placeholder="Beschreibung" parse={trimOrNull} format={(v) => v ?? ''} onCommit={(v) => run('Dokument', (tx) => tx.update('documents', d.id, { description: v }))} />
                <div className="grid grid-cols-2 gap-1.5">
                  <Select className="h-8 text-xs" aria-label="Raum zuordnen" value={d.room_id ?? ''} onChange={(e) => run('Zuordnung', (tx) => tx.update('documents', d.id, { room_id: e.target.value || null }))}><option value="">kein Raum</option>{Object.values(data.rooms).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select>
                  <Select className="h-8 text-xs" aria-label="Objekt zuordnen" value={d.ref_id ?? ''} onChange={(e) => { const [t, id] = e.target.value.split(':'); run('Zuordnung', (tx) => tx.update('documents', d.id, { ref_table: id ? t : null, ref_id: id || null })); }}>
                    <option value="">kein Objekt/Bauteil</option>
                    {d.ref_id && <option value={d.ref_id}>{d.ref_table}:{d.ref_id.slice(-6)}</option>}
                    {Object.values(data.plan_objects).map((o) => <option key={o.id} value={`plan_objects:${o.id}`}>{o.label} {o.name}</option>)}
                    {Object.values(data.components).filter((c) => c.type === 'wall' || c.type === 'door' || c.type === 'window').map((c) => <option key={c.id} value={`components:${c.id}`}>{c.type === 'wall' ? 'Wand' : c.type === 'door' ? 'Tür' : 'Fenster'} …{c.id.slice(-5)}</option>)}
                  </Select>
                </div>
                {d.kind === 'defect' && <Select className="h-8 text-xs" aria-label="Mangelstatus" value={d.defect_status ?? 'offen'} onChange={(e) => run('Mangelstatus', (tx) => tx.update('documents', d.id, { defect_status: e.target.value }))}>{DEFECT.map((x) => <option key={x.v} value={x.v}>{x.label}</option>)}</Select>}
                <div className="flex justify-between">
                  {d.storage_key ? <Button size="sm" onClick={() => download(d)}><Download size={13} />Datei</Button> : <span />}
                  <Button size="sm" variant="ghost" aria-label="Löschen" onClick={() => remove(d)}><Trash2 size={13} /></Button>
                </div>
                {d.file_name && <div className="truncate text-[11px] text-muted">{d.file_name} · {((d.size ?? 0) / 1024).toFixed(0)} KB</div>}
              </div>
            </Card>
          ))}
        </div>
      )}
      {noteDlg && <NoteDialog kind={noteDlg} onClose={() => setNoteDlg(null)} defaultRoom={room} />}
    </div>
  );
}

function NoteDialog({ kind, onClose, defaultRoom }: { kind: DocKind; onClose(): void; defaultRoom: string }) {
  const { data, project } = useProject();
  const run = useRun();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [room, setRoom] = useState(defaultRoom);
  const save = async () => {
    if (!title.trim()) { useUi.getState().toast('Titel fehlt.', 'error'); return; }
    const ok = await run(`${KIND[kind]} erfassen`, (tx) => tx.insert('documents', { project_id: project!.id, kind, title: title.trim(), text: text.trim() || null, room_id: room || null, defect_status: kind === 'defect' ? 'offen' : null }));
    if (ok) onClose();
  };
  return (
    <Dialog open title={`${KIND[kind]} erfassen`} onClose={onClose} footer={<><Button onClick={onClose}>Abbrechen</Button><Button variant="primary" onClick={save}>Speichern</Button></>}>
      <div className="flex flex-col gap-3">
        <Field label="Titel"><Input aria-label="Titel" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Text"><Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} /></Field>
        <Field label="Raum"><Select value={room} onChange={(e) => setRoom(e.target.value)}><option value="">–</option>{Object.values(data.rooms).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></Field>
      </div>
    </Dialog>
  );
}
