# Testbericht – Lebenswerk Adorf PlanStudio 0.1

Stand: 2026-11-11 · Umgebung: Linux x86_64 (Ubuntu 24.04-Container), Node 22, Rust 1.97, Chromium (Playwright), WebKitGTK 4.1 (nativ, Xvfb)

## Zusammenfassung

| Testart | Ergebnis | Aufruf |
|---|---|---|
| TypeScript-Typprüfung (strict) | ✅ fehlerfrei | `npx tsc -b` |
| Unit-Tests (Vitest) | ✅ 20/20 | `npm test` |
| Rust-Tests (Pfadschutz, Transaktions-Rollback, Wertkonvertierung) | ✅ 3/3 | `cargo test --manifest-path src-tauri/Cargo.toml` |
| Browser-E2E (gesamter MVP-Workflow, Chromium) | ✅ 24/24 | `npm run dev` + `npm run test:e2e` |
| Native Desktop-App (Release-Build, WebDriver/tauri-driver, WebKitGTK) | ✅ 7/7 | `DISPLAY=:99 node tests/e2e/native-smoke.cjs <binär>` |
| Linux-Pakete (.deb 3,0 MB, AppImage 78 MB) | ✅ gebaut | `npx tauri build --bundles deb,appimage` |
| Windows-Build | ⚠️ **nicht ausgeführt** (kein Windows verfügbar) | vorbereitet: README + `.github/workflows/planstudio-build.yml` |
| Android-Build | ❌ **nicht möglich** (Android SDK/NDK nicht verfügbar, Download gesperrt) | vorbereitet, siehe README |

## Pflicht-Testfälle aus der Anforderung (Abschnitt 17)

| # | Testfall | Ergebnis | Nachweis |
|---|---|---|---|
| 1 | Projekt erstellen | ✅ | E2E 01, nativ |
| 2 | Projekt speichern | ✅ | jede Änderung transaktional; „Speichern“ → WAL-Checkpoint (nativ) / IndexedDB (Browser); E2E 17 |
| 3 | Projekt erneut öffnen | ✅ | E2E 17 (Reload), nativ (Neustart öffnet letztes Projekt) |
| 4 | Geschoss erstellen | ✅ | E2E 02 |
| 5 | Raum anlegen | ✅ | E2E 04 (Fläche 14,96 m² korrekt), Unit |
| 6 | Wand zeichnen | ✅ | E2E 03 (5,00/4,00 m per Eingabe `5000`, `4m`, `500cm`), nativ (`4,25m`) |
| 7 | Wandmaß ändern | ✅ | E2E 05 (5000 → 5500 mm, angeschlossene Wand folgt), Unit |
| 8 | Tür platzieren | ✅ | E2E 07/08 (inkl. Ablehnung ungültiger Breite mit genau einer Meldung) |
| 9 | Elektroobjekt platzieren | ✅ | E2E 10 (Steckdosen, Schalter, Leuchte; BMK -XD1/-XD2; Raum automatisch) |
| 10 | Stromkreis zuordnen | ✅ | E2E 09/10 |
| 11 | Sanitärleitung zeichnen | ✅ | E2E 12 (Kaltwasser 2,50 m, an Waschbecken angeschlossen) |
| 12 | Materialposition erzeugen | ✅ | E2E 14 (2 Steckdoseneinsätze, 2 m Kabel, 2,5 m Rohr; zweiter Abgleich erzeugt keine Duplikate) |
| 13 | Aufgabe erstellen | ✅ | E2E 15, nativ |
| 14 | Anwendung neu starten | ✅ | E2E 17 (Seitenneuladen), nativ (Prozess beendet und neu gestartet) |
| 15 | Datenbestand überprüfen | ✅ | E2E 17: vollständiger Vergleich vor/nach Neustart identisch; nativ: direkte Prüfung der SQLite-Datei |
| 16 | Grundriss exportieren | ✅ | E2E 18 (PDF `%PDF-`, SVG mit `M 1:50` und Papiermaß 297 mm), nativ (PDF im Exportordner) |
| 17 | Materialliste exportieren | ✅ | E2E 19 (CSV-Inhalt geprüft, fehlender Preis als „PREIS FEHLT“) |

