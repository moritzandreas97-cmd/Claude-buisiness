import { useMemo, useSyncExternalStore } from 'react'
import { DEFAULT_CALC_OPTIONS, resolveProfile } from '../engine/astro/calculate'
import { fuseProfile } from '../engine/symbolic/fusion'
import { DEFAULT_RULES } from '../engine/symbolic/rules'
import { mergeWithObservations } from '../engine/behavior/observations'
import { buildStrategy, DEFAULT_OFFER } from '../engine/strategy/strategy'
import { DEFAULT_AI } from '../ai/provider'
import { DEFAULT_NEURAL, neural } from '../integration/neural'
import { DRAFT_ID, type Customer, type Settings } from './types'

const STORAGE_KEY = 'neural-astro-sales:v1'

interface State {
  customers: Customer[]
  draft: Customer
  activeId: string
  settings: Settings
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

const defaultSettings = (): Settings => ({
  offer: { ...DEFAULT_OFFER },
  rules: structuredClone(DEFAULT_RULES),
  calc: { ...DEFAULT_CALC_OPTIONS },
  ai: { ...DEFAULT_AI },
  neural: { ...DEFAULT_NEURAL },
})

function load(): State {
  const fallback: State = { customers: [], draft: newCustomer(DRAFT_ID), activeId: DRAFT_ID, settings: defaultSettings() }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<State>
    const base = defaultSettings()
    return {
      customers: (parsed.customers ?? []).map((c) => ({ ...newCustomer(c.id), ...c })),
      draft: { ...newCustomer(DRAFT_ID), ...parsed.draft },
      activeId: parsed.activeId ?? DRAFT_ID,
      settings: {
        ...base, ...parsed.settings,
        offer: { ...base.offer, ...parsed.settings?.offer },
        calc: { ...base.calc, ...parsed.settings?.calc },
        ai: { ...base.ai, ...parsed.settings?.ai },
        neural: { ...base.neural, ...parsed.settings?.neural },
        rules: parsed.settings?.rules ?? base.rules,
      },
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
    state = { customers: [], draft: newCustomer(DRAFT_ID), activeId: DRAFT_ID, settings: defaultSettings() }
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

/** Komplette Analysekette für einen Kunden: Astro → Fusion → Beobachtung → Strategie. */
export function useAnalysis(c: Customer) {
  const settings = useSettings()
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
      settings.offer,
    )
    return { profile, fusion, merged, strategy }
  }, [c, settings])
}
