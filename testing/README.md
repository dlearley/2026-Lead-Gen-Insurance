# Comprehensive Testing Suite

This directory contains the complete testing infrastructure for the Insurance Lead Generation AI Platform.

## Testing Structure

### 📁 Directory Layout

```
testing/
├── unit/                 # Unit tests for individual components
├── integration/          # Integration tests for APIs and services
├── e2e/                 # End-to-end workflow tests
├── performance/         # Load and performance tests
├── security/            # Security and vulnerability tests
├── utils/              # Test utilities and helpers
├── fixtures/           # Test data and fixtures
├── mocks/              # Mock objects and stubs
├── config/             # Test configurations
└── scripts/            # Test execution scripts
```

### 🧪 Test Types

#### Unit Tests (`/testing/unit/`)
- Individual component testing
- Service layer testing
- Utility function testing
- Repository pattern testing
- Business logic validation

#### Integration Tests (`/testing/integration/`)
- API endpoint testing
- Database integration testing
- Service-to-service communication
- External API integration
- Data flow validation

#### End-to-End Tests (`/testing/e2e/`)
- Complete user workflows
- Multi-service integration
- UI/UX validation
- Critical path testing
- Customer journey testing

#### Performance Tests (`/testing/performance/`)
- Load testing scenarios
- Stress testing
- Endurance testing
- Spike testing
- Volume testing

#### Security Tests (`/testing/security/`)
- Authentication testing
- Authorization validation
- Input sanitization
- Data protection
- Vulnerability scanning

## 🚀 Running Tests

### All Tests
```bash
npm run test:all
```

### By Type
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# End-to-end tests
npm run test:e2e

# Performance tests
npm run test:performance

# Security tests
npm run test:security
```

### Coverage Reports
```bash
npm run test:coverage
npm run test:coverage:unit
npm run test:coverage:integration
```

### Watch Mode
```bash
npm run test:watch
npm run test:watch:unit
npm run test:watch:integration
```

## 📊 Coverage Thresholds

- **Branches**: 80%
- **Functions**: 85%
- **Lines**: 85%
- **Statements**: 85%

## 🛠️ Test Utilities

### Database Testing
- Test database setup and teardown
- Transaction rollback for isolation
- Data seeding utilities
- Clean database state

### Mock Services
- HTTP request mocking
- External service stubs
- Database mocking
- File system mocking

### Test Data
- Sample user data
- Lead generation fixtures
- Insurance policy templates
- Claims data sets

## 📝 Best Practices

1. **Test Independence**: Each test should run independently
2. **Clear Assertions**: Use descriptive assertion messages
3. **Arrange-Act-Assert**: Structure tests clearly
4. **Test Data Management**: Use factories and fixtures
5. **Mock External Dependencies**: Isolate unit tests
6. **Database Transactions**: Use rollback for isolation
7. **Performance**: Keep tests fast and focused

## 🔧 Configuration

### Environment Variables
- `NODE_ENV=test`
- `DATABASE_URL` (test database)
- `TEST_TIMEOUT` (default: 30s)

### Test Databases
- PostgreSQL (primary)
- Redis (caching)
- Neo4j (graph database)
- Qdrant (vector database)

## 📈 Continuous Integration

Tests run automatically on:
- Pull request creation
- Code pushes to main
- Scheduled runs (daily)
- Pre-deployment checks

## 🎯 Testing Goals

- **Reliability**: Catch bugs early
- **Performance**: Ensure responsiveness
- **Security**: Protect user data
- **User Experience**: Validate workflows
- **Maintainability**: Enable safe refactoring
