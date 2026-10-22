import { ascendantLongitude, moonLongitude, sunLongitude } from './ephemeris'
import { degreeInSign, signFromLongitude, type ZodiacSign } from './zodiac'
import { lifePath, type LifePath } from './numerology'
import {
  chineseSignForYear, chineseYearByLunarNewYear, lichunUtc,
  type ChineseAnimal, type ChineseElement, type YearBoundary,
} from './chinese'
import { localToUtc } from './timezone'

export type Source = 'auto' | 'manual' | 'unknown'

export interface Field<T> {
  value: T | null
  source: Source
  /** Mehrere mögliche Werte, wenn die Eingaben keine eindeutige Aussage erlauben. */
  candidates?: T[]
  note?: string
}

export interface BirthPlace {
  name: string
  lat: number
  lon: number
  tz: string
}

export interface BirthData {
  date?: string // YYYY-MM-DD
  time?: string // HH:MM (lokale Zeit am Geburtsort)
  place?: BirthPlace
}

export type InputMode = 'auto' | 'manual' | 'hybrid'

export interface ManualValues {
  sun?: ZodiacSign | null
  moon?: ZodiacSign | null
  asc?: ZodiacSign | null
  lifePath?: LifePath | null
  animal?: ChineseAnimal | null
  chElement?: ChineseElement | null
}

export interface AstroProfile {
  sun: Field<ZodiacSign>
  moon: Field<ZodiacSign>
  asc: Field<ZodiacSign>
  lifePath: Field<LifePath>
  animal: Field<ChineseAnimal>
  chElement: Field<ChineseElement>
}

export type AstroKey = keyof AstroProfile

export const ASTRO_KEYS: AstroKey[] = ['sun', 'moon', 'asc', 'lifePath', 'animal', 'chElement']

export interface CalcOptions {
  yearBoundary: YearBoundary
  /** Angenommene Unsicherheit der Geburtszeit in Minuten (für Grenzbereich-Hinweise). */
  timeToleranceMin: number
}

export const DEFAULT_CALC_OPTIONS: CalcOptions = { yearBoundary: 'lunarNewYear', timeToleranceMin: 15 }

const unknown = <T,>(note?: string): Field<T> => ({ value: null, source: 'unknown', note })

function parseDate(s?: string) {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const probe = new Date(Date.UTC(y, mo - 1, d))
  if (probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) return null
  return { y, mo, d }
}

function parseTime(s?: string) {
  const m = s?.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1])
  const mi = Number(m[2])
  if (h > 23 || mi > 59) return null
  return { h, mi }
}

/**
 * Zeitfenster, in dem die Geburt liegen kann. Ohne Ort ist die Zeitzone unbekannt
 * (UTC−12 … UTC+14), ohne Zeit umfasst das Fenster den ganzen Tag.
 */
function birthWindow(birth: BirthData): [Date, Date] | null {
  const date = parseDate(birth.date)
  if (!date) return null
  const time = parseTime(birth.time)
  const tz = birth.place?.tz
  const { y, mo, d } = date
  if (tz) {
    if (time) {
      const t = localToUtc(y, mo, d, time.h, time.mi, tz)
      return [t, t]
    }
    return [localToUtc(y, mo, d, 0, 0, tz), localToUtc(y, mo, d, 23, 59, tz)]
  }
  const h = time?.h ?? 0
  const mi = time?.mi ?? 0
  const startWall = Date.UTC(y, mo - 1, d, h, mi)
  const endWall = time ? startWall : Date.UTC(y, mo - 1, d, 23, 59)
  return [new Date(startWall - 14 * 3600_000), new Date(endWall + 12 * 3600_000)]
}

/** Sonne & Mond bewegen sich im Fenster < 30°, daher genügt der Vergleich der Ränder. */
function signOverWindow(lonAt: (d: Date) => number, win: [Date, Date], reason: string): Field<ZodiacSign> {
  const a = signFromLongitude(lonAt(win[0]))
  const b = signFromLongitude(lonAt(win[1]))
  if (a === b) {
    const exact = win[0].getTime() === win[1].getTime()
    const lon = lonAt(win[0])
    return {
      value: a,
      source: 'auto',
      note: exact ? `${degreeInSign(lon).toFixed(1)}° im Zeichen` : 'eindeutig trotz fehlender Präzision',
    }
  }
  return { value: null, source: 'unknown', candidates: [a, b], note: `Zeichenwechsel möglich – ${reason}` }
}

