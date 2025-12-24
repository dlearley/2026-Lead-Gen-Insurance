# 2026 Lead Generation Insurance Platform

A comprehensive AI-powered lead generation and management platform for insurance businesses.

## 📋 Overview

This is a monorepo containing multiple services and packages for the Lead Generation Insurance Platform. The platform combines modern backend APIs, data processing services, AI orchestration, and intelligent lead management capabilities.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend / Clients                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────────┐
│                      API Gateway                             │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────────┐
│   Backend    │ │Data Service│ │  Orchestrator  │
│  (FastAPI)   │ │(TypeScript)│ │  (TypeScript)  │
└──────┬───────┘ └─────┬──────┘ └─────┬──────────┘
       │               │               │
       └───────────────┼───────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼─────────┐         ┌────────▼──────────┐
│   PostgreSQL    │         │   Redis Cache     │
│   (Primary DB)  │         │   (Sessions)      │
└─────────────────┘         └───────────────────┘
```

## 📦 Monorepo Structure

### Apps

- **`apps/backend/`** - FastAPI Python backend for lead management (Phase 1.1 ✅)
  - RESTful API for CRUD operations
  - PostgreSQL database with SQLAlchemy ORM
  - Alembic migrations
  - Comprehensive testing with pytest
  - See [apps/backend/README.md](./apps/backend/README.md)

- **`apps/api/`** - Main API service (TypeScript/Node.js)
  - API Gateway and routing
  - Authentication & authorization
  - Request/response handling

- **`apps/data-service/`** - Data processing service
  - Data transformation and validation
  - Integration with external data sources
  - Batch processing

- **`apps/orchestrator/`** - AI orchestration service
  - LLM integration
  - Workflow coordination
  - Event processing

### Packages

- **`packages/core/`** - Shared core utilities
  - Error handling
  - Logging
  - Common helpers

- **`packages/types/`** - Shared TypeScript types
  - Type definitions
  - Interfaces
  - Schemas

- **`packages/config/`** - Shared configuration
  - Environment management
  - Constants
  - Feature flags

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ (for TypeScript services)
- **Python** 3.9+ (for FastAPI backend)
- **Docker** and **Docker Compose**
- **pnpm** (for Node.js package management)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd 2026-Lead-Gen-Insurance

# Install Node.js dependencies (if using TypeScript services)
pnpm install

# Set up Python backend
cd apps/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
cd ../..

# Start infrastructure services
docker compose up -d

# Run database migrations (for backend)
cd apps/backend
alembic upgrade head
PYTHONPATH=. python scripts/seed_data.py
```

### Running Services

#### FastAPI Backend (Phase 1.1)

```bash
cd apps/backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Access at: **http://localhost:8000**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

#### TypeScript Services (Future)

```bash
# Build all packages
pnpm build

# Run specific service
pnpm --filter @insurance/api dev
pnpm --filter @insurance/data-service dev
pnpm --filter @insurance/orchestrator dev
```

## 🧪 Testing

### Backend (Python)

```bash
cd apps/backend
pytest -v --cov=app --cov-report=term-missing
```

### TypeScript Services

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @insurance/api test
```

## 🐳 Docker Services

The platform uses Docker Compose for infrastructure services:

```yaml
services:
  - postgres:5432    # Primary database
  - redis:6379       # Cache and sessions
```

### Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f

