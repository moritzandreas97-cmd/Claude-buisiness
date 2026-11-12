import { describe, expect, it } from 'vitest';
import { Tx, applyChanges } from '../../src/store/tx';
import { emptyProjectData, type ProjectData } from '../../src/db/repository';
import * as ops from '../../src/features/plan/ops';
import type { OpeningGeom, WallGeom } from '../../src/model/types';
import { parseLength, polygonArea, toModel, toScreen, wallLength } from '../../src/model/geometry';
import { computeAutoDemand, syncAutoMaterials, possibleDuplicates } from '../../src/model/materials';
import { toCsv } from '../../src/export/csv';
import { chooseSheet } from '../../src/export/planExport';

function base(): { data: ProjectData; floor: string } {
  const data = emptyProjectData();
  const ts = 'x';
  data.buildings.b = { id: 'b', project_id: 'p', name: 'B', description: null, created_at: ts, updated_at: ts };
  data.floors.f = { id: 'f', building_id: 'b', name: 'EG', elevation_mm: 0, height_mm: 2500, sort_order: 0, background: null, created_at: ts, updated_at: ts };
  return { data, floor: 'f' };
}
const run = <R,>(d: ProjectData, fn: (tx: Tx) => R) => { const tx = new Tx(d); const r = fn(tx); return { r, data: applyChanges(d, tx.changes, 'forward'), tx }; };

describe('Geometrie & Einheiten', () => {
  it('parst Längeneingaben in mm', () => {
    expect(parseLength('3650')).toBe(3650);
    expect(parseLength('365cm')).toBe(3650);
    expect(parseLength('3,65m')).toBe(3650);
    expect(parseLength('3.65 m')).toBe(3650);
    expect(parseLength('abc')).toBeNull();
  });
  it('Modell↔Bildschirm-Transformation ist umkehrbar (y nach oben)', () => {
    const v = { scale: 0.1, ox: 50, oy: 500 };
    const p = { x: 1234, y: 567 };
    const s = toScreen(v, p);
    expect(s.y).toBeLessThan(500);
    const back = toModel(v, s);
    expect(back.x).toBeCloseTo(1234); expect(back.y).toBeCloseTo(567);
  });
  it('Polygonfläche', () => { expect(polygonArea([{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 }])).toBe(12_000_000); });
});

describe('Wände & Öffnungen', () => {
  it('lehnt zu kurze Wand und zu dünne Wand ab', () => {
    const { data, floor } = base();
    expect(() => run(data, (tx) => ops.addWall(tx, floor, { x: 0, y: 0 }, { x: 10, y: 0 }, 240, 2500))).toThrow(/zu kurz/);
    expect(() => run(data, (tx) => ops.addWall(tx, floor, { x: 0, y: 0 }, { x: 1000, y: 0 }, 5, 2500))).toThrow(/Wandstärke/);
  });
  it('Wandlänge ändern zieht angeschlossene Wand mit', () => {
    const { data, floor } = base();
    let d = run(data, (tx) => { ops.addWall(tx, floor, { x: 0, y: 0 }, { x: 4000, y: 0 }, 240, 2500); ops.addWall(tx, floor, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, 240, 2500); }).data;
    const [w1, w2] = Object.values(d.components);
    d = run(d, (tx) => ops.setWallLength(tx, w1.id, 5000)).data;
    expect(wallLength(d.components[w1.id].geometry as WallGeom)).toBeCloseTo(5000);
    expect((d.components[w2.id].geometry as WallGeom).x1).toBeCloseTo(5000);
  });
  it('Öffnungen: Validierung, Überschneidung, Mitbewegung mit der Wand', () => {
    const { data, floor } = base();
    let d = run(data, (tx) => ops.addWall(tx, floor, { x: 0, y: 0 }, { x: 3000, y: 0 }, 240, 2500)).data;
    const wall = Object.values(d.components)[0];
    expect(() => run(d, (tx) => ops.addOpening(tx, wall.id, 'door', 100))).toThrow(/passt/);
    d = run(d, (tx) => ops.addOpening(tx, wall.id, 'door', 1000)).data;
    expect(() => run(d, (tx) => ops.addOpening(tx, wall.id, 'window', 1300))).toThrow(/überschneidet/);
    const door = Object.values(d.components).find((c) => c.type === 'door')!;
    d = run(d, (tx) => ops.moveSelection(tx, [{ table: 'components', id: wall.id }], { x: 500, y: 700 })).data;
    expect((d.components[door.id].geometry as OpeningGeom).offset).toBe(1000); // relativ zur Wand
    expect((d.components[wall.id].geometry as WallGeom).y1).toBe(700);
    // Wand kürzen: Tür wird an das Wandende geschoben; zu kurz → abgelehnt
    d = run(d, (tx) => ops.setWallLength(tx, wall.id, 1200)).data;
    expect((d.components[door.id].geometry as OpeningGeom).offset).toBeCloseTo(1200 - 885 / 2);
    expect(() => run(d, (tx) => ops.setWallLength(tx, wall.id, 800))).toThrow(/kürzer/);
  });
  it('Kopieren einer Wand kopiert ihre Öffnungen; Löschen entfernt sie', () => {
    const { data, floor } = base();
    let d = run(data, (tx) => { const w = ops.addWall(tx, floor, { x: 0, y: 0 }, { x: 3000, y: 0 }, 240, 2500); ops.addOpening(tx, w.id, 'window', 1500); }).data;
    const wall = Object.values(d.components).find((c) => c.type === 'wall')!;
    d = run(d, (tx) => ops.duplicateSelection(tx, [{ table: 'components', id: wall.id }], { x: 0, y: 2000 })).data;
    expect(Object.values(d.components).filter((c) => c.type === 'window')).toHaveLength(2);
    d = run(d, (tx) => ops.deleteSelection(tx, [{ table: 'components', id: wall.id }])).data;
    expect(Object.values(d.components)).toHaveLength(2);
  });
  it('Planobjekt erhält Raum und fortlaufende BMK', () => {
    const { data, floor } = base();
    let d = run(data, (tx) => ops.addRoom(tx, floor, [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 }], 'Bad')).data;
    d = run(d, (tx) => { ops.addPlanObject(tx, floor, 'socket', { x: 100, y: 100 }); ops.addPlanObject(tx, floor, 'socket', { x: 5000, y: 100 }); }).data;
    const objs = Object.values(d.plan_objects);
    expect(objs.map((o) => o.label).sort()).toEqual(['-XD1', '-XD2']);
    expect(objs.filter((o) => o.room_id).length).toBe(1);
  });
});

