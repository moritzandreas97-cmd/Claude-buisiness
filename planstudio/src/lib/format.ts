export const eur = (cents: number | null | undefined) =>
  cents == null ? '–' : (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
/** "12,50" / "12.5" / "1.234,56" → Cent; leer → null; ungültig → NaN */
export function parseEuro(input: string): number | null {
  const s = input.trim().replace(/\s|€/g, '');
  if (!s) return null;
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const v = Number(normalized);
  return Number.isFinite(v) ? Math.round(v * 100) : NaN;
}
export const centsToInput = (c: number | null | undefined) => (c == null ? '' : (c / 100).toFixed(2).replace('.', ','));
export const num = (v: number, d = 2) => v.toLocaleString('de-DE', { maximumFractionDigits: d });
export const date = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('de-DE') : '–');
export const dateTime = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '–');
export function parseNum(input: string): number | null {
  const s = input.trim().replace(',', '.');
  if (!s) return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : NaN;
}
