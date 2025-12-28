# Insurance Lead Generation AI Platform

AI-powered platform for automated insurance lead generation, qualification, and routing.

## 🚀 Overview

This monorepo contains a complete AI-driven insurance lead generation platform combining Python FastAPI backend services with TypeScript microservices, orchestrating intelligent lead processing, qualification, and distribution.

## 📁 Project Structure

```
2026-Lead-Gen-Insurance/
├── apps/
│   ├── backend/          # Python FastAPI backend (Phase 1.1 ✅)
│   │   ├── app/          # Application code
│   │   ├── alembic/      # Database migrations
│   │   └── tests/        # Backend tests
│   ├── api/              # REST API service (TypeScript/NestJS)
│   ├── data-service/     # Data processing & storage service
│   ├── orchestrator/     # AI workflow orchestration
│   └── frontend/         # Next.js frontend (Planned Phase 1.3)
├── packages/
│   ├── core/            # Shared utilities & business logic
│   ├── types/           # TypeScript type definitions
│   └── config/          # Shared configuration & validation
├── docs/                 # Documentation
└── docker-compose.yml    # Local development infrastructure
```

## 🛠️ Tech Stack

### Backend (Python)
- **Framework**: FastAPI 0.109.0
- **Database**: PostgreSQL 16
- **ORM**: SQLAlchemy 2.0.25 (async)
- **Migrations**: Alembic 1.13.1
- **Validation**: Pydantic 2.5.3
- **Testing**: pytest 7.4.4

### TypeScript Services
- **Runtime**: Node.js 20+, TypeScript 5.3+
- **Framework**: NestJS (API), Express
- **Package Manager**: pnpm 8+
- **Build Tool**: Turbo
- **Testing**: Jest, Supertest

### Infrastructure
- **Databases**: PostgreSQL 16, Neo4j 5.x, Redis 7, Qdrant
- **Message Broker**: NATS
- **AI/ML**: OpenAI GPT-4, LangChain
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 20.0.0
- **Python** >= 3.9
- **pnpm** >= 8.0.0
- **Docker** & Docker Compose

### Setup

1. **Clone and install:**
   ```bash
   git clone <repository-url>
   cd 2026-Lead-Gen-Insurance

   # Install Node.js dependencies
   pnpm install

   # Set up Python backend
   cd apps/backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env
   cd ../..
   ```

2. **Environment setup:**
   ```bash
   # Root .env for TypeScript services
   cp .env.example .env

   # Backend .env
   cd apps/backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start infrastructure:**
   ```bash
   docker compose up -d
   ```

4. **Run database migrations:**
   ```bash
   cd apps/backend
   alembic upgrade head
   PYTHONPATH=. python scripts/seed_data.py
   ```

5. **Start services:**
   ```bash
   # Python Backend
   cd apps/backend
   source venv/bin/activate
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

   # TypeScript services (in separate terminal)
   pnpm dev:apps
   ```

Or run everything at once:
```bash
pnpm dev
```

## 📦 Available Scripts

### Monorepo (Root)
```bash
# Development
pnpm dev                    # Start all services & apps
pnpm dev:services          # Start Docker infrastructure only
pnpm dev:apps              # Start development apps only

# Building & Testing
pnpm build                 # Build all packages
pnpm lint                  # Lint all code
pnpm test                  # Run all tests

# Database
pnpm db:generate           # Generate Prisma types
pnpm db:push               # Push schema changes
pnpm db:studio             # Open Prisma Studio

