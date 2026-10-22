import { useMemo, useSyncExternalStore } from 'react'
import { DEFAULT_CALC_OPTIONS, resolveProfile } from '../engine/astro/calculate'
import { fuseProfile } from '../engine/symbolic/fusion'
import { DEFAULT_RULES } from '../engine/symbolic/rules'
import { mergeWithObservations } from '../engine/behavior/observations'
import { buildStrategy, DEFAULT_OFFER, type OfferContext } from '../engine/strategy/strategy'
import { liveState, type LiveSignal } from '../engine/strategy/live'
import { DEFAULT_AI } from '../ai/provider'
import { DEFAULT_NEURAL, neural } from '../integration/neural'
import { DRAFT_ID, type Customer, type LiveSession, type Product, type Settings, type StrategyPhase } from './types'

const STORAGE_KEY = 'neural-astro-sales:v1'

interface State {
  customers: Customer[]
  draft: Customer
  activeId: string
  settings: Settings
  /** Aktuelle Gesprächsphase – gemeinsam für Strategie und Live-Modus. */
  phase: StrategyPhase
  live: LiveSession
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

export function newCustomer(id = uid()): Customer {
  const now = new Date().toISOString()
  return {
    id, name: '', createdAt: now, updatedAt: now,
    legalBasis: 'unset', legalNote: '', origin: 'conversation', referral: '',
    mode: 'hybrid', birth: {}, birthSource: 'self', manual: {},
    interests: [], needs: [], wishes: [], observations: [],
    status: 'new', lastContact: '', nextStep: '', nextStepDate: '', notes: '', history: [],
  }
}

export function newProduct(patch: Partial<OfferContext> = {}): Product {
  return { id: uid(), ...structuredClone(DEFAULT_OFFER), name: '', ...patch }
}

const EXAMPLE_PRODUCT: Partial<OfferContext> = {
  name: 'Beispiel: Premium-Beratungspaket',
  description: 'Persönliche Begleitung über drei Monate mit festen Terminen.',
  benefits: ['spart jede Woche mehrere Stunden Organisationsaufwand', 'feste Ansprechperson statt Warteschleife', 'planbare Kosten ohne Überraschungen'],
  audience: 'Selbstständige und kleine Teams',
  price: '490 € pro Monat',
}

const defaultSettings = (): Settings => {
  const example = newProduct(EXAMPLE_PRODUCT)
  return {
  address: 'sie',
  products: [example],
  activeProductId: example.id,
  rules: structuredClone(DEFAULT_RULES),
  calc: { ...DEFAULT_CALC_OPTIONS },
  ai: { ...DEFAULT_AI },
  neural: { ...DEFAULT_NEURAL },
  }
}

const FALLBACK_PRODUCT: Product = { id: 'fallback', ...DEFAULT_OFFER }

const emptyLive = (customerId = DRAFT_ID): LiveSession => ({ customerId, signals: [] })

type LegacySettings = Partial<Settings> & { offer?: { name?: string; benefit?: string } }

function migrateProducts(ps: LegacySettings | undefined, base: Settings): Pick<Settings, 'products' | 'activeProductId'> {
  if (ps?.products?.length) {
    const products = ps.products.map((p) => ({ ...newProduct(), ...p }))
    return { products, activeProductId: products.some((p) => p.id === ps.activeProductId) ? ps.activeProductId! : products[0].id }
  }
  // Version 0.1 kannte nur ein einzelnes Angebot (Name + Kernnutzen).
  if (ps?.offer?.name) {
    const p = newProduct({ name: ps.offer.name, benefits: ps.offer.benefit ? [ps.offer.benefit] : [] })
    return { products: [p], activeProductId: p.id }
  }
  return { products: base.products, activeProductId: base.activeProductId }
}

function load(): State {
  const fallback: State = { customers: [], draft: newCustomer(DRAFT_ID), activeId: DRAFT_ID, settings: defaultSettings(), phase: 'opening', live: emptyLive() }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<State> & { settings?: LegacySettings }
    const base = defaultSettings()
    const { offer: _legacy, ...savedSettings } = parsed.settings ?? {}
    void _legacy
    return {
      customers: (parsed.customers ?? []).map((c) => ({ ...newCustomer(c.id), ...c })),
      draft: { ...newCustomer(DRAFT_ID), ...parsed.draft },
      activeId: parsed.activeId ?? DRAFT_ID,
      settings: {
        ...base, ...savedSettings,
        ...migrateProducts(parsed.settings, base),
        calc: { ...base.calc, ...parsed.settings?.calc },
        ai: { ...base.ai, ...parsed.settings?.ai },
        neural: { ...base.neural, ...parsed.settings?.neural },
        rules: parsed.settings?.rules ?? base.rules,
      },
      phase: parsed.phase ?? 'opening',
      live: parsed.live ?? emptyLive(),
    }
  } catch {
    return fallback
  }
}

