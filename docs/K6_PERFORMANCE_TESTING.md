# K6 Performance Testing Guide

## Overview

This document describes how to use k6 for performance and load testing of the Insurance Lead Generation AI Platform. K6 is a modern load testing tool designed for testing the performance of APIs, microservices, and websites.

## Installation

### Ubuntu/Debian

K6 has been installed via the official k6 APT repository:

```bash
# Add k6 GPG key
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69

# Add k6 repository
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list

# Update and install
sudo apt-get update
sudo apt-get install k6
```

### Verification

Verify k6 installation:

```bash
k6 version
# Expected output: k6 v1.5.0 (or later)
```

Run the setup verification test:

```bash
npm run test:performance:verify
```

## Available Performance Tests

### 1. Setup Verification Test

**Location**: `tests/performance/k6-setup-verification.js`

**Purpose**: Verify k6 installation and basic functionality

**Command**:

```bash
npm run test:performance:verify
```

**Features**:

- Validates k6 is properly installed
- Tests HTTP request functionality
- Verifies metrics collection
- Runs without requiring local services

### 2. Comprehensive Load Test

**Location**: `testing/performance/comprehensive-load-test.js`

**Purpose**: Full load testing with multiple scenarios

**Commands**:

```bash
# Run all scenarios
npm run test:performance

# Run specific scenarios
npm run test:performance:baseline   # Normal load (20 VUs)
npm run test:performance:peak       # Peak load (50 VUs)
npm run test:performance:stress     # Stress test (100-200 VUs)
npm run test:performance:spike      # Spike test (10 → 500 VUs)
npm run test:performance:endurance  # 8-hour endurance test
```

**Test Scenarios**:

- **Baseline**: Normal expected load (20 VUs for 10 minutes)
- **Peak Load**: 2x normal load (50 VUs)
- **Stress Test**: Push to breaking point (100-200 VUs)
- **Spike Test**: Sudden traffic spike (500 VUs)
- **Endurance**: Long-duration stability test (8 hours)

**Test Coverage**:

- Lead generation and creation (40% weight)
- Lead retrieval and filtering (30% weight)
- Agent matching (15% weight)
- Analytics endpoints (10% weight)
- Bulk operations (5% weight)

### 3. Database Performance Test

**Location**: `testing/performance/database-performance-test.js`

**Command**:

```bash
npm run test:performance:db
```

**Tests**:

- Database query performance
- Connection pool efficiency
- Transaction throughput
- Index effectiveness

### 4. Cache Performance Test

**Location**: `testing/performance/cache-performance-test.js`

**Command**:

```bash
npm run test:performance:cache
```

**Tests**:

- Redis cache hit/miss rates
- Cache response times
- Cache invalidation patterns
- TTL effectiveness

### 5. Queue Performance Test

**Location**: `testing/performance/queue-performance-test.js`

**Command**:

```bash
npm run test:performance:queue
```

**Tests**:

- NATS message throughput
- Queue processing latency
- Message delivery reliability
- Concurrent consumer performance

### 6. Legacy Load Test

**Location**: `tests/performance/load-testing.k6.js`

**Command**:

```bash
k6 run --vus 100 --duration 5m tests/performance/load-testing.k6.js
```

**Purpose**: Original load test for basic API endpoints

## Performance Metrics

### HTTP Metrics

- **http_req_duration**: Total request duration
  - Target: p(95) < 500ms, p(99) < 1000ms
- **http_req_failed**: Request failure rate
  - Target: < 1%
- **http_reqs**: Total number of requests
- **http_req_blocked**: Time blocked before request
- **http_req_connecting**: Time establishing connection
- **http_req_tls_handshaking**: TLS handshake time
- **http_req_sending**: Time sending request
- **http_req_waiting**: Time waiting for response
- **http_req_receiving**: Time receiving response

### Custom Metrics

- **lead_create_time**: Lead creation duration
  - Target: avg < 800ms, p(95) < 1500ms
- **lead_list_time**: Lead listing duration
  - Target: avg < 200ms, p(95) < 400ms
- **agent_match_time**: Agent matching duration
  - Target: avg < 500ms, p(95) < 1000ms
- **cache_hit_rate**: Cache effectiveness
  - Target: > 70%
- **error_rate**: Custom error tracking
  - Target: < 2%

### Checks

K6 checks validate specific conditions:

- HTTP status codes
- Response body content
- Response time thresholds
- Data structure validation

## Environment Configuration

Configure tests using environment variables:

```bash
# API endpoints
export BASE_URL=http://localhost:3000
export DATA_SERVICE_URL=http://localhost:4000

# Authentication
export API_TOKEN=your-api-token

# Run test
k6 run -e BASE_URL=$BASE_URL testing/performance/comprehensive-load-test.js
```

## Test Execution Options

### Virtual Users (VUs)

```bash
# Fixed number of VUs
k6 run --vus 50 --duration 30s script.js

# Ramping VUs
k6 run --stage 5s:10,10s:20,5s:0 script.js
```

### Duration

```bash
# Time-based
k6 run --duration 5m script.js

# Iteration-based
k6 run --iterations 1000 script.js
```

### Thresholds

```bash
# Fail test if thresholds not met
k6 run --threshold 'http_req_duration{p(95)}<500' script.js
```

