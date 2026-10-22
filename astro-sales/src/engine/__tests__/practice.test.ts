import { describe, expect, it } from 'vitest'
import { resolveProfile } from '../astro/calculate'
import { fuseProfile } from '../symbolic/fusion'
import { DEFAULT_RULES } from '../symbolic/rules'
import { mergeWithObservations, type ObservationId } from '../behavior/observations'
import { buildStrategy, fill, type OfferContext, type StrategyPhase } from '../strategy/strategy'
import { addr } from '../strategy/address'
import { SIGNALS, coach, type LiveSignal } from '../strategy/live'
import { AUDIENCES, CHANNELS, GOALS, buildAcquisition, composeInstant } from '../acquisition/acquisition'
import type { Address } from '../strategy/address'

const product: OfferContext = {
  name: 'Solarpaket Plus',
  description: 'Photovoltaik inklusive Speicher und Montage.',
  benefits: ['senkt die Stromkosten um bis zu 60 %', 'Montage in einem Tag'],
  audience: 'Eigenheimbesitzer',
  price: '12.900 €',
}

const profile = resolveProfile('manual', {}, { sun: 'virgo', moon: 'capricorn', asc: 'cancer', lifePath: 4, animal: 'ox', chElement: 'metal' })
const fusion = fuseProfile(profile, DEFAULT_RULES)
const strategyFor = (opts: { address?: Address; phase?: StrategyPhase; reactions?: LiveSignal[]; observed?: ObservationId[] } = {}) =>
  buildStrategy(
    mergeWithObservations(fusion.scores, opts.observed ?? []),
    { interests: [], needs: ['weniger Stromkosten'], wishes: [] },
    product,
    { address: opts.address ?? 'sie', phase: opts.phase ?? 'opening', reactions: opts.reactions ?? [] },
  )

/** Alle kundengerichteten Texte einer Strategie. */
const allTexts = (s: ReturnType<typeof strategyFor>) => [
  ...s.opener, ...s.benefits, ...s.questions, ...s.closings, ...s.focus.say, ...s.focus.ask,
].map((i) => i.text).concat(s.objections.flatMap((o) => [o.objection, o.answer]))

const SIE_FORMS = /\b(Sie|Ihnen|Ihre[mnrs]?|Ihr)\b/

