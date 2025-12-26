# Testing Documentation

## Overview

This document provides comprehensive information about the testing infrastructure, test suites, and testing guidelines for the Insurance Lead Generation AI Platform.

## Test Architecture

### Test Types

1. **Unit Tests** - Test individual functions, classes, and components in isolation
2. **Integration Tests** - Test interactions between multiple components/services
3. **Performance Tests** - Validate system performance under various load conditions
4. **E2E Tests** - End-to-end testing of complete user workflows

### Testing Stack

- **Frontend**: Vitest + React Testing Library
- **Backend (Python)**: pytest
- **TypeScript Services**: Jest
- **Coverage**: Istanbul/NYC (Jest), Coverage.py (pytest)

## Project Test Structure

```
├── apps/
│   ├── api/
│   │   └── src/__tests__/
│   │       ├── integration/
│   │       │   ├── health.integration.test.ts
│   │       │   ├── leads.integration.test.ts
│   │       │   ├── notes.integration.test.ts
│   │       │   └── activity.integration.test.ts
│   │       ├── performance/
│   │       │   └── leads.performance.test.ts
│   │       └── smoke.test.ts
│   ├── data-service/
│   │   └── src/__tests__/
│   │       ├── integration/
│   │       │   ├── leads.repository.integration.test.ts
│   │       │   └── agents.repository.integration.test.ts
│   │       └── repositories.test.ts
│   ├── orchestrator/
│   │   └── src/__tests__/
│   │       └── routing.service.integration.test.ts
│   └── frontend/
│       ├── services/__tests__/
│       │   └── auth.service.test.ts
│       └── components/__tests__/
│           ├── Button.test.tsx
│           ├── Input.test.tsx
│           └── Modal.test.tsx
```

## Running Tests

### All Tests

```bash
# Run all tests across all services
pnpm test

# Run tests with coverage
pnpm test:coverage
```

### Service-Specific Tests

```bash
# API Service
cd apps/api && npm test

# Data Service
cd apps/data-service && npm test

# Orchestrator
cd apps/orchestrator && npm test

# Frontend
cd apps/frontend && npm test
```

### Specific Test Suites

```bash
# Integration tests only
pnpm test:integration

# Performance tests only
pnpm test:performance

# Unit tests only
pnpm test:unit
```

### Backend Python Tests

```bash
cd apps/backend
pytest -v
pytest --cov=app --cov-report=html
```

## Test Coverage Targets

| Service | Unit | Integration | E2E | Overall |
|---------|------|-------------|-----|---------|
| API | 80% | 70% | - | 75% |
| Data Service | 80% | 75% | - | 78% |
| Orchestrator | 80% | 70% | - | 75% |
| Frontend | 85% | 60% | 50% | 70% |
| Backend (Python) | 85% | - | - | 85% |

## Integration Test Suites

### API Service Integration Tests

#### 1. Health Integration Tests
- ✅ Health endpoint returns correct status
- ✅ Service version information
- ✅ 404 handling for non-existent routes

#### 2. Leads Integration Tests
- ✅ Create new lead
- ✅ Get lead by ID
- ✅ List leads with pagination
- ✅ Update lead
- ✅ Delete lead
- ✅ Filter leads by status and type
- ✅ Input validation

#### 3. Notes Integration Tests
- ✅ Create note for lead
- ✅ Get all notes for lead
- ✅ Update note
- ✅ Delete note
- ✅ Note validation

#### 4. Activity Integration Tests
- ✅ Get activity history
- ✅ Pagination support
- ✅ Filter by activity type
- ✅ Create activity record

### Data Service Integration Tests

#### 1. Lead Repository Tests
- ✅ Create lead with all fields
- ✅ Find lead by ID
- ✅ Find lead by email
- ✅ Find leads with filters
- ✅ Update lead
- ✅ Update lead status
- ✅ Update quality score
- ✅ Get high quality leads
- ✅ Get unassigned leads

#### 2. Agent Repository Tests
- ✅ Create agent with specializations
- ✅ Find agent by ID
- ✅ Find agent by email
- ✅ Get available agents by insurance type
- ✅ Get top performing agents
- ✅ Increment/decrement capacity
- ✅ Get agents by location

### Orchestrator Integration Tests

#### 1. Routing Service Tests
- ✅ Initialize with default config
- ✅ Get routing configuration
- ✅ Update routing configuration
- ✅ Route lead to best agent
- ✅ Handle no agents scenario
- ✅ Track agent routing history
- ✅ Reassign stale leads

