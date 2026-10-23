#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi
for f in 01_tenant_isolation 02_auth_escalation 03_accounting_engine 04_public_reporting 05_attachment_access; do
  echo "Running $f…"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/${f}.sql"
done
echo "All database policy tests passed."