Zusätzlich E2E: Undo/Redo (06), Stromlaufplan mit Verbindung (13), Kosten (16), Foto-Import mit Raumzuordnung (16a),
Raumstudio mit Varianten (16b), Backup + Wiederherstellung als Kopie (20), Tablet-Viewport (21), keine JS-Laufzeitfehler.

## Unit-Tests (Auszug)

* Persistenz: Projekt/Gebäude/Geschoss anlegen und laden; leerer Projektname abgelehnt.
* Kaskadenlöschen Wand→Tür und Undo/Redo; Speicher- und DB-Zustand identisch nach Undo.
* SET NULL (Stromkreis löschen → Zuordnung entfernt, Undo stellt her).
* Fehlerhafte Transaktion (ungültiger Fremdschlüssel) → vollständiger Rollback, Speicherzustand unverändert.
* „Neustart“: DB-Export in neue Instanz, Daten vollständig.
* Geometrie: Längenparser (mm/cm/m, Komma), Transformation Modell↔Bildschirm umkehrbar, Polygonfläche.
* Wände/Öffnungen: Mindestlänge/-stärke, angeschlossene Wand folgt, Öffnung passt nicht/überschneidet sich,
  Öffnung wandert mit Wand, Wand kürzen schiebt Öffnung bzw. wird abgelehnt, Kopieren/Löschen inkl. Öffnungen.
* Material: Bedarf nur aus Planung (Mehrfachsteckdose = 3 Einsätze, Leitungslänge 4,5 m), kein Duplikat beim zweiten Abgleich,
  Preise bleiben leer, Doppelzählungswarnung bei gleichnamiger manueller Position.
* CSV (Semikolon, Quoting, Schutz vor Formel-Injection, BOM), Maßstabswahl (1:20 / 1:75 / A3).
* Backup: Kopie mit neuen IDs inkl. Öffnung→Wand-Bezug und Dateien; Wiederherstellung in leere DB mit Original-IDs; fremde Datei abgelehnt.

## Während der Tests gefundene und behobene Fehler

1. Zeilen im Speicher enthielten nicht alle Spalten (DB lieferte `null`) → Normalisierung mit Defaults beim Einfügen.
2. Editor: Werkzeugoptionen (aktiver Stromkreis, gewähltes Symbol) wurden veraltet gelesen → erstes Objekt ohne Stromkreis bzw. falsches Symbol. Behoben.
3. Auswahlfelder (Dokument→Raum, Raum→Nutzung, Mangelstatus) lasen den Wert asynchron → Zuordnung wurde als leer gespeichert. Behoben.
4. Fehlermeldungen erschienen doppelt. Behoben.
5. Browser-Downloads ohne Dateinamen; Sonderzeichen in Exportnamen. Behoben.
6. PDF: Raumbeschriftung in Serifen-Ersatzschrift. Behoben.
7. Nativer Exportordner fiel ohne XDG-Dokumente-Ordner auf versteckten App-Ordner zurück → jetzt `~/Lebenswerk PlanStudio/Exporte`.

## Nicht getestet / bekannte Lücken

* **Windows** und **Android**: keine Builds in dieser Umgebung (siehe oben). Android-Touchbedienung nur im Desktop-Browser mit Tablet-Viewport geprüft, nicht auf einem Gerät.
* Echte Mehrfinger-Gesten (Pinch-Zoom) sind implementiert, aber nicht automatisiert getestet (Playwright-Maus statt Touch).
* Mausrad-Zoom, Kanban-Drag&Drop, Griffe zum Verschieben von Wandendpunkten: implementiert, manuell/indirekt geprüft, nicht im automatisierten E2E-Lauf.
* PDF-Druck auf physischem Drucker (Maßstabstreue) nicht geprüft; Plangeometrie im PDF in Papier-mm erzeugt und Maßstab im Plan angegeben.
* Große Projekte (Performance mit > 2.000 Objekten) nicht gemessen.
