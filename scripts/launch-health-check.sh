#!/bin/bash
# Launch Health Check Script for Insurance Lead Gen Platform
# Usage: ./scripts/launch-health-check.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for results
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

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
    ((WARN_COUNT++))
}

info() {
    echo -e "ℹ INFO${NC}: $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Read configuration
if [ -f .env ]; then
    source .env
fi

# Default values
API_URL="${API_URL:-http://localhost:3000}"
DATABASE_URL="${DATABASE_URL:-postgresql://localhost:5432/insurance}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3003}"

echo "==================================="
echo "Launch Readiness Health Check"
echo "==================================="
echo ""

# Section 1: Infrastructure Health
echo "1. Infrastructure Health Check"
echo "-------------------------------"

# Check if kubectl is available
if command_exists kubectl; then
    # Check if we can connect to cluster
    if kubectl cluster-info >/dev/null 2>&1; then
        pass "Kubernetes cluster is accessible"
    else
        fail "Cannot connect to Kubernetes cluster"
    fi

    # Check pods are running
    PENDING_PODS=$(kubectl get pods --field-selector=status.phase=Pending -o jsonpath='{.items}' | jq '. | length' 2>/dev/null || echo "0")
    if [ "$PENDING_PODS" -eq 0 ]; then
        pass "No pending pods"
    else
        fail "Found $PENDING_PODS pending pods"
    fi
else
    warn "kubectl not found, skipping Kubernetes checks"
fi

# Check Docker is available
if command_exists docker; then
    if docker info >/dev/null 2>&1; then
        pass "Docker daemon is running"
    else
        fail "Cannot connect to Docker daemon"
    fi
else
    warn "docker not found, skipping Docker checks"
fi

echo ""

# Section 2: Service Health
echo "2. Service Health Check"
echo "-----------------------"

# Check API service health
if command_exists curl; then
    API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" || echo "000")
    if [ "$API_HEALTH" = "200" ]; then
        pass "API service health endpoint responding (200)"
    else
        fail "API service health check failed (status: $API_HEALTH)"
    fi
else
    warn "curl not found, skipping API health check"
fi

# Check database connectivity
if command_exists psql; then
    if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
        pass "Database connection successful"
    else
        fail "Cannot connect to database"
    fi
elif command_exists docker; then
    # Try using docker exec
    DB_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i postgres | head -1)
    if [ -n "$DB_CONTAINER" ]; then
        if docker exec "$DB_CONTAINER" psql -U postgres -d insurance -c "SELECT 1;" >/dev/null 2>&1; then
            pass "Database connection successful (via Docker)"
        else
            fail "Cannot connect to database (via Docker)"
        fi
    else
        warn "No PostgreSQL container found, skipping database check"
    fi
else
    warn "psql not found, skipping database check"
fi

# Check Redis
if command_exists redis-cli; then
    if redis-cli ping >/dev/null 2>&1; then
        pass "Redis is responding"
    else
        fail "Redis is not responding"
    fi
elif command_exists docker; then
    REDIS_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i redis | head -1)
    if [ -n "$REDIS_CONTAINER" ]; then
        if docker exec "$REDIS_CONTAINER" redis-cli ping >/dev/null 2>&1; then
            pass "Redis is responding (via Docker)"
        else
            fail "Redis is not responding (via Docker)"
        fi
    else
        warn "No Redis container found, skipping Redis check"
    fi
else
    warn "redis-cli not found, skipping Redis check"
fi

# Check NATS
if command_exists nats-server; then
    if nats-server -version >/dev/null 2>&1; then
        pass "NATS server is available"
    else
        warn "NATS server check failed"
    fi
else
    warn "nats-server not found, skipping NATS check"
fi

echo ""

# Section 3: Monitoring Stack
echo "3. Monitoring Stack Check"
echo "--------------------------"

# Check Prometheus
if command_exists curl; then
    PROMETHEUS_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$PROMETHEUS_URL/-/healthy" || echo "000")
    if [ "$PROMETHEUS_HEALTH" = "200" ]; then
        pass "Prometheus is healthy"
    else
        fail "Prometheus health check failed (status: $PROMETHEUS_HEALTH)"
    fi

    # Check if targets are up
    ACTIVE_TARGETS=$(curl -s "$PROMETHEUS_URL/api/v1/targets" 2>/dev/null | \
        jq '.data.activeTargets | map(select(.health == "up")) | length' 2>/dev/null || echo "0")
    if [ "$ACTIVE_TARGETS" -gt 0 ]; then
        pass "Prometheus has $ACTIVE_TARGETS healthy targets"
    else
        fail "Prometheus has no healthy targets"
    fi
