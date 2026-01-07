#!/bin/bash

# Kubernetes Scaling Script for Insurance Lead Gen Platform

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
DEPLOYMENT=""
REPLICAS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --env|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --deployment|-d)
            DEPLOYMENT="$2"
            shift 2
            ;;
        --replicas|-r)
            REPLICAS="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 --env <env> --deployment <name> --replicas <count>"
            echo ""
            echo "Arguments:"
            echo "  --env, -e             Environment (dev, staging, prod)"
            echo "  --deployment, -d      Deployment name to scale"
            echo "  --replicas, -r        Target number of replicas"
            echo "  --help, -h            Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate arguments
if [ -z "$ENVIRONMENT" ]; then
    print_error "Environment is required."
    exit 1
fi

if [ -z "$DEPLOYMENT" ]; then
    print_error "Deployment name is required."
    exit 1
fi

if [ -z "$REPLICAS" ]; then
    print_error "Replica count is required."
    exit 1
fi

# Validate replica count
if ! [[ "$REPLICAS" =~ ^[0-9]+$ ]]; then
    print_error "Replica count must be a positive integer."
    exit 1
fi

if [ "$REPLICAS" -lt 0 ]; then
    print_error "Replica count cannot be negative."
    exit 1
fi

NAMESPACE="insurance-lead-gen-${ENVIRONMENT}"

print_info "=========================================="
print_info "Scaling Deployment"
print_info "Environment: $ENVIRONMENT"
print_info "Namespace: $NAMESPACE"
print_info "Deployment: $DEPLOYMENT"
print_info "Target Replicas: $REPLICAS"
print_info "=========================================="

# Check if deployment exists
if ! kubectl get deployment "$DEPLOYMENT" -n "$NAMESPACE" &> /dev/null; then
    print_error "Deployment $DEPLOYMENT not found in namespace $NAMESPACE"
    exit 1
fi

# Get current replica count
CURRENT_REPLICAS=$(kubectl get deployment "$DEPLOYMENT" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')

print_info "Current replicas: $CURRENT_REPLICAS"
print_info "Target replicas: $REPLICAS"

# Confirm scaling
read -p "Do you want to proceed? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Scaling cancelled."
    exit 0
fi

# Perform scaling
print_info "Scaling deployment..."
kubectl scale deployment/$DEPLOYMENT -n "$NAMESPACE" --replicas=$REPLICAS

# Wait for scaling to complete
print_info "Waiting for scaling to complete..."
kubectl rollout status deployment/$DEPLOYMENT -n "$NAMESPACE" --timeout=5m

# Display updated status
print_info ""
print_info "Scaling completed successfully!"
print_info ""
print_info "Updated deployment status:"
kubectl get deployment/$DEPLOYMENT -n "$NAMESPACE

# Display pods
print_info ""
print_info "Pod status:"
kubectl get pods -n "$NAMESPACE" -l app=$DEPLOYMENT

# Display HPA status if exists
print_info ""
print_info "HPA Status (if any):"
kubectl get hpa -n "$NAMESPACE" -l app=$DEPLOYMENT || print_warn "No HPA found for this deployment"

print_info ""
print_info "=========================================="
print_info "Scaling completed!"
print_info "=========================================="
