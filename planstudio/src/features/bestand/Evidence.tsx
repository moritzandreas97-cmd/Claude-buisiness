import { useState } from 'react';
import { Plus, Trash2, FileVideo, FileText, Image as ImageIcon, User, Ban } from 'lucide-react';
import { useProject } from '../../store/projectStore';
import { useRun } from '../../store/useRun';
import { CERTAINTY, certaintyDef } from '../../model/catalog';
import type { Certainty, Source } from '../../model/types';
import { Button, Select, cn } from '../../ui/primitives';

export function CertaintyBadge({ v, small }: { v: string | null | undefined; small?: boolean }) {
  const d = certaintyDef(v);
  if (!d) return <span className={cn('rounded px-1.5 py-0.5 text-muted', small ? 'text-[10px]' : 'text-[11px]', 'bg-hover')}>ohne Status</span>;
  return <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 font-medium', small ? 'text-[10px]' : 'text-[11px]')} style={{ background: d.color + '22', color: d.color }}>
    <span className="inline-block h-0 w-3 border-t-2" style={{ borderColor: d.color, borderStyle: d.dash ? 'dashed' : 'solid' }} />{d.label}</span>;
}

export function SourceIcon({ s, size = 13 }: { s: Pick<Source, 'kind' | 'use_as_evidence'>; size?: number }) {
  if (!s.use_as_evidence) return <Ban size={size} className="text-danger" />;
  return s.kind === 'video' ? <FileVideo size={size} /> : s.kind === 'document' ? <FileText size={size} /> : s.kind === 'user' ? <User size={size} /> : <ImageIcon size={size} />;
}

export function CertaintySelect({ value, onChange, label = 'Status / Sicherheit' }: { value: string | null; onChange(v: Certainty | null): void; label?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</span>
      <Select aria-label={label} value={value ?? ''} onChange={(e) => onChange((e.target.value || null) as Certainty | null)}>
        <option value="">– ohne Status –</option>
        {CERTAINTY.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
      </Select>
    </label>
  );
}

/** Quellenverweise eines beliebigen Objekts (Raum, Bauteil, Planobjekt, Verbindung …). */
export function EvidenceList({ table, id, compact }: { table: string; id: string; compact?: boolean }) {
  const data = useProject((s) => s.data);
  const project = useProject((s) => s.project)!;
  const run = useRun();
  const refs = Object.values(data.source_refs).filter((r) => r.ref_table === table && r.ref_id === id);
  const sources = Object.values(data.sources).sort((a, b) => a.file_name.localeCompare(b.file_name, 'de', { numeric: true }));
  const [src, setSrc] = useState('');
  const [loc, setLoc] = useState('');
  const add = async () => {
    if (!src) return;
    const s = data.sources[src];
    const ok = await run('Quelle verknüpfen', (tx) => tx.insert('source_refs', { source_id: src, ref_table: table, ref_id: id, locator: loc.trim() || null, note: s && !s.use_as_evidence ? 'Achtung: Quelle ist als „kein Beleg“ markiert' : null }));
    if (ok) { setLoc(''); setSrc(''); }
  };
  void project;
  return (
    <div className="flex flex-col gap-1.5" data-testid="evidence">
      {refs.length === 0 && <span className="text-xs text-muted">Keine Quelle verknüpft.</span>}
      {refs.map((r) => {
        const s = data.sources[r.source_id];
        return (
          <div key={r.id} className="flex items-start gap-1.5 rounded bg-panel2 px-2 py-1 text-xs">
            {s && <span className="mt-0.5 shrink-0"><SourceIcon s={s} /></span>}
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium" title={s?.file_name}>{s?.file_name ?? 'Quelle gelöscht'}</div>
              {(r.locator || r.note) && <div className="text-muted">{[r.locator, r.note].filter(Boolean).join(' · ')}</div>}
            </div>
            <button aria-label="Quellenverweis entfernen" className="shrink-0 text-muted hover:text-danger" onClick={() => run('Quellenverweis entfernen', (tx) => tx.remove('source_refs', r.id))}><Trash2 size={12} /></button>
          </div>
        );
      })}
      {!compact && sources.length > 0 && (
        <div className="flex flex-col gap-1 rounded border border-dashed border-line p-1.5">
          <Select aria-label="Quelle wählen" className="h-8 text-xs" value={src} onChange={(e) => setSrc(e.target.value)}>
            <option value="">+ Quelle verknüpfen …</option>
            {sources.map((s) => <option key={s.id} value={s.id}>{s.use_as_evidence ? '' : '⚠ '}{s.file_name}</option>)}
          </Select>
          {src && <div className="flex gap-1">
            <input aria-label="Fundstelle" className="h-8 min-w-0 flex-1 rounded border border-line bg-panel px-2 text-xs" placeholder="Zeitstempel / Seite, z. B. 01:23 oder S. 12" value={loc} onChange={(e) => setLoc(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
            <Button size="sm" variant="primary" onClick={add}><Plus size={12} /></Button>
          </div>}
        </div>
      )}
      {!compact && sources.length === 0 && <span className="text-[11px] text-muted">Quellen im Modul „Bestandsaufnahme“ anlegen.</span>}
    </div>
  );
}

/** Abschnitt für das Eigenschaftenfenster */
export function EvidenceSection({ table, id, certainty, onCertainty }: { table: 'rooms' | 'components' | 'plan_objects'; id: string; certainty: string | null; onCertainty(v: Certainty | null): void }) {
  return (
    <div className="border-b border-line px-3 py-3">
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Bestand: Status & Quellen</h4>
      <div className="flex flex-col gap-2.5">
        <CertaintySelect value={certainty} onChange={onCertainty} />
        <EvidenceList table={table} id={id} />
      </div>
    </div>
  );
}
