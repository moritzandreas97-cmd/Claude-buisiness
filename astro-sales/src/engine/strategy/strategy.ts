import { DIM_BY_ID, DIM_IDS, type DimensionId } from '../symbolic/dimensions'
import { OBS_BY_ID, type MergedProfile } from '../behavior/observations'
import { PLAYBOOK, type PlayEntry } from './playbook'
import { addr, capFirst, type Address } from './address'
import {
  BENEFIT_FRAMES, CLOSINGS, FOLLOWUPS, GENERIC_BENEFIT, GENERIC_CLOSINGS, GENERIC_OPENER, NEED_BENEFIT, OPENERS, PHASE_NEXT,
  type StyleKey,
} from './phrases'
import type { LiveSignal, Phase } from './live'
import type { CatalogInfo } from '../catalog/types'

/** Herkunft einer Empfehlung – in absteigender Priorität. */
export type Basis = 'stated' | 'reaction' | 'observed' | 'product' | 'symbolic' | 'general'

export const BASIS_LABEL: Record<Basis, string> = {
  stated: 'Kundenaussage',
  reaction: 'Kundenreaktion',
  observed: 'Beobachtung',
  product: 'Produktdaten',
  symbolic: 'Symbolische Hypothese',
  general: 'Allgemein',
}

const BASIS_RANK: Record<Basis, number> = { stated: 0, reaction: 1, observed: 2, product: 3, symbolic: 4, general: 5 }

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

/** Produkt bzw. Angebot, auf das sich das Gespräch bezieht. */
export interface OfferContext {
  name: string
  description: string
  benefits: string[]
  audience: string
  price: string
  /**
   * Katalogdaten eines echten Angebots. Ist es gesetzt, gilt die strenge Faktenregel:
   * keine Standard-Vorteile, keine Sätze mit unbelegten Behauptungen.
   */
  catalog?: CatalogInfo
}

/** Platzhalter, wenn ein Katalogprodukt keinen belegten Vorteil hat. */
export const MISSING_BENEFIT = '[Vorteil laut Angebotsseite ergänzen]'

/** Hat das Angebot belegte bzw. eingetragene Vorteile? */
export const hasBenefits = (offer: OfferContext) => offer.benefits.some((b) => b.trim())

/**
 * Darf eine Satzvorlage für dieses Angebot verwendet werden? Bei Katalogprodukten
 * fallen Vorlagen weg, die einen nicht belegten Vorteil einsetzen würden.
 */
export function canUse(template: string, offer: OfferContext): boolean {
  if (!offer.catalog) return true
  return hasBenefits(offer) || !/\{benefit2?\}|\{b\}/.test(template)
}

export interface Driver {
  id: DimensionId
  value: number
  side: 'high' | 'low'
  basis: Basis
}

export type StrategyPhase = Exclude<Phase, 'ended'>

export interface StrategyOptions {
  address: Address
  phase: StrategyPhase
  /** Tatsächliche Kundenreaktionen (z. B. aus dem Live-Modus) – haben Vorrang vor Symbolik. */
  reactions: LiveSignal[]
}

export const DEFAULT_STRATEGY_OPTIONS: StrategyOptions = { address: 'sie', phase: 'opening', reactions: [] }

export interface PhaseFocus {
  phase: StrategyPhase
  say: Item[]
  ask: Item[]
  next: Item
}

export interface Strategy {
  drivers: Driver[]
  /** Kunde hat abgelehnt – keine weitere Ansprache ohne neue Zustimmung. */
  stopped: boolean
  reactions: Item[]
  focus: PhaseFocus
  opener: Item[]
  style: { tempo: string; energy: number; items: Item[] }
  topics: Item[]
  benefits: Item[]
  questions: Item[]
  objections: ObjectionItem[]
  closings: Item[]
  nextStep: Item[]
}

export const DEFAULT_OFFER: OfferContext = {
  name: 'mein Angebot',
  description: '',
  benefits: ['spürbar mehr Klarheit und weniger Aufwand'],
  audience: '',
  price: '',
}

