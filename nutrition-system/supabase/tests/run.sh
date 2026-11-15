#!/usr/bin/env bash
# Pruebas de seguridad de la base (RLS + funciones) contra un Postgres local descartable.
# Uso: PGHOST=/tmp PGPORT=54329 PGUSER=postgres bash supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB="cjp_test_$$"
createdb "$DB"
trap 'dropdb --if-exists "$DB" >/dev/null 2>&1' EXIT
P="psql -X -q -v ON_ERROR_STOP=1 -d $DB"
$P -f tests/shim.sql >/dev/null
for f in migrations/*.sql; do $P -f "$f" >/dev/null; done
$P -f tests/rls.test.sql
echo "OK · pruebas de seguridad de la base"
