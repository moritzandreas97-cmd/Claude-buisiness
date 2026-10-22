import type { DimensionId } from '../symbolic/dimensions'

/**
 * Gesprächs-Playbook je Dimension und Ausprägung (hoch/niedrig).
 * Kundengerichtete Texte enthalten Du/Sie-Doppelformen `{Sie|du}`.
 * Platzhalter: {offer} = Produkt, {benefit} = Hauptvorteil, {price} = Preis.
 */
export interface PlayEntry {
  opener: string
  style: string
  topics: string[]
  question: string
  objection: { objection: string; answer: string }
  next: string
}

export type Playbook = Record<DimensionId, { high: PlayEntry; low: PlayEntry }>

export const PLAYBOOK: Playbook = {
  presence: {
    high: {
      opener: 'Mit echter Anerkennung für eine Leistung oder ein Projekt der Person einsteigen.',
      style: 'Raum zur Selbstdarstellung geben, aufmerksam zuhören, Bühne lassen.',
      topics: ['eigene Projekte und Erfolge', 'Pläne und Ambitionen'],
      question: 'Woran würden andere merken, dass sich etwas verbessert hat?',
      objection: { objection: 'Das brauche ich eigentlich nicht.', answer: 'Verstehe – {Sie sind|du bist} schon gut aufgestellt. Mich interessiert, wo {Sie|du} den nächsten Schritt {sehen|siehst}, dann prüfen wir gemeinsam, ob {offer} dazu passt.' },
      next: 'Die Person selbst den nächsten Schritt formulieren lassen.',
    },
    low: {
      opener: 'Ruhig und unaufgeregt einsteigen, ohne die Person in den Mittelpunkt zu drängen.',
      style: 'Leise Töne, keine Gruppenbühne, Ergebnisse statt Show.',
      topics: ['Hintergründe statt Rampenlicht', 'konkrete Alltagsthemen'],
      question: 'Was wäre für {Sie|dich} persönlich eine angenehme Lösung?',
      objection: { objection: 'Ich weiß nicht, ob das zu mir passt.', answer: 'Das ist eine berechtigte Frage. {Lassen Sie|Lass} uns in Ruhe anschauen, was für {Sie|dich} wirklich wichtig ist – ohne Verpflichtung.' },
      next: 'Unterlagen zum Nachlesen anbieten und einen ruhigen Folgetermin vorschlagen.',
    },
  },
  energy: {
    high: {
      opener: 'Schnell zum Punkt kommen, mit Tempo und Begeisterung.',
      style: 'Kurze Sätze, zügiges Tempo, Aktivität und Bewegung im Gespräch.',
      topics: ['aktuelle Vorhaben', 'Sport, Reisen, Aktivitäten'],
      question: 'Was soll als Erstes passieren?',
      objection: { objection: 'Das dauert mir zu lange.', answer: 'Dann starten wir mit dem schnellsten Teil: Den ersten Schritt können wir heute schon festmachen.' },
      next: 'Einen konkreten, zeitnahen Starttermin vorschlagen.',
    },
    low: {
      opener: 'Entspannt beginnen, Zeit lassen, kein Druck.',
      style: 'Langsames Tempo, Pausen aushalten, nichts überstürzen.',
      topics: ['Ruhe, Ausgleich, Genuss', 'langfristige Pläne'],
      question: 'Welcher Zeitrahmen fühlt sich für {Sie|dich} richtig an?',
      objection: { objection: 'Das geht mir zu schnell.', answer: 'Völlig in Ordnung – es gibt keinen Zeitdruck von meiner Seite. Wir legen das Tempo gemeinsam fest.' },
      next: 'Bedenkzeit aktiv anbieten und einen lockeren Rückmeldetermin vereinbaren.',
    },
  },
  emotion: {
    high: {
      opener: 'Persönlich und warm einsteigen, echtes Interesse am Menschen zeigen.',
      style: 'Beziehungsebene zuerst, Geschichten und Beispiele aus dem Leben.',
      topics: ['Familie, Freunde, Werte', 'was die Person bewegt'],
      question: 'Was würde sich für {Sie|dich} persönlich verändern?',
      objection: { objection: 'Ich habe kein gutes Gefühl dabei.', answer: 'Danke für {Ihre|deine} Offenheit. Was genau löst das Gefühl aus? Dann schauen wir uns gerade diesen Punkt gemeinsam an.' },
      next: 'Erfahrungen anderer Kundinnen und Kunden teilen, persönlichen Folgekontakt anbieten.',
    },
    low: {
      opener: 'Sachlich einsteigen, mit einem klaren Anlass.',
      style: 'Fakten statt Gefühle, professionelle Distanz respektieren.',
      topics: ['Fachthemen, Effizienz', 'Markt und Entwicklung'],
      question: 'Nach welchen Kriterien {bewerten Sie|bewertest du} Lösungen in diesem Bereich?',
      objection: { objection: 'Das klingt nach Marketing.', answer: 'Berechtigter Punkt. {Lassen Sie|Lass} uns die Zahlen und Fakten nüchtern ansehen.' },
      next: 'Kompakte Faktenübersicht senden und Entscheidungstermin fixieren.',
    },
  },
  security: {
    high: {
      opener: 'Mit Verlässlichkeit, Referenzen und Transparenz einsteigen.',
      style: 'Risiken offen ansprechen, Garantien und Absicherungen erklären.',
      topics: ['Vorsorge, Planung', 'Bewährtes und Erfahrungen'],
      question: 'Was müsste gegeben sein, damit {Sie sich|du dich} sicher {fühlen|fühlst}?',
      objection: { objection: 'Was, wenn es nicht funktioniert?', answer: 'Gute Frage. Ich zeige {Ihnen|dir} genau, welche Absicherungen und Ausstiegsmöglichkeiten es gibt.' },
      next: 'Schriftliche Zusammenfassung mit allen Konditionen zusenden.',
    },
    low: {
      opener: 'Mit einer spannenden Chance oder Möglichkeit einsteigen.',
      style: 'Chancen vor Risiken, Spielraum für Experimente lassen.',
      topics: ['neue Erfahrungen, Abenteuer', 'Gelegenheiten'],
      question: 'Welche Chance {würden Sie|würdest du} gern als Nächstes nutzen?',
      objection: { objection: 'Das ist mir zu konventionell.', answer: 'Dann schauen wir uns die flexibelste Variante an – die lässt viel Spielraum.' },
      next: 'Einen unverbindlichen Test oder Probelauf vorschlagen.',
    },
  },
  directness: {
    high: {
      opener: 'Ohne Umschweife sagen, worum es geht.',
      style: 'Klar, ehrlich, auf den Punkt – auch Schwächen offen benennen.',
      topics: ['Klartext zu Kosten und Nutzen', 'konkrete Ergebnisse'],
      question: 'Was ist {Ihre|deine} ehrliche Einschätzung?',
      objection: { objection: '{Sagen Sie|Sag} mir einfach, was es kostet.', answer: 'Gern, direkt: {price} – und das {bekommen Sie|bekommst du} dafür: {benefit}.' },
      next: 'Direkt nach einer Entscheidung oder dem konkreten nächsten Schritt fragen.',
    },
    low: {
      opener: 'Behutsam einsteigen, mit Small Talk und gemeinsamen Anknüpfungspunkten.',
      style: 'Diplomatisch, Optionen statt Forderungen, Gesicht wahren lassen.',
      topics: ['gemeinsame Bekannte oder Erlebnisse', 'Harmonie im Umfeld'],
      question: 'Wie sehen das die anderen Beteiligten?',
      objection: { objection: 'Mal sehen …', answer: 'Natürlich. Darf ich fragen, was {Sie|dich} noch zögern lässt? Dann kann ich gezielter helfen.' },
      next: 'Optionen anbieten statt Ja/Nein-Frage stellen.',
    },
  },
  independence: {
    high: {
      opener: 'Expertise der Person anerkennen, keine Belehrung.',
      style: 'Informationen geben, Entscheidung klar bei der Person lassen.',
      topics: ['Selbstständigkeit, eigene Wege', 'Freiheit und Flexibilität'],
      question: 'Welche Kriterien sind für {Ihre|deine} Entscheidung ausschlaggebend?',
      objection: { objection: 'Ich entscheide das selbst.', answer: 'Absolut – {Sie entscheiden|du entscheidest}. Ich liefere {Ihnen|dir} nur alles, was {Sie|du} dafür {brauchen|brauchst}.' },
      next: 'Entscheidungsgrundlage übergeben und Rückmeldung der Person überlassen.',
    },
    low: {
      opener: 'Mit einer persönlichen Empfehlung oder Erfahrung anderer einsteigen.',
      style: 'Orientierung geben, gemeinsam entscheiden, Begleitung anbieten.',
      topics: ['Meinung von Familie, Team, Partner', 'Empfehlungen'],
      question: 'Mit wem {möchten Sie|möchtest du} das noch besprechen?',
      objection: { objection: 'Ich muss das erst mit meinem Partner besprechen.', answer: 'Sehr sinnvoll. Soll ich {Ihnen|dir} eine kurze Übersicht mitgeben oder wollen wir einen gemeinsamen Termin machen?' },
      next: 'Gemeinsamen Termin mit weiteren Entscheidern anbieten.',
    },
  },
  recognition: {
    high: {
      opener: 'Ehrliche, konkrete Wertschätzung aussprechen.',
      style: 'Qualität, Exklusivität und Wirkung betonen.',
      topics: ['Erfolge, Karriere', 'Qualität und Marken'],
      question: 'Was soll man über {Ihre|deine} Lösung sagen, wenn sie umgesetzt ist?',
      objection: { objection: 'Das hat ja jeder.', answer: 'Genau deshalb zeige ich {Ihnen|dir}, was diese Variante besonders macht.' },
      next: 'Premium-Variante oder exklusives Angebot vorstellen.',
    },
    low: {
      opener: 'Sachorientiert einsteigen, Understatement respektieren.',
      style: 'Kein Statusgerede, Funktion und Vernunft zählen.',
      topics: ['Praktischer Nutzen', 'Preis-Leistung'],
      question: 'Was ist {Ihnen|dir} im Alltag am wichtigsten?',
      objection: { objection: 'Ich brauche keinen Luxus.', answer: 'Verstehe ich gut. Dann zeige ich {Ihnen|dir} die solide Basisvariante.' },
      next: 'Die pragmatischste Option empfehlen.',
    },
  },
  openness: {
    high: {
      opener: 'Mit einer Neuigkeit, Idee oder überraschenden Perspektive einsteigen.',
      style: 'Visionär, Ideen durchspielen, Neues zeigen.',
      topics: ['Technologie, Trends', 'Zukunftsideen'],
      question: 'Was {würden Sie|würdest du} ausprobieren, wenn alles möglich wäre?',
      objection: { objection: 'Gibt es noch etwas Neueres?', answer: 'Guter Punkt – {lassen Sie|lass} mich zeigen, was gerade in Entwicklung ist und wie {Sie|du} früh dabei sein {können|kannst}.' },
      next: 'Demo, Test oder Pilotphase anbieten.',
    },
    low: {
      opener: 'An Bewährtes anknüpfen.',
      style: 'Tradition, Erfahrung und Kontinuität betonen.',
      topics: ['bisherige Erfahrungen', 'Gewohnheiten und Routinen'],
      question: 'Was hat sich bei {Ihnen|dir} bisher bewährt?',
      objection: { objection: 'Das habe ich immer anders gemacht.', answer: 'Und das hat sicher gute Gründe. {offer} lässt sich auf {Ihre|deine} bewährte Vorgehensweise aufsetzen.' },
      next: 'Referenzen und Erfahrungsberichte zeigen.',
    },
  },
  structure: {
    high: {
      opener: 'Mit einem klaren Gesprächsplan einsteigen: Ziel, Ablauf, Dauer.',
      style: 'Strukturiert, logisch, Zahlen und Belege, schriftliche Unterlagen.',
      topics: ['Planung, Organisation', 'Daten und Vergleiche'],
      question: 'Welche Kennzahlen oder Kriterien sind für {Sie|dich} entscheidend?',
      objection: { objection: '{Haben Sie|Hast du} dafür Belege?', answer: 'Ja – ich zeige {Ihnen|dir} die konkreten Zahlen und wie sie zustande kommen.' },
      next: 'Strukturierte Zusammenfassung mit Fakten und Vergleich zusenden.',
    },
    low: {
      opener: 'Mit einem Bild, einer Geschichte oder einem Gefühl einsteigen.',
      style: 'Gesamteindruck statt Detailtabellen, Intuition ansprechen.',
      topics: ['Erlebnisse, Eindrücke', 'Kreatives'],
      question: 'Wie {stellen Sie sich|stellst du dir} das ideale Ergebnis vor?',
      objection: { objection: 'Das ist mir zu kompliziert.', answer: '{Lassen Sie|Lass} uns die Details weglassen – das Wesentliche ist ganz einfach.' },
      next: 'Erlebnis ermöglichen: Vorführung, Probe oder Besuch.',
    },
  },
  communication: {
    high: {
      opener: 'Offene Frage stellen und die Person erzählen lassen.',
      style: 'Dialogisch, lebendig, viel Austausch – aber den roten Faden halten.',
      topics: ['Erlebnisse, Neuigkeiten', 'gemeinsame Kontakte'],
      question: '{Erzählen Sie|Erzähl} mal – wie läuft das bei {Ihnen|dir} aktuell?',
      objection: { objection: '{Lassen Sie|Lass} uns später nochmal reden.', answer: 'Gern! Wann passt es {Ihnen|dir}? Dann nehme ich mir richtig Zeit.' },
      next: 'Gespräch zusammenfassen und konkreten Termin festhalten.',
    },
    low: {
      opener: 'Kurz und präzise einsteigen, wenig Small Talk.',
      style: 'Wenige, gezielte Fragen, Schweigen aushalten, schriftlich nachfassen.',
      topics: ['sachliche Kernthemen', 'kurze, konkrete Fragen'],
      question: 'Was ist {Ihnen|dir} dabei am wichtigsten?',
      objection: { objection: '(schweigt)', answer: 'Pause aushalten, dann: „Was geht {Ihnen|dir} gerade durch den Kopf?“' },
      next: 'Kurze schriftliche Zusammenfassung schicken.',
    },
  },
}
