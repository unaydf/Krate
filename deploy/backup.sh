#!/usr/bin/env bash
# Copia diaria de la base de datos y de las imagenes subidas.
# Lo instala deploy/install-server.sh en /etc/cron.d/krate-backup (03:30 cada dia).
# Tambien se puede ejecutar a mano:  ./deploy/backup.sh
set -euo pipefail

APP_DIR=${APP_DIR:-/opt/krate}
BACKUP_DIR=${BACKUP_DIR:-$APP_DIR/backups}
RETENTION_DAYS=${RETENTION_DAYS:-14}
COMPOSE=(docker compose -f "$APP_DIR/docker-compose.yml" -f "$APP_DIR/docker-compose.prod.yml")

cd "$APP_DIR"
set -a; . "$APP_DIR/.env"; set +a
mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y-%m-%d_%H-%M-%S)

echo "[$(date -Is)] copia ${STAMP}"

# Base de datos: volcado SQL comprimido
"${COMPOSE[@]}" exec -T postgres \
	pg_dump -U "${POSTGRES_USER:-krate}" -d "${POSTGRES_DB:-krate}" \
	| gzip > "$BACKUP_DIR/db_${STAMP}.sql.gz"

# Imagenes subidas: el contenedor del backend monta el volumen en /data/uploads
"${COMPOSE[@]}" exec -T backend \
	tar -cz -C /data uploads \
	> "$BACKUP_DIR/uploads_${STAMP}.tar.gz"

# Rotacion
find "$BACKUP_DIR" -maxdepth 1 -name 'db_*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete
find "$BACKUP_DIR" -maxdepth 1 -name 'uploads_*.tar.gz' -mtime "+${RETENTION_DAYS}" -delete

echo "[$(date -Is)] ok: $(du -sh "$BACKUP_DIR" | cut -f1) en ${BACKUP_DIR}"
