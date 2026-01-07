#!/bin/bash
# Launch Metrics Check Script
# Verifies critical metrics are within acceptable ranges before launch
# Usage: ./scripts/launch-metrics-check.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"

# Thresholds
ERROR_RATE_THRESHOLD=0.001  # 0.1%
P95_RESPONSE_THRESHOLD=0.3  # 300ms
P99_RESPONSE_THRESHOLD=0.5  # 500ms
UPTIME_THRESHOLD=0.999  # 99.9%
CACHE_HIT_THRESHOLD=0.8  # 80%
DB_QUERY_THRESHOLD=0.1  # 100ms

# Counters
PASS_COUNT=0
FAIL_COUNT=0

# Helper functions
pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASS_COUNT++))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAIL_COUNT++))
}

warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
}

# Query Prometheus function
query_prometheus() {
    local query="$1"
    curl -s "${PROMETHEUS_URL}/api/v1/query?query=$(printf '%s' "$query" | jq -sRr @uri)" 2>/dev/null | \
        jq -r '.data.result[0].value[1] // "null"' 2>/dev/null || echo "null"
}

echo "==================================="
echo "Launch Metrics Check"
echo "==================================="
echo ""

# Check if Prometheus is accessible
if ! curl -s "${PROMETHEUS_URL}/api/v1/status/config" >/dev/null 2>&1; then
    echo -e "${RED}Cannot connect to Prometheus at ${PROMETHEUS_URL}${NC}"
    echo "Please ensure Prometheus is running and accessible."
    exit 1
fi

echo "Prometheus connected: ${PROMETHEUS_URL}"
echo ""

# 1. Error Rate
echo "1. Error Rate Check"
echo "--------------------"

ERROR_RATE=$(query_prometheus 'rate(http_requests_total{status=~"5.."}[5m])')
if [ "$ERROR_RATE" != "null" ] && [ "$ERROR_RATE" != "NaN" ]; then
    ERROR_RATE_PERCENT=$(echo "$ERROR_RATE * 100" | bc -l 2>/dev/null || echo "0")
    ERROR_RATE_COMPARE=$(echo "$ERROR_RATE < $ERROR_RATE_THRESHOLD" | bc -l 2>/dev/null || echo "0")

    if [ "$ERROR_RATE_COMPARE" -eq 1 ]; then
        pass "Error rate is $(printf '%.4f%%' "$ERROR_RATE_PERCENT") (threshold: <0.1%)"
    else
        fail "Error rate is $(printf '%.4f%%' "$ERROR_RATE_PERCENT") (threshold: <0.1%)"
    fi
else
    warn "Could not retrieve error rate metric (may be normal for fresh deployment)"
fi

echo ""

# 2. Response Time P95
echo "2. Response Time Check"
echo "---------------------"

P95_RESPONSE=$(query_prometheus 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))')
if [ "$P95_RESPONSE" != "null" ] && [ "$P95_RESPONSE" != "NaN" ]; then
    P95_MS=$(echo "$P95_RESPONSE * 1000" | bc -l 2>/dev/null || echo "0")
    P95_COMPARE=$(echo "$P95_RESPONSE < $P95_RESPONSE_THRESHOLD" | bc -l 2>/dev/null || echo "0")

    if [ "$P95_COMPARE" -eq 1 ]; then
        pass "P95 response time is $(printf '%.0fms' "$P95_MS") (threshold: <300ms)"
    else
        fail "P95 response time is $(printf '%.0fms' "$P95_MS") (threshold: <300ms)"
    fi
else
    warn "Could not retrieve P95 response time metric"
fi

# P99 Response Time
P99_RESPONSE=$(query_prometheus 'histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))')
if [ "$P99_RESPONSE" != "null" ] && [ "$P99_RESPONSE" != "NaN" ]; then
    P99_MS=$(echo "$P99_RESPONSE * 1000" | bc -l 2>/dev/null || echo "0")
    P99_COMPARE=$(echo "$P99_RESPONSE < $P99_RESPONSE_THRESHOLD" | bc -l 2>/dev/null || echo "0")

    if [ "$P99_COMPARE" -eq 1 ]; then
        pass "P99 response time is $(printf '%.0fms' "$P99_MS") (threshold: <500ms)"
    else
        fail "P99 response time is $(printf '%0fms' "$P99_MS") (threshold: <500ms)"
    fi
else
    warn "Could not retrieve P99 response time metric"
fi

echo ""

# 3. System Uptime
echo "3. System Uptime Check"
echo "----------------------"

# Get uptime from up metric (1 = up, 0 = down)
API_UPTIME=$(query_prometheus 'up{job="api-service"}')
if [ "$API_UPTIME" = "1" ]; then
    pass "API service is UP"
else
    fail "API service is DOWN"
fi

# Check uptime percentage over last hour
UPTIME_PERCENT=$(query_prometheus 'avg_over_time(up{job="api-service"}[1h])')
if [ "$UPTIME_PERCENT" != "null" ] && [ "$UPTIME_PERCENT" != "NaN" ]; then
    UPTIME_COMPARE=$(echo "$UPTIME_PERCENT > $UPTIME_THRESHOLD" | bc -l 2>/dev/null || echo "0")

    if [ "$UPTIME_COMPARE" -eq 1 ]; then
        pass "Uptime is $(printf '%.2f%%' "$(echo "$UPTIME_PERCENT * 100" | bc -l)") (threshold: ≥99.9%)"
    else
        fail "Uptime is $(printf '%.2f%%' "$(echo "$UPTIME_PERCENT * 100" | bc -l)") (threshold: ≥99.9%)"
    fi
