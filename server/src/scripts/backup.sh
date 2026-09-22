#!/usr/bin/env bash
# Minimales Backup-Konzept fuer die REAL-ONES-SQLite-DB (Phase 3.6, Abschnitt 7).
# Kein Backup-System, nur ein sicherer, wiederholbarer Kopiervorgang.
#
# Nutzung:
#   server/src/scripts/backup.sh                  # Backup nach server/backups/
#   server/src/scripts/backup.sh /pfad/zu/backups  # Backup in eigenes Verzeichnis
#
# Wiederherstellung: siehe README.md ("Backup wiederherstellen").
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
DB_PATH="$SERVER_DIR/data/realones.sqlite"
BACKUP_DIR="${1:-$SERVER_DIR/backups}"

if [ ! -f "$DB_PATH" ]; then
  echo "Keine Datenbank gefunden unter $DB_PATH - nichts zu sichern." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DEST="$BACKUP_DIR/realones-$TIMESTAMP.sqlite"

# sqlite3 .backup statt cp: konsistentes Backup auch bei laufendem Server
# (WAL-Modus, evtl. offene Schreibvorgaenge) - cp koennte sonst eine
# inkonsistente Momentaufnahme erwischen.
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB_PATH" ".backup '$DEST'"
else
  echo "Hinweis: sqlite3-CLI nicht gefunden, verwende einfaches cp (Server sollte dafuer kurz gestoppt sein)." >&2
  cp "$DB_PATH" "$DEST"
fi

echo "Backup geschrieben nach: $DEST"

# Nur die letzten 14 Backups behalten, damit das Verzeichnis nicht unbegrenzt waechst.
ls -1t "$BACKUP_DIR"/realones-*.sqlite 2>/dev/null | tail -n +15 | xargs -r rm --
