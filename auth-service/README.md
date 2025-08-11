# Auth Service

Authentication microservice for the Task Manager demo application. Provides user registration, login, and JWT token verification.

## Purpose

This service demonstrates common authentication patterns while intentionally including security vulnerabilities for DevSecOps pipeline testing.

## API Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/verify` - Verify JWT token
- `GET /health` - Health check

## Intentional Security Issues

This service contains the following vulnerabilities for security scanning demonstration:

1. **Hardcoded Secrets** - JWT secret and database credentials in source code
2. **SQL Injection** - Login endpoint vulnerable to SQL injection attacks
3. **Overly Permissive CORS** - Allows requests from any origin with credentials
4. **No Input Validation** - Missing validation on registration fields
5. **Information Disclosure** - Exposes internal error messages to clients
6. **Outdated Dependencies** - Uses packages with known CVEs
7. **Insecure Container** - Dockerfile runs as root user

## Prerequisites

- Node.js 18+
- PostgreSQL 16+
- npm

## Local Development Setup

### 1. Install Node.js 18

```bash
sudo dnf install -y nodejs:18/common
```

### 2. Install PostgreSQL 18

Enable `postgresql:18` module.

```bash
sudo dnf module reset postgresql
sudo dnf module enable postgresql:18
```

Install and setup initial database.

```bash
sudo dnf install -y postgresql postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### 3. Configure Database Authentication

Edit PostgreSQL config for password authentication:

```bash
sudo vi /var/lib/pgsql/data/pg_hba.conf
```

Change these lines:
```
# FROM:
local   all             all                                     peer
host    all             all             127.0.0.1/32            ident
host    all             all             ::1/128                 ident

# TO:
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### 4. Create Database and Set User Password

```bash
sudo -u postgres createdb taskmanager
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password123';"
```

### 5. Install and Run the Auth Service API

```bash
npm install  # Will show vulnerabilities - DO NOT fix! This is intentional.
npm start
```

The service will start on port 3001 and automatically create the users table.

## Unit Tests

This project uses Jest, a popular JavaScript test framework.

### Running Tests

```bash
cd auth-service
npm test
```

Expected output:

```bash
> auth-service@1.0.0 test
> jest

 PASS  __tests__/auth.test.js
  Auth Service
    POST /api/auth/register
      ✓ should register a new user successfully (128 ms)
      ✓ should fail with missing required fields (5 ms)
      ✓ should hash the password before storing (73 ms)
    POST /api/auth/login
      ✓ should login with valid credentials (143 ms)
      ✓ should fail with invalid password (162 ms)
      ✓ should fail with non-existent user (4 ms)
      ✓ should be vulnerable to SQL injection (security test) (153 ms)
    POST /api/auth/verify
      ✓ should verify a valid token (15 ms)
      ✓ should reject an invalid token (4 ms)
      ✓ should reject an expired token (4 ms)
    Security Tests
      ✓ should expose hardcoded JWT secret (security vulnerability)
      ✓ should not validate input fields (security vulnerability) (72 ms)

-----------|---------|----------|---------|---------|-------------------
File       | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------|---------|----------|---------|---------|-------------------
All files  |       0 |        0 |       0 |       0 |
 server.js |       0 |        0 |       0 |       0 | 1-123
-----------|---------|----------|---------|---------|-------------------
Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
Snapshots:   0 total
Time:        2.171 s
Ran all test suites.
```

## API Usage Examples

### Health Check
```bash
curl http://localhost:3001/health
```

Expected output:

```json
{
  "status": "ok",
  "service": "auth"
}
```

### Register User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
```

Expected output:

```json
{
  "message": "User registered successfully",
  "token": "<token>",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'
```

Expected output:

```json
{
  "message": "Login successful",
  "token": "<token>",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

### Verify Token
```bash
curl -X POST http://localhost:3001/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_JWT_TOKEN_HERE"}'
```

Expected output:

```json
{
  "valid": true,
  "user": {
    "userId": 1,
    "username": "testuser",
    "iat": 1754859812
  }
}
```

## Development Commands

- `npm start` - Run the service
- `npm run dev` - Run with nodemon for development
- `npm test` - Run unit tests (to be added)

## Environment Variables

The service accepts these environment variables:

- `PORT` - Server port (default: 3001)
- `DB_HOST` - Database host (default: localhost)

Note: Database credentials are currently hardcoded (intentional security flaw).

## Testing the Security Issues

### SQL Injection Test
Try this malicious login payload:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin'\'' OR 1=1 --","password":"anything"}'
```

This should demonstrate the SQL injection vulnerability that security scanners will detect.

## Database Schema

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```