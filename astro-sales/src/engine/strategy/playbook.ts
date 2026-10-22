import type { DimensionId } from '../symbolic/dimensions'

/**
 * Gesprächs-Playbook je Dimension und Ausprägung (hoch/niedrig).
 * Platzhalter: {offer} = Angebot, {benefit} = Kernnutzen.
 */
export interface PlayEntry {
  opener: string
  style: string
  topics: string[]
  benefit: string
  question: string
  objection: { objection: string; answer: string }
  next: string
  phrase: string
}

export type Playbook = Record<DimensionId, { high: PlayEntry; low: PlayEntry }>

export const PLAYBOOK: Playbook = {
  presence: {
    high: {
      opener: 'Mit echter Anerkennung für eine Leistung oder ein Projekt der Person einsteigen.',
      style: 'Raum zur Selbstdarstellung geben, aufmerksam zuhören, Bühne lassen.',
      topics: ['eigene Projekte und Erfolge', 'Pläne und Ambitionen'],
      benefit: '{offer} unterstreicht, wofür Sie stehen – sichtbar und wirkungsvoll.',
      question: 'Woran würden andere merken, dass sich etwas verbessert hat?',
      objection: { objection: 'Das brauche ich eigentlich nicht.', answer: 'Verstehe – Sie sind schon gut aufgestellt. Mich interessiert, wo Sie den nächsten Schritt sehen, dann prüfen wir gemeinsam, ob {offer} dazu passt.' },
      next: 'Die Person selbst den nächsten Schritt formulieren lassen.',
      phrase: 'Wie sind Sie eigentlich dazu gekommen? Das klingt nach einer spannenden Geschichte.',
    },
    low: {
      opener: 'Ruhig und unaufgeregt einsteigen, ohne die Person in den Mittelpunkt zu drängen.',
      style: 'Leise Töne, keine Gruppenbühne, Ergebnisse statt Show.',
      topics: ['Hintergründe statt Rampenlicht', 'konkrete Alltagsthemen'],
      benefit: '{offer} wirkt im Hintergrund – ohne Aufwand und ohne großes Tamtam.',
      question: 'Was wäre für Sie persönlich eine angenehme Lösung?',
      objection: { objection: 'Ich weiß nicht, ob das zu mir passt.', answer: 'Das ist eine berechtigte Frage. Lassen Sie uns in Ruhe anschauen, was für Sie wirklich wichtig ist – ohne Verpflichtung.' },
      next: 'Unterlagen zum Nachlesen anbieten und einen ruhigen Folgetermin vorschlagen.',
      phrase: 'Wir können das ganz in Ruhe angehen – ich zeige Ihnen nur das, was für Sie relevant ist.',
    },
  },
  energy: {
    high: {
      opener: 'Schnell zum Punkt kommen, mit Tempo und Begeisterung.',
      style: 'Kurze Sätze, zügiges Tempo, Aktivität und Bewegung im Gespräch.',
      topics: ['aktuelle Vorhaben', 'Sport, Reisen, Aktivitäten'],
      benefit: 'Mit {offer} geht es sofort los – {benefit} ohne lange Vorlaufzeit.',
      question: 'Was soll als Erstes passieren?',
      objection: { objection: 'Das dauert mir zu lange.', answer: 'Dann starten wir mit dem schnellsten Teil: Den ersten Schritt können wir heute schon festmachen.' },
      next: 'Einen konkreten, zeitnahen Starttermin vorschlagen.',
      phrase: 'Kurz und knapp: In drei Schritten sind Sie startklar.',
    },
    low: {
      opener: 'Entspannt beginnen, Zeit lassen, kein Druck.',
      style: 'Langsames Tempo, Pausen aushalten, nichts überstürzen.',
      topics: ['Ruhe, Ausgleich, Genuss', 'langfristige Pläne'],
      benefit: '{offer} lässt sich Schritt für Schritt einführen – in Ihrem Tempo.',
      question: 'Welcher Zeitrahmen fühlt sich für Sie richtig an?',
      objection: { objection: 'Das geht mir zu schnell.', answer: 'Völlig in Ordnung – es gibt keinen Zeitdruck von meiner Seite. Wir legen das Tempo gemeinsam fest.' },
      next: 'Bedenkzeit aktiv anbieten und einen lockeren Rückmeldetermin vereinbaren.',
      phrase: 'Nehmen Sie sich die Zeit, die Sie brauchen – ich bin da, wenn Fragen auftauchen.',
    },
  },
  emotion: {
    high: {
      opener: 'Persönlich und warm einsteigen, echtes Interesse am Menschen zeigen.',
      style: 'Beziehungsebene zuerst, Geschichten und Beispiele aus dem Leben.',
      topics: ['Familie, Freunde, Werte', 'was die Person bewegt'],
      benefit: '{offer} schafft ein gutes Gefühl – für Sie und die Menschen, die Ihnen wichtig sind.',
      question: 'Was würde sich für Sie persönlich verändern?',
      objection: { objection: 'Ich habe kein gutes Gefühl dabei.', answer: 'Danke für Ihre Offenheit. Was genau löst das Gefühl aus? Dann schauen wir uns gerade diesen Punkt gemeinsam an.' },
      next: 'Erfahrungen anderer Kundinnen und Kunden teilen, persönlichen Folgekontakt anbieten.',
      phrase: 'Mir ist wichtig, dass Sie sich damit wirklich wohlfühlen.',
    },
    low: {
      opener: 'Sachlich einsteigen, mit einem klaren Anlass.',
      style: 'Fakten statt Gefühle, professionelle Distanz respektieren.',
      topics: ['Fachthemen, Effizienz', 'Markt und Entwicklung'],
      benefit: '{offer} liefert messbar {benefit}.',
      question: 'Nach welchen Kriterien bewerten Sie Lösungen in diesem Bereich?',
      objection: { objection: 'Das klingt nach Marketing.', answer: 'Berechtigter Punkt. Lassen Sie uns die Zahlen und Fakten nüchtern ansehen.' },
      next: 'Kompakte Faktenübersicht senden und Entscheidungstermin fixieren.',
      phrase: 'Ich lasse die Werbesprache weg und zeige Ihnen die harten Fakten.',
    },
  },
  security: {
    high: {
      opener: 'Mit Verlässlichkeit, Referenzen und Transparenz einsteigen.',
      style: 'Risiken offen ansprechen, Garantien und Absicherungen erklären.',
      topics: ['Vorsorge, Planung', 'Bewährtes und Erfahrungen'],
      benefit: '{offer} gibt Ihnen Sicherheit – mit klaren Bedingungen und ohne versteckte Risiken.',
      question: 'Was müsste gegeben sein, damit Sie sich sicher fühlen?',
      objection: { objection: 'Was, wenn es nicht funktioniert?', answer: 'Gute Frage. Ich zeige Ihnen genau, welche Absicherungen und Ausstiegsmöglichkeiten es gibt.' },
      next: 'Schriftliche Zusammenfassung mit allen Konditionen zusenden.',
      phrase: 'Alles, was wir besprechen, bekommen Sie schwarz auf weiß.',
    },
    low: {
      opener: 'Mit einer spannenden Chance oder Möglichkeit einsteigen.',
      style: 'Chancen vor Risiken, Spielraum für Experimente lassen.',
      topics: ['neue Erfahrungen, Abenteuer', 'Gelegenheiten'],
      benefit: '{offer} eröffnet neue Möglichkeiten – {benefit}.',
      question: 'Welche Chance würden Sie gern als Nächstes nutzen?',
      objection: { objection: 'Das ist mir zu konventionell.', answer: 'Dann schauen wir uns die flexibelste Variante an – die lässt viel Spielraum.' },
      next: 'Einen unverbindlichen Test oder Probelauf vorschlagen.',
      phrase: 'Probieren Sie es einfach aus – Sie behalten jederzeit die Freiheit.',
    },
  },
  directness: {
    high: {
      opener: 'Ohne Umschweife sagen, worum es geht.',
      style: 'Klar, ehrlich, auf den Punkt – auch Schwächen offen benennen.',
      topics: ['Klartext zu Kosten und Nutzen', 'konkrete Ergebnisse'],
      benefit: 'Kurz gesagt: {offer} bringt {benefit}.',
      question: 'Was ist Ihre ehrliche Einschätzung?',
      objection: { objection: 'Sagen Sie mir einfach, was es kostet.', answer: 'Gern, direkt: Hier ist der Preis – und das bekommen Sie dafür.' },
      next: 'Direkt nach einer Entscheidung oder dem konkreten nächsten Schritt fragen.',
      phrase: 'Ich sage es Ihnen ganz offen: …',
    },
    low: {
      opener: 'Behutsam einsteigen, mit Small Talk und gemeinsamen Anknüpfungspunkten.',
      style: 'Diplomatisch, Optionen statt Forderungen, Gesicht wahren lassen.',
      topics: ['gemeinsame Bekannte oder Erlebnisse', 'Harmonie im Umfeld'],
      benefit: '{offer} fügt sich harmonisch in Ihren Alltag ein.',
      question: 'Wie sehen das die anderen Beteiligten?',
      objection: { objection: 'Mal sehen …', answer: 'Natürlich. Darf ich fragen, was Sie noch zögern lässt? Dann kann ich gezielter helfen.' },
      next: 'Optionen anbieten statt Ja/Nein-Frage stellen.',
      phrase: 'Was wäre Ihnen lieber – Variante A oder B?',
    },
  },
  independence: {
    high: {
      opener: 'Expertise der Person anerkennen, keine Belehrung.',
      style: 'Informationen geben, Entscheidung klar bei der Person lassen.',
      topics: ['Selbstständigkeit, eigene Wege', 'Freiheit und Flexibilität'],
      benefit: 'Mit {offer} behalten Sie die volle Kontrolle und Flexibilität.',
      question: 'Welche Kriterien sind für Ihre Entscheidung ausschlaggebend?',
      objection: { objection: 'Ich entscheide das selbst.', answer: 'Absolut – Sie entscheiden. Ich liefere Ihnen nur alles, was Sie dafür brauchen.' },
      next: 'Entscheidungsgrundlage übergeben und Rückmeldung der Person überlassen.',
      phrase: 'Sie kennen Ihre Situation am besten – ich gebe Ihnen nur die Fakten an die Hand.',
    },
    low: {
      opener: 'Mit einer persönlichen Empfehlung oder Erfahrung anderer einsteigen.',
      style: 'Orientierung geben, gemeinsam entscheiden, Begleitung anbieten.',
      topics: ['Meinung von Familie, Team, Partner', 'Empfehlungen'],
      benefit: 'Bei {offer} sind Sie nicht allein – ich begleite Sie Schritt für Schritt.',
      question: 'Mit wem möchten Sie das noch besprechen?',
      objection: { objection: 'Ich muss das erst mit meinem Partner besprechen.', answer: 'Sehr sinnvoll. Soll ich Ihnen eine kurze Übersicht mitgeben oder wollen wir einen gemeinsamen Termin machen?' },
      next: 'Gemeinsamen Termin mit weiteren Entscheidern anbieten.',
      phrase: 'Viele meiner Kunden hatten genau dieselbe Frage – ich erzähle Ihnen gern, wie sie entschieden haben.',
    },
  },
  recognition: {
    high: {
      opener: 'Ehrliche, konkrete Wertschätzung aussprechen.',
      style: 'Qualität, Exklusivität und Wirkung betonen.',
      topics: ['Erfolge, Karriere', 'Qualität und Marken'],
      benefit: '{offer} steht für Qualität, die man sieht.',
      question: 'Was soll man über Ihre Lösung sagen, wenn sie umgesetzt ist?',
      objection: { objection: 'Das hat ja jeder.', answer: 'Genau deshalb zeige ich Ihnen, was diese Variante besonders macht.' },
      next: 'Premium-Variante oder exklusives Angebot vorstellen.',
      phrase: 'Das passt zu Ihrem Anspruch.',
    },
    low: {
      opener: 'Sachorientiert einsteigen, Understatement respektieren.',
      style: 'Kein Statusgerede, Funktion und Vernunft zählen.',
      topics: ['Praktischer Nutzen', 'Preis-Leistung'],
      benefit: '{offer} ist einfach eine vernünftige Lösung – {benefit}.',
      question: 'Was ist Ihnen im Alltag am wichtigsten?',
      objection: { objection: 'Ich brauche keinen Luxus.', answer: 'Verstehe ich gut. Dann zeige ich Ihnen die solide Basisvariante.' },
      next: 'Die pragmatischste Option empfehlen.',
      phrase: 'Ganz unaufgeregt: Es funktioniert einfach.',
    },
  },
  openness: {
    high: {
      opener: 'Mit einer Neuigkeit, Idee oder überraschenden Perspektive einsteigen.',
      style: 'Visionär, Ideen durchspielen, Neues zeigen.',
      topics: ['Technologie, Trends', 'Zukunftsideen'],
      benefit: '{offer} ist ein neuer Weg zu {benefit}.',
      question: 'Was würden Sie ausprobieren, wenn alles möglich wäre?',
      objection: { objection: 'Gibt es noch etwas Neueres?', answer: 'Guter Punkt – lassen Sie mich zeigen, was gerade in Entwicklung ist und wie Sie früh dabei sein können.' },
      next: 'Demo, Test oder Pilotphase anbieten.',
      phrase: 'Ich habe da etwas, das Sie wahrscheinlich noch nicht kennen.',
    },
    low: {
      opener: 'An Bewährtes anknüpfen.',
      style: 'Tradition, Erfahrung und Kontinuität betonen.',
      topics: ['bisherige Erfahrungen', 'Gewohnheiten und Routinen'],
      benefit: '{offer} ist bewährt und vielfach erprobt.',
      question: 'Was hat sich bei Ihnen bisher bewährt?',
      objection: { objection: 'Das habe ich immer anders gemacht.', answer: 'Und das hat sicher gute Gründe. {offer} lässt sich auf Ihre bewährte Vorgehensweise aufsetzen.' },
      next: 'Referenzen und Erfahrungsberichte zeigen.',
      phrase: 'Das ist keine Experimentierlösung – sie hat sich vielfach bewährt.',
    },
  },
  structure: {
    high: {
      opener: 'Mit einem klaren Gesprächsplan einsteigen: Ziel, Ablauf, Dauer.',
      style: 'Strukturiert, logisch, Zahlen und Belege, schriftliche Unterlagen.',
      topics: ['Planung, Organisation', 'Daten und Vergleiche'],
      benefit: '{offer}: nachvollziehbar, planbar und belegbar – {benefit}.',
      question: 'Welche Kennzahlen oder Kriterien sind für Sie entscheidend?',
      objection: { objection: 'Haben Sie dafür Belege?', answer: 'Ja – ich zeige Ihnen die konkreten Zahlen und wie sie zustande kommen.' },
      next: 'Strukturierte Zusammenfassung mit Fakten und Vergleich zusenden.',
      phrase: 'Ich schlage folgenden Ablauf vor: erst Ihr Bedarf, dann die Lösung, dann die Zahlen.',
    },
    low: {
      opener: 'Mit einem Bild, einer Geschichte oder einem Gefühl einsteigen.',
      style: 'Gesamteindruck statt Detailtabellen, Intuition ansprechen.',
      topics: ['Erlebnisse, Eindrücke', 'Kreatives'],
      benefit: 'Stellen Sie sich vor, wie es sich mit {offer} anfühlt.',
      question: 'Wie stellen Sie sich das ideale Ergebnis vor?',
      objection: { objection: 'Das ist mir zu kompliziert.', answer: 'Lassen Sie uns die Details weglassen – das Wesentliche ist ganz einfach.' },
      next: 'Erlebnis ermöglichen: Vorführung, Probe oder Besuch.',
      phrase: 'Am besten zeige ich es Ihnen einfach – das sagt mehr als jede Tabelle.',
    },
  },
  communication: {
    high: {
      opener: 'Offene Frage stellen und die Person erzählen lassen.',
      style: 'Dialogisch, lebendig, viel Austausch – aber den roten Faden halten.',
      topics: ['Erlebnisse, Neuigkeiten', 'gemeinsame Kontakte'],
      benefit: '{offer} ist ein Thema, über das man gern spricht – {benefit}.',
      question: 'Erzählen Sie mal – wie läuft das bei Ihnen aktuell?',
      objection: { objection: 'Lassen Sie uns später nochmal reden.', answer: 'Gern! Wann passt es Ihnen? Dann nehme ich mir richtig Zeit.' },
      next: 'Gespräch zusammenfassen und konkreten Termin festhalten.',
      phrase: 'Das ist ein spannender Punkt – erzählen Sie gern mehr.',
    },
    low: {
      opener: 'Kurz und präzise einsteigen, wenig Small Talk.',
      style: 'Wenige, gezielte Fragen, Schweigen aushalten, schriftlich nachfassen.',
      topics: ['sachliche Kernthemen', 'kurze, konkrete Fragen'],
      benefit: '{offer} – kurz gesagt: {benefit}.',
      question: 'Was ist Ihnen dabei am wichtigsten?',
      objection: { objection: '(schweigt)', answer: 'Pause aushalten, dann: „Was geht Ihnen gerade durch den Kopf?“' },
      next: 'Kurze schriftliche Zusammenfassung schicken.',
      phrase: 'Ich halte mich kurz.',
    },
  },
}
