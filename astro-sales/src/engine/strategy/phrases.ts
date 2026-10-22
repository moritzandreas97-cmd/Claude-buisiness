import type { DimensionId } from '../symbolic/dimensions'
import type { Phase } from './live'

/**
 * Konkrete, sprechbare Formulierungen. Doppelformen `{Sie|du}` werden über die globale
 * Anrede aufgelöst. Platzhalter: {offer}, {benefit}, {benefit2}, {price}, {audience},
 * {description}; in Nutzenrahmen zusätzlich {b} (einzelner Vorteil) und {need}.
 * „…“ markiert eine Stelle, die situativ ergänzt wird.
 */
export type StyleKey = `${DimensionId}:${'high' | 'low'}`

export const OPENERS: Partial<Record<StyleKey, string>> = {
  'presence:high': 'Ich habe gesehen, was {Sie|du} mit … aufgebaut {haben|hast} – das hat mich beeindruckt. Wie {sind Sie|bist du} dazu gekommen?',
  'presence:low': 'Ich will {Sie|dich} gar nicht lange aufhalten – darf ich {Ihnen|dir} kurz eine Frage stellen?',
  'energy:high': 'Ich mache es kurz: Es geht um {offer} – das spart {Ihnen|dir} bei … richtig Zeit. {Haben Sie|Hast du} zwei Minuten?',
  'energy:low': 'Ganz ohne Eile – ich wollte einfach mal in Ruhe hören, wie es {Ihnen|dir} gerade mit … geht.',
  'emotion:high': 'Schön, {Sie|dich} zu sehen! Wie geht es {Ihnen|dir} – und was beschäftigt {Sie|dich} gerade am meisten?',
  'emotion:low': 'Ich melde mich mit einem konkreten Anlass: Es geht um {offer}. Passt es gerade für fünf Minuten?',
  'security:high': 'Vorab ganz transparent: Ich möchte {Ihnen|dir} nur zeigen, was möglich ist – entscheiden {müssen Sie|musst du} heute gar nichts.',
  'security:low': 'Ich habe da eine spannende Möglichkeit entdeckt, bei der ich sofort an {Sie|dich} denken musste.',
  'directness:high': 'Ich sage es direkt: Ich glaube, {offer} passt zu {Ihnen|dir}. Darf ich in zwei Sätzen erklären, warum?',
  'directness:low': 'Darf ich {Sie|dich} etwas fragen? Mich würde ehrlich interessieren, wie {Sie|du} das Thema … {sehen|siehst}.',
  'independence:high': '{Sie kennen|Du kennst} {Ihre|deine} Situation am besten – ich bringe nur ein paar Ideen mit, und {Sie entscheiden|du entscheidest}, ob etwas dabei ist.',
  'independence:low': 'Einige meiner Kundinnen und Kunden standen vor derselben Frage – darf ich erzählen, wie sie es gelöst haben?',
  'recognition:high': '{Sie haben|Du hast} einen hohen Anspruch an Qualität – deshalb wollte ich {Ihnen|dir} etwas Besonderes zeigen.',
  'recognition:low': 'Ganz unkompliziert: Ich habe etwas, das einfach gut funktioniert. Soll ich kurz zeigen, wie?',
  'openness:high': 'Ich habe etwas Neues mitgebracht, das {Sie|du} wahrscheinlich noch nicht {kennen|kennst}. Neugierig?',
  'openness:low': 'Es geht um eine bewährte Lösung, die viele schon lange nutzen – nichts Experimentelles.',
  'structure:high': 'Mein Vorschlag: Erst {erzählen Sie|erzählst du} mir kurz, wie es aktuell läuft, dann zeige ich {Ihnen|dir} in zehn Minuten die Fakten. Passt das?',
  'structure:low': 'Stellen {Sie sich|dir} kurz vor, … wäre ab morgen einfach gelöst – wie würde sich das anfühlen?',
  'communication:high': '{Erzählen Sie|Erzähl} mal – wie läuft es gerade bei {Ihnen|dir} mit …?',
  'communication:low': 'Kurze Frage, kurze Antwort: Ist … für {Sie|dich} gerade ein Thema?',
}

export const GENERIC_OPENER = 'Hallo, schön, dass wir sprechen. Ich arbeite mit {offer} – darf ich {Ihnen|dir} ein, zwei Fragen stellen, ob das für {Sie|dich} überhaupt interessant ist?'

/** Nutzenrahmen: verpacken einen einzelnen Vorteil {b} passend zum Kommunikationsstil. */
export const BENEFIT_FRAMES: Partial<Record<StyleKey, string>> = {
  'presence:high': 'Damit setzen {Sie|du} ein sichtbares Zeichen: {b}.',
  'presence:low': 'Das läuft unauffällig im Hintergrund – {Ihr|dein} Vorteil: {b}.',
  'energy:high': 'Kurz gesagt, und zwar ab sofort: {b}.',
  'energy:low': '{Sie können|Du kannst} das in {Ihrem|deinem} Tempo angehen – am Ende steht: {b}.',
  'emotion:high': 'Stellen {Sie sich|dir} vor, wie das für {Sie|dich} ist: {b}.',
  'emotion:low': 'Sachlich betrachtet bedeutet das: {b}.',
  'security:high': 'Ohne Risiko und mit klaren Bedingungen: {b}.',
  'security:low': 'Das eröffnet {Ihnen|dir} eine neue Möglichkeit: {b}.',
  'directness:high': 'Der Punkt ist: {b}.',
  'directness:low': 'Was viele besonders schätzen: {b}. Wie wäre das für {Sie|dich}?',
  'independence:high': '{Sie behalten|Du behältst} die volle Kontrolle – und: {b}.',
  'independence:low': 'Ich begleite {Sie|dich} Schritt für Schritt. {Ihr|Dein} Vorteil: {b}.',
  'recognition:high': 'Eine Lösung auf hohem Niveau: {b}.',
  'recognition:low': 'Einfach vernünftig: {b}.',
  'openness:high': 'Das ist ein neuer Ansatz: {b}.',
  'openness:low': 'Bewährt und erprobt: {b}.',
  'structure:high': 'Konkret heißt das: {b}. Die Zahlen dazu zeige ich {Ihnen|dir} gern.',
  'structure:low': 'Das Ergebnis in einem Satz: {b}.',
  'communication:high': 'Das Schöne daran: {b}. Was {meinen Sie|meinst du}?',
  'communication:low': 'Kurz: {b}.',
}

