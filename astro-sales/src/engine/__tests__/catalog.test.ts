import { describe, expect, it } from 'vitest'
import { RELIFE_TEST_CATALOG } from '../../data/catalogs/relife'
import { entriesOf, entryToOffer, formatPrice, mergeCatalog, validateCatalog, type CatalogProduct } from '../catalog/catalog'
import { resolveProfile } from '../astro/calculate'
import { fuseProfile } from '../symbolic/fusion'
import { DEFAULT_RULES } from '../symbolic/rules'
import { mergeWithObservations } from '../behavior/observations'
import { buildStrategy, DEFAULT_OFFER, MISSING_BENEFIT, type OfferContext, type StrategyPhase } from '../strategy/strategy'
import { SIGNALS, coach } from '../strategy/live'
import { AUDIENCES, CHANNELS, GOALS, buildAcquisition, composeInstant } from '../acquisition/acquisition'

const entries = entriesOf(RELIFE_TEST_CATALOG)
const offer = (sku: string): OfferContext => entryToOffer(entries.find((e) => e.sku === sku)!)

const merged = mergeWithObservations(
  fuseProfile(resolveProfile('manual', {}, { sun: 'aries', moon: 'taurus', asc: 'libra', lifePath: 5, animal: 'rabbit', chElement: 'wood' }), DEFAULT_RULES).scores,
  [],
)
const PHASES: StrategyPhase[] = ['opening', 'discovery', 'presentation', 'objection', 'closing']
const SIE = /\b(Sie|Ihnen|Ihre[mnrs]?|Ihr)\b/

describe('RELIFE-Testkatalog: Daten', () => {
  it('ist strukturell gültig', () => {
    expect(validateCatalog(RELIFE_TEST_CATALOG).ok).toBe(true)
  })

  it('enthält genau die sieben Angebote mit den genannten Preisen', () => {
    expect(entries.map((e) => [e.name, formatPrice(e.price)])).toEqual([
      ['RELIFE First Step Mentorship', '98 € pro Monat'],
      ['RELIFE Men Masterclass', '98 €'],
      ['RELIFE Decode the Universe', '1.480 € netto'],
      ['RELIFE Transform Your Reality', '4.400 € netto'],
      ['RELIFE The Awakening', '6.200 € inkl. ggf. anwendbarer MwSt.'],
      ['One on One mit Agron Bekirovski', '1.970 €'],
      ['RELIFE Dubai Mastermind September 2026', '1.970 €'],
    ])
  })

  it('kennzeichnet Prüfstatus und Verfügbarkeit', () => {
    for (const e of entries) {
      expect(e.isTestData).toBe(true)
      expect(e.status.details).toBe('check')
      expect(e.sources.length).toBeGreaterThan(0)
    }
    expect(entries.filter((e) => e.status.availability === 'historical').map((e) => e.sku)).toEqual(['dubai-mastermind-2026-09'])
    expect(entries.filter((e) => e.status.availability === 'unverified')).toHaveLength(6)
  })

  it('erfindet keine Details: ohne belegten Umfang keine Argumente und kein Link', () => {
    for (const e of entries.filter((x) => x.scope.length === 0)) {
      expect(e.arguments, e.sku).toEqual([])
      expect(e.offerUrl, e.sku).toBe('')
      expect(e.targetGroup, e.sku).toBe('')
    }
    const tyr = entries.find((e) => e.sku === 'transform-your-reality')!
    expect(tyr.offerUrl).toBe('https://myablefy.com/s/agron-bekirovski/transform-your-reality')
    expect(tyr.scope).toContain('4 Module mit lebenslangem Zugriff, 119 Lektionen')
  })

  it('enthält keine Garantie- oder Provisionsangaben', () => {
    const text = JSON.stringify(RELIFE_TEST_CATALOG)
    expect(text).not.toMatch(/Provision|garantiert(?!\?)|Geld-zurück/i)
  })
})

describe('Katalog-Import und spätere Aktualisierung', () => {
  it('ist idempotent und behält Produkt-IDs', () => {
    let n = 0
    const id = () => `p${++n}`
    const first = mergeCatalog([{ id: 'own', ...DEFAULT_OFFER }], RELIFE_TEST_CATALOG, id)
    expect(first).toMatchObject({ added: 7, updated: 0 })
    const again = mergeCatalog(first.products, RELIFE_TEST_CATALOG, id)
    expect(again).toMatchObject({ added: 0, updated: 7 })
    expect(again.products.map((p) => p.id)).toEqual(first.products.map((p) => p.id))
    expect(again.products[0]).toMatchObject({ id: 'own', name: DEFAULT_OFFER.name })
  })

  it('übernimmt geänderte Daten aus einer neuen Quelle', () => {
    const updated = structuredClone(RELIFE_TEST_CATALOG)
    updated.entries[0].status = { details: 'complete', availability: 'verified' }
    updated.entries[0].offerUrl = 'https://example.org/first-step'
    const base = mergeCatalog<CatalogProduct>([], RELIFE_TEST_CATALOG, () => Math.random().toString()).products
    const res = mergeCatalog(base, updated, () => 'x')
    expect(res.products[0].catalog).toMatchObject({ offerUrl: 'https://example.org/first-step', status: { availability: 'verified' } })
  })

  it('weist unvollständige Importe zurück', () => {
    const broken = structuredClone(RELIFE_TEST_CATALOG) as unknown as { entries: { sources: unknown[] }[] }
    broken.entries[2].sources = []
    const res = validateCatalog(broken)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors.join()).toMatch(/Eintrag 3.*Quelle/)
  })
})

