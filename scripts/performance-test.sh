#!/bin/bash

# Performance Testing Script for Phase 6.4
# Tests load balancing, caching, and rate limiting

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Phase 6.4 Performance Testing${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if required tools are installed
command -v wrk >/dev/null 2>&1 || { 
  echo -e "${RED}Error: wrk is not installed${NC}"
  echo "Install with: brew install wrk (macOS) or apt-get install wrk (Linux)"
  exit 1
}

command -v curl >/dev/null 2>&1 || {
  echo -e "${RED}Error: curl is not installed${NC}"
  exit 1
}

# Configuration
API_URL="${API_URL:-http://localhost}"
THREADS=12
CONNECTIONS=400
DURATION=30

echo -e "\n${GREEN}Configuration:${NC}"
echo "  API URL: $API_URL"
echo "  Threads: $THREADS"
echo "  Connections: $CONNECTIONS"
echo "  Duration: ${DURATION}s"

# Test 1: Health Check
echo -e "\n${BLUE}Test 1: Health Check${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/health)
if [ "$HTTP_STATUS" -eq 200 ]; then
  echo -e "${GREEN}✓ Service is healthy${NC}"
else
  echo -e "${RED}✗ Service health check failed (HTTP $HTTP_STATUS)${NC}"
  exit 1
fi

# Test 2: Basic Load Test
echo -e "\n${BLUE}Test 2: Basic Load Test${NC}"
echo "Running wrk for ${DURATION}s with ${THREADS} threads and ${CONNECTIONS} connections..."
wrk -t${THREADS} -c${CONNECTIONS} -d${DURATION}s $API_URL/health

# Test 3: API Endpoint Load Test
echo -e "\n${BLUE}Test 3: API Endpoint Load Test${NC}"
echo "Testing /api/v1/leads endpoint..."
wrk -t${THREADS} -c${CONNECTIONS} -d${DURATION}s \
  -H "Accept: application/json" \
  $API_URL/api/v1/leads

# Test 4: Rate Limiting Test
echo -e "\n${BLUE}Test 4: Rate Limiting Test${NC}"
echo "Sending rapid requests to trigger rate limiting..."

rate_limited=0
for i in {1..150}; do
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/api/v1/leads)
  if [ "$HTTP_STATUS" -eq 429 ]; then
    rate_limited=$((rate_limited + 1))
  fi
done

if [ $rate_limited -gt 0 ]; then
  echo -e "${GREEN}✓ Rate limiting is working ($rate_limited/150 requests limited)${NC}"
else
  echo -e "${YELLOW}⚠ Rate limiting may not be active${NC}"
fi

# Test 5: Cache Performance Test
echo -e "\n${BLUE}Test 5: Cache Performance Test${NC}"
echo "First request (uncached):"
FIRST_TIME=$(curl -w "@-" -s -o /dev/null $API_URL/api/v1/leads << 'EOF'
%{time_total}
EOF
)
echo "  Response time: ${FIRST_TIME}s"

echo "Second request (should be cached):"
SECOND_TIME=$(curl -w "@-" -s -o /dev/null $API_URL/api/v1/leads << 'EOF'
%{time_total}
EOF
)
echo "  Response time: ${SECOND_TIME}s"

# Compare times (cached should be faster)
if (( $(echo "$SECOND_TIME < $FIRST_TIME" | bc -l) )); then
  IMPROVEMENT=$(echo "scale=2; ($FIRST_TIME - $SECOND_TIME) / $FIRST_TIME * 100" | bc)
  echo -e "${GREEN}✓ Cache improved response time by ${IMPROVEMENT}%${NC}"
else
  echo -e "${YELLOW}⚠ Cache may not be working as expected${NC}"
fi

# Test 6: NGINX Status
echo -e "\n${BLUE}Test 6: NGINX Status${NC}"
if curl -f -s http://localhost:8080/nginx_status > /dev/null 2>&1; then
  echo -e "${GREEN}✓ NGINX status endpoint is accessible${NC}"
  curl -s http://localhost:8080/nginx_status
else
  echo -e "${YELLOW}⚠ NGINX status endpoint not available${NC}"
fi

# Test 7: Connection Persistence
echo -e "\n${BLUE}Test 7: Connection Persistence Test${NC}"
echo "Testing with keep-alive..."
wrk -t4 -c100 -d10s \
  -H "Connection: keep-alive" \
  $API_URL/health | grep "Requests/sec"

# Test 8: Static Asset Performance
echo -e "\n${BLUE}Test 8: Static Asset Caching${NC}"
if curl -f -s http://localhost/static/test.css > /dev/null 2>&1; then
  CACHE_STATUS=$(curl -s -I http://localhost/static/test.css | grep -i "X-Cache-Status" || echo "Not found")
  echo "  Cache Status: $CACHE_STATUS"
else
  echo -e "${YELLOW}⚠ Static assets endpoint not available${NC}"
fi

# Test 9: Concurrent Users Simulation
echo -e "\n${BLUE}Test 9: Concurrent Users Simulation${NC}"
echo "Simulating 1000 concurrent users..."
wrk -t12 -c1000 -d15s \
  --latency \
  $API_URL/health

# Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}Performance Testing Complete!${NC}"
echo -e "${BLUE}========================================${NC}"

echo -e "\n${YELLOW}Key Metrics to Review:${NC}"
echo "  1. Requests/sec - Should be >5000 with caching"
echo "  2. Latency avg - Should be <100ms"
echo "  3. Cache hit rate - Check application logs"
echo "  4. Rate limiting - Should trigger at configured threshold"
echo "  5. Connection errors - Should be 0"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "  1. Review application logs for errors"
echo "  2. Check Redis cache hit rate"
echo "  3. Monitor CPU and memory usage"
echo "  4. Tune rate limits and cache TTLs"
echo "  5. Scale services if needed"

echo -e "\n${GREEN}For detailed metrics, check:${NC}"
echo "  - Prometheus: http://localhost:9090"
echo "  - Grafana: http://localhost:3003"
echo "  - NGINX Status: http://localhost:8080/nginx_status"
