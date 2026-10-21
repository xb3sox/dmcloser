#!/usr/bin/env bash
# Dump the workspace database to a timestamped archive under backups/.
# Usage: scripts/backup.sh [output-dir]
set -euo pipefail

cd "$(dirname "$0")/.."
out_dir="${1:-backups}"
mkdir -p "$out_dir"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive="$out_dir/dmcloser-$stamp.sql.gz"

# --clean --if-exists makes the archive restorable over a live database.
docker compose exec -T database \
  pg_dump -U dmcloser -d dmcloser --clean --if-exists --no-owner --no-privileges \
  | gzip -9 >"$archive"
sha256sum "$archive" >"$archive.sha256"
echo "Wrote $archive"
