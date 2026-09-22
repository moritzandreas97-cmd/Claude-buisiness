# Deployment-Runbook (Phase 3.6)

Dieses Dokument ist für dich zum manuellen Ausführen gedacht (Claude hat
keinen Zugriff auf deine echte Infrastruktur). Danach übernimmt ein GitHub-
Actions-Workflow alle **weiteren** Deploys automatisch bei jedem Push auf
`main`.

Zielarchitektur: `Internet → HTTPS/Domain → Caddy (Reverse Proxy + TLS)
→ Node-Prozess (systemd, Port 3000) → SQLite-Datei`.

## 0. Server besorgen (falls noch keiner existiert)

Empfehlung für dieses sehr kleine MVP: **Hetzner Cloud, CPX11** (2 vCPU,
2 GB RAM, ~4–5 €/Monat, EU-Rechenzentrum) oder vergleichbar bei
DigitalOcean/anderem Anbieter deiner Wahl — die folgenden Schritte
funktionieren auf jedem Ubuntu-22.04/24.04-Server identisch. Bei der
Erstellung: SSH-Key hinterlegen (nicht Passwort-Login), Ubuntu 24.04 LTS
wählen. Merk dir die öffentliche IP-Adresse — die brauchst du für DNS und
GitHub Secrets.

## 1. Einmaliges Server-Bootstrap (als root/sudo auf dem neuen Server)

```bash
# System aktualisieren + Node.js (aktuelle LTS) installieren
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs git

# Caddy installieren (automatisches HTTPS via Let's Encrypt)
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy

# Eigener, unprivilegierter User für die App (kein Root-Prozess)
useradd --system --create-home --shell /usr/sbin/nologin real-ones

# Eigener User fuer GitHub-Actions-Deploys (SSH-Login), mit begrenztem sudo
# nur fuer den einen Restart-Befehl - kein volles sudo.
useradd --create-home --shell /bin/bash deploy
mkdir -p /home/deploy/.ssh
echo "<PUBLIC-KEY-DES-NEUEN-DEPLOY-KEYS, siehe Schritt 2>" >> /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
echo "deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart real-ones" \
  > /etc/sudoers.d/real-ones-deploy

# Projektverzeichnis
mkdir -p /opt/real-ones
chown deploy:deploy /opt/real-ones
```

Als `deploy`-User weiter:

```bash
su - deploy
cd /opt/real-ones
git clone https://github.com/moritzandreas97-cmd/Claude-buisiness.git .
git checkout main   # sobald der Branch gemergt ist

npm install
npm run build -w web
npm run build -w server

# Persistente Daten AUSSERHALB des Git-Arbeitsverzeichnisses, per Symlink
# verbunden - so ist die DB selbst gegen ein zukuenftig destruktiveres
# Deploy-Skript sicher (Abschnitt 6 der Vorgaben).
sudo mkdir -p /var/lib/real-ones/data
sudo chown real-ones:real-ones /var/lib/real-ones/data
rm -rf /opt/real-ones/server/data
ln -s /var/lib/real-ones/data /opt/real-ones/server/data
sudo chown -h real-ones:real-ones /opt/real-ones/server/data
```

## 2. Deploy-SSH-Key erzeugen (auf deinem eigenen Rechner, NICHT auf dem Server)

```bash
ssh-keygen -t ed25519 -f ./real-ones-deploy-key -N ""
```

- Öffentlichen Schlüssel (`real-ones-deploy-key.pub`) in Schritt 1 oben bei
  `authorized_keys` des `deploy`-Users einfügen.
- Privaten Schlüssel (`real-ones-deploy-key`) als GitHub-Actions-Secret
  hinterlegen (Repo → Settings → Secrets and variables → Actions):
  - `DEPLOY_SSH_KEY` = Inhalt der privaten Schlüsseldatei
  - `DEPLOY_HOST` = Server-IP oder Domain
  - `DEPLOY_USER` = `deploy`
- Danach die private Schlüsseldatei lokal löschen/sicher verwahren.

## 3. systemd-Unit + Caddy einrichten

```bash
sudo cp /opt/real-ones/deploy/real-ones.service /etc/systemd/system/real-ones.service
sudo nano /etc/systemd/system/real-ones.service   # DOMAIN_PLACEHOLDER ersetzen
sudo systemctl daemon-reload
sudo systemctl enable --now real-ones
sudo systemctl status real-ones   # sollte "active (running)" zeigen

sudo cp /opt/real-ones/deploy/Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile   # DOMAIN_PLACEHOLDER ersetzen
sudo systemctl reload caddy
```

## 4. DNS

Sobald du die Server-IP hast: bei deinem DNS-Anbieter für die gewünschte
(Sub-)Domain einen **A-Record** anlegen, der auf diese IP zeigt (bei IPv6
zusätzlich ein **AAAA-Record**). Caddy stellt das TLS-Zertifikat danach
automatisch aus, sobald DNS propagiert ist - kein manueller certbot-Schritt
nötig.

## 5. Ab jetzt: automatischer Deploy

Jeder Push auf `main` (oder manuelles Auslösen über den „Run workflow"-Button
im Actions-Tab) führt auf dem Server aus: `git pull` → `npm install` →
beide Builds → `systemctl restart real-ones`. Die SQLite-Datei liegt unter
`/var/lib/real-ones/data/` außerhalb des Git-Verzeichnisses und bleibt davon
unberührt.

## 6. Nach dem ersten echten Deploy

Führe den Produktions-E2E-Test aus Abschnitt 12 durch, danach die
Bereinigung aus `README.md` → „Testdaten nach dem Produktions-E2E-Test
entfernen" (bei einem ganz frischen Server am einfachsten: DB-Datei einmal
löschen und den Dienst neu starten, bevor echte Beta-Nutzer kommen).
