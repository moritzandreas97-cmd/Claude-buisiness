import type { CatalogDefinition, CatalogObjection, CatalogSource } from '../../engine/catalog/types'

/**
 * RELIFE-Testkatalog (Anbieter: Agron Bekirovski / RELIFE Academy).
 *
 * TESTDATEN. Stand der Recherche: 2026-10-22.
 * - Die offiziellen Verkaufsseiten (myablefy.com, go.relife-academy.com) waren aus der
 *   Arbeitsumgebung nicht direkt abrufbar. Belegt ist nur, was ein Websuche-Auszug der
 *   jeweiligen Seite zeigt; die Prüfmethode steht bei jeder Quelle.
 * - Namen und Preise ohne belegende Seite stammen aus der Liste des Nutzers und sind als
 *   „Details prüfen“ / „Nicht verifiziert“ markiert.
 * - Keine Provisionen, Garantien oder Wirkungsversprechen. Argumente beschreiben nur
 *   belegten Leistungsumfang.
 */

const CHECKED = '2026-10-22'

const USER_LIST: CatalogSource = {
  label: 'Angebotsliste des Nutzers (Name, Preis) – noch nicht gegen die Angebotsseite geprüft',
  url: '',
  checkedAt: CHECKED,
  method: 'Nutzerangabe',
}

const ABOUT: CatalogSource = {
  label: 'RELIFE Academy – About (Anbieterbeschreibung, nicht produktspezifisch)',
  url: 'https://relife-academy.com/about/',
  checkedAt: CHECKED,
  method: 'Auszug aus Websuche; Seite nicht direkt geöffnet',
}

const PRICE_OBJECTION = (signalNote: string): CatalogObjection => ({
  objection: 'Das ist eine Menge Geld.',
  answer: `Verständlich. Der Preis liegt bei {price}. ${signalNote} Ob es sich für {Sie|dich} lohnt, {entscheiden Sie|entscheidest du} in Ruhe – ich setze {Sie|dich} nicht unter Druck.`,
  signal: 'price',
})

const NO_GUARANTEE: CatalogObjection = {
  objection: 'Funktioniert das garantiert?',
  answer: 'Ein bestimmtes Ergebnis kann ich {Ihnen|dir} nicht zusagen. Ich kann {Ihnen|dir} zeigen, was enthalten ist und wie es abläuft – dann {entscheiden Sie|entscheidest du} selbst.',
  signal: 'doubt',
}

const TERMS: CatalogObjection = {
  objection: 'Wie sind die Bedingungen, kann ich zurücktreten?',
  answer: 'Die Bedingungen stehen in den AGB auf der offiziellen Angebotsseite. {Lassen Sie|Lass} uns die gemeinsam ansehen, statt dass ich etwas aus dem Kopf sage.',
  signal: 'details',
}

const COMPARE: CatalogObjection = {
  objection: 'Ich möchte erst vergleichen.',
  answer: 'Sehr vernünftig. {Schauen Sie sich|Schau dir} den Leistungsumfang auf der Angebotsseite an und {vergleichen Sie|vergleiche} in Ruhe. Ich beantworte gern jede Frage dazu.',
  signal: 'compare',
}

const TIME: CatalogObjection = {
  objection: 'Ich muss darüber nachdenken.',
  answer: 'Natürlich, das ist eine Entscheidung, die gut überlegt sein soll. Was {brauchen Sie|brauchst du} noch, um entscheiden zu können?',
  signal: 'time',
}

const NETTO: CatalogObjection = {
  objection: 'Ist das der Endpreis?',
  answer: 'Der Preis ist netto angegeben. Je nach {Ihrer|deiner} Situation kommt Mehrwertsteuer dazu – das steht verbindlich auf der Angebotsseite.',
  signal: 'price',
}

const SCOPE_UNKNOWN = 'Was genau enthalten ist, prüfen wir gemeinsam auf der offiziellen Angebotsseite, bevor {Sie entscheiden|du entscheidest}.'

