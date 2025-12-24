# Insurance Lead Generation AI Platform

AI-powered platform for automated insurance lead generation, qualification, and routing.

## 🚀 Overview

This monorepo contains a complete AI-driven insurance lead generation platform built with TypeScript, featuring multiple microservices orchestrating intelligent lead processing, qualification, and distribution.

## 📁 Project Structure

```
insurance-lead-gen-ai/
├── apps/
│   ├── api/              # REST API service (NestJS)
│   ├── data-service/     # Data processing & storage service
│   └── orchestrator/     # AI workflow orchestration
├── packages/
│   ├── core/            # Shared utilities & business logic
│   ├── types/           # TypeScript type definitions
│   └── config/          # Shared configuration & validation
├── docs/                 # Documentation
└── docker-compose.yml    # Local development infrastructure
```

## 🛠️ Tech Stack

- **Runtime**: Node.js 20+, TypeScript 5.3+
- **Framework**: NestJS (API), Express
- **Database**: PostgreSQL 16, Neo4j 5.x, Redis 7, Qdrant
- **Message Broker**: NATS
- **AI/ML**: OpenAI GPT-4, LangChain
- **Orchestration**: Turbo, pnpm workspaces
- **Testing**: Jest, Supertest
- **DevOps**: Docker, GitHub Actions

## 📖 Full Documentation

- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Technology Stack](./docs/TECH_STACK.md)
- [Development Guide](./docs/DEVELOPMENT.md)
- [Implementation Phases](./docs/PHASES.md)

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker & Docker Compose

### Setup

1. **Clone and install:**
   ```bash
   git clone <repository-url>
   cd insurance-lead-gen-ai
   pnpm install
   ```

2. **Environment setup:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start infrastructure:**
   ```bash
   pnpm dev:services
   ```

4. **Start all apps:**
   ```bash
   pnpm dev:apps
   ```

Or run everything at once:
```bash
pnpm dev
```

## 📦 Available Scripts

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

## 🚢 Services & Ports

- **API**: http://localhost:3000
- **Data Service**: http://localhost:3001
- **Orchestrator**: http://localhost:3002
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **Neo4j Browser**: http://localhost:7474
- **Qdrant**: http://localhost:6333
- **NATS**: localhost:4222

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

## 🎯 Implementation Phases

The project is implemented in 6 phases:

1. **Phase 1**: Tech Foundation ✅
2. **Phase 1.6**: Lead Communication & Activity Tracking (Current) ✅
3. **Phase 2**: Data Pipeline & Real-time Lead Processing
4. **Phase 3**: AI Lead Qualification & Scoring Engine
5. **Phase 4**: Multi-Agent Routing & Distribution
6. **Phase 5**: Analytics Dashboard & System Optimization
7. **Phase 6**: Production Deployment & Monitoring

See [Implementation Phases](./docs/PHASES.md) for detailed roadmap.

### ✨ Recently Completed: Phase 1.6

**Lead Communication, Notes & Activity Tracking System**
- ✅ Complete notes and comments API with rich text support
- ✅ Comprehensive activity timeline with filtering and search
- ✅ Email integration and history tracking
- ✅ Task management and follow-up system
- ✅ Notification system with user preferences
- ✅ Full REST API with authentication and permissions
- ✅ Database schema with Prisma ORM
- ✅ Comprehensive documentation and user guide

See [Communication Features](./docs/COMMUNICATION_FEATURES.md) for details.

## 🤝 Contributing

1. Create feature branch from `develop`
2. Make changes following our conventions
3. Run linting and tests: `pnpm lint && pnpm test`
4. Create pull request with conventional commit message
5. Ensure CI passes

## 📄 License

MIT License - see LICENSE file for details.

## 🛡️ Security

- All secrets managed via environment variables
- JWT-based authentication
- Rate limiting on all endpoints
- Input validation with Zod
- Helmet for security headers

## 📞 Support

For issues and questions:
- Create GitHub issue for bugs
- Check [Development Guide](./docs/DEVELOPMENT.md) for setup help
- See [Architecture Overview](./docs/ARCHITECTURE.md) for system understanding