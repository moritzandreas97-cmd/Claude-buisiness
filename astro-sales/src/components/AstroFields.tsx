import type { AstroKey, AstroProfile, Field, InputMode, ManualValues } from '../engine/astro/calculate'
import { SIGNS, SIGN_BY_ID, type ZodiacSign } from '../engine/astro/zodiac'
import { LIFE_PATHS, LIFE_PATH_LABEL, type LifePath } from '../engine/astro/numerology'
import { ANIMALS, ANIMAL_BY_ID, CH_ELEMENTS, CH_ELEMENT_BY_ID } from '../engine/astro/chinese'
import { SourceBadge, cx } from './ui'

export const ASTRO_META: Record<AstroKey, { label: string; color: string }> = {
  sun: { label: 'Sonnenzeichen', color: 'text-gold' },
  moon: { label: 'Mondzeichen', color: 'text-violet' },
  asc: { label: 'Aszendent', color: 'text-cyan' },
  lifePath: { label: 'Lebenszahl', color: 'text-gold' },
  animal: { label: 'Chin. Tierzeichen', color: 'text-violet' },
  chElement: { label: 'Chin. Element', color: 'text-cyan' },
}

export function displayValue(key: AstroKey, v: unknown): string {
  if (v == null) return '—'
  switch (key) {
    case 'sun': case 'moon': case 'asc': return `${SIGN_BY_ID[v as ZodiacSign].glyph} ${SIGN_BY_ID[v as ZodiacSign].name}`
    case 'lifePath': return `${v} · ${LIFE_PATH_LABEL[v as LifePath]}`
    case 'animal': return `${ANIMAL_BY_ID[v as keyof typeof ANIMAL_BY_ID].glyph} ${ANIMAL_BY_ID[v as keyof typeof ANIMAL_BY_ID].name}`
    case 'chElement': return `${CH_ELEMENT_BY_ID[v as keyof typeof CH_ELEMENT_BY_ID].glyph} ${CH_ELEMENT_BY_ID[v as keyof typeof CH_ELEMENT_BY_ID].name}`
  }
}

function options(key: AstroKey): { id: string; label: string }[] {
  if (key === 'sun' || key === 'moon' || key === 'asc') return SIGNS.map((s) => ({ id: s.id, label: `${s.glyph} ${s.name}` }))
  if (key === 'lifePath') return LIFE_PATHS.map((n) => ({ id: String(n), label: `${n} · ${LIFE_PATH_LABEL[n]}` }))
  if (key === 'animal') return ANIMALS.map((a) => ({ id: a.id, label: `${a.glyph} ${a.name}` }))
  return CH_ELEMENTS.map((e) => ({ id: e.id, label: `${e.glyph} ${e.name}` }))
}

const KEYS: AstroKey[] = ['sun', 'moon', 'asc', 'lifePath', 'animal', 'chElement']

export function AstroFields({ profile, manual, mode, onManual }: {
  profile: AstroProfile
  manual: ManualValues
  mode: InputMode
  onManual: (m: ManualValues) => void
}) {
  const editable = mode !== 'auto'
  const setValue = (key: AstroKey, raw: string) => {
    const val = raw === '' ? null : key === 'lifePath' ? (Number(raw) as LifePath) : raw
    onManual({ ...manual, [key]: val })
  }

  return (
    <div className="divide-y divide-white/5">
      {KEYS.map((key) => {
        const field = profile[key] as Field<string | number>
        const meta = ASTRO_META[key]
        return (
          <div key={key} className="py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase tracking-[0.16em] text-white/45">{meta.label}</span>
              <SourceBadge source={field.source} />
            </div>
            <div className="mt-1 flex items-center gap-2">
              {editable ? (
                <select
                  className={cx('field !py-1.5 text-sm', field.value != null && meta.color)}
                  value={manual[key] != null ? String(manual[key]) : ''}
                  onChange={(e) => setValue(key, e.target.value)}
                >
                  <option value="">{mode === 'hybrid' && field.source === 'auto' ? `Auto: ${displayValue(key, field.value)}` : 'Unbekannt / leer'}</option>
                  {options(key).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              ) : (
                <span className={cx('text-base font-medium', field.value != null ? meta.color : 'text-white/30')}>{displayValue(key, field.value)}</span>
              )}
            </div>
            {(field.note || field.candidates) && (
              <p className="mt-1 text-xs text-white/40">
                {field.note}
                {field.candidates && field.value == null && (
                  <span className="ml-1">
                    · möglich: {field.candidates.map((c) => (
                      <button key={String(c)} type="button" disabled={!editable}
                        className={cx('mx-0.5 rounded px-1 text-white/70', editable && 'underline decoration-dotted hover:text-gold')}
                        onClick={() => editable && setValue(key, String(c))}>
                        {displayValue(key, c)}
                      </button>
                    ))}
                  </span>
                )}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
