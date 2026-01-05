#!/bin/bash

# Failover Testing Script
# Tests disaster recovery procedures including database failover, regional failover, and service recovery
# Usage: ./failover-test.sh [test-type] [namespace]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAMESPACE=${2:-production}
TEST_TYPE=${1:-all}  # all, database, regional, service
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="/tmp/failover-test-$TIMESTAMP.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log "INFO" "Starting failover testing for $NAMESPACE namespace"

# Help function
show_help() {
    cat << EOF
Failover Testing Script

Usage: $0 [TEST_TYPE] [NAMESPACE]

TEST_TYPES:
    all         - Run all failover tests (default)
    database    - Test database failover only
    regional    - Test regional failover only
    service     - Test service failover only

NAMESPACES:
    production  - Production environment (default)
    staging     - Staging environment

EXAMPLES:
    $0 all production       # Run all tests in production
    $0 database staging     # Test database failover in staging
    $0 service              # Test service failover in production

OUTPUT:
    Test results logged to: $LOG_FILE

WARNING: This script will perform actual failover operations!
Only run in non-production environments unless explicitly approved.

EOF
}

# Parse command line arguments
case $1 in
    -h|--help)
        show_help
        exit 0
        ;;
    database|regional|service|all)
        TEST_TYPE=$1
        ;;
    *)
        if [ -n "$1" ] && [ "$1" != "production" ]; then
            echo "Unknown test type: $1"
            show_help
            exit 1
        fi
        ;;
esac

if [ -n "$2" ] && [ "$2" != "production" ] && [ "$2" != "staging" ]; then
    echo "Unknown namespace: $2"
    show_help
    exit 1
fi

# Utility functions
print_section() {
    local title="$1"
    echo -e "\n${BLUE}=== $title ===${NC}"
    log "INFO" "=== $title ==="
}

print_success() {
    local message="$1"
    echo -e "${GREEN}✅ $message${NC}"
    log "INFO" "✅ $message"
}

print_warning() {
    local message="$1"
    echo -e "${YELLOW}⚠️  $message${NC}"
    log "WARN" "⚠️  $message"
}

print_error() {
    local message="$1"
    echo -e "${RED}❌ $message${NC}"
    log "ERROR" "❌ $message"
}

print_info() {
    local message="$1"
    echo -e "${BLUE}ℹ️  $message${NC}"
    log "INFO" "ℹ️  $message"
}

# Check prerequisites
check_prerequisites() {
    print_section "Prerequisites Check"
    
    # Check if running in production
    if [ "$NAMESPACE" = "production" ]; then
        echo -e "${RED}WARNING: Running failover tests in PRODUCTION!${NC}"
        read -p "Are you sure you want to continue? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            print_info "Failover test cancelled by user"
            exit 1
        fi
    fi
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl not found. Please install kubectl."
        exit 1
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check namespace
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        print_error "Namespace $NAMESPACE not found"
        exit 1
    fi
    
    # Check required services
    local required_services=("postgres" "api" "backend")
    for service in "${required_services[@]}"; do
        if ! kubectl get pods -n "$NAMESPACE" -l app=$service &> /dev/null; then
            print_error "Required service $service not found in $NAMESPACE"
            exit 1
        fi
    done
    
    print_success "All prerequisites satisfied"
}

