# Phase 10.6: Performance Testing & Optimization

## Overview

This phase implements a comprehensive performance testing and optimization framework for the Insurance Lead Gen AI Platform. The implementation includes:

1. **Performance Monitoring Service** - Real-time metrics collection and analysis
2. **Load Testing Scripts** - k6-based performance tests for various scenarios
3. **Database Optimization** - Query analysis, indexing strategies, and connection pool management
4. **Cache Performance Testing** - Hit rates, invalidation, and warming
5. **Queue Performance Testing** - Job throughput and reliability

## Architecture

```
testing/performance/
├── comprehensive-load-test.js    # Main API load test
├── database-performance-test.js  # Database performance tests
├── cache-performance-test.js     # Cache performance tests
├── queue-performance-test.js     # Queue performance tests
└── config.js                     # Test configuration

apps/data-service/src/services/
├── performance-monitoring.service.ts  # Metrics collection
├── database-optimizer.service.ts      # DB optimization
├── cache-warming.service.ts           # Cache warming
├── job-scheduler.service.ts           # Queue management
└── capacity-planning.service.ts       # Capacity forecasting

apps/api/src/middleware/
└── performance.middleware.ts          # Request tracking

apps/data-service/src/routes/
└── performance.routes.ts              # API endpoints
```

## Performance Testing Scenarios

### 1. Baseline Load Test
- **VU Count**: 20 concurrent users
- **Duration**: 14 minutes
- **Target RPS**: 100 requests/second
- **Purpose**: Normal expected load conditions

### 2. Peak Load Test
- **VU Count**: 50 concurrent users
- **Duration**: 15 minutes
- **Target RPS**: 250 requests/second
- **Purpose**: 2x normal load for peak hours

### 3. Stress Test
- **VU Count**: 200 concurrent users
- **Duration**: 25 minutes
- **Target RPS**: 1000 requests/second
- **Purpose**: Push system to breaking point

### 4. Spike Test
- **VU Count**: 500 concurrent users
- **Duration**: 8 minutes
- **Target RPS**: 2500 requests/second
- **Purpose**: Sudden traffic spike recovery

### 5. Endurance Test
- **VU Count**: 25 concurrent users
- **Duration**: 8 hours
- **Target RPS**: 125 requests/second
- **Purpose**: Long-term stability verification

## Performance Thresholds

### API Response Times
| Metric | Threshold | Description |
|--------|-----------|-------------|
| p95 Response Time | < 500ms | 95th percentile latency |
| p99 Response Time | < 1000ms | 99th percentile latency |
| Max Response Time | < 5000ms | Maximum allowed latency |
| Error Rate | < 1% | Failed request percentage |

### Database Metrics
| Metric | Threshold | Description |
|--------|-----------|-------------|
| Query Time p95 | < 200ms | 95th percentile query duration |
| Query Time p99 | < 500ms | 99th percentile query duration |
| Pool Utilization | < 80% | Connection pool usage |

### Cache Metrics
| Metric | Threshold | Description |
|--------|-----------|-------------|
| Hit Rate | > 80% | Cache efficiency |
| Avg Get Time | < 5ms | Average cache read time |
| Avg Set Time | < 10ms | Average cache write time |

### Queue Metrics
| Metric | Threshold | Description |
|--------|-----------|-------------|
| Processing Time p95 | < 1000ms | Job processing duration |
| Wait Time p95 | < 30000ms | Job queue wait time |
| Success Rate | > 95% | Job completion rate |

## Running Performance Tests

### Prerequisites
```bash
# Install k6
brew install k6  # macOS
# or
sudo apt-get install k6  # Linux

# Or use Docker
docker pull grafana/k6
```

### Running Tests

```bash
# Run all performance tests
npm run test:performance:all

# Run specific test scenarios
npm run test:performance:baseline      # Normal load
npm run test:performance:peak          # Peak load (2x)
npm run test:performance:stress        # Stress test
npm run test:performance:spike         # Spike test
npm run test:performance:endurance     # Endurance test (8h)

# Run component-specific tests
npm run test:performance:db            # Database tests
npm run test:performance:cache         # Cache tests
npm run test:performance:queue         # Queue tests
```

