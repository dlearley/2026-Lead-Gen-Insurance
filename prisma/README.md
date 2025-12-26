# Prisma Database Schema

This directory contains the Prisma schema definition for the Insurance Lead Generation AI Platform.

## Setup

1. Install Prisma CLI (if not already installed):
```bash
pnpm add -D prisma
```

2. Generate Prisma client:
```bash
pnpm db:generate
```

3. Push schema to database:
```bash
pnpm db:push
```

4. Open Prisma Studio:
```bash
pnpm db:studio
```

## Models

- **Lead**: Stores lead information with status tracking
- **Agent**: Stores insurance agent profiles and performance metrics
- **LeadAssignment**: Tracks lead-to-agent assignments and status
- **Event**: Event sourcing for all system events

## Migrations

Create a new migration:
```bash
pnpm db:migrate create <migration_name>
```

Apply migrations:
```bash
pnpm db:migrate deploy
```