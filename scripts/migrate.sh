#!/usr/bin/env bash
# Apply all versioned SQL migrations in order.
# Usage:
#   export DATABASE_URL=postgresql://postgres:postgres@localhost:54322/masjid_amanah
#   ./scripts/migrate.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIG_DIR="$ROOT/supabase/migrations"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required (PostgreSQL client)" >&2
  exit 1
fi

echo "Applying migrations from $MIG_DIR"
for f in $(ls "$MIG_DIR"/*.sql | sort); do
  echo "→ $(basename "$f")"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done

echo "Migrations complete."
