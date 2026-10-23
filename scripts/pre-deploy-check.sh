#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Pre-deploy checks (web) =="
npm run typecheck
npm run lint
npm test
npm run build

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "== Migrations (target DATABASE_URL) =="
  ./scripts/migrate.sh
  ./scripts/test-rls.sh
else
  echo "DATABASE_URL not set — skipped DB checks"
fi

echo "Pre-deploy checks finished. Review docs/RELEASE_CANDIDATE.md before production traffic."
