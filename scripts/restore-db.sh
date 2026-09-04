#!/usr/bin/env sh
set -eu

if [ "$#" -lt 1 ]; then
  echo "Usage: CONFIRM=RESTORE sh scripts/restore-db.sh backup.sql.gz" >&2
  exit 1
fi
if [ "${CONFIRM:-}" != "RESTORE" ]; then
  echo "Set CONFIRM=RESTORE to confirm the destructive restore operation." >&2
  exit 1
fi

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
BACKUP_FILE=$1
[ -f "$BACKUP_FILE" ] || { echo "Backup not found: $BACKUP_FILE" >&2; exit 1; }
case "$BACKUP_FILE" in
  *.sql.gz) ;;
  *) echo "The backup file must have the .sql.gz extension." >&2; exit 1 ;;
esac

CHECKSUM_FILE="$BACKUP_FILE.sha256"
[ -f "$CHECKSUM_FILE" ] || { echo "Required checksum file not found: $CHECKSUM_FILE" >&2; exit 1; }
EXPECTED=$(awk 'NR == 1 { print $1 }' "$CHECKSUM_FILE" | tr '[:upper:]' '[:lower:]')
case "$EXPECTED" in
  *[!0-9a-fA-F]*|'') echo "The backup checksum file is malformed." >&2; exit 1 ;;
esac
[ "${#EXPECTED}" -eq 64 ] || { echo "The backup checksum file is malformed." >&2; exit 1; }
if command -v sha256sum >/dev/null 2>&1; then
  ACTUAL=$(sha256sum "$BACKUP_FILE" | awk '{ print $1 }')
else
  ACTUAL=$(shasum -a 256 "$BACKUP_FILE" | awk '{ print $1 }')
fi
[ "$EXPECTED" = "$ACTUAL" ] || { echo "Invalid SHA-256 checksum." >&2; exit 1; }
command -v gzip >/dev/null 2>&1 || {
  echo "gzip is required on the host to restore database backups." >&2
  exit 1
}
gzip -t "$BACKUP_FILE"

CONTAINER_ID=${MYSQL_CONTAINER:-}
if [ -z "$CONTAINER_ID" ]; then
  CONTAINER_ID=$(docker compose --project-directory "$PROJECT_ROOT" ps -q mysql | head -n 1)
fi
[ -n "$CONTAINER_ID" ] || { echo "The MySQL container is not running." >&2; exit 1; }
DATABASE_NAME=$(docker exec "$CONTAINER_ID" printenv MYSQL_DATABASE)
case "$DATABASE_NAME" in
  ''|*[!A-Za-z0-9_]*) echo "The configured MySQL database name is missing or unsafe." >&2; exit 1 ;;
esac
CONTAINER_TEMPORARY="/tmp/wallettutrack-restore-$$.sql"
HOST_TEMPORARY=$(mktemp "${TMPDIR:-/tmp}/wallettutrack-restore.XXXXXX")
RESTORE_STARTED=false
RESTORE_COMPLETED=false

cleanup() {
  docker exec "$CONTAINER_ID" rm -f -- "$CONTAINER_TEMPORARY" >/dev/null 2>&1 || true
  rm -f -- "$HOST_TEMPORARY"
  if [ "$RESTORE_STARTED" = true ] && [ "$RESTORE_COMPLETED" != true ]; then
    echo "Restore did not complete; the application remains stopped to avoid serving a partial database." >&2
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

gzip -dc "$BACKUP_FILE" > "$HOST_TEMPORARY"
[ -s "$HOST_TEMPORARY" ] || { echo "The decompressed backup is empty." >&2; exit 1; }
docker cp "$HOST_TEMPORARY" "$CONTAINER_ID:$CONTAINER_TEMPORARY"

docker compose --project-directory "$PROJECT_ROOT" stop --timeout 30 app
RESTORE_STARTED=true

if [ "${SKIP_SAFETY_BACKUP:-false}" != "true" ]; then
  MYSQL_CONTAINER="$CONTAINER_ID" sh "$SCRIPT_DIR/backup-db.sh" \
    "${SAFETY_BACKUP_DIR:-$PROJECT_ROOT/backups}"
fi

docker exec "$CONTAINER_ID" sh -lc \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --user=root --execute "DROP DATABASE IF EXISTS \`$1\`; CREATE DATABASE \`$1\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"' \
  sh "$DATABASE_NAME"
docker exec "$CONTAINER_ID" sh -lc \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --user=root "$2" < "$1"' \
  sh "$CONTAINER_TEMPORARY" "$DATABASE_NAME"

docker compose --project-directory "$PROJECT_ROOT" run --rm --no-deps migrate
docker compose --project-directory "$PROJECT_ROOT" up -d --no-deps --force-recreate app

APP_CONTAINER_ID=$(docker compose --project-directory "$PROJECT_ROOT" ps -q app | head -n 1)
HEALTH=""
ATTEMPT=1
while [ "$ATTEMPT" -le 60 ]; do
  if [ -n "$APP_CONTAINER_ID" ]; then
    HEALTH=$(docker inspect --format '{{.State.Health.Status}}' "$APP_CONTAINER_ID" 2>/dev/null || true)
  fi
  [ "$HEALTH" = "healthy" ] && break
  sleep 2
  ATTEMPT=$((ATTEMPT + 1))
done
if [ "$HEALTH" != "healthy" ]; then
  docker compose --project-directory "$PROJECT_ROOT" logs --tail 100 app || true
  docker compose --project-directory "$PROJECT_ROOT" stop --timeout 30 app || true
  echo "The restored application did not become healthy and was stopped." >&2
  exit 1
fi
RESTORE_COMPLETED=true

echo "Database restored, migrations applied, and application restarted."
