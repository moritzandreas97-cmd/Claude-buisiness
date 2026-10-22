import { DIM_BY_ID, DIM_IDS, type DimensionId } from '../symbolic/dimensions'
import { OBS_BY_ID, type MergedProfile } from '../behavior/observations'
import { PLAYBOOK, type PlayEntry } from './playbook'

/** Herkunft einer Empfehlung – in absteigender Priorität. */
export type Basis = 'stated' | 'observed' | 'symbolic' | 'general'

export const BASIS_LABEL: Record<Basis, string> = {
  stated: 'Kundenaussage',
  observed: 'Beobachtung',
  symbolic: 'Symbolische Hypothese',
  general: 'Allgemein',
}

const BASIS_RANK: Record<Basis, number> = { stated: 0, observed: 1, symbolic: 2, general: 3 }

export interface Item {
  text: string
  basis: Basis
  why?: string
}

export interface ObjectionItem {
  objection: string
  answer: string
  basis: Basis
  why?: string
}

export interface KnownFacts {
  interests: string[]
  needs: string[]
  wishes: string[]
  referral?: string
}

export interface OfferContext {
  name: string
  benefit: string
}

export interface Driver {
  id: DimensionId
  value: number
  side: 'high' | 'low'
  basis: Basis
}

export interface Strategy {
  drivers: Driver[]
  opener: Item[]
  style: { tempo: string; energy: number; items: Item[] }
  topics: Item[]
  benefits: Item[]
  questions: Item[]
  objections: ObjectionItem[]
  nextStep: Item[]
  phrases: Item[]
}

export const DEFAULT_OFFER: OfferContext = { name: 'mein Angebot', benefit: 'spürbar mehr Klarheit und weniger Aufwand' }

export function fill(text: string, offer: OfferContext): string {
  return text.replaceAll('{offer}', offer.name || DEFAULT_OFFER.name).replaceAll('{benefit}', offer.benefit || DEFAULT_OFFER.benefit)
}

const byBasis = <T extends { basis: Basis }>(a: T, b: T) => BASIS_RANK[a.basis] - BASIS_RANK[b.basis]

/** Bestimmt die prägendsten Dimensionen; Beobachtungen werden bevorzugt. */
export function selectDrivers(merged: MergedProfile, n = 3): Driver[] {
  return DIM_IDS
    .map((id) => merged[id])
    .filter((d) => d.value !== null && Math.abs(d.value - 50) >= 8)
    .sort((a, b) => {
      const pa = a.source === 'observed' ? 100 : 0
      const pb = b.source === 'observed' ? 100 : 0
      return pb + Math.abs(b.value! - 50) - (pa + Math.abs(a.value! - 50))
    })
    .slice(0, n)
    .map((d) => ({
      id: d.id, value: d.value!, side: d.value! >= 50 ? 'high' : 'low',
      basis: d.source === 'observed' ? 'observed' : 'symbolic',
    }))
}

function why(d: Driver, merged: MergedProfile): string {
  const info = DIM_BY_ID[d.id]
  const label = `${info.short} ${d.side === 'high' ? 'hoch' : 'niedrig'} (${d.value})`
  if (d.basis === 'observed') {
    return `${label} – beobachtet: ${merged[d.id].observedBy.map((o) => OBS_BY_ID[o].label).join(', ')}`
  }
  return `${label} – symbolisch abgeleitet`
}

