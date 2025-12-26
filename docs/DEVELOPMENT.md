# Development Guide

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 20.0.0
- **pnpm** >= 8.0.0 (install with `npm install -g pnpm`)
- **Docker** & **Docker Compose**
- **Git**

### Initial Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd insurance-lead-gen-ai
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configurations:
   - Database credentials
   - API keys (OpenAI, etc.)
   - Service ports
   - Security secrets

4. **Start development environment**

   ```bash
   pnpm dev
   ```

   This command will:
   - Start all Docker services (PostgreSQL, Redis, Neo4j, Qdrant, NATS)
   - Start all development apps in watch mode

## 🛠️ Development Workflow

### Starting Individual Services

```bash
# Start only infrastructure
pnpm dev:services

# Start only apps (assuming services are running)
pnpm dev:apps

# Start specific apps
pnpm --filter @insurance-lead-gen/api dev
pnpm --filter @insurance-lead-gen/data-service dev
pnpm --filter @insurance-lead-gen/orchestrator dev
```

### Common Development Tasks

```bash
# Install new dependency in specific app
pnpm --filter @insurance-lead-gen/api add express

# Install shared dependency
pnpm --filter @insurance-lead-gen/core add winston

# Run linting
pnpm lint

# Fix linting issues
pnpm lint:fix

# Type check
pnpm type-check

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Clean all builds
pnpm clean

# Build all packages
pnpm build
```

## 📂 Project Structure Deep Dive

### Monorepo Organization

```
insurance-lead-gen-ai/
├── apps/
│   ├── api/                     # REST API service (NestJS)
│   │   ├── src/
│   │   │   ├── controllers/     # HTTP controllers
│   │   │   ├── services/        # Business logic
│   │   │   ├── dto/             # Data transfer objects
│   │   │   ├── guards/          # Auth guards
│   │   │   └── main.ts          # Application bootstrap
│   │   ├── test/
│   │   ├── package.json         # Service dependencies
│   │   ├── tsconfig.json        # TypeScript config
│   │   └── jest.config.js       # Test config
│   │
│   ├── data-service/            # Data processing service
│   │   ├── src/
│   │   │   ├── processors/      # Lead processors
│   │   │   ├── repositories/    # Data access
│   │   │   ├── queues/          # Job queue handlers
│   │   │   └── index.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma    # Database schema
│   │   └── ...
│   │
│   └── orchestrator/            # AI workflow orchestration
│       ├── src/
│       │   ├── workflows/       # AI workflows
│       │   ├── agents/          # LangChain agents
│       │   ├── prompts/         # LLM prompts
│       │   └── index.ts
│       └── ...
│
├── packages/
│   ├── core/                    # Shared utilities
│   │   ├── src/
│   │   │   ├── logger.ts        # Winston logger
│   │   │   ├── errors.ts        # Custom errors
│   │   │   ├── validators.ts    # Common validators
│   │   │   └── index.ts
│   │   └── ...
│   │
│   ├── types/                   # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── lead.types.ts    # Lead data structures
│   │   │   ├── agent.types.ts   # Agent data structures
│   │   │   ├── events.types.ts  # Event definitions
│   │   │   └── index.ts
│   │   └── ...
│   │
│   └── config/                  # Shared configuration
│       ├── src/
│       │   ├── env.ts           # Environment validation
│       │   ├── database.ts      # DB configuration
│       │   ├── redis.ts         # Redis configuration
│       │   └── index.ts
│       └── ...
│
├── docs/                        # Documentation
│   ├── ARCHITECTURE.md          # System architecture
│   ├── TECH_STACK.md            # Technology choices
│   ├── DEVELOPMENT.md           # This file
│   └── PHASES.md                # Implementation roadmap
│
├── docker-compose.yml           # Local services
├── package.json                 # Root dependencies
├── turbo.json                   # Build orchestration
├── tsconfig.json                # Root TypeScript config
└── ...
```

## 🚧 Development Commands

### Docker Services Management

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View service logs
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f neo4j
docker-compose logs -f qdrant
docker-compose logs -f nats

# Restart specific service
docker-compose restart postgres

# Stop specific service
docker-compose stop redis

# View service status
docker-compose ps

# Reset all data (WARNING: Deletes all volumes)
docker-compose down -v
```

### Database Management

```bash
# Generate Prisma types (from data-service directory)
cd apps/data-service
pnpm db:generate

# Push schema changes to database
pnpm db:push

# Open Prisma Studio (GUI)
pnpm db:studio

# Create migration (when needed)
pnpm prisma migrate dev --name <migration_name>

# Reset database (WARNING: Deletes all data)
pnpm prisma migrate reset
```

### Debug Mode

```bash
# Debug API service with Node.js inspector
node --inspect apps/api/dist/index.js

# Or using tsx
tsx --inspect apps/api/src/index.ts

# Then connect with Chrome DevTools
# Visit chrome://inspect
```

## 🧪 Testing Strategy

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific app's tests
pnpm --filter @insurance-lead-gen/api test

# Run specific test file
pnpm --filter @insurance-lead-gen/api test lead.test.ts

# Run e2e tests (when available)
pnpm test:e2e
```

### Test Structure

```
test/
├── unit/              # Unit tests
│   ├── *.test.ts      # Test files
│   └── __mocks__/     # Mock modules
├── integration/       # Integration tests
│   └── *.test.ts
└── e2e/              # End-to-end tests
    └── *.spec.ts
```

### Writing Tests

