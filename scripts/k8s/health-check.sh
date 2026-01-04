#!/bin/bash

# Kubernetes Health Check Script for Insurance Lead Gen Platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed."
    exit 1
fi

# Parse arguments
ENVIRONMENT=""
DEEP_CHECK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --env|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --deep-check|-d)
            DEEP_CHECK=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 --env <env> [--deep-check]"
            echo ""
            echo "Arguments:"
            echo "  --env, -e             Environment (dev, staging, prod)"
            echo "  --deep-check, -d      Perform deep health checks"
            echo "  --help, -h            Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate environment
if [ -z "$ENVIRONMENT" ]; then
    print_error "Environment is required."
    exit 1
fi

NAMESPACE="insurance-lead-gen-${ENVIRONMENT}"

print_info "=========================================="
print_info "Health Check: $ENVIRONMENT"
print_info "Namespace: $NAMESPACE"
print_info "Deep Check: $DEEP_CHECK"
print_info "=========================================="

# Variables to track health status
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

# Function to perform health check
check_component() {
    local component_type=$1
    local component_name=$2
    local description=$3
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    print_info "Checking $description..."
    
    case $component_type in
        deployment)
            if kubectl get deployment "$component_name" -n "$NAMESPACE" &> /dev/null; then
                # Check if deployment is ready
                READY_REPLICAS=$(kubectl get deployment "$component_name" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
                DESIRED_REPLICAS=$(kubectl get deployment "$component_name" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
                
                if [ "$READY_REPLICAS" == "$DESIRED_REPLICAS" ]; then
                    print_info "  ✓ Deployment is ready ($READY_REPLICAS/$DESIRED_REPLICAS replicas)"
                    PASSED_CHECKS=$((PASSED_CHECKS + 1))
                else
                    print_error "  ✗ Deployment is not ready ($READY_REPLICAS/$DESIRED_REPLICAS replicas)"
                    FAILED_CHECKS=$((FAILED_CHECKS + 1))
                fi
            else
                print_error "  ✗ Deployment not found"
                FAILED_CHECKS=$((FAILED_CHECKS + 1))
            fi
            ;;
        statefulset)
            if kubectl get statefulset "$component_name" -n "$NAMESPACE" &> /dev/null; then
                READY_REPLICAS=$(kubectl get statefulset "$component_name" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
                DESIRED_REPLICAS=$(kubectl get statefulset "$component_name" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
                
                if [ "$READY_REPLICAS" == "$DESIRED_REPLICAS" ]; then
                    print_info "  ✓ StatefulSet is ready ($READY_REPLICAS/$DESIRED_REPLICAS replicas)"
                    PASSED_CHECKS=$((PASSED_CHECKS + 1))
                else
                    print_error "  ✗ StatefulSet is not ready ($READY_REPLICAS/$DESIRED_REPLICAS replicas)"
                    FAILED_CHECKS=$((FAILED_CHECKS + 1))
                fi
            else
                print_error "  ✗ StatefulSet not found"
                FAILED_CHECKS=$((FAILED_CHECKS + 1))
            fi
            ;;
        pod)
            PENDING_PODS=$(kubectl get pods -n "$NAMESPACE" -l app="$component_name" --field-selector=status.phase=Pending --no-headers 2>/dev/null | wc -l)
            FAILED_PODS=$(kubectl get pods -n "$NAMESPACE" -l app="$component_name" --field-selector=status.phase=Failed --no-headers 2>/dev/null | wc -l)
            
            if [ "$PENDING_PODS" -eq 0 ] && [ "$FAILED_PODS" -eq 0 ]; then
                print_info "  ✓ All pods are healthy"
                PASSED_CHECKS=$((PASSED_CHECKS + 1))
            else
                if [ "$PENDING_PODS" -gt 0 ]; then
                    print_warn "  ⚠ $PENDING_PODS pods are pending"
                    WARNINGS=$((WARNINGS + 1))
                fi
                if [ "$FAILED_PODS" -gt 0 ]; then
                    print_error "  ✗ $FAILED_PODS pods have failed"
                    FAILED_CHECKS=$((FAILED_CHECKS + 1))
                fi
            fi
            ;;
        service)
            if kubectl get service "$component_name" -n "$NAMESPACE" &> /dev/null; then
                print_info "  ✓ Service exists"
                PASSED_CHECKS=$((PASSED_CHECKS + 1))
            else
                print_error "  ✗ Service not found"
                FAILED_CHECKS=$((FAILED_CHECKS + 1))
            fi
            ;;
        ingress)
            if kubectl get ingress "$component_name" -n "$NAMESPACE" &> /dev/null; then
                print_info "  ✓ Ingress exists"
                PASSED_CHECKS=$((PASSED_CHECKS + 1))
            else
                print_warn "  ⚠ Ingress not found (may not be configured)"
                WARNINGS=$((WARNINGS + 1))
            fi
            ;;
        pvc)
            if kubectl get pvc "$component_name" -n "$NAMESPACE" &> /dev/null; then
                STATUS=$(kubectl get pvc "$component_name" -n "$NAMESPACE" -o jsonpath='{.status.phase}')
                if [ "$STATUS" == "Bound" ]; then
                    print_info "  ✓ PVC is bound"
                    PASSED_CHECKS=$((PASSED_CHECKS + 1))
                else
                    print_error "  ✗ PVC status: $STATUS"
                    FAILED_CHECKS=$((FAILED_CHECKS + 1))
                fi
            else
                print_error "  ✗ PVC not found"
                FAILED_CHECKS=$((FAILED_CHECKS + 1))
            fi
            ;;
    esac
}

