# Installation auf deinen Geräten – Lebenswerk Adorf PlanStudio

Die installierbaren Dateien entstehen automatisch in GitHub Actions (Workflow **„PlanStudio Build“**).

## Dateien herunterladen

1. GitHub → Repository → **Actions** → „PlanStudio Build“ → neuesten **grünen** Lauf öffnen.
2. Unten unter **Artifacts** herunterladen (ZIP, nach dem Entpacken die Datei verwenden):

| Artefakt | Inhalt |
|---|---|
| `PlanStudio-<Version>-build<Nr>-Windows-x64` | `PlanStudio-<Version>-Windows-x64-Setup.exe` (empfohlen), `…-Windows-x64.msi`, Testergebnisse |
| `PlanStudio-<Version>-build<Nr>-Linux-x64` | `…-Linux-x64.deb`, `…-Linux-x64.AppImage`, Testergebnisse |
| `PlanStudio-<Version>-build<Nr>-Android` | `PlanStudio-<Version>-Android-arm64-arm-x64[-Testsignatur].apk` (zum Installieren), `…-DEBUG-nur-fuer-Tests.apk` (**nicht** installieren) |
| `PlanStudio-testergebnisse-build<Nr>-Android-Emulator` | Bildschirmfotos, Ergebnisdatei und Datenbankkopie des Emulatortests |

Artefakte werden von GitHub nach 90 Tagen gelöscht – gewünschte Versionen lokal aufbewahren.

## Windows 10/11

1. `PlanStudio-…-Windows-x64-Setup.exe` ausführen. Der Installer installiert **nur für den aktuellen Benutzer** (keine Administratorrechte nötig)
   nach `%LOCALAPPDATA%\Lebenswerk Adorf PlanStudio\`.
2. **SmartScreen-Warnung**: Die Datei ist nicht mit einem kostenpflichtigen Code-Signing-Zertifikat signiert.
   „Weitere Informationen“ → „Trotzdem ausführen“.
3. WebView2 ist auf Windows 10/11 normalerweise vorhanden; fehlt es, lädt der Installer es nach (Internet nötig, einmalig).

Daten: `%APPDATA%\de.lebenswerk.adorf.planstudio\planstudio.sqlite` · Sicherungen: `…\backups\` · Exporte: `Dokumente\Lebenswerk PlanStudio\Exporte\`.
Updates: neue Setup-Datei einfach installieren – die Datenbank bleibt erhalten.

## Android-Tablet

1. APK auf das Tablet kopieren (USB, Cloud, E-Mail) und im Dateimanager antippen.
2. „Installation aus unbekannten Quellen“ für den Dateimanager/Browser erlauben.
3. App „Lebenswerk Adorf PlanStudio“ starten; Querformat empfohlen.

**Wichtig – Signatur und Updates**
* Endet der Dateiname auf `-Testsignatur`, wurde die APK mit einem **einmaligen** Schlüssel signiert.
  Eine spätere Version lässt sich dann **nicht** darüber installieren; man muss die App deinstallieren –
  **dabei löscht Android die App-Daten (Datenbank)**. Vorher in der App unter *Berichte → Projektbackup erstellen*
  eine Sicherung anlegen und nach der Neuinstallation über *Sicherung laden* zurückspielen.
* Für dauerhafte Updates ohne Deinstallation einmalig einen eigenen Signaturschlüssel hinterlegen
  (GitHub → Settings → Secrets and variables → Actions):
  ```bash
  keytool -genkeypair -v -keystore planstudio.jks -alias planstudio -keyalg RSA -keysize 2048 -validity 10000
  base64 -w0 planstudio.jks > planstudio.jks.b64      # Inhalt → Secret ANDROID_KEYSTORE_BASE64
  ```
  Secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (= `planstudio`).
  Die Schlüsseldatei sicher aufbewahren – ohne sie sind keine Updates mehr möglich.

Daten auf Android: App-interner Speicher (nicht direkt sichtbar, wird bei Deinstallation gelöscht).
Exporte und Projektbackups: `Download/Lebenswerk PlanStudio/` (im Dateimanager sichtbar), sofern das Gerät das
Schreiben dort erlaubt; sonst `Android/data/de.lebenswerk.adorf.planstudio/files/Download/Lebenswerk PlanStudio/`.
Der tatsächliche Ordner steht in der App unter *Einstellungen → Speicherorte* und in jeder „Gespeichert“-Meldung.

**Projektimport auf Android:** *Sicherung laden* öffnet die Android-Dokumentenauswahl; dort die `.lapb.json`-Datei wählen
(z. B. aus „Downloads“ oder einem Cloud-Anbieter).

## Linux

`sudo apt install ./PlanStudio-…-Linux-x64.deb` oder AppImage ausführbar machen und starten.
Daten: `~/.local/share/de.lebenswerk.adorf.planstudio/`.

## Projekt zwischen Geräten übertragen

Gerät A: *Berichte → Projektbackup erstellen* → Datei (`…Backup-<Datum>.lapb.json`, enthält auch Fotos/Dokumente) übertragen →
Gerät B: *Projektauswahl → Sicherung laden* bzw. *Berichte → Backup wiederherstellen*.
Eine Wiederherstellung überschreibt nie: existiert das Projekt bereits, entsteht eine Kopie mit Zusatz „(Wiederherstellung …)“.
Es gibt **keine automatische Synchronisation** – immer nur mit einer Kopie gleichzeitig arbeiten.
