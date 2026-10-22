# NEURAL ASTRO SALES ENGINE – Architekturübersicht

Eigenständige Single-Page-App im Unterordner `astro-sales/`. Sie teilt sich
das Git-Repository mit REAL ONES, ist aber **kein** Teil der npm-Workspaces
und verändert keine Dateien des anderen Projekts.

## Stack

| Bereich | Technologie |
| --- | --- |
| UI | React 19, TypeScript, Tailwind CSS v4 |
| Animation / Visualisierung | `motion` (Framer Motion) + handgebautes SVG-Profilrad |
| Astronomie | `astronomy-engine` (VSOP87/ELP-basierte Positionen, Sternzeit) |
| Zeitzonen | Native `Intl`-API mit IANA-Zeitzonen (inkl. historischer Sommerzeit) |
| Speicherung | `localStorage` (nur im Browser, kein Server) |
| Tests | Vitest für alle Engines |

## Schichten

```
src/
├─ engine/                     reine TypeScript-Logik, keine React-Abhängigkeit
│  ├─ astro/                   Phase 2 – Berechnungen
│  │  ├─ zodiac.ts             12 Tierkreiszeichen, Elemente, Modalitäten
│  │  ├─ ephemeris.ts          Sonne, Mond, Aszendent aus Datum/Zeit/Ort
│  │  ├─ numerology.ts         Lebenszahl inkl. Meisterzahlen 11/22/33
│  │  ├─ chinese.ts            Tier + Element (Mondneujahr astronomisch)
│  │  ├─ timezone.ts           Ortszeit → UTC über IANA-Zeitzone
│  │  ├─ places.ts             Lokale Ortsliste (offline, kein Geocoding-Dienst)
│  │  └─ calculate.ts          Orchestrierung + Hybrid-Merge (auto / manuell)
│  ├─ symbolic/                Phase 1 – Symbolische Profilfusion
│  │  ├─ dimensions.ts         10 Dimensionen
│  │  ├─ rules.ts              Konfigurierbare Archetypenregeln (Tabelle)
│  │  └─ fusion.ts             Gewichtete Fusion + Übereinstimmungen/Gegensätze
│  ├─ behavior/                Separate Engine für beobachtetes Verhalten
│  │  └─ observations.ts       Beobachtungen → Dimensions-Overrides (Vorrang!)
│  ├─ strategy/                Phase 3
│  │  ├─ strategy.ts           Gesprächsstrategie aus Profil + Fakten
│  │  └─ live.ts               Live-Signale → sofortige Empfehlungen
│  └─ acquisition/             Phase 4
│     └─ acquisition.ts        Wer × Wo × Ziel → 6-Schritt-Leitfaden mit Alternativen
├─ store/                      Phase 5 – lokale Persistenz + React-Hooks
├─ ai/                         Optionaler KI-Anschluss (Provider-Interface)
├─ integration/neural.ts       Adapter + Event-Bus für späteres NEURAL-System
├─ components/                 Wiederverwendbare UI (Profilrad, Panels, Chips)
└─ views/                      Profiler, Strategie, Live, Akquise, Kunden, Einstellungen
```

## Grundprinzipien

1. **Keine erfundenen Ergebnisse.** Jede Angabe trägt eine Herkunft
   (`auto`, `manual`, `unknown`). Fehlt die Geburtszeit, wird der Mond nur
   gesetzt, wenn er den ganzen Tag im selben Zeichen steht; sonst „mehrdeutig“.
   Aszendent nur mit Zeit **und** Ort.
2. **Nachvollziehbarkeit.** Jeder Dimensionswert ist eine Summe einzelner
   Regelbeiträge („Löwe als Sonne: Präsenz +3“), die im UI einsehbar sind.
   Regeln und Systemgewichte sind in den Einstellungen änderbar.
3. **Beobachtung schlägt Symbolik.** Beobachtetes Verhalten und geäußerte
   Wünsche überschreiben symbolische Werte und stehen in der Strategie vorne.
4. **Ethik und Recht.** Keine Ausnutzung von Schwächen, keine Massenansprache,
   ein Nein beendet den Leitfaden. DSGVO: Rechtsgrundlage pro Kunde,
   Datenminimierung, Herkunft je Info, Export und Löschen.
5. **Erweiterbarkeit.** Engines sind reine Funktionen; KI und NEURAL hängen
   über Interfaces an und sind standardmäßig deaktiviert.
