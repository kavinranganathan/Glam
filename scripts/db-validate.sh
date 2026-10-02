#!/usr/bin/env bash
# Validates migrations + seed against a throwaway local Postgres 16 cluster.
# Requires postgresql@16 binaries (initdb, pg_ctl, psql) on PATH. Does not touch Supabase.
set -euo pipefail
export LC_ALL=C LANG=C

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGDATA="$ROOT/.pgdata"
PORT="${GLAM_PG_PORT:-54329}"
DB="glam_validate"

cleanup() {
  if [ -f "$PGDATA/postmaster.pid" ]; then
    pg_ctl -D "$PGDATA" stop -m fast -s >/dev/null 2>&1 || true
  fi
  rm -rf "$PGDATA"
}
trap cleanup EXIT

rm -rf "$PGDATA"
initdb -D "$PGDATA" -A trust -U postgres --no-locale -E UTF8 >/dev/null
pg_ctl -D "$PGDATA" -o "-p $PORT -k /tmp -c listen_addresses=''" -l "$PGDATA/server.log" start -s -w
export PGHOST=/tmp PGPORT="$PORT" PGUSER=postgres

psql -q -d postgres -c "create database $DB;"
# Stub the Supabase auth schema so migrations referencing auth.users / auth.uid() apply locally.
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$ROOT/scripts/sql/auth-stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "applying $(basename "$f")"
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"
done
# Mirror Supabase default grants (RLS does the restricting).
psql -q -v ON_ERROR_STOP=1 -d "$DB" -c "grant usage on schema public to anon, authenticated, service_role; grant all on all tables in schema public to anon, authenticated, service_role; grant all on all sequences in schema public to anon, authenticated, service_role; grant execute on all functions in schema public to anon, authenticated, service_role;"
echo "applying seed.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$ROOT/supabase/seed.sql"
echo "running smoke tests"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$ROOT/scripts/sql/smoke.sql"
echo "db validation passed"
