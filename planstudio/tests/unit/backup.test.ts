import { describe, expect, it } from 'vitest';
import { memoryPlatform } from './helpers';
import { useProject } from '../../src/store/projectStore';
import { createBackup, restoreBackup } from '../../src/export/backup';
import { loadProjectData } from '../../src/db/repository';
import * as ops from '../../src/features/plan/ops';

(globalThis as any).localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

describe('Backup & Wiederherstellung', () => {
  it('sichert ein Projekt und stellt es als Kopie mit neuen IDs wieder her', async () => {
    const p = await memoryPlatform();
    useProject.setState({ platform: null, project: null, projects: [] });
    await useProject.getState().init(p);
    const proj = await useProject.getState().createProject('Lebenswerk Adorf');
    await useProject.getState().openProject(proj.id);
    const floor = Object.values(useProject.getState().data.floors)[0];
    await useProject.getState().mutate('setup', (tx) => {
      const w = ops.addWall(tx, floor.id, { x: 0, y: 0 }, { x: 5000, y: 0 }, 240, 2500);
      ops.addOpening(tx, w.id, 'door', 1500);
      ops.addRoom(tx, floor.id, [{ x: 0, y: 0 }, { x: 5000, y: 0 }, { x: 5000, y: 4000 }, { x: 0, y: 4000 }], 'Küche');
      tx.insert('documents', { project_id: proj.id, kind: 'photo', title: 'Foto', file_name: 'a.jpg', storage_key: `projects/${proj.id}/documents/x-a.jpg` });
    });
    await p.files.put(`projects/${proj.id}/documents/x-a.jpg`, new Uint8Array([1, 2, 3]));
    const backup = JSON.parse(JSON.stringify(await createBackup(p, proj.id)));
    const res = await restoreBackup(p, backup);
    expect(res.asCopy).toBe(true);
    expect(res.projectId).not.toBe(proj.id);
    const copy = await loadProjectData(p.db, res.projectId);
    const comps = Object.values(copy.components);
    expect(comps).toHaveLength(2);
    const wall = comps.find((c) => c.type === 'wall')!;
    expect(comps.find((c) => c.type === 'door')!.host_id).toBe(wall.id);
    expect(Object.values(copy.rooms)[0].area_m2).toBe(20);
    const doc = Object.values(copy.documents)[0];
    expect(await p.files.get(doc.storage_key!)).toEqual(new Uint8Array([1, 2, 3]));
    // Original unverändert
    const orig = await loadProjectData(p.db, proj.id);
    expect(Object.values(orig.components)).toHaveLength(2);
  });

  it('stellt in leere Datenbank mit Original-IDs wieder her', async () => {
    const p = await memoryPlatform();
    useProject.setState({ platform: null, project: null, projects: [] });
    await useProject.getState().init(p);
    const proj = await useProject.getState().createProject('A');
    const backup = JSON.parse(JSON.stringify(await createBackup(p, proj.id)));
    const p2 = await memoryPlatform();
    const res = await restoreBackup(p2, backup);
    expect(res).toEqual({ projectId: proj.id, asCopy: false });
  });

  it('lehnt fremde Dateien ab', async () => {
    const p = await memoryPlatform();
    await expect(restoreBackup(p, { foo: 1 })).rejects.toThrow(/Keine gültige/);
  });
});