## Performance Tests

### Performance Thresholds

| Operation | Threshold | Notes |
|-----------|-----------|-------|
| Create Lead | 500ms | Single lead creation |
| Get Lead | 200ms | Fetch single lead |
| List Leads | 300ms | Paginated list (10 items) |
| Update Lead | 300ms | Single update |
| Delete Lead | 300ms | Soft delete |

### Performance Test Scenarios

1. **Single Operation Performance**
   - Measures response time for individual operations
   - Validates against defined thresholds

2. **Bulk Operation Performance**
   - Tests concurrent operations (10 simultaneous)
   - Measures average time per operation

3. **Pagination Performance**
   - Large page sizes (100 items)
   - Deep pagination (skip=100, take=50)

4. **Filter Performance**
   - Complex filter combinations
   - Multiple simultaneous filter queries

## Writing New Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { someFunction } from './module';

describe('someFunction', () => {
  it('should return expected value', () => {
    const result = someFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### Integration Test Example

```typescript
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { app } from '../app.js';

describe('API Integration', () => {
  beforeAll(async () => {
    // Setup: connect to database
  });

  afterAll(async () => {
    // Cleanup: disconnect
  });

  it('should create resource', async () => {
    const response = await request(app)
      .post('/api/v1/resource')
      .send({ data: 'test' })
      .expect(201);

    expect(response.body.data).toMatchObject({
      id: expect.any(String),
      data: 'test',
    });
  });
});
```

### Performance Test Example

```typescript
describe('Performance', () => {
  it('should complete within threshold', async () => {
    const startTime = Date.now();

    // Perform operation

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(500); // 500ms threshold
  });
});
```

## Test Best Practices

### 1. Test Isolation
- Each test should be independent
- Clean up database state before/after tests
- Use beforeEach/afterEach hooks

### 2. Descriptive Names
```typescript
// Good
it('should create lead with valid data', () => {});

// Bad
it('works', () => {});
```

### 3. Arrange-Act-Assert Pattern
```typescript
it('should update lead status', async () => {
  // Arrange
  const leadId = await createTestLead();

  // Act
  await updateLeadStatus(leadId, 'QUALIFIED');

  // Assert
  const lead = await getLead(leadId);
  expect(lead.status).toBe('QUALIFIED');
});
```

### 4. Avoid Test Interdependence
- Don't rely on test execution order
- Each test should set up its own data
- Clean up after each test

### 5. Mock External Dependencies
- Use mocks for external APIs
- Mock database connections in unit tests
- Use real database for integration tests

## Continuous Integration

### Test Pipeline

1. **Lint Check** - ESLint/Prettier validation
2. **Type Check** - TypeScript compilation check
3. **Unit Tests** - Fast feedback loop
4. **Integration Tests** - Validate service interactions
5. **Coverage Report** - Ensure minimum coverage
6. **Build Check** - Verify build succeeds

### Coverage Gates

- Minimum coverage: 75%
- Failed tests block merge
- All tests must pass

## Troubleshooting

### Common Issues

#### 1. Tests Timeout
```bash
# Increase timeout in jest.config.js
testTimeout: 30000,
```

#### 2. Database Connection Issues
```bash
# Ensure Docker services are running
docker compose up -d

# Check database connection
pnpm test:db:check
```

#### 3. Port Conflicts
```bash
# Use different ports for parallel testing
DATA_SERVICE_PORT=3002 npm test
```

### Debugging Tests

```bash
# Run single test file
npm test -- leads.integration.test.ts

# Run with verbose output
npm test -- --verbose

# Run in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Test Data Management

### Seed Data
```bash
# Seed test database
pnpm db:seed:test

# Reset test database
pnpm db:reset:test
```

### Test Fixtures
```typescript
// Create reusable test data
export const createTestLead = async (overrides = {}) => {
  return await prisma.lead.create({
    data: {
      firstName: 'Test',
      lastName: 'Lead',
      email: 'test@example.com',
      ...overrides,
    },
  });
};
```

## Future Enhancements

- [ ] E2E test suite with Playwright
- [ ] Visual regression testing
- [ ] Load testing with k6
- [ ] Contract testing with Pact
- [ ] Mutation testing
- [ ] Automated test generation

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Pytest Documentation](https://docs.pytest.org/)
