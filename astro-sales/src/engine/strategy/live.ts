import { canUse, fill, type Basis, type Driver, type OfferContext } from './strategy'
import { capFirst, type Address } from './address'

export type LiveSignal = 'interest' | 'details' | 'doubt' | 'compare' | 'price' | 'time' | 'ready' | 'no'

export interface SignalInfo {
  id: LiveSignal
  label: string
  emoji: string
  tone: 'positive' | 'neutral' | 'caution' | 'stop'
  /** Wirkung auf die Gesprächstemperatur (0–100). */
  delta: number
}

export const SIGNALS: SignalInfo[] = [
  { id: 'interest', label: 'Zeigt Interesse', emoji: '✨', tone: 'positive', delta: 12 },
  { id: 'details', label: 'Fragt nach Details', emoji: '🔍', tone: 'positive', delta: 8 },
  { id: 'doubt', label: 'Äußert Zweifel', emoji: '🤔', tone: 'caution', delta: -6 },
  { id: 'compare', label: 'Will vergleichen', emoji: '⚖️', tone: 'neutral', delta: 0 },
  { id: 'price', label: 'Fragt nach Preis', emoji: '💶', tone: 'neutral', delta: 5 },
  { id: 'time', label: 'Braucht Bedenkzeit', emoji: '⏳', tone: 'caution', delta: -4 },
  { id: 'ready', label: 'Bereit für nächsten Schritt', emoji: '🚀', tone: 'positive', delta: 20 },
  { id: 'no', label: 'Sagt Nein', emoji: '✋', tone: 'stop', delta: -100 },
]

export const SIGNAL_BY_ID = Object.fromEntries(SIGNALS.map((s) => [s.id, s])) as Record<LiveSignal, SignalInfo>

type AdaptKey = `${Driver['id']}:${Driver['side']}`

interface Response {
  /** Was sagen? – Alternativen, beste zuerst. Du/Sie-Doppelformen. */
  say: string[]
  /** Warum? – begründet aus der tatsächlichen Reaktion der Person. */
  why: string
  /** Was als Nächstes? */
  next: string
  /** Stilvarianten je prägender Dimension. */
  /** `claim`: unterstellt Fakten (Absicherung, Konditionen, Qualität) – nicht bei Katalogprodukten. */
  adapt: Partial<Record<AdaptKey, { say: string; why: string; claim?: true }>>
}

