import { useMemo, useState } from 'react';
import { Plus, Download, Trash2, Check, LayoutList, Columns3, Lock } from 'lucide-react';
import { useProject } from '../../store/projectStore';
import { useUi } from '../../store/uiStore';
import { useRun } from '../../store/useRun';
import { Badge, Button, Dialog, Empty, Field, Input, PageHeader, Select, Table, Td, Textarea, cn } from '../../ui/primitives';
import { PRIORITIES, TASK_STATUS, TRADES, labelOf, symbolDef } from '../../model/catalog';
import type { Priority, Task, TaskStatus } from '../../model/types';
import { date, eur, parseEuro, centsToInput } from '../../lib/format';
import { exportText, toCsv } from '../../export/csv';
import { nowIso } from '../../lib/ids';

type GroupBy = 'none' | 'room' | 'trade' | 'status' | 'priority' | 'phase';
const PRIO_TONE: Record<string, 'default' | 'accent' | 'warn' | 'danger'> = { niedrig: 'default', mittel: 'accent', hoch: 'warn', kritisch: 'danger' };
const PRIO_ORDER: Record<string, number> = { kritisch: 0, hoch: 1, mittel: 2, niedrig: 3 };

export function isBlocked(taskId: string, data: ReturnType<typeof useProject.getState>['data']) {
  return Object.values(data.task_deps).some((d) => d.task_id === taskId && data.tasks[d.depends_on_id] && data.tasks[d.depends_on_id].status !== 'erledigt');
}

