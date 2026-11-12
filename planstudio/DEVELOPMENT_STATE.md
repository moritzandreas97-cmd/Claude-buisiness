# Entwicklungsstand – Lebenswerk Adorf PlanStudio

_Letzte Aktualisierung: 2026-11-12 · Version 0.1.1_

## Stand 0.1.1 – Plattformen
| Plattform | Installierbar | Automatisch getestet (installierte App) | Auf echter Hardware getestet |
|---|---|---|---|
| Windows | ✅ NSIS-Setup + MSI (CI-Artefakt) | ✅ CI-Runner: Installation, Start, SQLite, Import, Absturz, Neustart, Export | ❌ noch nicht |
| Linux | ✅ .deb + AppImage | ✅ CI + lokal | ❌ (nur Container/CI) |
| Android | ✅ signierte APK (Testsignatur, solange kein eigener Schlüssel hinterlegt ist) | ✅ Android-14-Tablet-Emulator (Debug-APK) | ❌ noch nicht |

Builds: GitHub Actions „PlanStudio Build“ (`.github/workflows/planstudio-build.yml`), Anleitung `INSTALL.md`.
Nächster Schritt mit dir: Installation auf deinem Windows-PC und Android-Tablet, Test mit echten Gebäudedaten aus Adorf,
Rückmeldungen zur Oberfläche sammeln (siehe „Nächste konkrete Aufgaben“).


## Aktueller Stand
MVP gemäß Abschnitt 19 der Anforderung ist implementiert und getestet (Browser + native Linux-App).
Alle Daten liegen in einer lokalen SQLite-Datenbank; jede Änderung wird sofort transaktional gespeichert.

## MVP-Kriterien (Abschnitt 19)

| # | Kriterium | Status |
|---|---|---|
| 1 | Anwendung starten | ✅ Linux nativ + Browser · ⚠️ Windows nicht gebaut · ❌ Android nicht gebaut |
| 2 | Projekt „Lebenswerk Adorf“ erstellen | ✅ |
| 3 | Gebäude und Geschoss anlegen | ✅ |
| 4 | Grundriss mit realen Maßen zeichnen | ✅ (mm intern, numerische Eingabe mm/cm/m) |
| 5 | Türen und Fenster platzieren | ✅ |
| 6 | Wände und Öffnungen nachträglich bearbeiten | ✅ (Eigenschaften, Griffe, Verschieben, Validierung) |
| 7 | Elektroobjekte platzieren | ✅ (12 Symbole) |
| 8 | Stromkreise und Leitungswege verwalten | ✅ |
| 9 | Einfachen Stromlaufplan erstellen und speichern | ✅ |
| 10 | Sanitärobjekte und Leitungswege | ✅ |
| 11 | Räume und Aufgaben verwalten | ✅ |
| 12 | Materialien erfassen und zuordnen | ✅ |
| 13 | Kosten erfassen | ✅ |
| 14 | Projekt speichern | ✅ |
| 15 | Schließen/Neustart ohne Datenverlust | ✅ (Browser-Reload und nativer Neustart geprüft) |
| 16 | Grundriss als PDF/SVG | ✅ |
| 17 | Materialliste exportieren | ✅ |

## Fertiggestellte Funktionen
* Projekte, Gebäude, Geschosse, Räume (CRUD, Flächen aus Polygon), Dashboard mit Kennzahlen.
* 2D-Editor: Raster (einstellbar), Zoom/Pan (Maus, Rad, Pinch), Fang, Ortho, Wände (Längeneingabe, Wandstärken, Endpunkt-Griffe,
  angeschlossene Wände folgen), Räume (Rechteck/Polygon, Eckpunkt-Griffe), Türen/Fenster (Anschlag/Aufschlag, Validierung),
  Maßlinien, automatische Wandmaße, Messen, Auswahl/Mehrfachauswahl, Verschieben, Kopieren, Drehen, Löschen, Undo/Redo, Ebenen, Raumfilter.
* Elektro: Symbolbibliothek, BMK-Vergabe, Montagehöhe, Stromkreise, Leitungswege mit Länge, Betriebsmittelliste (CSV),
  Stromlaufplan (Blätter A3 mit Spalten/Zeilen, 13 Symbole, Verbindungen mit orthogonaler Führung, Querverweise, Zoom/Pan).
