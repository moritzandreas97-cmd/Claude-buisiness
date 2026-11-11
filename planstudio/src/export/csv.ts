import { useProject } from '../store/projectStore';

/** CSV mit Semikolon (Excel-kompatibel im deutschen Gebietsschema) und UTF-8-BOM. */
export function toCsv(rows: Record<string, unknown>[], headers?: string[]): string {
  const cols = headers ?? (rows[0] ? Object.keys(rows[0]) : []);
  const esc = (v: unknown) => {
    if (v == null) return '';
    let s = typeof v === 'number' ? v.toLocaleString('de-DE', { useGrouping: false, maximumFractionDigits: 3 }) : String(v);
    if (/^[=+\-@]/.test(s) && typeof v !== 'number') s = "'" + s; // Formel-Injection verhindern
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [cols.join(';'), ...rows.map((r) => cols.map((c) => esc(r[c])).join(';'))].join('\r\n');
}

export const safeName = (s: string) => s.replace(/[^\p{L}\p{N}._ ()-]+/gu, '_').trim();

export async function exportText(fileName: string, content: string | Uint8Array, mime: string) {
  const p = useProject.getState().platform!;
  return p.saveExport(safeName(fileName), content, mime);
}