# Reset database
docker compose down -v
docker compose up -d
```

## 📚 Documentation

- **Backend API**: [apps/backend/README.md](./apps/backend/README.md)
- **Database Schema**: [apps/backend/docs/DATABASE_SCHEMA.md](./apps/backend/docs/DATABASE_SCHEMA.md)
- **Quick Start Guide**: [apps/backend/QUICKSTART.md](./apps/backend/QUICKSTART.md)
- **Phase 1.1 Completion**: [apps/backend/PHASE_1.1_COMPLETION.md](./apps/backend/PHASE_1.1_COMPLETION.md)

## 🎯 Development Phases

### ✅ Phase 1.1 - Core Backend & Database Foundations (COMPLETE)
- FastAPI backend with CRUD operations
- PostgreSQL database with SQLAlchemy
- Alembic migrations
- Comprehensive testing
- API documentation

### 🚧 Phase 1.2 - Frontend Foundation (In Progress)
- Next.js application setup
- Component library
- State management
- API integration

### 📋 Phase 1.3 - Authentication & Authorization (Planned)
- JWT authentication
- Role-based access control (RBAC)
- User management
- Session handling

### 📋 Phase 2 - AI Integration (Planned)
- LLM integration for lead scoring
- Natural language processing
- Automated lead qualification
- Intelligent recommendations

## 🛠️ Technology Stack

### Backend (FastAPI)
- **Framework**: FastAPI 0.109.0
- **Database**: PostgreSQL 15
- **ORM**: SQLAlchemy 2.0.25 (async)
- **Migrations**: Alembic 1.13.1
- **Validation**: Pydantic 2.5.3
- **Testing**: pytest 7.4.4

### TypeScript Services
- **Runtime**: Node.js 20+
- **Package Manager**: pnpm 8+
- **Build Tool**: Turbo
- **Language**: TypeScript 5+

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **CI/CD**: GitHub Actions

## 📊 API Status

| Service | Status | Port | Documentation |
|---------|--------|------|---------------|
| Backend API (FastAPI) | ✅ Live | 8000 | [Docs](http://localhost:8000/docs) |
| Main API (TypeScript) | 🚧 Planned | 3000 | - |
| Data Service | 🚧 Planned | 3001 | - |
| Orchestrator | 🚧 Planned | 3002 | - |

## 🔐 Environment Configuration

Each service has its own environment configuration:

### Backend
```bash
# apps/backend/.env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/leadgen_db
APP_NAME="Lead Generation Insurance Platform"
DEBUG=True
PORT=8000
```

### TypeScript Services
```bash
# .env (root)
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/leadgen_db
REDIS_URL=redis://localhost:6379
```

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Add/update tests
4. Ensure all tests pass
5. Update documentation
6. Submit a pull request

### Code Style

- **Python**: Follow PEP 8, use type hints
- **TypeScript**: Use ESLint and Prettier (configured)
- **Commits**: Follow Conventional Commits

## 📝 Scripts & Commands

### Backend (Python)
```bash
cd apps/backend
make help          # Show available commands
make dev           # Set up development environment
make run           # Start development server
make test          # Run tests
make migrate       # Apply database migrations
```

### Monorepo (TypeScript)
```bash
pnpm install       # Install all dependencies
pnpm build         # Build all packages
pnpm test          # Run all tests
pnpm lint          # Lint all packages
pnpm clean         # Clean build artifacts
```

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

## 📈 Project Status

| Component | Status | Version | Last Updated |
|-----------|--------|---------|--------------|
| Backend API | ✅ Production Ready | 1.0.0 | Dec 2024 |
| Database Schema | ✅ Complete | 1.0.0 | Dec 2024 |
| TypeScript API | 🚧 In Development | 0.1.0 | - |
| Frontend | 📋 Planned | - | - |
| AI Services | 📋 Planned | - | - |

## 📄 License

[Your License Here]

## 📞 Support

For issues and questions:
- Open an issue in the repository
- Check the documentation in each service's directory
- Review the troubleshooting guide above

## 🎯 Next Milestones

1. **Phase 1.2**: Frontend foundation with Next.js
2. **Phase 1.3**: Authentication and authorization
3. **Phase 2.1**: AI integration for lead scoring
4. **Phase 2.2**: Advanced analytics and reporting
5. **Phase 3**: Production deployment and monitoring

---

**Current Focus**: Phase 1.1 Complete ✅ | Working on Phase 1.2 🚧
