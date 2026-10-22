import type { ZodiacSign } from '../astro/zodiac'
import type { LifePath } from '../astro/numerology'
import type { ChineseAnimal, ChineseElement } from '../astro/chinese'
import type { DimensionId, DimVector } from './dimensions'

/**
 * Archetypenregeln: Jedes Symbol trägt mit −3 … +3 zu einzelnen Dimensionen bei.
 * Die Werte sind eine bewusst einfache, offen dokumentierte Übersetzung klassischer
 * Deutungs-Stichworte – keine Messung. Alle Tabellen sind in den Einstellungen änderbar.
 */
export type SystemId = 'sun' | 'moon' | 'asc' | 'lifePath' | 'chinese'

export const SYSTEM_LABEL: Record<SystemId, string> = {
  sun: 'Sonne', moon: 'Mond', asc: 'Aszendent', lifePath: 'Lebenszahl', chinese: 'Chinesisch',
}

export interface RuleSet {
  version: number
  /** Grundgewicht eines Systems in der Fusion. */
  systemWeights: Record<SystemId, number>
  /** Fokus-Multiplikatoren: z. B. wirkt der Mond stärker auf Emotionalität. */
  systemFocus: Partial<Record<SystemId, DimVector>>
  signs: Record<ZodiacSign, DimVector>
  lifePaths: Record<LifePath, DimVector>
  animals: Record<ChineseAnimal, DimVector>
  chElements: Record<ChineseElement, DimVector>
  /** Gewicht des Elements innerhalb des chinesischen Systems (Tier = 1). */
  chElementWeight: number
}

export const MAX_RULE = 3

export const DEFAULT_RULES: RuleSet = {
  version: 1,
  systemWeights: { sun: 1, moon: 0.8, asc: 0.9, lifePath: 0.6, chinese: 0.5 },
  systemFocus: {
    moon: { emotion: 1.5, security: 1.3 },
    asc: { presence: 1.3, directness: 1.3, communication: 1.2 },
    lifePath: { structure: 1.1, independence: 1.1 },
  },
  signs: {
    aries: { presence: 2, energy: 3, security: -2, directness: 3, independence: 2, recognition: 1, openness: 2, structure: -1, communication: 1 },
    taurus: { presence: 1, energy: -1, emotion: 1, security: 3, openness: -2, structure: 2, communication: -1 },
    gemini: { presence: 1, energy: 2, emotion: -1, security: -1, directness: 1, independence: 1, openness: 3, communication: 3 },
    cancer: { presence: -1, energy: -1, emotion: 3, security: 3, directness: -2, independence: -1, openness: -1, communication: 1 },
    leo: { presence: 3, energy: 2, emotion: 1, directness: 2, independence: 1, recognition: 3, openness: 1, structure: -1, communication: 2 },
    virgo: { presence: -1, emotion: -1, security: 2, directness: 1, recognition: -1, structure: 3, communication: 1 },
    libra: { presence: 1, emotion: 1, security: 1, directness: -2, independence: -2, recognition: 2, openness: 1, communication: 2 },
    scorpio: { presence: 2, energy: 1, emotion: 2, security: 1, directness: 1, independence: 2, recognition: -1, openness: -1, structure: 1, communication: -2 },
    sagittarius: { presence: 2, energy: 3, security: -2, directness: 2, independence: 3, recognition: 1, openness: 3, structure: -2, communication: 2 },
    capricorn: { presence: 2, energy: 1, emotion: -2, security: 2, directness: 1, independence: 1, recognition: 2, openness: -1, structure: 3, communication: -1 },
    aquarius: { presence: 1, energy: 1, emotion: -2, security: -2, directness: 1, independence: 3, recognition: -1, openness: 3, structure: 1, communication: 1 },
    pisces: { presence: -2, energy: -1, emotion: 3, directness: -2, independence: -1, openness: 2, structure: -2, communication: 1 },
  },
  lifePaths: {
    1: { presence: 3, energy: 2, directness: 3, independence: 3, recognition: 1 },
    2: { emotion: 2, security: 1, directness: -2, independence: -2, communication: 1 },
    3: { presence: 2, energy: 1, recognition: 2, openness: 2, structure: -1, communication: 3 },
    4: { energy: -1, security: 3, openness: -2, structure: 3 },
    5: { energy: 3, security: -3, independence: 2, openness: 3, structure: -2 },
    6: { emotion: 2, security: 2, directness: -1, communication: 1 },
    7: { emotion: -1, independence: 2, openness: 1, structure: 2, communication: -2 },
    8: { presence: 2, energy: 1, directness: 2, recognition: 3, structure: 2 },
    9: { emotion: 2, recognition: -1, openness: 2, communication: 1 },
    11: { presence: 1, emotion: 2, openness: 2, structure: -1, communication: 1 },
    22: { presence: 2, energy: 1, recognition: 2, structure: 3 },
    33: { emotion: 3, security: 1, recognition: -1, communication: 2 },
  },
  animals: {
    rat: { energy: 1, openness: 1, structure: 1, communication: 2 },
    ox: { energy: -1, security: 2, directness: 1, structure: 3, communication: -1 },
    tiger: { presence: 2, energy: 3, security: -2, directness: 2, independence: 2 },
    rabbit: { emotion: 1, security: 2, directness: -2, communication: 1 },
    dragon: { presence: 3, energy: 2, independence: 1, recognition: 2 },
    snake: { presence: 1, emotion: 1, directness: -1, structure: 1, communication: -1 },
    horse: { energy: 3, independence: 3, openness: 2, structure: -1 },
    goat: { presence: -1, emotion: 2, security: 1, directness: -1, openness: 1 },
    monkey: { energy: 1, openness: 2, structure: -1, communication: 3 },
    rooster: { presence: 1, directness: 2, recognition: 2, structure: 2 },
    dog: { emotion: 1, security: 2, directness: 1, recognition: -1 },
    pig: { emotion: 2, security: 1, directness: -1, communication: 1 },
  },
  chElements: {
    wood: { energy: 1, openness: 2 },
    fire: { presence: 1, energy: 2, communication: 1 },
    earth: { security: 2, structure: 1 },
    metal: { directness: 1, structure: 2 },
    water: { emotion: 1, openness: 1, communication: 1 },
  },
  chElementWeight: 0.6,
}

export function focusFor(rules: RuleSet, system: SystemId, dim: DimensionId): number {
  return rules.systemFocus[system]?.[dim] ?? 1
}

/** Einfache Strukturprüfung für importierte / bearbeitete Regelsätze. */
export function validateRules(input: unknown): input is RuleSet {
  if (!input || typeof input !== 'object') return false
  const r = input as Record<string, unknown>
  return ['systemWeights', 'signs', 'lifePaths', 'animals', 'chElements'].every(
    (k) => r[k] && typeof r[k] === 'object',
  ) && typeof r.chElementWeight === 'number'
}
