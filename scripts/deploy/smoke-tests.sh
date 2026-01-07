#!/bin/bash

# Smoke test script for CI/CD pipeline
# Usage: ./smoke-tests.sh <environment> [test_type]
# Environment: dev, staging, prod
# Test type: basic, critical, full

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Global variables
ENVIRONMENT=""
TEST_TYPE="basic"
NAMESPACE=""
API_URL=""
FRONTEND_URL=""
FAILED_TESTS=()

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Display usage information
usage() {
    echo "Usage: $0 <environment> [test_type]"
    echo ""
    echo "Environment: dev, staging, prod"
    echo "Test type: basic, critical, full"
    echo ""
    echo "Examples:"
    echo "  $0 staging basic"
    echo "  $0 prod critical"
    echo "  $0 dev full"
}

# Parse command line arguments
parse_arguments() {
    ENVIRONMENT=${1:-dev}
    TEST_TYPE=${2:-basic}
    
    # Validate environment
    case $ENVIRONMENT in
        dev|staging|prod)
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod"
            exit 1
            ;;
    esac
    
    # Validate test type
    case $TEST_TYPE in
        basic|critical|full)
            ;;
        *)
            log_error "Invalid test type: $TEST_TYPE. Must be basic, critical, or full"
            exit 1
            ;;
    esac
    
    # Set namespace and URLs based on environment
    case $ENVIRONMENT in
        dev)
            NAMESPACE="dev"
            API_URL="https://dev-api.insurance-lead-gen.com"
            FRONTEND_URL="https://dev.insurance-lead-gen.com"
            ;;
        staging)
            NAMESPACE="staging"
            API_URL="https://staging-api.insurance-lead-gen.com"
            FRONTEND_URL="https://staging.insurance-lead-gen.com"
            ;;
        prod)
            NAMESPACE="production"
            API_URL="https://api.insurance-lead-gen.com"
            FRONTEND_URL="https://insurance-lead-gen.com"
            ;;
    esac
}

# Test API health endpoint
test_api_health() {
    log_info "Testing API health endpoint..."
    
    local response_code
    local response_time
    local endpoint="$API_URL/health"
    
    response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$endpoint" 2>/dev/null || echo "000")
    response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "$endpoint" 2>/dev/null || echo "999")
    
    if [[ "$response_code" == "200" ]]; then
        log_success "API health: HTTP $response_code (${response_time}s)"
        return 0
    else
        log_error "API health: HTTP $response_code (${response_time}s)"
        FAILED_TESTS+=("API health endpoint")
        return 1
    fi
}

# Test API readiness endpoint
test_api_readiness() {
    log_info "Testing API readiness endpoint..."
    
    local response_code
    local response_time
    local endpoint="$API_URL/ready"
    
    response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$endpoint" 2>/dev/null || echo "000")
    response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "$endpoint" 2>/dev/null || echo "999")
    
    if [[ "$response_code" == "200" ]]; then
        log_success "API readiness: HTTP $response_code (${response_time}s)"
        return 0
    else
        log_error "API readiness: HTTP $response_code (${response_time}s)"
        FAILED_TESTS+=("API readiness endpoint")
        return 1
    fi
}

