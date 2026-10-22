import type { Driver, OfferContext } from '../strategy/strategy'
import { fill } from '../strategy/strategy'
import { PLAYBOOK } from '../strategy/playbook'

export type Audience = 'stranger' | 'acquaintance' | 'referral' | 'prospect' | 'former' | 'existing'
export type Channel = 'inPerson' | 'event' | 'social' | 'dm' | 'phone' | 'email'
export type Goal = 'contact' | 'interest' | 'needs' | 'present' | 'appointment' | 'sale'

export const AUDIENCES: { id: Audience; label: string; icon: string }[] = [
  { id: 'stranger', label: 'Unbekannte Person', icon: 'UserRound' },
  { id: 'acquaintance', label: 'Bekannter Kontakt', icon: 'Users' },
  { id: 'referral', label: 'Empfehlung', icon: 'Share2' },
  { id: 'prospect', label: 'Interessent', icon: 'Sparkles' },
  { id: 'former', label: 'Ehemaliger Kunde', icon: 'History' },
  { id: 'existing', label: 'Bestehender Kunde', icon: 'BadgeCheck' },
]

export const CHANNELS: { id: Channel; label: string; icon: string }[] = [
  { id: 'inPerson', label: 'Persönlich im Alltag', icon: 'Coffee' },
  { id: 'event', label: 'Veranstaltung / Networking', icon: 'PartyPopper' },
  { id: 'social', label: 'Social Media', icon: 'AtSign' },
  { id: 'dm', label: 'Direktnachricht', icon: 'MessageCircle' },
  { id: 'phone', label: 'Telefon', icon: 'Phone' },
  { id: 'email', label: 'E-Mail', icon: 'Mail' },
]

export const GOALS: { id: Goal; label: string; icon: string }[] = [
  { id: 'contact', label: 'Erstkontakt herstellen', icon: 'Handshake' },
  { id: 'interest', label: 'Interesse wecken', icon: 'Lightbulb' },
  { id: 'needs', label: 'Bedarf herausfinden', icon: 'Search' },
  { id: 'present', label: 'Produkt vorstellen', icon: 'Presentation' },
  { id: 'appointment', label: 'Termin vereinbaren', icon: 'CalendarCheck' },
  { id: 'sale', label: 'Verkaufsgespräch beginnen', icon: 'Target' },
]

export interface Alternative {
  id: string
  title: string
  text: string
  example?: string
}

export interface AcqStep {
  key: 'approach' | 'opener' | 'question' | 'transition' | 'resistance' | 'next'
  title: string
  alternatives: Alternative[]
  tip?: string
}

export interface Compliance {
  level: 'info' | 'warn' | 'block'
  text: string
}

export interface AcquisitionPlan {
  steps: AcqStep[]
  compliance: Compliance[]
}

