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

`server/data/*.sqlite*` ist in `.gitignore` — `npm install`, `npm run build`
und `git pull` fassen dieses Verzeichnis nie an. Ein Prozess-Neustart öffnet
dieselbe Datei erneut, nichts geht verloren. Einziges echtes Risiko: ein
Deployment-Skript, das `server/data/` versehentlich löscht oder der
Projektordner insgesamt neu ausgecheckt statt aktualisiert wird — deshalb
sollte `server/data/` im Zweifel außerhalb des Git-Arbeitsverzeichnisses
liegen (z. B. per Symlink), wenn das Deployment per `git pull` erfolgt.

### Backup

```
server/src/scripts/backup.sh                  # -> server/backups/realones-<timestamp>.sqlite
server/src/scripts/backup.sh /anderer/pfad     # eigenes Zielverzeichnis
```

Nutzt `sqlite3 .backup` (konsistent, auch während der Server läuft) und
fällt auf ein einfaches `cp` zurück, falls die `sqlite3`-CLI fehlt. Behält
automatisch nur die letzten 14 Backups. `server/backups/` ist gitignored.

**Wiederherstellen:** Server stoppen, die gewünschte Backup-Datei nach
`server/data/realones.sqlite` kopieren (inkl. Löschen evtl. vorhandener
`-wal`/`-shm`-Dateien daneben), Server neu starten.

### Test löschen

Auf der Owner-Seite (`/my/:ownerToken`) kann der Ersteller seinen Test
löschen (kleiner, nicht prominenter Link unten, mit Bestätigungsschritt).
Autorisiert wird ausschließlich über den langen `owner_token` — der kurze
`public_token`, den jeder Freund hat, reicht dafür nie (`DELETE
/api/tests/owner/:ownerToken`). Gelöscht werden Test, seine Fragen-Relation,
Attempts und testbezogene Events. Tests, die aus diesem Test heraus erstellt
wurden (`parent_test_id`), bleiben erhalten und verlieren nur die Referenz
auf den gelöschten Eltern-Test.

## Interne Statistik

Kein Dashboard, sondern ein CLI-Skript gegen dieselbe DB:

```
npm run stats -w server
```

Zeigt Trichter-Zahlen (Tests erstellt, Opens, Starts, Completions, Shares,
virale Kette) und daraus abgeleitete Conversion-Raten (Division durch 0
wird sauber als „–" behandelt statt NaN/Infinity).

## Referenz-Deployment (Beispiele, nichts hiervon ist angewendet)

Zielarchitektur: `Internet → HTTPS/Domain → Reverse Proxy → dieser eine
Node-Prozess (Port 3000) → SQLite-Datei`. Kein Docker/Kubernetes nötig.

**systemd-Unit** (`/etc/systemd/system/real-ones.service`, Beispiel):

```ini
[Unit]
Description=REAL ONES
After=network.target

[Service]
WorkingDirectory=/pfad/zu/real-ones/server
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
Environment=PORT=3000
Environment=TRUST_PROXY=1
Environment=PUBLIC_BASE_URL=https://echte-domain.example
Environment=CORS_ORIGIN=https://echte-domain.example
User=www-data

[Install]
WantedBy=multi-user.target
```

**Caddy** (`Caddyfile`, Beispiel — HTTPS/Zertifikat automatisch):

```
echte-domain.example {
  reverse_proxy localhost:3000
}
```

**nginx** (Beispiel, TLS-Zertifikat z. B. via certbot separat einrichten):

```nginx
server {
  listen 443 ssl;
  server_name echte-domain.example;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

Diese Beispiele sind reine Vorlagen zur Orientierung — noch nicht auf
irgendein System angewendet.

## Testdaten nach dem Produktions-E2E-Test entfernen

Vor der echten Beta-Öffnung sollte die Analytik sauber bei 0 starten. Zwei
Optionen, je nachdem wie gründlich:

1. **Gezielt** — jeden im finalen E2E-Test erzeugten Test einzeln über die
   Owner-Seite löschen (siehe „Test löschen" oben). Sauber, aber nur
   praktikabel bei wenigen Test-Tests.
2. **Kompletter Reset** — Server stoppen, `server/data/realones.sqlite*`
   löschen, Server neu starten (Schema + Fragenpool werden automatisch neu
   angelegt, siehe `seed.ts`). Einfachster Weg zu exakt sauberen Zahlen für
   den echten Beta-Start.

## Rechtliches (Platzhalter)

`/datenschutz` und `/impressum` enthalten aktuell **Platzhalter-Angaben**.
Vor einem öffentlichen Launch müssen echte Betreiberdaten eingetragen werden
(siehe die `[...]`-Markierungen direkt in den Seiten bzw.
`web/src/pages/PrivacyPage.tsx` / `ImpressumPage.tsx`).

## Status

Phasen 1–3.6 (Anwendungsseite) abgeschlossen: kompletter viraler Loop (Test
erstellen → Link teilen → spielen → Ergebnis → eigenen Test erstellen),
Social-Preview-Meta, minimale interne Funnel-Statistik, Produktions-Serving
in einem Prozess, Test-Löschung, Backup-Skript. **Noch nicht deployed** —
Domain, echter Server-Zugriff und Betreiberangaben stehen noch aus (siehe
Bericht der aktuellen Phase). Future Me / Social Mirror / Accounts bewusst
noch nicht gebaut.
