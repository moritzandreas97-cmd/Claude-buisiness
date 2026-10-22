import type { LiveSignal } from '../strategy/live'

/**
 * Produktkataloge (z. B. Testdaten eines Anbieters). Jede Angabe muss aus einer
 * genannten Quelle stammen; was nicht belegt ist, bleibt leer und wird markiert.
 * Kundengerichtete Texte (Fragen, Argumente, Antworten) nutzen Du/Sie-Doppelformen.
 */
export type DetailStatus = 'complete' | 'check'
export type AvailabilityStatus = 'verified' | 'unverified' | 'historical'

export const DETAIL_LABEL: Record<DetailStatus, string> = {
  complete: 'Details geprüft',
  check: 'Details prüfen',
}

export const AVAILABILITY_LABEL: Record<AvailabilityStatus, string> = {
  verified: 'Verfügbarkeit bestätigt',
  unverified: 'Nicht verifiziert',
  historical: 'Historischer Eintrag',
}

export interface CatalogSource {
  label: string
  url: string
  /** Datum der Prüfung, YYYY-MM-DD */
  checkedAt: string
  /** Wie geprüft wurde – z. B. „Angebotsseite geöffnet“ oder „Auszug aus Websuche“. */
  method: string
}

export interface CatalogPrice {
  amount: number | null
  currency: 'EUR'
  interval: 'once' | 'month' | 'unknown'
  /** Steuerangabe wörtlich laut Quelle bzw. Nutzerangabe, sonst „nicht angegeben“. */
  taxNote: string
}

export interface CatalogObjection {
  objection: string
  answer: string
  /** Live-Signal, bei dem diese Antwort im Live-Modus angeboten wird. */
  signal?: LiveSignal
}

export interface CatalogInfo {
  catalogId: string
  sku: string
  provider: string
  category: string
  price: CatalogPrice
  /** Belegter Leistungsumfang; leer = unbekannt. */
  scope: string[]
  /** Zielgruppe laut Anbieter; leer = nicht angegeben. */
  targetGroup: string
  needsQuestions: string[]
  /** Sachliche Argumente – nur aus belegtem Leistungsumfang abgeleitet. */
  arguments: string[]
  objections: CatalogObjection[]
  offerUrl: string
  sources: CatalogSource[]
  status: { details: DetailStatus; availability: AvailabilityStatus }
  /** Hinweise zur Prüfung, Abweichungen zwischen Quellen usw. */
  notes: string[]
  isTestData: boolean
  lastChecked: string
}

export interface CatalogEntry extends CatalogInfo {
  name: string
  description: string
}

export interface CatalogDefinition {
  id: string
  name: string
  provider: string
  version: string
  collectedAt: string
  isTestData: boolean
  notes: string[]
  entries: Omit<CatalogEntry, 'catalogId' | 'provider' | 'isTestData'>[]
}
