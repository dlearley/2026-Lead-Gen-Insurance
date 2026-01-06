# Phase 26.7 Testing Documentation

## Overview
Comprehensive testing infrastructure for Phase 26 enterprise insurance integrations.

## Test Structure

```
tests/
├── integration/       # Integration tests (API, database, services)
├── performance/       # Load and performance tests (K6)
├── security/         # Security validation tests
├── uat/              # User acceptance test scripts
└── README.md         # This file
```

## Running Tests

### Unit Tests
```bash
# Run all unit tests
pnpm test

# Run with coverage
pnpm test -- --coverage

# Watch mode
pnpm test:watch
```

### Integration Tests
```bash
# Run integration tests for specific app
cd apps/api
pnpm test

# Run all integration tests
pnpm turbo test --filter='{apps/*}'
```

### Performance Tests (K6)
```bash
# Install K6 (if not installed)
# macOS: brew install k6
# Linux: https://k6.io/docs/getting-started/installation/

# Run load test
k6 run tests/performance/load-testing.k6.js

# Run with custom VUs and duration
k6 run --vus 100 --duration 5m tests/performance/load-testing.k6.js

# Run against staging
API_URL=https://staging.api.example.com k6 run tests/performance/load-testing.k6.js
```

### Security Tests
```bash
# Run security validation tests
pnpm test -- tests/security/

# OWASP ZAP scan (requires ZAP)
zap-cli quick-scan http://localhost:3000
```

## Test Coverage Requirements

### Phase 26.7 Targets
- **Unit Test Coverage**: ≥85%
- **Integration Test Coverage**: All critical workflows
- **Performance**: 
  - 1000 req/s sustained
  - p95 latency <200ms
  - Error rate <1%
- **Security**: Zero critical/high vulnerabilities

### Coverage Reports
Coverage reports are generated in `coverage/` directory:
- `coverage/lcov-report/index.html` - HTML report
- `coverage/lcov.info` - LCOV format
- `coverage/coverage-final.json` - JSON format

## Test Data Management

### Fixtures
Test fixtures are in `apps/*/src/__tests__/fixtures/`

### Database Seeding
```bash
# Seed test database
pnpm db:seed
```

### Cleanup
Tests should clean up their own data using `beforeEach`/`afterEach` hooks.

## Continuous Integration

### GitHub Actions
Tests run automatically on:
- Pull requests
- Pushes to main/develop
- Nightly builds

### Pre-commit Hooks
- Linting
- Type checking
- Unit tests for changed files

## UAT Testing

### Running UAT
1. Deploy to UAT environment
2. Follow scripts in `tests/uat/UAT_TEST_SCRIPTS.md`
3. Log issues in issue tracker
4. Obtain stakeholder sign-off

## Performance Baseline

### Current Targets
- **API Response Time (p95)**: <200ms
- **Database Queries (p95)**: <100ms
- **Throughput**: 1000+ req/s
- **Concurrent Users**: 10,000+ WebSocket connections

### Monitoring
Performance metrics are tracked in Grafana dashboards:
- `monitoring/grafana/dashboards/system-health.json`
- `monitoring/grafana/dashboards/business-metrics.json`

## Known Issues

### Test Environment
- Integration tests require Docker services running
- Performance tests should run against staging, not local

### Flaky Tests
- Document any flaky tests in GitHub issues
- Add retries or increase timeouts as needed

## Contributing

### Adding New Tests
1. Follow existing test structure
2. Use descriptive test names
3. Include setup/teardown
4. Add coverage for edge cases
5. Document complex test scenarios

### Test Best Practices
- Write isolated tests (no dependencies on other tests)
- Use factories/fixtures for test data
- Mock external services
- Test both success and failure paths
- Keep tests fast (<1s per test)
