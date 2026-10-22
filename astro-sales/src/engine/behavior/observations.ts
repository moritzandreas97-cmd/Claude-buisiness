import { DIM_IDS, type DimensionId } from '../symbolic/dimensions'
import type { DimensionScore } from '../symbolic/fusion'

/**
 * Separate Engine für tatsächlich beobachtetes Verhalten.
 * Beobachtungen setzen Zielwerte für Dimensionen und haben IMMER Vorrang
 * vor der symbolischen Deutung.
 */
export type ObservationId =
  | 'asksDetails' | 'decidesFast' | 'talkative' | 'reserved' | 'priceSensitive'
  | 'statusOriented' | 'tellsStories' | 'skeptical' | 'earlyAdopter'
  | 'wantsControl' | 'needsTime' | 'veryDirect' | 'seeksAdvice' | 'diplomatic'

export interface ObservationInfo {
  id: ObservationId
  label: string
  targets: Partial<Record<DimensionId, number>>
}

export const OBSERVATIONS: ObservationInfo[] = [
  { id: 'asksDetails', label: 'Fragt nach Details & Zahlen', targets: { structure: 85 } },
  { id: 'decidesFast', label: 'Entscheidet schnell', targets: { energy: 80, directness: 70 } },
  { id: 'talkative', label: 'Redet gern & viel', targets: { communication: 85 } },
  { id: 'reserved', label: 'Eher zurückhaltend', targets: { communication: 25, presence: 35 } },
  { id: 'priceSensitive', label: 'Preisbewusst', targets: { security: 75 } },
  { id: 'statusOriented', label: 'Legt Wert auf Status/Marke', targets: { recognition: 85 } },
  { id: 'tellsStories', label: 'Erzählt Persönliches', targets: { emotion: 80 } },
  { id: 'skeptical', label: 'Skeptisch, will Belege', targets: { security: 75, openness: 35, structure: 70 } },
  { id: 'earlyAdopter', label: 'Begeistert von Neuem', targets: { openness: 85 } },
  { id: 'wantsControl', label: 'Will selbst entscheiden', targets: { independence: 85 } },
  { id: 'needsTime', label: 'Braucht Zeit', targets: { energy: 30, security: 70 } },
  { id: 'veryDirect', label: 'Sehr direkt', targets: { directness: 85 } },
  { id: 'seeksAdvice', label: 'Sucht Rat & Empfehlung', targets: { independence: 25 } },
  { id: 'diplomatic', label: 'Diplomatisch, indirekt', targets: { directness: 25 } },
]

export const OBS_BY_ID = Object.fromEntries(OBSERVATIONS.map((o) => [o.id, o])) as Record<ObservationId, ObservationInfo>

export type ValueSource = 'observed' | 'symbolic' | 'none'

export interface MergedDimension {
  id: DimensionId
  value: number | null
  source: ValueSource
  symbolic: number | null
  observedBy: ObservationId[]
}

export type MergedProfile = Record<DimensionId, MergedDimension>

export function mergeWithObservations(
  symbolic: Record<DimensionId, DimensionScore>,
  observed: ObservationId[],
): MergedProfile {
  const out = {} as MergedProfile
  for (const dim of DIM_IDS) {
    const by = observed.filter((o) => OBS_BY_ID[o]?.targets[dim] !== undefined)
    const sym = symbolic[dim].value
    if (by.length) {
      const avg = by.reduce((s, o) => s + OBS_BY_ID[o].targets[dim]!, 0) / by.length
      out[dim] = { id: dim, value: Math.round(avg), source: 'observed', symbolic: sym, observedBy: by }
    } else {
      out[dim] = { id: dim, value: sym, source: sym === null ? 'none' : 'symbolic', symbolic: sym, observedBy: [] }
    }
  }
  return out
}
