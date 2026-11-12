# Bestandsaufnahme / Rekonstruktion – Anleitung

Ab Version 0.2.0. Ziel: aus Videos, Dokumenten und Luftbild einen **nachvollziehbaren, editierbaren schematischen
Bestandsplan** aufbauen. Es ist **kein vermessener Bauplan**: Geometrie gibt es nur dort, wo du sie selbst einzeichnest.

## Projektdaten importieren
Eine vorbereitete Bestandsdatei (`*.lapb.json`, PlanStudio-Projektbackup) lädst du über die Projektauswahl →
**Sicherung laden** (bzw. *Berichte → Backup wiederherstellen*). Es entsteht ein **neues Projekt**; vorhandene Projekte
werden nicht verändert. Projektbezogene Bestandsdaten liegen bewusst **nicht** im Repository.

## Unsicherheitsstufen
| Status | Bedeutung | Darstellung |
|---|---|---|
| Beobachtet (Video/Foto) | im Bildmaterial sichtbar | blau, durchgezogen |
| Nutzerangabe | deine Angabe, nicht vermessen | violett, gestrichelt |
| Hypothese | plausible Zuordnung, nicht belegt | orange, gestrichelt |
| Ungeklärt | offen | rot, gepunktet |
| Bestätigt (Aufmaß) | erst nach echtem Aufmaß setzen | grün, durchgezogen |

Gilt für Raumkarten, Verbindungen, Wände/Türen/Fenster und Planobjekte (Eigenschaftenfenster → *Bestand: Status & Quellen*).

## Arbeitsablauf
1. **Luftbild hinterlegen**: Planungsstudio → Geschoss *Außenübersicht A–F* → ohne Auswahl rechts
   *Hintergrundbild (z. B. Luftbild)* → **Bild importieren**. Bildbreite (Näherung, z. B. aus einer Bildbeschriftung),
   Position, Drehung und Deckkraft einstellen. Das Bild dient nur der Orientierung, wird nicht exportiert.
2. **Gebäudeteile A–F nachzeichnen**: rechts *Unplatzierte Räume* → Karte des Gebäudeteils → Stift-Symbol →
   Rechteck oder (besser für unregelmäßige Umrisse) Werkzeug *Raum als Polygon*. Die Zeichnung wird der Karte zugeordnet,
   es entsteht kein neuer Raum.
3. **Verbindungen erfassen**: *Bestandsaufnahme → Verbindungen*. Von-Raum, Ziel (Raum oder Bezeichnung wie „Hof“),
   Art, Status. Zeile anklicken → **Quelle verknüpfen** mit Video und **Zeitstempel** (z. B. `01:23`).
4. **Kontaktbogen-Fundstellen ersetzen**: Die Importdatei enthält Fundstellen wie „Kontaktbogen Bild 2–5
   (Zeitstempel offen)“. Beim Sichten der Videos durch echte Zeitstempel ersetzen.
5. **Räume einzeichnen**, sobald ihre Lage belegt ist. Unklare Räume bleiben unplatzierte Karten.
6. **Aufmaß**: Maße eintragen, Status auf *Bestätigt (Aufmaß)* setzen.

## Ansichten
* *Bestandsaufnahme → Übersicht*: Zählung je Status, Vorgehen, Hinweise.
* *Quellen*: Katalog; „kein Beleg“ markiert Quellen, die nicht als Nachweis dienen dürfen (KI-Infografik).
* *Raumkarten*: Liste mit Filter; Zeile anklicken → Details, Quellen, Geschoss ändern.
* *Graph*: Nachbarschaft je Geschoss, unabhängig von der Lage; ↗ = Ziel außen/unbestimmt.
* *Planungsstudio*: eingezeichnete Räume mit Statusfarbe, Verbindungen zwischen eingezeichneten Räumen gestrichelt
  (Ebene *Raumverbindungen* abschaltbar).
