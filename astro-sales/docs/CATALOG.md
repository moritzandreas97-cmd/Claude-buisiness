# Produktkataloge

Kataloge sind Listen echter Angebote eines Anbieters. Anders als eigene Produkte
gilt für sie eine **strenge Faktenregel**: Die App verwendet nur, was im Katalog
belegt ist.

- Keine Standard-Vorteile. Fehlt ein belegter Vorteil, fallen Sätze weg, die einen Vorteil einsetzen würden.
- Keine erfundenen Kundenbeispiele. Die Akquise-Alternative „Kurzes Beispiel“ entfällt.
- Keine Stilvarianten, die Fakten unterstellen, etwa Absicherungen, Konditionen oder „bewährte Lösung“.
- Prüfstatus und Verfügbarkeit erscheinen in Strategie, Live-Modus, Akquise-Box und Kopfzeile.
- Historische Einträge werden nicht aktiv angeboten.

## Eingebaut: RELIFE-Testkatalog

`src/data/catalogs/relife.ts`, Stand 2026-10-22. Er wird beim ersten Start einmalig
angelegt. Gelöschte Einträge kommen nicht ungefragt zurück; „Angebote → Kataloge
aktualisieren → neu laden“ legt sie wieder an.

| Angebot | Preis | Details | Verfügbarkeit |
| --- | --- | --- | --- |
| RELIFE First Step Mentorship | 98 € pro Monat | prüfen | nicht verifiziert |
| RELIFE Men Masterclass | 98 € | prüfen | nicht verifiziert |
| RELIFE Decode the Universe | 1.480 € netto | prüfen | nicht verifiziert |
| RELIFE Transform Your Reality | 4.400 € netto | prüfen (Umfang belegt) | nicht verifiziert |
| RELIFE The Awakening | 6.200 € inkl. ggf. anwendbarer MwSt. | prüfen | nicht verifiziert |
| One on One mit Agron Bekirovski | 1.970 € | prüfen | nicht verifiziert |
| RELIFE Dubai Mastermind September 2026 | 1.970 € | prüfen | historisch |

Die offiziellen Verkaufsseiten (`myablefy.com`, `go.relife-academy.com`) waren aus der
Arbeitsumgebung nicht erreichbar. Leistungsumfang und Link für „Transform Your Reality“
stammen aus einem Websuche-Auszug der Ablefy-Seite. Alle anderen Namen und Preise kommen
aus der Liste des Nutzers. Jede Quelle trägt Prüfmethode und Datum.

## Aktualisieren aus offiziellen Quellen

**Angebote → Kataloge aktualisieren → Aus JSON-Datei** liest eine Datei im Format von
`CatalogDefinition` (`src/engine/catalog/types.ts`), prüft sie mit `validateCatalog`
und ordnet Einträge über `id` + `sku` zu:

- Bestehende Einträge werden überschrieben, Produkt-IDs bleiben stabil.
- Neue Einträge kommen dazu.
- Eigene Produkte bleiben unverändert.

```json
{
  "id": "relife-test",
  "name": "RELIFE-Testkatalog",
  "provider": "Agron Bekirovski / RELIFE Academy",
  "version": "2026-11-01.1",
  "collectedAt": "2026-11-01",
  "isTestData": true,
  "notes": [],
  "entries": [
    {
      "sku": "transform-your-reality",
      "name": "RELIFE Transform Your Reality",
      "description": "",
      "category": "Online-Programm mit Live-Masterclasses",
      "price": { "amount": 4400, "currency": "EUR", "interval": "once", "taxNote": "netto" },
      "scope": ["4 Module mit lebenslangem Zugriff, 119 Lektionen"],
      "targetGroup": "",
      "needsQuestions": ["Wie viel Zeit {können Sie|kannst du} pro Woche einplanen?"],
      "arguments": ["4 Module mit lebenslangem Zugriff und insgesamt 119 Lektionen."],
      "objections": [{ "objection": "Ist das der Endpreis?", "answer": "Der Preis ist netto angegeben.", "signal": "price" }],
      "offerUrl": "https://myablefy.com/s/agron-bekirovski/transform-your-reality",
      "sources": [{ "label": "Ablefy-Angebotsseite", "url": "https://myablefy.com/s/agron-bekirovski/transform-your-reality", "checkedAt": "2026-11-01", "method": "Angebotsseite geöffnet" }],
      "status": { "details": "complete", "availability": "verified" },
      "notes": [],
      "lastChecked": "2026-11-01"
    }
  ]
}
```

Pflicht je Eintrag sind `sku` (a–z, 0–9, `-`), `name`, `price`, mindestens eine Quelle
und `status`. Kundengerichtete Texte nutzen die Doppelform `{Sie-Form|Du-Form}`.
`signal` (`interest`, `details`, `doubt`, `compare`, `price`, `time`, `ready`, `no`)
legt fest, bei welchem Live-Signal die Antwort erscheint.

Für eine automatische Quelle (z. B. einen offiziellen Export) implementiert man
`CatalogUpdateSource` in `src/engine/catalog/catalog.ts`.
