import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import initSqlJs from 'sql.js';
import { memoryPlatform } from './helpers';
import { restoreBackup, createBackup } from '../../src/export/backup';
import { loadProjectData } from '../../src/db/repository';
import { SqlJsDriver } from '../../src/db/sqljsDriver';
import { MIGRATIONS } from '../../src/db/migrations';
import { migrate } from '../../src/db/migrate';
import { useProject } from '../../src/store/projectStore';

(globalThis as any).localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
// Projektdaten liegen nicht im Repository → dateiabhängige Tests nur lokal.
const FILE = 'data/Lebenswerk-Adorf-Bestandsrekonstruktion.lapb.json';
const HAS_FILE = existsSync(FILE);

describe('Bestandsaufnahme Adorf', () => {
  it.skipIf(!HAS_FILE)('Importdatei lässt sich in SQLite wiederherstellen; keine erfundene Geometrie', async () => {
    const p = await memoryPlatform();
    const res = await restoreBackup(p, JSON.parse(readFileSync(FILE, 'utf8')));
    const d = await loadProjectData(p.db, res.projectId);
    const rooms = Object.values(d.rooms);
    expect(rooms.length).toBeGreaterThan(0);
    expect(rooms.every((r) => r.polygon === null && r.area_m2 === null)).toBe(true);
    expect(rooms.every((r) => !!r.certainty)).toBe(true);
    expect(Object.values(d.components)).toHaveLength(0);
    // Jeder Quellenverweis zeigt auf ein vorhandenes Objekt
    for (const ref of Object.values(d.source_refs)) {
      const table = (d as unknown as Record<string, Record<string, unknown>>)[ref.ref_table];
      expect(table?.[ref.ref_id], `${ref.ref_table}/${ref.ref_id}`).toBeTruthy();
    }
    // Jede Raumkarte hat mindestens eine Quelle
    const withRef = new Set(Object.values(d.source_refs).filter((r) => r.ref_table === 'rooms').map((r) => r.ref_id));
    expect(rooms.filter((r) => !withRef.has(r.id)).map((r) => r.code ?? r.name)).toEqual([]);
    // KI-Infografik ist kein Beleg und wird nirgends referenziert
    // Quellen mit „kein Beleg“ werden nirgends als Nachweis referenziert
    const noEvidence = new Set(Object.values(d.sources).filter((s) => !s.use_as_evidence).map((s) => s.id));
    expect(Object.values(d.source_refs).some((r) => noEvidence.has(r.source_id))).toBe(false);
    // Raum-IDs eindeutig
    const codes = rooms.map((r) => r.code).filter(Boolean);
    expect(new Set(codes).size).toBe(codes.length);
    const ic = await p.db.select<{ integrity_check: string }>('PRAGMA integrity_check');
    expect(ic[0].integrity_check).toBe('ok');
    // Zweiter Import erzeugt eine Kopie, überschreibt nichts
    const res2 = await restoreBackup(p, JSON.parse(readFileSync(FILE, 'utf8')));
    expect(res2.asCopy).toBe(true);
    expect((await p.db.select('SELECT id FROM projects'))).toHaveLength(2);
    // Backup → Wiederherstellung bewahrt Quellenverweise (IDs neu gemappt)
    const b = JSON.parse(JSON.stringify(await createBackup(p, res.projectId)));
    const res3 = await restoreBackup(p, b);
    const d3 = await loadProjectData(p.db, res3.projectId);
    for (const ref of Object.values(d3.source_refs)) expect((d3 as any)[ref.ref_table][ref.ref_id]).toBeTruthy();
  });

  it('bestehende v1-Datenbank wird verlustfrei auf v2 aktualisiert', async () => {
    const SQL = await initSqlJs();
    const db = await SqlJsDriver.create(SQL, { persist: false });
    await db.script(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT, applied_at TEXT NOT NULL);`);
    await db.script(MIGRATIONS[0].sql + `\nINSERT INTO schema_migrations VALUES (1,'v1','x');`);
    await db.batch([{ sql: "INSERT INTO projects VALUES ('p','Alt',NULL,NULL,NULL,'x','x')" }, { sql: "INSERT INTO buildings VALUES ('b','p','B',NULL,'x','x')" },
      { sql: "INSERT INTO floors (id,building_id,name,created_at,updated_at) VALUES ('f','b','EG','x','x')" }, { sql: "INSERT INTO rooms (id,floor_id,name,created_at,updated_at) VALUES ('r','f','Küche','x','x')" }]);
    expect(await migrate(db)).toBe(MIGRATIONS[MIGRATIONS.length - 1].version);
    const d = await loadProjectData(db, 'p');
    expect(d.rooms.r.name).toBe('Küche');
    expect(d.rooms.r.certainty).toBeNull();
    expect(d.floors.f.background).toBeNull();
  });

  it('Löschen eines Raums entfernt Quellenverweise und Verbindungen; Undo stellt alles her', async () => {
    const p = await memoryPlatform();
    useProject.setState({ platform: null, project: null, projects: [] });
    await useProject.getState().init(p);
    const proj = await useProject.getState().createProject('Bestandstest');
    await useProject.getState().openProject(proj.id);
    const floor = Object.values(useProject.getState().data.floors)[0];
    const ids = await useProject.getState().mutate('setup', (tx) => {
      const src = tx.insert('sources', { project_id: proj.id, kind: 'video', file_name: 'rundgang.mp4' });
      const a = tx.insert('rooms', { floor_id: floor.id, name: 'Flur', certainty: 'nutzerangabe', polygon: null });
      const b = tx.insert('rooms', { floor_id: floor.id, code: 'R-02', name: 'Bad', certainty: 'beobachtet', polygon: null });
      const l = tx.insert('room_links', { project_id: proj.id, from_room_id: a.id, to_room_id: b.id, kind: 'tuer', certainty: 'hypothese' });
      tx.insert('room_links', { project_id: proj.id, from_room_id: a.id, to_label: 'Hof', kind: 'aussen', certainty: 'beobachtet' });
      tx.insert('source_refs', { source_id: src.id, ref_table: 'rooms', ref_id: a.id, locator: '00:42' });
      tx.insert('source_refs', { source_id: src.id, ref_table: 'room_links', ref_id: l.id, locator: '00:50' });
      return { a: a.id, src: src.id };
    });
    await useProject.getState().mutate('del', (tx) => tx.remove('rooms', ids.a));
    let d = useProject.getState().data;
    expect(Object.keys(d.room_links)).toHaveLength(0);
    expect(Object.keys(d.source_refs)).toHaveLength(0);
    let db = await loadProjectData(p.db, proj.id);
    expect(Object.keys(db.source_refs)).toHaveLength(0);
    await useProject.getState().undo();
    d = useProject.getState().data;
    expect(Object.keys(d.room_links)).toHaveLength(2);
    expect(Object.keys(d.source_refs)).toHaveLength(2);
    db = await loadProjectData(p.db, proj.id);
    expect(db.room_links).toEqual(d.room_links);
    expect(db.source_refs).toEqual(d.source_refs);
    // Selbstverbindung und Verbindung ohne Ziel werden von der Datenbank abgelehnt
    await expect(useProject.getState().mutate('bad', (tx) => tx.insert('room_links', { project_id: proj.id, from_room_id: ids.a, to_room_id: ids.a }))).rejects.toThrow();
    await expect(useProject.getState().mutate('bad2', (tx) => tx.insert('room_links', { project_id: proj.id, from_room_id: ids.a }))).rejects.toThrow();
  });
});
