# Changelog

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
