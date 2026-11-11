import { renderToStaticMarkup } from 'react-dom/server';
import type { ProjectData } from '../db/repository';
import { PlanContent, PRINT, type Layers } from '../features/plan/PlanRenderer';
import { floorPoints } from '../features/plan/ops';
import { bboxOf } from '../model/geometry';

export interface PlanExportOpts { only?: 'electrical' | 'sanitary' | 'architecture' | 'interior'; paper?: 'auto' | 'A4' | 'A3'; layers?: Partial<Layers> }
export interface PlanSheet { svg: string; paper: 'A4' | 'A3'; w: number; h: number; denominator: number; fits: boolean; title: string }

const PAPERS = { A4: { w: 297, h: 210 }, A3: { w: 420, h: 297 } } as const;
const SCALES = [20, 25, 50, 75, 100, 125, 200, 250, 500, 1000, 2000];
const M = 10, TITLE_H = 26;

export function chooseSheet(contentW: number, contentH: number, paper: PlanExportOpts['paper'] = 'auto') {
  const candidates: ('A4' | 'A3')[] = paper === 'A3' ? ['A3'] : paper === 'A4' ? ['A4'] : ['A4', 'A3'];
  for (const p of candidates) {
    const { w, h } = PAPERS[p];
    const aw = w - 2 * M, ah = h - 2 * M - TITLE_H;
    const d = SCALES.find((s) => contentW / s <= aw && contentH / s <= ah);
    if (d && (p === 'A3' || d <= 100 || candidates.length === 1)) return { paper: p, denominator: d, fits: true };
  }
  const p = candidates[candidates.length - 1];
  const { w, h } = PAPERS[p];
  const need = Math.max(contentW / (w - 2 * M), contentH / (h - 2 * M - TITLE_H));
  return { paper: p, denominator: SCALES.find((s) => s >= need) ?? Math.ceil(need), fits: false };
}

