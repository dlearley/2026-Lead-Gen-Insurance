#!/bin/bash

# Kubernetes Rollback Script for Insurance Lead Gen Platform

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
REVISION=""

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
        --revision|-r)
            REVISION="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 --env <env> --deployment <name> [--revision <revision>]"
            echo ""
            echo "Arguments:"
            echo "  --env, -e             Environment (dev, staging, prod)"
            echo "  --deployment, -d      Deployment name to rollback"
            echo "  --revision, -r        Specific revision to rollback to (optional)"
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

NAMESPACE="insurance-lead-gen-${ENVIRONMENT}"

print_info "=========================================="
print_info "Rollback Information"
print_info "Environment: $ENVIRONMENT"
print_info "Namespace: $NAMESPACE"
print_info "Deployment: $DEPLOYMENT"
print_info "Revision: ${REVISION:-previous}"
print_info "=========================================="

# Check if deployment exists
if ! kubectl get deployment "$DEPLOYMENT" -n "$NAMESPACE" &> /dev/null; then
    print_error "Deployment $DEPLOYMENT not found in namespace $NAMESPACE"
    exit 1
fi

# Show current deployment status
print_info "Current deployment status:"
kubectl rollout status deployment/$DEPLOYMENT -n "$NAMESPACE"

# List available revisions
print_info ""
print_info "Available revisions:"
kubectl rollout history deployment/$DEPLOYMENT -n "$NAMESPACE"

# Rollback
print_info ""
print_info "Initiating rollback..."

if [ -z "$REVISION" ]; then
    # Rollback to previous revision
    print_info "Rolling back to previous revision..."
    kubectl rollout undo deployment/$DEPLOYMENT -n "$NAMESPACE"
else
    # Rollback to specific revision
    print_info "Rolling back to revision $REVISION..."
    kubectl rollout undo deployment/$DEPLOYMENT -n "$NAMESPACE" --to-revision="$REVISION"
fi

# Wait for rollback to complete
print_info "Waiting for rollback to complete..."
kubectl rollout status deployment/$DEPLOYMENT -n "$NAMESPACE" --timeout=5m

# Show updated status
print_info ""
print_info "Rollback completed successfully!"
print_info ""
print_info "Updated deployment status:"
kubectl rollout status deployment/$DEPLOYMENT -n "$NAMESPACE"

# Show new revision history
print_info ""
print_info "Updated revision history:"
kubectl rollout history deployment/$DEPLOYMENT -n "$NAMESPACE"

# Display pods
print_info ""
print_info "Pod status:"
kubectl get pods -n "$NAMESPACE" -l app=$DEPLOYMENT