### Running with Custom Environment

```bash
# Test against staging environment
BASE_URL=https://staging-api.example.com \
API_TOKEN=your-token \
k6 run testing/performance/comprehensive-load-test.js

# Test with custom scenario
SCENARIO=stress \
k6 run testing/performance/comprehensive-load-test.js
```

## Performance Monitoring API

### Metrics Endpoints

```bash
# Get comprehensive performance metrics
GET /api/v1/performance/metrics

# Get endpoint-level metrics
GET /api/v1/performance/metrics/endpoints

# Get query-level metrics
GET /api/v1/performance/metrics/queries

# Get performance alerts
GET /api/v1/performance/alerts

# Generate performance report
GET /api/v1/performance/report?period=day
```

### Database Optimization Endpoints

```bash
# Analyze query execution
POST /api/v1/performance/database/analyze-query
Body: { "query": "SELECT * FROM leads WHERE status = $1" }

# Get indexing strategy recommendations
GET /api/v1/performance/database/indexing-strategy

# Get connection pool metrics
GET /api/v1/performance/database/connection-pool

# Get slow queries
GET /api/v1/performance/database/slow-queries?limit=20

# Optimize table
POST /api/v1/performance/database/optimize-table/{tableName}

# Get table statistics
GET /api/v1/performance/database/table-stats/{tableName}

# Get database size
GET /api/v1/performance/database/size

# Archive old data
POST /api/v1/performance/database/archive
Body: {
  "table": "Event",
  "archiveAfterDays": 365,
  "archiveStrategy": "delete"
}
```

### Cache Management Endpoints

```bash
# Warm cache
POST /api/v1/performance/cache/warm

# Invalidate cache pattern
POST /api/v1/performance/cache/invalidate
Body: { "pattern": "leads:*" }

# Get cache metrics
GET /api/v1/performance/cache/metrics

# Get cache hit rate report
GET /api/v1/performance/cache/hit-rate
```

### Job Queue Endpoints

```bash
# Get job metrics
GET /api/v1/performance/jobs/metrics?queue=lead-ingestion

# Schedule a job
POST /api/v1/performance/jobs/schedule
Body: {
  "name": "daily-report",
  "pattern": "0 0 * * *",
  "jobType": "report-generation",
  "enabled": true
}

# Pause/resume queue
POST /api/v1/performance/jobs/{queue}/pause
POST /api/v1/performance/jobs/{queue}/resume

# Retry failed jobs
POST /api/v1/performance/jobs/{queue}/retry-failed

# Get dead letter jobs
GET /api/v1/performance/jobs/{queue}/dead-letter
```

### Capacity Planning Endpoints

```bash
# Get capacity dashboard
GET /api/v1/performance/capacity/dashboard

# Get capacity forecast
GET /api/v1/performance/capacity/forecast/{resourceType}?months=6
# resourceType: cpu, memory, storage, bandwidth, database

# Identify bottlenecks
GET /api/v1/performance/capacity/bottlenecks
```

## Test User Profiles

### Lead Generation User (40%)
- Creates new leads
- Searches for leads
- Updates lead information
- Think time: 5-15 seconds

### Broker User (30%)
- Lists and filters leads
- Views agent information
- Matches leads to agents
- Think time: 10-30 seconds

### Admin User (15%)
- Views analytics dashboards
- Generates reports
- Monitors system health
- Think time: 30-60 seconds

### API Integration User (15%)
- Batch lead imports
- Bulk operations
- External integrations
- Think time: 1-5 seconds

## Key Operations Tested

### Lead Operations
| Operation | Weight | Expected Latency |
|-----------|--------|------------------|
| Create Lead | 20% | < 800ms |
| List Leads | 30% | < 300ms |
| Get Lead | 15% | < 200ms |
| Update Lead | 10% | < 300ms |
| Search Leads | 10% | < 400ms |
| Batch Import | 10% | < 2000ms |

