import type { AstroProfile } from '../astro/calculate'
import { SIGN_BY_ID, ELEMENT_LABEL, type WesternElement } from '../astro/zodiac'
import { ANIMAL_BY_ID, CH_ELEMENT_BY_ID } from '../astro/chinese'
import { LIFE_PATH_LABEL } from '../astro/numerology'
import { DIMENSIONS, DIM_BY_ID, DIM_IDS, type DimensionId, type DimVector } from './dimensions'
import { MAX_RULE, SYSTEM_LABEL, focusFor, type RuleSet, type SystemId } from './rules'

export interface Contribution {
  system: SystemId
  symbol: string
  raw: number
  weight: number
}

export interface DimensionScore {
  id: DimensionId
  /** 0 … 100, 50 = neutral; null wenn kein System bekannt ist. */
  value: number | null
  contributions: Contribution[]
}

export type LinkRelation = 'harmony' | 'tension' | 'neutral'

export interface SystemLink {
  a: SystemId
  b: SystemId
  relation: LinkRelation
  similarity: number
}

export interface Insight {
  kind: 'match' | 'tension' | 'complement'
  title: string
  text: string
  systems: SystemId[]
}

export interface FusionResult {
  scores: Record<DimensionId, DimensionScore>
  knownSystems: SystemId[]
  systemSymbols: Partial<Record<SystemId, string>>
  /** Effektive Beiträge je System (raw × Fokus) für Visualisierung & Vergleich. */
  systemVectors: Partial<Record<SystemId, DimVector>>
  links: SystemLink[]
  insights: Insight[]
}

const SYSTEMS: SystemId[] = ['sun', 'moon', 'asc', 'lifePath', 'chinese']

interface Source {
  system: SystemId
  symbol: string
  vector: DimVector
  weight: number
}

function collectSources(profile: AstroProfile, rules: RuleSet): Source[] {
  const out: Source[] = []
  const w = rules.systemWeights
  for (const sys of ['sun', 'moon', 'asc'] as const) {
    const s = profile[sys].value
    if (s) out.push({ system: sys, symbol: SIGN_BY_ID[s].name, vector: rules.signs[s] ?? {}, weight: w[sys] })
  }
  const lp = profile.lifePath.value
  if (lp) out.push({ system: 'lifePath', symbol: `Zahl ${lp}`, vector: rules.lifePaths[lp] ?? {}, weight: w.lifePath })
  const an = profile.animal.value
  if (an) out.push({ system: 'chinese', symbol: ANIMAL_BY_ID[an].name, vector: rules.animals[an] ?? {}, weight: w.chinese })
  const el = profile.chElement.value
  if (el) {
    out.push({
      system: 'chinese', symbol: `Element ${CH_ELEMENT_BY_ID[el].name}`,
      vector: rules.chElements[el] ?? {}, weight: w.chinese * rules.chElementWeight,
    })
  }
  return out
}

