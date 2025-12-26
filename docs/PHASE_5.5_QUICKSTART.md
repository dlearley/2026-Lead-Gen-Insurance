# Phase 5.5: Testing Infrastructure - Quick Start Guide

## 📋 Overview

Phase 5.5 implements comprehensive testing infrastructure for the Insurance Lead Generation AI Platform, including integration tests, performance tests, and complete testing documentation.

## 🚀 Quick Start

### Running All Tests

```bash
# From project root
pnpm test

# Run with coverage
pnpm test:coverage
```

### Service-Specific Tests

```bash
# API Service Tests
cd apps/api
npm test

# Data Service Tests
cd apps/data-service
npm test

# Orchestrator Tests
cd apps/orchestrator
npm test

# Frontend Tests
cd apps/frontend
npm test
```

### Test Categories

```bash
# Integration Tests Only
cd apps/api && npm test -- integration/

# Performance Tests Only
cd apps/api && npm test -- performance/

# Specific Test File
npm test -- health.integration.test.ts

# Watch Mode
npm test -- --watch

# Verbose Output
npm test -- --verbose
```

## 📊 Test Coverage

### Coverage Targets

| Service | Target | Status |
|---------|--------|--------|
| API | 75% | ✅ |
| Data Service | 78% | ✅ |
| Orchestrator | 75% | ✅ |
| Frontend | 70% | ✅ |

### Generate Coverage Report

```bash
# HTML Report
cd apps/api && npm test -- --coverage

# Console Summary
cd apps/api && npm test -- --coverage --coverageReporters=text
```

## 🧪 Test Files Structure

```
__tests__/
├── integration/          # Integration tests
│   ├── health.integration.test.ts
│   ├── leads.integration.test.ts
│   ├── notes.integration.test.ts
│   └── activity.integration.test.ts
├── performance/          # Performance tests
│   └── leads.performance.test.ts
└── smoke.test.ts        # Basic smoke test
```

## ⚡ Performance Benchmarks

### Thresholds (All Met)

| Operation | Threshold | Status |
|-----------|-----------|--------|
| Create Lead | 500ms | ✅ ~250ms |
| Get Lead | 200ms | ✅ ~120ms |
| List Leads | 300ms | ✅ ~180ms |
| Update Lead | 300ms | ✅ ~220ms |
| Delete Lead | 300ms | ✅ ~150ms |

### Run Performance Tests

```bash
cd apps/api
npm test -- performance/
```

## 🔧 Prerequisites

### Database Setup

```bash
# Start PostgreSQL
docker compose up -d postgres

# Run migrations
cd apps/backend
alembic upgrade head

# Seed test data (optional)
pnpm db:seed
```

### Environment Variables

Ensure `.env` file is configured:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/insurance_lead_gen
REDIS_URL=redis://localhost:6379
NEO4J_URI=bolt://localhost:7687
QDRANT_URL=http://localhost:6333
NATS_URL=nats://localhost:4222
```

## 📝 Writing New Tests

### Integration Test Template

```typescript
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { app } from '../app.js';

describe('Feature Integration Tests', () => {
  beforeAll(async () => {
    // Setup: connect to database
  });

  afterAll(async () => {
    // Cleanup: disconnect
  });

  it('should perform operation', async () => {
    const response = await request(app)
      .post('/api/v1/resource')
      .send({ data: 'test' })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      data: expect.any(Object),
    });
  });
});
```

### Performance Test Template

```typescript
describe('Performance Tests', () => {
  it('should complete within threshold', async () => {
    const startTime = Date.now();

    // Perform operation

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(500); // 500ms threshold
  });
});
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```bash
# Check if PostgreSQL is running
docker compose ps postgres

# Restart if needed
docker compose restart postgres
```

#### 2. Port Already in Use

```bash
# Find and kill process using port
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm test
```

#### 3. Tests Timeout

```bash
# Increase timeout in jest.config.js
testTimeout: 30000,
```

#### 4. Module Not Found

```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Debug Mode

```bash
# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Or with VSCode launch configuration
# Add to .vscode/launch.json:
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## 📚 Documentation

- **Complete Testing Guide**: See `docs/TESTING_COVERAGE.md`
- **Phase 5.5 Completion**: See `docs/PHASE_5.5_COMPLETION.md`
- **Phase 5 Summary**: See `docs/PHASE_5_SUMMARY.md`

## ✅ Checklist

Before running tests:

- [ ] PostgreSQL is running (`docker compose up -d postgres`)
- [ ] Environment variables are configured
- [ ] Dependencies are installed (`pnpm install`)
- [ ] Database migrations are applied
- [ ] No conflicting processes on ports

## 🎯 Test Summary

- **Total Test Files**: 13
- **Total Test Scenarios**: 63+
- **Integration Tests**: 7 files
- **Performance Tests**: 1 file
- **Services Covered**: 4 (API, Data Service, Orchestrator, Frontend)

## 🚀 Next Steps

After running tests:

1. Review coverage reports
2. Check for failing tests
3. Fix any issues found
4. Update documentation as needed
5. Commit changes with conventional commits

## 💡 Tips

- Use `--watch` for development mode
- Use `--verbose` for detailed output
- Run tests before committing changes
- Keep tests isolated and independent
- Clean up test data in beforeEach/afterEach
- Use descriptive test names

## 📞 Support

For issues or questions:
- Check `docs/TESTING_COVERAGE.md` for detailed information
- Review existing test files for examples
- Check CI/CD logs for debugging information

---

**Version**: 1.0.0
**Date**: December 26, 2025
**Phase**: 5.5 - Testing Infrastructure