const RESPONSES: Record<LiveSignal, Response> = {
  interest: {
    say: ['Schön, dass {Sie das|dich das} anspricht – was genau {finden Sie|findest du} daran spannend?', 'Wenn das für {Sie|dich} funktioniert – woran {würden Sie|würdest du} es zuerst merken?'],
    why: 'Interesse ist da – jetzt verstehen, was genau es auslöst, statt sofort abzuschließen.',
    next: 'Bedarf konkretisieren, dann den passenden Vorteil von {offer} zeigen.',
    adapt: {
      'emotion:high': { say: 'Das freut mich wirklich! Was würde sich für {Sie|dich} persönlich dadurch verändern?', why: 'Begeisterung spiegeln und persönlich machen.' },
      'structure:high': { say: 'Gern zeige ich {Ihnen|dir} das strukturiert: erst der Ablauf, dann die Zahlen. Passt das?', why: 'Strukturierte Übersicht anbieten.' },
      'energy:high': { say: 'Super – sollen wir direkt den ersten Schritt festmachen?', why: 'Tempo mitgehen.' },
    },
  },
  details: {
    say: ['Gute Frage – konkret sieht das so aus: …', 'Beantwortet das {Ihre|deine} Frage, oder soll ich tiefer einsteigen?'],
    why: 'Wer nach Details fragt, prüft ernsthaft – präzise und ehrlich antworten.',
    next: 'Nach weiteren offenen Punkten fragen, Unterlagen anbieten.',
    adapt: {
      'structure:high': { say: 'Ich schicke {Ihnen|dir} die Details auch schriftlich – mit Zahlen und Ablauf.', why: 'Zahlen und Belege schriftlich nachreichen.' },
      'structure:low': { say: 'Am einfachsten zeige ich es {Ihnen|dir} kurz an einem Beispiel.', why: 'Detail mit einem Bild statt einer Tabelle erklären.' },
      'security:high': { say: 'Wichtig für {Sie|dich}: Die Bedingungen sind transparent – ich zeige {Ihnen|dir} genau, was gilt.', why: 'Absicherung transparent machen.', claim: true },
    },
  },
  doubt: {
    say: ['Das ist ein wichtiger Punkt. Was genau macht {Sie|dich} unsicher?', 'Was müsste gegeben sein, damit sich das für {Sie|dich} gut anfühlt?'],
    why: 'Zweifel zuerst verstehen – ohne kleinzureden oder Druck aufzubauen.',
    next: 'Zweifel konkret klären oder ehrlich sagen, wenn {offer} nicht passt.',
    adapt: {
      'security:high': { say: 'Verständlich. Ich zeige {Ihnen|dir}, wie {Sie|du} abgesichert {sind|bist}, falls etwas nicht passt.', why: 'Risiko offen benennen, Absicherung zeigen.', claim: true },
      'emotion:high': { say: 'Das kann ich gut verstehen – vielen ging es am Anfang genauso.', why: 'Auf Gefühlsebene bestätigen.' },
      'independence:high': { say: 'Klar – {Sie entscheiden|du entscheidest}. Ich gebe {Ihnen|dir} nur die Fakten, die {Sie|du} dafür {brauchen|brauchst}.', why: 'Entscheidungsfreiheit betonen.' },
    },
  },
  compare: {
    say: ['Sehr vernünftig. Nach welchen Kriterien {wollen Sie|willst du} vergleichen?', 'Ich gebe {Ihnen|dir} gern eine Checkliste mit – die passt auch für andere Angebote.'],
    why: 'Vergleichen ist legitim – faire Kriterien schaffen Vertrauen.',
    next: 'Kriterien festhalten und einen Rückmeldetermin vereinbaren.',
    adapt: {
      'structure:high': { say: 'Soll ich {Ihnen|dir} eine kleine Vergleichstabelle mit objektiven Kriterien schicken?', why: 'Vergleichstabelle anbieten.' },
      'recognition:high': { say: 'Achten {Sie|du} beim Vergleich auch auf die Qualität im Detail – da liegt der Unterschied.', why: 'Qualität hervorheben.', claim: true },
    },
  },
  price: {
    say: ['Der Preis für {offer} liegt bei {price} – dafür {bekommen Sie|bekommst du}: {benefit}.', 'Welche Variante passt am besten zu {Ihrem|deinem} Rahmen?'],
    why: 'Die Preisfrage ist ein Kaufsignal – klar nennen und sofort mit dem Nutzen verbinden.',
    next: 'Reaktion abwarten, dann Einwände oder Fragen aufnehmen.',
    adapt: {
      'directness:high': { say: '{price}. Und das ist drin: {benefit}.', why: 'Zahl zuerst, Begründung danach.' },
      'security:high': { say: '{price} – mit klaren Konditionen, ich zeige {Ihnen|dir} Laufzeit und Ausstieg.', why: 'Konditionen transparent darlegen.', claim: true },
    },
  },
  time: {
    say: ['Natürlich – das will gut überlegt sein. Was {brauchen Sie|brauchst du} noch von mir, um gut entscheiden zu können?', 'Passt es, wenn ich mich am … kurz melde?'],
    why: 'Bedenkzeit respektieren – Verbindlichkeit über einen konkreten Termin statt über Druck.',
    next: 'Zusammenfassung schicken und Rückmeldetermin eintragen.',
    adapt: {
      'independence:low': { say: 'Möchten {Sie|du} das noch mit jemandem besprechen? Gern auch in einem gemeinsamen Termin.', why: 'Weitere Entscheider einbeziehen.' },
      'structure:high': { say: 'Ich schicke {Ihnen|dir} eine kurze schriftliche Entscheidungsgrundlage.', why: 'Schriftliche Grundlage mitgeben.' },
    },
  },
  ready: {
    say: ['Prima – dann halten wir fest: {offer}, Start zum vereinbarten Termin.', 'Der nächste Schritt ist ganz einfach: …'],
    why: 'Die Person ist bereit – jetzt einfach und klar abschließen, keine neuen Themen.',
    next: 'Vereinbarung schriftlich bestätigen und Termin eintragen.',
    adapt: {
      'emotion:high': { say: 'Ich freue mich sehr! Ich begleite {Sie|dich} persönlich beim Start.', why: 'Freude teilen, Begleitung zusagen.' },
      'structure:high': { say: 'Ich schicke {Ihnen|dir} heute noch den Ablaufplan mit allen Terminen.', why: 'Ablaufplan übergeben.' },
    },
  },
  no: {
    say: ['Danke für {Ihre|deine} Offenheit – das respektiere ich selbstverständlich.', 'Darf ich mich in ein paar Monaten noch einmal melden – oder lieber nicht?'],
    why: 'Ein Nein ist ein Nein. Respekt hält die Beziehung offen.',
    next: 'Status auf „Kein Interesse“ – keine weitere Ansprache ohne Zustimmung.',
    adapt: {},
  },
}

