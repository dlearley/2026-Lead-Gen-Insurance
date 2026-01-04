#!/bin/bash

# Kubernetes Deployment Script for Insurance Lead Gen Platform
# Supports dev, staging, and production environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
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
    print_error "kubectl is not installed. Please install kubectl first."
    exit 1
fi

# Check if kustomize is installed
if ! command -v kustomize &> /dev/null; then
    print_error "kustomize is not installed. Please install kustomize first."
    exit 1
fi

# Parse arguments
ENVIRONMENT=""
DRY_RUN=false
SKIP_HEALTH_CHECK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --env|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-health-check)
            SKIP_HEALTH_CHECK=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 --env <env> [--dry-run] [--skip-health-check]"
            echo ""
            echo "Arguments:"
            echo "  --env, -e             Environment to deploy (dev, staging, prod)"
            echo "  --dry-run             Validate manifests without applying"
            echo "  --skip-health-check   Skip health checks after deployment"
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
    print_error "Environment is required. Use --env <env>"
    exit 1
fi

if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    print_error "Invalid environment. Must be dev, staging, or prod"
    exit 1
fi

# Set namespace
NAMESPACE="insurance-lead-gen-${ENVIRONMENT}"

print_info "=========================================="
print_info "Deploying to: $ENVIRONMENT"
print_info "Namespace: $NAMESPACE"
print_info "Dry Run: $DRY_RUN"
print_info "=========================================="

# Set directory paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
K8S_DIR="$PROJECT_ROOT/k8s"

# Verify overlay exists
OVERLAY_DIR="$K8S_DIR/overlays/$ENVIRONMENT"
if [ ! -d "$OVERLAY_DIR" ]; then
    print_error "Overlay directory not found: $OVERLAY_DIR"
    exit 1
fi

# Validate infrastructure first
print_info "Validating infrastructure manifests..."
cd "$K8S_DIR/infrastructure"
if [ "$DRY_RUN" = true ]; then
    kustomize build . | kubectl apply --dry-run=client -f -
else
    kustomize build . | kubectl apply -f -
fi

# Apply namespace
print_info "Applying namespace..."
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Build and apply manifests
print_info "Building manifests for $ENVIRONMENT..."
cd "$OVERLAY_DIR"

if [ "$DRY_RUN" = true ]; then
    print_info "Running dry-run validation..."
    kustomize build . | kubectl apply --dry-run=client -f -
    print_info "Validation successful!"
    exit 0
fi

# Apply manifests
print_info "Applying manifests..."
kustomize build . | kubectl apply -f -

# Wait for deployments to be ready
if [ "$SKIP_HEALTH_CHECK" = false ]; then
    print_info "Waiting for deployments to be ready..."
    
    # List of deployments to wait for
    DEPLOYMENTS=("api" "data-service" "orchestrator" "frontend" "backend")
    
    for deployment in "${DEPLOYMENTS[@]}"; do
        print_info "Waiting for $deployment deployment..."
        kubectl rollout status deployment/$deployment -n "$NAMESPACE" --timeout=5m || {
            print_error "Deployment $deployment failed to become ready"
            kubectl describe deployment/$deployment -n "$NAMESPACE"
            exit 1
        }
    done
    
    # Wait for statefulsets
    print_info "Waiting for statefulsets to be ready..."
    STATEFULSETS=("postgres" "redis" "neo4j" "qdrant")
    
    for statefulset in "${STATEFULSETS[@]}"; do
        print_info "Waiting for $statefulset statefulset..."
        kubectl rollout status statefulset/$statefulset -n "$NAMESPACE" --timeout=10m || {
            print_error "StatefulSet $statefulset failed to become ready"
            kubectl describe statefulset/$statefulset -n "$NAMESPACE"
            exit 1
        }
    done
fi

# Display status
print_info "=========================================="
print_info "Deployment Status:"
print_info "=========================================="

kubectl get all -n "$NAMESPACE"

# Display ingress if exists
print_info ""
print_info "Ingress Status:"
kubectl get ingress -n "$NAMESPACE" || print_warn "No ingress found"

# Display PVCs
print_info ""
print_info "Persistent Volume Claims:"
kubectl get pvc -n "$NAMESPACE" || print_warn "No PVCs found"

# Check pod health
if [ "$SKIP_HEALTH_CHECK" = false ]; then
    print_info ""
    print_info "Pod Health Check:"
    
    PENDING_PODS=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase=Pending --no-headers | wc -l)
    FAILED_PODS=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase=Failed --no-headers | wc -l)
    
    if [ "$PENDING_PODS" -gt 0 ]; then
        print_warn "$PENDING_PODS pods are still pending"
        kubectl get pods -n "$NAMESPACE" --field-selector=status.phase=Pending
    fi
    
    if [ "$FAILED_PODS" -gt 0 ]; then
        print_error "$FAILED_PODS pods have failed"
        kubectl get pods -n "$NAMESPACE" --field-selector=status.phase=Failed
        exit 1
    fi
fi

print_info ""
print_info "=========================================="
print_info "Deployment completed successfully!"
print_info "=========================================="
print_info "To view logs:"
print_info "  kubectl logs -f -n $NAMESPACE <pod-name>"
print_info ""
print_info "To get shell access:"
print_info "  kubectl exec -it -n $NAMESPACE <pod-name> -- sh"
print_info ""
print_info "To scale deployments:"
print_info "  kubectl scale deployment/<name> -n $NAMESPACE --replicas=<count>"