export function buildStrategy(merged: MergedProfile, facts: KnownFacts, offer: OfferContext): Strategy {
  const drivers = selectDrivers(merged)
  const plays: { d: Driver; p: PlayEntry; w: string }[] = drivers.map((d) => ({
    d, p: PLAYBOOK[d.id][d.side], w: why(d, merged),
  }))
  const f = (t: string) => fill(t, offer)

  const opener: Item[] = []
  if (facts.referral) {
    opener.push({ text: `Auf die Empfehlung Bezug nehmen: „${facts.referral} hat mir erzählt, dass … – deshalb wollte ich mich bei Ihnen melden.“`, basis: 'stated', why: 'Bekannte Empfehlung' })
  }
  facts.wishes.slice(0, 2).forEach((w) => opener.push({ text: `An den geäußerten Wunsch anknüpfen: „Sie hatten erwähnt, dass Ihnen ${w} wichtig ist …“`, basis: 'stated', why: 'Ausdrücklich geäußerter Wunsch' }))
  plays.forEach(({ d, p, w }) => opener.push({ text: p.opener, basis: d.basis, why: w }))
  if (!opener.length) opener.push({ text: 'Offen und freundlich einsteigen, Anlass nennen, Erlaubnis für das Gespräch einholen.', basis: 'general' })

  const energyDim = merged.energy.value ?? 50
  const tempo = energyDim >= 62 ? 'zügig & energiegeladen' : energyDim <= 38 ? 'ruhig & geduldig' : 'ausgewogen'
  const styleItems: Item[] = plays.map(({ d, p, w }) => ({ text: p.style, basis: d.basis, why: w }))
  if (!styleItems.length) styleItems.push({ text: 'Neutral beginnen und den Stil an die Reaktionen der Person anpassen.', basis: 'general' })

  const topics: Item[] = [
    ...facts.interests.map((i) => ({ text: i, basis: 'stated' as Basis, why: 'Bekanntes Interesse' })),
    ...plays.flatMap(({ d, p, w }) => p.topics.map((t) => ({ text: `${t} – Hypothese, im Gespräch prüfen`, basis: d.basis === 'observed' ? 'observed' as Basis : 'symbolic' as Basis, why: w }))),
  ]

  const benefits: Item[] = [
    ...facts.needs.map((n) => ({ text: `${offer.name || DEFAULT_OFFER.name} adressiert direkt: ${n}`, basis: 'stated' as Basis, why: 'Geäußerter Bedarf' })),
    ...plays.map(({ d, p, w }) => ({ text: f(p.benefit), basis: d.basis, why: w })),
  ]

  const questions: Item[] = [
    ...facts.needs.slice(0, 2).map((n) => ({ text: `Was genau bedeutet „${n}“ für Sie im Alltag?`, basis: 'stated' as Basis, why: 'Bedarf vertiefen' })),
    ...plays.map(({ d, p, w }) => ({ text: p.question, basis: d.basis, why: w })),
    { text: 'Was müsste passieren, damit sich das Gespräch für Sie gelohnt hat?', basis: 'general' },
    { text: 'Wie lösen Sie das Thema aktuell – und was gefällt Ihnen daran (nicht)?', basis: 'general' },
  ]

  const objections: ObjectionItem[] = [
    ...plays.map(({ d, p, w }) => ({ objection: p.objection.objection, answer: f(p.objection.answer), basis: d.basis, why: w })),
    { objection: 'Das ist mir zu teuer.', answer: f('Verstehe. Lassen Sie uns kurz gegenüberstellen, was Sie bekommen und was es Sie kostet, wenn alles bleibt wie es ist. Wenn es nicht passt, ist das völlig in Ordnung.'), basis: 'general' },
    { objection: 'Kein Interesse.', answer: 'Danke für die klare Antwort – dann respektiere ich das. Darf ich Ihnen meine Kontaktdaten dalassen, falls sich etwas ändert?', basis: 'general' },
  ]

  const nextStep: Item[] = [
    ...plays.slice(0, 2).map(({ d, p, w }) => ({ text: f(p.next), basis: d.basis, why: w })),
    { text: 'Gemeinsam festhalten: Was ist vereinbart, bis wann, wer meldet sich?', basis: 'general' },
  ]

  const phrases: Item[] = [
    ...facts.wishes.slice(0, 1).map((w) => ({ text: `„Sie hatten gesagt, ${w} ist Ihnen wichtig – genau da setzt ${offer.name || DEFAULT_OFFER.name} an.“`, basis: 'stated' as Basis })),
    ...plays.map(({ d, p, w }) => ({ text: `„${f(p.phrase)}“`, basis: d.basis, why: w })),
  ]

  return {
    drivers,
    opener: opener.sort(byBasis),
    style: { tempo, energy: energyDim, items: styleItems.sort(byBasis) },
    topics: topics.sort(byBasis),
    benefits: benefits.sort(byBasis),
    questions: questions.sort(byBasis),
    objections: objections.sort(byBasis),
    nextStep: nextStep.sort(byBasis),
    phrases: phrases.sort(byBasis),
  }
}
