#!/usr/bin/env bash
# Prueba las migraciones en un Postgres local (sin Supabase).
# Uso: PGHOST=... PGPORT=... PGUSER=postgres scripts/test-db.sh
set -euo pipefail
DB=${TEST_DB:-votion_test}
cd "$(dirname "$0")/.."
psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/00_auth_stub.sql 2>&1 | grep -v -E "wal_level|HINT" || true
for f in supabase/migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f" >/dev/null 2>&1 || { echo "falló $f"; psql -v ON_ERROR_STOP=1 -d "$DB" -f "$f" | tail -5; exit 1; }; done
psql -q -d "$DB" -c "grant usage on schema public, auth to authenticated, anon; grant all on all tables in schema public to authenticated; grant execute on all functions in schema public, auth to authenticated;"
out=$(psql -d "$DB" -f supabase/tests/10_scenario.sql 2>&1)
echo "$out" | grep -E "^ ok |FALLA|ERROR" | sed 's/^ //'
echo "$out" | grep -q "TODO OK" && { echo "✓ base de datos OK ($(echo "$out" | grep -c '^ ok ') comprobaciones)"; } || { echo "✗ falló"; exit 1; }
