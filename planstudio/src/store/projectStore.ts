import { create } from 'zustand';
import type { Platform } from '../lib/platform';
import { changesToStatements, emptyProjectData, listProjects, loadProjectData, upsertStatement, type AnyRow, type Change, type ProjectData } from '../db/repository';
import { migrate } from '../db/migrate';
import type { Project } from '../model/types';
import { Tx, applyChanges } from './tx';
import { newId, nowIso } from '../lib/ids';

export interface UndoEntry { label: string; changes: Change[]; at: string }
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface ProjectState {
  platform: Platform | null;
  ready: boolean;
  fatal: string | null;
  projects: Project[];
  project: Project | null;
  data: ProjectData;
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  saveState: SaveState;
  lastSavedAt: string | null;
  lastError: string | null;

  init(platform: Platform): Promise<void>;
  refreshProjects(): Promise<void>;
  createProject(name: string, description?: string): Promise<Project>;
  openProject(id: string): Promise<void>;
  closeProject(): void;
  deleteProject(id: string): Promise<void>;
  updateProject(patch: Partial<Project>): Promise<void>;
  mutate<R>(label: string, fn: (tx: Tx) => R, opts?: { undoable?: boolean }): Promise<R>;
  undo(): Promise<void>;
  redo(): Promise<void>;
  save(): Promise<void>;
  clearError(): void;
}

const MAX_UNDO = 300;
let queue: Promise<unknown> = Promise.resolve();
/** Serialisiert alle Schreibvorgänge, damit Reihenfolge und Transaktionen eindeutig sind. */
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const p = queue.then(fn, fn);
  queue = p.catch(() => undefined);
  return p;
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Übersetzt technische SQLite-Fehler in verständliche Meldungen. */
export function friendlyDbError(e: unknown): string {
  const m = errMsg(e);
  if (/FOREIGN KEY/i.test(m)) return 'Verknüpfung ungültig: Ein referenziertes Objekt existiert nicht (mehr).';
  if (/UNIQUE/i.test(m)) return 'Eintrag existiert bereits (Eindeutigkeit verletzt).';
  if (/NOT NULL|CHECK/i.test(m)) return `Pflichtfeld fehlt oder Wert ungültig. (${m})`;
  return m;
}