const APPROACH: Record<Channel, Alternative[]> = {
  inPerson: [
    { id: 'situational', title: 'Situativ anknüpfen', text: 'Einen echten, gemeinsamen Moment nutzen (Warteschlange, Café, Ereignis) – locker, kurz, ohne Verkaufsabsicht im ersten Satz.' },
    { id: 'helpful', title: 'Hilfsbereit', text: 'Mit einer kleinen Hilfe oder einem ehrlichen Kompliment beginnen und die Reaktion abwarten.' },
  ],
  event: [
    { id: 'program', title: 'Über das Programm', text: 'Über Vortrag, Thema oder Anlass der Veranstaltung ins Gespräch kommen.' },
    { id: 'introduce', title: 'Vorstellen lassen', text: 'Über gemeinsame Kontakte vorstellen lassen – das schafft sofort Vertrauen.' },
    { id: 'open', title: 'Offene Gruppe', text: 'Zu Gruppen gehen, die offen stehen (Lücke im Kreis), kurz vorstellen.' },
  ],
  social: [
    { id: 'engage', title: 'Erst interagieren', text: 'Zuerst ehrlich und inhaltlich auf Beiträge reagieren, bevor eine Nachricht folgt.' },
    { id: 'value', title: 'Mehrwert teilen', text: 'Einen hilfreichen Inhalt zum Thema der Person teilen – ohne Pitch.' },
  ],
  dm: [
    { id: 'personal', title: 'Persönlicher Bezug', text: 'Kurze, individuelle Nachricht mit konkretem Bezug – kein Copy-Paste-Text.' },
    { id: 'permission', title: 'Erlaubnis erfragen', text: 'Fragen, ob eine kurze Frage oder Info in Ordnung ist.' },
  ],
  phone: [
    { id: 'announce', title: 'Anlass sofort nennen', text: 'Name, Anlass und Grund in den ersten 15 Sekunden – dann fragen, ob es gerade passt.' },
    { id: 'reschedule', title: 'Zeit respektieren', text: 'Direkt einen besseren Zeitpunkt anbieten, falls es gerade nicht passt.' },
  ],
  email: [
    { id: 'short', title: 'Kurz & persönlich', text: 'Klarer Betreff mit Bezug, maximal 5 Sätze, eine einzige Frage am Ende.' },
    { id: 'reference', title: 'Bezug herstellen', text: 'Auf das letzte Gespräch, die Empfehlung oder einen konkreten Anlass verweisen.' },
  ],
}

const AUDIENCE_TIP: Record<Audience, string> = {
  stranger: 'Erst Mensch, dann Thema: Bei Unbekannten zählt der erste Eindruck – kein Pitch im ersten Satz.',
  acquaintance: 'Die bestehende Beziehung ist wertvoller als der Abschluss – offen sagen, worum es geht.',
  referral: 'Die Empfehlung transparent nennen, ohne Druck über die empfehlende Person aufzubauen.',
  prospect: 'Am bekannten Interesse anknüpfen, nicht von vorn beginnen.',
  former: 'Ehrlich nach dem Grund der Pause fragen – und zuhören.',
  existing: 'Zuerst nach Zufriedenheit fragen, dann Neues vorstellen.',
}

function openers(a: Audience, c: Channel): Alternative[] {
  const written = c === 'email' || c === 'dm' || c === 'social'
  const map: Record<Audience, Alternative[]> = {
    stranger: [
      { id: 'context', title: 'Kontextbezogen', text: 'Eine Bemerkung zur gemeinsamen Situation.', example: written ? 'Hallo …, Ihr Beitrag zu … hat mich zum Nachdenken gebracht – besonders der Punkt …' : '„Spannender Vortrag, oder? Was hat Sie am meisten angesprochen?“' },
      { id: 'curious', title: 'Neugierig', text: 'Eine offene, ehrlich interessierte Frage.', example: '„Darf ich fragen, was Sie hierher geführt hat?“' },
    ],
    acquaintance: [
      { id: 'honest', title: 'Offen & ehrlich', text: 'Den Anlass ohne Umweg nennen.', example: '„Ich arbeite seit einiger Zeit mit … – und musste dabei an dich/Sie denken, weil …“' },
      { id: 'catchup', title: 'Erst Austausch', text: 'Mit echtem Interesse am Befinden beginnen.', example: '„Schön, dich zu sehen! Wie läuft es eigentlich mit …?“' },
    ],
    referral: [
      { id: 'mention', title: 'Empfehlung nennen', text: 'Transparent sagen, von wem der Kontakt kommt.', example: '„… hat mir Ihren Namen gegeben und meinte, das Thema … könnte für Sie interessant sein.“' },
      { id: 'ask', title: 'Erlaubnis erfragen', text: 'Fragen, ob ein kurzer Austausch passt.', example: '„Hätten Sie Lust auf ein kurzes Gespräch – ganz unverbindlich?“' },
    ],
    prospect: [
      { id: 'followup', title: 'Anknüpfen', text: 'Am letzten Interessenspunkt anknüpfen.', example: '„Sie hatten sich für … interessiert – ich habe dazu etwas Neues für Sie.“' },
      { id: 'question', title: 'Offene Frage', text: 'Fragen, was sich seitdem verändert hat.', example: '„Wie hat sich das Thema … bei Ihnen seit unserem letzten Gespräch entwickelt?“' },
    ],
    former: [
      { id: 'reconnect', title: 'Wieder melden', text: 'Freundlich und ohne Vorwurf wieder anknüpfen.', example: '„Wir hatten lange keinen Kontakt – wie geht es Ihnen mit …?“' },
      { id: 'feedback', title: 'Feedback erbitten', text: 'Ehrlich nach Erfahrung und Verbesserung fragen.', example: '„Mich würde ehrlich interessieren, was wir hätten besser machen können.“' },
    ],
    existing: [
      { id: 'satisfaction', title: 'Zufriedenheit', text: 'Mit einer Frage zur aktuellen Lösung beginnen.', example: '„Wie zufrieden sind Sie aktuell mit …?“' },
      { id: 'news', title: 'Neuigkeit', text: 'Eine echte Neuigkeit mit Bezug teilen.', example: '„Es gibt etwas Neues, das gut zu Ihrem Thema … passt.“' },
    ],
  }
  return map[a]
}