let state: State = load()
const listeners = new Set<() => void>()
neural.configure(state.settings.neural)

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* Speicher voll oder blockiert – App bleibt nutzbar */
  }
}

function set(next: State) {
  state = next
  persist()
  listeners.forEach((l) => l())
}

export const store = {
  get: () => state,
  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },

  active(): Customer {
    return state.activeId === DRAFT_ID ? state.draft : state.customers.find((c) => c.id === state.activeId) ?? state.draft
  },

  setActive(id: string) {
    set({ ...state, activeId: id })
  },

  updateActive(patch: Partial<Customer> | ((c: Customer) => Partial<Customer>)) {
    const cur = store.active()
    const p = typeof patch === 'function' ? patch(cur) : patch
    const updated = { ...cur, ...p, updatedAt: new Date().toISOString() }
    if (cur.id === DRAFT_ID) set({ ...state, draft: updated })
    else set({ ...state, customers: state.customers.map((c) => (c.id === cur.id ? updated : c)) })
  },

  /** Wandelt den Entwurf in einen gespeicherten Kunden um. */
  saveDraftAsCustomer(name: string): string {
    const id = uid()
    const customer = { ...state.draft, id, name, createdAt: new Date().toISOString() }
    set({ ...state, customers: [customer, ...state.customers], draft: newCustomer(DRAFT_ID), activeId: id })
    neural.emit({ type: 'customer.saved', customerId: id })
    return id
  },

  createCustomer(name: string): string {
    const c = { ...newCustomer(), name }
    set({ ...state, customers: [c, ...state.customers], activeId: c.id })
    neural.emit({ type: 'customer.saved', customerId: c.id })
    return c.id
  },

  deleteCustomer(id: string) {
    set({ ...state, customers: state.customers.filter((c) => c.id !== id), activeId: state.activeId === id ? DRAFT_ID : state.activeId })
    neural.emit({ type: 'customer.deleted', customerId: id })
  },

  activeProduct(): Product {
    const { products, activeProductId } = state.settings
    return products.find((p) => p.id === activeProductId) ?? products[0] ?? FALLBACK_PRODUCT
  },

  setActiveProduct(id: string) {
    store.updateSettings({ activeProductId: id })
  },

  addProduct(): string {
    const p = newProduct({ name: 'Neues Produkt', benefits: [''] })
    store.updateSettings({ products: [...state.settings.products, p], activeProductId: p.id })
    return p.id
  },

  updateProduct(id: string, patch: Partial<OfferContext>) {
    store.updateSettings({ products: state.settings.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
  },

  deleteProduct(id: string) {
    if (state.settings.products.length <= 1) return
    const products = state.settings.products.filter((p) => p.id !== id)
    store.updateSettings({ products, activeProductId: state.settings.activeProductId === id ? products[0]?.id ?? '' : state.settings.activeProductId })
  },

  setPhase(phase: StrategyPhase) {
    set({ ...state, phase })
  },

  /** Live-Signale gehören immer zum aktiven Kunden; ein Kundenwechsel startet eine neue Sitzung. */
  pushSignal(s: LiveSignal) {
    const live = state.live.customerId === state.activeId ? state.live : emptyLive(state.activeId)
    const signals = [...live.signals, { s, at: Date.now() }]
    const ls = liveState(signals.map((x) => x.s))
    set({ ...state, live: { customerId: state.activeId, signals }, phase: ls.phase === 'ended' ? state.phase : ls.phase })
  },

  undoSignal() {
    set({ ...state, live: { ...state.live, signals: state.live.signals.slice(0, -1) } })
  },

  resetLive() {
    set({ ...state, live: emptyLive(state.activeId), phase: 'opening' })
  },

  resetDraft() {
    set({ ...state, draft: newCustomer(DRAFT_ID), activeId: DRAFT_ID })
  },

  updateSettings(patch: Partial<Settings>) {
    const settings = { ...state.settings, ...patch }
    if (patch.neural) neural.configure(settings.neural)
    set({ ...state, settings })
  },

  importCustomers(list: Customer[]) {
    const known = new Set(state.customers.map((c) => c.id))
    const fresh = list.filter((c) => c && c.id && !known.has(c.id)).map((c) => ({ ...newCustomer(c.id), ...c }))
    set({ ...state, customers: [...fresh, ...state.customers] })
    return fresh.length
  },

  wipeAll() {
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
    state = { customers: [], draft: newCustomer(DRAFT_ID), activeId: DRAFT_ID, settings: defaultSettings(), phase: 'opening', live: emptyLive() }
    neural.configure(state.settings.neural)
    listeners.forEach((l) => l())
  },
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(store.subscribe, () => selector(state))
}

export function useActive(): Customer {
  return useSyncExternalStore(store.subscribe, () => store.active())
}

export function useSettings(): Settings {
  return useSyncExternalStore(store.subscribe, () => state.settings)
}

export function useActiveProduct(): Product {
  return useSyncExternalStore(store.subscribe, () => store.activeProduct())
}

/** Signale der laufenden Live-Sitzung – leer, wenn sie zu einem anderen Kunden gehört. */
export function useLiveSignals(customerId: string) {
  const live = useStore((s) => s.live)
  return live.customerId === customerId ? live.signals : EMPTY_SIGNALS
}
const EMPTY_SIGNALS: LiveSession['signals'] = []

/** Tatsächliche Reaktionen: laufende Live-Sitzung, sonst das letzte gespeicherte Live-Gespräch. */
export function reactionsFor(c: Customer, live: LiveSession): LiveSignal[] {
  if (live.customerId === c.id && live.signals.length) return live.signals.map((x) => x.s)
  return c.history.find((h) => h.kind === 'live' && h.signals?.length)?.signals ?? []
}

/** Komplette Analysekette: Astro → Fusion → Beobachtung/Reaktion → Strategie (mit Produkt, Anrede, Phase). */
export function useAnalysis(c: Customer) {
  const settings = useSettings()
  const product = useActiveProduct()
  const phase = useStore((s) => s.phase)
  const live = useStore((s) => s.live)
  return useMemo(() => {
    const profile = resolveProfile(c.mode, c.birth, c.manual, settings.calc)
    const fusion = fuseProfile(profile, settings.rules)
    const merged = mergeWithObservations(fusion.scores, c.observations)
    const strategy = buildStrategy(
      merged,
      {
        interests: c.interests.map((i) => i.text),
        needs: c.needs.map((i) => i.text),
        wishes: c.wishes.map((i) => i.text),
        referral: c.referral || undefined,
      },
      product,
      { address: settings.address, phase, reactions: reactionsFor(c, live) },
    )
    return { profile, fusion, merged, strategy, product }
  }, [c, settings, product, phase, live])
}
