# Development Environment Deployment Runbook

## 🎯 Overview

This runbook provides step-by-step instructions for deploying the Insurance Lead Gen Platform to development environments. Development deployments are designed for rapid iteration and testing with minimal overhead.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Docker Compose Development](#docker-compose-development)
4. [Database Setup](#database-setup)
5. [Common Development Issues](#common-development-issues)
6. [Troubleshooting](#troubleshooting)
7. [Development Best Practices](#development-best-practices)

---

## Prerequisites

### System Requirements
- **Operating System**: macOS, Linux, or Windows 10+
- **Memory**: Minimum 8GB RAM (16GB recommended)
- **Storage**: 10GB free space
- **Network**: Internet connection for dependencies

### Required Software
```bash
# Install Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install kubectl (optional)
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

### Development Tools
```bash
# Install useful development tools
npm install -g @nestjs/cli
npm install -g prisma
npm install -g ts-node
npm install -g typescript

# Install IDE extensions (VS Code recommended)
# - ESLint
# - Prettier
# - Docker
# - Kubernetes
# - GitLens
```

---

## Local Development Setup

### 1. Repository Setup

```bash
# Clone the repository
git clone https://github.com/company/insurance-lead-gen.git
cd insurance-lead-gen

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env.local
```

### 2. Environment Configuration

Edit `.env.local` with development settings:

```bash
# Database Configuration
DATABASE_URL="postgresql://dev_user:dev_password@localhost:5432/insurance_lead_gen_dev"
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=insurance_lead_gen_dev
DATABASE_USER=dev_user
DATABASE_PASSWORD=dev_password

# Redis Configuration
REDIS_URL="redis://localhost:6379"
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Application Configuration
NODE_ENV=development
PORT=3000
API_PORT=3001
FRONTEND_PORT=3002

# Authentication
JWT_SECRET=dev_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# External Services (Development/Sandbox)
STRIPE_SECRET_KEY=sk_test_development_key
STRIPE_PUBLISHABLE_KEY=pk_test_development_key
SENDGRID_API_KEY=dev_sendgrid_key
TWILIO_ACCOUNT_SID=dev_twilio_sid
TWILIO_AUTH_TOKEN=dev_twilio_token

# Logging
LOG_LEVEL=debug
LOG_FORMAT=dev

# Feature Flags
ENABLE_DEBUG_MODE=true
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_API_DOCS=true
```

### 3. Start Development Services

```bash
# Start database and cache services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Verify services are running
docker-compose ps

# Expected output:
# NAME                        STATUS
# insurance-lead-gen_db_1     Up
# insurance-lead-gen_redis_1  Up
# insurance-lead-gen_monitoring_1  Up (optional)
```

### 4. Database Setup

```bash
# Run database migrations
pnpm run db:migrate

# Seed development data
pnpm run db:seed

# Verify database setup
pnpm run db:status

# Expected output:
# Database: insurance_lead_gen_dev
# Status: Connected
# Migrations: Applied
# Tables: 12
# Records: 150+
```

### 5. Start Development Servers

#### Option A: Individual Services
```bash
# Terminal 1 - API Service
pnpm run dev:api

# Terminal 2 - Backend Service
pnpm run dev:backend

# Terminal 3 - Frontend Service
pnpm run dev:frontend

# Terminal 4 - Data Service
pnpm run dev:data-service

# Terminal 5 - Orchestrator
pnpm run dev:orchestrator
```

#### Option B: All Services at Once
```bash
# Start all services in parallel
pnpm run dev:all

# Or use Docker Compose for all services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### 6. Verify Development Setup

```bash
# Check all services are running
curl http://localhost:3000/health    # API Service
curl http://localhost:3001/health    # Backend Service
curl http://localhost:3002/health    # Frontend Service

# Check database connectivity
pnpm run db:test

# Check Redis connectivity
redis-cli ping

# Verify application features
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'
```

---

## Docker Compose Development

### Development Docker Compose File

Create `docker-compose.dev.yml`:

```yaml
version: '3.8'

services:
  # Database Services
  postgres:
    image: postgres:15
    container_name: dev-postgres
    environment:
      POSTGRES_DB: insurance_lead_gen_dev
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/dev/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev_user -d insurance_lead_gen_dev"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Cache Service
  redis:
    image: redis:7-alpine
    container_name: dev-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Message Queue
  rabbitmq:
    image: rabbitmq:3-management
    container_name: dev-rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: dev_user
      RABBITMQ_DEFAULT_PASS: dev_password
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

  # Monitoring (Development)
  prometheus:
    image: prom/prometheus
    container_name: dev-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus/prometheus.dev.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana
    container_name: dev-grafana
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dev-dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/dev-datasources:/etc/grafana/provisioning/datasources

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:
  prometheus_data:
  grafana_data:
```

### Development-Specific Commands

```bash
# Start only development dependencies
docker-compose -f docker-compose.dev.yml up -d postgres redis rabbitmq

# Start with monitoring
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Rebuild and restart services
docker-compose -f docker-compose.dev.yml up -d --build

# View logs for specific service
docker-compose -f docker-compose.dev.yml logs -f postgres
docker-compose -f docker-compose.dev.yml logs -f redis

# Reset development environment
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
pnpm run db:migrate
pnpm run db:seed

# Database shell access
docker-compose -f docker-compose.dev.yml exec postgres psql -U dev_user -d insurance_lead_gen_dev

# Redis CLI access
docker-compose -f docker-compose.dev.yml exec redis redis-cli
```

---

## Database Setup

### Initial Database Setup

```bash
# Create database schema
pnpm run db:generate
pnpm run db:migrate

# Alternative manual setup
docker-compose -f docker-compose.dev.yml exec postgres createdb -U dev_user insurance_lead_gen_dev

# Run schema creation
docker-compose -f docker-compose.dev.yml exec postgres psql -U dev_user -d insurance_lead_gen_dev -f /docker-entrypoint-initdb.d/init.sql
```

### Development Data Seeding

Create test data for development:

```bash
# Seed with realistic test data
pnpm run db:seed

# Seed specific data types
pnpm run db:seed:leads
pnpm run db:seed:customers
pnpm run db:seed:agents
pnpm run db:seed:policies

# Custom seed data
pnpm run db:seed:custom --file=./data/dev-custom-seed.json

# Reset and reseed
pnpm run db:reset
pnpm run db:seed
```

### Database Development Tools

```bash
# Database schema migration
pnpm run db:migrate:create --name=add_new_feature
pnpm run db:migrate:up
pnpm run db:migrate:down
pnpm run db:migrate:status

# Database reset (WARNING: Removes all data)
pnpm run db:reset

# Database backup for development
pnpm run db:backup

# Database restore from backup
pnpm run db:restore --file=backup.sql

# Database health check
pnpm run db:health

# Performance analysis
pnpm run db:analyze
pnpm run db:explain --query="SELECT * FROM leads WHERE status = 'active'"
```

### Common Database Issues

#### Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose.dev.yml ps postgres

# Check database logs
docker-compose -f docker-compose.dev.yml logs postgres

# Test connection manually
docker-compose -f docker-compose.dev.yml exec postgres pg_isready -U dev_user -d insurance_lead_gen_dev

# Reset database
docker-compose -f docker-compose.dev.yml stop postgres
docker-compose -f docker-compose.dev.yml rm -f postgres
docker volume rm insurance-lead-gen_postgres_data
docker-compose -f docker-compose.dev.yml up -d postgres
```

#### Migration Issues
```bash
# Check migration status
pnpm run db:migrate:status

# Force migration reset (WARNING: Loses data)
pnpm run db:migrate:force

# Manual migration execution
docker-compose -f docker-compose.dev.yml exec postgres psql -U dev_user -d insurance_lead_gen_dev -f migrations/latest.sql
```

---

## Common Development Issues

### 1. Port Conflicts

**Problem**: Ports already in use
```bash
# Find process using port
lsof -i :3000
netstat -tulpn | grep :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 pnpm run dev:api
```

**Prevention**:
- Use `.env.local` for port configuration
- Implement port auto-detection
- Document reserved ports

### 2. Database Connection Issues

**Problem**: Cannot connect to database
```bash
# Check database status
docker-compose -f docker-compose.dev.yml ps postgres

# Check database logs
docker-compose -f docker-compose.dev.yml logs postgres

# Test connection
docker-compose -f docker-compose.dev.yml exec postgres pg_isready -U dev_user -d insurance_lead_gen_dev

# Reset database
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d postgres
pnpm run db:migrate
```

### 3. Dependencies Issues

**Problem**: Package installation failures
```bash
# Clear npm cache
npm cache clean --force
pnpm store prune

# Delete lock files and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Check Node.js version
node --version  # Should be 18+
```

### 4. Docker Issues

**Problem**: Docker containers not starting
```bash
# Check Docker daemon
docker info

# Restart Docker service
sudo systemctl restart docker

# Check container logs
docker-compose -f docker-compose.dev.yml logs <service-name>

# Rebuild containers
docker-compose -f docker-compose.dev.yml up -d --build
```

### 5. Environment Variable Issues

**Problem**: Missing or incorrect environment variables
```bash
# Check environment variables
printenv | grep DATABASE
printenv | grep REDIS

# Verify .env.local exists and is correct
cat .env.local

# Load environment variables
source .env.local
pnpm run dev:api
```

---

## Troubleshooting

### Debugging Tools

```bash
# Application logs
pnpm run logs:api
pnpm run logs:backend
pnpm run logs:frontend

# Database logs
docker-compose -f docker-compose.dev.yml logs -f postgres

# Redis logs
docker-compose -f docker-compose.dev.yml logs -f redis

# System resources
docker stats
kubectl top nodes (if using K8s)
```

### Health Check Commands

```bash
# Check all services
pnpm run health:check

# Individual service health
curl http://localhost:3000/health    # API
curl http://localhost:3001/health    # Backend
curl http://localhost:3002/health    # Frontend

# Database health
pnpm run db:health

# Cache health
redis-cli ping

# Message queue health
curl http://localhost:15672  # RabbitMQ Management
```

### Performance Profiling

```bash
# Enable debug mode
DEBUG=* pnpm run dev:api

# Profile memory usage
node --inspect src/api/main.ts

# Database query analysis
pnpm run db:explain-all

# Load testing
npm install -g artillery
artillery run load-test.yml
```

### Common Error Resolution

#### "Cannot find module"
```bash
# Rebuild TypeScript
pnpm run build:watch

# Clear module cache
rm -rf node_modules/.cache
pnpm run dev:api
```

#### "Database connection refused"
```bash
# Start database service
docker-compose -f docker-compose.dev.yml up -d postgres

# Wait for database to be ready
sleep 10
pnpm run db:health
```

#### "Port already in use"
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 pnpm run dev:api
```

---

## Development Best Practices

### 1. Code Organization

```
src/
├── api/              # API service
├── backend/          # Backend service
├── frontend/         # Frontend service
├── data-service/     # Data processing service
├── orchestrator/     # Workflow orchestration
├── shared/           # Shared utilities
└── tests/            # Test utilities
```

### 2. Environment Management

```bash
# Use environment-specific configs
.env.local           # Local development
.env.staging         # Staging environment
.env.production      # Production environment

# Never commit .env.local to git
echo ".env.local" >> .gitignore
```

### 3. Database Development

```bash
# Always backup before schema changes
pnpm run db:backup

# Use migrations for all schema changes
pnpm run db:migrate:create --name=descriptive_name

# Test migrations in isolation
pnpm run db:test-migration
```

### 4. Testing in Development

```bash
# Run tests in watch mode
pnpm run test:watch

# Run specific test
pnpm run test -- --grep="lead creation"

# Test with coverage
pnpm run test:coverage

# Integration tests
pnpm run test:integration
```

### 5. Debugging

```bash
# Use VS Code debugger
# Create .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API",
      "program": "${workspaceFolder}/apps/api/src/main.ts",
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### 6. Performance Monitoring

```bash
# Enable performance monitoring
pnpm run dev:with-monitoring

# Monitor database queries
DEBUG=prisma:* pnpm run dev:api

# Monitor API calls
DEBUG=http pnpm run dev:api
```

---

## Quick Reference

### Essential Commands
```bash
# Quick start
git clone <repo>
pnpm install
docker-compose -f docker-compose.dev.yml up -d
pnpm run db:migrate && pnpm run db:seed
pnpm run dev:all

# Reset development environment
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
pnpm run db:migrate && pnpm run db:seed

# Development workflow
git checkout -b feature/new-feature
# Make changes
pnpm run test
pnpm run dev:api  # Test changes
git add . && git commit -m "feat: add new feature"
git push origin feature/new-feature
```

### Port Reference
- **3000**: API Service
- **3001**: Backend Service  
- **3002**: Frontend Service
- **5432**: PostgreSQL
- **6379**: Redis
- **15672**: RabbitMQ Management
- **9090**: Prometheus
- **3000**: Grafana (when using different port)

### Useful URLs
- **API**: http://localhost:3000
- **Frontend**: http://localhost:3002
- **API Documentation**: http://localhost:3000/docs
- **Grafana**: http://localhost:3001 (dev) or http://localhost:3000 (monitoring)
- **Prometheus**: http://localhost:9090
- **RabbitMQ**: http://localhost:15672

### Emergency Contacts
- **Dev Lead**: @dev-lead
- **Platform Team**: #platform-support
- **Slack Channel**: #development