else
    warn "Could not retrieve uptime percentage"
fi

echo ""

# 4. Cache Performance
echo "4. Cache Performance Check"
echo "-------------------------"

# Try to get cache hit rate
CACHE_HIT_RATE=$(query_prometheus 'redis_cache_hit_rate')
if [ "$CACHE_HIT_RATE" = "null" ] || [ "$CACHE_HIT_RATE" = "NaN" ]; then
    # Alternative query
    CACHE_HIT_RATE=$(query_prometheus 'rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))')
fi

if [ "$CACHE_HIT_RATE" != "null" ] && [ "$CACHE_HIT_RATE" != "NaN" ]; then
    CACHE_COMPARE=$(echo "$CACHE_HIT_RATE > $CACHE_HIT_THRESHOLD" | bc -l 2>/dev/null || echo "0")

    if [ "$CACHE_COMPARE" -eq 1 ]; then
        pass "Cache hit rate is $(printf '%.1f%%' "$(echo "$CACHE_HIT_RATE * 100" | bc -l)") (threshold: >80%)"
    else
        fail "Cache hit rate is $(printf '%.1f%%' "$(echo "$CACHE_HIT_RATE * 100" | bc -l)") (threshold: >80%)"
    fi
else
    warn "Could not retrieve cache hit rate metric"
fi

echo ""

# 5. Database Performance
echo "5. Database Performance Check"
echo "----------------------------"

# Check database query time
DB_QUERY_TIME=$(query_prometheus 'histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))')
if [ "$DB_QUERY_TIME" != "null" ] && [ "$DB_QUERY_TIME" != "NaN" ]; then
    DB_MS=$(echo "$DB_QUERY_TIME * 1000" | bc -l 2>/dev/null || echo "0")
    DB_COMPARE=$(echo "$DB_QUERY_TIME < $DB_QUERY_THRESHOLD" | bc -l 2>/dev/null || echo "0")

    if [ "$DB_COMPARE" -eq 1 ]; then
        pass "Database query time P95 is $(printf '%.0fms' "$DB_MS") (threshold: <100ms)"
    else
        fail "Database query time P95 is $(printf '%.0fms' "$DB_MS") (threshold: <100ms)"
    fi
else
    warn "Could not retrieve database query time metric"
fi

# Check database connection pool
DB_POOL_ACTIVE=$(query_prometheus 'db_pool_active_connections')
if [ "$DB_POOL_ACTIVE" != "null" ] && [ "$DB_POOL_ACTIVE" != "NaN" ]; then
    pass "Active database connections: ${DB_POOL_ACTIVE}"
else
    warn "Could not retrieve database connection pool metric"
fi

echo ""

# 6. Business Metrics
echo "6. Business Metrics Check"
echo "------------------------"

# Check lead creation rate
LEAD_CREATION_RATE=$(query_prometheus 'rate(leads_created_total[5m])')
if [ "$LEAD_CREATION_RATE" != "null" ] && [ "$LEAD_CREATION_RATE" != "NaN" ]; then
    LEADS_PER_MIN=$(echo "$LEAD_CREATION_RATE * 60" | bc -l 2>/dev/null || echo "0")
    pass "Lead creation rate: $(printf '%.1f' "$LEADS_PER_MIN") leads/min"
else
    info "No leads created yet (may be normal for fresh deployment)"
fi

# Check AI scoring rate
AI_SCORING_RATE=$(query_prometheus 'rate(ai_leads_scored_total[5m])')
if [ "$AI_SCORING_RATE" != "null" ] && [ "$AI_SCORING_RATE" != "NaN" ]; then
    AI_PER_MIN=$(echo "$AI_SCORING_RATE * 60" | bc -l 2>/dev/null || echo "0")
    pass "AI scoring rate: $(printf '%.1f' "$AI_PER_MIN") leads/min"
else
    info "No AI scores generated yet (may be normal)"
fi

echo ""

# 7. Cost Metrics
echo "7. Cost Metrics Check"
echo "--------------------"

# Observability cost (estimated from metric samples)
METRIC_SAMPLES=$(query_prometheus 'prometheus_tsdb_head_samples_appended_total')
if [ "$METRIC_SAMPLES" != "null" ] && [ "$METRIC_SAMPLES" != "NaN" ]; then
    pass "Observability samples being collected: ${METRIC_SAMPLES}"
else
    warn "Could not retrieve observability cost metrics"
fi

echo ""

# Summary
echo "==================================="
echo "Metrics Check Summary"
echo "==================================="
echo ""
echo -e "${GREEN}✓ Passed: $PASS_COUNT${NC}"
echo -e "${RED}✗ Failed: $FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 All metrics are within acceptable ranges!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some metrics are outside acceptable ranges.${NC}"
    echo "Please review and optimize before launch."
    exit 1
fi