export const useProject = create<ProjectState>((set, get) => ({
  platform: null,
  ready: false,
  fatal: null,
  projects: [],
  project: null,
  data: emptyProjectData(),
  undoStack: [],
  redoStack: [],
  saveState: 'idle',
  lastSavedAt: null,
  lastError: null,

  async init(platform) {
    try {
      await migrate(platform.db);
      set({ platform });
      await get().refreshProjects();
      set({ ready: true });
    } catch (e) {
      set({ fatal: `Datenbank konnte nicht geöffnet werden: ${errMsg(e)}` });
    }
  },

  async refreshProjects() {
    const db = get().platform!.db;
    set({ projects: await listProjects(db) });
  },

  async createProject(name, description) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Projektname darf nicht leer sein.');
    const db = get().platform!.db;
    const ts = nowIso();
    const project: Project = { id: newId(), name: trimmed, description: description?.trim() || null, budget_cents: null, project_path: null, created_at: ts, updated_at: ts };
    project.project_path = `projects/${project.id}`;
    const building = { id: newId(), project_id: project.id, name: 'Hauptgebäude', description: null, created_at: ts, updated_at: ts };
    const floor = { id: newId(), building_id: building.id, name: 'Erdgeschoss', elevation_mm: 0, height_mm: 2500, sort_order: 0, created_at: ts, updated_at: ts };
    const page = { id: newId(), project_id: project.id, name: 'Blatt 1 – Verteilung', sort_order: 1, created_at: ts, updated_at: ts };
    await enqueue(() => db.batch([
      upsertStatement('projects', project as unknown as AnyRow),
      upsertStatement('buildings', building),
      upsertStatement('floors', floor),
      upsertStatement('schematic_pages', page),
    ]));
    await db.flush();
    await get().refreshProjects();
    return project;
  },

  async openProject(id) {
    const db = get().platform!.db;
    const p = get().projects.find((x) => x.id === id) ?? (await listProjects(db)).find((x) => x.id === id);
    if (!p) throw new Error('Projekt nicht gefunden.');
    const data = await loadProjectData(db, id);
    set({ project: p, data, undoStack: [], redoStack: [], lastError: null });
    try { localStorage.setItem('planstudio.lastProject', id); } catch { /* ignore */ }
  },

  closeProject() {
    void get().save();
    set({ project: null, data: emptyProjectData(), undoStack: [], redoStack: [] });
    try { localStorage.removeItem('planstudio.lastProject'); } catch { /* ignore */ }
  },

  async deleteProject(id) {
    const db = get().platform!.db;
    await enqueue(() => db.batch([{ sql: 'DELETE FROM projects WHERE id = ?', params: [id] }]));
    await db.flush();
    if (get().project?.id === id) get().closeProject();
    await get().refreshProjects();
  },

  async updateProject(patch) {
    const { project, platform } = get();
    if (!project || !platform) return;
    const next = { ...project, ...patch, id: project.id, updated_at: nowIso() };
    if (!next.name?.trim()) throw new Error('Projektname darf nicht leer sein.');
    set({ saveState: 'saving' });
    await enqueue(() => platform.db.batch([upsertStatement('projects', next as unknown as AnyRow)]));
    set({ project: next, saveState: 'saved', lastSavedAt: nowIso() });
    await get().refreshProjects();
  },

  mutate(label, fn, opts = {}) {
    return enqueue(async () => {
      const { platform, project, data } = get();
      if (!platform || !project) throw new Error('Kein Projekt geöffnet.');
      const tx = new Tx(data);
      const result = fn(tx);
      if (tx.changes.length === 0) return result;
      set({ saveState: 'saving' });
      try {
        await platform.db.batch([
          ...changesToStatements(tx.changes, 'forward'),
          { sql: 'UPDATE projects SET updated_at = ? WHERE id = ?', params: [nowIso(), project.id] },
        ]);
      } catch (e) {
        const msg = friendlyDbError(e);
        set({ saveState: 'error', lastError: `${label}: ${msg}` });
        throw new Error(msg);
      }
      const entry: UndoEntry = { label, changes: tx.changes, at: nowIso() };
      set((s) => ({
        data: applyChanges(s.data, tx.changes, 'forward'),
        undoStack: opts.undoable === false ? s.undoStack : [...s.undoStack, entry].slice(-MAX_UNDO),
        redoStack: opts.undoable === false ? s.redoStack : [],
        saveState: 'saved',
        lastSavedAt: nowIso(),
        lastError: null,
      }));
      return result;
    });
  },

  undo() {
    return enqueue(async () => {
      const { undoStack, platform } = get();
      const entry = undoStack[undoStack.length - 1];
      if (!entry || !platform) return;
      try {
        await platform.db.batch(changesToStatements(entry.changes, 'backward'));
      } catch (e) {
        set({ saveState: 'error', lastError: `Rückgängig fehlgeschlagen: ${friendlyDbError(e)}` });
        return;
      }
      set((s) => ({
        data: applyChanges(s.data, entry.changes, 'backward'),
        undoStack: s.undoStack.slice(0, -1),
        redoStack: [...s.redoStack, entry],
        saveState: 'saved', lastSavedAt: nowIso(),
      }));
    });
  },

  redo() {
    return enqueue(async () => {
      const { redoStack, platform } = get();
      const entry = redoStack[redoStack.length - 1];
      if (!entry || !platform) return;
      try {
        await platform.db.batch(changesToStatements(entry.changes, 'forward'));
      } catch (e) {
        set({ saveState: 'error', lastError: `Wiederholen fehlgeschlagen: ${friendlyDbError(e)}` });
        return;
      }
      set((s) => ({
        data: applyChanges(s.data, entry.changes, 'forward'),
        redoStack: s.redoStack.slice(0, -1),
        undoStack: [...s.undoStack, entry],
        saveState: 'saved', lastSavedAt: nowIso(),
      }));
    });
  },

  async save() {
    const { platform } = get();
    if (!platform) return;
    set({ saveState: 'saving' });
    try {
      await enqueue(() => platform.db.flush());
      set({ saveState: 'saved', lastSavedAt: nowIso() });
    } catch (e) {
      set({ saveState: 'error', lastError: `Speichern fehlgeschlagen: ${errMsg(e)}` });
    }
  },

  clearError: () => set({ lastError: null }),
}));

/** Hilfsfunktion außerhalb von React. */
export const mutate = <R,>(label: string, fn: (tx: Tx) => R) => useProject.getState().mutate(label, fn);
