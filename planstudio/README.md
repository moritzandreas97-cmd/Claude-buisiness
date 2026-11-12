# Lebenswerk Adorf PlanStudio

Lokale, vollständig offline nutzbare Planungssoftware für Gebäude- und Grundrissplanung, Elektroinstallation
(inkl. einfachem Stromlaufplan), Sanitär, Innenausbau, Bauabschnitte/Aufgaben, Material, Kosten,
Fotodokumentation und Planexport. Ein zentrales Gebäudemodell in SQLite – alle Module arbeiten darauf.

> Status: **Version 0.1.1**. Installierbare Builds (Windows, Linux, Android) entstehen automatisch in GitHub Actions –
> Installation auf deinen Geräten: [`INSTALL.md`](INSTALL.md). Details: [`DEVELOPMENT_STATE.md`](DEVELOPMENT_STATE.md), Tests: [`TEST_REPORT.md`](TEST_REPORT.md),
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
| Exporte (PDF, SVG, CSV, Projektbackups) | `~/Dokumente/Lebenswerk PlanStudio/Exporte/` (ohne Dokumente-Ordner: `~/Lebenswerk PlanStudio/Exporte/`) | `Dokumente\Lebenswerk PlanStudio\Exporte\` | `Download/Lebenswerk PlanStudio/` (Rückfall: `Android/data/de.lebenswerk.adorf.planstudio/files/Download/…`) |

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

### Windows 10/11 und Android – über GitHub Actions
Der Workflow `.github/workflows/planstudio-build.yml` („PlanStudio Build“) baut bei jedem Push auf den Entwicklungszweig
(Änderungen unter `planstudio/`) oder manuell:

| Job | Ergebnis | Test auf Zielplattform |
|---|---|---|
| `windows` (windows-latest) | NSIS-Setup + MSI | stille Installation, Start der installierten App, Funktionstest über WebView2-DevTools |
| `linux` (ubuntu-22.04) | .deb + AppImage | Installation des .deb, WebDriver-Test der installierten App |
| `android` (ubuntu-latest, SDK/NDK des Runners) | signierte Release-APK (arm64, armv7, x86_64) + Debug-APK für Tests | – |
| `android-test` | – | Android-14-Tablet-Emulator (Pixel C, Querformat), Steuerung per adb + WebView-DevTools |

Lokaler Windows-Build: Visual Studio C++ Build Tools, Rust (`stable-msvc`), Node 22 → `npm ci && npx tauri build --bundles nsis,msi`.

Lokaler Android-Build: Android Studio (SDK 34, NDK, Build-Tools), `JAVA_HOME` (JDK 17), `ANDROID_HOME`, `NDK_HOME`,
`rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android`, dann
```bash
npx tauri android init --ci
npx tauri android build --apk --target aarch64 armv7 x86_64   # unsigniert → mit apksigner signieren (siehe Workflow)
```
`src-tauri/gen/android` wird bei jedem Build neu erzeugt und ist nicht versioniert.

## Wichtige Hinweise
* Elektro-/Sanitärfunktionen dienen der Planung und Dokumentation. Es erfolgt **keine** Bemessung oder Prüfung auf
  Normkonformität (DIN VDE 0100, DIN 1988/EN 806 u. a.). Ausführung und Prüfung durch Fachbetriebe.
* PDF-Pläne sind nur bei Druck in **Originalgröße (100 %)** maßstabsgetreu; das ist auf jedem Plan vermerkt.
