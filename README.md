# Task Manager Demo - DevSecOps Sample Application

### ⚠️ Important: This application contains intentional security vulnerabilities and should never be deployed to production environments. It is designed exclusively for training and demonstration purposes.

A complete microservices application designed to demonstrate DevSecOps pipeline integration with **intentional security vulnerabilities** for security scanning and team training purposes.

## 🎯 Purpose

This application serves as a comprehensive example for development teams to understand:
- **Modern microservices architecture** patterns
- **DevSecOps pipeline integration** with enterprise tools
- **Security vulnerability detection** through automated scanning
- **Container-based deployment** workflows
- **CI/CD best practices** with security gates

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React UI      │    │  Auth Service   │    │  Task Service   │
│   (Port 3000)   │◄──►│   (Port 3001)   │◄──►│   (Port 3002)   │
│   Alpine3       │    │     UBI8        │    │     UBI8        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                └───────────┬───────────┘
                                            ▼
                                ┌─────────────────┐
                                │  PostgreSQL DB  │
                                │   (Port 5432)   │
                                │     UBI8.10     │
                                └─────────────────┘
```

## 📦 Services

| Service | Technology | Port | Base Image | Purpose |
|---------|------------|------|------------|---------|
| **UI** | React 17 | 3000 | Alpine3 | User interface and authentication |
| **Auth Service** | Node.js 18 | 3001 | UBI8 | JWT authentication and user management |
| **Task Service** | Node.js 18 | 3002 | UBI8 | Task CRUD operations and business logic |
| **Database** | PostgreSQL 16 | 5432 | UBI8.10 | Data persistence and storage |

## 🚨 Intentional Security Vulnerabilities

This application contains **47 documented security issues** across all components for DevSecOps training:

### Authentication & Authorization (12 issues)
- Hardcoded JWT secrets and database credentials
- SQL injection vulnerabilities in login endpoints
- Missing input validation and sanitization
- Authorization bypass in task access controls
- Overly permissive CORS configurations
- Weak password policies and MD5 encryption

### Application Security (15 issues)
- XSS vulnerabilities through unvalidated inputs
- Information disclosure via detailed error messages
- No rate limiting or DoS protection
- Large payload acceptance (50MB limits)
- Debug endpoints exposing sensitive configuration
- Client-side token storage in localStorage

### Infrastructure Security (10 issues)
- Containers running as root users
- Overly permissive network access (0.0.0.0/0)
- SSL/TLS disabled across services
- Missing security headers (CSP, HSTS)
- Excessive logging of sensitive data
- Trust authentication for database access

### Dependency Security (10 issues)
- Outdated packages with known CVEs
- Development dependencies in production builds
- Deprecated libraries with security warnings
- Missing dependency vulnerability scanning
- Insecure package configurations

## 🛠️ DevSecOps Integration

### Supported Tools
- **GitLab CI/CD** - Complete pipeline with security gates
- **Jenkins** - Enterprise pipeline with parallel stages
- **SonarQube** - Static code analysis and quality gates
- **Prisma Cloud** - Container and infrastructure scanning
- **Artifactory** - Artifact management and storage

### Pipeline Stages
1. **Build** - Parallel service compilation and dependency installation
2. **Test** - Unit tests with coverage reporting (Jest, React Testing Library)
3. **Security Scan** - SAST, dependency scanning, and vulnerability analysis
4. **Quality Gate** - SonarQube quality gates and security thresholds
5. **Package** - Docker image building with security scanning
6. **Container Scan** - Image vulnerability assessment
7. **Push** - Registry deployment with proper tagging
8. **Deploy** - OpenShift deployment via image pull

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+
- PostgreSQL 12+ (for local development)

### Option 1: Docker Compose (Recommended)
```bash
# Clone and start all services
git clone <repository>
cd task-manager-demo

# Start all services
docker-compose up --build

# Access the application
open http://localhost:3000
```

### Option 2: Local Development
```bash
# Start database
docker-compose up postgres

# Terminal 1: Auth Service
cd auth-service
npm install
npm start

# Terminal 2: Task Service  
cd task-service
npm install
npm start

# Terminal 3: UI
cd ui
npm install
npm start
```

### Option 3: Individual Services
Each service can be run independently. See individual README files:
- [Auth Service](./auth-service/README.md)
- [Task Service](./task-service/README.md)  
- [UI](./ui/README.md)
- [Database](./database/README.md)

## 📋 Usage Examples

### User Registration and Login
```bash
# Register a new user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","email":"demo@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"password123"}'
```

### Task Management
```bash
# Get JWT token from login response, then:

# Create a task
curl -X POST http://localhost:3002/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"title":"Demo Task","description":"Sample task","priority":"high"}'

# List all tasks
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  http://localhost:3002/api/tasks
```

### Security Vulnerability Testing
```bash
# Test SQL injection (Auth Service)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin'\'' OR 1=1 --","password":"anything"}'

# Test SQL injection (Task Service)
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  "http://localhost:3002/api/tasks?status=pending'%20OR%201=1%20--"

# Test information disclosure
curl http://localhost:3002/api/debug
```

## 🧪 Testing

### Running Unit Tests
```bash
# Auth Service tests
cd auth-service && npm test

# Task Service tests  
cd task-service && npm test

