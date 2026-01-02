#!/bin/bash
set -e

# Production Monitoring Stack Deployment Script
# Run 19.3: Monitoring & Observability Production Setup

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="${MONITORING_NAMESPACE:-monitoring}"
REGION="${AWS_REGION:-us-east-1}"
CLUSTER_NAME="${CLUSTER_NAME:-insurance-lead-gen-production}"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi

    # Check helm
    if ! command -v helm &> /dev/null; then
        log_error "helm is not installed"
        exit 1
    fi

    # Check AWS CLI (if using EKS)
    if ! command -v aws &> /dev/null; then
        log_warn "aws CLI not found, skipping AWS checks"
    fi

    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    log_info "Prerequisites check passed"
}

create_secrets() {
    log_info "Creating monitoring secrets..."

    # Grafana admin credentials
    if [ -z "$GRAFANA_ADMIN_PASSWORD" ]; then
        log_warn "GRAFANA_ADMIN_PASSWORD not set, generating random password"
        GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 32)
    fi

    kubectl create secret generic grafana-admin-credentials \
        --from-literal=admin-user="${GRAFANA_ADMIN_USER:-admin}" \
        --from-literal=admin-password="$GRAFANA_ADMIN_PASSWORD" \
        --namespace="$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -

    log_info "Grafana admin password saved to: $GRAFANA_ADMIN_PASSWORD"

    # AlertManager config
    if [ -f "monitoring/alertmanager/alertmanager.yml" ]; then
        kubectl create secret generic alertmanager-config \
            --from-file=alertmanager.yml=monitoring/alertmanager/alertmanager.yml \
            --namespace="$NAMESPACE" \
            --dry-run=client -o yaml | kubectl apply -f -
        log_info "AlertManager config created"
    else
        log_warn "AlertManager config not found at monitoring/alertmanager/alertmanager.yml"
    fi

    # Elasticsearch credentials (for Jaeger)
    if [ "$JAEGER_ENABLED" = "true" ]; then
        if [ -z "$ELASTICSEARCH_PASSWORD" ]; then
            ELASTICSEARCH_PASSWORD=$(openssl rand -base64 32)
        fi

        kubectl create secret generic elasticsearch-credentials \
            --from-literal=username="${ELASTICSEARCH_USERNAME:-elastic}" \
            --from-literal=password="$ELASTICSEARCH_PASSWORD" \
            --namespace="$NAMESPACE" \
            --dry-run=client -o yaml | kubectl apply -f -

        log_info "Elasticsearch credentials created for Jaeger"
    fi
}

deploy_kustomize() {
    log_info "Deploying monitoring stack with Kustomize..."

    if [ ! -d "deploy/k8s/monitoring" ]; then
        log_error "deploy/k8s/monitoring directory not found"
        exit 1
    fi

    cd deploy/k8s/monitoring
    kubectl apply -k .

    log_info "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available \
        -l app.kubernetes.io/component=monitoring \
        --namespace="$NAMESPACE" \
        --timeout=600s \
        deployment

    cd - > /dev/null
    log_info "Kustomize deployment completed"
}

deploy_helm() {
    log_info "Deploying monitoring stack with Helm..."

    if [ ! -d "deploy/helm/monitoring" ]; then
        log_error "deploy/helm/monitoring directory not found"
        exit 1
    fi

    cd deploy/helm/monitoring

    # Upgrade or install
    if helm list -n "$NAMESPACE" | grep -q "insurance-lead-gen-monitoring"; then
        log_info "Upgrading existing release..."
        helm upgrade insurance-lead-gen-monitoring . \
            --namespace "$NAMESPACE" \
            --values values.production.yaml \
            --wait \
            --timeout 10m
    else
        log_info "Installing new release..."
        helm install insurance-lead-gen-monitoring . \
            --namespace "$NAMESPACE" \
            --create-namespace \
            --values values.production.yaml \
            --wait \
            --timeout 10m
    fi

    cd - > /dev/null
    log_info "Helm deployment completed"
}

