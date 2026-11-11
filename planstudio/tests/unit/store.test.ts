import { beforeEach, describe, expect, it } from 'vitest';
import { memoryPlatform } from './helpers';
import { useProject } from '../../src/store/projectStore';
import { SqlJsDriver } from '../../src/db/sqljsDriver';
import initSqlJs from 'sql.js';
import { migrate } from '../../src/db/migrate';
import { loadProjectData } from '../../src/db/repository';

(globalThis as any).localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

async function fresh() {
  const p = await memoryPlatform();
  useProject.setState({ platform: null, project: null, projects: [], undoStack: [], redoStack: [] });
  await useProject.getState().init(p);
  return p;
}

describe('Projekt & Persistenz', () => {
  beforeEach(async () => { await fresh(); });

  it('erstellt Projekt mit Gebäude, Geschoss und öffnet es wieder', async () => {
    const s = useProject.getState();
    const p = await s.createProject('Lebenswerk Adorf');
    await useProject.getState().openProject(p.id);
    const d = useProject.getState().data;
    expect(Object.values(d.buildings)).toHaveLength(1);
    expect(Object.values(d.floors)[0].name).toBe('Erdgeschoss');
  });

  it('lehnt leeren Projektnamen ab', async () => {
    await expect(useProject.getState().createProject('  ')).rejects.toThrow();
  });

  it('Wand + Tür: Kaskadenlöschung und Undo/Redo stellen alles wieder her', async () => {
    const p = await useProject.getState().createProject('T');
    await useProject.getState().openProject(p.id);
    const floor = Object.values(useProject.getState().data.floors)[0];
    const wall = await useProject.getState().mutate('Wand', (tx) => tx.insert('components', { floor_id: floor.id, type: 'wall', geometry: { x1: 0, y1: 0, x2: 4000, y2: 0, thickness: 240, height: 2500 }, status: 'geplant' }));
    await useProject.getState().mutate('Tür', (tx) => tx.insert('components', { floor_id: floor.id, type: 'door', host_id: wall.id, geometry: { offset: 1000, width: 885, height: 2010, sill: 0, flip: 0, side: 0 }, status: 'geplant' }));
    expect(Object.values(useProject.getState().data.components)).toHaveLength(2);
    await useProject.getState().mutate('Löschen', (tx) => tx.remove('components', wall.id));
    expect(Object.values(useProject.getState().data.components)).toHaveLength(0);
    const db = useProject.getState().platform!.db;
    expect((await db.select('SELECT * FROM components'))).toHaveLength(0);
    await useProject.getState().undo();
    expect(Object.values(useProject.getState().data.components)).toHaveLength(2);
    expect((await db.select('SELECT * FROM components'))).toHaveLength(2);
    await useProject.getState().redo();
    expect((await db.select('SELECT * FROM components'))).toHaveLength(0);
    await useProject.getState().undo();
    // Memory und DB identisch
    const reloaded = await loadProjectData(db, p.id);
    expect(reloaded.components).toEqual(useProject.getState().data.components);
  });

  it('SET NULL: Löschen eines Stromkreises entfernt die Zuordnung, Undo stellt sie her', async () => {
    const p = await useProject.getState().createProject('T');
    await useProject.getState().openProject(p.id);
    const floor = Object.values(useProject.getState().data.floors)[0];
    const c = await useProject.getState().mutate('SK', (tx) => tx.insert('circuits', { project_id: p.id, designation: '-F1', status: 'geplant' }));
    const o = await useProject.getState().mutate('Steckdose', (tx) => tx.insert('plan_objects', { floor_id: floor.id, discipline: 'electrical', type: 'socket', x: 100, y: 200, rotation: 0, circuit_id: c.id, status: 'geplant' }));
    await useProject.getState().mutate('del', (tx) => tx.remove('circuits', c.id));
    expect(useProject.getState().data.plan_objects[o.id].circuit_id).toBeNull();
    await useProject.getState().undo();
    expect(useProject.getState().data.plan_objects[o.id].circuit_id).toBe(c.id);
  });

  it('fehlerhafte Transaktion wird komplett zurückgerollt', async () => {
    const p = await useProject.getState().createProject('T');
    await useProject.getState().openProject(p.id);
    const before = useProject.getState().data;
    await expect(useProject.getState().mutate('kaputt', (tx) => {
      tx.insert('tasks', { project_id: p.id, title: 'ok', priority: 'mittel', status: 'offen' });
      tx.insert('tasks', { project_id: 'GIBTESNICHT', title: 'x', priority: 'mittel', status: 'offen' });
    })).rejects.toThrow();
    expect(useProject.getState().data).toBe(before);
    expect(await useProject.getState().platform!.db.select('SELECT * FROM tasks')).toHaveLength(0);
  });

  it('Daten überleben „Neustart“ (DB-Export → neue Instanz)', async () => {
    const p = await useProject.getState().createProject('Lebenswerk Adorf');
    await useProject.getState().openProject(p.id);
    await useProject.getState().mutate('Aufgabe', (tx) => tx.insert('tasks', { project_id: p.id, title: 'Elektrik prüfen', priority: 'hoch', status: 'offen' }));
    const bytes = (useProject.getState().platform!.db as SqlJsDriver).exportBytes();
    const SQL = await initSqlJs();
    const db2 = await SqlJsDriver.create(SQL, { persist: false, data: bytes });
    await migrate(db2);
    const d = await loadProjectData(db2, p.id);
    expect(Object.values(d.tasks)[0].title).toBe('Elektrik prüfen');
    expect(Object.values(d.floors)).toHaveLength(1);
  });
});