# Code Quality
pnpm format                # Format all code
pnpm format:check          # Check code formatting
```

### Backend (Python)
```bash
cd apps/backend
make help          # Show available commands
make dev           # Set up development environment
make run           # Start development server
make test          # Run tests with coverage
make migrate       # Apply database migrations
pytest -v          # Run tests with verbose output
```

## 🚢 Services & Ports

### Application Services

| Service | Status | Port | Documentation |
|---------|--------|------|---------------|
| Backend API (FastAPI) | ✅ Live | 8000 | [Swagger](http://localhost:8000/docs) |
| Main API (TypeScript) | 🚧 Planned | 3000 | - |
| Data Service | 🚧 Planned | 3001 | - |
| Orchestrator | 🚧 Planned | 3002 | - |

### Infrastructure Services

| Service | Status | Port | Documentation |
|---------|--------|------|---------------|
| PostgreSQL | ✅ Running | 5432 | - |
| Redis | ✅ Running | 6379 | - |
| Neo4j Browser | ✅ Running | 7474 | http://localhost:7474 |
| Qdrant | ✅ Running | 6333 | http://localhost:6333 |
| NATS | ✅ Running | 4222 | Monitor: 8222 |

### Monitoring Services (Phase 6.3)

| Service | Status | Port | Documentation |
|---------|--------|------|---------------|
| Prometheus | ✅ Live | 9090 | http://localhost:9090 |
| Grafana | ✅ Live | 3003 | http://localhost:3003 (admin/admin) |
| Loki | ✅ Live | 3100 | http://localhost:3100 |
| Jaeger UI | ✅ Live | 16686 | http://localhost:16686 |
| AlertManager | ✅ Live | 9093 | http://localhost:9093 |
| Node Exporter | ✅ Live | 9100 | http://localhost:9100/metrics |
| PostgreSQL Exporter | ✅ Live | 9187 | http://localhost:9187/metrics |
| Redis Exporter | ✅ Live | 9121 | http://localhost:9121/metrics |

## 🎯 Development Phases

### ✅ Phase 1.1: Core Backend & Database Foundations (Complete)
- Python FastAPI backend with CRUD operations
- PostgreSQL database with SQLAlchemy
- Alembic migrations
- Comprehensive testing with pytest
- API documentation (Swagger/ReDoc)
- See [apps/backend/PHASE_1.1_COMPLETION.md](./apps/backend/PHASE_1.1_COMPLETION.md)

### 🚧 Phase 1.2: Authentication & Authorization (In Progress)
- JWT-based authentication
- Role-based access control (RBAC)
- User management
- Session handling

### 🚧 Phase 1.3: Frontend Foundation (Planned)
- Next.js 14 application setup
- Tailwind CSS & component library
- State management
- API integration

### 📋 Phase 1.4: Lead Management (Planned)
- Full-stack lead management features
- Campaign management
- Lead routing & assignment

### 📋 Phase 1.5: Communication System (Planned)
- Notes & activity tracking
- Email integration
- Tasks & notifications

### 📋 Phase 2: Data Pipeline & Real-time Processing (Planned)
- Real-time lead processing
- Event-driven architecture with NATS
- Data validation & enrichment

### 📋 Phase 3: AI Lead Qualification & Scoring (Planned)
- LLM integration for lead scoring
- Natural language processing
- Automated lead qualification
- Intelligent recommendations

### 📋 Phase 3.5: AI Lead Pipeline & Enrichment (Planned)
- LangChain integration
- Lead enrichment module
- Agent matching service
- Neo4j & Qdrant integration

### 📋 Phase 4: Multi-Agent Routing & Distribution (Planned)
- Intelligent agent matching
- Load balancing
- Priority routing

### 📋 Phase 5: Analytics Dashboard & Optimization (Planned)
- Real-time analytics
- Performance metrics
- System optimization

### ✅ Phase 6.5: Production Deployment & Operations (Complete)
- ✅ Helm charts for all microservices (API, backend, data-service, orchestrator, frontend)
- ✅ Helm charts for ingress-nginx and monitoring stack
- ✅ Shared common templates library
- ✅ Multi-environment support (staging/production)
- ✅ Enhanced CI/CD pipeline with Docker build and push
- ✅ Kubernetes deployment workflow with GitHub Actions
- ✅ Terraform IaC for AWS resources (EKS, RDS, ElastiCache)
- ✅ Network security policies for service isolation
- ✅ Comprehensive operational runbooks
- ✅ Disaster recovery procedures
- ✅ Security hardening documentation
- ✅ Helm deployment guide
- See [docs/PHASE_6_5_COMPLETION.md](./docs/PHASE_6_5_COMPLETION.md)

### ✅ Phase 6.4: Performance & Scalability (Complete)
- ✅ Two-tier caching system (local + Redis)
- ✅ Rate limiting with multiple presets
- ✅ NGINX load balancer with connection pooling
- ✅ Horizontal Pod Autoscaler (HPA) for Kubernetes
- ✅ Vertical Pod Autoscaler (VPA) for resource optimization
- ✅ Database query optimizer and connection pooling
- ✅ CDN configuration (Cloudflare, CloudFront, Fastly)
- ✅ Performance testing suite
- See [docs/PHASE_6.4_IMPLEMENTATION.md](./docs/PHASE_6.4_IMPLEMENTATION.md)

### ✅ Phase 6: Production Deployment (Complete)
- ✅ Kubernetes deployment manifests (Kustomize)
- ✅ Helm charts for all microservices
- ✅ Infrastructure as Code (Terraform)
- ✅ Security hardening (NetworkPolicies, RBAC)
- ✅ Advanced monitoring (Prometheus, Grafana, Loki, Jaeger)
- ✅ CI/CD pipeline (GitHub Actions)
- ✅ Multi-environment support (staging/production)
- ✅ Operational runbooks
- ✅ Disaster recovery procedures

See [Implementation Phases](./docs/PHASES.md) for detailed roadmap.

## 🧪 Testing

### Backend (Python)
```bash
cd apps/backend
pytest -v --cov=app --cov-report=term-missing
```

### TypeScript Services
```bash
pnpm test                    # Run all tests
pnpm --filter @insurance/api test  # Run specific package tests
```

## 📚 Documentation

### Backend
- [Backend README](./apps/backend/README.md)
- [Database Schema](./apps/backend/docs/DATABASE_SCHEMA.md)
- [Quick Start Guide](./apps/backend/QUICKSTART.md)
- [Phase 1.1 Completion](./apps/backend/PHASE_1.1_COMPLETION.md)

### Monorepo
- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Technology Stack](./docs/TECH_STACK.md)
- [Development Guide](./docs/DEVELOPMENT.md)
- [Monitoring & Observability](./docs/MONITORING.md) ✨ **NEW**
- [Implementation Phases](./docs/PHASES.md)

## 📝 Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Build/tooling changes

Examples:
```bash
git commit -m "feat: add lead scoring endpoint"
git commit -m "fix: resolve redis connection issue"
git commit -m "docs: update API documentation"
```

## 🐳 Docker Services

The platform uses Docker Compose for infrastructure services:

```yaml
# Core Infrastructure
services:
  - postgres:5432    # Primary database
  - redis:6379       # Cache and sessions
  - neo4j:7474/7687  # Graph database
  - qdrant:6333      # Vector database
  - nats:4222        # Message broker