export const RELIFE_TEST_CATALOG: CatalogDefinition = {
  id: 'relife-test',
  name: 'RELIFE-Testkatalog',
  provider: 'Agron Bekirovski / RELIFE Academy',
  version: '2026-10-22.1',
  collectedAt: CHECKED,
  isTestData: true,
  notes: [
    'Testdaten. Vor jedem echten Verkaufsgespräch Preis, Leistungsumfang und Verfügbarkeit auf der offiziellen Angebotsseite prüfen.',
    'Die offiziellen Verkaufsseiten (myablefy.com, go.relife-academy.com) waren bei der Erstellung aus der Arbeitsumgebung nicht abrufbar.',
    'Laut Websuche-Auszug des Impressums von relife-academy.com: RELIFE L.L.C-FZ, Dubai; Geschäftsführung Agron Bekirovski (nicht direkt geprüft).',
    'Hochpreisige Angebote: Bedenkzeit aktiv anbieten, keine Ergebnisse versprechen, ein Nein respektieren.',
  ],
  entries: [
    {
      sku: 'first-step-mentorship',
      name: 'RELIFE First Step Mentorship',
      description: '',
      category: 'Mentoring (Abo)',
      price: { amount: 98, currency: 'EUR', interval: 'month', taxNote: 'nicht angegeben' },
      scope: [],
      targetGroup: '',
      needsQuestions: [
        'Was möchten {Sie|du} mit einer Begleitung über mehrere Monate konkret verändern?',
        'Wie viel Zeit {können Sie|kannst du} pro Woche realistisch dafür einplanen?',
        'Was hat {Ihnen|dir} bisher gefehlt, um das allein anzugehen?',
      ],
      arguments: [],
      objections: [
        PRICE_OBJECTION(SCOPE_UNKNOWN),
        { objection: 'Wie lange bin ich gebunden?', answer: 'Laufzeit und Kündigung prüfen wir auf der Angebotsseite – das sage ich {Ihnen|dir} nicht aus dem Kopf.', signal: 'details' },
        NO_GUARANTEE, TERMS,
      ],
      offerUrl: '',
      sources: [
        USER_LIST,
        { label: 'Relife Mastermind – Teilnehmerstimme erwähnt „First Step“ (ohne Produktdetails)', url: 'https://relife-mastermind.com/', checkedAt: CHECKED, method: 'Auszug aus Websuche; Seite nicht direkt geöffnet' },
      ],
      status: { details: 'check', availability: 'unverified' },
      notes: ['Keine offizielle Produktseite gefunden. Leistungsumfang, Laufzeit, Steuerstatus und Link fehlen.'],
      lastChecked: CHECKED,
    },
    {
      sku: 'men-masterclass',
      name: 'RELIFE Men Masterclass',
      description: '',
      category: 'Masterclass',
      price: { amount: 98, currency: 'EUR', interval: 'unknown', taxNote: 'nicht angegeben' },
      scope: [],
      targetGroup: '',
      needsQuestions: [
        'Was hat {Sie|dich} an der Masterclass neugierig gemacht?',
        'Welches Thema beschäftigt {Sie|dich} gerade am meisten?',
        '{Haben Sie|Hast du} schon einmal an einem ähnlichen Format teilgenommen?',
      ],
      arguments: [],
      objections: [PRICE_OBJECTION(SCOPE_UNKNOWN), NO_GUARANTEE, TERMS],
      offerUrl: '',
      sources: [USER_LIST],
      status: { details: 'check', availability: 'unverified' },
      notes: ['Keine offizielle Produktseite gefunden. Termin, Format (online/vor Ort), Zahlungsart, Steuerstatus und Link fehlen.'],
      lastChecked: CHECKED,
    },
    {
      sku: 'decode-the-universe',
      name: 'RELIFE Decode the Universe',
      description: '',
      category: 'Programm (Format prüfen)',
      price: { amount: 1480, currency: 'EUR', interval: 'once', taxNote: 'netto' },
      scope: [],
      targetGroup: '',
      needsQuestions: [
        'Was erhoffen {Sie sich|du dir} von dem Programm?',
        'Wie {lernen Sie|lernst du} am liebsten – allein im eigenen Tempo oder live in der Gruppe?',
        'Welchen Zeitraum {haben Sie|hast du} für so ein Programm im Blick?',
      ],
      arguments: [],
      objections: [PRICE_OBJECTION(SCOPE_UNKNOWN), NETTO, NO_GUARANTEE, TERMS, COMPARE],
      offerUrl: '',
      sources: [USER_LIST],
      status: { details: 'check', availability: 'unverified' },
      notes: ['Keine offizielle Produktseite gefunden. Format, Leistungsumfang und Link fehlen.'],
      lastChecked: CHECKED,
    },
    {
      sku: 'transform-your-reality',
      name: 'RELIFE Transform Your Reality',
      description: 'Programm mit 4 Modulen (119 Lektionen) und Live-Masterclasses über 6 Monate. Themen laut Angebotsseite: Energie, Frequenz und Schwingung; Umsetzung mit Visionboards, 7-Jahres- und Monatsplänen.',
      category: 'Online-Programm mit Live-Masterclasses',
      price: { amount: 4400, currency: 'EUR', interval: 'once', taxNote: 'netto' },
      scope: [
        '4 Module mit lebenslangem Zugriff, 119 Lektionen',
        'Live-Masterclasses 2× pro Woche (Di & So) für 6 Monate',
        'Community-Zugang und Telegram-Support für 6 Monate',
        '2 Reflexions-Calls',
        'Arbeitsmaterial: Visionboards, 7-Jahres- und Monatspläne',
      ],
      targetGroup: '',
      needsQuestions: [
        'Wie viel Zeit {können Sie|kannst du} in den nächsten 6 Monaten pro Woche einplanen – zum Beispiel für zwei Live-Termine?',
        'Passen die Live-Termine dienstags und sonntags in {Ihren|deinen} Alltag?',
        '{Lernen Sie|Lernst du} lieber in der Gruppe oder allein mit Lektionen?',
        'Was möchten {Sie|du} nach den 6 Monaten konkret anders machen?',
      ],
      arguments: [
        '4 Module mit lebenslangem Zugriff und insgesamt 119 Lektionen.',
        'Zweimal pro Woche Live-Masterclasses, dienstags und sonntags, über 6 Monate.',
        '6 Monate Community-Zugang und Telegram-Support, dazu 2 Reflexions-Calls.',
        'Konkretes Arbeitsmaterial: Visionboards sowie 7-Jahres- und Monatspläne.',
      ],
      objections: [
        PRICE_OBJECTION('Enthalten sind laut Angebotsseite 4 Module mit 119 Lektionen, zwei Live-Masterclasses pro Woche über 6 Monate sowie Community und Telegram-Support.'),
        NETTO,
        { objection: 'Ich habe keine Zeit für zwei Termine pro Woche.', answer: 'Das ist ein wichtiger Punkt: Die Live-Masterclasses laufen dienstags und sonntags über 6 Monate. Wenn das nicht in {Ihren|deinen} Alltag passt, ist das Programm vielleicht gerade nicht das richtige.', signal: 'doubt' },
        NO_GUARANTEE, TERMS, COMPARE, TIME,
      ],
      offerUrl: 'https://myablefy.com/s/agron-bekirovski/transform-your-reality',
      sources: [
        { label: 'Ablefy-Angebotsseite „Transform Your Reality“', url: 'https://myablefy.com/s/agron-bekirovski/transform-your-reality', checkedAt: CHECKED, method: 'Auszug aus Websuche; Seite aus Arbeitsumgebung nicht abrufbar' },
        ABOUT,
      ],
      status: { details: 'check', availability: 'unverified' },
      notes: [
        'Preis „4.400,00 € (Net)“ und Leistungsumfang laut Websuche-Auszug der Ablefy-Seite.',
        'Zielgruppe, Ratenzahlung, AGB/Widerruf und aktuelle Buchbarkeit nicht geprüft.',
      ],
      lastChecked: CHECKED,
    },
    {
      sku: 'the-awakening',
      name: 'RELIFE The Awakening',
      description: '',
      category: 'Programm (Format prüfen)',
      price: { amount: 6200, currency: 'EUR', interval: 'once', taxNote: 'inkl. ggf. anwendbarer MwSt.' },
      scope: [],
      targetGroup: '',
      needsQuestions: [
        'Was soll sich durch das Programm für {Sie|dich} verändern?',
        'Was {haben Sie|hast du} bisher schon ausprobiert, und was hat gefehlt?',
        'Welches Budget und welchen Zeitraum {haben Sie|hast du} für so einen Schritt eingeplant?',
      ],
      arguments: [],
      objections: [PRICE_OBJECTION(SCOPE_UNKNOWN), NO_GUARANTEE, TERMS, COMPARE, TIME],
      offerUrl: '',
      sources: [USER_LIST],
      status: { details: 'check', availability: 'unverified' },
      notes: ['Steuerhinweis „inklusive gegebenenfalls anwendbarer Mehrwertsteuer“ laut Angabe des Nutzers zur Angebotsseite – nicht selbst geprüft. Leistungsumfang und Link fehlen.'],
      lastChecked: CHECKED,
    },
    {
      sku: 'one-on-one',
      name: 'One on One mit Agron Bekirovski',
      description: '',
      category: '1:1-Coaching',
      price: { amount: 1970, currency: 'EUR', interval: 'unknown', taxNote: 'nicht angegeben' },
      scope: [],
      targetGroup: '',
      needsQuestions: [
        'Welches Thema möchten {Sie|du} im Einzelgespräch klären?',
        'Warum gerade ein Einzelformat statt einer Gruppe?',
        'Bis wann möchten {Sie|du} bei diesem Thema weiter sein?',
      ],
      arguments: [],
      objections: [
        PRICE_OBJECTION('Umfang und Dauer des Einzelgesprächs prüfen wir gemeinsam auf der Angebotsseite.'),
        NO_GUARANTEE, TERMS, TIME,
      ],
      offerUrl: '',
      sources: [USER_LIST],
      status: { details: 'check', availability: 'unverified' },
      notes: ['Keine offizielle Produktseite gefunden. Dauer, Anzahl der Termine, Format, Steuerstatus und Link fehlen.'],
      lastChecked: CHECKED,
    },
    {
      sku: 'dubai-mastermind-2026-09',
      name: 'RELIFE Dubai Mastermind September 2026',
      description: 'Historischer Event-Eintrag. Laut Mastermind-Seite (allgemeines Format, nicht speziell 2026): eine Woche Coaching vor Ort mit Agron Bekirovski.',
      category: 'Präsenz-Event (Mastermind)',
      price: { amount: 1970, currency: 'EUR', interval: 'once', taxNote: 'nicht angegeben' },
      scope: [
        'Laut Mastermind-Seite (allgemeines Format): eine Woche Coaching vor Ort, täglich bis zu 8 Stunden mit Agron Bekirovski',
        'Laut Mastermind-Seite: Agron Bekirovski entscheidet persönlich über die Teilnahme',
      ],
      targetGroup: '',
      needsQuestions: [
        '{Wären Sie|Wärst du} grundsätzlich an einem künftigen Mastermind-Termin interessiert?',
        'Wäre eine Woche vor Ort für {Sie|dich} organisatorisch machbar?',
      ],
      arguments: [],
      objections: [
        { objection: 'Kann ich da noch mitmachen?', answer: 'Dieser Termin im September 2026 ist vorbei. Ob und wann es einen neuen gibt, kläre ich und melde mich – nur wenn {Sie|du} das {möchten|möchtest}.', signal: 'interest' },
        NO_GUARANTEE,
      ],
      offerUrl: '',
      sources: [
        USER_LIST,
        { label: 'Relife Mastermind – Format, Auswahl durch Agron Bekirovski (allgemein, ohne 2026-Termin)', url: 'https://relife-mastermind.com/', checkedAt: CHECKED, method: 'Auszug aus Websuche; Seite nicht direkt geöffnet' },
      ],
      status: { details: 'check', availability: 'historical' },
      notes: [
        'Event liegt in der Vergangenheit – nicht aktiv anbieten.',
        'Preis 1.970 € nicht bestätigt. Zum Vergleich: 2024 wurde ein Platz bei einem Gewinnspiel mit 12.500 € bewertet (Ablefy-Ticketseite „Main Event“, Websuche-Auszug).',
      ],
      lastChecked: CHECKED,
    },
  ],
}
