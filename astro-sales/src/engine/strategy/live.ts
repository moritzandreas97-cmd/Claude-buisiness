import { fill, type Driver, type OfferContext } from './strategy'

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
  headline: string
  do: string[]
  avoid: string
  phrases: string[]
  next: string
  adapt: Partial<Record<AdaptKey, string>>
}

const RESPONSES: Record<LiveSignal, Response> = {
  interest: {
    headline: 'Interesse vertiefen – nicht sofort abschließen',
    do: ['Nachfragen, was genau das Interesse geweckt hat', 'Nutzen auf den genannten Punkt zuspitzen'],
    avoid: 'Nicht mit allen Features überschütten.',
    phrases: ['„Was genau spricht Sie daran an?“', '„Wenn das für Sie funktioniert – woran würden Sie es zuerst merken?“'],
    next: 'Bedarf konkretisieren, dann passende Lösung vorstellen.',
    adapt: {
      'emotion:high': 'Begeisterung spiegeln und persönlich bestätigen.',
      'structure:high': 'Jetzt eine kurze, strukturierte Übersicht anbieten.',
      'energy:high': 'Tempo mitgehen – direkt einen konkreten Schritt anbieten.',
    },
  },
  details: {
    headline: 'Details liefern – präzise und ehrlich',
    do: ['Konkret antworten, keine Ausflüchte', 'Unterlagen oder Beispiel zeigen', 'Prüfen, ob die Antwort ausreicht'],
    avoid: 'Nichts versprechen, was nicht sicher ist.',
    phrases: ['„Gute Frage – im Detail sieht das so aus: …“', '„Beantwortet das Ihre Frage, oder soll ich tiefer einsteigen?“'],
    next: 'Nach weiteren offenen Punkten fragen.',
    adapt: {
      'structure:high': 'Zahlen, Ablauf und Belege nennen – schriftlich nachreichen.',
      'structure:low': 'Detail kurz halten und mit einem Bild oder Beispiel veranschaulichen.',
      'security:high': 'Bedingungen, Garantien und Absicherungen transparent machen.',
    },
  },
  doubt: {
    headline: 'Zweifel ernst nehmen – erst verstehen, dann antworten',
    do: ['Zweifel bestätigen („Verständlich“)', 'Nachfragen, worauf er sich genau bezieht', 'Sachlich mit Fakten oder Erfahrungen antworten'],
    avoid: 'Nicht kleinreden oder Druck aufbauen.',
    phrases: ['„Das ist ein wichtiger Punkt. Was genau macht Sie unsicher?“', '„Was müsste gegeben sein, damit sich das für Sie gut anfühlt?“'],
    next: 'Zweifel konkret ausräumen oder ehrlich sagen, wenn es nicht passt.',
    adapt: {
      'security:high': 'Risiken offen benennen und Absicherung zeigen.',
      'emotion:high': 'Auf Gefühlsebene bestätigen, Erfahrungen anderer teilen.',
      'independence:high': 'Fakten geben und betonen, dass die Entscheidung frei bleibt.',
    },
  },
  compare: {
    headline: 'Vergleich unterstützen – fair und souverän',
    do: ['Kriterien gemeinsam festlegen', 'Stärken und Grenzen ehrlich benennen', 'Vergleichshilfe anbieten'],
    avoid: 'Keine Wettbewerber schlechtreden.',
    phrases: ['„Sehr vernünftig. Nach welchen Kriterien wollen Sie vergleichen?“', '„Ich gebe Ihnen gern eine Checkliste mit – auch für andere Angebote.“'],
    next: 'Vergleichskriterien festhalten und Rückmeldetermin vereinbaren.',
    adapt: {
      'structure:high': 'Eine Vergleichstabelle mit objektiven Kriterien anbieten.',
      'recognition:high': 'Das Besondere und die Qualität hervorheben.',
      'independence:high': 'Vergleich ausdrücklich unterstützen – Kontrolle bleibt bei der Person.',
    },
  },
  price: {
    headline: 'Preis klar nennen – im Kontext des Nutzens',
    do: ['Preis direkt und selbstbewusst nennen', 'Nutzen und Gegenwert danebenstellen', 'Optionen/Varianten zeigen'],
    avoid: 'Nicht herumdrucksen, keine künstliche Verknappung.',
    phrases: ['„Der Preis liegt bei … – dafür bekommen Sie …“', '„Welche Variante passt am besten zu Ihrem Rahmen?“'],
    next: 'Reaktion abwarten, Einwände aufnehmen.',
    adapt: {
      'directness:high': 'Ohne Umschweife: Zahl zuerst, Begründung danach.',
      'security:high': 'Konditionen, Laufzeit und Ausstieg transparent darlegen.',
      'recognition:high': 'Premium-Option als Anker zeigen, ohne Druck.',
    },
  },
  time: {
    headline: 'Bedenkzeit respektieren – Verbindlichkeit schaffen',
    do: ['Bedenkzeit ausdrücklich gutheißen', 'Fragen, welche Infos für die Entscheidung fehlen', 'Konkreten Rückmeldetermin vereinbaren'],
    avoid: 'Keinen künstlichen Zeitdruck aufbauen.',
    phrases: ['„Natürlich – das ist eine Entscheidung, die gut überlegt sein will.“', '„Was brauchen Sie noch von mir, um gut entscheiden zu können?“', '„Passt es, wenn ich mich am … kurz melde?“'],
    next: 'Zusammenfassung schicken und Folgetermin eintragen.',
    adapt: {
      'energy:low': 'Viel Raum lassen, Rückmeldung eher in einer Woche ansetzen.',
      'independence:low': 'Anbieten, mit Partner/Team gemeinsam zu sprechen.',
      'structure:high': 'Eine schriftliche Entscheidungsgrundlage mitgeben.',
    },
  },
  ready: {
    headline: 'Abschluss einleiten – klar und einfach',
    do: ['Kurz zusammenfassen, was vereinbart wird', 'Nächsten Schritt konkret machen', 'Danke sagen'],
    avoid: 'Jetzt nicht mehr neue Themen aufmachen.',
    phrases: ['„Prima – dann halten wir fest: …“', '„Der nächste Schritt ist ganz einfach: …“'],
    next: 'Vereinbarung schriftlich bestätigen, Termin eintragen.',
    adapt: {
      'emotion:high': 'Freude teilen und persönliche Begleitung zusagen.',
      'structure:high': 'Ablaufplan mit Terminen übergeben.',
      'recognition:high': 'Die gute Entscheidung wertschätzen.',
    },
  },
  no: {
    headline: 'Nein respektieren – freundlich beenden',
    do: ['Das Nein ohne Diskussion akzeptieren', 'Für das Gespräch danken', 'Optional: Erlaubnis für späteren Kontakt erfragen'],
    avoid: 'Kein Nachbohren, keine Umstimmungsversuche.',
    phrases: ['„Danke für Ihre Offenheit – das respektiere ich selbstverständlich.“', '„Darf ich mich in ein paar Monaten noch einmal melden, oder lieber nicht?“'],
    next: 'Status auf „kein Interesse“ setzen – keine weitere Ansprache ohne Zustimmung.',
    adapt: {},
  },
}

export interface LiveRecommendation {
  signal: SignalInfo
  headline: string
  do: string[]
  avoid: string
  phrases: string[]
  next: string
  tailored: string[]
}

export function recommend(signal: LiveSignal, drivers: Driver[], offer: OfferContext): LiveRecommendation {
  const r = RESPONSES[signal]
  const tailored = drivers
    .map((d) => r.adapt[`${d.id}:${d.side}` as AdaptKey])
    .filter((x): x is string => !!x)
  return {
    signal: SIGNAL_BY_ID[signal],
    headline: r.headline,
    do: r.do,
    avoid: r.avoid,
    phrases: r.phrases.map((p) => fill(p, offer)),
    next: fill(r.next, offer),
    tailored,
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