# Monitoring Stack (Phase 6.3)
monitoring:
  - prometheus:9090  # Metrics collection
  - grafana:3003     # Visualization
  - loki:3100        # Log aggregation
  - jaeger:16686     # Distributed tracing
  - alertmanager:9093 # Alert management
```

### Commands

```bash
# Start core infrastructure only
docker compose up -d

# Start infrastructure + monitoring
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# Start monitoring services only
docker compose -f docker-compose.monitoring.yml up -d

# Stop all services
docker compose down
docker compose -f docker-compose.monitoring.yml down

# View logs
docker compose logs -f
docker compose -f docker-compose.monitoring.yml logs -f grafana

# Reset database (WARNING: destroys data)
docker compose down -v
docker compose up -d
```

## 📊 Monitoring & Observability

Phase 6.3 implements comprehensive monitoring with:

- **Prometheus** - Metrics collection from all services
- **Grafana** - Dashboards and visualization (http://localhost:3003)
- **Loki** - Centralized log aggregation
- **Jaeger** - Distributed tracing (http://localhost:16686)
- **AlertManager** - Intelligent alert routing

### Quick Start

```bash
# Start monitoring stack
docker compose -f docker-compose.monitoring.yml up -d

# Access Grafana
open http://localhost:3003  # Login: admin / admin

# View Prometheus targets
open http://localhost:9090/targets

# View traces in Jaeger
open http://localhost:16686
```

### Available Metrics

All services expose metrics at `/metrics`:
- API Service: http://localhost:3000/metrics
- Data Service: http://localhost:3001/metrics
- Orchestrator: http://localhost:3002/metrics
- Backend: http://localhost:8000/metrics

See [Monitoring Guide](./docs/MONITORING.md) for detailed documentation.

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check if services are running
docker compose ps

# Restart database
docker compose restart postgres

# View logs
docker compose logs postgres
```

### Python Backend Issues
```bash
# Verify virtual environment is activated
source apps/backend/venv/bin/activate

# Check Python version
python --version  # Should be 3.9+

# Reinstall dependencies
pip install -r apps/backend/requirements.txt
```

### TypeScript Services Issues
```bash
# Clear node_modules and reinstall
pnpm clean
pnpm install

# Rebuild packages
pnpm build
```

## 🤝 Contributing

1. Create feature branch from `main`
2. Make changes following our conventions
3. Add/update tests
4. Ensure all tests pass: `pnpm test && cd apps/backend && pytest`
5. Update documentation
6. Create pull request with conventional commit message
7. Ensure CI passes

### Code Style

- **Python**: Follow PEP 8, use type hints
- **TypeScript**: Use ESLint and Prettier (configured)
- **Commits**: Follow Conventional Commits

## 📄 License

MIT License - see LICENSE file for details.

## 🛡️ Security

- All secrets managed via environment variables
- JWT-based authentication
- Rate limiting on all endpoints
- Input validation with Pydantic (Python) and Zod (TypeScript)
- Helmet for security headers
- SQL injection protection via ORM

## 📞 Support

For issues and questions:
- Open an issue in the repository
- Check the documentation in each service's directory
- Review the troubleshooting guide above
- See [Development Guide](./docs/DEVELOPMENT.md) for setup help _(coming soon)_
- See [Architecture Overview](./docs/ARCHITECTURE.md) for system understanding _(coming soon)_

---

**Project Status**: Phase 1.1 Complete ✅ | Merging Phase 1.2-3.5 🚧
