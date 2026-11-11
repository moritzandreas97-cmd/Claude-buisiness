import type { ProjectData } from '../db/repository';
import { symbolDef, lineTypeDef } from './catalog';
import type { Material } from './types';
import type { Tx } from '../store/tx';

export interface AutoDemand { auto_key: string; name: string; category: string; unit: string; qty: number; notes: string }

/**
 * Leitet den Materialbedarf ausschließlich aus tatsächlich platzierten Planobjekten
 * und gezeichneten Leitungswegen ab. Keine Zuschläge, Verschnitte oder Preise werden erfunden.
 */
export function computeAutoDemand(data: ProjectData): AutoDemand[] {
  const map = new Map<string, AutoDemand>();
  const addQty = (d: Omit<AutoDemand, 'qty'>, qty: number) => {
    const e = map.get(d.auto_key);
    if (e) e.qty += qty; else map.set(d.auto_key, { ...d, qty });
  };
  for (const o of Object.values(data.plan_objects)) {
    const def = symbolDef(o.type);
    if (!def?.material) continue;
    const m = def.material;
    let qty = m.perObject ?? 1;
    if (m.countProp) {
      const n = Number(o.props?.[m.countProp]);
      qty = Number.isFinite(n) && n > 0 ? n : 2;
    }
    addQty({ auto_key: `obj:${m.name}`, name: m.name, category: m.category, unit: m.unit, notes: 'Automatisch aus Planobjekten (Anzahl platzierter Objekte).' }, qty);
  }
  for (const l of Object.values(data.lines)) {
    const def = lineTypeDef(l.line_type);
    const spec = l.line_type === 'cable' ? l.props?.cable : [l.props?.dn, l.props?.material].filter(Boolean).join(' ');
    const name = `${def.label}${spec ? ' ' + spec : ' (Typ/Nennweite nicht festgelegt)'}`;
    addQty({ auto_key: `line:${l.line_type}:${spec ?? ''}`, name, category: l.discipline === 'electrical' ? 'Elektro – Leitungen' : 'Sanitär – Rohre', unit: 'm', notes: 'Automatisch: Summe der gezeichneten Leitungswege (2D-Länge), ohne Verschnitt, Steigungen und Zuschläge.' }, l.length_mm / 1000);
  }
  for (const d of map.values()) d.qty = Math.round(d.qty * 100) / 100;
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

/** Gleicht automatisch erzeugte Materialpositionen ab: keine Duplikate, Preise/Bestand bleiben erhalten. */
export function syncAutoMaterials(tx: Tx, projectId: string, demand: AutoDemand[]) {
  const existing = tx.all('materials').filter((m) => m.source === 'auto');
  const byKey = new Map(existing.map((m) => [m.auto_key, m]));
  let created = 0, updated = 0, zeroed = 0;
  for (const d of demand) {
    const m = byKey.get(d.auto_key);
    if (m) {
      if (m.required_qty !== d.qty || m.name !== d.name) { tx.update('materials', m.id, { required_qty: d.qty, name: d.name }); updated++; }
      byKey.delete(d.auto_key);
    } else {
      tx.insert('materials', { project_id: projectId, name: d.name, category: d.category, unit: d.unit, required_qty: d.qty, stock_qty: 0, status: 'benoetigt', source: 'auto', auto_key: d.auto_key, notes: d.notes, unit_price_cents: null });
      created++;
    }
  }
  for (const m of byKey.values()) {
    if (m.required_qty !== 0) { tx.update('materials', m.id, { required_qty: 0 }); zeroed++; }
  }
  return { created, updated, zeroed };
}

/** Manuelle Positionen, die mit automatisch erzeugten Positionen namensgleich sind (mögliche Doppelzählung). */
export function possibleDuplicates(materials: Material[]): Set<string> {
  const autoNames = new Set(materials.filter((m) => m.source === 'auto').map((m) => m.name.trim().toLowerCase()));
  return new Set(materials.filter((m) => m.source === 'manual' && autoNames.has(m.name.trim().toLowerCase())).map((m) => m.id));
}

export const toOrder = (m: Material) => Math.max(0, m.required_qty - m.stock_qty);
export const materialTotalCents = (m: Material) => (m.unit_price_cents == null ? null : Math.round(m.unit_price_cents * m.required_qty));