export interface LiveCoaching {
  signal: SignalInfo
  /** Alternativen für „Was sagen?“ – die erste ist die Empfehlung. */
  say: string[]
  why: { text: string; basis: Basis }
  /** Ergänzender Profil-Hinweis (Beobachtung oder symbolische Hypothese). */
  hint?: { text: string; basis: Basis }
  next: string
}

/**
 * Live-Empfehlung auf genau drei Kernaussagen reduziert: Was sagen? Warum? Was als Nächstes?
 * Grundlage ist die tatsächliche Reaktion; beobachtete Stilmerkmale verfeinern die Formulierung,
 * symbolische Deutungen liefern nur eine nachrangige Alternative.
 */
export function coach(signal: LiveSignal, drivers: Driver[], offer: OfferContext, address: Address = 'sie'): LiveCoaching {
  const r = RESPONSES[signal]
  const f = (t: string) => capFirst(fill(t, offer, address))
  const strict = !!offer.catalog
  const usable = (a: { say: string; claim?: true } | undefined) => !!a && !(strict && a.claim) && canUse(a.say, offer)
  const adaptFor = (ds: Driver[]) => ds.map((d) => r.adapt[`${d.id}:${d.side}` as AdaptKey]).find(usable)
  const observed = adaptFor(drivers.filter((d) => d.basis === 'observed'))
  const symbolic = adaptFor(drivers.filter((d) => d.basis !== 'observed'))
  // Produktspezifische, transparente Antwort auf genau dieses Signal (aus dem Katalog).
  const product = offer.catalog?.objections.find((o) => o.signal === signal)
  const base = r.say.filter((t) => canUse(t, offer))
  const fallback = signal === 'price' && !base.length
    ? ['Der Preis für {offer} liegt bei {price}. Was genau enthalten ist, sehen wir uns gemeinsam auf der Angebotsseite an.']
    : []
  const say = [
    ...(observed ? [observed.say] : []),
    ...(product ? [product.answer] : []),
    ...base, ...fallback,
    ...(symbolic ? [symbolic.say] : []),
  ]
  return {
    signal: SIGNAL_BY_ID[signal],
    say: [...new Set(say.map(f))],
    why: { text: r.why, basis: 'reaction' },
    hint: observed ? { text: observed.why, basis: 'observed' }
      : product ? { text: `Produktdaten: Antwort auf „${f(product.objection)}“`, basis: 'product' }
      : symbolic ? { text: symbolic.why, basis: 'symbolic' } : undefined,
    next: f(r.next),
  }
}

export type Phase = 'opening' | 'discovery' | 'presentation' | 'objection' | 'closing' | 'ended'

export const PHASE_LABEL: Record<Phase, string> = {
  opening: 'Einstieg', discovery: 'Bedarfsermittlung', presentation: 'Präsentation',
  objection: 'Einwandbehandlung', closing: 'Abschluss', ended: 'Beendet',
}

export interface LiveState {
  temperature: number
  phase: Phase
}

/** Leitet Gesprächstemperatur und -phase aus der Signalfolge ab. */
export function liveState(signals: LiveSignal[]): LiveState {
  let temperature = 40
  let phase: Phase = 'opening'
  for (const s of signals) {
    temperature = Math.max(0, Math.min(100, temperature + SIGNAL_BY_ID[s].delta))
    switch (s) {
      case 'no': phase = 'ended'; break
      case 'ready': phase = 'closing'; break
      case 'doubt': case 'compare': case 'time': phase = phase === 'ended' ? phase : 'objection'; break
      case 'price': case 'details': phase = phase === 'closing' ? phase : 'presentation'; break
      case 'interest': phase = phase === 'opening' ? 'discovery' : phase; break
    }
  }
  return { temperature, phase }
}
