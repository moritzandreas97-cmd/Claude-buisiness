# Kostenstruktur (ohne Preise)

Stand: 2026-10-25 · **Es sind bewusst keine Beträge eingetragen.**
Beträge erst eintragen, wenn ein schriftliches Angebot, eine Kostenschätzung eines
Fachplaners oder ein Kaufbeleg vorliegt. Die Quelle gehört in jede Zeile (`Kostenstruktur.csv`).

Die Gliederung orientiert sich an DIN 276 (übliche Gliederung im Bauwesen). Ob die
Bewilligungsstelle eine bestimmte Gliederung verlangt, ist `[OFFEN]`.

## Kostengruppen

| KG | Bereich | Mögliche Positionen (Platzhalter, nicht beauftragt) | Hinweise |
|---|---|---|---|
| 100/200 | Grundstück, Erschließung | voraussichtlich nicht relevant `[ANNAHME]` | |
| 300 | Baukonstruktion | Wände, Böden, Decken, Fenster, Türen, Treppen, Dämmung | Denkmalschutz: Abstimmung vorab |
| 400 | Technische Anlagen | Elektro (inkl. Werkstattstrom/Absicherung), Heizung, Lüftung/Absaugung (Holz, 3D-Druck), Sanitär, Netzwerk/IT, Brandmeldetechnik | getrennte Zähler für Nutzungstrennung prüfen |
| 500 | Außenanlagen | Zugang, Barrierefreiheit, Beschilderung | |
| 600 | Ausstattung | Werkbänke, Maschinen (Holz), 3D-Drucker, Elektronik-Arbeitsplätze, Rechner, Musik-/Medientechnik, Möbel, Lager | neu vs. gebraucht – Förderfähigkeit `[OFFEN]` |
| 700 | Baunebenkosten | Architekt/Planung, Statik, Brandschutzkonzept, restauratorische Untersuchung, Genehmigungsgebühren | |
| 800 | Finanzierung | Zinsen Vorfinanzierung | vermutlich nicht förderfähig `[ANNAHME]` |
| – | Nicht-investiv | Konzepterstellung, Öffentlichkeitsarbeit, Personal/Honorare für Angebote | Förderfähigkeit `[OFFEN]` |
| – | Laufende Betriebskosten | Miete/Nebenkosten-Anteil, Versicherung, Verbrauchsmaterial, Wartung | für Tragfähigkeitsnachweis, i. d. R. nicht Fördergegenstand `[ANNAHME]` |

## Spalten, die jede Position braucht

- **Nutzungsart + förderrelevanter Anteil** (Trennung privat/gewerblich/gemeinnützig)
- **Preisquelle** (Angebot-Nr., Datum, Anbieter) – keine Schätzwerte ohne Quelle
- **Anzahl Vergleichsangebote** (Anforderung `[OFFEN]`)
- **begonnen ja/nein** (Abgleich mit `11_Massnahmenstatus`)
- **Eigenleistung ja/nein** (Anrechenbarkeit `[OFFEN]`)

## Angebote

Angebote als PDF in `Angebote/` ablegen: `JJJJ-MM-TT_Anbieter_Gewerk_Angebotsnr.pdf`.
Status: **keine Angebote vorhanden.**
