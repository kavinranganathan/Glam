#!/usr/bin/env bash
# Regenerates src/lib/supabase/types.ts from the migrations using a throwaway local Postgres
# and the Supabase CLI (`supabase gen types`). Requires postgresql@16 binaries on PATH.
set -euo pipefail
export LC_ALL=C LANG=C

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGDATA="$ROOT/.pgdata-types"
PORT="${GLAM_PG_PORT:-54331}"
DB="glam_types"

cleanup() {
  if [ -f "$PGDATA/postmaster.pid" ]; then
    pg_ctl -D "$PGDATA" stop -m fast -s >/dev/null 2>&1 || true
  fi
  rm -rf "$PGDATA"
}
trap cleanup EXIT

rm -rf "$PGDATA"
initdb -D "$PGDATA" -A trust -U postgres --no-locale -E UTF8 >/dev/null
pg_ctl -D "$PGDATA" -o "-p $PORT -k /tmp -c listen_addresses=127.0.0.1" -l "$PGDATA/server.log" start -s -w
export PGHOST=127.0.0.1 PGPORT="$PORT" PGUSER=postgres

psql -q -d postgres -c "create database $DB;"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$ROOT/scripts/sql/auth-stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"
done

npx --yes supabase@latest gen types typescript --db-url "postgresql://postgres@127.0.0.1:$PORT/$DB?sslmode=disable" --schema public > "$ROOT/src/lib/supabase/types.generated.ts"
echo "wrote src/lib/supabase/types.generated.ts"
