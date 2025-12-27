# Run 8.2: Build and Type-Check Fix

## Overview

This run fixes build and type-check errors in the Insurance Lead Gen AI Platform by:
1. Building shared packages in dependency order (types → core → config)
2. Generating the Prisma client for data-service
3. Building all applications (data-service, api, orchestrator)

## Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0 (or pnpm >= 8.0.0)
- TypeScript >= 5.3.3

## Build Order

The build must follow this order due to dependencies:

1. **@insurance-lead-gen/types** (no dependencies) - `packages/types/`
2. **@insurance-lead-gen/core** (depends on types) - `packages/core/`
3. **@insurance-lead-gen/config** (depends on types) - `packages/config/`
4. **@insurance-lead-gen/data-service** (depends on all packages + Prisma) - `apps/data-service/`
5. **@insurance-lead-gen/api** (depends on packages) - `apps/api/`
6. **@insurance-lead-gen/orchestrator** (depends on packages) - `apps/orchestrator/`

## Commands

### Manual Build (if Node/npm are available)

```bash
# Step 1: Build packages
cd /home/engine/project
npx tsc -p packages/types/tsconfig.json --pretty
npx tsc -p packages/core/tsconfig.json --pretty
npx tsc -p packages/config/tsconfig.json --pretty

# Step 2: Generate Prisma client
cd /home/engine/project/apps/data-service
npx prisma generate

# Step 3: Build applications
cd /home/engine/project
npx tsc -p apps/data-service/tsconfig.json --pretty
npx tsc -p apps/api/tsconfig.json --pretty
npx tsc -p apps/orchestrator/tsconfig.json --pretty
```

### Alternative: Using Docker

```bash
# Build using Docker
docker run -it --rm \
  -v /home/engine/project:/app \
  -w /app \
  node:20-alpine \
  sh -c "npm install -g typescript prisma && npx tsc -p packages/types/tsconfig.json"
```

## Expected Output

After successful build, you should see `dist/` directories:

```
/home/engine/project/
├── packages/types/dist/
│   ├── index.d.ts
│   └── index.js
├── packages/core/dist/
│   ├── index.d.ts
│   ├── index.js
│   └── monitoring/
├── packages/config/dist/
│   ├── index.d.ts
│   └── index.js
├── apps/data-service/dist/
│   ├── index.d.ts
│   ├── index.js
│   └── ...
├── apps/api/dist/
│   ├── index.d.ts
│   └── index.js
└── apps/orchestrator/dist/
    ├── index.d.ts
    └── index.js
```

## Verification

### Check Packages Build

```bash
# Verify dist directories exist
ls -la /home/engine/project/packages/types/dist/
ls -la /home/engine/project/packages/core/dist/
ls -la /home/engine/project/packages/config/dist/
```

### Check Prisma Client Generated

```bash
# Check Prisma client exists
ls -la /home/engine/project/node_modules/.prisma/client/ 2>/dev/null || \
ls -la /home/engine/project/apps/data-service/node_modules/.prisma/client/ 2>/dev/null
```

### Type Check

```bash
# Type check all packages
cd /home/engine/project
npx tsc -p packages/types/tsconfig.json --noEmit
npx tsc -p packages/core/tsconfig.json --noEmit
npx tsc -p packages/config/tsconfig.json --noEmit
npx tsc -p apps/data-service/tsconfig.json --noEmit
npx tsc -p apps/api/tsconfig.json --noEmit
npx tsc -p apps/orchestrator/tsconfig.json --noEmit
```

## Common Issues

### Issue: Cannot find module '@insurance-lead-gen/types'

**Cause**: Package not built yet  
**Solution**: Build packages in order (types → core → config)

### Issue: Cannot find module '@prisma/client'

**Cause**: Prisma client not generated  
**Solution**: Run `npx prisma generate` in data-service directory

### Issue: Type errors in core package

**Cause**: Missing types package types  
**Solution**: Ensure types package is built first

### Issue: Circular dependency warnings

**Cause**: Package dependencies  
**Solution**: This is expected; build order prevents issues

## Files Modified by This Run

None - this run only builds existing code. No source files are modified.

## Status

- [ ] Build @insurance-lead-gen/types
- [ ] Build @insurance-lead-gen/core  
- [ ] Build @insurance-lead-gen/config
- [ ] Generate Prisma client
- [ ] Build @insurance-lead-gen/data-service
- [ ] Build @insurance-lead-gen/api
- [ ] Build @insurance-lead-gen/orchestrator
- [ ] Verify all dist/ directories exist
- [ ] Run type-check to verify no errors
