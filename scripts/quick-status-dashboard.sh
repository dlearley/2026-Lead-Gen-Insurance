#!/bin/bash
# Quick Status Dashboard for Launch Monitoring
# Usage: ./scripts/quick-status-dashboard.sh
# Run with: watch -n 30 ./scripts/quick-status-dashboard.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Clear screen
clear

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
DATABASE_URL="${DATABASE_URL:-postgresql://localhost:5432/insurance}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3003}"

# Helper to get Prometheus metric
get_metric() {
    local query="$1"
    curl -s "${PROMETHEUS_URL}/api/v1/query?query=$(printf '%s' "$query" | jq -sRr @uri)" 2>/dev/null | \
        jq -r '.data.result[0].value[1] // "null"' 2>/dev/null || echo "N/A"
}

# Print section header
print_header() {
    echo ""
    echo -e "${BLUE}${BOLD}$1${NC}"
    echo "$(printf '=%.0s' {1..60})"
}

# Print status indicator
status_ok() {
    echo -e "${GREEN}✓${NC} $1"
}

status_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

status_error() {
    echo -e "${RED}✗${NC} $1"
}

status_info() {
    echo -e "  ℹ  $1"
}

echo -e "${BOLD}===================================="
echo -e "   PLATFORM LAUNCH STATUS DASHBOARD"
echo -e "====================================${NC}"
echo -e "Last Updated: $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "Environment: ${ENVIRONMENT:-production}"

# 1. Service Health
print_header "1. SERVICE HEALTH"

# API Health
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" 2>/dev/null || echo "000")
if [ "$API_STATUS" = "200" ]; then
    status_ok "API Service (HTTP $API_STATUS)"
else
    status_error "API Service (HTTP $API_STATUS)"
fi

# Pod Status
if command_exists kubectl >/dev/null 2>&1; then
    TOTAL_PODS=$(kubectl get pods --field-selector=status.phase=Running -o jsonpath='{.items}' 2>/dev/null | jq '. | length' || echo "0")
    READY_PODS=$(kubectl get pods --field-selector=status.phase=Running -o jsonpath='{range .items[*]}{.status.containerStatuses[*].ready}{"\n"}{end}' 2>/dev/null | grep -c "true" || echo "0")

    if [ "$TOTAL_PODS" -gt 0 ]; then
        if [ "$READY_PODS" -eq "$TOTAL_PODS" ]; then
            status_ok "Pods: $READY_PODS/$TOTAL_PODS Ready"
        else
            status_warning "Pods: $READY_PODS/$TOTAL_PODS Ready"
        fi
    else
        status_info "Kubernetes: No pods found"
    fi
fi

# Database
if command_exists psql >/dev/null 2>&1 && psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
    status_ok "Database Connection"
else
    status_error "Database Connection"
fi

# Redis
if command_exists redis-cli >/dev/null 2>&1 && redis-cli ping >/dev/null 2>&1; then
    status_ok "Redis Connection"
else
    status_error "Redis Connection"
fi

# 2. Performance Metrics
print_header "2. PERFORMANCE METRICS"

# Error Rate
ERROR_RATE=$(get_metric 'rate(http_requests_total{status=~"5.."}[5m])')
if [ "$ERROR_RATE" != "null" ] && [ "$ERROR_RATE" != "NaN" ] && [ "$ERROR_RATE" != "N/A" ]; then
    ERROR_PERCENT=$(echo "$ERROR_RATE * 100" | bc -l 2>/dev/null || echo "0")
    ERROR_COMPARE=$(echo "$ERROR_RATE < 0.001" | bc -l 2>/dev/null || echo "0")
    if [ "$ERROR_COMPARE" -eq 1 ]; then
        status_ok "Error Rate: $(printf '%.4f%%' "$ERROR_PERCENT")"
    else
        status_error "Error Rate: $(printf '%.4f%%' "$ERROR_PERCENT") (Target: <0.1%)"
    fi
else
    status_info "Error Rate: N/A"
fi

# P95 Response Time
P95_TIME=$(get_metric 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))')
if [ "$P95_TIME" != "null" ] && [ "$P95_TIME" != "NaN" ] && [ "$P95_TIME" != "N/A" ]; then
    P95_MS=$(echo "$P95_TIME * 1000" | bc -l 2>/dev/null || echo "0")
    P95_COMPARE=$(echo "$P95_TIME < 0.3" | bc -l 2>/dev/null || echo "0")
    if [ "$P95_COMPARE" -eq 1 ]; then
        status_ok "P95 Response Time: $(printf '%.0fms' "$P95_MS")"
    else
        status_warning "P95 Response Time: $(printf '%.0fms' "$P95_MS") (Target: <300ms)"
    fi
else
    status_info "P95 Response Time: N/A"
fi

