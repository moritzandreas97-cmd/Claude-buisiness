/**
 * Globale Anrede. Kundengerichtete Texte enthalten Doppelformen `{Sie-Form|Du-Form}`,
 * z. B. „Wie sehen {Sie|du} das?“ oder „{Haben Sie|Hast du} kurz Zeit?“.
 * Hinweise an die verkaufende Person (Imperative/Infinitive) brauchen keine Doppelform.
 */
export type Address = 'sie' | 'du'

const PAIR = /\{([^{}|]*)\|([^{}|]*)\}/g

export function addr(text: string, a: Address): string {
  return text.replace(PAIR, (_, sie: string, du: string) => (a === 'sie' ? sie : du))
}

/** Großschreibung am Satzanfang nach dem Ersetzen (z. B. „du“ → „Du“). */
export function capFirst(text: string): string {
  return text.replace(/^([„"]?)(\p{Ll})/u, (_, q: string, ch: string) => q + ch.toUpperCase())
}
