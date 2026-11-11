# Architektur – Lebenswerk Adorf PlanStudio

## Überblick

```
┌──────────────────────────── Frontend (React 18 + TypeScript, Vite) ───────────────────────────┐
│  Module (src/features/*)        Planungs-Editor (SVG)          Export (PDF/SVG/CSV/Backup)      │
│        │                               │                                  │                     │
│        └──────────── useProject (zustand) ── Tx (Änderungen, Kaskaden, Undo/Redo) ──┘           │
│                                       │                                                         │
│                         SqlDriver-Schnittstelle (select / batch / script / flush)               │
└───────────────┬──────────────────────────────────────────────┬──────────────────────────────────┘
                │ Desktop/Android (Tauri 2)                    │ Browser-Entwicklungsmodus / Tests
     TauriDriver → Rust-Befehle (rusqlite, WAL)        SqlJsDriver → SQLite-WASM (+ IndexedDB)
     Dateiablage: <AppData>/files                      Dateiablage: IndexedDB
```

**Grundprinzip:** Ein zentrales Gebäudemodell in **einer** SQLite-Datenbank. Alle Module (Grundriss,
Elektro, Sanitär, Raumstudio, Aufgaben, Material, Kosten, Dokumentation) lesen und schreiben dieselben
Tabellen über dieselbe Änderungsschicht. Jedes Objekt hat eine eindeutige, zeitlich sortierbare ID
(ULID-artig, 26 Zeichen).

## Technologieentscheidungen

| Bereich | Entscheidung | Begründung |
|---|---|---|
| App-Hülle | **Tauri 2** | Eine Codebasis für Windows, Linux und Android; kleine Binärdateien; Rust-Kern für Datenbank/Dateien. |
| UI | React 18 + TypeScript + Tailwind CSS 4 | Wie gefordert. shadcn/ui wurde **nicht** per CLI generiert (benötigt Netzwerk/Registry); stattdessen eigene, gleichartig aufgebaute Komponenten in `src/ui/primitives.tsx` (gleiche Gestaltungsprinzipien, keine zusätzliche Abhängigkeit). |
| 2D-Editor | **SVG statt Konva/PixiJS** (begründete Abweichung) | Derselbe Renderer (`PlanRenderer.tsx`) erzeugt Bildschirmansicht **und** maßstäbliche SVG/PDF-Exporte → Export entspricht exakt der Ansicht; gestochen scharfe Vektorausgabe; Treffertests über DOM (`data-id`); für Gebäudegrundrisse (Hunderte bis wenige Tausend Objekte) ausreichend performant. Konva/Pixi bringen Vorteile erst bei sehr vielen Objekten. |
| Datenbank | SQLite: nativ via **rusqlite** (gebündelt), im Browser via **sql.js** | Identisches SQL/Migrationen auf allen Plattformen. Das offizielle `tauri-plugin-sql` wurde bewusst nicht verwendet, da es Transaktionen über mehrere Aufrufe nicht zuverlässig garantiert (Verbindungspool). Eigene Rust-Befehle führen jeden Batch in **einer** Transaktion aus. |
| Zustand | zustand | Schlank, außerhalb von React nutzbar (Export, Tests). |
| PDF | jsPDF + svg2pdf.js | Vektor-PDF aus demselben SVG; kein Server nötig. |
| 3D | noch nicht umgesetzt | Laut Vorgabe nachrangig; das Datenmodell enthält bereits Höhen (Wandhöhe, Brüstung, Montagehöhe, Unterkante/Höhe von Einbauten) für eine spätere Three.js-Ansicht. |

## Koordinatensystem und Einheiten

* Interne Einheit: **Millimeter** (Gleitkomma). Geldbeträge in **Cent** (Integer).
* Kartesisch, Ursprung (0,0), **x nach rechts, y nach oben** (wie in CAD üblich).
* Bildschirmtransformation (`src/model/geometry.ts`):
  `screen.x = ox + x·scale`, `screen.y = oy − y·scale` (scale = px/mm), Umkehrung `toModel`.
* Export: dieselbe Transformation mit `scale = 1/Maßstabszahl` in Papier-Millimetern.

## Datenmodell (Migration v1, `src/db/migrations.ts`)

| Tabelle | Inhalt | wichtige Beziehungen |
|---|---|---|
| projects | Projekt, Budget, Projektpfad | – |
| buildings | Gebäude | → projects (CASCADE) |
| floors | Geschoss: Höhenlage, Raumhöhe, Reihenfolge | → buildings (CASCADE) |
| rooms | Raum: Polygon (JSON), Fläche, Nutzung, Status, Budget | → floors (CASCADE) |
| components | **Bauteile**: Wand, Tür, Fenster, Maßlinie, Möbel, Podest, Balken, Platte (Geometrie JSON) | → floors; Öffnung → Wand über `host_id` (CASCADE); → rooms (SET NULL) |
| plan_objects | **Planobjekte** Elektro/Sanitär: Typ, Position, Drehung, Montagehöhe, BMK, Eigenschaften | → floors, rooms, circuits |
| circuits | Stromkreise (BMK, Verteilung, dokumentierte Schutzorgane) | → projects |
| lines | Leitungswege (Kabel, KW, WW, AW), Punkte, Länge, Start/Ende-Objekt | → floors, plan_objects, circuits |
| schematic_pages / _symbols / _wires | Stromlaufplan: Blätter, Symbole mit Anschlüssen, Verbindungen | Symbol → plan_objects (Querverweis) |
| phases | Bauabschnitte | → projects |
| tasks / task_deps | Aufgaben, Abhängigkeiten (keine Selbst-/Doppelabhängigkeit, Zyklen werden im UI verhindert) | → rooms, plan_objects, phases |
| materials | Material: Bedarf, Bestand, Preis (optional), Status, Quelle `manual`/`auto` + `auto_key` (eindeutig je Projekt) | → rooms, tasks |
| expenses | Tatsächliche Ausgaben | → rooms, tasks, materials |
| documents | Fotos/Dokumente/Notizen/Mängel/Bestand, Dateischlüssel | → rooms, generischer Objektbezug |
| room_variants | Gestaltungsvarianten eines Raums (Snapshot der Einbauten) | → rooms (CASCADE) |

