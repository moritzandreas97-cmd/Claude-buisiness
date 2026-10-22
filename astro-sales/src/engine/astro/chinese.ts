import { SearchMoonPhase, SearchSunLongitude, Seasons } from 'astronomy-engine'

export type ChineseAnimal =
  | 'rat' | 'ox' | 'tiger' | 'rabbit' | 'dragon' | 'snake'
  | 'horse' | 'goat' | 'monkey' | 'rooster' | 'dog' | 'pig'

export type ChineseElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water'

export const ANIMALS: { id: ChineseAnimal; name: string; glyph: string }[] = [
  { id: 'rat', name: 'Ratte', glyph: '鼠' },
  { id: 'ox', name: 'Büffel', glyph: '牛' },
  { id: 'tiger', name: 'Tiger', glyph: '虎' },
  { id: 'rabbit', name: 'Hase', glyph: '兔' },
  { id: 'dragon', name: 'Drache', glyph: '龍' },
  { id: 'snake', name: 'Schlange', glyph: '蛇' },
  { id: 'horse', name: 'Pferd', glyph: '馬' },
  { id: 'goat', name: 'Ziege', glyph: '羊' },
  { id: 'monkey', name: 'Affe', glyph: '猴' },
  { id: 'rooster', name: 'Hahn', glyph: '雞' },
  { id: 'dog', name: 'Hund', glyph: '狗' },
  { id: 'pig', name: 'Schwein', glyph: '豬' },
]
export const ANIMAL_BY_ID = Object.fromEntries(ANIMALS.map((a) => [a.id, a])) as Record<ChineseAnimal, (typeof ANIMALS)[number]>

export const CH_ELEMENTS: { id: ChineseElement; name: string; glyph: string }[] = [
  { id: 'wood', name: 'Holz', glyph: '木' },
  { id: 'fire', name: 'Feuer', glyph: '火' },
  { id: 'earth', name: 'Erde', glyph: '土' },
  { id: 'metal', name: 'Metall', glyph: '金' },
  { id: 'water', name: 'Wasser', glyph: '水' },
]
export const CH_ELEMENT_BY_ID = Object.fromEntries(CH_ELEMENTS.map((e) => [e.id, e])) as Record<ChineseElement, (typeof CH_ELEMENTS)[number]>

export type YearBoundary = 'lunarNewYear' | 'lichun'

const CHINA_OFFSET_MS = 8 * 3600_000

/** Kalenderdatum (YYYY-MM-DD) eines Zeitpunkts in chinesischer Normalzeit (UTC+8). */
function chinaDate(d: Date): string {
  return new Date(d.getTime() + CHINA_OFFSET_MS).toISOString().slice(0, 10)
}

/**
 * Bekannte Ausnahmen der Faustregel „zweiter Neumond nach der Wintersonnenwende“
 * (Schaltmonat zwischen Sonnenwende und Neujahr).
 */
const LNY_OVERRIDES: Record<number, string> = {
  2034: '2034-02-19',
}

const lnyCache = new Map<number, string>()

/** Datum des chinesischen Neujahrs (Mondneujahr) im Gregorianischen Jahr `year`. */
export function lunarNewYearDate(year: number): string {
  if (LNY_OVERRIDES[year]) return LNY_OVERRIDES[year]
  const cached = lnyCache.get(year)
  if (cached) return cached
  const solstice = Seasons(year - 1).dec_solstice.date
  const solsticeDay = chinaDate(solstice)
  let cursor = new Date(solstice.getTime() - 2 * 86400_000)
  const after: string[] = []
  while (after.length < 2) {
    const nm = SearchMoonPhase(0, cursor, 40)
    if (!nm) throw new Error('Neumond nicht gefunden')
    const day = chinaDate(nm.date)
    if (day > solsticeDay) after.push(day)
    cursor = new Date(nm.date.getTime() + 86400_000)
  }
  lnyCache.set(year, after[1])
  return after[1]
}

/** Lichun (Frühlingsbeginn, Sonne bei 315°) als UTC-Zeitpunkt. */
export function lichunUtc(year: number): Date {
  const t = SearchSunLongitude(315, new Date(Date.UTC(year, 0, 25)), 30)
  if (!t) throw new Error('Lichun nicht gefunden')
  return t.date
}

export interface ChineseSign {
  chineseYear: number
  animal: ChineseAnimal
  element: ChineseElement
  polarity: 'yang' | 'yin'
}

export function chineseSignForYear(chineseYear: number): ChineseSign {
  const cycle = (((chineseYear - 4) % 60) + 60) % 60
  const stem = cycle % 10
  return {
    chineseYear,
    animal: ANIMALS[cycle % 12].id,
    element: CH_ELEMENTS[Math.floor(stem / 2)].id,
    polarity: stem % 2 === 0 ? 'yang' : 'yin',
  }
}

/** Chinesisches Jahr anhand des lokalen Geburtsdatums (Mondneujahr-Konvention). */
export function chineseYearByLunarNewYear(year: number, month: number, day: number): number {
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return iso >= lunarNewYearDate(year) ? year : year - 1
}
