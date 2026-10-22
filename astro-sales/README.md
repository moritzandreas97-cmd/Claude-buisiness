# NEURAL Astro Sales Engine

Futuristische, lokal laufende Verkaufssoftware für Kundengespräche und Neukundenakquise.
Eigenständiges Teilprojekt in diesem Repository – unabhängig von REAL ONES (`web/`, `server/`).

## Starten

```bash
cd astro-sales
npm install
npm run dev        # http://localhost:5180
npm test           # Engine-Tests (Vitest)
npm run build      # Produktionsbuild nach dist/
```

## Module

| Bereich | Funktion |
| --- | --- |
| **Angebote** | Produkte mit Name, Beschreibung, Vorteilen, Zielgruppe und Preis. Das aktive Produkt (Kopfzeile) fließt in Strategie, Live-Modus und Akquise ein. |
| **Kataloge** | RELIFE-Testkatalog mit 7 Angeboten, Prüfstatus („Details prüfen“, „Nicht verifiziert“, „Historisch“), Quellen und Aktualisierung per JSON. Strenge Faktenregel: keine erfundenen Vorteile, Beispiele oder Zusagen. Siehe [`docs/CATALOG.md`](docs/CATALOG.md). |
| **Anrede** | Globale Du-/Sie-Umschaltung in der Kopfzeile. Alle kundengerichteten Sätze liegen als Doppelform `{Sie-Form|Du-Form}` vor. |
| **Astro Profiler** | Animiertes Profilrad mit 10 Dimensionen und 5 Systemen. Modi: Automatisch, Hybrid, Manuell. Leere Angaben bleiben leer. |
| **Berechnung** | Sonne/Mond/Aszendent über `astronomy-engine`, Zeitzonen inkl. historischer Sommerzeit, Lebenszahl mit Meisterzahlen, chinesisches Tier/Element (Mondneujahr oder Lichun). Mehrdeutigkeiten (z. B. Mondwechsel ohne Geburtszeit) werden als „möglich: A oder B“ angezeigt statt geraten. |
| **Profilfusion** | Konfigurierbare Archetypenregeln (−3 … +3 je Symbol/Dimension). Jeder Wert ist per Klick auf die Achse nachvollziehbar. Übereinstimmungen, Gegensätze, Ergänzungen. |
| **Strategie** | Fokus „Jetzt im Gespräch“ je Phase (Einstieg … Abschluss): Sagen, Rückfragen, nächster Schritt. Dazu konkrete Einstiege, Nutzenargumente aus den Produktvorteilen, Rückfragen, Einwände, Abschlussformulierungen – priorisiert: Kundenaussage → Kundenreaktion → Beobachtung → symbolische Hypothese. |
| **Live-Modus** | 8 große Signal-Buttons (inkl. „Sagt Nein“). Angezeigt werden nur drei Punkte: Was sagen? (mit Alternativen) · Warum? · Was als Nächstes? Signale fließen als Kundenreaktionen in die Strategie. |
| **Akquise-Box** | Kontaktart × Ort × Ziel × Produkt → sofort nutzbare Ansprache bzw. komplette Nachricht (mit Varianten), darunter der 6-Schritt-Leitfaden, UWG/DSGVO-Hinweise, keine automatische Versendung. |
| **Kunden** | Lokale Kundenverwaltung mit Status, nächstem Schritt, Historie, Herkunft je Information, Rechtsgrundlage, Datenauskunft (JSON), Löschen. |
| **Einstellungen** | Angebot, Regel-Editor (JSON + Gewichte), Berechnungsoptionen, optionaler KI-Anschluss (Claude), NEURAL-Webhook. |

Architektur: siehe [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Wichtige Hinweise

- Astrologie und Numerologie sind **symbolische Interpretationsmodelle**, keine validierten psychologischen Verfahren.
- Alle Daten liegen nur im `localStorage` des Browsers. Der KI-Anschluss ist standardmäßig aus und sendet,
  wenn aktiviert, nur anonymisierte Merkmale (kein Name, kein Geburtsdatum).
- Die Compliance-Hinweise sind keine Rechtsberatung.
