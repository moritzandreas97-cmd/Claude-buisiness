export type ZodiacSign =
  | 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo'
  | 'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces'

export type WesternElement = 'fire' | 'earth' | 'air' | 'water'
export type Modality = 'cardinal' | 'fixed' | 'mutable'

export interface SignInfo {
  id: ZodiacSign
  name: string
  glyph: string
  element: WesternElement
  modality: Modality
  keywords: string[]
}

export const SIGNS: SignInfo[] = [
  { id: 'aries', name: 'Widder', glyph: '♈\uFE0E', element: 'fire', modality: 'cardinal', keywords: ['Initiative', 'Tempo', 'Mut'] },
  { id: 'taurus', name: 'Stier', glyph: '♉\uFE0E', element: 'earth', modality: 'fixed', keywords: ['Beständigkeit', 'Genuss', 'Wert'] },
  { id: 'gemini', name: 'Zwillinge', glyph: '♊\uFE0E', element: 'air', modality: 'mutable', keywords: ['Neugier', 'Austausch', 'Vielfalt'] },
  { id: 'cancer', name: 'Krebs', glyph: '♋\uFE0E', element: 'water', modality: 'cardinal', keywords: ['Fürsorge', 'Geborgenheit', 'Familie'] },
  { id: 'leo', name: 'Löwe', glyph: '♌\uFE0E', element: 'fire', modality: 'fixed', keywords: ['Ausstrahlung', 'Großzügigkeit', 'Anerkennung'] },
  { id: 'virgo', name: 'Jungfrau', glyph: '♍\uFE0E', element: 'earth', modality: 'mutable', keywords: ['Präzision', 'Nutzen', 'Qualität'] },
  { id: 'libra', name: 'Waage', glyph: '♎\uFE0E', element: 'air', modality: 'cardinal', keywords: ['Harmonie', 'Ästhetik', 'Fairness'] },
  { id: 'scorpio', name: 'Skorpion', glyph: '♏\uFE0E', element: 'water', modality: 'fixed', keywords: ['Tiefe', 'Vertrauen', 'Kontrolle'] },
  { id: 'sagittarius', name: 'Schütze', glyph: '♐\uFE0E', element: 'fire', modality: 'mutable', keywords: ['Vision', 'Freiheit', 'Optimismus'] },
  { id: 'capricorn', name: 'Steinbock', glyph: '♑\uFE0E', element: 'earth', modality: 'cardinal', keywords: ['Ziel', 'Verantwortung', 'Status'] },
  { id: 'aquarius', name: 'Wassermann', glyph: '♒\uFE0E', element: 'air', modality: 'fixed', keywords: ['Innovation', 'Unabhängigkeit', 'Idee'] },
  { id: 'pisces', name: 'Fische', glyph: '♓\uFE0E', element: 'water', modality: 'mutable', keywords: ['Intuition', 'Empathie', 'Sinn'] },
]

export const SIGN_BY_ID = Object.fromEntries(SIGNS.map((s) => [s.id, s])) as Record<ZodiacSign, SignInfo>

export const ELEMENT_LABEL: Record<WesternElement, string> = {
  fire: 'Feuer', earth: 'Erde', air: 'Luft', water: 'Wasser',
}

/** Tropischer Tierkreis: 30°-Segmente ab 0° Widder (Frühlingspunkt). */
export function signFromLongitude(lon: number): ZodiacSign {
  const norm = ((lon % 360) + 360) % 360
  return SIGNS[Math.floor(norm / 30)].id
}

export function degreeInSign(lon: number): number {
  const norm = ((lon % 360) + 360) % 360
  return norm % 30
}
