# Task Manager Database Dockerfile
FROM registry.access.redhat.com/ubi8/ubi:latest

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

# Non-secret defaults only; POSTGRES_PASSWORD, DB_USER and DB_PASSWORD are
# supplied at runtime and init-db.sh fails if they are absent (IA-5)
ENV PGDATA=/var/lib/pgsql/data \
    POSTGRES_DB=taskmanager \
    POSTGRES_USER=postgres

# Stage configuration; init-db.sh installs it after initdb
COPY postgresql.conf pg_hba.conf /usr/local/share/pgconf/
COPY init-db.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/init-db.sh \
    && chown -R postgres:postgres /usr/local/share/pgconf \
    && chmod 700 /var/lib/pgsql/data

# Run the database as the unprivileged postgres user (AC-6)
USER postgres

# Expose PostgreSQL port (kept)
EXPOSE 5432

# Start PostgreSQL (kept)
CMD ["/usr/local/bin/init-db.sh"]
