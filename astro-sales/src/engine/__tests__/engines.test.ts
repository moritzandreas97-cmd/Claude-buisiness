import { describe, expect, it } from 'vitest'
import { resolveProfile } from '../astro/calculate'
import { fuseProfile } from '../symbolic/fusion'
import { DEFAULT_RULES } from '../symbolic/rules'
import { mergeWithObservations } from '../behavior/observations'
import { buildStrategy, DEFAULT_OFFER } from '../strategy/strategy'
import { coach, liveState } from '../strategy/live'
import { buildAcquisition } from '../acquisition/acquisition'

const profile = resolveProfile('manual', {}, { sun: 'leo', moon: 'cancer', asc: 'aries', lifePath: 8, animal: 'dragon', chElement: 'fire' })

describe('Fusion', () => {
  it('liefert nachvollziehbare Beiträge', () => {
    const f = fuseProfile(profile, DEFAULT_RULES)
    expect(f.scores.presence.value).toBeGreaterThan(70)
    expect(f.scores.presence.contributions.map((c) => c.system)).toContain('sun')
    expect(f.knownSystems).toHaveLength(5)
    expect(f.links).toHaveLength(10)
  })
  it('erfindet ohne Angaben keine Werte', () => {
    const f = fuseProfile(resolveProfile('manual', {}, {}), DEFAULT_RULES)
    expect(f.scores.energy.value).toBeNull()
    expect(f.insights).toHaveLength(0)
  })
  it('erkennt Spannungsfelder', () => {
    const f = fuseProfile(profile, DEFAULT_RULES)
    expect(f.insights.some((i) => i.kind === 'tension')).toBe(true)
  })
})

describe('Beobachtung hat Vorrang', () => {
  it('überschreibt symbolische Werte', () => {
    const f = fuseProfile(profile, DEFAULT_RULES)
    const m = mergeWithObservations(f.scores, ['reserved'])
    expect(m.communication).toMatchObject({ value: 25, source: 'observed' })
    const s = buildStrategy(m, { interests: ['Segeln'], needs: [], wishes: ['Planbarkeit'] }, DEFAULT_OFFER)
    expect(s.drivers[0].basis).toBe('observed')
    expect(s.opener[0].basis).toBe('stated')
    expect(s.topics[0]).toMatchObject({ text: 'Segeln', basis: 'stated' })
  })
})

describe('Live & Akquise', () => {
  it('Nein beendet das Gespräch', () => {
    expect(liveState(['interest', 'no']).phase).toBe('ended')
    expect(coach('no', [], DEFAULT_OFFER).say[0]).toMatch(/respektiere/)
  })
  it('warnt bei Kalt-E-Mail', () => {
    const p = buildAcquisition('stranger', 'email', 'contact', DEFAULT_OFFER)
    expect(p.steps).toHaveLength(6)
    expect(p.compliance.some((c) => c.level === 'block')).toBe(true)
  })
})
