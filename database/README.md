# Database Service

Custom PostgreSQL 16 database built on UBI8.10 for the Task Manager demo application. Provides persistent storage for users and tasks with intentional security misconfigurations for DevSecOps pipeline testing.

## Purpose

This service demonstrates enterprise database patterns while intentionally including security vulnerabilities and misconfigurations for security scanning demonstrations.

## Features

- **PostgreSQL 16** - Latest stable PostgreSQL release
- **UBI8.10 Base** - Enterprise-grade Red Hat Universal Base Image
- **Automatic Initialization** - Creates database and tables on startup
- **Password Authentication** - MD5 password authentication configured

## Intentional Security Issues

This database contains the following vulnerabilities for security scanning demonstration:

1. **Overly Permissive Network Access** - Accepts connections from any IP (0.0.0.0/0)
2. **Weak Password Encryption** - Uses MD5 instead of stronger algorithms
3. **Excessive Logging** - Logs all statements including sensitive data
4. **SSL Disabled** - No encrypted connections
5. **Trust Authentication** - Local postgres user can connect without password
6. **Running as Root** - Container runs with root privileges initially
7. **Overly Permissive File Permissions** - Data directory has 777 permissions
8. **Hardcoded Credentials** - Database password in environment variables
9. **No Connection Limits** - No rate limiting or connection restrictions
10. **Information Disclosure** - Verbose error messages and connection logging

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tasks Table
```sql
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  priority VARCHAR(10) DEFAULT 'medium',
  user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Configuration Files

### postgresql.conf
Key security misconfigurations:
- `listen_addresses = '*'` - Listens on all interfaces
- `ssl = off` - SSL disabled
- `password_encryption = md5` - Weak password encryption
- `log_statement = 'all'` - Logs all statements including sensitive data

### pg_hba.conf
Authentication misconfigurations:
- `host all all 0.0.0.0/0 md5` - Allows connections from any IP
- `host all all ::/0 md5` - Allows IPv6 connections from anywhere
- `local all postgres trust` - Local postgres user needs no password

## Environment Variables

- `POSTGRES_DB` - Database name (default: taskmanager)
- `POSTGRES_USER` - Database user (default: postgres)
- `POSTGRES_PASSWORD` - Database password (default: password123)

## Build and Run

### Docker Build
```bash
docker build -t task-manager-db .
```

### Docker Run
```bash
docker run -d \
  --name task-manager-db \
  -p 5432:5432 \
  -e POSTGRES_DB=taskmanager \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password123 \
  task-manager-db
```

### With Docker Compose
```bash
# From project root
docker-compose up postgres
```

## Connection Details

- **Host:** localhost (or container name in Docker networks)
- **Port:** 5432
- **Database:** taskmanager
- **Username:** postgres
- **Password:** password123

## Health Check

The container includes a health check that verifies PostgreSQL is accepting connections:

```bash
# Manual health check
docker exec <container_name> pg_isready -U postgres
```

## Initialization Process

1. **Base Setup** - UBI8.10 with PostgreSQL 16 installed
2. **Database Init** - Creates initial database cluster
3. **User Setup** - Configures postgres user with password
4. **Database Creation** - Creates taskmanager database
5. **Schema Setup** - Applications create tables on first connection

## Security Testing

### Configuration Analysis
```bash
# Check for security misconfigurations
docker exec <container_name> cat /var/lib/pgsql/data/postgresql.conf | grep -E "(listen_addresses|ssl|password_encryption|log_statement)"
docker exec <container_name> cat /var/lib/pgsql/data/pg_hba.conf
```

### Log Analysis
```bash
# Check for excessive logging
docker exec <container_name> tail -f /var/lib/pgsql/data/log/postgresql-*.log
```

## Common Issues

1. **Connection Refused** - Ensure container is running and port 5432 is exposed
2. **Authentication Failed** - Check password and pg_hba.conf configuration
3. **Permission Denied** - Database may still be initializing, wait 30 seconds
4. **Port Conflicts** - Another PostgreSQL instance may be using port 5432

## Development Tips

- **Connect via psql:** `psql -h localhost -U postgres -d taskmanager`
- **View logs:** `docker logs <container_name>`
- **Access container:** `docker exec -it <container_name> bash`
- **Reset data:** Stop container, remove volume, restart

## File Structure

```
database/
├── Dockerfile              # Container definition
├── init-db.sh             # Database initialization script
├── postgresql.conf        # PostgreSQL configuration (insecure)
├── pg_hba.conf            # Authentication configuration (permissive)
└── README.md              # This file
```

## Production Considerations

This database is configured for **demonstration purposes only**. For production use:

- Enable SSL/TLS encryption
- Use stronger password encryption (scram-sha-256)
- Restrict network access to specific IPs
- Disable excessive logging
- Run as non-root user
- Use proper file permissions
- Implement connection pooling and limits
- Regular security updates and patches

## Integration with Application Services

The database automatically accepts connections from:
- **Auth Service** - User registration and authentication
- **Task Service** - CRUD operations for tasks
- **CI/CD Pipelines** - Database migrations and testing

Connection strings used by services:
```
postgresql://postgres:password123@database:5432/taskmanager
```