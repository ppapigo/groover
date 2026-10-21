#!/bin/sh
set -eu
# Runs only on a NEW empty PostgreSQL volume. Existing databases require reviewed
# manual role provisioning; this script never rewrites existing users or tables.
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set ON_ERROR_STOP=1 <<'SQL'
\getenv app_password GROOVER_APP_PASSWORD
CREATE ROLE groover LOGIN PASSWORD :'app_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
GRANT CONNECT ON DATABASE groover TO groover;
GRANT USAGE, CREATE ON SCHEMA public TO groover;
SQL