describe('Du-/Sie-Umschaltung', () => {
  it('löst Doppelformen auf', () => {
    expect(addr('Wie {sehen Sie|siehst du} das?', 'sie')).toBe('Wie sehen Sie das?')
    expect(addr('Wie {sehen Sie|siehst du} das?', 'du')).toBe('Wie siehst du das?')
  })
  it('enthält in der Du-Form keine Sie-Formen – über alle Phasen und Reaktionen', () => {
    const phases: StrategyPhase[] = ['opening', 'discovery', 'presentation', 'objection', 'closing']
    for (const phase of phases) {
      const texts = allTexts(strategyFor({ address: 'du', phase, reactions: ['interest', 'price', 'doubt', 'time', 'ready'] }))
      for (const t of texts) expect(t, t).not.toMatch(SIE_FORMS)
      expect(texts.join(' ')).not.toMatch(/[{}|]/)
    }
  })
  it('Live-Coaching und Akquise ebenfalls ohne Sie-Formen in der Du-Form', () => {
    for (const sig of SIGNALS) {
      const c = coach(sig.id, [{ id: 'structure', value: 80, side: 'high', basis: 'observed' }], product, 'du')
      for (const t of [...c.say, c.next]) expect(t, t).not.toMatch(SIE_FORMS)
    }
    for (const a of AUDIENCES) for (const ch of CHANNELS) for (const g of GOALS) {
      const plan = buildAcquisition(a.id, ch.id, g.id, product, [], 'du')
      const texts = plan.steps.flatMap((s) => s.alternatives.flatMap((x) => [x.text, x.example ?? '']))
      texts.push(...composeInstant(plan, ch.id, product, 'du').lines.map((l) => l.text))
      for (const t of texts) expect(t, t).not.toMatch(SIE_FORMS)
      expect(texts.join(' ')).not.toMatch(/[{}]/)
    }
  })
  it('Sie-Form beginnt Sätze groß, Du-Form mit großem Satzanfang', () => {
    expect(strategyFor({ address: 'du', phase: 'objection' }).objections.every((o) => /^[„"A-ZÄÖÜ(]/.test(o.answer))).toBe(true)
  })
})

describe('Produkt in der Strategie', () => {
  it('setzt Name, Vorteile und Preis ein', () => {
    expect(fill('{offer}: {benefit} für {price}', product)).toBe('Solarpaket Plus: senkt die Stromkosten um bis zu 60 % für 12.900 €')
    const s = strategyFor({ phase: 'presentation' })
    const text = s.benefits.map((b) => b.text).join(' ')
    expect(text).toContain('senkt die Stromkosten')
    expect(text).toContain('Montage in einem Tag')
    expect(s.benefits.find((b) => b.basis === 'stated')!.text).toContain('weniger Stromkosten')
  })
  it('ohne Preis: „auf Anfrage“ statt erfundener Zahl', () => {
    expect(fill('{price}', { ...product, price: '' })).toBe('auf Anfrage')
  })
})

describe('Gesprächsphase', () => {
  it('Fokus wechselt mit der Phase', () => {
    expect(strategyFor({ phase: 'opening' }).focus.say[0].text).not.toBe(strategyFor({ phase: 'closing' }).focus.say[0].text)
    expect(strategyFor({ phase: 'closing' }).focus.say.length).toBeGreaterThan(0)
    expect(strategyFor({ phase: 'presentation' }).focus.say.some((i) => i.text.includes('Stromkosten'))).toBe(true)
  })
})

describe('Kundenreaktionen vor Symbolik', () => {
  it('Preisfrage kommt direkt nach geäußertem Bedarf, vor allen Profil-Ableitungen', () => {
    const s = strategyFor({ reactions: ['price'] })
    expect(s.benefits[0].basis).toBe('stated')
    expect(s.benefits[1]).toMatchObject({ basis: 'reaction' })
    expect(s.benefits[1].text).toContain('12.900 €')
    expect(s.reactions[0].basis).toBe('reaction')
  })
  it('symbolische Items stehen nie vor Reaktionen oder Beobachtungen', () => {
    const rank = { stated: 0, reaction: 1, observed: 2, product: 3, symbolic: 4, general: 5 }
    const s = strategyFor({ reactions: ['ready', 'doubt'], observed: ['decidesFast'] })
    for (const list of [s.opener, s.benefits, s.questions, s.closings, s.nextStep]) {
      const ranks = list.map((i) => rank[i.basis])
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
    }
    expect(s.closings[0].basis).toBe('reaction')
  })
  it('symbolische Themen sind als Hypothese gekennzeichnet', () => {
    const s = strategyFor()
    s.topics.filter((t) => t.basis === 'symbolic').forEach((t) => expect(t.text).toMatch(/Hypothese/))
  })
  it('Nein stoppt die Strategie', () => {
    const s = strategyFor({ reactions: ['interest', 'no'] })
    expect(s.stopped).toBe(true)
    expect(s.focus.next.text).toMatch(/beenden/)
  })
  it('Live-Coaching: Beobachtung vor Symbolik, genau drei Kernaussagen', () => {
    const observed = coach('price', [{ id: 'directness', value: 85, side: 'high', basis: 'observed' }], product)
    expect(observed.say[0]).toBe('12.900 €. Und das ist drin: senkt die Stromkosten um bis zu 60 %.')
    expect(observed.why.basis).toBe('reaction')
    expect(observed.hint?.basis).toBe('observed')
    const symbolic = coach('price', [{ id: 'directness', value: 85, side: 'high', basis: 'symbolic' }], product)
    expect(symbolic.say[0]).toContain('Der Preis für Solarpaket Plus liegt bei 12.900 €')
    expect(symbolic.hint?.basis).toBe('symbolic')
    expect(Object.keys(symbolic).sort()).toEqual(['hint', 'next', 'say', 'signal', 'why'])
  })
})

describe('Akquise-Sofortansprache', () => {
  it('E-Mail: komplette Nachricht mit Betreff, Produkt und Gruß', () => {
    const plan = buildAcquisition('prospect', 'email', 'appointment', product, [], 'sie')
    const msg = composeInstant(plan, 'email', product, 'sie')
    expect(msg.kind).toBe('written')
    expect(msg.lines[0]).toMatchObject({ label: 'Betreff', text: 'Solarpaket Plus – kurze Frage' })
    expect(msg.lines.map((l) => l.text).join('\n')).toContain('Solarpaket Plus')
  })
  it('Persönlich: mündliche Abfolge, wählbare Alternativen', () => {
    const plan = buildAcquisition('stranger', 'event', 'interest', product, [], 'du')
    const a = composeInstant(plan, 'event', product, 'du')
    const b = composeInstant(plan, 'event', product, 'du', { opener: 'curious' })
    expect(a.kind).toBe('spoken')
    expect(a.lines.map((l) => l.label)).toEqual(['Einstieg', 'Dann fragen', 'Bei Interesse'])
    expect(a.lines[0].text).not.toBe(b.lines[0].text)
    expect(b.lines[0].text).toBe('Darf ich fragen, was dich hierher geführt hat?')
  })
  it('Zielgruppe des Produkts erscheint als Hinweis', () => {
    expect(buildAcquisition('stranger', 'event', 'contact', product).compliance.some((c) => c.text.includes('Eigenheimbesitzer'))).toBe(true)
  })
})