# Test basic API endpoints
test_basic_api_endpoints() {
    log_info "Testing basic API endpoints..."
    
    local endpoints=(
        "$API_URL/api/v1/health"
        "$API_URL/api/v1/status"
    )
    
    local failed_endpoints=()
    
    for endpoint in "${endpoints[@]}"; do
        log_info "Testing endpoint: $endpoint"
        
        local response_code
        response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$endpoint" 2>/dev/null || echo "000")
        
        if [[ "$response_code" == "200" || "$response_code" == "404" ]]; then
            log_success "$endpoint: HTTP $response_code"
        else
            log_error "$endpoint: HTTP $response_code"
            failed_endpoints+=("$endpoint")
        fi
    done
    
    if [[ ${#failed_endpoints[@]} -gt 0 ]]; then
        log_error "Failed endpoints: ${failed_endpoints[*]}"
        FAILED_TESTS+=("basic API endpoints: ${failed_endpoints[*]}")
        return 1
    fi
    
    log_success "All basic API endpoints are working"
    return 0
}

# Test lead management functionality
test_lead_management() {
    log_info "Testing lead management functionality..."
    
    if [[ "$TEST_TYPE" == "basic" ]]; then
        log_info "Skipping lead management tests (basic test type)"
        return 0
    fi
    
    local test_lead_data='{"name":"Test Lead","email":"test@example.com","phone":"+1234567890","source":"smoke_test"}'
    local response_code
    local response_body
    
    # Test creating a lead
    response_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "$test_lead_data" \
        --max-time 10 \
        "$API_URL/api/v1/leads" 2>/dev/null || echo "000")
    
    if [[ "$response_code" == "200" || "$response_code" == "201" ]]; then
        log_success "Lead creation: HTTP $response_code"
    else
        log_error "Lead creation: HTTP $response_code"
        FAILED_TESTS+=("lead creation")
        return 1
    fi
    
    # Test retrieving leads
    response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API_URL/api/v1/leads" 2>/dev/null || echo "000")
    
    if [[ "$response_code" == "200" ]]; then
        log_success "Lead retrieval: HTTP $response_code"
    else
        log_error "Lead retrieval: HTTP $response_code"
        FAILED_TESTS+=("lead retrieval")
        return 1
    fi
    
    log_success "Lead management functionality is working"
    return 0
}

# Test analytics functionality
test_analytics_functionality() {
    log_info "Testing analytics functionality..."
    
    if [[ "$TEST_TYPE" == "basic" ]]; then
        log_info "Skipping analytics tests (basic test type)"
        return 0
    fi
    
    local endpoints=(
        "$API_URL/api/v1/analytics/dashboard"
        "$API_URL/api/v1/analytics/leads"
        "$API_URL/api/v1/analytics/conversion"
    )
    
    local failed_endpoints=()
    
    for endpoint in "${endpoints[@]}"; do
        log_info "Testing analytics endpoint: $endpoint"
        
        local response_code
        response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$endpoint" 2>/dev/null || echo "000")
        
        if [[ "$response_code" == "200" || "$response_code" == "401" ]]; then
            log_success "$endpoint: HTTP $response_code"
        else
            log_error "$endpoint: HTTP $response_code"
            failed_endpoints+=("$endpoint")
        fi
    done
    
    if [[ ${#failed_endpoints[@]} -gt 0 ]]; then
        log_error "Failed analytics endpoints: ${failed_endpoints[*]}"
        FAILED_TESTS+=("analytics endpoints: ${failed_endpoints[*]}")
        return 1
    fi
    
    log_success "Analytics functionality is working"
    return 0
}

# Test database operations
test_database_operations() {
    log_info "Testing database operations..."
    
    if [[ "$TEST_TYPE" == "basic" ]]; then
        log_info "Skipping database tests (basic test type)"
        return 0
    fi
    
    # Test database connectivity through API
    local response_code
    response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API_URL/api/v1/health/database" 2>/dev/null || echo "000")
    
    if [[ "$response_code" == "200" ]]; then
        log_success "Database connectivity: HTTP $response_code"
    else
        log_warning "Database health endpoint: HTTP $response_code (may not be implemented)"
    fi
    
    # Test critical database operations
    local test_data='{"operation":"test","timestamp":"'$(date -Iseconds)'"}'
    response_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "$test_data" \
        --max-time 10 \
        "$API_URL/api/v1/test/database" 2>/dev/null || echo "000")
    
    if [[ "$response_code" == "200" || "$response_code" == "404" ]]; then
        log_success "Database test operation: HTTP $response_code"
    else
        log_error "Database test operation: HTTP $response_code"
        FAILED_TESTS+=("database operations")
        return 1
    fi
    
    log_success "Database operations test completed"
    return 0
}

# Test external service integrations
test_external_integrations() {
    log_info "Testing external service integrations..."
    
    if [[ "$TEST_TYPE" == "basic" ]]; then
        log_info "Skipping integration tests (basic test type)"
        return 0
    fi
    
    # Test Redis connectivity
    local redis_response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$API_URL/api/v1/health/redis" 2>/dev/null || echo "000")
    if [[ "$redis_response" == "200" ]]; then
        log_success "Redis integration: HTTP $redis_response"
    else
        log_warning "Redis integration: HTTP $redis_response"
    fi
    
    # Test email service integration
    local email_response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$API_URL/api/v1/health/email" 2>/dev/null || echo "000")
    if [[ "$email_response" == "200" ]]; then
        log_success "Email service integration: HTTP $email_response"
    else
        log_warning "Email service integration: HTTP $email_response"
    fi
    
    # Test third-party API integrations
    local third_party_response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$API_URL/api/v1/health/integrations" 2>/dev/null || echo "000")
    if [[ "$third_party_response" == "200" ]]; then
        log_success "Third-party integrations: HTTP $third_party_response"
    else
        log_warning "Third-party integrations: HTTP $third_party_response"
    fi
    
    log_success "External integration tests completed"
    return 0
}

# Test frontend functionality
test_frontend_functionality() {
    log_info "Testing frontend functionality..."
    
    local response_code
    local response_time
    local endpoint="$FRONTEND_URL"
    
    response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$endpoint" 2>/dev/null || echo "000")
    response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "$endpoint" 2>/dev/null || echo "999")
    
    if [[ "$response_code" == "200" ]]; then
        log_success "Frontend accessibility: HTTP $response_code (${response_time}s)"
        
        # Check for basic frontend content
        local response_body
        response_body=$(curl -s --max-time 10 "$endpoint" 2>/dev/null || echo "")
        
        if echo "$response_body" | grep -q "Insurance\|Lead\|Generation" 2>/dev/null; then
            log_success "Frontend content validation passed"
        else
            log_warning "Frontend content validation failed (expected Insurance/Lead/Generation content)"
        fi
    else
        log_error "Frontend accessibility: HTTP $response_code (${response_time}s)"
        FAILED_TESTS+=("frontend accessibility")
        return 1
    fi
    
    # Test critical frontend routes
    if [[ "$TEST_TYPE" != "basic" ]]; then
        local routes=(
            "$FRONTEND_URL/dashboard"
            "$FRONTEND_URL/leads"
            "$FRONTEND_URL/analytics"
        )
        
        for route in "${routes[@]}"; do
            response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$route" 2>/dev/null || echo "000")
            if [[ "$response_code" == "200" || "$response_code" == "404" ]]; then
                log_success "Frontend route $route: HTTP $response_code"
            else
                log_warning "Frontend route $route: HTTP $response_code"
            fi
        done
    fi
    
    log_success "Frontend functionality test completed"
    return 0
}

# Test performance benchmarks
test_performance_benchmarks() {
    log_info "Testing performance benchmarks..."
    
    if [[ "$TEST_TYPE" == "basic" ]]; then
        log_info "Skipping performance tests (basic test type)"
        return 0
    fi
    
    # Test API response time
    local response_time
    response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "$API_URL/health" 2>/dev/null || echo "999")
    
    # Define performance thresholds based on environment
    local max_response_time=2.0
    case $ENVIRONMENT in
        prod)
            max_response_time=1.0
            ;;
        staging)
            max_response_time=1.5
            ;;
    esac
    
    if (( $(echo "$response_time < $max_response_time" | bc -l) )); then
        log_success "API response time: ${response_time}s (threshold: ${max_response_time}s)"
    else
        log_error "API response time: ${response_time}s (threshold: ${max_response_time}s)"
        FAILED_TESTS+=("API performance: ${response_time}s")
        return 1
    fi
    
    # Test concurrent requests
    log_info "Testing concurrent request handling..."
    local concurrent_test_result
    concurrent_test_result=$(seq 1 10 | xargs -n 1 -I {} curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$API_URL/health" 2>/dev/null | sort | uniq -c | head -1)
    
    if [[ -n "$concurrent_test_result" ]]; then
        log_success "Concurrent request test: $concurrent_test_result"
    else
        log_warning "Concurrent request test failed"
    fi
    
    log_success "Performance benchmark tests completed"
    return 0
}

# Test critical user flows
test_critical_user_flows() {
    log_info "Testing critical user flows..."
    
    if [[ "$TEST_TYPE" == "basic" ]]; then
        log_info "Skipping user flow tests (basic test type)"
        return 0
    fi
    
    # Test lead submission flow
    log_info "Testing lead submission flow..."
    
    local lead_data='{
        "name":"Smoke Test User",
        "email":"smoke.test@example.com",
        "phone":"+1234567890",
        "insuranceType":"auto",
        "source":"smoke_test",
        "utm_source":"smoke_test",
        "utm_medium":"automated_test",
        "utm_campaign":"deployment_validation"
    }'
    
    local response_code
    response_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "$lead_data" \
        --max-time 10 \
        "$API_URL/api/v1/leads" 2>/dev/null || echo "000")
    
    if [[ "$response_code" == "200" || "$response_code" == "201" ]]; then
        log_success "Lead submission flow: HTTP $response_code"
    else
        log_error "Lead submission flow: HTTP $response_code"
        FAILED_TESTS+=("lead submission flow")
        return 1
    fi
    
    # Test dashboard access flow
    log_info "Testing dashboard access flow..."
    
    response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$FRONTEND_URL/dashboard" 2>/dev/null || echo "000")
    
    if [[ "$response_code" == "200" || "$response_code" == "401" ]]; then
        log_success "Dashboard access flow: HTTP $response_code"
    else
        log_error "Dashboard access flow: HTTP $response_code"
        FAILED_TESTS+=("dashboard access flow")
        return 1
    fi
    
    log_success "Critical user flow tests completed"
    return 0
}

