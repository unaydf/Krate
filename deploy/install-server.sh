#!/usr/bin/env bash
# Prepara desde cero el VPS de produccion de Krate. Se ejecuta como root y es
# idempotente: repetirlo no rompe nada ni pisa los secretos ya generados.
#
#   VOTING_HOST=... PANEL_HOST=... GHCR_OWNER=... bash install-server.sh
#
# Variables opcionales: REPO_URL, APP_DIR, DEPLOY_USER, APP_JWT_SECRET,
# POSTGRES_PASSWORD, IMAGE_TAG.
set -euo pipefail

VOTING_HOST=${VOTING_HOST:?Define VOTING_HOST, p. ej. krate-vote.duckdns.org}
PANEL_HOST=${PANEL_HOST:?Define PANEL_HOST, p. ej. krate-manage.duckdns.org}
GHCR_OWNER=${GHCR_OWNER:?Define GHCR_OWNER, el propietario del repositorio en GitHub}
REPO_URL=${REPO_URL:-https://github.com/${GHCR_OWNER}/Krate.git}
APP_DIR=${APP_DIR:-/opt/krate}
DEPLOY_USER=${DEPLOY_USER:-krate}
IMAGE_TAG=${IMAGE_TAG:-latest}

if [[ $EUID -ne 0 ]]; then
	echo "Ejecuta este script como root" >&2
	exit 1
fi

echo "==> 1/8 Actualizando el sistema"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq ca-certificates curl git ufw fail2ban

echo "==> 2/8 Instalando Docker desde el repositorio oficial"
if ! command -v docker >/dev/null 2>&1; then
	install -m 0755 -d /etc/apt/keyrings
	curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
	chmod a+r /etc/apt/keyrings/docker.asc
	echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
		> /etc/apt/sources.list.d/docker.list
	apt-get update -qq
	apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker

echo "==> 3/8 Usuario de despliegue: ${DEPLOY_USER}"
if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
	useradd --create-home --shell /bin/bash "$DEPLOY_USER"
fi
usermod -aG docker "$DEPLOY_USER"

echo "==> 4/8 Cortafuegos y fail2ban"
ufw allow 22/tcp    >/dev/null
ufw allow 80/tcp    >/dev/null
ufw allow 443/tcp   >/dev/null
ufw allow 443/udp   >/dev/null
ufw --force default deny incoming >/dev/null
ufw --force default allow outgoing >/dev/null
ufw --force enable  >/dev/null
systemctl enable --now fail2ban
cat > /etc/fail2ban/jail.d/sshd.local <<'JAIL'
[sshd]
enabled = true
maxretry = 5
bantime = 1h
JAIL
systemctl restart fail2ban

echo "==> 5/8 Swap de 2 GB"
if [[ ! -f /swapfile ]]; then
	fallocate -l 2G /swapfile
	chmod 600 /swapfile
	mkswap /swapfile >/dev/null
	swapon /swapfile
	grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> 6/8 Repositorio en ${APP_DIR}"
if [[ -d "$APP_DIR/.git" ]]; then
	sudo -u "$DEPLOY_USER" git -C "$APP_DIR" pull --ff-only
else
	git clone "$REPO_URL" "$APP_DIR"
fi
chown -R "$DEPLOY_USER":"$DEPLOY_USER" "$APP_DIR"

echo "==> 7/8 Fichero .env"
if [[ -f "$APP_DIR/.env" ]]; then
	echo "    Ya existe, no se toca (los secretos se conservan)"
else
	APP_JWT_SECRET=${APP_JWT_SECRET:-$(openssl rand -base64 48 | tr -d '\n')}
	POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-$(openssl rand -base64 24 | tr -d '\n/+=')}
	cat > "$APP_DIR/.env" <<ENVEOF
# Generado por deploy/install-server.sh. No subir a git.
POSTGRES_DB=krate
POSTGRES_USER=krate
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

APP_JWT_SECRET=${APP_JWT_SECRET}
APP_JWT_TTL_HOURS=24
APP_SEED_ENABLED=false

VOTING_HOST=${VOTING_HOST}
PANEL_HOST=${PANEL_HOST}
GHCR_OWNER=${GHCR_OWNER}
IMAGE_TAG=${IMAGE_TAG}
ENVEOF
	chown "$DEPLOY_USER":"$DEPLOY_USER" "$APP_DIR/.env"
	chmod 600 "$APP_DIR/.env"
	echo "    Creado con secretos aleatorios"
fi

echo "==> 8/8 Clave SSH para GitHub Actions y copia nocturna"
SSH_DIR="/home/${DEPLOY_USER}/.ssh"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$SSH_DIR"
if [[ ! -f "$SSH_DIR/id_ed25519" ]]; then
	sudo -u "$DEPLOY_USER" ssh-keygen -t ed25519 -N '' -C 'github-actions-deploy' -f "$SSH_DIR/id_ed25519" >/dev/null
	cat "$SSH_DIR/id_ed25519.pub" >> "$SSH_DIR/authorized_keys"
	chown "$DEPLOY_USER":"$DEPLOY_USER" "$SSH_DIR/authorized_keys"
	chmod 600 "$SSH_DIR/authorized_keys"
	NEW_KEY=1
fi
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR/backups"
cat > /etc/cron.d/krate-backup <<CRON
# Copia diaria de la base de datos y de las imagenes subidas
30 3 * * * ${DEPLOY_USER} ${APP_DIR}/deploy/backup.sh >> ${APP_DIR}/backups/backup.log 2>&1
CRON
chmod 644 /etc/cron.d/krate-backup

echo
echo "Listo. Siguientes pasos:"
echo "  1. Secretos del repositorio en GitHub:"
echo "       DEPLOY_HOST = $(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || echo '<IP del servidor>')"
echo "       DEPLOY_USER = ${DEPLOY_USER}"
if [[ ${NEW_KEY:-0} -eq 1 ]]; then
	echo "       DEPLOY_SSH_KEY = la clave privada que aparece debajo"
	echo
	cat "$SSH_DIR/id_ed25519"
	echo
else
	echo "       DEPLOY_SSH_KEY = la clave ya existente en ${SSH_DIR}/id_ed25519"
fi
echo "  2. Primer arranque:"
echo "       sudo -u ${DEPLOY_USER} -i"
echo "       cd ${APP_DIR} && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d"
