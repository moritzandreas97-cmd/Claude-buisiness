# Testbericht – Lebenswerk Adorf PlanStudio

## Version 0.2.0 – Bestandsaufnahme (2026-11-12, lokal: Chromium + sql.js)
| Test | Ergebnis |
|---|---|
| Unit: Migration v1 → v2 mit vorhandenen Daten | ✅ |
| Unit (lokal, mit Projekt-Importdatei): Import → SQLite, keine Geometrie erfunden, alle Quellenverweise gültig, Zweitimport = Kopie, Backup-Rundlauf, Löschen + Undo von Raum mit Verbindungen/Verweisen | ✅ (in CI übersprungen, da Projektdaten nicht im Repository) |
| Browser-E2E Bestand (7): Import, alle Ansichten, Karte einzeichnen, Hintergrundbild, Status + Undo, Neustart | ✅ 7/7 (lokal) |
| Browser-E2E Gesamtworkflow (Regression) | ✅ 24/24 |
| Plattformbuilds 0.2.0 | siehe GitHub Actions „PlanStudio Build“ |


## Version 0.1.1 – Plattformtests (2026-11-12, GitHub Actions „PlanStudio Build“, Lauf #5)

Alle Tests laufen automatisiert bei jedem Build. Getestet wird jeweils die **installierte** bzw. installierbare App
auf der Zielplattform – nicht der Browser-Entwicklungsmodus.

| Plattform | Build | Testumgebung | Ergebnis |
|---|---|---|---|
| **Windows** | NSIS-Setup + MSI | windows-latest (GitHub-Runner, Windows Server, WebView2 156); stille Installation des Setups, Test der installierten EXE | ✅ 9/9 + Starttest |
| **Linux** | .deb + AppImage | ubuntu-22.04, Installation des .deb, WebDriver (WebKitGTK) | ✅ 8/8 |
| **Android** | Release-APK (arm64/armv7/x86_64), signiert | Android 14 (API 34) Emulator, Profil Pixel C (Tablet, 1280×900 CSS-px, Querformat), Debug-APK x86_64 | ✅ alle Schritte |
| alle | Typprüfung, 21 Unit-Tests, 3 Rust-Tests | Linux/Windows-Runner | ✅ |

### Geprüfte Abläufe je Plattform

| Ablauf | Windows | Linux | Android |
|---|---|---|---|
| App startet, SQLite-Datei wird im App-Datenordner angelegt | ✅ (auch ohne Testwerkzeug: Prozess läuft, DB vorhanden, Bildschirmfoto) | ✅ | ✅ |
| Projekt „Lebenswerk Adorf“ anlegen | ✅ | ✅ | ✅ |
| Wand per Zeigen/Tippen + Längeneingabe „4,25m“ (Länge in DB = 4250 mm) | ✅ | ✅ | ✅ |
| Aufgabe anlegen | ✅ | ✅ | ✅ |
| PDF-Export, Datei lesbar | ✅ `Dokumente\Lebenswerk PlanStudio\Exporte` | ✅ | ✅ `/storage/emulated/0/Download/Lebenswerk PlanStudio` |
| Projektbackup erstellen | ✅ | ✅ | ✅ (öffentlicher Download-Ordner) |
| **Projektimport** | ✅ echte Datei über Dateifeld (DevTools `setFileInputFiles`) | ✅ echte Datei über WebDriver | ✅ per Skript **und** ✅ über die **echte Android-Dokumentenauswahl** (Datei in „Downloads“ angetippt) |
| SQLite nach Beenden: `integrity_check = ok`, Datenbestand vollständig | ✅ nach **hartem Beenden** (Absturzsimulation) | ✅ | ✅ (DB-Kopie vom Gerät geprüft) |
| Neustart: letztes Projekt wird geöffnet, Daten sichtbar | ✅ (nach Absturzsimulation) | ✅ | ✅ |
| Automatische Startsicherung der Datenbank | ✅ | ✅ | – (nicht geprüft) |

### In dieser Phase gefundene und behobene Fehler
1. **Android-Exportordner**: Tauris `download_dir()` liefert auf Android den app-spezifischen Ordner
   `Android/data/<paket>/files/Download` (bei Deinstallation gelöscht, im Dateimanager schwer erreichbar).
   Jetzt: öffentlicher Ordner `Download/Lebenswerk PlanStudio` (Schreibprüfung, Rückfall). Auf Android 14 bestätigt.
2. **Zuletzt geöffnetes Projekt nach Absturz** (Windows): Der Eintrag lag im WebView-`localStorage` und ging beim harten
   Beenden verloren (Daten selbst waren vollständig). Jetzt transaktional in SQLite gespeichert.
3. Windows-Testanbindung: msedgedriver/`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` greifen bei Tauri nicht, da Tauri eigene
   Browser-Argumente setzt. Lösung: Test-Port nur bei gesetzter Variable `PLANSTUDIO_TEST_DEVTOOLS_PORT`.

### Nicht getestet (ehrlich)
* **Kein Test auf echter Hardware**: kein physisches Android-Tablet, kein Windows-10/11-Desktop-PC (nur Windows-Server-Runner im CI).
* Android: nur Android 14 (Emulator, x86_64). Ältere Android-Versionen (Mindest-API 24 = Android 7) **ungetestet**;
  auf Android 7–10 schlägt das Schreiben in den öffentlichen Download-Ordner voraussichtlich fehl → Rückfall auf den
  app-spezifischen Ordner (dann bei Deinstallation gelöscht).
* Android: getestet wurde die **Debug**-APK; die ausgelieferte **Release**-APK (ARM, signiert, minimiert) ist gebaut und
  signaturgeprüft (`apksigner verify`), aber nicht auf einem Gerät gestartet.
* Echte Touch-Gesten (Zwei-Finger-Zoom, Ziehen) – im Emulator wurden Tipps als Zeigerereignisse gesendet.
* Kamera, Fotoimport aus der Galerie auf Android, große Fotos (> 10 MB) auf Android.
* MSI-Installer (nur NSIS-Setup wurde installiert und getestet), Deinstallation, Update-Installation über eine ältere Version.
* Windows SmartScreen-Verhalten beim ersten Start (nicht signiert) – auf CI-Runnern nicht prüfbar.
* Druck auf Papier (Maßstabstreue), Performance großer Projekte.

---

## Version 0.1 – Erstbericht

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
