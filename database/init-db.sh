#!/bin/bash
set -e

# Find PostgreSQL binaries
PG_BIN_DIR=$(find /usr -name "pg_ctl" -type f 2>/dev/null | head -1 | xargs dirname)

echo "Found PostgreSQL binaries in: $PG_BIN_DIR"

# Start PostgreSQL
$PG_BIN_DIR/pg_ctl -D /var/lib/pgsql/data -l /var/lib/pgsql/data/pg.log start

# Wait for ready
until $PG_BIN_DIR/pg_isready -h 127.0.0.1; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

# Create the database (password already set by initdb)
PGPASSWORD=$POSTGRES_PASSWORD $PG_BIN_DIR/psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 <<-EOSQL
    SELECT 'CREATE DATABASE $POSTGRES_DB' 
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$POSTGRES_DB')\gexec
EOSQL

echo "Database ready"

# Start in foreground
$PG_BIN_DIR/pg_ctl -D /var/lib/pgsql/data stop
exec $PG_BIN_DIR/postgres -D /var/lib/pgsql/data