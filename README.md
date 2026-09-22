# REAL ONES (Arbeitstitel)

"Wer kennt dich wirklich?" — ein minimaler, viraler Freundschaftstest.
Siehe Produktspezifikation (separat) für Vision, Loop und Regeln.

## Stack

- **web**: React + Vite + TypeScript (mobile-first UI)
- **server**: Node.js + Express + TypeScript, SQLite via `better-sqlite3`
- Monorepo via npm workspaces, kein externer Cloud-Dienst nötig, selbst hostbar.

## Struktur

```
server/   Express API + SQLite-Datenmodell + Static-Serving in Production
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

## Production

```
npm run build -w web      # erzeugt web/dist
npm run build -w server   # erzeugt server/dist
npm run start -w server   # ein Prozess: API + Frontend auf einem Origin/Port
```

Sobald `web/dist` existiert, erkennt der Server das automatisch und übernimmt
zusätzlich zur API auch das Ausliefern des gebauten Frontends (statische
Assets + SPA-Fallback für Client-Routing + serverseitig injizierte
Open-Graph-/Twitter-Meta-Tags für `/t/:publicToken`, siehe
`server/src/staticServer.ts`). Kein separater Webserver/Reverse Proxy nötig,
kann aber davor gesetzt werden (siehe Environment Variables).

### Environment Variables

Siehe `server/.env.example`. Der Server liest `process.env` direkt (kein
`dotenv` eingebunden) — die Werte müssen vom Prozess-Manager/Deployment
gesetzt werden, oder `.env.example` nach `.env` kopieren und selbst laden.

| Variable          | Pflicht? | Zweck                                                          |
| ------------------ | -------- | ---------------------------------------------------------------- |
| `PORT`             | nein     | Port des Node-Prozesses (Default `3000`)                        |
| `TRUST_PROXY`      | nein     | `1` setzen, wenn hinter Reverse Proxy/Load Balancer deployed     |
| `PUBLIC_BASE_URL`  | nein     | Erzwingt eine feste Basis-URL für `og:url` statt Request-Ableitung |
| `CORS_ORIGIN`      | nein     | Kommagetrennte erlaubte Origins; ohne Angabe aktuell offen (`*`) |

### SQLite-Persistenz

Die DB liegt unter `server/data/realones.sqlite` (WAL-Modus). Dieses
Verzeichnis muss im Deployment auf persistentem Storage liegen (nicht auf
einem ephemeren Dateisystem) und darf nicht von mehreren Prozessinstanzen
gleichzeitig beschrieben werden (Single-Node-SQLite, kein Cluster-Setup).

## Interne Statistik

Kein Dashboard, sondern ein CLI-Skript gegen dieselbe DB:

```
npm run stats -w server
```

Zeigt Trichter-Zahlen (Tests erstellt, Opens, Starts, Completions, Shares,
virale Kette) und daraus abgeleitete Conversion-Raten (Division durch 0
wird sauber als „–" behandelt statt NaN/Infinity).

## Rechtliches (Platzhalter)

`/datenschutz` und `/impressum` enthalten aktuell **Platzhalter-Angaben**.
Vor einem öffentlichen Launch müssen echte Betreiberdaten eingetragen werden
(siehe die `[...]`-Markierungen direkt in den Seiten bzw.
`web/src/pages/PrivacyPage.tsx` / `ImpressumPage.tsx`).

## Status

Phasen 1–3.5 abgeschlossen: kompletter viraler Loop (Test erstellen → Link
teilen → spielen → Ergebnis → eigenen Test erstellen), Social-Preview-Meta,
minimale interne Funnel-Statistik, Produktions-Serving in einem Prozess.
Future Me / Social Mirror / Accounts bewusst noch nicht gebaut.
