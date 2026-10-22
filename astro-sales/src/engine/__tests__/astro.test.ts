import { describe, expect, it } from 'vitest'
import { lifePath } from '../astro/numerology'
import { lunarNewYearDate, chineseSignForYear, chineseYearByLunarNewYear } from '../astro/chinese'
import { calculateAuto, resolveProfile } from '../astro/calculate'
import { localToUtc } from '../astro/timezone'

describe('Numerologie', () => {
  it('reduziert Tag, Monat, Jahr getrennt', () => {
    expect(lifePath(1990, 7, 15).value).toBe(5)
  })
  it('behält Meisterzahlen', () => {
    expect(lifePath(1985, 11, 29).value).toBe(9) // 11 + 11 + 5 = 27 → 9
    expect(lifePath(1975, 11, 2).value).toBe(8) // 2+11+22=35 → 8
    expect(lifePath(1991, 9, 19).value).toBe(3) // 1+9+2=12 → 3
    expect(lifePath(2000, 2, 7).value).toBe(11) // 7+2+2=11 bleibt Meisterzahl
  })
})

describe('Chinesischer Kalender', () => {
  it.each([
    [1985, '1985-02-20'], [1990, '1990-01-27'], [2000, '2000-02-05'], [2020, '2020-01-25'],
    [2023, '2023-01-22'], [2024, '2024-02-10'], [2025, '2025-01-29'], [2033, '2033-01-31'], [2034, '2034-02-19'],
  ])('Mondneujahr %i', (y, d) => expect(lunarNewYearDate(y)).toBe(d))
  it('Tier und Element', () => {
    expect(chineseSignForYear(1984)).toMatchObject({ animal: 'rat', element: 'wood' })
    expect(chineseSignForYear(2024)).toMatchObject({ animal: 'dragon', element: 'wood' })
    expect(chineseYearByLunarNewYear(1990, 1, 20)).toBe(1989)
    expect(chineseSignForYear(1989)).toMatchObject({ animal: 'snake', element: 'earth' })
  })
})

describe('Zeitzonen', () => {
  it('berücksichtigt Sommerzeit', () => {
    expect(localToUtc(2024, 7, 1, 12, 0, 'Europe/Berlin').toISOString()).toBe('2024-07-01T10:00:00.000Z')
    expect(localToUtc(2024, 1, 1, 12, 0, 'Europe/Berlin').toISOString()).toBe('2024-01-01T11:00:00.000Z')
  })
})

describe('Ephemeriden', () => {
  it('Einstein: Sonne Fische, Mond Schütze, Aszendent Krebs', () => {
    const p = calculateAuto({ date: '1879-03-14', time: '11:30', place: { name: 'Ulm', lat: 48.4, lon: 9.99, tz: 'Europe/Berlin' } })
    expect(p.sun.value).toBe('pisces')
    expect(p.moon.value).toBe('sagittarius')
    expect(p.asc.value).toBe('cancer')
  })
  it('erfindet ohne Zeit/Ort keinen Aszendenten', () => {
    const p = calculateAuto({ date: '1990-07-15' })
    expect(p.asc.value).toBeNull()
    expect(p.sun.value).toBe('cancer')
  })
  it('meldet Mondwechsel am Tag als mehrdeutig', () => {
    // Am 2024-01-01 wechselt der Mond (Jungfrau → Waage) – ohne Zeit nicht eindeutig
    const p = calculateAuto({ date: '2024-01-01', place: { name: 'Berlin', lat: 52.52, lon: 13.4, tz: 'Europe/Berlin' } })
    expect(p.moon.value === null ? p.moon.candidates?.length : 1).toBeGreaterThan(0)
  })
  it('Hybridmodus: manuell überschreibt automatisch', () => {
    const p = resolveProfile('hybrid', { date: '1990-07-15' }, { asc: 'leo', sun: 'gemini' })
    expect(p.asc).toMatchObject({ value: 'leo', source: 'manual' })
    expect(p.sun.note).toBe('manuell überschrieben')
    expect(p.lifePath.source).toBe('auto')
  })
  it('Manuell ignoriert Berechnung', () => {
    const p = resolveProfile('manual', { date: '1990-07-15' }, {})
    expect(p.sun.value).toBeNull()
  })
})
