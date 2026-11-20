#!/bin/bash
set -e

# Find PostgreSQL binaries
PG_BIN_DIR=$(find /usr -name "pg_ctl" -type f 2>/dev/null | head -1 | xargs dirname)

echo "Found PostgreSQL binaries in: $PG_BIN_DIR"

# Credentials come from the runtime environment; refuse to start without them
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}"
: "${DB_USER:?DB_USER must be set}"
: "${DB_PASSWORD:?DB_PASSWORD must be set}"

# Initialize the cluster on first start with scram-sha-256 authentication
if [ ! -s "$PGDATA/PG_VERSION" ]; then
  PWFILE=$(mktemp)
  printf '%s' "$POSTGRES_PASSWORD" > "$PWFILE"
  $PG_BIN_DIR/initdb -D "$PGDATA" --auth-local=scram-sha-256 --auth-host=scram-sha-256 \
    --username="$POSTGRES_USER" --pwfile="$PWFILE"
  rm -f "$PWFILE"
  cp /usr/local/share/pgconf/postgresql.conf /usr/local/share/pgconf/pg_hba.conf "$PGDATA/"
fi

# Start PostgreSQL
$PG_BIN_DIR/pg_ctl -D "$PGDATA" -l "$PGDATA/pg.log" start

# Wait for ready
until $PG_BIN_DIR/pg_isready -h 127.0.0.1; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

# Create the unprivileged application role and database it owns (least privilege)
PGPASSWORD=$POSTGRES_PASSWORD $PG_BIN_DIR/psql -h 127.0.0.1 -U "$POSTGRES_USER" -d postgres \
  -v ON_ERROR_STOP=1 -v app_user="$DB_USER" -v app_pass="$DB_PASSWORD" -v app_db="$POSTGRES_DB" <<-'EOSQL'
    SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L', :'app_user', :'app_pass')
    WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'app_user')\gexec
    SELECT format('CREATE DATABASE %I OWNER %I', :'app_db', :'app_user')
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'app_db')\gexec
    SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', :'app_db')\gexec
EOSQL

echo "Database ready"

# Start in foreground
$PG_BIN_DIR/pg_ctl -D "$PGDATA" stop
exec $PG_BIN_DIR/postgres -D "$PGDATA"