verify_deployment() {
    log_info "Verifying deployment..."

    # Check pods
    log_info "Checking pod status..."
    kubectl get pods -n "$NAMESPACE"

    # Check services
    log_info "Checking services..."
    kubectl get svc -n "$NAMESPACE"

    # Check PVCs
    log_info "Checking persistent volume claims..."
    kubectl get pvc -n "$NAMESPACE"

    # Wait for all pods to be ready
    log_info "Waiting for all pods to be ready..."
    kubectl wait --for=condition=ready \
        -l app.kubernetes.io/component=monitoring \
        --namespace="$NAMESPACE" \
        --timeout=600s \
        pod || true

    log_info "Deployment verification completed"
}

print_access_info() {
    log_info "Monitoring Stack Access Information"
    echo ""
    echo "=================================="
    echo "Grafana:      https://${GRAFANA_HOST:-grafana.insurance-lead-gen.com}"
    echo "Prometheus:   https://${PROMETHEUS_HOST:-prometheus.insurance-lead-gen.com}"
    echo "AlertManager: https://${ALERTMANAGER_HOST:-alertmanager.insurance-lead-gen.com}"
    if [ "$JAEGER_ENABLED" = "true" ]; then
        echo "Jaeger:       https://${JAEGER_HOST:-jaeger.insurance-lead-gen.com}"
    fi
    echo "=================================="
    echo ""
    echo "Grafana Credentials:"
    echo "  Username: ${GRAFANA_ADMIN_USER:-admin}"
    echo "  Password: $GRAFANA_ADMIN_PASSWORD"
    echo ""
}

setup_port_forwarding() {
    log_info "Setting up port forwarding for local access..."

    # Function to handle cleanup
    cleanup() {
        log_info "Stopping port forwarding..."
        kill $(jobs -p) 2>/dev/null || true
        exit 0
    }

    trap cleanup INT TERM

    # Port forward Grafana
    kubectl port-forward -n "$NAMESPACE" svc/grafana 3000:3000 &
    log_info "Grafana: http://localhost:3000"

    # Port forward Prometheus
    kubectl port-forward -n "$NAMESPACE" svc/prometheus 9090:9090 &
    log_info "Prometheus: http://localhost:9090"

    # Port forward AlertManager
    kubectl port-forward -n "$NAMESPACE" svc/alertmanager 9093:9093 &
    log_info "AlertManager: http://localhost:9093"

    if [ "$JAEGER_ENABLED" = "true" ]; then
        kubectl port-forward -n "$NAMESPACE" svc/jaeger-query 16686:16686 &
        log_info "Jaeger: http://localhost:16686"
    fi

    log_info "Port forwarding running. Press Ctrl+C to stop."
    wait
}

backup_config() {
    log_info "Creating backup of monitoring configuration..."

    BACKUP_DIR="./backups/monitoring-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    # Backup secrets (encrypted)
    kubectl get secrets -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/secrets.yaml"

    # Backup configs
    kubectl get configmaps -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/configmaps.yaml"

    # Backup Helm values
    if [ -f "deploy/helm/monitoring/values.production.yaml" ]; then
        cp deploy/helm/monitoring/values.production.yaml "$BACKUP_DIR/"
    fi

    log_info "Backup created at: $BACKUP_DIR"
}

main() {
    # Parse arguments
    DEPLOYMENT_METHOD="${1:-helm}"  # helm or kustomize
    SETUP_PORT_FORWARDING="${2:-false}"

    log_info "Starting production monitoring deployment (Run 19.3)"
    echo ""

    check_prerequisites
    create_secrets

    if [ "$DEPLOYMENT_METHOD" = "kustomize" ]; then
        deploy_kustomize
    else
        deploy_helm
    fi

    verify_deployment
    print_access_info

    if [ "$SETUP_PORT_FORWARDING" = "true" ]; then
        setup_port_forwarding
    fi

    log_info "Deployment completed successfully!"
}

# Run main function
main "$@"