/** Löst Du/Sie-Doppelformen und Produkt-Platzhalter auf. */
export function fill(text: string, offer: OfferContext, address: Address = 'sie'): string {
  const benefits = offer.benefits.filter((b) => b.trim())
  const b1 = benefits[0] ?? (offer.catalog ? MISSING_BENEFIT : DEFAULT_OFFER.benefits[0])
  return addr(text, address)
    .replaceAll('{offer}', offer.name.trim() || DEFAULT_OFFER.name)
    .replaceAll('{benefit2}', benefits[1] ?? b1)
    .replaceAll('{benefit}', b1)
    .replaceAll('{price}', offer.price.trim() || (offer.catalog ? '[Preis laut Angebotsseite prüfen]' : 'auf Anfrage'))
    .replaceAll('{audience}', offer.audience.trim() || 'Interessierte')
    .replaceAll('{description}', offer.description.trim() || offer.name.trim() || DEFAULT_OFFER.name)
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

/** Leitet aus tatsächlichen Kundenreaktionen konkrete Hinweise ab (höchste Priorität nach Kundenaussagen). */
const REACTION_HINT: Record<LiveSignal, string> = {
  interest: 'Hat Interesse gezeigt → genau an diesem Punkt anknüpfen und vertiefen.',
  details: 'Hat nach Details gefragt → konkrete Unterlagen, Belege oder ein Beispiel bereithalten.',
  doubt: 'Hat Zweifel geäußert → zuerst nachfragen, worauf sie sich beziehen, dann sachlich klären.',
  compare: 'Möchte vergleichen → faire Vergleichskriterien anbieten, Wettbewerb nicht schlechtreden.',
  price: 'Hat nach dem Preis gefragt → Preis ({price}) klar nennen und direkt mit dem Nutzen verbinden.',
  time: 'Braucht Bedenkzeit → konkreten Rückmeldetermin vereinbaren, keinen Druck aufbauen.',
  ready: 'Ist bereit für den nächsten Schritt → Abschluss einfach und klar machen.',
  no: 'Hat abgelehnt → Nein respektieren, keine weitere Ansprache ohne neue Zustimmung.',
}

export function buildStrategy(
  merged: MergedProfile,
  facts: KnownFacts,
  offer: OfferContext,
  opts: StrategyOptions = DEFAULT_STRATEGY_OPTIONS,
): Strategy {
  const drivers = selectDrivers(merged)
  const plays: { d: Driver; key: StyleKey; p: PlayEntry; w: string }[] = drivers.map((d) => ({
    d, key: `${d.id}:${d.side}` as StyleKey, p: PLAYBOOK[d.id][d.side], w: why(d, merged),
  }))
  const say = (t: string) => capFirst(fill(t, offer, opts.address))
  const basisOf = (d: Driver): Basis => (d.basis === 'observed' ? 'observed' : 'symbolic')
  const strict = !!offer.catalog
  const ok = (t: string) => canUse(t, offer) && !(strict && CLAIM_TEMPLATES.has(t))
  const ownBenefits = offer.benefits.filter((b) => b.trim())
  const benefitList = ownBenefits.length ? ownBenefits : strict ? [] : DEFAULT_OFFER.benefits
  const cat = offer.catalog

  // Jüngste Reaktionen zuerst, jede nur einmal.
  const recent = [...new Set([...opts.reactions].reverse())]
  const has = (s: LiveSignal) => opts.reactions.includes(s)
  const stopped = opts.reactions.at(-1) === 'no'
  const reactions: Item[] = recent.map((s) => ({ text: say(REACTION_HINT[s]), basis: 'reaction', why: 'Tatsächliche Reaktion im Gespräch' }))

  const opener: Item[] = []
  if (facts.referral) {
    opener.push({ text: say(`${facts.referral} hat mir erzählt, dass … – deshalb wollte ich mich bei {Ihnen|dir} melden. {Haben Sie|Hast du} kurz Zeit?`), basis: 'stated', why: 'Bekannte Empfehlung' })
  }
  facts.wishes.slice(0, 2).forEach((w) => opener.push({ text: say(`{Sie hatten|Du hattest} erwähnt, dass {Ihnen|dir} ${w} wichtig ist – dazu habe ich mir etwas überlegt.`), basis: 'stated', why: 'Ausdrücklich geäußerter Wunsch' }))
  if (has('interest')) opener.push({ text: say('Beim letzten Mal klang {offer} interessant für {Sie|dich} – was ist {Ihnen|dir} davon besonders hängen geblieben?'), basis: 'reaction', why: 'Hat bereits Interesse gezeigt' })
  plays.forEach(({ d, key, p, w }) => OPENERS[key] && ok(OPENERS[key]!) && opener.push({ text: say(OPENERS[key]!), basis: basisOf(d), why: `${p.opener} · ${w}` }))
  opener.push({ text: say(GENERIC_OPENER), basis: 'general', why: 'Neutraler Einstieg mit Erlaubnisfrage' })

  const energyDim = merged.energy.value ?? 50
  const tempo = energyDim >= 62 ? 'zügig & energiegeladen' : energyDim <= 38 ? 'ruhig & geduldig' : 'ausgewogen'
  const styleItems: Item[] = plays.map(({ d, p, w }) => ({ text: p.style, basis: basisOf(d), why: w }))
  if (!styleItems.length) styleItems.push({ text: 'Neutral beginnen und den Stil an die Reaktionen der Person anpassen.', basis: 'general' })

  const topics: Item[] = [
    ...facts.interests.map((i) => ({ text: i, basis: 'stated' as Basis, why: 'Bekanntes Interesse' })),
    ...plays.flatMap(({ d, p, w }) => p.topics.map((t) => ({ text: `${t} – Hypothese, im Gespräch prüfen`, basis: basisOf(d), why: w }))),
  ]

  const benefits: Item[] = []
  if (has('price')) {
    benefits.push({
      text: say(benefitList.length
        ? 'Der Preis für {offer} liegt bei {price} – dafür {bekommen Sie|bekommst du}: {benefit}.'
        : 'Der Preis für {offer} liegt bei {price}. Was genau enthalten ist, sehen wir uns gemeinsam auf der Angebotsseite an.'),
      basis: 'reaction', why: 'Hat nach dem Preis gefragt',
    })
  }
  facts.needs.forEach((n, i) => benefits.push(benefitList.length
    ? { text: say(NEED_BENEFIT.replace('{need}', n).replace('{b}', benefitList[i % benefitList.length])), basis: 'stated', why: 'Geäußerter Bedarf mit passendem Produktvorteil verknüpft' }
    : { text: say(`{Sie haben|Du hast} erwähnt, dass ${n} wichtig ist. Ob {offer} dazu passt, prüfen wir gemeinsam am Leistungsumfang.`), basis: 'stated', why: 'Geäußerter Bedarf – Produktvorteil nicht belegt' }))
  if (cat) {
    // Sachliche Argumente nur aus belegtem Leistungsumfang, ohne Stil-Rahmen.
    cat.arguments.forEach((a) => benefits.push({ text: say(a), basis: 'product', why: `Leistungsumfang laut Quelle (${cat.status.details === 'check' ? 'Details prüfen' : 'geprüft'})` }))
  } else benefitList.slice(0, 3).forEach((b, i) => {
    const pl = plays[i] ?? plays[0]
    const frame = (pl && BENEFIT_FRAMES[pl.key]) ?? GENERIC_BENEFIT
    benefits.push({ text: say(frame.replace('{b}', b)), basis: pl ? basisOf(pl.d) : 'general', why: pl ? `Vorteil im Stil „${DIM_BY_ID[pl.d.id].short}“ · ${pl.w}` : 'Produktvorteil' })
  })

  const questions: Item[] = [
    ...facts.needs.slice(0, 2).map((n) => ({ text: say(`Was genau bedeutet „${n}“ für {Sie|dich} im Alltag?`), basis: 'stated' as Basis, why: 'Bedarf vertiefen' })),
    ...(has('doubt') ? [{ text: say('Was genau lässt {Sie|dich} noch zögern?'), basis: 'reaction' as Basis, why: 'Hat Zweifel geäußert' }] : []),
    ...(cat?.needsQuestions ?? []).map((q) => ({ text: say(q), basis: 'product' as Basis, why: `Bedarfsfrage zu ${offer.name}` })),
    ...plays.map(({ d, p, w }) => ({ text: say(p.question), basis: basisOf(d), why: w })),
    ...FOLLOWUPS[opts.phase].map((q) => ({ text: say(q), basis: 'general' as Basis, why: `Passend zur Phase` })),
  ]

  const objections: ObjectionItem[] = [
    // Produktspezifische, transparente Antworten; passt das Signal zur Reaktion, steigt die Priorität.
    ...(cat?.objections ?? []).map((o) => ({
      objection: say(o.objection), answer: say(o.answer),
      basis: (o.signal && has(o.signal) ? 'reaction' : 'product') as Basis, why: `Einwand zu ${offer.name}`,
    })),
    // Stil-Antworten des Playbooks können Fakten unterstellen (z. B. Absicherungen) – nicht bei echten Angeboten.
    ...(strict ? [] : plays.map(({ d, p, w }) => ({ objection: say(p.objection.objection), answer: say(p.objection.answer), basis: basisOf(d), why: w }))),
    ...(strict ? [] : [{ objection: 'Das ist mir zu teuer.', answer: say('Verstehe. {Lassen Sie|Lass} uns kurz gegenüberstellen, was {Sie bekommen|du bekommst} – {benefit} – und was es kostet, wenn alles bleibt, wie es ist. Wenn es nicht passt, ist das völlig in Ordnung.'), basis: (has('price') ? 'reaction' : 'general') as Basis }]),
    { objection: 'Kein Interesse.', answer: say('Danke für die klare Antwort – das respektiere ich. Darf ich {Ihnen|dir} meine Kontaktdaten dalassen, falls sich etwas ändert?'), basis: 'general' },
  ]

  const closings: Item[] = []
  if (has('ready')) closings.push({ text: say('Prima – dann halten wir fest: {offer}, Start zum vereinbarten Termin. Ich schicke {Ihnen|dir} alles schriftlich.'), basis: 'reaction', why: 'Ist bereit für den nächsten Schritt' })
  if (has('time')) closings.push({ text: say('Nehmen {Sie|du} sich die Zeit. Passt es, wenn ich mich am … kurz melde?'), basis: 'reaction', why: 'Braucht Bedenkzeit' })
  plays.forEach(({ d, key, w }) => CLOSINGS[key] && ok(CLOSINGS[key]!) && closings.push({ text: say(CLOSINGS[key]!), basis: basisOf(d), why: w }))
  GENERIC_CLOSINGS.forEach((t) => closings.push({ text: say(t), basis: 'general', why: 'Offene Abschlussfrage ohne Druck' }))

  const sellable = cat?.status.availability !== 'historical'
  const nextStep: Item[] = [
    ...(cat && !sellable ? [{ text: 'Historischer Eintrag: nicht aktiv anbieten. Bei Interesse klären, ob es einen neuen Termin gibt.', basis: 'product' as Basis }] : []),
    ...(cat && cat.status.details === 'check' ? [{ text: 'Vor dem Gespräch Preis, Leistungsumfang und Bedingungen auf der offiziellen Angebotsseite prüfen.', basis: 'product' as Basis }] : []),
    ...(has('time') ? [{ text: 'Rückmeldetermin vereinbaren und Zusammenfassung schicken.', basis: 'reaction' as Basis }] : []),
    ...(has('ready') ? [{ text: 'Vereinbarung schriftlich bestätigen und Starttermin eintragen.', basis: 'reaction' as Basis }] : []),
    ...plays.slice(0, 2).map(({ d, p, w }) => ({ text: say(p.next), basis: basisOf(d), why: w })),
    { text: 'Gemeinsam festhalten: Was ist vereinbart, bis wann, wer meldet sich?', basis: 'general' },
  ]

  const sorted = {
    opener: opener.sort(byBasis),
    benefits: benefits.sort(byBasis),
    questions: dedupe(questions).sort(byBasis),
    objections: objections.sort(byBasis),
    closings: dedupe(closings).sort(byBasis),
    nextStep: nextStep.sort(byBasis),
  }

  const phaseSay: Record<StrategyPhase, Item[]> = {
    opening: sorted.opener,
    discovery: sorted.questions,
    presentation: sorted.benefits,
    objection: sorted.objections.map((o) => ({ text: o.answer, basis: o.basis, why: `Auf „${o.objection}“` })),
    closing: sellable ? sorted.closings : [{ text: say('Der Termin ist leider vorbei. Soll ich {Ihnen|dir} Bescheid geben, falls es einen neuen gibt?'), basis: 'product', why: 'Historischer Eintrag' }],
  }
  const askPool = FOLLOWUPS[opts.phase].map((q) => ({ text: say(q), basis: 'general' as Basis }))
  const focus: PhaseFocus = {
    phase: opts.phase,
    say: phaseSay[opts.phase].slice(0, 3),
    ask: (opts.phase === 'discovery' ? sorted.questions.slice(3) : askPool).slice(0, 3),
    next: stopped
      ? { text: 'Gespräch freundlich beenden. Keine weitere Ansprache ohne neue Zustimmung.', basis: 'reaction' }
      : !sellable ? { text: 'Nicht aktiv anbieten – historischer Eintrag.', basis: 'product' }
      : reactions.find((r) => r.text.includes('Bedenkzeit') || r.text.includes('bereit')) ?? { text: PHASE_NEXT[opts.phase], basis: 'general' },
  }

  return {
    drivers, stopped, reactions, focus,
    style: { tempo, energy: energyDim, items: styleItems.sort(byBasis) },
    topics: topics.sort(byBasis),
    ...sorted,
  }
}

/** Vorlagen mit allgemeinen Behauptungen, die bei echten Angeboten nicht belegt sind. */
const CLAIM_TEMPLATES = new Set<string>([
  OPENERS['openness:low']!,
  OPENERS['energy:high']!,
  CLOSINGS['openness:low']!,
])

function dedupe(items: Item[]): Item[] {
  const seen = new Set<string>()
  return items.filter((i) => (seen.has(i.text) ? false : (seen.add(i.text), true)))
}
