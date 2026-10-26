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

# --- checksum verification (before stopping app) ---
# The .sha256 sidecar is written by backup.sh as:  "<hash>  <path-at-backup-time>"
# `sha256sum -c` resolves that recorded path against cwd, so it fails when the
# archive has been moved/copied (the normal DR path). Compare hashes directly.
if [ -f "$archive.sha256" ]; then
  if command -v sha256sum >/dev/null 2>&1; then
    hash_cmd="sha256sum"
  elif command -v shasum >/dev/null 2>&1; then
    hash_cmd="shasum -a 256"
  else
    echo "::error::no sha256sum or shasum found; cannot verify $archive" >&2
    exit 1
  fi
  expected=$(awk '{print $1}' "$archive.sha256")
  actual=$($hash_cmd "$archive" | awk '{print $1}')
  if [ "$expected" != "$actual" ]; then
    echo "checksum mismatch for $archive" >&2
    echo "  expected: $expected" >&2
    echo "  actual:   $actual" >&2
    exit 1
  fi
else
  echo "warning: no $archive.sha256; restoring without integrity check" >&2
fi

# Only restart the app if we actually stopped it and the restore succeeded.
# A failed restore (e.g. pg_dump --clean --if-exists leaves half-dropped tables)
# must NOT restart the app on an inconsistent DB.
restored=0
trap 'status=$?; if [ "$restored" = 1 ]; then docker compose start app; else echo "restore FAILED (exit $status) — app left stopped, database may be inconsistent" >&2; fi; exit $status' EXIT
docker compose stop app
gunzip -c "$archive" \
  | docker compose exec -T database \
    psql -U dmcloser -d dmcloser -v ON_ERROR_STOP=1
restored=1
echo "Restored $archive"
