# Changelog

## [0.2.1] – 2026-11-12 – Smartphone-Ansicht

### Geändert
- Eigene Ansicht für Bildschirme unter 768 px (Smartphone hochkant): Menü zum Ausklappen statt fester linker Leiste,
  schlanke Kopfzeile mit Menü „⋮“ (Speichern, Wiederholen, Gesamtansicht, Design, Export), keine Statusleiste.
- Planungsstudio auf dem Handy: Zeichenfläche in voller Breite, Eigenschaften/unplatzierte Räume als Fenster von unten
  (öffnet bei Auswahl automatisch), Werkzeug- und Modusleisten einzeilig scrollbar, Längeneingabe in voller Breite.
- Bestandsaufnahme auf dem Handy: Raumkarten und Verbindungen als Karten statt breiter Tabellen; Reiter scrollbar.
- Tablet/Desktop unverändert. Test: `tests/e2e/mobile-shots.cjs` (360×800, Touch).

## [0.2.0] – 2026-11-12 – Bestandsaufnahme / Rekonstruktion

### Hinzugefügt
- Modul **Bestandsaufnahme**: Quellenkatalog (Videos, Dokumente, Bilder, Nutzerangaben; „kein Beleg“-Kennzeichnung),
  Raumkarten mit Raum-ID und Unsicherheitsstufe, Verbindungen (Nachbarschaftsgraph getrennt von der Planlage), Graph-Ansicht.
- Status `beobachtet` / `nutzerangabe` / `hypothese` / `ungeklaert` / `bestaetigt` für Räume, Bauteile und Planobjekte;
  Quellenverweise mit Fundstelle (Zeitstempel/Seite) im Eigenschaftenfenster.
- Unplatzierte Raumkarten im Planungsstudio; „Einzeichnen“ ordnet die Zeichnung der bestehenden Karte zu.
- Hintergrundbild je Geschoss (z. B. Luftbild) mit Breite, Position, Drehung, Deckkraft.
- Verbindungen zwischen eingezeichneten Räumen im Plan, nach Status gestrichelt (Ebene abschaltbar).
- Datenbankmigration v2 (bestehende Daten bleiben erhalten; getestet).
- Projektspezifische Bestandsdaten (Importdateien) werden nicht im Repository abgelegt (`planstudio/data/` ist ignoriert).

## [0.1.1] – 2026-11-12 – installierbare Builds für die Zielgeräte

### Hinzugefügt
- GitHub-Actions-Workflow „PlanStudio Build“: Windows (NSIS/MSI), Linux (deb/AppImage), Android (APK) mit
  nachvollziehbar benannten Artefakten und automatisierten Tests auf der jeweiligen Plattform
  (Windows-Installation, Linux-Installation, Android-14-Tablet-Emulator).
- Android: Exporte und Projektbackups im öffentlichen Ordner `Download/Lebenswerk PlanStudio` (mit Schreibprüfung und Rückfall).
- `INSTALL.md`: Installation, Signatur/Updates, Datenübertragung zwischen Geräten.

### Geändert
- Projektimport nutzt ein dauerhaft vorhandenes Dateifeld (Systemdateiauswahl auf allen Plattformen, automatisiert testbar).
- Hauptfenster wird im Programmcode erzeugt; nur bei gesetzter Variable `PLANSTUDIO_TEST_DEVTOOLS_PORT` (Windows-Tests)
  öffnet WebView2 einen lokalen DevTools-Port.
- Planungsmodule unverändert.

## [0.1.0] – 2026-11-11 – erste nutzbare Version (MVP)

### Hinzugefügt
- Projektverwaltung (anlegen, öffnen, umbenennen, löschen, Budget), Gebäude, Geschosse, Räume.
- SQLite-Datenmodell mit versionierten Migrationen, referenzieller Integrität und transaktionalen Schreibvorgängen;
  nativer Rust-Kern (rusqlite, WAL, Startsicherung) und Browser-Fallback (sql.js + IndexedDB).
- Änderungsschicht mit kaskadierendem Löschen und vollständigem Undo/Redo; sofortiges automatisches Speichern.
- 2D-CAD-Editor (SVG): Raster, Zoom/Pan (Maus, Rad, Touch-Pinch), Fang (Endpunkte, Raumecken, Objekte, Raster, Ortho),
  Wände mit numerischer Längeneingabe und Wandstärken, Räume (Rechteck/Polygon, Flächenberechnung),
  Türen/Fenster (wandgebunden, validiert), Maßlinien, Messen, Auswahl, Verschieben, Griffe, Kopieren, Drehen, Löschen.
- Elektro: 12 Installationssymbole, BMK-Vergabe, Montagehöhen, Stromkreise, Leitungswege mit Längenberechnung,
  Ebenen- und Raumfilter, Betriebsmittelliste (CSV), Stromlaufplan-Editor (Blätter, 13 Symbole, Verbindungen,
  Querverweise über BMK und Installationsplan).
- Sanitär: 11 Objekte mit Anschlusspunkten und Nennweiten, Kalt-/Warm-/Abwasserleitungen, Listen und Export.
- Raumstudio: Möbel, Podeste, Balken, Platten (parametrisch), Material/Raum-Zuordnung, Gestaltungsvarianten.
- Bauabschnitte, Aufgaben (Liste, Filter, Gruppierung, Kanban, Abhängigkeiten, Material-/Raum-/Objektbezug).
- Materialien (Bedarf, Bestand, Preise, Status, Einkaufsliste, automatische Übernahme aus Planung ohne Doppelzählung).
- Kosten (Projekt-/Raumbudget, geplante vs. tatsächliche Kosten, fehlende Preise gekennzeichnet, CSV).
- Dokumentation (Foto-/Dateiimport, Notizen, Mängel, Bestand, Raum-/Objektzuordnung).
- Export: Grundriss/Fachpläne als maßstäbliches PDF und SVG (Schriftfeld, Maßstab, Maßstabsleiste), CSV-Listen,
  Projektbackup (JSON inkl. Dateien) und Wiederherstellung (nie überschreibend), Datenbanksicherung (nativ).
- Hell-/Dunkelmodus, einklappbare Panels, touchfreundliche Bedienelemente.
- Unit-Tests (Vitest), Rust-Tests, Browser-E2E-Test des gesamten MVP-Workflows.
