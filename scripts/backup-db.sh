#!/usr/bin/env sh
set -eu
umask 077

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
OUTPUT_DIR=${1:-"$PROJECT_ROOT/backups"}
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

case "$RETENTION_DAYS" in
  ''|*[!0-9]*) echo "Invalid BACKUP_RETENTION_DAYS." >&2; exit 1 ;;
esac
[ "$RETENTION_DAYS" -ge 1 ] && [ "$RETENTION_DAYS" -le 3650 ] || {
  echo "BACKUP_RETENTION_DAYS must be between 1 and 3650." >&2
  exit 1
}

mkdir -p "$OUTPUT_DIR"
command -v gzip >/dev/null 2>&1 || {
  echo "gzip is required on the host to create database backups." >&2
  exit 1
}
CONTAINER_ID=${MYSQL_CONTAINER:-}
if [ -z "$CONTAINER_ID" ]; then
  CONTAINER_ID=$(docker compose --project-directory "$PROJECT_ROOT" ps -q mysql | head -n 1)
fi
[ -n "$CONTAINER_ID" ] || { echo "The MySQL container is not running." >&2; exit 1; }

TIMESTAMP=$(date -u +%Y%m%d-%H%M%S)-$$
FILE_NAME="wallettutrack-$TIMESTAMP.sql.gz"
DESTINATION="$OUTPUT_DIR/$FILE_NAME"
CONTAINER_SQL="/tmp/wallettutrack-backup-$$.sql"
HOST_SQL="$OUTPUT_DIR/.wallettutrack-backup-$$.sql"
PARTIAL_ARCHIVE="$DESTINATION.partial-$$"

cleanup() {
  docker exec "$CONTAINER_ID" rm -f -- "$CONTAINER_SQL" >/dev/null 2>&1 || true
  rm -f -- "$HOST_SQL" "$PARTIAL_ARCHIVE"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

docker exec "$CONTAINER_ID" sh -lc \
  'set -eu
   umask 077
   MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump --user=root --single-transaction --quick --routines --events --hex-blob --no-tablespaces "$MYSQL_DATABASE" > "$1"' sh "$CONTAINER_SQL"
docker cp "$CONTAINER_ID:$CONTAINER_SQL" "$HOST_SQL"
gzip -9 -c "$HOST_SQL" > "$PARTIAL_ARCHIVE"
gzip -t "$PARTIAL_ARCHIVE"
mv "$PARTIAL_ARCHIVE" "$DESTINATION"

if command -v sha256sum >/dev/null 2>&1; then
  (cd "$OUTPUT_DIR" && sha256sum "$FILE_NAME" > "$FILE_NAME.sha256")
else
  (cd "$OUTPUT_DIR" && shasum -a 256 "$FILE_NAME" > "$FILE_NAME.sha256")
fi

find "$OUTPUT_DIR" -maxdepth 1 -type f -name 'wallettutrack-*.sql.gz' -mtime "+$RETENTION_DAYS" -print |
  while IFS= read -r expired_backup; do
    rm -f -- "$expired_backup" "$expired_backup.sha256"
  done
echo "Backup created: $DESTINATION"