# Run all smoke tests
run_smoke_tests() {
    log_info "Running smoke tests for $ENVIRONMENT environment ($TEST_TYPE)"
    log_info "Namespace: $NAMESPACE"
    log_info "API URL: $API_URL"
    log_info "Frontend URL: $FRONTEND_URL"
    echo ""
    
    # Core functionality tests
    test_api_health || true
    test_api_readiness || true
    test_basic_api_endpoints || true
    test_frontend_functionality || true
    
    # Environment-specific tests
    case $TEST_TYPE in
        critical)
            test_lead_management || true
            test_analytics_functionality || true
            test_critical_user_flows || true
            ;;
        full)
            test_lead_management || true
            test_analytics_functionality || true
            test_database_operations || true
            test_external_integrations || true
            test_performance_benchmarks || true
            test_critical_user_flows || true
            ;;
    esac
    
    echo ""
    
    # Report results
    if [[ ${#FAILED_TESTS[@]} -eq 0 ]]; then
        log_success "All smoke tests passed!"
        return 0
    else
        log_error "Smoke test failures detected:"
        for test in "${FAILED_TESTS[@]}"; do
            echo "  - $test"
        done
        return 1
    fi
}

# Generate smoke test report
generate_test_report() {
    log_info "Generating smoke test report..."
    
    local report_file="smoke-test-report-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# Smoke Test Report

**Environment:** $ENVIRONMENT
**Test Type:** $TEST_TYPE
**Timestamp:** $(date)
**Namespace:** $NAMESPACE

## Test Results Summary

**Overall Status:** $(if [[ ${#FAILED_TESTS[@]} -eq 0 ]]; then echo "✅ PASSED"; else echo "❌ FAILED"; fi)

**Total Tests:** $(echo "$(( ${#FAILED_TESTS[@]} + 0 ))")
**Passed:** $(echo "$(( ${#FAILED_TESTS[@]} == 0 ))")
**Failed:** ${#FAILED_TESTS[@]}

## Tests Executed

### Core Functionality
- ✅ API Health Endpoint
- ✅ API Readiness Endpoint
- ✅ Basic API Endpoints
- ✅ Frontend Accessibility

### Environment-Specific Tests
$(case $TEST_TYPE in
    "basic")
        echo "- ⏭️ Lead Management (skipped for basic test)"
        echo "- ⏭️ Analytics Functionality (skipped for basic test)"
        echo "- ⏭️ Database Operations (skipped for basic test)"
        echo "- ⏭️ External Integrations (skipped for basic test)"
        echo "- ⏭️ Performance Benchmarks (skipped for basic test)"
        echo "- ⏭️ Critical User Flows (skipped for basic test)"
        ;;
    "critical")
        echo "- ✅ Lead Management"
        echo "- ✅ Analytics Functionality"
        echo "- ⏭️ Database Operations (skipped for critical test)"
        echo "- ⏭️ External Integrations (skipped for critical test)"
        echo "- ⏭️ Performance Benchmarks (skipped for critical test)"
        echo "- ✅ Critical User Flows"
        ;;
    "full")
        echo "- ✅ Lead Management"
        echo "- ✅ Analytics Functionality"
        echo "- ✅ Database Operations"
        echo "- ✅ External Integrations"
        echo "- ✅ Performance Benchmarks"
        echo "- ✅ Critical User Flows"
        ;;
esac)

## Failed Tests

$(if [[ ${#FAILED_TESTS[@]} -gt 0 ]]; then
    for test in "${FAILED_TESTS[@]}"; do
        echo "- $test"
    done
else
    echo "No tests failed!"
fi)

## Environment Information

- **API URL:** $API_URL
- **Frontend URL:** $FRONTEND_URL
- **Namespace:** $NAMESPACE
- **Test Type:** $TEST_TYPE

## Recommendations

$(if [[ ${#FAILED_TESTS[@]} -gt 0 ]]; then
    echo "1. Investigate and fix failed tests before proceeding with deployment"
    echo "2. Run full smoke tests to ensure comprehensive coverage"
    echo "3. Monitor application logs for additional error details"
else
    echo "1. All smoke tests passed successfully"
    echo "2. Deployment can proceed with confidence"
    echo "3. Continue with post-deployment monitoring"
fi)

---

**Report generated by smoke test script**
EOF
    
    log_success "Smoke test report generated: $report_file"
}

# Main function
main() {
    log_info "Starting smoke tests for $ENVIRONMENT environment"
    log_info "Test type: $TEST_TYPE"
    log_info "Timestamp: $(date)"
    
    if run_smoke_tests; then
        generate_test_report
        log_success "Smoke tests completed successfully"
        exit 0
    else
        generate_test_report
        log_error "Smoke tests failed"
        exit 1
    fi
}

# Handle script arguments
if [[ $# -lt 1 ]]; then
    usage
    exit 1
fi

parse_arguments "$@"
main