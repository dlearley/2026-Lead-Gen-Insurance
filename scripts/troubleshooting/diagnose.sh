#!/bin/bash

# Comprehensive System Diagnostic Script
# Usage: ./diagnose.sh [options]
# 
# This script performs a comprehensive health check and diagnostic analysis
# of the Insurance Lead Gen Platform across all services and components.

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/tmp/diagnostic-$(date +%Y%m%d-%H%M%S).log"
NAMESPACE="${NAMESPACE:-production}"
TIMEOUT=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log "INFO" "Starting comprehensive system diagnostics..."

# Help function
show_help() {
    cat << EOF
System Diagnostic Script

Usage: $0 [OPTIONS]

OPTIONS:
    -n, --namespace NAMESPACE     Kubernetes namespace (default: production)
    -v, --verbose                 Verbose output
    -f, --full                    Full diagnostic (slower but comprehensive)
    -s, --service SERVICE         Check specific service only
    -q, --quiet                   Quiet mode (errors only)
    -h, --help                    Show this help message

SERVICES:
    api, backend, frontend, database, redis, orchestrator

EXAMPLES:
    $0                           # Basic health check
    $0 -f                        # Full diagnostic
    $0 -s api                    # Check API service only
    $0 -n staging                # Check staging environment

OUTPUT:
    All results are logged to: $LOG_FILE

EOF
}

# Parse command line arguments
VERBOSE=false
FULL_DIAGNOSTIC=false
SPECIFIC_SERVICE=""
QUIET=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -f|--full)
            FULL_DIAGNOSTIC=true
            shift
            ;;
        -s|--service)
            SPECIFIC_SERVICE="$2"
            shift 2
            ;;
        -q|--quiet)
            QUIET=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Utility functions
print_section() {
    local title="$1"
    echo -e "\n${BLUE}=== $title ===${NC}"
    log "INFO" "=== $title ==="
}