fi

# Check Grafana
GRAFANA_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$GRAFANA_URL/api/health" || echo "000")
if [ "$GRAFANA_HEALTH" = "200" ]; then
    pass "Grafana is healthy"
else
    fail "Grafana health check failed (status: $GRAFANA_HEALTH)"
fi

echo ""

# Section 4: Security Checks
echo "4. Security Checks"
echo "-------------------"

# Check for .env file in repository
if [ -f .env ]; then
    if [ -n "$(git status .env 2>/dev/null)" ]; then
        fail ".env file is tracked in git (security risk)"
    else
        pass ".env file is not tracked in git"
    fi
else
    warn ".env file not found"
fi

# Check if SSL/TLS is configured
if [[ "$API_URL" == https://* ]]; then
    pass "API URL uses HTTPS"
else
    warn "API URL does not use HTTPS (may be acceptable for dev)"
fi

echo ""

# Section 5: Build and Test Checks
echo "5. Build and Test Checks"
echo "-------------------------"

# Check if node_modules exists
if [ -d "node_modules" ]; then
    pass "Dependencies installed (node_modules exists)"
else
    fail "Dependencies not installed (run: pnpm install)"
fi

# Check if dist directories exist for TypeScript packages
if [ -d "packages/types/dist" ]; then
    pass "types package built"
else
    fail "types package not built (run: pnpm --filter @insurance-lead-gen/types build)"
fi

if [ -d "packages/core/dist" ]; then
    pass "core package built"
else
    fail "core package not built (run: pnpm --filter @insurance-lead-gen/core build)"
fi

if [ -d "packages/config/dist" ]; then
    pass "config package built"
else
    fail "config package not built (run: pnpm --filter @insurance-lead-gen/config build)"
fi

# Check Prisma client
if [ -d "node_modules/.prisma/client" ] || [ -d "apps/data-service/node_modules/.prisma/client" ]; then
    pass "Prisma client generated"
else
    warn "Prisma client may not be generated (run: npx prisma generate)"
fi

echo ""

# Section 6: Configuration Checks
echo "6. Configuration Checks"
echo "----------------------"

# Check required environment variables
REQUIRED_VARS=("DATABASE_URL" "REDIS_URL" "JWT_SECRET")
MISSING_VARS=0

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        warn "Required environment variable $var is not set"
        ((MISSING_VARS++))
    fi
done

if [ $MISSING_VARS -eq 0 ]; then
    pass "All required environment variables are set"
else
    fail "$MISSING_VARS required environment variables are missing"
fi

# Check docker-compose configuration
if [ -f "docker-compose.yml" ]; then
    pass "docker-compose.yml exists"
else
    warn "docker-compose.yml not found"
fi

# Check helm charts
if [ -d "deploy/helm" ]; then
    pass "Helm charts directory exists"
else
    warn "Helm charts directory not found"
fi

echo ""

# Section 7: Documentation Checks
echo "7. Documentation Checks"
echo "-----------------------"

# Check for key documentation
if [ -f "README.md" ]; then
    pass "README.md exists"
else
    fail "README.md not found"
fi

if [ -f "docs/ARCHITECTURE.md" ]; then
    pass "Architecture documentation exists"
else
    fail "Architecture documentation not found"
fi

if [ -f "docs/MONITORING.md" ]; then
    pass "Monitoring documentation exists"
else
    fail "Monitoring documentation not found"
fi

if [ -f "RUN_15_6.md" ]; then
    pass "Launch readiness guide exists"
else
    warn "Launch readiness guide not found"
fi

echo ""

# Summary
echo "==================================="
echo "Health Check Summary"
echo "==================================="
echo ""
echo -e "${GREEN}✓ Passed: $PASS_COUNT${NC}"
echo -e "${YELLOW}⚠ Warnings: $WARN_COUNT${NC}"
echo -e "${RED}✗ Failed: $FAIL_COUNT${NC}"
echo ""

# Overall status
if [ $FAIL_COUNT -eq 0 ] && [ $WARN_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! Ready for launch!${NC}"
    exit 0
elif [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${YELLOW}⚠ All critical checks passed. Review warnings before launch.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Address failures before launch.${NC}"
    exit 1
fi