```typescript
// Example unit test
import { LeadService } from '../src/services/lead.service';

describe('LeadService', () => {
  let service: LeadService;

  beforeEach(() => {
    service = new LeadService();
  });

  it('should create a lead', async () => {
    const lead = await service.createLead({
      email: 'test@example.com',
      phone: '+1234567890',
      source: 'facebook_app',
    });

    expect(lead).toBeDefined();
    expect(lead.email).toBe('test@example.com');
  });
});

// Example integration test
import request from 'supertest';
import { app } from '../src/app';

describe('Lead API', () => {
  it('POST /api/v1/leads - should create a lead', async () => {
    const response = await request(app)
      .post('/api/v1/leads')
      .send({
        email: 'test@example.com',
        phone: '+1234567890',
        source: 'google_ads',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.status).toBe('received');
  });
});
```

## 🔧 Debugging Guide

### Common Issues

#### 1. Port Already in Use

```bash
# Find process using port
lsof -i :3000
# Kill the process
kill -9 <PID>
# Or use different port in .env
```

#### 2. Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check logs for errors
docker-compose logs postgres

# Verify connection string in .env
echo $DATABASE_URL

# Reset database if needed
docker-compose down -v
pnpm --filter @insurance-lead-gen/data-service db:push
```

#### 3. TypeScript Compilation Errors

```bash
# Run type check
pnpm type-check

# Clear build cache
pnpm clean
pnpm build
```

#### 4. Dependency Issues

```bash
# Clear pnpm store
pnpm store prune

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Debug Logging

Enable debug logging by setting environment variable:

```bash
# In .env
LOG_LEVEL=debug

# Or for specific service
LOG_LEVEL=debug pnpm --filter @insurance-lead-gen/api dev
```

### VS Code Debugging Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API",
      "runtimeExecutable": "tsx",
      "args": ["watch", "src/index.ts"],
      "cwd": "${workspaceFolder}/apps/api",
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "runtimeExecutable": "pnpm",
      "args": ["test", "--", "--runInBand", "--watchAll=false"],
      "console": "integratedTerminal"
    }
  ]
}
```

## 📦 Adding New Packages

### New Shared Package

1. **Create package directory:**

   ```bash
   mkdir -p packages/new-package/src
   ```

2. **Create package.json:**

   ```json
   {
     "name": "@insurance-lead-gen/new-package",
     "version": "0.1.0",
     "type": "module",
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "scripts": {
       "build": "tsc",
       "dev": "tsc --watch",
       "clean": "rm -rf dist"
     }
   }
   ```

3. **Add TypeScript config:**

   ```json
   {
     "extends": "../../tsconfig.json",
     "compilerOptions": {
       "outDir": "./dist",
       "rootDir": "./src"
     }
   }
   ```

4. **Import in other packages:**
   ```bash
   pnpm --filter @insurance-lead-gen/api add @insurance-lead-gen/new-package@workspace:*
   ```

### New App

Follow the same pattern as existing apps (api, data-service, orchestrator), adjusting for specific requirements.

## 📝 Code Style & Conventions

### Import Order

```typescript
// 1. Node.js built-ins
import { readFile } from 'fs/promises';
import path from 'path';

// 2. External packages
import express from 'express';
import { z } from 'zod';

// 3. Workspace packages
import { logger } from '@insurance-lead-gen/core';
import type { Lead } from '@insurance-lead-gen/types';

// 4. Relative imports
import { LeadService } from './services/lead.service';
import type { CreateLeadDto } from './dto/create-lead.dto';
```

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `lead.service.ts`)
- **Classes**: `PascalCase` (e.g., `class LeadService`)
- **Interfaces**: `PascalCase` with `I` prefix (e.g., `interface ILeadService`)
- **Types**: `PascalCase` (e.g., `type LeadStatus`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `const API_TIMEOUT = 5000`)
- **Functions**: `camelCase` (e.g., `function createLead()`)
- **Variables**: `camelCase` (e.g., `const leadData`)

### Error Handling

```typescript
// Custom errors
import { LeadProcessingError, ValidationError } from '@insurance-lead-gen/core';

try {
  const lead = await processLead(data);
} catch (error) {
  if (error instanceof ValidationError) {
    logger.warn('Invalid lead data', { error });
    throw new BadRequestException(error.message);
  }

  if (error instanceof LeadProcessingError) {
    logger.error('Failed to process lead', { error });
    throw new InternalServerErrorException();
  }

  logger.error('Unexpected error', { error });
  throw new InternalServerErrorException();
}
```

## 🎓 Learning Resources

### Frameworks & Libraries

- [NestJS Documentation](https://docs.nestjs.com/)
- [LangChain Concepts](https://js.langchain.com/docs/get_started/introduction)
- [Prisma ORM Guide](https://www.prisma.io/docs)
- [NATS Documentation](https://docs.nats.io/)

### Database Technologies

- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)
- [Neo4j Cypher Guide](https://neo4j.com/docs/cypher-manual/)
- [Redis Commands](https://redis.io/commands/)
- [Qdrant Vector Search](https://qdrant.tech/documentation/)

### Development Tools

- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Turborepo Pipelines](https://turbo.build/repo/docs)
- [Docker Compose Guide](https://docs.docker.com/compose/)

## 🤝 Getting Help

### Internal Resources

- Check this documentation first
- Review architecture diagrams in `/docs`
- Check existing code patterns in similar services

### External Support

- Create GitHub issue for bugs
- Ask questions in team chat
- Schedule architecture review for major changes
