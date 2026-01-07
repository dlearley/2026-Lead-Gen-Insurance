# Testing Guide

## Phase 6: Testing & Validation - Comprehensive Testing Documentation

This document provides comprehensive testing guidance for the Insurance Lead Gen AI platform, covering unit testing, integration testing, E2E testing, performance testing, security testing, accessibility testing, and compliance testing.

---

## Table of Contents

1. [Test Organization](#test-organization)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [End-to-End Testing](#end-to-end-testing)
5. [Performance Testing](#performance-testing)
6. [Security Testing](#security-testing)
7. [Accessibility Testing](#accessibility-testing)
8. [Compliance Testing](#compliance-testing)
9. [CI/CD Integration](#cicd-integration)
10. [Quality Metrics](#quality-metrics)

---

## Test Organization

### Directory Structure

```
/home/engine/project
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── __tests__/
│   │   │   │   ├── setup.ts          # Test configuration
│   │   │   │   ├── validation.test.ts
│   │   │   │   ├── middleware.test.ts
│   │   │   │   └── leads.routes.test.ts
│   │   │   └── routes/
│   │   └── jest.config.ts
│   ├── data-service/
│   │   ├── src/
│   │   │   ├── __tests__/
│   │   │   │   ├── setup.ts
│   │   │   │   ├── repositories.test.ts
│   │   │   │   └── carrier-service.test.ts
│   ├── orchestrator/
│   │   ├── src/
│   │   │   ├── __tests__/
│   │   │   │   ├── setup.ts
│   │   │   │   ├── queue.service.test.ts
│   │   │   │   └── enrichment.service.test.ts
│   ├── frontend/
│   │   ├── components/__tests__/
│   │   │   ├── Button.test.tsx
│   │   │   ├── Input.test.tsx
│   │   │   └── Modal.test.tsx
│   │   ├── services/__tests__/
│   │   │   └── auth.service.test.ts
│   │   ├── e2e/
│   │   │   ├── test-utils.ts
│   │   │   ├── auth.spec.ts
│   │   │   ├── leads.spec.ts
│   │   │   └── policies.spec.ts
│   │   └── playwright.config.ts
├── packages/
│   ├── config/src/test-utils.ts       # Test factories & utilities
├── testing/
│   ├── performance/
│   │   └── load-test.js              # k6 load tests
│   ├── security/
│   │   └── config.ts                 # OWASP ZAP configuration
│   └── accessibility/
│       └── accessibility.spec.ts     # WCAG 2.1 AA tests
└── docs/
    └── testing/
        └── TESTING_GUIDE.md
```

### Test Naming Conventions

- **Unit Tests**: `{feature}.test.ts` or `{feature}.test.tsx`
- **Integration Tests**: `{feature}.integration.test.ts`
- **E2E Tests**: `{feature}.spec.ts`
- **Test Files**: Co-located with source code in `__tests__` directories

---

## Unit Testing

### Framework Configuration

#### API (Jest with ts-jest)

```typescript
// apps/api/jest.config.ts
export default {
  displayName: 'api',
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

#### Frontend (Vitest)

```typescript
// apps/frontend/vitest.config.ts
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

### Test Utilities & Factories

```typescript
// packages/config/src/test-utils.ts

// Lead factory
export function createLeadFactory(input: TestLeadInput = {}): Lead {
  return {
    id: `lead_${faker.string.nanoid(16)}`,
    source: input.source ?? faker.helpers.arrayElement(['web_form', 'api', 'phone']),
    email: input.email ?? faker.internet.email(),
    // ... other fields
  };
}

// Agent factory
export function createAgentFactory(input: TestAgentInput = {}): Agent {
  return {
    id: `agent_${faker.string.nanoid(12)}`,
    firstName: input.firstName ?? faker.person.firstName(),
    lastName: input.lastName ?? faker.person.lastName(),
    // ... other fields
  };
}

// Batch creation
export function createLeadBatch(count: number, baseInput: TestLeadInput = {}): Lead[] {
  return Array.from({ length: count }, () => createLeadFactory(baseInput));
}
```

### Test Patterns

#### Arrange-Act-Assert Pattern

```typescript
describe('LeadService', () => {
  describe('createLead', () => {
    it('should create a lead with valid data', async () => {
      // Arrange
      const leadData = createLeadFactory({ source: 'web_form' });
      mockRepository.create.mockResolvedValue(leadData);
      
      // Act
      const result = await service.createLead(leadData);
      
      // Assert
      expect(result).toEqual(leadData);
      expect(mockRepository.create).toHaveBeenCalledWith(leadData);
    });
  });
});
```

#### Testing Error Scenarios

```typescript
describe('LeadService', () => {
  describe('createLead', () => {
    it('should throw error for invalid email', async () => {
      const invalidData = { ...createLeadFactory(), email: 'invalid-email' };
      
      await expect(service.createLead(invalidData))
        .rejects.toThrow(ValidationError);
    });
  });
});
```

### Coverage Requirements

| Component | Coverage Target |
|-----------|----------------|
| Controllers | 90% |
| Services | 85% |
| Middleware | 85% |
| Utilities | 75% |
| Overall | 80% |

---

## Integration Testing

### Database Integration Tests

```typescript
describe('LeadRepository Integration', () => {
  let repository: InMemoryLeadRepository;

  beforeEach(() => {
    repository = new InMemoryLeadRepository();
  });

  it('should persist leads across operations', async () => {
    const lead = await repository.create({ source: 'test' });
    const found = await repository.findById(lead.id);
    
    expect(found).toEqual(lead);
  });

  it('should filter leads by status', async () => {
    await repository.create({ source: 'test', status: 'RECEIVED' });
    await repository.create({ source: 'test', status: 'QUALIFIED' });
    
    const received = await repository.findMany({ where: { status: 'RECEIVED' }});
    expect(received).toHaveLength(1);
  });
});
```

### API Integration Tests

```typescript
describe('Lead Routes Integration', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    // Setup routes
    app.post('/api/v1/leads', leadRoutes);
    app.get('/api/v1/leads', leadRoutes);
  });

  it('should create and retrieve leads', async () => {
    // Create lead
    const createResponse = await request(app)
      .post('/api/v1/leads')
      .send({ source: 'web_form', email: 'test@example.com' })
      .expect(201);

    const leadId = createResponse.body.id;

    // Retrieve lead
    const getResponse = await request(app)
      .get(`/api/v1/leads/${leadId}`)
      .expect(200);

    expect(getResponse.body.id).toBe(leadId);
  });
});
```

---

## End-to-End Testing

### Playwright Configuration

```typescript
// apps/frontend/playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }},
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }},
    { name: 'webkit', use: { ...devices['Desktop Safari'] }},
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] }},
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] }},
  ],
});
```

### Critical User Workflows

```typescript
// e2e/leads.spec.ts
test.describe('Lead Management', () => {
  test('should create, view, edit, and delete a lead', async ({ authenticatedPage }) => {
    // Create
    await authenticatedPage.click('button:has-text("New Lead")');
    await authenticatedPage.fill('input[name="firstName"]', 'John');
    await authenticatedPage.fill('input[name="email"]', 'john@example.com');
    await authenticatedPage.click('button:has-text("Create Lead")');
    await expect(authenticatedPage.locator('text=Lead created')).toBeVisible();

    // View
    await authenticatedPage.click('text=John');
    await expect(authenticatedPage.locator('h1')).toContainText('John');

    // Edit
    await authenticatedPage.click('button:has-text("Edit")');
    await authenticatedPage.selectOption('select[name="status"]', 'qualified');
    await authenticatedPage.click('button:has-text("Save")');
    await expect(authenticatedPage.locator('text=Lead updated')).toBeVisible();

    // Delete
    await authenticatedPage.click('button[aria-label="Delete"]');
    await authenticatedPage.click('button:has-text("Confirm")');
    await expect(authenticatedPage.locator('text=Lead deleted')).toBeVisible();
  });
});
```

---

## Performance Testing

### k6 Load Test Configuration

```javascript
// testing/performance/load-test.js
export const options = {
  scenarios: {
    baseline: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 10 },
        { duration: '5m', target: 10 },
        { duration: '2m', target: 0 },
      ],
    },
    peak_load: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 20 },
        { duration: '5m', target: 20 },
        { duration: '2m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};
```

### Performance Targets

| Metric | Target |
|--------|--------|
| API Response Time (p95) | < 500ms |
| API Response Time (p99) | < 1000ms |
| Error Rate | < 1% |
| Lead Creation Time | < 1s |
| Page Load Time | < 3s |

---

## Security Testing

### OWASP Top 10 Testing

```typescript
// testing/security/config.ts
export const OWASP_TESTS = {
  'Injection': [
    {
      name: 'SQL Injection in lead search',
      test: async (request) => {
        const response = await request.get('/api/v1/leads?search=test\' OR \'1\'=\'1');
        return {
          passed: response.status === 400 || !response.body.includes('error'),
          evidence: response.status,
        };
      },
    },
  ],
  'Broken Access Control': [
    {
      name: 'IDOR - Access another user lead',
      test: async (request) => {
        const response = await request.get('/api/v1/leads/user-123');
        return { passed: response.status === 403 };
      },
    },
  ],
};
```

### Security Requirements

| Vulnerability | Severity | Allowed in Production |
|--------------|----------|----------------------|
| Critical | 0 | No |
| High | 0 | No |
| Medium | 0 | No (with mitigation plan) |
| Low | 5 | Yes |

---

## Accessibility Testing

### WCAG 2.1 Level AA Requirements

```typescript
// testing/accessibility/accessibility.spec.ts
test.describe('Accessibility', () => {
  test('meets color contrast requirements', async ({ page }) => {
    await page.goto('/login');
    
    const accessibilityScan = await new AxeBuilder({ page })
      .withTags(['cat.color'])
      .analyze();
    
    expect(accessibilityScan.violations).toEqual([]);
  });

  test('can navigate with keyboard', async ({ page }) => {
    await page.goto('/login');
    
    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="email"]')).toBeFocused();
  });
});
```

### Accessibility Requirements

| Criterion | Target |
|-----------|--------|
| Color Contrast | 4.5:1 (normal text) |
| Keyboard Navigation | All functionality |
| Screen Reader | Compatible |
| Focus Indicator | Visible |
| Form Labels | Associated |

---

## Compliance Testing

### GDPR Compliance

```typescript
describe('GDPR Compliance', () => {
  it('should export user data on request', async () => {
    const response = await request(app)
      .get('/api/v1/gdpr/export')
      .set('Authorization', 'Bearer user-token');
    
    expect(response.body).toContainAllKeys(['profile', 'leads', 'activity']);
  });

  it('should delete user data on request', async () => {
    const response = await request(app)
      .delete('/api/v1/gdpr/delete')
      .set('Authorization', 'Bearer user-token');
    
    expect(response.status).toBe(204);
    
    // Verify deletion
    const verifyResponse = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer user-token');
    
    expect(verifyResponse.status).toBe(404);
  });
});
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/testing.yml
name: Testing

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test --filter=api --filter=data-service --filter=orchestrator
      - uses: codecov/codecov-action@v3
        with:
          directory: ./coverage

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --filter=frontend
      - run: pnpm test --filter=frontend

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test:e2e
        env:
          PLAYWRIGHT_BASE_URL: http://localhost:3000

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install -g k6
      - run: k6 run testing/performance/load-test.js
        env:
          BASE_URL: ${{ secrets.PERF_TEST_URL }}

  accessibility-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm test:accessibility
```

### Coverage Reporting

```yaml
- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    directory: ./coverage
    fail_ci_if_error: false
    flags: unittests
    name: codecov-umbrella
```

---

## Quality Metrics

### Test Coverage Dashboard

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Overall Coverage | 75% | 80% | 🟡 |
| API Routes | 85% | 90% | 🟡 |
| Services | 78% | 85% | 🟡 |
| Repositories | 82% | 90% | 🟡 |
| Utilities | 70% | 75% | 🟡 |
| Components | 65% | 70% | 🟡 |

### Test Execution Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Unit Tests Duration | < 5 min | 2 min |
| Integration Tests Duration | < 10 min | 5 min |
| E2E Tests Duration | < 30 min | 15 min |
| Flaky Tests | 0 | 0 |

### Defect Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Defect Density | < 5 per 1000 LOC | 2.3 |
| Escape Rate | < 5% | 2.1% |
| Mean Time to Detect | < 24 hours | 12 hours |

---

## Running Tests

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific package
pnpm test --filter=api

# Run in watch mode
pnpm test:watch
```

### Integration Tests

```bash
# Run integration tests
pnpm test:integration

# Run with debug
pnpm test:integration --debug
```

### E2E Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run specific browser
pnpm test:e2e --project=chromium

# Run with UI
pnpm test:e2e --project=chromium --reporter=list
```

### Performance Tests

```bash
# Run baseline load test
k6 run testing/performance/load-test.js

# Run peak load test
k6 run -e SCENARIO=peak_load testing/performance/load-test.js

# Run stress test
k6 run -e SCENARIO=stress testing/performance/load-test.js
```

### Security Tests

```bash
# Run OWASP ZAP scan
docker run -v $(pwd)/testing/security:/zap/wrk:rw \
  owasp/zap2docker-stable zap-full-scan.py \
  -t http://localhost:3000 \
  -J zap-report.json
```

### Accessibility Tests

```bash
# Run accessibility tests
pnpm test:accessibility

# Generate accessibility report
pnpm test:accessibility --reporter=html
```

---

## Best Practices

### Writing Maintainable Tests

1. **Follow AAA Pattern**: Arrange, Act, Assert
2. **Use Test Factories**: Avoid hardcoded test data
3. **Test in Isolation**: Each test should be independent
4. **Descriptive Names**: Use descriptive test names
5. **Avoid Test Interdependencies**: Tests should run in any order
6. **Keep Tests Fast**: Each unit test should complete in < 100ms
7. **Mock External Dependencies**: Use mocks for databases, APIs

### Avoiding Flaky Tests

1. **Use Proper Waits**: Wait for elements to be visible/interactive
2. **Avoid Hardcoded Sleeps**: Use explicit waits
3. **Clean Up Test Data**: Delete created data after tests
4. **Handle Async Operations**: Properly await async operations
5. **Use Unique Test Data**: Avoid data collisions

### Test Data Management

```typescript
// Use factories for consistent test data
const lead = createLeadFactory({ 
  source: 'web_form',
  email: `test-${Date.now()}@example.com`
});

// Use beforeEach to reset state
beforeEach(() => {
  testStore.clear();
  testStore.seed();
});
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Tests timing out | Increase timeout or optimize test |
| Flaky tests | Add explicit waits, check for race conditions |
| Coverage not reported | Verify coverage config is correct |
| E2E tests failing | Check if app is running, verify selectors |
| Memory leaks in tests | Cleanup after each test, use fresh context |

### Debugging Tips

1. **Run single test**: `pnpm test --testNamePattern="test name"`
2. **Debug output**: Add `console.log` statements
3. **Verbose output**: `pnpm test --verbose`
4. **Debug specific package**: `cd apps/api && pnpm test`

---

## References

- [Jest Documentation](https://jestjs.io/docs)
- [Playwright Documentation](https://playwright.dev/docs)
- [Vitest Documentation](https://vitest.dev/guide)
- [k6 Documentation](https://k6.io/docs)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [WCAG 2.1 Guidelines](https://www.w3.org/TR/WCAG21/)