# P99 Response Time
P99_TIME=$(get_metric 'histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))')
if [ "$P99_TIME" != "null" ] && [ "$P99_TIME" != "NaN" ] && [ "$P99_TIME" != "N/A" ]; then
    P99_MS=$(echo "$P99_TIME * 1000" | bc -l 2>/dev/null || echo "0")
    P99_COMPARE=$(echo "$P99_TIME < 0.5" | bc -l 2>/dev/null || echo "0")
    if [ "$P99_COMPARE" -eq 1 ]; then
        status_ok "P99 Response Time: $(printf '%.0fms' "$P99_MS")"
    else
        status_warning "P99 Response Time: $(printf '%.0fms' "$P99_MS") (Target: <500ms)"
    fi
else
    status_info "P99 Response Time: N/A"
fi

# Database Query Time
DB_TIME=$(get_metric 'histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))')
if [ "$DB_TIME" != "null" ] && [ "$DB_TIME" != "NaN" ] && [ "$DB_TIME" != "N/A" ]; then
    DB_MS=$(echo "$DB_TIME * 1000" | bc -l 2>/dev/null || echo "0")
    DB_COMPARE=$(echo "$DB_TIME < 0.1" | bc -l 2>/dev/null || echo "0")
    if [ "$DB_COMPARE" -eq 1 ]; then
        status_ok "DB Query P95: $(printf '%.0fms' "$DB_MS")"
    else
        status_warning "DB Query P95: $(printf '%.0fms' "$DB_MS") (Target: <100ms)"
    fi
else
    status_info "DB Query Time: N/A"
fi

# 3. Availability
print_header "3. SYSTEM AVAILABILITY"

# API Uptime
API_UP=$(get_metric 'up{job="api-service"}')
if [ "$API_UP" = "1" ]; then
    status_ok "API Service: UP"
else
    status_error "API Service: DOWN"
fi

# Uptime Percentage
UPTIME=$(get_metric 'avg_over_time(up{job="api-service"}[1h])')
if [ "$UPTIME" != "null" ] && [ "$UPTIME" != "NaN" ] && [ "$UPTIME" != "N/A" ]; then
    UPTIME_COMPARE=$(echo "$UPTIME > 0.999" | bc -l 2>/dev/null || echo "0")
    if [ "$UPTIME_COMPARE" -eq 1 ]; then
        status_ok "Uptime (1h): $(printf '%.3f%%' "$(echo "$UPTIME * 100" | bc -l)")"
    else
        status_warning "Uptime (1h): $(printf '%.3f%%' "$(echo "$UPTIME * 100" | bc -l)") (Target: ≥99.9%)"
    fi
else
    status_info "Uptime: N/A"
fi

# 4. Cache & Resources
print_header "4. CACHE & RESOURCES"

# Cache Hit Rate
CACHE_RATE=$(get_metric 'redis_cache_hit_rate')
if [ "$CACHE_RATE" = "null" ] || [ "$CACHE_RATE" = "NaN" ] || [ "$CACHE_RATE" = "N/A" ]; then
    CACHE_RATE=$(get_metric 'rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))')
fi

if [ "$CACHE_RATE" != "null" ] && [ "$CACHE_RATE" != "NaN" ] && [ "$CACHE_RATE" != "N/A" ]; then
    CACHE_COMPARE=$(echo "$CACHE_RATE > 0.8" | bc -l 2>/dev/null || echo "0")
    if [ "$CACHE_COMPARE" -eq 1 ]; then
        status_ok "Cache Hit Rate: $(printf '%.1f%%' "$(echo "$CACHE_RATE * 100" | bc -l)")"
    else
        status_warning "Cache Hit Rate: $(printf '%.1f%%' "$(echo "$CACHE_RATE * 100" | bc -l)") (Target: >80%)"
    fi
else
    status_info "Cache Hit Rate: N/A"
fi

# Memory Usage (if kubectl available)
if command_exists kubectl >/dev/null 2>&1; then
    MEMORY_PERCENT=$(kubectl top pods -l app=api --no-headers 2>/dev/null | awk '{sum+=$4; count++} END {if(count>0) print sum/count; else print "N/A"}' || echo "N/A")
    if [ "$MEMORY_PERCENT" != "N/A" ]; then
        MEM_COMPARE=$(echo "$MEMORY_PERCENT < 80" | bc -l 2>/dev/null || echo "0")
        if [ "$MEM_COMPARE" -eq 1 ]; then
            status_ok "Memory Usage: $(printf '%.1f%%' "$MEMORY_PERCENT")"
        else
            status_warning "Memory Usage: $(printf '%.1f%%' "$MEMORY_PERCENT")"
        fi
    fi
fi

# 5. Business Metrics
print_header "5. BUSINESS METRICS"

# Lead Creation Rate
LEAD_RATE=$(get_metric 'rate(leads_created_total[5m])')
if [ "$LEAD_RATE" != "null" ] && [ "$LEAD_RATE" != "NaN" ] && [ "$LEAD_RATE" != "N/A" ]; then
    LEADS_PER_MIN=$(echo "$LEAD_RATE * 60" | bc -l 2>/dev/null || echo "0")
    status_info "Lead Creation: $(printf '%.1f' "$LEADS_PER_MIN") leads/min"
else
    status_info "Lead Creation: N/A"
fi