const QUESTIONS: Record<Goal, Alternative[]> = {
  contact: [
    { id: 'about', title: 'Über die Person', text: 'Interesse am Menschen zeigen.', example: '„Was machen Sie beruflich – und was gefällt Ihnen daran am meisten?“' },
    { id: 'connect', title: 'Gemeinsamkeit', text: 'Gemeinsame Themen finden.', example: '„Woher kennen Sie …?“' },
  ],
  interest: [
    { id: 'challenge', title: 'Herausforderung', text: 'Nach dem aktuellen Engpass fragen.', example: '„Was ist bei Ihnen gerade das größte Thema rund um …?“' },
    { id: 'wish', title: 'Wunschbild', text: 'Nach dem Idealzustand fragen.', example: '„Wenn Sie eine Sache sofort verbessern könnten – welche wäre das?“' },
  ],
  needs: [
    { id: 'current', title: 'Ist-Situation', text: 'Status quo verstehen.', example: '„Wie lösen Sie das aktuell?“' },
    { id: 'impact', title: 'Auswirkung', text: 'Bedeutung des Bedarfs klären.', example: '„Was würde sich ändern, wenn das gelöst wäre?“' },
    { id: 'criteria', title: 'Kriterien', text: 'Entscheidungskriterien erfragen.', example: '„Worauf achten Sie bei so einer Entscheidung besonders?“' },
  ],
  present: [
    { id: 'permission', title: 'Erlaubnis', text: 'Vor der Präsentation fragen.', example: '„Darf ich Ihnen kurz zeigen, wie das bei anderen gelöst wurde?“' },
    { id: 'focus', title: 'Fokus', text: 'Den relevantesten Aspekt erfragen.', example: '„Was wäre für Sie der wichtigste Punkt, den ich zeigen soll?“' },
  ],
  appointment: [
    { id: 'value', title: 'Mehrwert des Termins', text: 'Klar machen, was der Termin bringt.', example: '„In 20 Minuten können wir prüfen, ob … für Sie passt – lohnt sich das?“' },
    { id: 'options', title: 'Terminoptionen', text: 'Zwei konkrete Optionen nennen.', example: '„Passt Ihnen eher Dienstagvormittag oder Donnerstagnachmittag?“' },
  ],
  sale: [
    { id: 'decision', title: 'Entscheidungsprozess', text: 'Wer und wie wird entschieden?', example: '„Wie gehen Sie bei solchen Entscheidungen normalerweise vor?“' },
    { id: 'readiness', title: 'Bereitschaft', text: 'Einen ehrlichen Stand abfragen.', example: '„Wo stehen Sie gerade – eher informieren oder schon entscheiden?“' },
  ],
}

