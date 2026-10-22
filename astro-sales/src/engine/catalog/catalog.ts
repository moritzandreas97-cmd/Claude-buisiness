import type { OfferContext } from '../strategy/strategy'
import type { CatalogDefinition, CatalogEntry, CatalogInfo, CatalogPrice } from './types'

/** Ein Produkt, wie es die App speichert: Angebotskontext + optional Katalogdaten. */
export interface CatalogProduct extends OfferContext {
  id: string
}

const euro = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 })

/** Preis als Text, z. B. „98 € pro Monat“ oder „4.400 € netto“. Unbekanntes bleibt sichtbar offen. */
export function formatPrice(p: CatalogPrice): string {
  if (p.amount == null) return ''
  const base = `${euro.format(p.amount)} €`
  const interval = p.interval === 'month' ? ' pro Monat' : ''
  const tax = p.taxNote && p.taxNote !== 'nicht angegeben' ? ` ${p.taxNote}` : ''
  return `${base}${interval}${tax}`
}

export function entriesOf(def: CatalogDefinition): CatalogEntry[] {
  return def.entries.map((e) => ({ ...e, catalogId: def.id, provider: def.provider, isTestData: def.isTestData }))
}

/** Überträgt einen Katalogeintrag in die Produktfelder, die die Engines nutzen. */
export function entryToOffer(entry: CatalogEntry): OfferContext {
  const { name, description, ...info } = entry
  const catalog: CatalogInfo = info
  return {
    name,
    description,
    // Nur belegte Argumente werden zu „Vorteilen“ – keine erfundenen Nutzenversprechen.
    benefits: [...entry.arguments],
    audience: entry.targetGroup,
    price: formatPrice(entry.price),
    catalog,
  }
}

export interface MergeResult<P extends CatalogProduct> {
  products: P[]
  added: number
  updated: number
}

/**
 * Fügt einen Katalog in die Produktliste ein bzw. aktualisiert ihn – Zuordnung über
 * `catalogId` + `sku`. Eigene Produkte bleiben unberührt, Produkt-IDs bleiben stabil.
 */
export function mergeCatalog<P extends CatalogProduct>(
  products: P[], def: CatalogDefinition, makeId: () => string,
): MergeResult<P> {
  let added = 0
  let updated = 0
  const next = [...products]
  for (const entry of entriesOf(def)) {
    const offer = entryToOffer(entry)
    const idx = next.findIndex((p) => p.catalog?.catalogId === def.id && p.catalog.sku === entry.sku)
    if (idx >= 0) {
      next[idx] = { ...next[idx], ...offer }
      updated++
    } else {
      next.push({ id: makeId(), ...offer } as P)
      added++
    }
  }
  return { products: next, added, updated }
}

/** Strukturprüfung für importierte Kataloge (z. B. aus einer offiziellen JSON-Datei). */
export function validateCatalog(input: unknown): { ok: true; def: CatalogDefinition } | { ok: false; errors: string[] } {
  const errors: string[] = []
  const d = input as Partial<CatalogDefinition> | null
  if (!d || typeof d !== 'object') return { ok: false, errors: ['Keine gültige JSON-Struktur.'] }
  for (const k of ['id', 'name', 'provider', 'version', 'collectedAt'] as const) {
    if (typeof d[k] !== 'string' || !d[k]) errors.push(`Feld „${k}“ fehlt.`)
  }
  if (!Array.isArray(d.entries) || d.entries.length === 0) errors.push('Keine Einträge („entries“).')
  const skus = new Set<string>()
  d.entries?.forEach((e, i) => {
    const at = `Eintrag ${i + 1}`
    if (!e || typeof e !== 'object') { errors.push(`${at}: ungültig.`); return }
    if (!e.sku || !/^[a-z0-9-]{2,80}$/.test(e.sku)) errors.push(`${at}: „sku“ fehlt oder ungültig.`)
    else if (skus.has(e.sku)) errors.push(`${at}: „sku“ doppelt.`)
    else skus.add(e.sku)
    if (!e.name) errors.push(`${at}: „name“ fehlt.`)
    if (!e.price || typeof e.price !== 'object') errors.push(`${at}: „price“ fehlt.`)
    if (!Array.isArray(e.sources) || e.sources.length === 0) errors.push(`${at}: mindestens eine Quelle („sources“) nötig.`)
    if (!e.status || !['complete', 'check'].includes(e.status.details) || !['verified', 'unverified', 'historical'].includes(e.status.availability)) {
      errors.push(`${at}: „status“ ungültig.`)
    }
    for (const k of ['scope', 'needsQuestions', 'arguments', 'objections', 'notes'] as const) {
      if (!Array.isArray(e[k])) errors.push(`${at}: „${k}“ muss eine Liste sein.`)
    }
  })
  return errors.length ? { ok: false, errors } : { ok: true, def: d as CatalogDefinition }
}

/**
 * Quelle für spätere Aktualisierungen. Heute: eingebaute Testdaten oder eine
 * importierte JSON-Datei. Später z. B. ein offizieller Export des Anbieters.
 */
export interface CatalogUpdateSource {
  id: string
  label: string
  load(): Promise<CatalogDefinition>
}

export function staticSource(def: CatalogDefinition): CatalogUpdateSource {
  return { id: `static:${def.id}`, label: `${def.name} (eingebaut, Stand ${def.collectedAt})`, load: async () => def }
}

export function jsonTextSource(label: string, text: string): CatalogUpdateSource {
  return {
    id: `json:${label}`,
    label,
    async load() {
      const res = validateCatalog(JSON.parse(text))
      if (!res.ok) throw new Error(res.errors.join('\n'))
      return res.def
    },
  }
}

/** Darf das Produkt aktiv angeboten werden? Historische Einträge nicht. */
export function isSellable(offer: OfferContext): boolean {
  return offer.catalog?.status.availability !== 'historical'
}