### Output Formats

```bash
# JSON output
k6 run --out json=results.json script.js

# InfluxDB
k6 run --out influxdb=http://localhost:8086/k6 script.js

# Cloud (k6 Cloud)
k6 run --out cloud script.js
```

## Performance Testing Workflow

### 1. Preparation

- [ ] Ensure services are running
- [ ] Clear caches and queues
- [ ] Reset database to known state
- [ ] Configure monitoring tools
- [ ] Set up log aggregation

### 2. Baseline Testing

```bash
# Establish baseline performance
npm run test:performance:baseline
```

**Analyze**:

- Response times under normal load
- Resource utilization patterns
- Error rates and types
- Database query performance

### 3. Load Testing

```bash
# Test at expected peak load
npm run test:performance:peak
```

**Monitor**:

- System resource usage (CPU, memory, I/O)
- Database connections and queries
- Cache hit rates
- Network bandwidth

### 4. Stress Testing

```bash
# Find breaking points
npm run test:performance:stress
```

**Identify**:

- Maximum capacity
- Failure modes
- Recovery behavior
- Bottlenecks

### 5. Spike Testing

```bash
# Test sudden load increases
npm run test:performance:spike
```

**Verify**:

- Auto-scaling responsiveness
- Rate limiting effectiveness
- Circuit breaker behavior
- Queue overflow handling

### 6. Endurance Testing

```bash
# Test long-term stability
npm run test:performance:endurance
```

**Watch for**:

- Memory leaks
- Connection pool exhaustion
- Disk space growth
- Performance degradation

### 7. Component Testing

```bash
# Test specific components
npm run test:performance:db
npm run test:performance:cache
npm run test:performance:queue
```

### 8. Analysis

Review generated reports:

- `performance-report.json`: Detailed metrics
- Console output: Summary statistics
- Monitoring dashboards: Real-time metrics

## Interpreting Results

### Success Criteria

✅ **Passed**:

- All thresholds met
- Error rate < 1%
- p(95) response time < 500ms
- p(99) response time < 1000ms
- Cache hit rate > 70%

⚠️ **Warning**:

- Some thresholds exceeded
- Error rate 1-2%
- Response times degrading
- Intermittent failures

❌ **Failed**:

- Critical thresholds exceeded
- Error rate > 2%
- Service unavailable
- Data corruption

### Common Issues

**Slow Response Times**:

- Database query optimization needed
- Add database indexes
- Implement caching
- Optimize N+1 queries

**High Error Rates**:

- Connection pool exhaustion
- Rate limiting too aggressive
- Insufficient resources
- Application bugs

**Memory Issues**:

- Memory leaks in application
- Insufficient garbage collection
- Large response payloads
- Connection pooling issues

**Database Problems**:

- Connection pool too small
- Missing indexes
- Lock contention
- Slow queries

## Best Practices

### Test Design

1. **Realistic Scenarios**: Mirror actual user behavior
2. **Ramp-Up Period**: Gradually increase load
3. **Think Time**: Include realistic delays
4. **Data Variation**: Use diverse test data
5. **Error Handling**: Test failure scenarios

### Test Execution

1. **Isolated Environment**: Dedicated test infrastructure
2. **Consistent State**: Reset before each test run
3. **Monitoring**: Track all system metrics
4. **Repeatability**: Run multiple times for consistency
5. **Documentation**: Record test parameters and results

### Analysis

1. **Baseline Comparison**: Compare against baseline
2. **Trend Analysis**: Track metrics over time
3. **Percentiles**: Focus on p(95) and p(99)
4. **Resource Correlation**: Link performance to resources
5. **Actionable Insights**: Identify specific improvements

## Continuous Performance Testing

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
name: Performance Tests
on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
  workflow_dispatch:

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install k6
        run: |
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
            --keyserver hkp://keyserver.ubuntu.com:80 \
            --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
            sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      - name: Run Performance Tests
        run: npm run test:performance:baseline
```

### Regression Detection

Set up automated alerts when:

- Response times increase > 20%
- Error rates increase > 1%
- Throughput decreases > 15%
- Resource usage increases > 25%

## Troubleshooting

### K6 Not Found

```bash
# Verify installation
which k6
k6 version

# Reinstall if needed
sudo apt-get update
sudo apt-get install --reinstall k6
```

### Test Failures

```bash
# Check services are running
docker ps
curl http://localhost:3000/health

# View logs
docker-compose logs -f

# Increase timeout
k6 run --http-debug script.js
```

### High Resource Usage

```bash
# Monitor system resources
htop

# Reduce VU count
k6 run --vus 10 script.js

# Use fewer iterations
k6 run --iterations 100 script.js
```

## Additional Resources

- [K6 Documentation](https://k6.io/docs/)
- [K6 Examples](https://github.com/grafana/k6/tree/master/examples)
- [K6 Best Practices](https://k6.io/docs/testing-guides/test-types/)
- [Performance Testing Guide](https://k6.io/docs/testing-guides/)

## Support

For issues or questions:

1. Check this documentation
2. Review k6 official docs
3. Consult team performance testing guide
4. Open issue in project repository

---

**Last Updated**: 2025-01-21  
**K6 Version**: 1.5.0  
**Maintained By**: DevOps & Performance Team