# AI Scoring Rate
AI_RATE=$(get_metric 'rate(ai_leads_scored_total[5m])')
if [ "$AI_RATE" != "null" ] && [ "$AI_RATE" != "NaN" ] && [ "$AI_RATE" != "N/A" ]; then
    AI_PER_MIN=$(echo "$AI_RATE * 60" | bc -l 2>/dev/null || echo "0")
    status_info "AI Scoring: $(printf '%.1f' "$AI_PER_MIN") leads/min"
else
    status_info "AI Scoring: N/A"
fi

# Total Leads
TOTAL_LEADS=$(get_metric 'leads_total')
if [ "$TOTAL_LEADS" != "null" ] && [ "$TOTAL_LEADS" != "NaN" ] && [ "$TOTAL_LEADS" != "N/A" ]; then
    status_info "Total Leads: ${TOTAL_LEADS}"
else
    status_info "Total Leads: N/A"
fi

# 6. Monitoring Status
print_header "6. MONITORING STATUS"

# Prometheus
PROM_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${PROMETHEUS_URL}/-/healthy" 2>/dev/null || echo "000")
if [ "$PROM_STATUS" = "200" ]; then
    status_ok "Prometheus: Healthy ($PROM_URL)"
else
    status_warning "Prometheus: Unhealthy"
fi

# Grafana
GRAFANA_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${GRAFANA_URL}/api/health" 2>/dev/null || echo "000")
if [ "$GRAFANA_STATUS" = "200" ]; then
    status_ok "Grafana: Healthy"
else
    status_warning "Grafana: Unhealthy"
fi

# Active Alerts
ACTIVE_ALERTS=$(curl -s "${PROMETHEUS_URL}/api/v1/alerts" 2>/dev/null | jq '[.data.alerts[] | select(.state=="firing")] | length' 2>/dev/null || echo "N/A")
if [ "$ACTIVE_ALERTS" = "0" ]; then
    status_ok "Active Alerts: 0"
elif [ "$ACTIVE_ALERTS" != "N/A" ]; then
    status_warning "Active Alerts: ${ACTIVE_ALERTS}"
else
    status_info "Active Alerts: N/A"
fi

# 7. Quick Actions
print_header "7. QUICK ACTIONS"
echo ""
echo -e "  📊 Grafana:       ${GRAFANA_URL} (admin/admin)"
echo -e "  📈 Prometheus:    ${PROMETHEUS_URL}"
echo -e "  🔍 Tracing:       http://localhost:16686"
echo -e "  📝 Logs:         http://localhost:3100"
echo -e "  🚀 API Health:    ${API_URL}/health"
echo ""

# 8. Overall Status
print_header "8. OVERALL STATUS"

# Count errors and warnings
ERRORS=0
WARNINGS=0

# Simple heuristics based on metrics
if [ "$API_STATUS" != "200" ]; then ((ERRORS++)); fi
if [ "$ERROR_RATE" != "null" ] && [ "$ERROR_RATE" != "N/A" ]; then
    ERROR_COMPARE=$(echo "$ERROR_RATE > 0.001" | bc -l 2>/dev/null || echo "0")
    if [ "$ERROR_COMPARE" -eq 1 ]; then ((ERRORS++)); fi
fi
if [ "$API_UP" = "0" ]; then ((ERRORS++)); fi
if [ "$P95_TIME" != "null" ] && [ "$P95_TIME" != "N/A" ]; then
    P95_COMPARE=$(echo "$P95_TIME > 0.5" | bc -l 2>/dev/null || echo "0")
    if [ "$P95_COMPARE" -eq 1 ]; then ((WARNINGS++)); fi
fi
if [ "$ACTIVE_ALERTS" != "N/A" ] && [ "$ACTIVE_ALERTS" -gt 0 ]; then ((WARNINGS++)); fi

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "    ${GREEN}${BOLD}✓ ALL SYSTEMS OPERATIONAL${NC}"
    echo ""
    echo -e "    ${GREEN}Platform is running normally.${NC}"
elif [ $ERRORS -eq 0 ]; then
    echo -e "    ${YELLOW}${BOLD}⚠ SYSTEMS OPERATIONAL WITH WARNINGS${NC}"
    echo ""
    echo -e "    ${YELLOW}Platform is running but attention needed.${NC}"
else
    echo -e "    ${RED}${BOLD}✗ ISSUES DETECTED${NC}"
    echo ""
    echo -e "    ${RED}Critical issues require immediate attention.${NC}"
fi

echo ""
echo -e "${BOLD}====================================${NC}"
echo -e "   Press Ctrl+C to exit"
echo -e "   Refresh every 30s: watch -n 30 $0"
echo -e "${BOLD}====================================${NC}"
echo ""

# Show last 5 errors from logs (if available)
if command_exists kubectl >/dev/null 2>&1; then
    echo -e "${YELLOW}Recent Errors (last 5):${NC}"
    kubectl logs -l app=api --tail=100 --all-containers=true 2>/dev/null | \
        grep -i "error\|exception\|fail" | tail -5 || echo "  No recent errors"
fi

echo ""
