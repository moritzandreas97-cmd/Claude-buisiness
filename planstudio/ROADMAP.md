# Roadmap – Lebenswerk Adorf PlanStudio

## Version 0.1 (MVP) – umgesetzt
Siehe `DEVELOPMENT_STATE.md` für den genauen Stand und `TEST_REPORT.md` für Testergebnisse.

## Version 0.2 – Stabilisierung & Komfort (nächste Schritte, priorisiert)
1. **Android-Build tatsächlich erstellen und auf einem Tablet testen** (Android SDK/NDK + `npx tauri android init/build`).
   Danach: Export-/Backup-Ablage auf Android über das System-Teilen-Menü bzw. den öffentlichen Download-Ordner.
2. **Windows-Build** auf einem Windows-Rechner bzw. per CI (GitHub Actions `windows-latest`) erstellen und testen.
3. Wandverbindungen: saubere Gehrungen bei schrägen Anschlüssen, T-Stöße, Wand an Wand teilen.
4. Raum automatisch aus umschließenden Wänden erzeugen (Innenkontur).
5. Rubber-Band-Mehrfachauswahl, Kopieren/Einfügen über Zwischenablage, Spiegeln.
6. Fang auf Wandkanten/-mitte und Lotfußpunkt; Bemaßungsketten.
7. Mehrseitiger PDF-Export (alle Geschosse/Fachpläne in einer Datei), Plankopf konfigurierbar.
8. Direkte Kameranutzung auf Android (Foto → Dokumentation, mit Raumzuordnung).

## Version 0.3 – Fachfunktionen
* Elektro: automatische Stromkreisliste/Verteilerbelegung, Klemmenpläne, Stromlaufplan-Generierung aus Stromkreisen,
  Kabelliste mit Zuschlägen (Steigungen über Montagehöhen, konfigurierbarer Verschnitt – **ausdrücklich gekennzeichnet**).
* Elektro-Bemessungshilfen nur als **eigenständige, fachlich validierungsbedürftige** Funktion (Spannungsfall, Strombelastbarkeit) mit Normverweisen und Prüfvermerk.
* Sanitär: Gefälle, Höhenangaben je Leitungspunkt, Strangschema, Rohrnennweitenhilfe.
* Material: Artikelstammdaten, Lieferanten, Bestellungen, Mengenzuschläge je Kategorie.

## Version 0.4 – 3D & Visualisierung
* Three.js-3D-Ansicht aus demselben Gebäudemodell (Wände mit Höhe, Öffnungen, Einbauten, Installationen).
* Raumstudio in 3D (Podeste, Balken, Platten).

## Später
* Import von DXF-Bestandsplänen, Hintergrundbild (z. B. eingescannter Bestandsplan) maßstäblich hinterlegen.
* Synchronisation zwischen Geräten (optional, z. B. über Datei/USB/LAN) – der Kernbetrieb bleibt offline.
