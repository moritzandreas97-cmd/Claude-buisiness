# Lebenswerk Adorf PlanStudio

Lokale, vollständig offline nutzbare Planungssoftware für Gebäude- und Grundrissplanung, Elektroinstallation
(inkl. einfachem Stromlaufplan), Sanitär, Innenausbau, Bauabschnitte/Aufgaben, Material, Kosten,
Fotodokumentation und Planexport. Ein zentrales Gebäudemodell in SQLite – alle Module arbeiten darauf.

> Status: **Version 0.1 (MVP)**. Details: [`DEVELOPMENT_STATE.md`](DEVELOPMENT_STATE.md), Tests: [`TEST_REPORT.md`](TEST_REPORT.md),
> Aufbau: [`ARCHITECTURE.md`](ARCHITECTURE.md), Planung: [`ROADMAP.md`](ROADMAP.md).

## Schnellstart (Linux, bereits gebaut)

```bash
sudo apt install "./src-tauri/target/release/bundle/deb/Lebenswerk Adorf PlanStudio_0.1.0_amd64.deb"
planstudio            # oder über das Anwendungsmenü „Lebenswerk Adorf PlanStudio“
# alternativ ohne Installation:
chmod +x "src-tauri/target/release/bundle/appimage/Lebenswerk Adorf PlanStudio_0.1.0_amd64.AppImage" && ./src-tauri/...AppImage
```
(Die Build-Ergebnisse liegen nicht im Git-Repository; sie entstehen mit `npx tauri build`, siehe unten.)

## Erste Schritte in der Anwendung

1. Beim ersten Start „Lebenswerk Adorf“ als Projektnamen bestätigen → **Projekt anlegen**
   (Gebäude „Hauptgebäude“ und Geschoss „Erdgeschoss“ werden automatisch erzeugt).
2. **Gebäude**: weitere Geschosse (Höhenlage, Raumhöhe) und Räume anlegen.
3. **Planungsstudio → Grundriss**: Werkzeug *Wand* (W) → Startpunkt antippen → Länge eintippen (z. B. `3650`, `365cm`, `3,65m`) → Enter.
   Richtung = Mausrichtung (mit Ortho 0°/90°). Ersten Punkt erneut antippen schließt den Zug.
   *Tür* (T) / *Fenster* (F) auf eine Wand tippen. *Raum* als Rechteck oder Polygon. Eigenschaften rechts bearbeiten.
4. **Elektro**: unter *Stromkreise* Stromkreise anlegen → *Installationsplan*: Symbol wählen, aktiven Stromkreis wählen,
   auf den Plan tippen; *Leitung* zeichnen (rastet an Objekten ein). *Stromlaufplan*: Symbole platzieren, mit *Verbinden* verknüpfen.
5. **Sanitär**: Objekte platzieren, Kalt-/Warm-/Abwasserleitungen zeichnen.
6. **Materialien → Bedarf aus Planung** erzeugt Positionen aus Objekten und Leitungslängen. Preise selbst eintragen.
7. **Berichte**: Grundriss/Fachpläne als PDF/SVG, Listen als CSV, **Projektbackup**.

Tastenkürzel: Strg+Z/Strg+Y Rückgängig/Wiederholen · Strg+S Speichern · Entf Löschen · Strg+D Kopieren · R Drehen ·
Esc Abbrechen · V Auswahl · H Hand · W Wand · T Tür · F Fenster · D Maßlinie · M Messen · S Symbol · L Leitung.
Touch: ein Finger ziehen = verschieben, zwei Finger = Zoom, Tippen = Werkzeug anwenden.

## Speicherorte

