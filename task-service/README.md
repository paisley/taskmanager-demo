# Task Service

Task management microservice for the Task Manager demo application. Provides CRUD operations for tasks with JWT-based authentication.

## Purpose

This service demonstrates typical microservice patterns while intentionally including security vulnerabilities for DevSecOps pipeline testing. It communicates with the Auth Service for token validation.

## API Endpoints

- `GET /api/tasks` - Get all tasks for authenticated user (supports ?status= filter)
- `GET /api/tasks/:id` - Get specific task by ID
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update existing task
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/debug` - Debug endpoint (exposes sensitive info)
- `GET /health` - Health check

## Intentional Security Issues

This service contains the following vulnerabilities for security scanning demonstration:

1. **SQL Injection** - Task filtering endpoint vulnerable to SQL injection
2. **Broken Authorization** - Users can access/modify other users' tasks
3. **Information Disclosure** - Debug endpoint exposes environment variables and config
4. **No Input Validation** - Missing validation on task creation/updates
5. **Overly Permissive CORS** - Allows requests from any origin
6. **No Rate Limiting** - Susceptible to DoS attacks
7. **Large Payload Acceptance** - Accepts 50MB JSON payloads
8. **Error Information Disclosure** - Exposes internal error details
9. **Outdated Dependencies** - Uses packages with known CVEs
10. **Insecure Container** - Dockerfile runs as root user

## Prerequisites

- Node.js 18+
- PostgreSQL 16+ (shared with Auth Service)
- Auth Service running on port 3001
- npm
- jq

## Local Development Setup

### 1. Ensure Auth Service is Running

The Task Service depends on the Auth Service for token validation:
```bash
# In auth-service directory
npm start  # Should be running on port 3001
```

### 2. Install and Run Task Service

```bash
# In task-service directory
npm install  # Will show vulnerabilities - this is intentional!
npm start
```

The service will start on port 3002 and automatically create the tasks table.

## Environment Variables

- `PORT` - Server port (default: 3002)
- `DB_HOST` - Database host (default: localhost)
- `AUTH_SERVICE_URL` - Auth service URL (default: http://localhost:3001)

Note: Database credentials are hardcoded (intentional security flaw).

## Unit Tests

This project uses Jest, a popular JavaScript test framework.

### Running Tests

```bash
cd task-service
npm test
```

Expected output:

```bash
> task-service@1.0.0 test
> jest

 PASS  __tests__/task.test.js
  Task Service
    GET /api/tasks
      ✓ should get tasks for authenticated user (38 ms)
      ✓ should require authentication (10 ms)
      ✓ should reject invalid tokens (4 ms)
      ✓ should be vulnerable to SQL injection in status filter (4 ms)
    POST /api/tasks
      ✓ should create a new task (13 ms)
      ✓ should require authentication (4 ms)
      ✓ should accept tasks without input validation (security flaw) (4 ms)
    GET /api/tasks/:id
      ✓ should get a specific task (3 ms)
      ✓ should allow access to other users tasks (authorization bypass) (4 ms)
    PUT /api/tasks/:id
      ✓ should update a task (4 ms)
      ✓ should require authentication (3 ms)
    DELETE /api/tasks/:id
      ✓ should delete a task (3 ms)
      ✓ should require authentication (2 ms)
    Security Tests
      ✓ should expose sensitive information in debug endpoint (3 ms)
      ✓ should have no rate limiting (security vulnerability) (15 ms)
      ✓ should have default payload protection (but could be configured larger) (14 ms)

-----------|---------|----------|---------|---------|-------------------
File       | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------|---------|----------|---------|---------|-------------------
All files  |       0 |        0 |       0 |       0 |
 server.js |       0 |        0 |       0 |       0 | 1-183
-----------|---------|----------|---------|---------|-------------------
Test Suites: 1 passed, 1 total
Tests:       16 passed, 16 total
Snapshots:   0 total
Time:        1.176 s
Ran all test suites.
```

## API Usage Examples

### Health Check
```bash
curl http://localhost:3002/health
```

Expected output:

```json
{
  "status": "ok",
  "service": "task"
}
```

### Get Authentication Token
First, get a token from the Auth Service:
```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}' | \
  jq -r '.token')
