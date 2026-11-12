#!/usr/bin/env bash
#
# Zet Zetlive op een verse server (Ubuntu 22.04/24.04 of Debian 12), als root:
#
#   bash install.sh jouwdomein.nl
#
# Het script installeert Node.js en Caddy, zet de app in /opt/zetlive, bewaart
# de gegevens in /var/lib/zetlive en zorgt dat alles vanzelf herstart.
# Nog een keer draaien werkt de app bij; accounts en websites blijven staan.

set -euo pipefail

DOMAIN="${1:-}"
BRANCH="${ZETLIVE_BRANCH:-claude/loving-noether-i9c2sx}"
REPO="mspodswebshop-ui/Taxi-RS"

if [[ ! "$DOMAIN" =~ ^([a-z0-9-]+\.)+[a-z]{2,}$ ]]; then
  echo "Gebruik: bash install.sh jouwdomein.nl" >&2
  exit 1
fi
if [[ $EUID -ne 0 ]]; then
  echo "Draai dit script als root (of met sudo)." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
echo "==> Benodigdheden installeren"
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg debian-keyring debian-archive-keyring apt-transport-https

if ! command -v node >/dev/null || [[ "$(node -v | cut -c2- | cut -d. -f1)" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi

if ! command -v caddy >/dev/null; then
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y -qq caddy
fi

echo "==> Zetlive downloaden"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
curl -fsSL "https://codeload.github.com/$REPO/tar.gz/refs/heads/$BRANCH" | tar -xz -C "$TMP"
SRC="$(find "$TMP" -maxdepth 2 -type d -name site-app | head -n 1)"
if [[ -z "$SRC" ]]; then
  echo "De map site-app is niet gevonden in de download." >&2
  exit 1
fi

id zetlive >/dev/null 2>&1 || useradd --system --home /var/lib/zetlive --shell /usr/sbin/nologin zetlive
mkdir -p /opt/zetlive /var/lib/zetlive
# Alleen de code vervangen; de gegevens staan apart in /var/lib/zetlive.
find /opt/zetlive -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -r "$SRC"/. /opt/zetlive/
(cd /opt/zetlive && npm ci --omit=dev --silent)
chown -R zetlive:zetlive /var/lib/zetlive

cat > /etc/zetlive.env <<ENV
PORT=4100
BASE_DOMAIN=$DOMAIN
DATA_DIR=/var/lib/zetlive
NODE_ENV=production
ENV

cat > /etc/systemd/system/zetlive.service <<'UNIT'
[Unit]
Description=Zetlive
After=network.target

[Service]
User=zetlive
WorkingDirectory=/opt/zetlive
EnvironmentFile=/etc/zetlive.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=2
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/lib/zetlive
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNIT

echo "==> HTTPS instellen"
cat > /etc/caddy/Caddyfile <<'CADDY'
{
	on_demand_tls {
		ask http://localhost:4100/__zetlive/domain-check
	}
}

https:// {
	tls {
		on_demand
	}
	encode gzip
	request_body {
		max_size 250MB
	}
	reverse_proxy localhost:4100
}
CADDY

systemctl daemon-reload
systemctl enable --quiet zetlive
systemctl restart zetlive
systemctl reload caddy 2>/dev/null || systemctl restart caddy

sleep 2
if curl -fs -o /dev/null http://localhost:4100/api/me; then
  echo
  echo "Klaar. Zetlive draait op https://$DOMAIN"
  echo "Sites van klanten komen op https://<naam>.$DOMAIN"
  echo "Gegevens (voor back-ups): /var/lib/zetlive"
else
  echo "De app is niet gestart. Bekijk de melding met: journalctl -u zetlive -n 50" >&2
  exit 1
fi
