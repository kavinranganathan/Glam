#!/usr/bin/env bash
# Applies migrations and seed to the Postgres in DATABASE_URL (your Supabase project).
# Usage: DATABASE_URL=postgresql://... npm run db:push            (migrations + seed)
#        DATABASE_URL=postgresql://... npm run db:push -- --no-seed
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [ -f "$ROOT/.env.local" ]; then
  # shellcheck disable=SC1091
  set -a; source "$ROOT/.env.local"; set +a
fi
: "${DATABASE_URL:?Set DATABASE_URL (Supabase → Settings → Database → Connection string, URI)}"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "applying $(basename "$f")"
  psql -q -v ON_ERROR_STOP=1 "$DATABASE_URL" -f "$f"
done
if [ "${1:-}" != "--no-seed" ]; then
  echo "applying seed.sql"
  psql -q -v ON_ERROR_STOP=1 "$DATABASE_URL" -f "$ROOT/supabase/seed.sql"
fi
echo "done"
