# Smoke Test Suite

## Overview

This smoke test suite validates all critical user journeys and system components to ensure production readiness. These tests should be executed against the production environment before and after deployments.

## Test Categories

### 1. Health Checks
- Service health verification
- Database connectivity
- Cache connectivity
- Message broker connectivity
- Third-party service connectivity

### 2. Lead Management
- Lead creation
- Lead retrieval
- Lead updates
- Lead deletion
- Lead search and filtering

### 3. Insurance Quote Generation
- Quote request creation
- Quote calculation
- Quote retrieval
- Quote comparison

### 4. Agent Dashboard & Case Management
- Agent authentication
- Case assignment
- Case status updates
- Case notes and activities

### 5. Payment Processing
- Payment initiation
- Payment processing
- Payment confirmation
- Refund processing
- Payment history retrieval

### 6. Customer Communication
- Email sending
- SMS sending
- Voice call initiation
- Communication history

### 7. Admin Dashboard & Reporting
- Admin authentication
- Dashboard metrics
- Report generation
- User management

### 8. AI Processing
- Lead qualification
- Lead scoring
- Agent matching
- Workflow orchestration

## Running the Tests

### Run All Smoke Tests
```bash
npm run smoke:test
```

### Run Specific Test Suite
```bash
npm run smoke:test -- health
npm run smoke:test -- leads
npm run smoke:test -- quotes
npm run smoke:test -- payments
```

### Run with Custom Environment
```bash
export NODE_ENV=production
export API_BASE_URL=https://api.yourdomain.com
npm run smoke:test
```

## Test Configuration

Configuration is managed via environment variables:

- `API_BASE_URL`: Base URL of the API service
- `BACKEND_URL`: Base URL of the backend service
- `TEST_TIMEOUT`: Default test timeout (ms)
- `USE_REAL_DATA`: Whether to use test data or create new data
- `CLEANUP_AFTER_TESTS`: Whether to clean up test data after tests

## Continuous Integration

Smoke tests are automatically run:
- Before every production deployment
- After every production deployment
- Every hour as a cron job
- On-demand via CI/CD pipeline

## Alerting

Test failures trigger immediate alerts to:
- On-call engineering team
- QA team
- Product owner

## Maintenance

- Update tests when new critical paths are added
- Review test coverage quarterly
- Remove deprecated tests
- Update expected values as business rules change

## Troubleshooting

### Tests Failing Intermittently
- Check service health endpoints
- Verify network connectivity
- Review rate limiting configuration
- Check third-party service status

### Authentication Failures
- Verify JWT tokens are valid
- Check authentication service health
- Review user permissions

### Data Inconsistencies
- Verify database state
- Check for concurrent test runs
- Review test isolation

## Test Results

Test results are stored in:
- CI/CD pipeline logs
- Monitoring dashboard
- Email reports to stakeholders

## Coverage

Current critical path coverage: 100%

All critical user journeys have automated smoke tests.

## Next Steps

- Add visual regression tests
- Add E2E UI tests with Playwright
- Add performance regression tests
- Add accessibility tests
