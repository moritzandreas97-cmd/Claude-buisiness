export type LifePath = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 11 | 22 | 33

export const LIFE_PATHS: LifePath[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]
export const MASTER_NUMBERS = new Set<number>([11, 22, 33])

export const LIFE_PATH_LABEL: Record<LifePath, string> = {
  1: 'Pionier', 2: 'Vermittler', 3: 'Kommunikator', 4: 'Baumeister', 5: 'Freigeist',
  6: 'Bewahrer', 7: 'Analytiker', 8: 'Macher', 9: 'Idealist',
  11: 'Inspirator (Meisterzahl)', 22: 'Meisterbaumeister (Meisterzahl)', 33: 'Meisterlehrer (Meisterzahl)',
}

function digitSum(n: number): number {
  return String(n).split('').reduce((acc, d) => acc + Number(d), 0)
}

/** Reduziert auf eine Ziffer, behält Meisterzahlen 11/22/33 bei. */
export function reduce(n: number): number {
  let v = n
  while (v > 9 && !MASTER_NUMBERS.has(v)) v = digitSum(v)
  return v
}

export interface LifePathResult {
  value: LifePath
  steps: string
}

/**
 * Lebenszahl nach der verbreiteten Methode „Tag, Monat, Jahr getrennt reduzieren,
 * dann summieren und erneut reduzieren“ – Meisterzahlen bleiben auf beiden Stufen erhalten.
 */
export function lifePath(year: number, month: number, day: number): LifePathResult {
  const d = reduce(day)
  const m = reduce(month)
  const y = reduce(digitSum(year))
  const total = d + m + y
  const value = reduce(total) as LifePath
  return {
    value,
    steps: `Tag ${day}→${d}, Monat ${month}→${m}, Jahr ${year}→${y}; ${d}+${m}+${y}=${total}→${value}`,
  }
}