export const GENERIC_BENEFIT = 'Der wichtigste Vorteil für {Sie|dich}: {b}.'
export const NEED_BENEFIT = '{Sie haben|Du hast} erwähnt, dass {need} wichtig ist – genau da hilft {offer}: {b}.'

export const FOLLOWUPS: Record<Exclude<Phase, 'ended'>, string[]> = {
  opening: ['Was hat {Sie|dich} heute hierher geführt?', 'Wie läuft es bei {Ihnen|dir} gerade mit …?'],
  discovery: [
    'Wie {lösen Sie|löst du} das aktuell?',
    'Was stört {Sie|dich} daran am meisten?',
    'Was wäre für {Sie|dich} das ideale Ergebnis?',
    'Woran {würden Sie|würdest du} merken, dass es sich gelohnt hat?',
  ],
  presentation: [
    'Wie klingt das für {Sie|dich} bis hierhin?',
    'Welcher Punkt ist für {Sie|dich} der wichtigste?',
    'Was fehlt {Ihnen|dir} noch, um sich ein Bild zu machen?',
  ],
  objection: [
    'Was genau lässt {Sie|dich} zögern?',
    'Angenommen, dieser Punkt wäre geklärt – wie {würden Sie|würdest du} dann entscheiden?',
    'Was {bräuchten Sie|bräuchtest du} noch, um sich sicher zu sein?',
  ],
  closing: [
    'Was spricht aus {Ihrer|deiner} Sicht noch dagegen?',
    'Wie {möchten Sie|möchtest du} weitermachen?',
  ],
}

/** Abschlussformulierungen – ohne Druck, ein Nein bleibt jederzeit möglich. */
export const CLOSINGS: Partial<Record<StyleKey, string>> = {
  'directness:high': 'Sollen wir das so festmachen?',
  'directness:low': 'Was wäre für {Sie|dich} ein guter nächster Schritt?',
  'security:high': 'Wollen wir mit einem überschaubaren ersten Schritt starten? {Sie können|Du kannst} danach in Ruhe entscheiden, wie es weitergeht.',
  'security:low': 'Probieren wir es einfach aus – {Sie behalten|du behältst} alle Freiheiten.',
  'independence:high': '{Sie haben|Du hast} jetzt alle Infos. Wie {möchten Sie|möchtest du} entscheiden?',
  'independence:low': 'Wenn {Sie möchten|du möchtest}, begleite ich {Sie|dich} beim Start – sollen wir das gemeinsam angehen?',
  'energy:high': 'Dann legen wir los – passt {Ihnen|dir} ein Start noch diese Woche?',
  'energy:low': '{Lassen Sie es sich|Lass es dir} in Ruhe durch den Kopf gehen. Darf ich mich am … kurz melden?',
  'emotion:high': 'Ich würde mich freuen, das mit {Ihnen|dir} gemeinsam umzusetzen. Wie geht es {Ihnen|dir} damit?',
  'emotion:low': 'Fassen wir zusammen: {offer} bringt {Ihnen|dir}: {benefit}. Sollen wir das so umsetzen?',
  'structure:high': 'Ich fasse zusammen: {offer}, {benefit}, Preis: {price}. Sollen wir so starten?',
  'recognition:high': 'Das passt zu {Ihrem|deinem} Anspruch. Sollen wir das für {Sie|dich} so festhalten?',
  'openness:high': 'Wollen wir mit einem ersten Test starten und schauen, wie es sich anfühlt?',
  'openness:low': 'Wir starten mit dem bewährten Standard – einverstanden?',
  'communication:high': 'Was {meinen Sie|meinst du} – machen wir das zusammen?',
}

export const GENERIC_CLOSINGS = [
  'Was {meinen Sie|meinst du} – sollen wir den nächsten Schritt gehen?',
  'Passt {Ihnen|dir} ein Start eher Anfang oder Ende des Monats?',
]

export const PHASE_NEXT: Record<Exclude<Phase, 'ended'>, string> = {
  opening: 'Erlaubnis für ein paar Bedarfsfragen einholen.',
  discovery: 'Bedarf kurz zusammenfassen und bestätigen lassen.',
  presentation: 'Reaktion abwarten, Fragen und Einwände aufnehmen.',
  objection: 'Ist der Einwand geklärt? Dann zum Nutzen zurück – sonst ehrlich festhalten, dass es nicht passt.',
  closing: 'Vereinbarung zusammenfassen und schriftlich bestätigen.',
}
