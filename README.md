# REAL ONES (Arbeitstitel)

"Wer kennt dich wirklich?" — ein minimaler, viraler Freundschaftstest.
Siehe Produktspezifikation (separat) für Vision, Loop und Regeln.

## Stack

- **web**: React + Vite + TypeScript (mobile-first UI)
- **server**: Node.js + Express + TypeScript, SQLite via `better-sqlite3`
- Monorepo via npm workspaces, kein externer Cloud-Dienst nötig, selbst hostbar.

## Struktur

```
server/   Express API + SQLite-Datenmodell (src/db.ts, src/index.ts)
web/      React/Vite Frontend
```

## Entwicklung

Einmalig installieren:

```
npm install
```

Zwei Terminals (API und Frontend getrennt, Vite proxied /api -> :3000):

```
npm run dev:server   # http://localhost:3000
npm run dev:web      # http://localhost:5173
```

Health-Check: `GET /api/health`

## Status

Phase 1 (Projekt + technische Grundlage) abgeschlossen. Datenmodell
(`tests`, `questions`, `test_questions`, `attempts`, `events`) ist als
SQLite-Schema angelegt, aber es gibt noch keine Produkt-Endpoints/Screens —
die kommen in den folgenden Phasen.
