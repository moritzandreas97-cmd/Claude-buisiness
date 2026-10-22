import type { BirthData, CalcOptions, InputMode, ManualValues } from '../engine/astro/calculate'
import type { ObservationId } from '../engine/behavior/observations'
import type { LiveSignal } from '../engine/strategy/live'
import type { OfferContext, StrategyPhase } from '../engine/strategy/strategy'
import type { Address } from '../engine/strategy/address'
import type { RuleSet } from '../engine/symbolic/rules'
import type { AIConfig } from '../ai/provider'
import type { NeuralConfig } from '../integration/neural'

/** Herkunft einer Information – für Transparenz nach DSGVO. */
export type InfoSource = 'self' | 'conversation' | 'observed' | 'referral' | 'public' | 'other'

export const INFO_SOURCE_LABEL: Record<InfoSource, string> = {
  self: 'Selbst mitgeteilt',
  conversation: 'Aus Gespräch',
  observed: 'Eigene Beobachtung',
  referral: 'Über Empfehlung',
  public: 'Öffentlich zugänglich',
  other: 'Sonstige',
}

export interface TaggedInfo {
  id: string
  text: string
  source: InfoSource
  addedAt: string
}

export type LegalBasis = 'consent' | 'contract' | 'legitimate' | 'unset'

export const LEGAL_BASIS_LABEL: Record<LegalBasis, string> = {
  consent: 'Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)',
  contract: 'Vertrag / vorvertraglich (lit. b)',
  legitimate: 'Berechtigtes Interesse (lit. f)',
  unset: 'Noch nicht festgelegt',
}

export type ContactStatus = 'new' | 'contacted' | 'interested' | 'negotiation' | 'customer' | 'paused' | 'declined'

export const STATUS_LABEL: Record<ContactStatus, string> = {
  new: 'Neu', contacted: 'Kontaktiert', interested: 'Interessiert', negotiation: 'Im Gespräch',
  customer: 'Kunde', paused: 'Pausiert', declined: 'Kein Interesse',
}

export interface HistoryEntry {
  id: string
  date: string
  kind: 'note' | 'call' | 'meeting' | 'message' | 'live'
  text: string
  signals?: LiveSignal[]
}

export interface Customer {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  legalBasis: LegalBasis
  legalNote: string
  /** Woher stammen die Kontaktdaten insgesamt? */
  origin: InfoSource
  referral: string
  mode: InputMode
  birth: BirthData
  birthSource: InfoSource
  manual: ManualValues
  interests: TaggedInfo[]
  needs: TaggedInfo[]
  wishes: TaggedInfo[]
  observations: ObservationId[]
  status: ContactStatus
  lastContact: string
  nextStep: string
  nextStepDate: string
  notes: string
  history: HistoryEntry[]
}

export interface Product extends OfferContext {
  id: string
}

export interface Settings {
  address: Address
  products: Product[]
  activeProductId: string
  rules: RuleSet
  calc: CalcOptions
  ai: AIConfig
  neural: NeuralConfig
}

export const DRAFT_ID = 'draft'

/** Laufendes Live-Gespräch – geteilt zwischen Live-Modus und Strategie. */
export interface LiveSession {
  customerId: string
  signals: { s: LiveSignal; at: number }[]
}

export type { StrategyPhase }