describe('Material', () => {
  it('erzeugt Bedarf nur aus Planung und zählt nicht doppelt', () => {
    const { data, floor } = base();
    let d = run(data, (tx) => {
      ops.addPlanObject(tx, floor, 'socket', { x: 0, y: 0 });
      ops.addPlanObject(tx, floor, 'socket_multi', { x: 0, y: 500 }); // 3 Einsätze
      ops.addLine(tx, floor, { discipline: 'electrical', line_type: 'cable', points: [{ x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 3000, y: 1500 }], props: { cable: 'NYM-J 3x1,5' } });
    }).data;
    const demand = computeAutoDemand(d);
    expect(demand.find((x) => x.name.startsWith('Schutzkontakt'))!.qty).toBe(4);
    expect(demand.find((x) => x.name.includes('NYM-J 3x1,5'))!.qty).toBe(4.5);
    d = run(d, (tx) => syncAutoMaterials(tx, 'p', demand)).data;
    const r = run(d, (tx) => syncAutoMaterials(tx, 'p', computeAutoDemand(d)));
    expect(r.r).toEqual({ created: 0, updated: 0, zeroed: 0 });
    expect(Object.values(r.data.materials)).toHaveLength(2);
    expect(Object.values(r.data.materials).every((m) => m.unit_price_cents === null)).toBe(true);
    const d2 = run(r.data, (tx) => tx.insert('materials', { project_id: 'p', name: 'Schutzkontaktsteckdose (Einsatz)', unit: 'Stk', required_qty: 2 })).data;
    expect(possibleDuplicates(Object.values(d2.materials)).size).toBe(1);
  });
});

describe('Export', () => {
  it('CSV: Semikolon, Quoting, Formel-Schutz, BOM', () => {
    const csv = toCsv([{ a: 'x;y', b: '=SUM(1)', c: 1.5 }]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"x;y"');
    expect(csv).toContain("'=SUM(1)");
    expect(csv).toContain('1,5');
  });
  it('Maßstabswahl: 10 × 8 m passt auf A4 in 1:50 nicht → 1:75', () => {
    expect(chooseSheet(10000 + 1600, 8000 + 1600)).toEqual({ paper: 'A4', denominator: 75, fits: true });
    expect(chooseSheet(4000, 3000)).toEqual({ paper: 'A4', denominator: 20, fits: true });
    expect(chooseSheet(30000, 20000).paper).toBe('A3');
  });
});