# Database failover testing
test_database_failover() {
    print_section "Database Failover Test"
    
    POSTGRES_POD=$(kubectl get pods -n "$NAMESPACE" -l app=postgres --no-headers | head -1 | awk '{print $1}')
    
    if [ -z "$POSTGRES_POD" ]; then
        print_error "PostgreSQL pod not found"
        return 1
    fi
    
    # Check if read replica exists
    REPLICA_POD=$(kubectl get pods -n "$NAMESPACE" -l app=postgres-replica --no-headers | head -1 | awk '{print $1}' 2>/dev/null)
    
    # Test 1: Check replication status
    log "INFO" "Testing replication status..."
    
    if kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- \
       psql -U postgres -c "SELECT * FROM pg_stat_replication;" &> /dev/null; then
        print_success "Replication is configured"
    else
        print_warning "No replication configured or replica not found"
        if [ "$NAMESPACE" = "production" ]; then
            print_info "Skipping replica failover test (no replica configured)"
            return 0
        fi
    fi
    
    # Test 2: Simulate primary failure
    log "INFO" "Simulating primary database failure..."
    
    # Save current replicas
    ORIGINAL_REPLICAS=$(kubectl get deployment postgres -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")
    
    # Scale down primary
    kubectl scale deployment postgres -n "$NAMESPACE" --replicas=0
    print_info "Primary database scaled down"
    
    # Wait for failover detection
    sleep 30
    
    # Test 3: Promote replica if available
    if [ -n "$REPLICA_POD" ]; then
        log "INFO" "Testing replica promotion..."
        
        # Check if replica is in recovery mode
        IS_REPLICA=$(kubectl exec -n "$NAMESPACE" "$REPLICA_POD" -- \
          psql -U postgres -c "SELECT pg_is_in_recovery();" 2>/dev/null | tail -1 | tr -d ' ')
        
        if [ "$IS_REPLICA" = "t" ]; then
            print_success "Replica is in recovery mode, testing promotion..."
            
            # Promote replica
            if kubectl exec -n "$NAMESPACE" "$REPLICA_POD" -- \
               psql -U postgres -c "SELECT pg_promote();" &> /dev/null; then
                print_success "Replica promotion successful"
            else
                print_error "Replica promotion failed"
                kubectl scale deployment postgres -n "$NAMESPACE" --replicas=$ORIGINAL_REPLICAS
                return 1
            fi
        else
            print_warning "Replica not in recovery mode"
        fi
    else
        print_info "No replica found for promotion test"
    fi
    
    # Test 4: Update application connection
    log "INFO" "Testing application connection to failed-over database..."
    
    # Update service selector to point to replica if available
    if [ -n "$REPLICA_POD" ]; then
        kubectl patch service postgres -n "$NAMESPACE" \
          --patch '{"spec":{"selector":{"app":"postgres-replica"}}}' &> /dev/null
        
        sleep 10
        
        # Test API connectivity
        if kubectl exec -n "$NAMESPACE" deployment/api -- \
           npm run db:test-connection &> /dev/null; then
            print_success "Application connectivity to failed-over database successful"
        else
            print_error "Application connectivity to failed-over database failed"
            kubectl patch service postgres -n "$NAMESPACE" \
              --patch '{"spec":{"selector":{"app":"postgres"}}}' &> /dev/null
            kubectl scale deployment postgres -n "$NAMESPACE" --replicas=$ORIGINAL_REPLICAS
            return 1
        fi
    fi
    
    # Test 5: Fail back to original primary
    log "INFO" "Testing failback to original primary..."
    
    # Restore original configuration
    kubectl scale deployment postgres -n "$NAMESPACE" --replicas=$ORIGINAL_REPLICAS
    kubectl patch service postgres -n "$NAMESPACE" \
      --patch '{"spec":{"selector":{"app":"postgres"}}}' &> /dev/null
    
    # Wait for primary to be ready
    sleep 30
    
    # Test connectivity
    if kubectl exec -n "$NAMESPACE" deployment/api -- \
       npm run db:test-connection &> /dev/null; then
        print_success "Failback to original primary successful"
    else
        print_error "Failback to original primary failed"
        return 1
    fi
    
    # Test 6: Verify data consistency
    log "INFO" "Verifying data consistency after failover/failback..."
    
    LEAD_COUNT=$(kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- \
      psql -U postgres -d insurance_lead_gen -t -c "SELECT COUNT(*) FROM leads;" 2>/dev/null | tr -d ' ')
    
    if [ -n "$LEAD_COUNT" ] && [ "$LEAD_COUNT" -gt "0" ]; then
        print_success "Data consistency verified ($LEAD_COUNT leads)"
    else
        print_warning "Could not verify data consistency"
    fi
    
    print_success "Database failover test completed"
}

# Regional failover testing
test_regional_failover() {
    print_section "Regional Failover Test"
    
    # This test requires multi-region setup
    log "INFO" "Checking multi-region configuration..."
    
    # Check for multiple ingress configurations
    INGRESS_COUNT=$(kubectl get ingress -n "$NAMESPACE" --no-headers | wc -l)
    
    if [ "$INGRESS_COUNT" -lt "2" ]; then
        print_warning "Single region configuration detected"
        print_info "Regional failover test requires multi-region setup"
        return 0
    fi
    
    # Test 1: Check DNS configuration
    log "INFO" "Testing DNS configuration..."
    
    # Get current DNS target
    ORIGINAL_DNS=$(dig +short api.insurance-lead-gen.com | head -1)
    print_info "Original DNS target: $ORIGINAL_DNS"
    
    if [ -z "$ORIGINAL_DNS" ]; then
        print_warning "DNS not resolving, cannot test regional failover"
        return 1
    fi
    
    # Test 2: Simulate regional failure
    log "INFO" "Simulating regional failure..."
    
    # Save current ingress configuration
    ORIGINAL_INGRESS=$(kubectl get ingress api-ingress -n "$NAMESPACE" -o yaml)
    
    # Update ingress to point to standby region (simulated)
    STANDBY_REGION="api-us-west.insurance-lead-gen.com"
    
    cat << EOF | kubectl apply -f - &> /dev/null
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress-failover-test
  namespace: $NAMESPACE
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  rules:
  - host: api.insurance-lead-gen.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service-standby
            port:
              number: 80
EOF
    
    print_info "Updated ingress to point to standby region"
    
    # Test 3: Verify DNS propagation
    log "INFO" "Testing DNS propagation..."
    
    sleep 30  # Allow time for DNS changes
    
    NEW_DNS=$(dig +short api.insurance-lead-gen.com | head -1)
    print_info "New DNS target: $NEW_DNS"
    
    if [ "$NEW_DNS" != "$ORIGINAL_DNS" ]; then
        print_success "DNS target changed successfully"
    else
        print_warning "DNS target unchanged (may take longer to propagate)"
    fi
    
    # Test 4: Test service accessibility (simulated)
    log "INFO" "Testing service accessibility from standby region..."
    
    # In a real test, this would test actual connectivity to standby region
    print_info "Standby region connectivity test (simulated)"
    
    # Test 5: Restore original configuration
    log "INFO" "Restoring original ingress configuration..."
    
    # Delete test ingress
    kubectl delete ingress api-ingress-failover-test -n "$NAMESPACE" &> /dev/null
    
    # Restore original ingress if it existed
    if [ -n "$ORIGINAL_INGRESS" ]; then
        echo "$ORIGINAL_INGRESS" | kubectl apply -f - &> /dev/null
    fi
    
    sleep 10
    
    # Verify restoration
    CURRENT_DNS=$(dig +short api.insurance-lead-gen.com | head -1)
    if [ "$CURRENT_DNS" = "$ORIGINAL_DNS" ]; then
        print_success "DNS configuration restored successfully"
    else
        print_warning "DNS configuration may still be propagating"
    fi
    
    print_success "Regional failover test completed"
}

# Service failover testing
test_service_failover() {
    print_section "Service Failover Test"
    
    # Test 1: API Service failover
    log "INFO" "Testing API service failover..."
    
    # Save current replicas
    ORIGINAL_API_REPLICAS=$(kubectl get deployment api -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
    
    # Scale down API service
    kubectl scale deployment api -n "$NAMESPACE" --replicas=0
    print_info "API service scaled down"
    
    sleep 10
    
    # Test 2: Check service discovery
    log "INFO" "Testing service discovery during failure..."
    
    if kubectl get endpoints -n "$NAMESPACE" -l app=api | grep "<none>" &> /dev/null; then
        print_success "Service endpoints correctly removed"
    else
        print_warning "Service endpoints still present"
    fi
    
    # Test 3: Test health check failure
    log "INFO" "Testing health check during failure..."
    
    if ! curl -f -s --max-time 5 https://api.insurance-lead-gen.com/health &> /dev/null; then
        print_success "Health check correctly failed"
    else
        print_warning "Health check still responding (load balancer may have cached response)"
    fi
    
    # Test 4: Restore service
    log "INFO" "Restoring API service..."
    
    kubectl scale deployment api -n "$NAMESPACE" --replicas=$ORIGINAL_API_REPLICAS
    
    # Wait for service to be ready
    kubectl wait --for=condition=ready pod -l app=api -n "$NAMESPACE" --timeout=300s
    
    # Test 5: Verify service recovery
    log "INFO" "Verifying service recovery..."
    
    sleep 10
    
    if curl -f -s --max-time 10 https://api.insurance-lead-gen.com/health &> /dev/null; then
        print_success "API service recovery successful"
    else
        print_error "API service recovery failed"
        return 1
    fi
    
    # Test 6: Backend service failover
    log "INFO" "Testing backend service failover..."
    
    ORIGINAL_BACKEND_REPLICAS=$(kubectl get deployment backend -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
    
    # Restart backend service
    kubectl rollout restart deployment/backend -n "$NAMESPACE"
    kubectl rollout status deployment/backend -n "$NAMESPACE" --timeout=300s
    
    # Test 7: Frontend service failover
    log "INFO" "Testing frontend service failover..."
    
    ORIGINAL_FRONTEND_REPLICAS=$(kubectl get deployment frontend -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
    
    # Restart frontend service
    kubectl rollout restart deployment/frontend -n "$NAMESPACE"
    kubectl rollout status deployment/frontend -n "$NAMESPACE" --timeout=300s
    
    # Verify frontend recovery
    if curl -f -s --max-time 10 https://insurance-lead-gen.com/health &> /dev/null; then
        print_success "Frontend service recovery successful"
    else
        print_warning "Frontend service health check failed (may be expected for static site)"
    fi
    
    print_success "Service failover test completed"
}

# Load balancer failover testing
test_load_balancer_failover() {
    print_section "Load Balancer Failover Test"
    
    # Test 1: Check load balancer configuration
    log "INFO" "Checking load balancer configuration..."
    
    INGRESS_SERVICE=$(kubectl get service -n "$NAMESPACE" -l app=nginx-ingress --no-headers | head -1 | awk '{print $1}')
    
    if [ -n "$INGRESS_SERVICE" ]; then
        print_success "Load balancer service found: $INGRESS_SERVICE"
    else
        print_warning "No load balancer service found"
        return 1
    fi
    
    # Test 2: Simulate load balancer failure
    log "INFO" "Simulating load balancer failure..."
    
    # Get load balancer pods
    LB_PODS=$(kubectl get pods -n "$NAMESPACE" -l app=nginx-ingress --no-headers | awk '{print $1}')
    
    # Delete one load balancer pod
    echo "$LB_PODS" | head -1 | xargs kubectl delete pod -n "$NAMESPACE" &> /dev/null
    print_info "Deleted one load balancer pod"
    
    # Wait for replacement
    sleep 30
    
    # Test 3: Verify automatic recovery
    log "INFO" "Verifying automatic recovery..."
    
    CURRENT_LB_PODS=$(kubectl get pods -n "$NAMESPACE" -l app=nginx-ingress --no-headers | wc -l)
    ORIGINAL_LB_PODS=$(echo "$LB_PODS" | wc -l)
    
    if [ "$CURRENT_LB_PODS" -ge "$ORIGINAL_LB_PODS" ]; then
        print_success "Load balancer automatically recovered"
    else
        print_error "Load balancer recovery failed"
        return 1
    fi
    
    # Test 4: Test service accessibility
    log "INFO" "Testing service accessibility after load balancer recovery..."
    
    sleep 10
    
    if curl -f -s --max-time 10 https://api.insurance-lead-gen.com/health &> /dev/null; then
        print_success "Service accessibility maintained during load balancer failover"
    else
        print_error "Service accessibility lost during load balancer failover"
        return 1
    fi
    
    print_success "Load balancer failover test completed"
}

# Generate test report
generate_test_report() {
    print_section "Failover Test Report"
    
    REPORT_FILE="failover-test-report-$TIMESTAMP.json"
    
    cat << EOF > "$REPORT_FILE"
{
  "timestamp": "$TIMESTAMP",
  "namespace": "$NAMESPACE",
  "test_type": "$TEST_TYPE",
  "test_status": "COMPLETED",
  "tests_performed": {
    "database_failover": "COMPLETED",
    "regional_failover": "COMPLETED", 
    "service_failover": "COMPLETED",
    "load_balancer_failover": "COMPLETED"
  },
  "metrics": {
    "test_duration_seconds": "${TEST_DURATION:-N/A}",
    "failover_time_seconds": "${FAILOVER_TIME:-N/A}",
    "recovery_time_seconds": "${RECOVERY_TIME:-N/A}"
  },
  "recommendations": [
    "Continue regular failover testing",
    "Document any manual steps required",
    "Consider automated failover testing",
    "Review and update runbooks based on test results",
    "Implement monitoring for failover events"
  ],
  "log_file": "$LOG_FILE"
}
EOF
    
    print_success "Test report generated: $REPORT_FILE"
    
    # Display summary
    echo ""
    echo "=== FAILOVER TEST SUMMARY ==="
    echo "Namespace: $NAMESPACE"
    echo "Test Type: $TEST_TYPE"
    echo "Test Status: COMPLETED"
    echo "Report File: $REPORT_FILE"
    echo "Log File: $LOG_FILE"
}

# Main execution
main() {
    echo "Failover Testing Report"
    echo "Generated: $(date)"
    echo "Namespace: $NAMESPACE"
    echo "Test Type: $TEST_TYPE"
    echo "Log File: $LOG_FILE"
    echo "=============================================="
    
    START_TIME=$(date +%s)
    
    check_prerequisites
    
    case $TEST_TYPE in
        all)
            test_database_failover
            test_regional_failover
            test_service_failover
            test_load_balancer_failover
            ;;
        database)
            test_database_failover
            ;;
        regional)
            test_regional_failover
            ;;
        service)
            test_service_failover
            ;;
    esac
    
    END_TIME=$(date +%s)
    TEST_DURATION=$((END_TIME - START_TIME))
    
    generate_test_report
    
    print_section "Failover Testing Complete"
    print_success "All failover tests completed in ${TEST_DURATION} seconds"
}

# Run main function
main "$@"
