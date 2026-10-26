#!/usr/bin/env bash
# Restore a database archive produced by scripts/backup.sh.
# Usage: scripts/restore.sh backups/dmcloser-20260101T000000Z.sql.gz
# Overwrites the current database. The app is stopped for the restore.
set -euo pipefail

cd "$(dirname "$0")/.."
archive="${1:-}"
if [ -z "$archive" ] || [ ! -f "$archive" ]; then
  echo "usage: scripts/restore.sh <archive.sql.gz>" >&2
  exit 1
fi

if [ -f "$archive.sha256" ]; then
  sha256sum -c "$archive.sha256"
fi

trap 'docker compose start app' EXIT
docker compose stop app
gunzip -c "$archive" \
  | docker compose exec -T database \
    psql -U dmcloser -d dmcloser -v ON_ERROR_STOP=1
echo "Restored $archive"
