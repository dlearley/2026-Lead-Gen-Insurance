# Quick Start Guide

## Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose
- PostgreSQL, Redis, NATS (via Docker)

## 1. Install Dependencies

```bash
pnpm install
```

## 2. Install Missing Runtime Dependencies

```bash
# Install compression and other Express middleware
pnpm add -w compression cors helmet cookie-parser body-parser

# Or add to individual services
cd apps/api && pnpm add compression cors helmet cookie-parser
cd apps/data-service && pnpm add compression cors helmet
```

## 3. Start Infrastructure

```bash
# Start PostgreSQL, Redis, NATS
docker-compose up -d postgres redis nats

# Wait for services to be ready
sleep 10
```

## 4. Setup Database

```bash
# Generate Prisma client
cd apps/data-service
pnpm prisma generate

# Run migrations
pnpm prisma db push

# Or use migration files if they exist
pnpm prisma migrate deploy
```

## 5. Run Services

### Option A: Using tsx (No Build Required - Fastest)

```bash
# Terminal 1 - Data Service
cd apps/data-service
npx tsx src/index.ts

# Terminal 2 - API Service
cd apps/api
npx tsx src/index.ts

# Terminal 3 - Orchestrator (optional)
cd apps/orchestrator
npx tsx src/index.ts
```

### Option B: Build and Run

```bash
# Build all packages (will have warnings, but should complete)
pnpm build

# Run built services
cd apps/data-service
node dist/index.js

# In another terminal
cd apps/api
node dist/index.js
```

## 6. Verify Services Are Running

```bash
# Check API service
curl http://localhost:3000/health

# Check data service
curl http://localhost:3001/health
```

## Environment Variables

Create `.env` files in each service directory:

### apps/api/.env
```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/insurance_leads
REDIS_URL=redis://localhost:6379
NATS_URL=nats://localhost:4222
NODE_ENV=development
```

### apps/data-service/.env
```env
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/insurance_leads
REDIS_URL=redis://localhost:6379
NATS_URL=nats://localhost:4222
NODE_ENV=development
```

## Troubleshooting

### Issue: "Cannot find module 'compression'"
**Solution**: Install missing dependencies
```bash
pnpm add compression cors helmet cookie-parser
```

### Issue: "Cannot find package '@insurance-lead-gen/types'"
**Solution**: Build the types package first
```bash
pnpm --filter @insurance-lead-gen/types build
```

### Issue: TypeScript errors prevent build
**Solution**: Use tsx to run without building
```bash
npx tsx apps/api/src/index.ts
```

### Issue: Database connection fails
**Solution**: Check Docker services are running
```bash
docker-compose ps
docker-compose up -d postgres
```

### Issue: Prisma client not generated
**Solution**: Generate Prisma client
```bash
cd apps/data-service
pnpm prisma generate
```

## Development Workflow

```bash
# Watch mode for types (in one terminal)
cd packages/types
pnpm build --watch

# Run API with auto-reload (in another terminal)
cd apps/api
npx tsx watch src/index.ts
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @insurance-lead-gen/api test

# Run with coverage
pnpm test:coverage
```

## Ports

- API Service: `3000`
- Data Service: `3001`
- Orchestrator: `3002`
- Frontend: `3003` (if applicable)
- PostgreSQL: `5432`
- Redis: `6379`
- NATS: `4222`

## Quick Commands

```bash
# Clean and rebuild everything
pnpm clean && pnpm install && pnpm build

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:push

# Lint code
pnpm lint

# Format code
pnpm format

# Type check
pnpm type-check
```

## Success Criteria

✅ Dependencies installed
✅ Docker services running
✅ Prisma client generated
✅ Services start without crashing
✅ Health endpoints respond

Once all services are running, you should see:
```
Data Service listening on port 3001
API Service listening on port 3000
Connected to PostgreSQL
Connected to Redis
Connected to NATS
```