function transitions(g: Goal, c: Channel): Alternative[] {
  const remote = c === 'email' || c === 'dm' || c === 'social'
  const base: Alternative[] = [
    { id: 'bridge', title: 'Brücke zum Bedarf', text: 'Den genannten Punkt aufgreifen und Lösung andeuten.', example: '„Genau dafür habe ich etwas, das {benefit} bringt – soll ich kurz erzählen, wie das funktioniert?“' },
    { id: 'story', title: 'Kurzes Beispiel', text: 'Eine echte Erfahrung (anonymisiert) erzählen.', example: '„Eine Kundin hatte genau dieselbe Frage – mit {offer} hat sie …“' },
  ]
  if (g === 'appointment' || g === 'sale' || g === 'present') {
    base.push({ id: 'meeting', title: remote ? 'Ins Gespräch holen' : 'Termin vorschlagen', text: remote ? 'Vom Schreiben ins persönliche Gespräch wechseln.' : 'Einen eigenen Termin für die Vorstellung vorschlagen.', example: remote ? '„Das lässt sich am besten in 15 Minuten am Telefon erklären – hätten Sie Lust?“' : '„Damit ich Ihnen das in Ruhe zeigen kann – wollen wir einen Termin ausmachen?“' })
  }
  return base
}

function resistance(c: Channel): Alternative[] {
  const alts: Alternative[] = [
    { id: 'accept', title: 'Nein akzeptieren', text: 'Ablehnung sofort und freundlich akzeptieren – kein Nachbohren.', example: '„Alles klar, danke für die ehrliche Antwort!“' },
    { id: 'door', title: 'Tür offen lassen', text: 'Bei Zurückhaltung (nicht bei klarem Nein) einmalig fragen, ob späterer Kontakt erwünscht ist.', example: '„Darf ich mich in ein paar Monaten noch einmal melden – oder lieber nicht?“' },
    { id: 'understand', title: 'Verstehen wollen', text: 'Bei Zögern eine einzige offene Frage stellen, ohne zu argumentieren.', example: '„Darf ich fragen, was Sie zögern lässt?“' },
  ]
  if (c === 'email' || c === 'dm' || c === 'social') {
    alts.push({ id: 'silence', title: 'Keine Antwort', text: 'Ausbleibende Antwort ist auch eine Antwort – höchstens eine freundliche Erinnerung, danach Schluss.' })
  }
  return alts
}

function nextSteps(g: Goal, c: Channel): Alternative[] {
  const map: Record<Goal, Alternative[]> = {
    contact: [
      { id: 'connect', title: 'Kontakt sichern', text: 'Mit Zustimmung Kontaktdaten tauschen oder vernetzen.' },
      { id: 'note', title: 'Notiz anlegen', text: 'Wichtigste Gesprächsinhalte und Herkunft der Daten notieren.' },
    ],
    interest: [
      { id: 'material', title: 'Info senden', text: 'Mit Einverständnis eine passende Info oder Probe schicken.' },
      { id: 'followup', title: 'Folgekontakt', text: 'Einen konkreten Zeitpunkt für das nächste Gespräch vereinbaren.' },
    ],
    needs: [
      { id: 'summary', title: 'Bedarf zusammenfassen', text: 'Erkannten Bedarf kurz bestätigen lassen.' },
      { id: 'proposal', title: 'Lösungsvorschlag', text: 'Termin für einen konkreten Vorschlag vereinbaren.' },
    ],
    present: [
      { id: 'demo', title: 'Demo / Probe', text: 'Erlebbar machen: Vorführung, Test oder Probe.' },
      { id: 'offer', title: 'Angebot', text: 'Ein individuelles Angebot erstellen und Besprechungstermin setzen.' },
    ],
    appointment: [
      { id: 'confirm', title: 'Termin bestätigen', text: c === 'phone' ? 'Termin am Telefon wiederholen und schriftlich bestätigen.' : 'Kalendereinladung mit Agenda senden.' },
      { id: 'prep', title: 'Vorbereitung', text: 'Eine Frage mitgeben, über die die Person bis zum Termin nachdenken kann.' },
    ],
    sale: [
      { id: 'close', title: 'Entscheidung', text: 'Offen nach der Entscheidung fragen, Bedenkzeit respektieren.' },
      { id: 'onboarding', title: 'Start planen', text: 'Bei Zusage: nächste Schritte und Ansprechpartner festhalten.' },
    ],
  }
  return map[g]
}