# Check deployments
print_info ""
print_info "=========================================="
print_info "Checking Deployments"
print_info "=========================================="

DEPLOYMENTS=("api" "data-service" "orchestrator" "frontend" "backend")
for deployment in "${DEPLOYMENTS[@]}"; do
    check_component deployment "$deployment" "$deployment deployment"
    if [ "$DEEP_CHECK" = true ]; then
        check_component pod "$deployment" "$deployment pods"
        check_component service "$deployment" "$deployment service"
    fi
done

# Check statefulsets
print_info ""
print_info "=========================================="
print_info "Checking StatefulSets"
print_info "=========================================="

STATEFULSETS=("postgres" "redis" "neo4j" "qdrant")
for statefulset in "${STATEFULSETS[@]}"; do
    check_component statefulset "$statefulset" "$statefulset statefulset"
    if [ "$DEEP_CHECK" = true ]; then
        check_component pod "$statefulset" "$statefulset pods"
        check_component service "$statefulset" "$statefulset service"
    fi
done

# Check PVCs
print_info ""
print_info "=========================================="
print_info "Checking Persistent Volume Claims"
print_info "=========================================="

if kubectl get pvc -n "$NAMESPACE" &> /dev/null; then
    PVCS=$(kubectl get pvc -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}')
    for pvc in $PVCS; do
        check_component pvc "$pvc" "$pvc claim"
    done
else
    print_warn "No PVCs found"
fi

# Check ingresses
print_info ""
print_info "=========================================="
print_info "Checking Ingress"
print_info "=========================================="

INGRESSES=("api-ingress" "frontend-ingress" "data-service-ingress" "backend-ingress")
for ingress in "${INGRESSES[@]}"; do
    check_component ingress "$ingress" "$ingress"
done

# Check nodes (cluster health)
print_info ""
print_info "=========================================="
print_info "Checking Node Health"
print_info "=========================================="

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
READY_NODES=$(kubectl get nodes --no-headers | grep -c " Ready")
TOTAL_NODES=$(kubectl get nodes --no-headers | wc -l)

if [ "$READY_NODES" == "$TOTAL_NODES" ]; then
    print_info "  ✓ All nodes are ready ($READY_NODES/$TOTAL_NODES)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    print_error "  ✗ Some nodes are not ready ($READY_NODES/$TOTAL_NODES)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# Deep health checks
if [ "$DEEP_CHECK" = true ]; then
    print_info ""
    print_info "=========================================="
    print_info "Deep Health Checks"
    print_info "=========================================="
    
    # Check pod resource usage
    print_info "Checking pod resource usage..."
    if kubectl top pods -n "$NAMESPACE" &> /dev/null; then
        kubectl top pods -n "$NAMESPACE"
    else
        print_warn "Metrics server not available"
    fi
    
    # Check HPA status
    print_info ""
    print_info "Checking HPA status..."
    if kubectl get hpa -n "$NAMESPACE" &> /dev/null; then
        kubectl get hpa -n "$NAMESPACE"
    else
        print_warn "No HPA configured"
    fi
    
    # Check events
    print_info ""
    print_info "Recent events (last 10):"
    kubectl get events -n "$NAMESPACE" --sort-by='.lastTimestamp' | tail -10
fi

# Display summary
print_info ""
print_info "=========================================="
print_info "Health Check Summary"
print_info "=========================================="
print_info "Total Checks: $TOTAL_CHECKS"
print_info "Passed: $PASSED_CHECKS"
print_info "Failed: $FAILED_CHECKS"
print_info "Warnings: $WARNINGS"
print_info "=========================================="

# Exit with appropriate code
if [ "$FAILED_CHECKS" -gt 0 ]; then
    print_error "Health check failed!"
    exit 1
elif [ "$WARNINGS" -gt 0 ]; then
    print_warn "Health check completed with warnings!"
    exit 0
else
    print_info "All health checks passed!"
    exit 0
fi
