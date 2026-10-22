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
| **Astro Profiler** | Animiertes Profilrad mit 10 Dimensionen und 5 Systemen. Modi: Automatisch, Hybrid, Manuell. Leere Angaben bleiben leer. |
| **Berechnung** | Sonne/Mond/Aszendent über `astronomy-engine`, Zeitzonen inkl. historischer Sommerzeit, Lebenszahl mit Meisterzahlen, chinesisches Tier/Element (Mondneujahr oder Lichun). Mehrdeutigkeiten (z. B. Mondwechsel ohne Geburtszeit) werden als „möglich: A oder B“ angezeigt statt geraten. |
| **Profilfusion** | Konfigurierbare Archetypenregeln (−3 … +3 je Symbol/Dimension). Jeder Wert ist per Klick auf die Achse nachvollziehbar. Übereinstimmungen, Gegensätze, Ergänzungen. |
| **Strategie** | Einstieg, Stil, Themen (Hypothesen), Nutzen, Fragen, Einwände, nächster Schritt, Beispielsätze – priorisiert: Kundenaussage → Beobachtung → Symbolik. |
| **Live-Modus** | 8 große Signal-Buttons (inkl. „Sagt Nein“), sofortige Empfehlung, Gesprächstemperatur und -phase, Speichern in die Historie. |
| **Akquise-Box** | Wen × Wo × Ziel → 6-Schritt-Leitfaden mit wählbaren Alternativen, UWG/DSGVO-Hinweise, keine automatische Versendung. |
| **Kunden** | Lokale Kundenverwaltung mit Status, nächstem Schritt, Historie, Herkunft je Information, Rechtsgrundlage, Datenauskunft (JSON), Löschen. |
| **Einstellungen** | Angebot, Regel-Editor (JSON + Gewichte), Berechnungsoptionen, optionaler KI-Anschluss (Claude), NEURAL-Webhook. |

Architektur: siehe [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Wichtige Hinweise

- Astrologie und Numerologie sind **symbolische Interpretationsmodelle**, keine validierten psychologischen Verfahren.
- Alle Daten liegen nur im `localStorage` des Browsers. Der KI-Anschluss ist standardmäßig aus und sendet,
  wenn aktiviert, nur anonymisierte Merkmale (kein Name, kein Geburtsdatum).
- Die Compliance-Hinweise sind keine Rechtsberatung.