* Sanitär: 11 Objekte, Anschlusspunkte, Nennweiten, KW/WW/AW-Leitungen, Listen, Fachplan-PDF.
* Raumstudio: Möbel (Katalog), Podest, Balken, Platte (parametrisch), Material, Varianten speichern/laden.
* Bauabschnitte (Fortschritt), Aufgaben (Filter, Gruppierung, Kanban, Abhängigkeiten mit Zyklusprüfung, Bezüge).
* Material (Status, Bestand, Einkaufsliste, automatische Übernahme ohne Doppelzählung, fehlende Preise markiert).
* Kosten (Projekt-/Raumbudget, geplant/tatsächlich, Export).
* Dokumentation (Foto-/Dateiimport, Notizen, Mängel, Bestand, Zuordnung zu Raum/Objekt/Bauteil).
* Export: PDF/SVG maßstäblich (A4/A3 automatisch), CSV, Projektbackup + Wiederherstellung, DB-Sicherung, automatische Startsicherung.

## Unvollständige Funktionen / bewusst nicht im MVP
* 3D-Ansicht (Three.js) – Datenmodell vorbereitet.
* Android: Teilen-Funktion für Exporte und direkte Kameraaufnahme fehlen (Dateiauswahl funktioniert).
* Kein Auto-Update; Windows-Installer nicht mit Code-Signing-Zertifikat signiert (SmartScreen-Hinweis).
* Elektro-Bemessung, Selektivität, Normprüfung: absichtlich nicht vorhanden (nur Dokumentation).
* Sanitär: Gefälle/Hydraulik fehlen.
* Automatische Stromlaufplan-Generierung fehlt.
* Rubber-Band-Auswahl, Zwischenablage, Spiegeln, Raum-aus-Wänden-Erkennung fehlen.
* Dokumente: Beim Löschen eines Eintrags bleibt die Datei im Projektordner erhalten (damit „Rückgängig“ funktioniert); keine Aufräumfunktion.

## Bekannte Fehler / Einschränkungen
* Wandecken bei nicht rechtwinkligen Anschlüssen zeigen kleine Kerben (Verlängerung um halbe Wandstärke statt Gehrung).
* Wandmaße werden auf der linken Seite der Zeichenrichtung beschriftet (bei Zeichnung gegen den Uhrzeigersinn innen).
* Undo-Verlauf gilt pro Sitzung (nach Neustart leer); Projekt-Metadaten (Name/Budget/Beschreibung) sind nicht im Undo-Verlauf.
* CSV: Werte, die mit „-“ beginnen (z. B. BMK „-XD1“), werden zum Schutz vor Formel-Injection mit `'` versehen.
* Im Browser-Entwicklungsmodus gelten die Speichergrenzen von IndexedDB; produktiv die native App verwenden.

## Letzte erfolgreiche Tests
Siehe `TEST_REPORT.md`: tsc ✅, Vitest 20/20 ✅, Rust 3/3 ✅, Browser-E2E 24/24 ✅, nativ 7/7 ✅, Linux-Pakete gebaut ✅.

## Nächste konkrete Aufgaben
1. Praxistest auf deinen Geräten (Windows-PC, Android-Tablet) mit echten Gebäudedaten aus Adorf; Probleme/Wünsche sammeln.
2. Eigenen Android-Signaturschlüssel als GitHub-Secret hinterlegen (sonst Updates nur mit Deinstallation, siehe INSTALL.md).
3. Android: Teilen-Dialog für Exporte, Kamera-Import; Test auf Android < 11 (öffentlicher Download-Ordner).
4. Wandverschneidungen (Gehrung/T-Stoß), Raum aus Wänden, Rubber-Band-Auswahl.
5. Mehrseitiger PDF-Export (alle Geschosse/Fachpläne).

## Wichtige Architekturentscheidungen
* Tauri 2 + React/TS; **SVG-Editor statt Konva/Pixi** (gemeinsamer Renderer für Bildschirm und maßstäblichen Export).
* **Eigene rusqlite-Befehle statt tauri-plugin-sql** (garantierte Transaktionen pro Batch).
* Browser-Fallback mit sql.js für Entwicklung/Tests – gleiche Migrationen und gleiches SQL.
* Zentrale Änderungsschicht `Tx` mit Vorher/Nachher-Zeilen → Persistenz, Kaskaden und Undo/Redo aus einer Quelle.
* Öffnungen relativ zur Wand gespeichert; Geometrieoperationen als reine, getestete Funktionen (`ops.ts`).
* Materialbedarf: automatische Positionen über eindeutigen `auto_key` (DB-Unique-Index) – keine Duplikate, keine erfundenen Preise.
* Backup-Wiederherstellung überschreibt nie: bei vorhandener Projekt-ID Kopie mit neuen IDs.