print_success() {
    local message="$1"
    if [ "$QUIET" = false ]; then
        echo -e "${GREEN}✅ $message${NC}"
    fi
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

# Check prerequisites
check_prerequisites() {
    print_section "Prerequisites Check"
    
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
    
    print_success "All prerequisites satisfied"
}

# Basic system health check
basic_health_check() {
    print_section "Basic System Health"
    
    # Check cluster nodes
    log "INFO" "Checking cluster nodes..."
    local node_count=$(kubectl get nodes --no-headers | grep -c "Ready" || echo "0")
    if [ "$node_count" -eq 0 ]; then
        print_error "No ready nodes found"
        return 1
    else
        print_success "Found $node_count ready nodes"
    fi
    
    # Check pods in namespace
    log "INFO" "Checking pods in namespace $NAMESPACE..."
    local total_pods=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    local running_pods=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | grep -c "Running" || echo "0")
    local failed_pods=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | grep -cE "0/.*|Error|CrashLoop" || echo "0")
    
    echo "Pod Status: $running_pods/$total_pods running"
    if [ "$failed_pods" -gt 0 ]; then
        print_warning "Found $failed_pods failed pods"
        if [ "$VERBOSE" = true ]; then
            kubectl get pods -n "$NAMESPACE" | grep -E "0/.*|Error|CrashLoop"
        fi
    else
        print_success "All pods are running"
    fi
    
    # Check services
    log "INFO" "Checking services..."
    local services=$(kubectl get services -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    print_success "Found $services services"
    
    # Check PVCs
    log "INFO" "Checking persistent volume claims..."
    local pvcs=$(kubectl get pvc -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    print_success "Found $pvcs persistent volume claims"
}

# Service-specific health checks
check_api_service() {
    print_section "API Service Health"
    
    # Check pod status
    local api_pods=$(kubectl get pods -n "$NAMESPACE" -l app=api --no-headers 2>/dev/null | wc -l)
    local running_api_pods=$(kubectl get pods -n "$NAMESPACE" -l app=api --no-headers 2>/dev/null | grep -c "Running" || echo "0")
    
    if [ "$api_pods" -eq 0 ]; then
        print_error "No API pods found"
        return 1
    fi
    
    echo "API Pods: $running_api_pods/$api_pods running"
    if [ "$running_api_pods" -eq "$api_pods" ]; then
        print_success "All API pods are running"
    else
        print_warning "Some API pods are not running"
        if [ "$VERBOSE" = true ]; then
            kubectl get pods -n "$NAMESPACE" -l app=api
        fi
    fi
    
    # Check API health endpoint
    log "INFO" "Checking API health endpoint..."
    local api_url="https://api.insurance-lead-gen.com/health"
    if curl -f -s --max-time 10 "$api_url" > /dev/null; then
        print_success "API health endpoint responding"
    else
        print_error "API health endpoint not responding"
        if [ "$VERBOSE" = true ]; then
            curl -v --max-time 10 "$api_url" 2>&1 | head -10
        fi
    fi
    
    # Check API logs for errors
    if [ "$FULL_DIAGNOSTIC" = true ]; then
        log "INFO" "Checking API logs for errors..."
        local error_count=$(kubectl logs -n "$NAMESPACE" -l app=api --tail=1000 2>/dev/null | grep -c "ERROR" || echo "0")
        if [ "$error_count" -gt 10 ]; then
            print_warning "High error count in API logs: $error_count"
        else
            print_success "API error count within normal range: $error_count"
        fi
    fi
}

check_backend_service() {
    print_section "Backend Service Health"
    
    # Check pod status
    local backend_pods=$(kubectl get pods -n "$NAMESPACE" -l app=backend --no-headers 2>/dev/null | wc -l)
    local running_backend_pods=$(kubectl get pods -n "$NAMESPACE" -l app=backend --no-headers 2>/dev/null | grep -c "Running" || echo "0")
    
    if [ "$backend_pods" -eq 0 ]; then
        print_error "No backend pods found"
        return 1
    fi
    
    echo "Backend Pods: $running_backend_pods/$backend_pods running"
    if [ "$running_backend_pods" -eq "$backend_pods" ]; then
        print_success "All backend pods are running"
    else
        print_warning "Some backend pods are not running"
    fi
    
    # Check backend health
    log "INFO" "Checking backend health..."
    if kubectl exec -n "$NAMESPACE" deployment/backend -- python health_check.py &> /dev/null; then
        print_success "Backend health check passed"
    else
        print_warning "Backend health check failed"
    fi
    
    # Check background jobs
    if [ "$FULL_DIAGNOSTIC" = true ]; then
        log "INFO" "Checking background job queue..."
        local queue_length=$(kubectl exec -n "$NAMESPACE" deployment/backend -- python -c "from celery import Celery; app = Celery('tasks'); print(len(app.control.inspect().reserved().keys()))" 2>/dev/null || echo "unknown")
        echo "Background job queue length: $queue_length"
    fi
}

check_frontend_service() {
    print_section "Frontend Service Health"
    
    # Check pod status
    local frontend_pods=$(kubectl get pods -n "$NAMESPACE" -l app=frontend --no-headers 2>/dev/null | wc -l)
    local running_frontend_pods=$(kubectl get pods -n "$NAMESPACE" -l app=frontend --no-headers 2>/dev/null | grep -c "Running" || echo "0")
    
    if [ "$frontend_pods" -eq 0 ]; then
        print_error "No frontend pods found"
        return 1
    fi
    
    echo "Frontend Pods: $running_frontend_pods/$frontend_pods running"
    if [ "$running_frontend_pods" -eq "$frontend_pods" ]; then
        print_success "All frontend pods are running"
    else
        print_warning "Some frontend pods are not running"
    fi
    
    # Check frontend accessibility
    log "INFO" "Checking frontend accessibility..."
    local frontend_url="https://insurance-lead-gen.com"
    if curl -f -s --max-time 10 "$frontend_url" > /dev/null; then
        print_success "Frontend is accessible"
    else
        print_error "Frontend is not accessible"
    fi
}

check_database() {
    print_section "Database Health"
    
    # Check PostgreSQL pod
    local postgres_pods=$(kubectl get pods -n "$NAMESPACE" -l app=postgres --no-headers 2>/dev/null | wc -l)
    if [ "$postgres_pods" -eq 0 ]; then
        print_error "No PostgreSQL pods found"
        return 1
    fi
    
    local running_postgres=$(kubectl get pods -n "$NAMESPACE" -l app=postgres --no-headers 2>/dev/null | grep -c "Running" || echo "0")
    echo "PostgreSQL Pods: $running_postgres/$postgres_pods running"
    
    if [ "$running_postgres" -eq "$postgres_pods" ]; then
        print_success "PostgreSQL is running"
    else
        print_error "PostgreSQL is not running properly"
        return 1
    fi
    
    # Test database connection
    log "INFO" "Testing database connectivity..."
    if kubectl exec -n "$NAMESPACE" deployment/postgres -- pg_isready -U postgres -d insurance_lead_gen &> /dev/null; then
        print_success "Database connection successful"
    else
        print_error "Database connection failed"
    fi
    
    # Check connection count
    if [ "$FULL_DIAGNOSTIC" = true ]; then
        log "INFO" "Checking database connections..."
        local connection_count=$(kubectl exec -n "$NAMESPACE" deployment/postgres -- psql -U postgres -d insurance_lead_gen -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ' || echo "unknown")
        echo "Active database connections: $connection_count"
    fi
}

check_redis() {
    print_section "Redis Cache Health"
    
    # Check Redis pod
    local redis_pods=$(kubectl get pods -n "$NAMESPACE" -l app=redis --no-headers 2>/dev/null | wc -l)
    if [ "$redis_pods" -eq 0 ]; then
        print_error "No Redis pods found"
        return 1
    fi
    
    local running_redis=$(kubectl get pods -n "$NAMESPACE" -l app=redis --no-headers 2>/dev/null | grep -c "Running" || echo "0")
    echo "Redis Pods: $running_redis/$redis_pods running"
    
    if [ "$running_redis" -eq "$redis_pods" ]; then
        print_success "Redis is running"
    else
        print_error "Redis is not running properly"
        return 1
    fi
    
    # Test Redis connectivity
    log "INFO" "Testing Redis connectivity..."
    if kubectl exec -n "$NAMESPACE" deployment/redis -- redis-cli ping &> /dev/null; then
        print_success "Redis connectivity successful"
    else
        print_error "Redis connectivity failed"
    fi
    
    # Check Redis memory usage
    if [ "$FULL_DIAGNOSTIC" = true ]; then
        log "INFO" "Checking Redis memory usage..."
        local memory_info=$(kubectl exec -n "$NAMESPACE" deployment/redis -- redis-cli INFO memory 2>/dev/null | grep used_memory_human | cut -d: -f2 | tr -d '\r' || echo "unknown")
        echo "Redis memory usage: $memory_info"
    fi
}

check_orchestrator() {
    print_section "Orchestrator Health"
    
    # Check orchestrator pod
    local orchestrator_pods=$(kubectl get pods -n "$NAMESPACE" -l app=orchestrator --no-headers 2>/dev/null | wc -l)
    if [ "$orchestrator_pods" -eq 0 ]; then
        print_error "No orchestrator pods found"
        return 1
    fi
    
    local running_orchestrator=$(kubectl get pods -n "$NAMESPACE" -l app=orchestrator --no-headers 2>/dev/null | grep -c "Running" || echo "0")
    echo "Orchestrator Pods: $running_orchestrator/$orchestrator_pods running"
    
    if [ "$running_orchestrator" -eq "$orchestrator_pods" ]; then
        print_success "Orchestrator is running"
    else
        print_warning "Some orchestrator pods are not running"
    fi
    
    # Test orchestrator functionality
    if [ "$FULL_DIAGNOSTIC" = true ]; then
        log "INFO" "Testing orchestrator functionality..."
        if kubectl exec -n "$NAMESPACE" deployment/orchestrator -- npm run workflow:list-active &> /dev/null; then
            print_success "Orchestrator functionality check passed"
        else
            print_warning "Orchestrator functionality check failed"
        fi
    fi
}

# Infrastructure checks
check_infrastructure() {
    print_section "Infrastructure Health"
    
    # Check node resources
    log "INFO" "Checking node resources..."
    local nodes=$(kubectl get nodes --no-headers | wc -l)
    local ready_nodes=$(kubectl get nodes --no-headers | grep -c "Ready" || echo "0")
    echo "Nodes: $ready_nodes/$nodes ready"
    
    if [ "$FULL_DIAGNOSTIC" = true ]; then
        log "INFO" "Checking node resource usage..."
        kubectl top nodes 2>/dev/null || echo "Metrics not available"
    fi
    
    # Check events
    log "INFO" "Checking recent events..."
    local recent_events=$(kubectl get events -n "$NAMESPACE" --sort-by='.lastTimestamp' --no-headers 2>/dev/null | tail -10 | wc -l)
    echo "Recent events in last check: $recent_events"
    
    if [ "$VERBOSE" = true ]; then
        echo "Recent events:"
        kubectl get events -n "$NAMESPACE" --sort-by='.lastTimestamp' --no-headers 2>/dev/null | tail -10
    fi
    
    # Check ingress
    log "INFO" "Checking ingress configuration..."
    local ingress_count=$(kubectl get ingress -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    echo "Ingress rules: $ingress_count"
    
    if [ "$ingress_count" -eq 0 ]; then
        print_warning "No ingress rules found"
    else
        print_success "Ingress configuration found"
    fi
}

# Monitoring and metrics checks
check_monitoring() {
    print_section "Monitoring Health"
    
    # Check if monitoring namespace exists
    if ! kubectl get namespace monitoring &> /dev/null; then
        print_warning "Monitoring namespace not found"
        return 1
    fi
    
    # Check Prometheus
    log "INFO" "Checking Prometheus..."
    local prometheus_pods=$(kubectl get pods -n monitoring -l app=prometheus --no-headers 2>/dev/null | wc -l)
    local running_prometheus=$(kubectl get pods -n monitoring -l app=prometheus --no-headers 2>/dev/null | grep -c "Running" || echo "0")
    
    if [ "$running_prometheus" -eq "$prometheus_pods" ] && [ "$prometheus_pods" -gt 0 ]; then
        print_success "Prometheus is running"
    else
        print_warning "Prometheus is not running properly"
    fi
    
    # Check Grafana
    log "INFO" "Checking Grafana..."
    local grafana_pods=$(kubectl get pods -n monitoring -l app=grafana --no-headers 2>/dev/null | wc -l)
    local running_grafana=$(kubectl get pods -n monitoring -l app=grafana --no-headers 2>/dev/null | grep -c "Running" || echo "0")
    
    if [ "$running_grafana" -eq "$grafana_pods" ] && [ "$grafana_pods" -gt 0 ]; then
        print_success "Grafana is running"
    else
        print_warning "Grafana is not running properly"
    fi
    
    # Test metrics accessibility
    if [ "$FULL_DIAGNOSTIC" = true ]; then
        log "INFO" "Testing metrics accessibility..."
        kubectl port-forward -n monitoring svc/prometheus 9090:9090 &> /dev/null &
        local port_forward_pid=$!
        sleep 5
        
        if curl -s http://localhost:9090/api/v1/targets &> /dev/null; then
            print_success "Prometheus metrics accessible"
        else
            print_warning "Prometheus metrics not accessible"
        fi
        
        kill $port_forward_pid 2>/dev/null || true
    fi
}

# External dependency checks
check_external_dependencies() {
    print_section "External Dependencies"
    
    # Check external APIs
    log "INFO" "Checking external API dependencies..."
    
    # Stripe
    if curl -f -s --max-time 10 https://api.stripe.com/v1/charges &> /dev/null; then
        print_success "Stripe API accessible"
    else
        print_warning "Stripe API not accessible"
    fi
    
    # SendGrid
    if curl -f -s --max-time 10 https://api.sendgrid.com/v3/mail/send &> /dev/null; then
        print_success "SendGrid API accessible"
    else
        print_warning "SendGrid API not accessible"
    fi
    
    # Check service status pages
    log "INFO" "Checking service status..."
    if curl -s https://status.stripe.com/api/v2/status.json &> /dev/null; then
        print_success "Stripe status page accessible"
    else
        print_warning "Stripe status page not accessible"
    fi
}

# Performance analysis
analyze_performance() {
    print_section "Performance Analysis"
    
    if [ "$FULL_DIAGNOSTIC" = false ]; then
        echo "Skipping performance analysis (use -f for full diagnostic)"
        return 0
    fi
    
    # API response time test
    log "INFO" "Testing API response time..."
    local response_time=$(curl -w "%{time_total}" -s -o /dev/null --max-time 10 https://api.insurance-lead-gen.com/health 2>/dev/null || echo "timeout")
    echo "API response time: ${response_time}s"
    
    if (( $(echo "$response_time < 2.0" | bc -l 2>/dev/null || echo "1") )); then
        print_success "API response time acceptable"
    else
        print_warning "API response time high: ${response_time}s"
    fi
    
    # Database performance check
    log "INFO" "Checking database performance..."
    local db_response=$(kubectl exec -n "$NAMESPACE" deployment/postgres -- psql -U postgres -d insurance_lead_gen -c "SELECT 1;" 2>/dev/null | tail -1 | tr -d ' ' || echo "error")
    if [ "$db_response" = "1" ]; then
        print_success "Database query performance normal"
    else
        print_warning "Database query performance issues detected"
    fi
    
    # Resource utilization
    log "INFO" "Checking resource utilization..."
    if kubectl top pods -n "$NAMESPACE" &> /dev/null; then
        echo "Top resource consuming pods:"
        kubectl top pods -n "$NAMESPACE" --sort-by=cpu 2>/dev/null | head -10
    else
        print_warning "Resource metrics not available"
    fi
}

# Security checks
check_security() {
    print_section "Security Checks"
    
    if [ "$FULL_DIAGNOSTIC" = false ]; then
        echo "Skipping security checks (use -f for full diagnostic)"
        return 0
    fi
    
    # Check for exposed secrets
    log "INFO" "Checking for exposed secrets in logs..."
    local exposed_secrets=$(kubectl logs -n "$NAMESPACE" -l app=api --tail=1000 2>/dev/null | grep -iE "password|secret|key|token" | wc -l || echo "0")
    if [ "$exposed_secrets" -gt 0 ]; then
        print_warning "Potential exposed secrets found in logs: $exposed_secrets"
    else
        print_success "No obvious exposed secrets in logs"
    fi
    
    # Check pod security contexts
    log "INFO" "Checking pod security contexts..."
    local pods_without_security=$(kubectl get pods -n "$NAMESPACE" -o jsonpath='{.items[*].spec.securityContext}' 2>/dev/null | grep -c "null" || echo "0")
    if [ "$pods_without_security" -gt 0 ]; then
        print_warning "Some pods may not have security contexts configured"
    else
        print_success "Pod security contexts configured"
    fi
    
    # Check network policies
    log "INFO" "Checking network policies..."
    local network_policies=$(kubectl get networkpolicies -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    echo "Network policies: $network_policies"
    if [ "$network_policies" -eq 0 ]; then
        print_warning "No network policies found"
    else
        print_success "Network policies configured"
    fi
}

# Generate recommendations
generate_recommendations() {
    print_section "Recommendations"
    
    echo "Based on the diagnostic results, here are recommendations:"
    echo ""
    
    # Check for common issues and provide recommendations
    local issues_found=false
    
    # Failed pods
    local failed_pods=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | grep -cE "0/.*|Error|CrashLoop" || echo "0")
    if [ "$failed_pods" -gt 0 ]; then
        echo "• Failed pods detected: Investigate pod logs and restart failed pods"
        issues_found=true
    fi
    
    # High error rates (if we can detect them)
    if [ "$FULL_DIAGNOSTIC" = true ]; then
        local error_count=$(kubectl logs -n "$NAMESPACE" -l app=api --tail=1000 2>/dev/null | grep -c "ERROR" || echo "0")
        if [ "$error_count" -gt 10 ]; then
            echo "• High error count in logs: Review application logs for patterns"
            issues_found=true
        fi
    fi
    
    # Resource issues
    if [ "$FULL_DIAGNOSTIC" = true ] && kubectl top pods -n "$NAMESPACE" &> /dev/null; then
        local high_cpu_pods=$(kubectl top pods -n "$NAMESPACE" --no-headers 2>/dev/null | awk '$2 ~ /[8-9][0-9][0-9]|[0-9]{4,}/ {print $1}' | wc -l)
        if [ "$high_cpu_pods" -gt 0 ]; then
            echo "• High CPU usage detected: Consider scaling or optimization"
            issues_found=true
        fi
    fi
    
    if [ "$issues_found" = false ]; then
        echo "• System appears healthy - continue monitoring"
        echo "• Review this diagnostic regularly"
        echo "• Consider setting up automated health checks"
    fi
    
    echo ""
    echo "Next steps:"
    echo "• Review detailed logs for any warnings"
    echo "• Check monitoring dashboards for trends"
    echo "• Consider implementing automated remediation"
    echo "• Update this diagnostic script based on findings"
}

# Main execution
main() {
    echo "Insurance Lead Gen Platform Diagnostic Report"
    echo "Generated: $(date)"
    echo "Namespace: $NAMESPACE"
    echo "Log file: $LOG_FILE"
    echo "=============================================="
    
    # Run all checks or specific service
    if [ -n "$SPECIFIC_SERVICE" ]; then
        case "$SPECIFIC_SERVICE" in
            api)
                check_api_service
                ;;
            backend)
                check_backend_service
                ;;
            frontend)
                check_frontend_service
                ;;
            database)
                check_database
                ;;
            redis)
                check_redis
                ;;
            orchestrator)
                check_orchestrator
                ;;
            *)
                echo "Unknown service: $SPECIFIC_SERVICE"
                echo "Available services: api, backend, frontend, database, redis, orchestrator"
                exit 1
                ;;
        esac
    else
        # Run comprehensive diagnostic
        check_prerequisites
        basic_health_check
        check_api_service
        check_backend_service
        check_frontend_service
        check_database
        check_redis
        check_orchestrator
        check_infrastructure
        check_monitoring
        check_external_dependencies
        analyze_performance
        check_security
    fi
    
    generate_recommendations
    
    print_section "Diagnostic Complete"
    echo "Full diagnostic report saved to: $LOG_FILE"
    echo "Review the log file for detailed information."
    
    # Summary
    local error_count=$(grep -c "ERROR" "$LOG_FILE" || echo "0")
    local warning_count=$(grep -c "WARN" "$LOG_FILE" || echo "0")
    
    echo ""
    echo "=== SUMMARY ==="
    echo "Errors: $error_count"
    echo "Warnings: $warning_count"
    
    if [ "$error_count" -eq 0 ] && [ "$warning_count" -eq 0 ]; then
        print_success "System appears healthy"
    elif [ "$error_count" -eq 0 ]; then
        print_warning "System has warnings but no critical errors"
    else
        print_error "System has critical errors that need attention"
    fi
}

# Run main function
main "$@"
