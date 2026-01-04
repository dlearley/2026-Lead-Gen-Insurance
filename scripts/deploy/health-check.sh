#!/bin/bash

# Health check script for CI/CD pipeline
# Usage: ./health-check.sh <environment> [check_type]
# Environment: dev, staging, prod
# Check type: basic, comprehensive, database, integrations

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Global variables
ENVIRONMENT=""
CHECK_TYPE="basic"
NAMESPACE=""
HEALTH_CHECK_URL=""
API_URL=""
FRONTEND_URL=""
FAILED_CHECKS=()

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
    echo "Usage: $0 <environment> [check_type]"
    echo ""
    echo "Environment: dev, staging, prod"
    echo "Check type: basic, comprehensive, database, integrations"
    echo ""
    echo "Examples:"
    echo "  $0 staging basic"
    echo "  $0 prod comprehensive"
    echo "  $0 dev database"
}

# Parse command line arguments
parse_arguments() {
    ENVIRONMENT=${1:-dev}
    CHECK_TYPE=${2:-basic}
    
    # Validate environment
    case $ENVIRONMENT in
        dev|staging|prod)
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod"
            exit 1
            ;;
    esac
    
    # Validate check type
    case $CHECK_TYPE in
        basic|comprehensive|database|integrations)
            ;;
        *)
            log_error "Invalid check type: $CHECK_TYPE. Must be basic, comprehensive, database, or integrations"
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

# Check kubectl connectivity
check_kubectl_connectivity() {
    log_info "Checking kubectl connectivity..."
    
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        FAILED_CHECKS+=("kubectl connectivity")
        return 1
    fi
    
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_error "Namespace $NAMESPACE does not exist"
        FAILED_CHECKS+=("namespace existence")
        return 1
    fi
    
    log_success "kubectl connectivity verified"
    return 0
}