### Agent Operations
| Operation | Weight | Expected Latency |
|-----------|--------|------------------|
| List Agents | 40% | < 300ms |
| Get Agent | 30% | < 200ms |
| Match Agent | 30% | < 1000ms |

### Analytics Operations
| Operation | Weight | Expected Latency |
|-----------|--------|------------------|
| Overview | 40% | < 500ms |
| Lead Analytics | 30% | < 500ms |
| Performance Metrics | 30% | < 500ms |

## Interpreting Results

### Performance Reports

Each test generates a JSON report with:
- Request counts and error rates
- Response time distributions (p50, p95, p99)
- Custom metric breakdowns
- Threshold pass/fail status

### Alert Categories

1. **Critical** - System degradation or outage
   - Error rate > 5%
   - p99 response time > 5s
   - Queue backlog > 10000

2. **Warning** - Potential performance issues
   - Error rate > 1%
   - p95 response time > 500ms
   - Cache hit rate < 70%

3. **Info** - Optimization opportunities
   - Slow query detected
   - Connection pool near capacity
   - Storage utilization > 80%

## Optimization Recommendations

Based on performance test results, the system may recommend:

1. **Caching**
   - Implement response caching for frequently accessed endpoints
   - Review cache invalidation strategy
   - Increase cache TTL for stable data

2. **Database**
   - Add composite indexes on frequently filtered columns
   - Implement query pagination
   - Consider read replicas for heavy read workloads

3. **Scaling**
   - Horizontal scaling for API services
   - Vertical scaling for database
   - Queue partitioning for high-throughput jobs

4. **Code Optimization**
   - Batch database operations
   - Implement connection pooling
   - Use async processing for non-critical operations

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * 1'  # Weekly on Monday at 2 AM
  workflow_dispatch:

jobs:
  performance-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup k6
        run: |
          curl -sL https://github.com/grafana/k6/releases/download/v0.46.0/k6-v0.46.0-linux-amd64.tar.gz | tar -xz
          sudo mv k6-v0.46.0-linux-amd64/k6 /usr/local/bin/
      
      - name: Run baseline test
        run: |
          k6 run testing/performance/comprehensive-load-test.js \
            -e SCENARIO=baseline \
            -e BASE_URL=${{ secrets.STAGING_URL }} \
            -e API_TOKEN=${{ secrets.API_TOKEN }} \
            --out json=results/baseline.json
      
      - name: Analyze results
        run: |
          node scripts/analyze-performance.js results/
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: results/
```

## Best Practices

### 1. Test Data Management
- Use representative data volumes
- Mask sensitive information
- Clean up test data after tests

### 2. Environment Configuration
- Match production topology
- Use isolated environments for testing
- Monitor resource usage during tests

### 3. Test Execution
- Run baseline tests before changes
- Establish performance regression thresholds
- Track metrics over time

### 4. Result Analysis
- Focus on p95 and p99 percentiles
- Identify consistent bottlenecks
- Correlate with system metrics

## Files Reference

### New Files Created

1. `apps/data-service/src/services/performance-monitoring.service.ts`
2. `apps/api/src/middleware/performance.middleware.ts`
3. `testing/performance/comprehensive-load-test.js`
4. `testing/performance/database-performance-test.js`
5. `testing/performance/cache-performance-test.js`
6. `testing/performance/queue-performance-test.js`
7. `testing/performance/config.js`

### Modified Files

1. `apps/data-service/src/routes/performance.routes.ts`
2. `package.json` (scripts and dependencies)

## Conclusion

This phase provides a comprehensive performance testing and optimization framework that enables:

- ✅ Continuous performance monitoring
- ✅ Automated load testing across multiple scenarios
- ✅ Database query analysis and optimization
- ✅ Cache performance tracking
- ✅ Queue throughput monitoring
- ✅ Capacity forecasting and planning

The framework is extensible and can be integrated into CI/CD pipelines for automated performance regression testing.