| | Linux | Windows | Android |
|---|---|---|---|
| Datenbank | `~/.local/share/de.lebenswerk.adorf.planstudio/planstudio.sqlite` | `%APPDATA%\de.lebenswerk.adorf.planstudio\planstudio.sqlite` | App-Datenordner (intern) |
| Fotos/Dokumente | `…/de.lebenswerk.adorf.planstudio/files/projects/<Projekt-ID>/documents/` | `%APPDATA%\de.lebenswerk.adorf.planstudio\files\…` | App-Datenordner |
| Automatische DB-Sicherungen (bei jedem Start, letzte 10) und manuelle DB-Sicherungen | `…/de.lebenswerk.adorf.planstudio/backups/` | `%APPDATA%\de.lebenswerk.adorf.planstudio\backups\` | App-Datenordner |
| Exporte (PDF, SVG, CSV, Projektbackups) | `~/Dokumente/Lebenswerk PlanStudio/Exporte/` (ohne Dokumente-Ordner: `~/Lebenswerk PlanStudio/Exporte/`) | `Dokumente\Lebenswerk PlanStudio\Exporte\` | App-Datenordner `exports/` (siehe Einschränkungen) |

Der tatsächliche Pfad wird unter **Einstellungen → Speicherorte** angezeigt. Exporte überschreiben nie vorhandene Dateien.
Im reinen Browser-Entwicklungsmodus liegen die Daten in IndexedDB, Exporte werden heruntergeladen.

## Entwicklung

Voraussetzungen: Node.js ≥ 20, Rust (stable) – für native Builds zusätzlich die Tauri-Systemvoraussetzungen.

```bash
cd planstudio
npm ci
npm run dev          # Browser-Entwicklungsmodus: http://localhost:1420 (SQLite als WASM, Daten in IndexedDB)
npx tauri dev        # native Desktop-App mit Hot-Reload
npm test             # Unit-Tests (Vitest)
npm run test:e2e     # Browser-E2E-Workflow (benötigt laufenden `npm run dev` und Playwright/Chromium)
cargo test --manifest-path src-tauri/Cargo.toml   # Rust-Tests
```

## Build-Anleitungen

### Linux (Ubuntu 22.04/24.04) – getestet
```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
curl https://sh.rustup.rs -sSf | sh            # falls Rust fehlt
cd planstudio && npm ci
npx tauri build --bundles deb,appimage
# Ergebnis: src-tauri/target/release/bundle/{deb,appimage}/
```

### Windows 10/11 – vorbereitet, in dieser Umgebung nicht gebaut
1. [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) („Desktopentwicklung mit C++“) installieren.
2. WebView2 ist auf Windows 10/11 meist vorhanden (sonst Evergreen-Installer von Microsoft).
3. Rust (`rustup-init.exe`, Toolchain `stable-msvc`) und Node.js 22 installieren.
4. ```powershell
   cd planstudio
   npm ci
   npx tauri build --bundles nsis,msi
   ```
   Ergebnis: `src-tauri\target\release\bundle\nsis\*.exe` und `…\msi\*.msi`.

Alternativ: GitHub Actions → Workflow **„PlanStudio Build“** manuell starten (`.github/workflows/planstudio-build.yml`);
er baut Windows- und Linux-Pakete und stellt sie als Artefakte bereit.

### Android (Tablet) – vorbereitet, in dieser Umgebung nicht baubar
Fehlende Voraussetzungen hier: Android SDK, NDK und Build-Tools (Download von `dl.google.com` ist in der
Entwicklungsumgebung gesperrt). Auf einem Entwicklungsrechner:
1. Android Studio installieren; im SDK Manager: *Android SDK Platform 34*, *Platform-Tools*, *Build-Tools*,
   *NDK (Side by side)*, *Command-line Tools*.
2. Umgebungsvariablen: `JAVA_HOME` (JDK 17, z. B. das von Android Studio), `ANDROID_HOME` (SDK-Pfad), `NDK_HOME` (`$ANDROID_HOME/ndk/<version>`).
3. Rust-Ziele: `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`
4. ```bash
   cd planstudio
   npm ci
   npx tauri android init          # erzeugt src-tauri/gen/android (einmalig)
   npx tauri android dev           # auf angeschlossenem Tablet/Emulator testen
   npx tauri android build --apk   # Ergebnis: src-tauri/gen/android/app/build/outputs/apk/
   ```
   Für die Installation außerhalb des Play Stores das APK signieren (siehe Tauri-Dokumentation „Android Code Signing“).
Die Oberfläche ist touchfähig (Gesten, große Schaltflächen, einklappbare Seitenleisten, numerische Eingabe);
**die Android-Version ist jedoch noch nicht auf einem Gerät getestet.**

## Wichtige Hinweise
* Elektro-/Sanitärfunktionen dienen der Planung und Dokumentation. Es erfolgt **keine** Bemessung oder Prüfung auf
  Normkonformität (DIN VDE 0100, DIN 1988/EN 806 u. a.). Ausführung und Prüfung durch Fachbetriebe.
* PDF-Pläne sind nur bei Druck in **Originalgröße (100 %)** maßstabsgetreu; das ist auf jedem Plan vermerkt.