export function TasksPage() {
  const { data, project } = useProject();
  const ui = useUi();
  const run = useRun();
  const [edit, setEdit] = useState<Task | 'new' | null>(null);
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [f, setF] = useState({ q: '', room: '', trade: '', status: '', priority: '', phase: '', hideDone: false });
  const tasks = useMemo(() => Object.values(data.tasks).filter((t) =>
    (!f.q || (t.title + ' ' + (t.description ?? '')).toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.room || t.room_id === f.room) && (!f.trade || t.trade === f.trade) && (!f.status || t.status === f.status) &&
    (!f.priority || t.priority === f.priority) && (!f.phase || t.phase_id === f.phase) && (!f.hideDone || t.status !== 'erledigt'),
  ).sort((a, b) => (a.status === 'erledigt' ? 1 : 0) - (b.status === 'erledigt' ? 1 : 0) || PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority] || a.created_at.localeCompare(b.created_at)), [data.tasks, f]);

  const groupKey = (t: Task): string => {
    switch (groupBy) {
      case 'room': return t.room_id ? data.rooms[t.room_id]?.name ?? '–' : 'Ohne Raum';
      case 'trade': return t.trade ?? 'Ohne Gewerk';
      case 'status': return labelOf(TASK_STATUS, t.status);
      case 'priority': return labelOf(PRIORITIES, t.priority);
      case 'phase': return t.phase_id ? data.phases[t.phase_id]?.name ?? '–' : 'Ohne Bauabschnitt';
      default: return '';
    }
  };
  const groups = new Map<string, Task[]>();
  for (const t of tasks) { const k = groupKey(t); groups.set(k, [...(groups.get(k) ?? []), t]); }

  const setStatus = (t: Task, status: TaskStatus) => run('Aufgabenstatus', (tx) => tx.update('tasks', t.id, { status, done_at: status === 'erledigt' ? nowIso() : null }));
  const exportCsv = async () => {
    const rows = tasks.map((t) => ({ Titel: t.title, Status: labelOf(TASK_STATUS, t.status), Priorität: labelOf(PRIORITIES, t.priority), Gewerk: t.trade ?? '', Raum: t.room_id ? data.rooms[t.room_id]?.name ?? '' : '', Bauabschnitt: t.phase_id ? data.phases[t.phase_id]?.name ?? '' : '', 'Kosten (€)': t.cost_cents != null ? t.cost_cents / 100 : '', Fällig: t.due_date ?? '', Erledigt: t.done_at ? date(t.done_at) : '', Abhängig_von: Object.values(data.task_deps).filter((d) => d.task_id === t.id).map((d) => data.tasks[d.depends_on_id]?.title).join(', '), Beschreibung: t.description ?? '', ID: t.id }));
    ui.toast(`Exportiert: ${await exportText(`${project!.name}-Aufgaben.csv`, toCsv(rows), 'text/csv')}`, 'success');
  };

  const roomOpts = Object.values(data.rooms).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Aufgaben" subtitle={`${Object.values(data.tasks).filter((t) => t.status !== 'erledigt').length} offen · ${Object.values(data.tasks).filter((t) => t.status === 'erledigt').length} erledigt`}
        actions={<>
          <div className="flex rounded-md border border-line"><Button size="sm" variant="ghost" active={view === 'list'} onClick={() => setView('list')}><LayoutList size={14} />Liste</Button><Button size="sm" variant="ghost" active={view === 'kanban'} onClick={() => setView('kanban')}><Columns3 size={14} />Kanban</Button></div>
          <Button onClick={exportCsv}><Download size={14} />CSV</Button>
          <Button variant="primary" onClick={() => setEdit('new')}><Plus size={15} />Aufgabe</Button>
        </>} />
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-8">
        <Input className="col-span-2" placeholder="Suchen …" aria-label="Aufgaben suchen" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        <Select aria-label="Filter Raum" value={f.room} onChange={(e) => setF({ ...f, room: e.target.value })}><option value="">Alle Räume</option>{roomOpts.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select>
        <Select aria-label="Filter Gewerk" value={f.trade} onChange={(e) => setF({ ...f, trade: e.target.value })}><option value="">Alle Gewerke</option>{TRADES.map((t) => <option key={t}>{t}</option>)}</Select>
        <Select aria-label="Filter Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">Alle Status</option>{TASK_STATUS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}</Select>
        <Select aria-label="Filter Priorität" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}><option value="">Alle Prioritäten</option>{PRIORITIES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}</Select>
        <Select aria-label="Gruppieren" value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)}><option value="none">Keine Gruppierung</option><option value="room">nach Raum</option><option value="trade">nach Gewerk</option><option value="status">nach Status</option><option value="priority">nach Priorität</option><option value="phase">nach Bauabschnitt</option></Select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.hideDone} onChange={(e) => setF({ ...f, hideDone: e.target.checked })} />Erledigte ausblenden</label>
      </div>

      {Object.keys(data.tasks).length === 0 ? <Empty>Noch keine Aufgaben. Mit „+ Aufgabe“ anlegen.</Empty> : view === 'kanban' ? (
        <div className="grid gap-3 md:grid-cols-5">
          {TASK_STATUS.map((s) => (
            <div key={s.v} className="rounded-xl border border-line bg-panel2 p-2" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData('text/task'); const t = data.tasks[id]; if (t && t.status !== s.v) void setStatus(t, s.v); }}>
              <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-muted">{s.label}<span>{tasks.filter((t) => t.status === s.v).length}</span></div>
              <div className="flex min-h-20 flex-col gap-2">
                {tasks.filter((t) => t.status === s.v).map((t) => (
                  <div key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/task', t.id)} onClick={() => setEdit(t)} className="cursor-pointer rounded-lg border border-line bg-panel p-2 text-sm hover:border-accent/60">
                    <div className="flex items-start gap-1 font-medium">{isBlocked(t.id, data) && <Lock size={12} className="mt-1 shrink-0 text-warn" />}{t.title}</div>
                    <div className="mt-1 flex flex-wrap gap-1"><Badge tone={PRIO_TONE[t.priority]}>{labelOf(PRIORITIES, t.priority)}</Badge>{t.trade && <Badge>{t.trade}</Badge>}{t.room_id && <Badge>{data.rooms[t.room_id]?.name}</Badge>}</div>
                    <select aria-label="Status ändern" className="mt-1.5 h-7 w-full rounded border border-line bg-panel2 text-xs md:hidden" value={t.status} onClick={(e) => e.stopPropagation()} onChange={(e) => setStatus(t, e.target.value as TaskStatus)}>{TASK_STATUS.map((x) => <option key={x.v} value={x.v}>{x.label}</option>)}</select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        [...groups.entries()].map(([g, list]) => (
          <div key={g} className="mb-4">
            {groupBy !== 'none' && <h3 className="mb-1.5 text-sm font-semibold">{g} <span className="text-muted">({list.length})</span></h3>}
            <Table head={['', 'Aufgabe', 'Status', 'Priorität', 'Gewerk', 'Raum', 'Kosten', 'Fällig', '']}>
              {list.map((t) => (
                <tr key={t.id} className={cn(t.status === 'erledigt' && 'opacity-55')}>
                  <Td><button aria-label="Erledigt umschalten" className={cn('flex h-6 w-6 items-center justify-center rounded border touch-lg', t.status === 'erledigt' ? 'border-ok bg-ok text-white' : 'border-line')} onClick={() => setStatus(t, t.status === 'erledigt' ? 'offen' : 'erledigt')}>{t.status === 'erledigt' && <Check size={14} />}</button></Td>
                  <Td><button className="text-left font-medium hover:text-accent" onClick={() => setEdit(t)}>{isBlocked(t.id, data) && <Lock size={12} className="mr-1 inline text-warn" />}{t.title}</button>{t.description && <div className="max-w-md truncate text-xs text-muted">{t.description}</div>}</Td>
                  <Td><select aria-label="Status" className="h-8 rounded border border-line bg-panel px-1 text-xs" value={t.status} onChange={(e) => setStatus(t, e.target.value as TaskStatus)}>{TASK_STATUS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}</select></Td>
                  <Td><Badge tone={PRIO_TONE[t.priority]}>{labelOf(PRIORITIES, t.priority)}</Badge></Td>
                  <Td>{t.trade ?? '–'}</Td><Td>{t.room_id ? data.rooms[t.room_id]?.name : '–'}</Td>
                  <Td className="tabular">{eur(t.cost_cents)}</Td><Td className="whitespace-nowrap">{t.due_date ? date(t.due_date) : '–'}</Td>
                  <Td><Button size="sm" variant="ghost" aria-label="Aufgabe löschen" onClick={() => run('Aufgabe löschen', (tx) => tx.remove('tasks', t.id))}><Trash2 size={13} /></Button></Td>
                </tr>
              ))}
            </Table>
          </div>
        ))
      )}
      {edit && <TaskDialog task={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

export function TaskDialog({ task, onClose, defaults }: { task: Task | null; onClose(): void; defaults?: Partial<Task> }) {
  const { data, project } = useProject();
  const run = useRun();
  const toast = useUi((s) => s.toast);
  const init = task ?? ({ title: '', description: '', room_id: null, trade: null, priority: 'mittel', status: 'offen', cost_cents: null, due_date: null, phase_id: null, plan_object_id: null, ...defaults } as Partial<Task>);
  const [v, setV] = useState({ ...init, cost: centsToInput(init.cost_cents) });
  const depsInit = task ? Object.values(data.task_deps).filter((d) => d.task_id === task.id).map((d) => d.depends_on_id) : [];
  const [deps, setDeps] = useState<string[]>(depsInit);
  const linkedMaterials = task ? Object.values(data.materials).filter((m) => m.task_id === task.id) : [];
  const [addMat, setAddMat] = useState('');

  const save = async () => {
    if (!v.title?.trim()) { toast('Titel ist erforderlich.', 'error'); return; }
    const cost = parseEuro(v.cost ?? '');
    if (Number.isNaN(cost)) { toast('Ungültiger Kostenbetrag.', 'error'); return; }
    // Zyklische Abhängigkeiten verhindern
    if (task) {
      const reaches = (from: string, target: string, seen = new Set<string>()): boolean => {
        if (from === target) return true; if (seen.has(from)) return false; seen.add(from);
        return Object.values(data.task_deps).filter((d) => d.task_id === from && d.task_id !== task.id).some((d) => reaches(d.depends_on_id, target, seen));
      };
      if (deps.some((d) => reaches(d, task.id))) { toast('Zyklische Abhängigkeit – nicht zulässig.', 'error'); return; }
    }
    const fields = { title: v.title.trim(), description: v.description?.trim() || null, room_id: v.room_id || null, trade: v.trade || null, priority: v.priority as Priority, status: v.status as TaskStatus, cost_cents: cost, due_date: v.due_date || null, phase_id: v.phase_id || null, plan_object_id: v.plan_object_id || null };
    const ok = await run(task ? 'Aufgabe bearbeiten' : 'Aufgabe anlegen', (tx) => {
      const t = task ? tx.update('tasks', task.id, { ...fields, done_at: fields.status === 'erledigt' ? task.done_at ?? nowIso() : null }) : tx.insert('tasks', { project_id: project!.id, ...fields, done_at: fields.status === 'erledigt' ? nowIso() : null });
      for (const d of tx.all('task_deps').filter((d) => d.task_id === t.id && !deps.includes(d.depends_on_id))) tx.remove('task_deps', d.id);
      for (const dep of deps) if (!tx.all('task_deps').some((d) => d.task_id === t.id && d.depends_on_id === dep)) tx.insert('task_deps', { task_id: t.id, depends_on_id: dep });
      if (addMat) tx.update('materials', addMat, { task_id: t.id });
      return t;
    });
    if (ok) onClose();
  };
  const set = (k: string, val: unknown) => setV({ ...v, [k]: val });
  const others = Object.values(data.tasks).filter((t) => t.id !== task?.id);
  return (
    <Dialog open wide title={task ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'} onClose={onClose} footer={<><Button onClick={onClose}>Abbrechen</Button><Button variant="primary" onClick={save}>Speichern</Button></>}>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Titel" className="md:col-span-2"><Input aria-label="Titel" autoFocus value={v.title ?? ''} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field label="Beschreibung" className="md:col-span-2"><Textarea rows={3} value={v.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
        <Field label="Status"><Select value={v.status} onChange={(e) => set('status', e.target.value)}>{TASK_STATUS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}</Select></Field>
        <Field label="Priorität"><Select value={v.priority} onChange={(e) => set('priority', e.target.value)}>{PRIORITIES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}</Select></Field>
        <Field label="Gewerk"><Select value={v.trade ?? ''} onChange={(e) => set('trade', e.target.value)}><option value="">–</option>{TRADES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Raum"><Select aria-label="Raum" value={v.room_id ?? ''} onChange={(e) => set('room_id', e.target.value)}><option value="">–</option>{Object.values(data.rooms).map((r) => <option key={r.id} value={r.id}>{data.floors[r.floor_id]?.name} · {r.name}</option>)}</Select></Field>
        <Field label="Bauabschnitt"><Select value={v.phase_id ?? ''} onChange={(e) => set('phase_id', e.target.value)}><option value="">–</option>{Object.values(data.phases).sort((a, b) => a.sort_order - b.sort_order).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        <Field label="Planobjekt"><Select value={v.plan_object_id ?? ''} onChange={(e) => set('plan_object_id', e.target.value)}><option value="">–</option>{Object.values(data.plan_objects).map((o) => <option key={o.id} value={o.id}>{o.label} {o.name ?? symbolDef(o.type)?.label}</option>)}</Select></Field>
        <Field label="Geplante Kosten (€)"><Input inputMode="decimal" value={v.cost ?? ''} onChange={(e) => set('cost', e.target.value)} placeholder="z. B. 250,00" /></Field>
        <Field label="Fällig am"><Input type="date" value={v.due_date ?? ''} onChange={(e) => set('due_date', e.target.value)} /></Field>
        <Field label="Abhängig von (muss vorher erledigt sein)" className="md:col-span-2">
          <div className="flex max-h-32 flex-col gap-1 overflow-auto rounded-md border border-line p-2">
            {others.length === 0 && <span className="text-xs text-muted">Keine weiteren Aufgaben.</span>}
            {others.map((t) => <label key={t.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={deps.includes(t.id)} onChange={(e) => setDeps(e.target.checked ? [...deps, t.id] : deps.filter((d) => d !== t.id))} />{t.title}<span className="text-xs text-muted">({labelOf(TASK_STATUS, t.status)})</span></label>)}
          </div>
        </Field>
        <Field label="Materialbezug" className="md:col-span-2">
          <div className="flex flex-col gap-1.5">
            {linkedMaterials.map((m) => <div key={m.id} className="flex items-center justify-between rounded bg-panel2 px-2 py-1 text-sm">{m.name} – {m.required_qty} {m.unit}<Button size="sm" variant="ghost" onClick={() => run('Material lösen', (tx) => tx.update('materials', m.id, { task_id: null }))}>lösen</Button></div>)}
            <Select aria-label="Material zuordnen" value={addMat} onChange={(e) => setAddMat(e.target.value)}><option value="">+ vorhandenes Material zuordnen …</option>{Object.values(data.materials).filter((m) => m.task_id !== task?.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>
          </div>
        </Field>
      </div>
    </Dialog>
  );
}
