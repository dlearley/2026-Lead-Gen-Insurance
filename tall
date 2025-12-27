# Run 7.6 - Build and Type Check Fix

## Problem

The `run-7-6` branch (merge from Phase 6.3) has type-check errors due to:
1. Missing Prisma client generation
2. Packages not built (no dist/ directories)
3. Circular dependencies in type-check

## Solution

Follow these steps in order:

### Step 1: Build Packages

Build shared packages first (they don't have database dependencies):

```bash
cd /home/engine/project
pnpm --filter @insurance-lead-gen/types build
pnpm --filter @insurance-lead-gen/core build
pnpm --filter @insurance-lead-gen/config build
```

### Step 2: Generate Prisma Client

Generate the Prisma client for data-service:

```bash
cd /home/engine/project/apps/data-service
npx prisma generate
```

### Step 3: Build Data Service

Now build data-service (it has Prisma dependency):

```bash
cd /home/engine/project
pnpm --filter @insurance-lead-gen/data-service build
```

### Step 4: Build Other Apps

```bash
pnpm --filter @insurance-lead-gen/api build
pnpm --filter @insurance-lead-gen/orchestrator build
```

### Step 5: Run Type Check

```bash
pnpm type-check
```

## Why This Order?

1. **Packages first**: apps depend on shared packages
2. **Prisma client needed**: data-service uses Prisma which must be generated
3. **Type-safe builds**: Once packages are built, apps can type-check against them

## Verification

After these steps, verify:

```bash
# Check dist directories exist
ls packages/types/dist
ls packages/core/dist
ls packages/config/dist
ls apps/data-service/dist

# Verify type-check passes
pnpm type-check
```

## Quick One-Liner

To do it all in one go:

```bash
pnpm --filter @insurance-lead-gen/types build && \
pnpm --filter @insurance-lead-gen/core build && \
pnpm --filter @insurance-lead-gen/config build && \
cd apps/data-service && npx prisma generate && \
cd /home/engine/project && \
pnpm --filter @insurance-lead-gen/data-service build && \
pnpm --filter @insurance-lead-gen/api build && \
pnpm --filter @insurance-lead-gen/orchestrator build && \
pnpm type-check
```

## Notes

- Environment variables are already configured in `.env`
- Prisma schema is in `/home/engine/project/prisma/schema.prisma`
- The output goes to `../node_modules/@prisma/client` as configured in schema
