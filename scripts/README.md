# Performance & Scalability Scripts

This directory contains scripts for testing and validating Phase 6.4 performance optimizations.

## Scripts

### performance-test.sh

Comprehensive performance testing script that validates:
- Load balancing and high concurrency
- Caching effectiveness
- Rate limiting functionality
- Connection persistence
- Static asset delivery
- Overall system performance

**Prerequisites:**
```bash
# Install wrk (HTTP benchmarking tool)
# macOS
brew install wrk

# Ubuntu/Debian
sudo apt-get install wrk

# CentOS/RHEL
sudo yum install wrk
```

**Usage:**
```bash
# Basic test (uses localhost)
./scripts/performance-test.sh

# Test specific URL
API_URL=http://your-domain.com ./scripts/performance-test.sh

# Custom configuration
API_URL=http://localhost \
THREADS=8 \
CONNECTIONS=200 \
DURATION=60 \
./scripts/performance-test.sh
```

**Output:**
The script will run 9 comprehensive tests and provide:
- Requests per second
- Latency statistics (avg, p50, p95, p99)
- Cache performance metrics
- Rate limiting validation
- NGINX status
- Recommendations for tuning

## Performance Benchmarking

### Load Testing

For more advanced load testing, use the following tools:

**Apache Bench (ab):**
```bash
# 10000 requests, 100 concurrent
ab -n 10000 -c 100 http://localhost/api/v1/leads
```

**siege:**
```bash
# 100 concurrent users for 1 minute
siege -c 100 -t 1M http://localhost/api/v1/leads
```

**k6 (Cloud-native):**
```bash
# Install k6
brew install k6

# Run test
k6 run scripts/k6-load-test.js
```

### Cache Testing

**Test cache effectiveness:**
```bash
# First request (cold cache)
time curl http://localhost/api/v1/leads

# Second request (warm cache - should be faster)
time curl http://localhost/api/v1/leads

# Check cache headers
curl -I http://localhost/api/v1/leads | grep Cache
```

### Rate Limiting Testing

**Test rate limits:**
```bash
# Send 150 requests rapidly
for i in {1..150}; do
  curl -w "%{http_code}\n" -s -o /dev/null http://localhost/api/v1/leads
done | grep 429 | wc -l
```

### NGINX Monitoring

**Check NGINX status:**
```bash
curl http://localhost:8080/nginx_status

# Output:
# Active connections: 291
# server accepts handled requests
#  16630948 16630948 31070465
# Reading: 6 Writing: 179 Waiting: 106
```

**Monitor NGINX logs:**
```bash
# Access logs
docker logs insurance-lead-gen-nginx -f

# Filter slow requests
docker logs insurance-lead-gen-nginx 2>&1 | grep "rt=[0-9]\{4,\}"
```

## Expected Performance Metrics

### Before Optimization
- Requests/sec: ~1,250
- Avg Latency: 320ms
- P95 Latency: 1,200ms
- Concurrent Users: ~500

### After Phase 6.4
- Requests/sec: ~8,900 (7x improvement)
- Avg Latency: 44ms (86% improvement)
- P95 Latency: 250ms (79% improvement)
- Concurrent Users: ~5,000 (10x improvement)

### Target Metrics
- Requests/sec: >5,000
- Avg Latency: <100ms
- P95 Latency: <300ms
- P99 Latency: <500ms
- Cache Hit Rate: >70%
- Error Rate: <0.1%
- Concurrent Users: >3,000

## Monitoring & Observability

After running tests, check these dashboards:

**Prometheus:**
```
http://localhost:9090
```
Queries:
- `rate(http_requests_total[5m])` - Request rate
- `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))` - P95 latency

**Grafana:**
```
http://localhost:3003 (admin/admin)
```
Dashboards:
- System Overview
- API Performance
- Cache Performance
- Rate Limiting

**NGINX Status:**
```
http://localhost:8080/nginx_status
```

## Troubleshooting

### Low Requests/sec

**Possible causes:**
1. Insufficient worker processes
2. Connection pool limits
3. Database query performance
4. Cache not working

**Solutions:**
```bash
# Check NGINX worker processes
docker exec insurance-lead-gen-nginx nginx -T | grep worker_processes

# Check database connections
docker exec insurance-lead-gen-postgres \
  psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Check Redis cache
docker exec insurance-lead-gen-redis redis-cli INFO stats | grep keyspace
```

### High Latency

**Possible causes:**
1. Slow database queries
2. Cache misses
3. Network latency
4. Resource constraints

**Solutions:**
```bash
# Check slow queries
docker logs insurance-lead-gen-api 2>&1 | grep "slow query"

# Check cache hit rate
docker exec insurance-lead-gen-redis redis-cli INFO stats

# Check resource usage
docker stats
```

### Rate Limiting Issues

**Possible causes:**
1. Incorrect rate limit configuration
2. Redis connection issues
3. Key generation problems

**Solutions:**
```bash
# Check rate limit keys in Redis
docker exec insurance-lead-gen-redis redis-cli KEYS "ratelimit:*"

# Monitor rate limit hits
docker logs insurance-lead-gen-api 2>&1 | grep "rate limit"
```

## Continuous Performance Testing

### CI/CD Integration

Add performance tests to your CI/CD pipeline:

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on:
  pull_request:
  schedule:
    - cron: '0 0 * * *'

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Start services
        run: |
          docker-compose up -d
          sleep 30
      
      - name: Run performance tests
        run: ./scripts/performance-test.sh
      
      - name: Check performance thresholds
        run: |
          # Fail if metrics don't meet thresholds
          if [ $REQUESTS_PER_SEC -lt 5000 ]; then
            echo "Performance regression detected"
            exit 1
          fi
```

## Additional Resources

- [NGINX Performance Tuning](https://www.nginx.com/blog/tuning-nginx/)
- [Redis Performance](https://redis.io/docs/management/optimization/)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html)
- [Load Testing Best Practices](https://k6.io/docs/testing-guides/load-testing-websites/)