function cosine(a: DimVector, b: DimVector): number {
  let dot = 0, na = 0, nb = 0
  for (const d of DIM_IDS) {
    const x = a[d] ?? 0
    const y = b[d] ?? 0
    dot += x * y; na += x * x; nb += y * y
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

export function fuseProfile(profile: AstroProfile, rules: RuleSet): FusionResult {
  const sources = collectSources(profile, rules)
  const scores = {} as Record<DimensionId, DimensionScore>

  for (const dim of DIM_IDS) {
    let num = 0
    let den = 0
    const contributions: Contribution[] = []
    for (const src of sources) {
      const eff = src.weight * focusFor(rules, src.system, dim)
      const raw = src.vector[dim] ?? 0
      num += eff * raw
      den += eff * MAX_RULE
      if (raw !== 0) contributions.push({ system: src.system, symbol: src.symbol, raw, weight: eff })
    }
    scores[dim] = {
      id: dim,
      value: den > 0 ? Math.round(50 + (50 * num) / den) : null,
      contributions,
    }
  }

  const systemVectors: Partial<Record<SystemId, DimVector>> = {}
  const systemSymbols: Partial<Record<SystemId, string>> = {}
  for (const src of sources) {
    const v = (systemVectors[src.system] ??= {})
    for (const dim of DIM_IDS) {
      const raw = src.vector[dim] ?? 0
      if (raw) v[dim] = (v[dim] ?? 0) + raw * (src.system === 'chinese' && src.symbol.startsWith('Element') ? rules.chElementWeight : 1)
    }
    systemSymbols[src.system] = systemSymbols[src.system] ? `${systemSymbols[src.system]} · ${src.symbol}` : src.symbol
  }
  const knownSystems = SYSTEMS.filter((s) => systemVectors[s])

  const links: SystemLink[] = []
  for (let i = 0; i < knownSystems.length; i++) {
    for (let j = i + 1; j < knownSystems.length; j++) {
      const a = knownSystems[i]
      const b = knownSystems[j]
      const similarity = cosine(systemVectors[a]!, systemVectors[b]!)
      links.push({ a, b, similarity, relation: similarity > 0.3 ? 'harmony' : similarity < -0.05 ? 'tension' : 'neutral' })
    }
  }

  return {
    scores, knownSystems, systemSymbols, systemVectors, links,
    insights: buildInsights(profile, systemVectors, systemSymbols, knownSystems),
  }
}

function buildInsights(
  profile: AstroProfile,
  vectors: Partial<Record<SystemId, DimVector>>,
  symbols: Partial<Record<SystemId, string>>,
  known: SystemId[],
): Insight[] {
  const insights: Insight[] = []
  const name = (s: SystemId) => `${SYSTEM_LABEL[s]} (${symbols[s]})`

  for (const dim of DIMENSIONS) {
    const pos = known.filter((s) => (vectors[s]![dim.id] ?? 0) >= 2)
    const neg = known.filter((s) => (vectors[s]![dim.id] ?? 0) <= -2)
    if (pos.length >= 2 && neg.length === 0) {
      insights.push({
        kind: 'match', systems: pos, title: `${dim.short} mehrfach betont`,
        text: `${pos.map(name).join(', ')} betonen übereinstimmend: ${dim.high}.`,
      })
    } else if (neg.length >= 2 && pos.length === 0) {
      insights.push({
        kind: 'match', systems: neg, title: `${dim.short} mehrfach gedämpft`,
        text: `${neg.map(name).join(', ')} deuten übereinstimmend auf: ${dim.low}.`,
      })
    } else if (pos.length && neg.length) {
      insights.push({
        kind: 'tension', systems: [...pos, ...neg], title: `Spannungsfeld ${dim.short}`,
        text: `${pos.map(name).join(', ')} stehen für „${dim.high}“, ${neg.map(name).join(', ')} für „${dim.low}“. Im Gespräch beobachten, welche Seite sich zeigt.`,
      })
    }
  }

  const elements = (['sun', 'moon', 'asc'] as const)
    .map((k) => profile[k].value)
    .filter((v): v is NonNullable<typeof v> => !!v)
    .map((s) => SIGN_BY_ID[s].element)
  const uniq = [...new Set(elements)]
  const COMPLEMENT: Record<string, string> = {
    'fire+water': 'Begeisterung trifft Gefühlstiefe – Vision mit persönlicher Bedeutung verbinden.',
    'earth+fire': 'Tatendrang trifft Bodenhaftung – mutige Ziele mit konkretem Plan zeigen.',
    'air+fire': 'Ideen und Energie – Gespräch darf lebendig und visionär sein.',
    'air+earth': 'Ideen brauchen Beweise – Konzepte mit Fakten unterlegen.',
    'air+water': 'Kopf und Herz – Argumente sachlich erklären und emotional einordnen.',
    'earth+water': 'Sicherheit und Fürsorge – Verlässlichkeit und Vertrauen in den Mittelpunkt.',
  }
  if (uniq.length >= 2) {
    const key = [...uniq].sort().slice(0, 2).join('+')
    insights.push({
      kind: 'complement', systems: known.filter((s) => s !== 'lifePath' && s !== 'chinese'),
      title: `Elementmischung ${uniq.map((e) => ELEMENT_LABEL[e as WesternElement]).join(' · ')}`,
      text: COMPLEMENT[key] ?? 'Mehrere Elemente – flexibel zwischen Sach- und Beziehungsebene wechseln.',
    })
  } else if (uniq.length === 1 && elements.length >= 2) {
    insights.push({
      kind: 'match', systems: known.filter((s) => s !== 'lifePath' && s !== 'chinese'),
      title: `Reines ${ELEMENT_LABEL[uniq[0]]}-Profil`, text: 'Die westlichen Faktoren sprechen dieselbe Elementsprache – ein klarer Grundton.',
    })
  }

  const lp = profile.lifePath.value
  if (lp && [11, 22, 33].includes(lp)) {
    insights.push({
      kind: 'complement', systems: ['lifePath'], title: 'Meisterzahl',
      text: `${LIFE_PATH_LABEL[lp]}: symbolisch für hohe Ansprüche an Sinn und Wirkung – Bedeutung des Angebots hervorheben.`,
    })
  }
  return insights
}

export function topDimensions(scores: Record<DimensionId, { value: number | null }>, n = 3) {
  return DIM_IDS
    .filter((d) => scores[d].value !== null)
    .sort((a, b) => Math.abs(scores[b].value! - 50) - Math.abs(scores[a].value! - 50))
    .slice(0, n)
    .map((d) => ({ id: d, value: scores[d].value!, info: DIM_BY_ID[d] }))
}