/** Erzeugt einen maßstäblichen Planbogen als SVG (Einheiten: Papier-Millimeter). */
export function buildPlanSheet(data: ProjectData, floorId: string, projectName: string, opts: PlanExportOpts = {}): PlanSheet {
  const floor = data.floors[floorId];
  if (!floor) throw new Error('Geschoss nicht gefunden.');
  const pts = floorPoints(data, floorId);
  const bb = bboxOf(pts);
  if (!bb) throw new Error(`Geschoss „${floor.name}“ enthält noch keine Planinhalte.`);
  const pad = 800; // Platz für Maßtexte (mm Modell)
  const cw = bb.w + 2 * pad, ch = bb.h + 2 * pad;
  const { paper, denominator, fits } = chooseSheet(cw, ch, opts.paper);
  const { w: W, h: H } = PAPERS[paper];
  const s = 1 / denominator; // Papier-mm pro Modell-mm
  const areaW = W - 2 * M, areaH = H - 2 * M - TITLE_H;
  const cx = (bb.minX + bb.maxX) / 2, cy = (bb.minY + bb.maxY) / 2;
  const view = { scale: s, ox: M + areaW / 2 - cx * s, oy: M + areaH / 2 + cy * s };
  const only = opts.only;
  const layers: Layers = {
    rooms: true, walls: true, labels: true,
    dims: only !== 'electrical' && only !== 'sanitary' ? true : false,
    electrical: !only || only === 'electrical',
    sanitary: !only || only === 'sanitary',
    interior: !only || only === 'interior',
    ...opts.layers,
  };
  const kind = only === 'electrical' ? 'Elektroinstallationsplan' : only === 'sanitary' ? 'Sanitärplan' : only === 'interior' ? 'Einrichtungsplan' : only === 'architecture' ? 'Grundriss' : 'Grundriss (alle Ebenen)';
  const title = `${kind} – ${floor.name}`;
  const date = new Date().toLocaleDateString('de-DE');
  // Maßstabsleiste: 5 Segmente mit runder Länge
  const segModel = [100, 200, 250, 500, 1000, 2000, 5000, 10000].find((m) => m * s >= 8) ?? 10000;
  const seg = segModel * s;
  const fs = 2.6;
  const content = (
    <svg xmlns="http://www.w3.org/2000/svg" width={`${W}mm`} height={`${H}mm`} viewBox={`0 0 ${W} ${H}`} fontFamily="Helvetica, Arial, sans-serif">
      <rect width={W} height={H} fill="#ffffff" />
      <rect x={M - 4} y={M - 4} width={W - 2 * M + 8} height={H - 2 * M + 8} fill="none" stroke="#000" strokeWidth={0.5} />
      <PlanContent data={data} floorId={floorId} view={view} layers={layers} palette={PRINT} unit={0.18} fontSize={fs} focus={null} />
      {/* Schriftfeld */}
      <g>
        <rect x={M} y={H - M - TITLE_H + 4} width={W - 2 * M} height={TITLE_H - 4} fill="#fff" stroke="#000" strokeWidth={0.35} />
        <text x={M + 3} y={H - M - TITLE_H + 11} fontSize={4.2} fontWeight={700}>{projectName}</text>
        <text x={M + 3} y={H - M - TITLE_H + 17} fontSize={3.2}>{title}</text>
        <text x={M + 3} y={H - M - 2.5} fontSize={2.2} fill="#333">Maßstab nur gültig bei Druck in Originalgröße (100 %, „Tatsächliche Größe“, ohne Seitenanpassung) auf {paper}. Wandmaße in cm. Planungsentwurf – keine Ausführungsplanung.</text>
        <text x={W - M - 3} y={H - M - TITLE_H + 11} fontSize={4.2} fontWeight={700} textAnchor="end">M 1:{denominator}</text>
        <text x={W - M - 3} y={H - M - TITLE_H + 17} fontSize={2.8} textAnchor="end">{paper} quer · {date} · Lebenswerk Adorf PlanStudio</text>
        {/* Maßstabsleiste */}
        <g transform={`translate(${W / 2 - (seg * 5) / 2} ${H - M - TITLE_H + 9})`}>
          {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={i * seg} y={0} width={seg} height={1.6} fill={i % 2 ? '#fff' : '#000'} stroke="#000" strokeWidth={0.2} />)}
          {[0, 1, 2, 3, 4, 5].map((i) => <text key={i} x={i * seg} y={4.6} fontSize={2.2} textAnchor="middle">{((i * segModel) / 1000).toLocaleString('de-DE')}</text>)}
          <text x={seg * 5 + 2} y={1.6} fontSize={2.2}>m</text>
        </g>
        {!fits && <text x={W / 2} y={H - M - TITLE_H + 20} fontSize={2.6} textAnchor="middle" fill="#b91c1c" fontWeight={700}>ACHTUNG: Plan passt nicht vollständig auf das Blatt – Ausschnitt nicht maßstabsgetreu vollständig.</text>}
      </g>
    </svg>
  );
  const svg = '<?xml version="1.0" encoding="UTF-8"?>\n' + renderToStaticMarkup(content);
  return { svg, paper, w: W, h: H, denominator, fits, title };
}

export async function svgToPdf(sheet: PlanSheet): Promise<Uint8Array> {
  const { jsPDF } = await import('jspdf');
  await import('svg2pdf.js');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: sheet.paper.toLowerCase() });
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:1px;height:1px;overflow:hidden';
  host.innerHTML = sheet.svg.replace(/^<\?xml[^>]*>\s*/, '');
  document.body.appendChild(host);
  try {
    const el = host.querySelector('svg')!;
    await doc.svg(el, { x: 0, y: 0, width: sheet.w, height: sheet.h });
  } finally {
    host.remove();
  }
  doc.setProperties({ title: sheet.title, creator: 'Lebenswerk Adorf PlanStudio' });
  return new Uint8Array(doc.output('arraybuffer'));
}
