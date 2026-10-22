export type DimensionId =
  | 'presence' | 'energy' | 'emotion' | 'security' | 'directness'
  | 'independence' | 'recognition' | 'openness' | 'structure' | 'communication'

export interface DimensionInfo {
  id: DimensionId
  label: string
  short: string
  high: string
  low: string
}

export const DIMENSIONS: DimensionInfo[] = [
  { id: 'presence', label: 'Präsenz & Selbstbewusstsein', short: 'Präsenz', high: 'tritt sichtbar auf, mag Bühne', low: 'zurückhaltend, wirkt im Hintergrund' },
  { id: 'energy', label: 'Energie & Dynamik', short: 'Energie', high: 'schnelles Tempo, Tatendrang', low: 'ruhiges Tempo, bedächtig' },
  { id: 'emotion', label: 'Emotionalität', short: 'Emotion', high: 'entscheidet aus dem Bauch, beziehungsorientiert', low: 'sachlich, distanziert' },
  { id: 'security', label: 'Sicherheitsorientierung', short: 'Sicherheit', high: 'braucht Garantien, Verlässlichkeit', low: 'risikofreudig, spontan' },
  { id: 'directness', label: 'Direktheit', short: 'Direktheit', high: 'klar, ohne Umwege', low: 'diplomatisch, indirekt' },
  { id: 'independence', label: 'Unabhängigkeit', short: 'Autonomie', high: 'will selbst entscheiden', low: 'sucht Rat und Konsens' },
  { id: 'recognition', label: 'Anerkennungsorientierung', short: 'Anerkennung', high: 'Status, Wertschätzung zählen', low: 'Understatement, Sache vor Image' },
  { id: 'openness', label: 'Offenheit für Neues', short: 'Offenheit', high: 'neugierig, experimentierfreudig', low: 'bewährt vor neu' },
  { id: 'structure', label: 'Struktur & Rationalität', short: 'Struktur', high: 'Zahlen, Fakten, Ablauf', low: 'intuitiv, Gesamteindruck' },
  { id: 'communication', label: 'Kommunikationsintensität', short: 'Kommunikation', high: 'redet gern und viel', low: 'wortkarg, hört lieber zu' },
]

export const DIM_BY_ID = Object.fromEntries(DIMENSIONS.map((d) => [d.id, d])) as Record<DimensionId, DimensionInfo>
export const DIM_IDS = DIMENSIONS.map((d) => d.id)

export type DimVector = Partial<Record<DimensionId, number>>