```

Expected result:

The returned token is stored in the `$TOKEN` environment variable.

### Create Task
```bash
curl -X POST http://localhost:3002/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Complete project","description":"Finish the task manager demo","priority":"high"}'
```

Expected Output:

```json
{
  "id": 1,
  "title": "Test Task",
  "description": "This is a test task",
  "status": "pending",
  "priority": "high",
  "user_id": 1,
  "created_at": "2025-08-10T21:50:02.734Z",
  "updated_at": "2025-08-10T21:50:02.734Z"
}
```

### Get All Tasks
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3002/api/tasks
```

Expected output:

```json
[
  {
    "id": 2,
    "title": "Second Test Task",
    "description": "This is a second task",
    "status": "pending",
    "priority": "low",
    "user_id": 1,
    "created_at": "2025-08-10T22:01:03.290Z",
    "updated_at": "2025-08-10T22:01:03.290Z"
  },
  {
    "id": 1,
    "title": "Test Task",
    "description": "This is a test task",
    "status": "pending",
    "priority": "high",
    "user_id": 1,
    "created_at": "2025-08-10T21:50:02.734Z",
    "updated_at": "2025-08-10T21:50:02.734Z"
  }
]
```

### Get Specific Task
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3002/api/tasks/1
```

Expected output:

```json
{
  "id": 1,
  "title": "Test Task",
  "description": "This is a test task",
  "status": "pending",
  "priority": "high",
  "user_id": 1,
  "created_at": "2025-08-10T21:50:02.734Z",
  "updated_at": "2025-08-10T21:50:02.734Z"
}
```

### Update Task
```bash
curl -X PUT http://localhost:3002/api/tasks/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Updated task","description":"Updated description","status":"completed","priority":"medium"}'
```

Expected output:

```json
{
  "id": 1,
  "title": "Updated Task",
  "description": "Now completed",
  "status": "completed",
  "priority": "high",
  "user_id": 1,
  "created_at": "2025-08-10T21:50:02.734Z",
  "updated_at": "2025-08-10T22:07:58.306Z"
}
```

### Filter Tasks by Status
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3002/api/tasks?status=pending"
```

Expected output:

```json
[
  {
    "id": 2,
    "title": "Second Test Task",
    "description": "This is a second task",
    "status": "pending",
    "priority": "low",
    "user_id": 1,
    "created_at": "2025-08-10T22:01:03.290Z",
    "updated_at": "2025-08-10T22:01:03.290Z"
  }
]
```

### Delete Task
```bash
curl -X DELETE http://localhost:3002/api/tasks/1 \
  -H "Authorization: Bearer $TOKEN"
```

Expected output:

```json
{
  "message": "Task deleted successfully"
}
```

## Development Commands

- `npm start` - Run the service
- `npm run dev` - Run with nodemon for development
- `npm test` - Run unit tests (to be added)

## Testing Security Issues

### SQL Injection Test
Test the status filter vulnerability:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3002/api/tasks?status=pending'%20OR%201=1%20--"
```

### Authorization Bypass Test
Try accessing another user's task (replace with actual task ID):
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3002/api/tasks/999
```

### Debug Information Exposure
```bash
curl http://localhost:3002/api/debug
```

This will expose environment variables and database configuration.

## Database Schema

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

## Service Communication

The Task Service communicates with the Auth Service via HTTP:
- **Token Verification**: `POST /api/auth/verify`
- **Timeout**: No timeout configured (potential hanging requests)
- **Error Handling**: Exposes detailed error messages from auth failures

## Common Issues

1. **"No authorization header"** - Make sure to include `Authorization: Bearer <token>` header
2. **"Token verification failed"** - Auth service may be down or token expired
3. **"Task not found"** - Task ID doesn't exist or belongs to different user
4. **Database connection errors** - Ensure PostgreSQL is running and accessible