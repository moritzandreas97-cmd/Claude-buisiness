import { useEffect, useState, type ReactNode } from 'react';
import { cn, Field } from './primitives';
import { parseLength } from '../model/geometry';
import { centsToInput, parseEuro, parseNum } from '../lib/format';
import { useUi } from '../store/uiStore';

/** Textfeld, das erst bei Enter/Fokusverlust speichert (eine Undo-Einheit je Änderung). */
export function CommitInput<T>({ value, onCommit, parse, format, placeholder, className, ariaLabel, multiline, type }: {
  value: T; onCommit(v: T): void | Promise<unknown>; parse?: (s: string) => T | typeof INVALID; format?: (v: T) => string;
  placeholder?: string; className?: string; ariaLabel?: string; multiline?: boolean; type?: string;
}) {
  const fmt = format ?? ((v: T) => (v == null ? '' : String(v)));
  const [text, setText] = useState(fmt(value));
  const [bad, setBad] = useState(false);
  useEffect(() => { setText(fmt(value)); setBad(false); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const commit = () => {
    const v = parse ? parse(text) : (text as unknown as T);
    if (v === INVALID) { setBad(true); useUi.getState().toast(`Ungültige Eingabe: „${text}“`, 'error'); return; }
    setBad(false);
    if (fmt(v as T) !== fmt(value) || text !== fmt(value)) {
      const r = onCommit(v as T);
      if (r && typeof (r as Promise<unknown>).catch === 'function') (r as Promise<unknown>).catch((e) => { useUi.getState().toast(e instanceof Error ? e.message : String(e), 'error'); setText(fmt(value)); });
    }
  };
  const cls = cn('w-full rounded-md border bg-panel px-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/25 touch-lg', bad ? 'border-danger' : 'border-line focus:border-accent', multiline ? 'py-2' : 'h-9', className);
  if (multiline) return <textarea aria-label={ariaLabel} rows={3} className={cls} value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} onBlur={commit} />;
  return <input aria-label={ariaLabel} type={type} className={cls} value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setText(fmt(value)); (e.target as HTMLInputElement).blur(); } }} />;
}
export const INVALID = Symbol('invalid');

export const parseLen = (min = 0) => (s: string) => { const v = parseLength(s); return v == null || v < min ? INVALID : v; };
export const parseLenNullable = (s: string) => { if (!s.trim()) return null; const v = parseLength(s); return v == null || v < 0 ? INVALID : v; };
export const parseNumber = (s: string) => { const v = parseNum(s); return v == null ? INVALID : Number.isNaN(v) ? INVALID : v; };
export const parseNumberNullable = (s: string) => { const v = parseNum(s); return Number.isNaN(v as number) ? INVALID : v; };
export const parseMoney = (s: string) => { const v = parseEuro(s); return Number.isNaN(v as number) ? INVALID : v; };
export const fmtMm = (v: number | null) => (v == null ? '' : String(Math.round(v * 10) / 10));
export const fmtMoney = (v: number | null) => centsToInput(v);
export const trimOrNull = (s: string) => (s.trim() ? s.trim() : null);

export function LengthField({ label, value, onCommit, min = 0, hint, nullable }: { label: string; value: number | null; onCommit(v: number | null): void | Promise<unknown>; min?: number; hint?: ReactNode; nullable?: boolean }) {
  return (
    <Field label={`${label} (mm)`} hint={hint}>
      <CommitInput ariaLabel={label} value={value} onCommit={onCommit} parse={nullable ? parseLenNullable : parseLen(min)} format={fmtMm} placeholder={nullable ? 'leer = Decke / k. A.' : 'z. B. 2400, 240cm, 2,4m'} />
    </Field>
  );
}

export function TextField({ label, value, onCommit, multiline, placeholder }: { label: string; value: string | null; onCommit(v: string | null): void | Promise<unknown>; multiline?: boolean; placeholder?: string }) {
  return (
    <Field label={label}>
      <CommitInput ariaLabel={label} value={value} onCommit={onCommit} parse={trimOrNull} format={(v) => v ?? ''} multiline={multiline} placeholder={placeholder} />
    </Field>
  );
}

export function SelectField({ label, value, options, onChange, allowEmpty }: { label: string; value: string | null; options: { v: string; label: string }[]; onChange(v: string | null): void; allowEmpty?: string }) {
  return (
    <Field label={label}>
      <select aria-label={label} className="h-9 w-full rounded-md border border-line bg-panel px-2 text-sm outline-none focus:border-accent touch-lg" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        {allowEmpty !== undefined && <option value="">{allowEmpty}</option>}
        {options.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
    </Field>
  );
}
export const parseSignedLen = (s: string) => { const v = parseLength(s); return v == null ? INVALID : v; };
