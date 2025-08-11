# Task Manager Database Dockerfile
FROM registry.access.redhat.com/ubi8/ubi:latest

# Intentional security flaw: running as root
USER root

# Install PostgreSQL 16 from the official PGDG repo (official steps)
RUN dnf -y install curl ca-certificates \
    && dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-8-x86_64/pgdg-redhat-repo-latest.noarch.rpm \
    && dnf install -y postgresql16-server postgresql16-contrib \
    && dnf clean all \
    && rm -rf /var/cache/dnf

# Ensure PG binaries are on PATH
ENV PATH="/usr/pgsql-16/bin:${PATH}"

# Create postgres user and directories (stay close to original; guard if user exists)
RUN id -u postgres >/dev/null 2>&1 || useradd -r -s /bin/bash postgres && \
    mkdir -p /var/lib/pgsql/data && \
    chown -R postgres:postgres /var/lib/pgsql

# Set environment variables (kept from original)
ENV PGDATA=/var/lib/pgsql/data \
    POSTGRES_DB=taskmanager \
    POSTGRES_USER=postgres \
    POSTGRES_PASSWORD=password123

# Copy initialization script (kept)
COPY init-db.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/init-db.sh

# Intentional security flaw: overly permissive file permissions (kept)
RUN chmod 777 /var/lib/pgsql/data

# Switch to postgres user for database operations (kept)
USER postgres

# Initialize the database
RUN PG_BIN_DIR=$(find /usr -name "initdb" -type f 2>/dev/null | head -1 | xargs dirname) && \
    echo "$POSTGRES_PASSWORD" > /tmp/pgpass && \
    $PG_BIN_DIR/initdb -D /var/lib/pgsql/data --auth-local=md5 --auth-host=md5 --username=$POSTGRES_USER --pwfile=/tmp/pgpass && \
    rm /tmp/pgpass

# Copy PostgreSQL configuration with intentional security flaws (kept)
USER root
COPY postgresql.conf /var/lib/pgsql/data/
COPY pg_hba.conf /var/lib/pgsql/data/
RUN chown postgres:postgres /var/lib/pgsql/data/*.conf

# Switch back to postgres user (kept)
USER postgres

# Expose PostgreSQL port (kept)
EXPOSE 5432

# Start PostgreSQL (kept)
CMD ["/usr/local/bin/init-db.sh"]
