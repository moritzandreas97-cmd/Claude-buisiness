import { ImagePlus, Trash2 } from 'lucide-react';
import { useProject } from '../../store/projectStore';
import { useRun } from '../../store/useRun';
import { useUi } from '../../store/uiStore';
import type { Floor, FloorBackground } from '../../model/types';
import { FilePickButton } from '../../ui/FilePickButton';
import { Button, Field, Select } from '../../ui/primitives';
import { CommitInput, parseNumber, parseSignedLen, fmtMm } from '../../ui/fields';
import { newId } from '../../lib/ids';
import { safeName } from '../../export/csv';

/** Hintergrundbild (z. B. Luftbild) eines Geschosses: nur zur Orientierung, nie als Maßbeleg. */
export function BackgroundControls({ floor }: { floor: Floor }) {
  const { data, project, platform } = useProject();
  const run = useRun();
  const toast = useUi((s) => s.toast);
  const bg = floor.background;
  const images = Object.values(data.documents).filter((d) => d.storage_key && (d.mime?.startsWith('image/') || d.kind === 'photo'));
  const setBg = (patch: Partial<FloorBackground> | null) => run('Hintergrundbild', (tx) => tx.update('floors', floor.id, { background: patch === null ? null : { ...(bg ?? { document_id: '', x: 0, y: 0, width_mm: 30000, rotation: 0, opacity: 0.6, visible: true }), ...patch } }));
  const importImage = async ([f]: File[]) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast('Bitte eine Bilddatei (PNG/JPG) wählen.', 'error'); return; }
    const id = newId();
    const key = `projects/${project!.id}/documents/${id}-${safeName(f.name)}`;
    await platform!.files.put(key, new Uint8Array(await f.arrayBuffer()));
    await run('Hintergrundbild importieren', (tx) => {
      tx.insert('documents', { id, project_id: project!.id, kind: 'photo', title: f.name.replace(/\.[^.]+$/, ''), file_name: f.name, mime: f.type, size: f.size, storage_key: key, description: 'Hintergrundbild Geschoss ' + floor.name });
      tx.update('floors', floor.id, { background: { document_id: id, x: 0, y: (bg?.y ?? 20000), width_mm: bg?.width_mm ?? 31000, rotation: 0, opacity: 0.6, visible: true } });
    });
  };
  return (
    <div className="flex flex-col gap-2.5" data-testid="background-controls">
      <div className="flex flex-wrap gap-1.5">
        <FilePickButton size="sm" accept="image/*" testId="background-input" onFiles={importImage}><ImagePlus size={13} />Bild importieren</FilePickButton>
        {bg && <Button size="sm" variant="ghost" onClick={() => setBg(null)}><Trash2 size={13} />Entfernen</Button>}
      </div>
      {images.length > 0 && (
        <Select aria-label="Hintergrundbild wählen" value={bg?.document_id ?? ''} onChange={(e) => { const v = e.target.value; void setBg(v ? { document_id: v } : null); }}>
          <option value="">– kein Hintergrund –</option>
          {images.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </Select>
      )}
      {bg && (
        <>
          <label className="flex items-center justify-between text-sm"><span>Anzeigen</span><input type="checkbox" checked={bg.visible} onChange={() => setBg({ visible: !bg.visible })} /></label>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Bildbreite (mm)" hint="Näherung, kein Maßbeleg"><CommitInput value={bg.width_mm} parse={parseSignedLen} format={fmtMm} onCommit={(v) => { if ((v as number) <= 0) throw new Error('Breite muss > 0 sein.'); return setBg({ width_mm: v as number }); }} /></Field>
            <Field label="Drehung (°)"><CommitInput value={bg.rotation} parse={parseNumber} onCommit={(v) => setBg({ rotation: v as number })} /></Field>
            <Field label="Links X (mm)"><CommitInput value={bg.x} parse={parseSignedLen} format={fmtMm} onCommit={(v) => setBg({ x: v as number })} /></Field>
            <Field label="Oben Y (mm)"><CommitInput value={bg.y} parse={parseSignedLen} format={fmtMm} onCommit={(v) => setBg({ y: v as number })} /></Field>
          </div>
          <Field label={`Deckkraft ${Math.round(bg.opacity * 100)} %`}><input type="range" min={0.1} max={1} step={0.05} value={bg.opacity} onChange={(e) => setBg({ opacity: Number(e.target.value) })} /></Field>
          <p className="text-[11px] text-muted">Das Bild dient nur zur Orientierung beim Nachzeichnen. Es wird nicht exportiert und liefert keine bestätigten Maße.</p>
        </>
      )}
    </div>
  );
}