Referenzielle Integrität wird **doppelt** sichergestellt: durch SQLite-Fremdschlüssel (`PRAGMA foreign_keys=ON`)
und durch die Änderungsschicht, die Kaskaden selbst auflöst (damit Undo sie vollständig rückgängig machen kann).
Die Relationen sind zentral in `src/model/schema.ts` (`RELATIONS`) beschrieben.

## Änderungsschicht, Persistenz und Undo/Redo

1. Jede Benutzeraktion ruft `useProject.mutate(label, tx => …)` auf.
2. `Tx` (`src/store/tx.ts`) sammelt Änderungen als Liste `{table, id, before, after}`, sieht eigene Änderungen
   (konsistentes Lesen), löst Kaskaden/SET NULL gemäß `RELATIONS` auf und vervollständigt Zeilen mit Defaults.
3. Die Änderungen werden in **einer** SQL-Transaktion geschrieben (`batch`). Schlägt sie fehl, bleibt
   der Zustand im Speicher unverändert und eine verständliche Meldung erscheint.
4. Erst nach erfolgreichem Schreiben wird der Speicherzustand aktualisiert und ein Undo-Eintrag abgelegt.
5. Undo/Redo spielt die gespeicherten Vorher-/Nachher-Zeilen in umgekehrter bzw. gleicher Reihenfolge
   ebenfalls transaktional zurück. Alle Schreibvorgänge laufen über eine serielle Warteschlange.

Damit existieren **keine Projektdaten nur im flüchtigen Frontend-Zustand**: Jede Änderung ist sofort
gespeichert („Automatisch speichern“). „Speichern“ erzwingt zusätzlich einen WAL-Checkpoint (nativ) bzw.
das sofortige Schreiben in IndexedDB (Browser).

Nativ zusätzlich: `journal_mode=WAL`, `synchronous=FULL`, `quick_check` beim Start, automatische
Datenbanksicherung bei jedem Start (`VACUUM INTO`, die letzten 10 bleiben erhalten).

## Editor (`src/features/plan`)

* `PlanRenderer.tsx` – reine Darstellung (Bildschirm und Export), Paletten für dunkel/hell/Druck.
* `ops.ts` – alle Geometrieoperationen als reine Funktionen auf `Tx` (Wand anlegen/ändern, Öffnungen
  mit Validierung, Räume, Planobjekte mit BMK-Vergabe und Raumzuordnung, Leitungen, Verschieben,
  Kopieren, Drehen, Löschen). Dieselben Funktionen erzeugen die Live-Vorschau beim Ziehen, das
  endgültige Speichern und werden in Unit-Tests geprüft.
* `PlanEditor.tsx` – Interaktion: Werkzeuge, Fang (Endpunkte, Raumecken, Objekte, Raster, Ortho),
  numerische Längeneingabe, Griffe, Zoom (Mausrad, Pinch), Verschieben (Gesten), Tastaturkürzel.

Öffnungen speichern ihre Lage **relativ zur Wand** (`offset` entlang der Wandachse). Beim Verschieben einer
Wand wandern Öffnungen automatisch mit; beim Kürzen werden sie an das Wandende geschoben, passt eine Öffnung
nicht mehr, wird die Änderung mit Meldung abgelehnt.

## Sicherheit / fachliche Grenzen

Elektro: Schutzorgane, Querschnitte und FI-Zuordnung werden nur **dokumentiert**. Es gibt keine Bemessung,
Selektivitäts- oder Normprüfung; das UI weist an den betroffenen Stellen darauf hin.
Sanitär: keine Gefälle-/Hydraulikberechnung. Materialbedarf ohne Verschnitt/Zuschläge, Preise werden nie geschätzt.

## Verzeichnisstruktur

```
planstudio/
  src/db/            SQL-Treiber, Migrationen, Repository (Serialisierung, Laden)
  src/model/         Schema-Metadaten, Typen, Geometrie, Kataloge (Symbole, Möbel), Materiallogik
  src/store/         Projekt-Store (Persistenz, Undo/Redo), Tx, UI-Store
  src/features/      Module: dashboard, building, plan, props, room, electrical, schematic, sanitary,
                     tasks, materials, costs, docs, reports, settings
  src/export/        planExport (SVG/PDF), csv, backup
  src/ui/            Basiskomponenten und Formularfelder
  src-tauri/         Rust-Kern (lib.rs), Tauri-Konfiguration, Icons
  tests/unit/        Vitest (Datenschicht, Geometrie, Material, Backup, Export)
  tests/e2e/         Playwright-Workflowtest (Browser)
```