describe('Strenge Faktenregel in Strategie, Live und Akquise', () => {
  const allStrategyTexts = (o: OfferContext, phase: StrategyPhase, address: 'sie' | 'du' = 'sie') => {
    const s = buildStrategy(merged, { interests: [], needs: ['mehr Klarheit'], wishes: [] }, o, { address, phase, reactions: ['interest', 'price', 'doubt', 'time'] })
    return {
      s,
      texts: [...s.opener, ...s.benefits, ...s.questions, ...s.closings, ...s.focus.say, ...s.focus.ask].map((i) => i.text)
        .concat(s.objections.flatMap((o) => [o.objection, o.answer])),
    }
  }

  it('setzt bei unbelegten Angeboten weder Standard-Vorteil noch Platzhalter in Sätze ein', () => {
    for (const e of entries) {
      for (const phase of PHASES) {
        const { texts } = allStrategyTexts(entryToOffer(e), phase)
        const joined = texts.join('\n')
        expect(joined, `${e.sku}/${phase}`).not.toContain(DEFAULT_OFFER.benefits[0])
        expect(joined, `${e.sku}/${phase}`).not.toContain(MISSING_BENEFIT)
        expect(joined, `${e.sku}/${phase}`).not.toMatch(/Eine Kundin|bewährte Lösung|spart .* Zeit|abgesichert/)
      }
    }
  })

  it('liefert produktspezifische Bedarfsfragen, Argumente und Einwände mit Herkunft „Produktdaten“', () => {
    const { s } = allStrategyTexts(offer('transform-your-reality'), 'presentation')
    expect(s.questions.some((q) => q.basis === 'product' && q.text.includes('dienstags'))).toBe(true)
    expect(s.benefits.filter((b) => b.basis === 'product').map((b) => b.text)).toContain('4 Module mit lebenslangem Zugriff und insgesamt 119 Lektionen.')
    expect(s.objections.find((o) => o.objection === 'Ist das der Endpreis?')?.answer).toContain('netto')
    expect(s.benefits[1].text).toContain('4.400 € netto') // Preisfrage als Reaktion
  })

  it('bietet historische Angebote nicht aktiv an', () => {
    const { s } = allStrategyTexts(offer('dubai-mastermind-2026-09'), 'closing')
    expect(s.focus.next.text).toMatch(/nicht aktiv anbieten/i)
    expect(s.focus.say[0].text).toMatch(/vorbei/)
    const plan = buildAcquisition('prospect', 'dm', 'sale', offer('dubai-mastermind-2026-09'))
    expect(plan.compliance.some((c) => c.level === 'block' && c.text.includes('nicht mehr aktiv'))).toBe(true)
  })

  it('Du-Form ohne Sie-Formen auch für Katalogprodukte', () => {
    for (const e of entries) for (const phase of PHASES) {
      for (const t of allStrategyTexts(entryToOffer(e), phase, 'du').texts) expect(t, `${e.sku}: ${t}`).not.toMatch(SIE)
    }
  })

  it('Live-Modus: Produktantwort je Signal, keine unterstellten Absicherungen', () => {
    const drivers = [{ id: 'security' as const, value: 85, side: 'high' as const, basis: 'observed' as const }]
    for (const e of entries) {
      for (const sig of SIGNALS) {
        const c = coach(sig.id, drivers, entryToOffer(e), 'du')
        const all = [...c.say, c.next].join('\n')
        expect(all, `${e.sku}/${sig.id}`).not.toContain(MISSING_BENEFIT)
        expect(all, `${e.sku}/${sig.id}`).not.toMatch(/abgesichert|Konditionen transparent|Bedingungen sind transparent/)
        for (const t of [...c.say, c.next]) expect(t).not.toMatch(SIE)
      }
    }
    const price = coach('price', [], offer('transform-your-reality'))
    expect(price.say[0]).toContain('4.400 € netto')
    expect(price.hint?.basis).toBe('product')
    expect(coach('price', [], offer('first-step-mentorship')).say.join()).toContain('98 € pro Monat')
  })

  it('Akquise: keine erfundenen Kundenbeispiele, Prüfhinweis sichtbar, Ansprache vollständig', () => {
    for (const e of entries) for (const a of AUDIENCES) for (const ch of CHANNELS) for (const g of GOALS) {
      const o = entryToOffer(e)
      const plan = buildAcquisition(a.id, ch.id, g.id, o, [], 'sie')
      expect(plan.steps.every((s) => s.alternatives.length > 0)).toBe(true)
      expect(plan.steps.flatMap((s) => s.alternatives).some((x) => x.id === 'story')).toBe(false)
      const msg = composeInstant(plan, ch.id, o, 'sie').lines.map((l) => l.text).join('\n')
      expect(msg).not.toContain(MISSING_BENEFIT)
      expect(plan.compliance.some((c) => c.text.includes('Testdaten'))).toBe(true)
    }
  })
})