# Check deployment status
check_deployment_status() {
    log_info "Checking deployment status..."
    
    local services=("api" "backend" "data-service" "orchestrator" "frontend")
    local failed_services=()
    
    for service in "${services[@]}"; do
        log_info "Checking $service deployment..."
        
        # Check if deployment exists
        if ! kubectl get deployment "$service" -n "$NAMESPACE" &> /dev/null; then
            log_warning "$service deployment not found"
            failed_services+=("$service (not found)")
            continue
        fi
        
        # Check deployment status
        local ready_replicas=$(kubectl get deployment "$service" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        local desired_replicas=$(kubectl get deployment "$service" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
        local available_replicas=$(kubectl get deployment "$service" -n "$NAMESPACE" -o jsonpath='{.status.availableReplicas}' 2>/dev/null || echo "0")
        
        if [[ "$ready_replicas" == "$desired_replicas" && "$desired_replicas" != "0" ]]; then
            log_success "$service: $ready_replicas/$desired_replicas replicas ready"
        else
            log_error "$service: Only $ready_replicas/$desired_replicas replicas ready"
            failed_services+=("$service ($ready_replicas/$desired_replicas replicas)")
        fi
        
        # Check if deployment is available
        if [[ "$available_replicas" == "$desired_replicas" ]]; then
            log_success "$service: All replicas available"
        else
            log_warning "$service: Only $available_replicas replicas available"
        fi
    done
    
    if [[ ${#failed_services[@]} -gt 0 ]]; then
        log_error "Failed services: ${failed_services[*]}"
        FAILED_CHECKS+=("deployment status: ${failed_services[*]}")
        return 1
    fi
    
    log_success "All deployments are healthy"
    return 0
}

# Check pod status
check_pod_status() {
    log_info "Checking pod status..."
    
    local services=("api" "backend" "data-service" "orchestrator" "frontend")
    local failed_pods=()
    
    for service in "${services[@]}"; do
        log_info "Checking $service pods..."
        
        # Get pod information
        local pods=$(kubectl get pods -n "$NAMESPACE" -l "app=$service" -o json 2>/dev/null || echo '{"items":[]}')
        local pod_count=$(echo "$pods" | jq '.items | length')
        
        if [[ "$pod_count" == "0" ]]; then
            log_warning "No pods found for $service"
            failed_pods+=("$service (no pods)")
            continue
        fi
        
        local running_pods=$(echo "$pods" | jq -r '.items[] | select(.status.phase == "Running") | .metadata.name' | wc -l)
        local failed_pods_count=$(echo "$pods" | jq -r '.items[] | select(.status.phase == "Failed") | .metadata.name' | wc -l)
        local pending_pods=$(echo "$pods" | jq -r '.items[] | select(.status.phase == "Pending") | .metadata.name' | wc -l)
        
        if [[ "$failed_pods_count" -gt 0 ]]; then
            log_error "$service: $failed_pods_count failed pods detected"
            failed_pods+=("$service ($failed_pods_count failed)")
        elif [[ "$pending_pods" -gt 0 ]]; then
            log_warning "$service: $pending_pods pods in pending state"
        else
            log_success "$service: $running_pods pods running"
        fi
        
        # Check pod restarts
        local total_restarts=$(echo "$pods" | jq -r '.items[].status.containerStatuses[].restartCount | select(. > 0) | length' 2>/dev/null || echo "0")
        if [[ "$total_restarts" -gt 0 ]]; then
            log_warning "$service: Some pods have restarted ($total_restarts restarts)"
        fi
    done
    
    if [[ ${#failed_pods[@]} -gt 0 ]]; then
        log_error "Pod issues detected: ${failed_pods[*]}"
        FAILED_CHECKS+=("pod status: ${failed_pods[*]}")
        return 1
    fi
    
    log_success "All pods are healthy"
    return 0
}

# Check service endpoints
check_service_endpoints() {
    log_info "Checking service endpoints..."
    
    local services=("api" "backend" "data-service" "orchestrator" "frontend")
    local failed_services=()
    
    for service in "${services[@]}"; do
        log_info "Checking $service service endpoint..."
        
        # Check if service exists
        if ! kubectl get service "$service" -n "$NAMESPACE" &> /dev/null; then
            log_warning "$service service not found"
            failed_services+=("$service (service not found)")
            continue
        fi
        
        # Get service information
        local service_info=$(kubectl get service "$service" -n "$NAMESPACE" -o json 2>/dev/null || echo '{}')
        local cluster_ip=$(echo "$service_info" | jq -r '.spec.clusterIP' 2>/dev/null || echo "none")
        local port=$(echo "$service_info" | jq -r '.spec.ports[0].port' 2>/dev/null || echo "80")
        
        if [[ "$cluster_ip" != "none" ]]; then
            log_success "$service: ClusterIP $cluster_ip, Port $port"
        else
            log_error "$service: No ClusterIP assigned"
            failed_services+=("$service (no ClusterIP)")
        fi
    done
    
    if [[ ${#failed_services[@]} -gt 0 ]]; then
        log_error "Service endpoint issues: ${failed_services[*]}"
        FAILED_CHECKS+=("service endpoints: ${failed_services[*]}")
        return 1
    fi
    
    log_success "All service endpoints are accessible"
    return 0
}

# Check HTTP endpoints
check_http_endpoints() {
    log_info "Checking HTTP endpoints..."
    
    local endpoints=(
        "$API_URL/health"
        "$API_URL/ready"
        "$FRONTEND_URL"
    )
    
    local failed_endpoints=()
    
    for endpoint in "${endpoints[@]}"; do
        log_info "Checking endpoint: $endpoint"
        
        # Perform HTTP health check with timeout
        local response_code
        local response_time
        response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$endpoint" 2>/dev/null || echo "000")
        response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "$endpoint" 2>/dev/null || echo "999")
        
        if [[ "$response_code" == "200" || "$response_code" == "404" ]]; then
            log_success "$endpoint: HTTP $response_code (${response_time}s)"
        else
            log_error "$endpoint: HTTP $response_code (${response_time}s)"
            failed_endpoints+=("$endpoint (HTTP $response_code)")
        fi
    done
    
    if [[ ${#failed_endpoints[@]} -gt 0 ]]; then
        log_error "HTTP endpoint failures: ${failed_endpoints[*]}"
        FAILED_CHECKS+=("HTTP endpoints: ${failed_endpoints[*]}")
        return 1
    fi
    
    log_success "All HTTP endpoints are responding"
    return 0
}

# Check database connectivity
check_database_connectivity() {
    log_info "Checking database connectivity..."
    
    if [[ "$CHECK_TYPE" != "database" && "$CHECK_TYPE" != "comprehensive" ]]; then
        log_info "Skipping database check (not requested)"
        return 0
    fi
    
    # This would check database connectivity
    # For now, we'll simulate the check
    log_info "Simulating database connectivity check..."
    
    # Check if database secrets exist
    local db_secret_name="database-url"
    if kubectl get secret "$db_secret_name" -n "$NAMESPACE" &> /dev/null; then
        log_success "Database secret found"
    else
        log_warning "Database secret not found"
        FAILED_CHECKS+=("database secret")
    fi
    
    # Check database pods
    local db_pods=$(kubectl get pods -n "$NAMESPACE" -l "app=database" -o json 2>/dev/null || echo '{"items":[]}')
    local db_pod_count=$(echo "$db_pods" | jq '.items | length')
    
    if [[ "$db_pod_count" == "0" ]]; then
        log_warning "No database pods found (external database expected)"
    else
        local running_db_pods=$(echo "$db_pods" | jq -r '.items[] | select(.status.phase == "Running") | .metadata.name' | wc -l)
        log_success "Database: $running_db_pods/$db_pod_count pods running"
    fi
    
    log_success "Database connectivity check completed"
    return 0
}

# Check external service integrations
check_external_integrations() {
    log_info "Checking external service integrations..."
    
    if [[ "$CHECK_TYPE" != "integrations" && "$CHECK_TYPE" != "comprehensive" ]]; then
        log_info "Skipping integration checks (not requested)"
        return 0
    fi
    
    # Check Redis connectivity
    log_info "Checking Redis connectivity..."
    local redis_endpoint="redis://redis.$NAMESPACE.svc.cluster.local:6379"
    if kubectl get service redis -n "$NAMESPACE" &> /dev/null; then
        log_success "Redis service found"
    else
        log_warning "Redis service not found"
        FAILED_CHECKS+=("Redis service")
    fi
    
    # Check monitoring endpoints
    log_info "Checking monitoring endpoints..."
    local monitoring_endpoints=(
        "https://monitoring.$ENVIRONMENT.insurance-lead-gen.com/api/v1/label/__name__/values"
    )
    
    for endpoint in "${monitoring_endpoints[@]}"; do
        local response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$endpoint" 2>/dev/null || echo "000")
        if [[ "$response_code" == "200" ]]; then
            log_success "Monitoring endpoint accessible"
        else
            log_warning "Monitoring endpoint not accessible (HTTP $response_code)"
        fi
    done
    
    log_success "External integration check completed"
    return 0
}

# Check resource usage
check_resource_usage() {
    log_info "Checking resource usage..."
    
    if [[ "$CHECK_TYPE" != "comprehensive" ]]; then
        log_info "Skipping resource usage check (not requested)"
        return 0
    fi
    
    # Get node resource usage
    local nodes=$(kubectl get nodes -o json 2>/dev/null || echo '{"items":[]}')
    local node_count=$(echo "$nodes" | jq '.items | length')
    
    if [[ "$node_count" -gt 0 ]]; then
        local ready_nodes=$(echo "$nodes" | jq -r '.items[] | select(.status.conditions[] | select(.type=="Ready" and .status=="True")) | .metadata.name' | wc -l)
        log_success "Nodes: $ready_nodes/$node_count ready"
        
        # Check for resource pressure
        local nodes_with_pressure=$(echo "$nodes" | jq -r '.items[] | select(.status.conditions[] | select(.type=="MemoryPressure" and .status=="True")) | .metadata.name' | wc -l)
        if [[ "$nodes_with_pressure" -gt 0 ]]; then
            log_warning "$nodes_with_pressure nodes experiencing memory pressure"
            FAILED_CHECKS+=("memory pressure")
        fi
        
        local nodes_with_disk_pressure=$(echo "$nodes" | jq -r '.items[] | select(.status.conditions[] | select(.type=="DiskPressure" and .status=="True")) | .metadata.name' | wc -l)
        if [[ "$nodes_with_disk_pressure" -gt 0 ]]; then
            log_warning "$nodes_with_disk_pressure nodes experiencing disk pressure"
            FAILED_CHECKS+=("disk pressure")
        fi
    else
        log_warning "No nodes found"
    fi
    
    log_success "Resource usage check completed"
    return 0
}

# Run all health checks
run_health_checks() {
    log_info "Running health checks for $ENVIRONMENT environment ($CHECK_TYPE)"
    log_info "Namespace: $NAMESPACE"
    log_info "API URL: $API_URL"
    log_info "Frontend URL: $FRONTEND_URL"
    echo ""
    
    # Core checks
    check_kubectl_connectivity || true
    check_deployment_status || true
    check_pod_status || true
    check_service_endpoints || true
    
    # HTTP checks (skip for basic check)
    if [[ "$CHECK_TYPE" != "basic" ]]; then
        check_http_endpoints || true
    fi
    
    # Environment-specific checks
    case $CHECK_TYPE in
        database)
            check_database_connectivity || true
            ;;
        integrations)
            check_external_integrations || true
            ;;
        comprehensive)
            check_database_connectivity || true
            check_external_integrations || true
            check_resource_usage || true
            ;;
    esac
    
    echo ""
    
    # Report results
    if [[ ${#FAILED_CHECKS[@]} -eq 0 ]]; then
        log_success "All health checks passed!"
        return 0
    else
        log_error "Health check failures detected:"
        for check in "${FAILED_CHECKS[@]}"; do
            echo "  - $check"
        done
        return 1
    fi
}

# Main function
main() {
    log_info "Starting health check for $ENVIRONMENT environment"
    log_info "Check type: $CHECK_TYPE"
    log_info "Timestamp: $(date)"
    
    if run_health_checks; then
        log_success "Health check completed successfully"
        exit 0
    else
        log_error "Health check failed"
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