export function calculateAuto(birth: BirthData, opts: CalcOptions = DEFAULT_CALC_OPTIONS): AstroProfile {
  const date = parseDate(birth.date)
  if (!date) {
    return {
      sun: unknown('Geburtsdatum fehlt'), moon: unknown('Geburtsdatum fehlt'), asc: unknown('Geburtsdatum fehlt'),
      lifePath: unknown('Geburtsdatum fehlt'), animal: unknown('Geburtsdatum fehlt'), chElement: unknown('Geburtsdatum fehlt'),
    }
  }
  const win = birthWindow(birth)!
  const missing = !birth.time ? 'Geburtszeit fehlt' : !birth.place ? 'Geburtsort fehlt' : 'Grenzfall'

  const sun = signOverWindow(sunLongitude, win, missing)
  const moon = signOverWindow(moonLongitude, win, missing)

  let asc: Field<ZodiacSign>
  const time = parseTime(birth.time)
  if (time && birth.place) {
    const t = win[0]
    const tol = opts.timeToleranceMin * 60_000
    const lon = ascendantLongitude(t, birth.place.lat, birth.place.lon)
    const early = signFromLongitude(ascendantLongitude(new Date(t.getTime() - tol), birth.place.lat, birth.place.lon))
    const late = signFromLongitude(ascendantLongitude(new Date(t.getTime() + tol), birth.place.lat, birth.place.lon))
    const value = signFromLongitude(lon)
    const border = early !== value || late !== value
    asc = {
      value,
      source: 'auto',
      candidates: border ? [...new Set([early, value, late])] : undefined,
      note: border
        ? `Grenzbereich: bei ±${opts.timeToleranceMin} min Zeitungenauigkeit anderes Zeichen möglich`
        : `${degreeInSign(lon).toFixed(1)}° im Zeichen`,
    }
  } else {
    asc = unknown(!time ? 'Aszendent benötigt die Geburtszeit' : 'Aszendent benötigt den Geburtsort')
  }

  const lp = lifePath(date.y, date.mo, date.d)

  let chYear: number | null
  let chNote: string
  if (opts.yearBoundary === 'lunarNewYear') {
    chYear = chineseYearByLunarNewYear(date.y, date.mo, date.d)
    chNote = 'Jahreswechsel: Mondneujahr'
  } else {
    const lichun = lichunUtc(date.y).getTime()
    const y0 = win[0].getTime() >= lichun ? date.y : date.y - 1
    const y1 = win[1].getTime() >= lichun ? date.y : date.y - 1
    chYear = y0 === y1 ? y0 : null
    chNote = y0 === y1 ? 'Jahreswechsel: Lichun (Solarterm)' : 'Geburt am Lichun-Tag – Geburtszeit nötig'
  }
  const ch = chYear !== null ? chineseSignForYear(chYear) : null

  return {
    sun,
    moon,
    asc,
    lifePath: { value: lp.value, source: 'auto', note: lp.steps },
    animal: ch ? { value: ch.animal, source: 'auto', note: `${chNote} · ${ch.polarity === 'yang' ? 'Yang' : 'Yin'}` } : unknown(chNote),
    chElement: ch ? { value: ch.element, source: 'auto', note: chNote } : unknown(chNote),
  }
}

/** Führt automatische Werte und manuelle Angaben gemäß Modus zusammen. */
export function resolveProfile(
  mode: InputMode,
  birth: BirthData,
  manual: ManualValues,
  opts: CalcOptions = DEFAULT_CALC_OPTIONS,
): AstroProfile {
  const auto = mode === 'manual' ? null : calculateAuto(birth, opts)
  const out = {} as Record<AstroKey, Field<unknown>>
  for (const key of ASTRO_KEYS) {
    const m = manual[key]
    const a = auto?.[key]
    if (mode !== 'auto' && m != null) {
      const overridden = a?.value != null && a.value !== m
      out[key] = { value: m, source: 'manual', note: overridden ? 'manuell überschrieben' : 'manuell gesetzt' }
    } else if (a) {
      out[key] = a
    } else {
      out[key] = unknown('nicht angegeben')
    }
  }
  return out as unknown as AstroProfile
}