# UI tests
cd ui && npm test

# All tests with coverage
npm run test:all
```

### Security Testing
```bash
# Dependency scanning
npm audit

# Container scanning
docker run --rm -v $(pwd):/app <security-scanner> /app

# SAST scanning
sonar-scanner
```

## 🔧 Configuration

### Environment Variables
```bash
# Database Configuration
POSTGRES_DB=taskmanager
POSTGRES_USER=postgres  
POSTGRES_PASSWORD=password123

# Service Configuration
AUTH_SERVICE_URL=http://auth-service:3001
TASK_SERVICE_URL=http://task-service:3002

# UI Configuration
AUTH_API_URL=http://localhost:3001/api/auth
TASK_API_URL=http://localhost:3002/api/tasks
```

### Docker Registry Configuration
```bash
# Update docker-compose.yml or CI/CD pipelines
DOCKER_REGISTRY=registry.example.com:5000
IMAGE_TAG=${BUILD_NUMBER}-${GIT_COMMIT_SHORT}
```

## 📊 Monitoring and Observability

### Health Checks
```bash
# Service health endpoints
curl http://localhost:3001/health  # Auth Service
curl http://localhost:3002/health  # Task Service
curl http://localhost:3000         # UI
```

### Application Metrics
- **Coverage Reports** - Generated by Jest for all services
- **Security Scan Results** - Available in CI/CD artifacts
- **Performance Metrics** - Container resource utilization
- **Audit Logs** - Application and database activity

## 🔐 Security Scanning Results

Expected findings from DevSecOps tools:

### SonarQube Issues
- **Critical**: 8 issues (SQL injection, hardcoded secrets)
- **High**: 15 issues (XSS, authentication bypass)  
- **Medium**: 12 issues (information disclosure, weak crypto)
- **Low**: 12 issues (code quality, maintainability)

### Container Scanning
- **CVE Vulnerabilities**: 25+ known issues in base images
- **Configuration Issues**: Root user, missing health checks
- **Secrets**: Hardcoded credentials in environment variables

### Dependency Scanning  
- **High Risk**: 10+ packages with known vulnerabilities
- **Medium Risk**: 15+ packages needing updates
- **License Issues**: Potential license compliance problems

## 📁 Project Structure

```
task-manager-demo/
├── auth-service/           # JWT authentication microservice
│   ├── __tests__/         # Unit tests
│   ├── server.js          # Main application
│   ├── package.json       # Dependencies
│   ├── Dockerfile         # Container definition
│   └── README.md          # Service documentation
├── task-service/          # Task management microservice  
│   ├── __tests__/         # Unit tests
│   ├── server.js          # Main application
│   ├── package.json       # Dependencies
│   ├── Dockerfile         # Container definition
│   └── README.md          # Service documentation
├── ui/                    # React frontend application
│   ├── src/               # Source code
│   ├── public/            # Static assets
│   ├── package.json       # Dependencies
│   ├── Dockerfile         # Container definition
│   └── README.md          # UI documentation
├── database/              # PostgreSQL database
│   ├── init-db.sh         # Initialization script
│   ├── postgresql.conf    # Database configuration
│   ├── pg_hba.conf        # Authentication rules
│   ├── Dockerfile         # Container definition
│   └── README.md          # Database documentation
├── docker-compose.yml     # Multi-service orchestration
├── Jenkinsfile            # Comprehensive Jenkins CI/CD pipeline
├── Jenkinsfile.simple     # Basic Jenkins CI/CD pipeline
├── .gitlab-ci.yml         # Comprehensive GitLab CI/CD pipeline
├── .gitlab-ci.simple.yml  # Basic GitLab CI/CD pipeline
└── README.md              # This file
```

## 🎓 Learning Objectives

After working with this application, teams will understand:

### DevSecOps Practices
- Security scanning integration in CI/CD pipelines
- Quality gates and security thresholds
- Container security and vulnerability management
- Secret management and secure configuration

### Development Patterns
- Microservices architecture and communication
- RESTful API design and authentication
- Database design and ORM patterns
- Modern JavaScript and React development

### Security Awareness
- Common web application vulnerabilities
- Container and infrastructure security
- Dependency management and supply chain security
- Security testing and validation techniques

## 🤝 Contributing

This is a demo application for internal training. For improvements or questions:

1. **Security Issues**: Document findings rather than fixing them
2. **Functionality**: Ensure new features include intentional vulnerabilities
3. **Documentation**: Keep security issues clearly documented
4. **Testing**: Add tests that validate functionality, not security

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Web application security risks
- [DevSecOps Guidelines](https://docs.anthropic.com) - Internal security practices
- [Container Security](https://docs.docker.com/engine/security/) - Docker security best practices
- [SonarQube Rules](https://rules.sonarsource.com/) - Static analysis rule references

## 📞 Support

For questions about this demo application:

- **DevSecOps Team**: Contact via Slack #devsecops
- **Security Questions**: Open a ticket in the security portal
- **Tool Issues**: Check individual service README files
- **Pipeline Problems**: Review Jenkins/GitLab logs and artifacts

---

**⚠️ Important**: This application contains intentional security vulnerabilities and should **never be deployed to production environments**. It is designed exclusively for training and demonstration purposes.