function compliance(a: Audience, c: Channel): Compliance[] {
  const out: Compliance[] = [
    { level: 'info', text: 'Individuelle Einzelansprache – die App versendet nichts automatisch und unterstützt keine Massenansprache.' },
  ]
  const noConsent = a === 'stranger' || a === 'referral' || a === 'acquaintance' || a === 'former'
  if (c === 'email' && noConsent) {
    out.push({ level: 'block', text: 'Werbliche E-Mails ohne vorherige ausdrückliche Einwilligung sind in Deutschland unzulässig (§ 7 Abs. 2 Nr. 2 UWG) – auch im B2B-Bereich. Nur mit Einwilligung oder im Rahmen der Bestandskundenausnahme (§ 7 Abs. 3 UWG) schreiben.' })
  }
  if (c === 'email' && a === 'existing') {
    out.push({ level: 'warn', text: 'Bestandskundenausnahme (§ 7 Abs. 3 UWG) nur für eigene, ähnliche Produkte und mit Hinweis auf das Widerspruchsrecht.' })
  }
  if (c === 'phone' && noConsent) {
    out.push({ level: 'block', text: 'Werbeanrufe bei Verbrauchern benötigen eine vorherige ausdrückliche Einwilligung (§ 7 Abs. 2 Nr. 1 UWG, Dokumentationspflicht § 7a UWG). Bei Unternehmen ist mindestens eine mutmaßliche Einwilligung erforderlich. Eine Empfehlung ersetzt keine Einwilligung.' })
  }
  if ((c === 'dm' || c === 'social') && (a === 'stranger' || a === 'referral')) {
    out.push({ level: 'warn', text: 'Nur individuelle, persönliche Nachrichten; Plattformregeln beachten. Keine Serien- oder Kettennachrichten.' })
  }
  if (a === 'referral') {
    out.push({ level: 'info', text: 'Herkunft der Kontaktdaten transparent machen (Art. 14 DSGVO: Information über die Quelle).' })
  }
  out.push({ level: 'info', text: 'Hinweis, keine Rechtsberatung. Ein Nein beendet die Ansprache.' })
  return out
}

export function buildAcquisition(
  audience: Audience, channel: Channel, goal: Goal, offer: OfferContext, drivers: Driver[] = [],
): AcquisitionPlan {
  const fillAlt = (a: Alternative): Alternative => ({ ...a, text: fill(a.text, offer), example: a.example && fill(a.example, offer) })
  const styleTip = drivers[0] ? `Profil-Hinweis: ${PLAYBOOK[drivers[0].id][drivers[0].side].style}` : undefined
  const steps: AcqStep[] = [
    { key: 'approach', title: 'Wie gehe ich auf die Person zu?', alternatives: APPROACH[channel], tip: AUDIENCE_TIP[audience] },
    { key: 'opener', title: 'Natürlicher Gesprächseinstieg', alternatives: openers(audience, channel), tip: styleTip },
    { key: 'question', title: 'Welche Frage stelle ich als Nächstes?', alternatives: QUESTIONS[goal] },
    { key: 'transition', title: 'Überleitung bei erkennbarem Interesse', alternatives: transitions(goal, channel), tip: 'Nur überleiten, wenn echtes Interesse erkennbar ist – sonst beim Zuhören bleiben.' },
    { key: 'resistance', title: 'Zurückhaltung oder Ablehnung', alternatives: resistance(channel), tip: 'Ein Nein ist ein Nein. Keine Umstimmungsversuche, kein Druck, keine Ausnutzung persönlicher Situationen.' },
    { key: 'next', title: 'Nächster sinnvoller Schritt', alternatives: nextSteps(goal, channel) },
  ]
  return { steps: steps.map((s) => ({ ...s, alternatives: s.alternatives.map(fillAlt) })), compliance: compliance(audience, channel) }
}
