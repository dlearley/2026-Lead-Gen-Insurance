#!/bin/bash

set -euo pipefail

# Traffic Switching Script for Blue-Green Deployments
# Usage: ./switch-traffic.sh --environment <env> --new-version <version>

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT=""
NEW_VERSION=""
NAMESPACE="insurance-lead-gen"
SWITCH_INTERVAL=5

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --new-version)
            NEW_VERSION="$2"
            shift 2
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --interval)
            SWITCH_INTERVAL="$2"
            shift 2
            ;;
        *)
            echo "Unknown parameter: $1"
            exit 1
            ;;
    esac
done

# Validate required parameters
if [[ -z "$ENVIRONMENT" || -z "$NEW_VERSION" ]]; then
    echo "Usage: $0 --environment <env> --new-version <version> [--namespace <namespace>] [--interval <seconds>]"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Determine active deployment color
determine_deployment_colors() {
    log "Analyzing current deployment state..."
    
    # Get all api deployments
    local deployments=$(kubectl get deployments -n "$NAMESPACE" -l app=api,environment="$ENVIRONMENT" -o jsonpath='{.items[*].metadata.name}')
    
    if [[ -z "$deployments" ]]; then
        error "No deployments found for api in $ENVIRONMENT environment"
        exit 1
    fi
    
    # Determine which deployment is receiving traffic
    local current_selector=$(kubectl get service api-service -n "$NAMESPACE" -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "")
    
    if [[ -z "$current_selector" ]]; then
        error "api-service not found or has no version selector"
        exit 1
    fi
    
    CURRENT_COLOR="$current_selector"
    
    # Determine new color based on deployment existence
    for deployment in $deployments; do
        if [[ "$deployment" == *"blue"* ]] && [[ "$CURRENT_COLOR" != "blue" ]]; then
            NEW_COLOR="blue"
            break
        elif [[ "$deployment" == *"green"* ]] && [[ "$CURRENT_COLOR" != "green" ]]; then
            NEW_COLOR="green"
            break
        fi
    done
    
    if [[ -z "${NEW_COLOR:-}" ]]; then
        error "Could not determine new deployment color"
        exit 1
    fi
    
    info "Current active color: $CURRENT_COLOR"
    info "New deployment color: $NEW_COLOR"
    info "New version: $NEW_VERSION"
}

# Gradual traffic switching using weighted load balancing
switch_traffic_gradual() {
    log "Initiating gradual traffic switch from $CURRENT_COLOR to $NEW_COLOR..."
    
    # Check if ingress-nginx is available for weighted routing
    if kubectl get ingress api-ingress -n "$NAMESPACE" >/dev/null 2>&1; then
        switch_traffic_ingress_nginx
    else
        switch_traffic_instant
    fi
}

# Traffic switching using Nginx ingress annotations
switch_traffic_ingress_nginx() {
    info "Using Nginx ingress for weighted traffic switching..."
    
    # Enable canary on new deployment
    kubectl annotate ingress api-ingress -n "$NAMESPACE" --overwrite \
        nginx.ingress.kubernetes.io/canary="true" \
        nginx.ingress.kubernetes.io/canary-weight="0"
    
    # Gradually increase traffic to new version
    local weights=(10 25 50 75 100)
    
    for weight in "${weights[@]}"; do
        info "Switching $weight% of traffic to new version..."
        
        kubectl annotate ingress api-ingress -n "$NAMESPACE" --overwrite \
            nginx.ingress.kubernetes.io/canary-weight="$weight"
        
        # Verify new deployment health at each step
        if ! verify_deployment_health "$NEW_COLOR"; then
            error "Health check failed at $weight% traffic switch"
            rollback_traffic_switch
            return 1
        fi
        
        sleep "$SWITCH_INTERVAL"
    done
    
    # Finalize traffic switch
    kubectl annotate ingress api-ingress -n "$NAMESPACE" --overwrite \
        nginx.ingress.kubernetes.io/canary="false" \
        nginx.ingress.kubernetes.io/canary-weight="0"
    
    # Update service selector to new color
    kubectl patch service api-service -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"version\":\"${NEW_COLOR}\"}}}"
}

# Instant traffic switch (default Kubernetes service selector)
switch_traffic_instant() {
    warn "Nginx ingress not found, performing instant traffic switch..."
    
    # Update service selector to new color
    kubectl patch service api-service -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"version\":\"${NEW_COLOR}\"}}}"
    
    # Verify health after switch
    sleep 5
    if ! verify_deployment_health "$NEW_COLOR"; then
        error "Health check failed after traffic switch"
        rollback_traffic_switch
        return 1
    fi
}

# Verify deployment health
verify_deployment_health() {
    local color="$1"
    info "Verifying health of $color deployment..."
    
    # Check deployment status
    if ! kubectl rollout status deployment/api-${ENVIRONMENT}-${color} -n "$NAMESPACE" --timeout=30s >/dev/null 2>&1; then
        error "Deployment rollout failed for $color"
        return 1
    fi
    
    # Check pod status
    local ready_pods=$(kubectl get pods -n "$NAMESPACE" -l app=api,environment="$ENVIRONMENT",version="$color" -o jsonpath='{.items[?(@.status.phase=="Running")].status.conditions[?(@.type=="Ready")].status}' | grep -c "True" || echo "0")
    local total_pods=$(kubectl get pods -n "$NAMESPACE" -l app=api,environment="$ENVIRONMENT",version="$color" --no-headers | wc -l)
    
    if [[ "$ready_pods" -eq 0 ]] || [[ "$ready_pods" -lt "$total_pods" ]]; then
        error "Not all pods are ready: $ready_pods/$total_pods"
        return 1
    fi
    
    # Check health endpoint if service is available
    if kubectl get service api-service-${color} -n "$NAMESPACE" >/dev/null 2>&1; then
        # Port forward for health check
        kubectl port-forward service/api-service-${color} 8080:80 -n "$NAMESPACE" &
        local pf_pid=$!
        sleep 3
        
        local health_status
        health_status=$(curl -f -s -o /dev/null -w "%{http_code}" http://localhost:8080/health || echo "000")
        
        kill $pf_pid 2>/dev/null || true
        
        if [[ "$health_status" != "200" ]]; then
            error "Health check failed with status: $health_status"
            return 1
        fi
    fi
    
    log "Health verification passed for $color deployment"
    return 0
}

# Rollback traffic switch in case of failure
rollback_traffic_switch() {
    warn "Initiating traffic rollback to $CURRENT_COLOR..."
    
    # Update service selector back to current color
    kubectl patch service api-service -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"version\":\"${CURRENT_COLOR}\"}}}"
    
    # Disable canary if using ingress
    if kubectl get ingress api-ingress -n "$NAMESPACE" >/dev/null 2>&1; then
        kubectl annotate ingress api-ingress -n "$NAMESPACE" --overwrite \
            nginx.ingress.kubernetes.io/canary="false" \
            nginx.ingress.kubernetes.io/canary-weight="0"
    fi
    
    log "Traffic rollback completed"
}

# Monitor traffic distribution
monitor_traffic() {
    log "Monitoring traffic distribution..."
    
    local duration=30
    local interval=5
    
    for ((i=0; i<duration; i+=interval)); do
        local current_pods
        current_pods=$(kubectl get pods -n "$NAMESPACE" -l app=api,environment="$ENVIRONMENT",version="$CURRENT_COLOR" --no-headers 2>/dev/null | wc -l)
        
        local new_pods
        new_pods=$(kubectl get pods -n "$NAMESPACE" -l app=api,environment="$ENVIRONMENT",version="$NEW_COLOR" --no-headers 2>/dev/null | wc -l)
        
        info "Pod distribution - Current ($CURRENT_COLOR): $current_pods pods, New ($NEW_COLOR): $new_pods pods"
        
        sleep "$interval"
    done
}

# Generate deployment report
generate_report() {
    local status="$1"
    
    log "Generating deployment report..."
    
    cat > /tmp/traffic-switch-report.json <<EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "status": "$status",
    "traffic_switch": {
        "from_color": "$CURRENT_COLOR",
        "to_color": "$NEW_COLOR",
        "new_version": "$NEW_VERSION"
    },
    "deployments": {
        "current": {
            "name": "api-$ENVIRONMENT-$CURRENT_COLOR",
            "replicas": $(kubectl get deployment api-$ENVIRONMENT-$CURRENT_COLOR -n $NAMESPACE -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
        },
        "new": {
            "name": "api-$ENVIRONMENT-$NEW_COLOR",
            "replicas": $(kubectl get deployment api-$ENVIRONMENT-$NEW_COLOR -n $NAMESPACE -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
        }
    }
}
EOF

    info "Report saved to /tmp/traffic-switch-report.json"
    cat /tmp/traffic-switch-report.json
}

# Main execution
main() {
    log "Starting traffic switch operation"
    
    determine_deployment_colors
    
    if switch_traffic_gradual; then
        log "Traffic switch completed successfully"
        monitor_traffic
        generate_report "success"
        
        # Cleanup old deployment after successful switch
        warn "Old deployment will be scaled down in 5 minutes if no issues are reported"
        (sleep 300 && kubectl scale deployment/api-${ENVIRONMENT}-${CURRENT_COLOR} -n "$NAMESPACE" --replicas=0) &
    else
        error "Traffic switch failed"
        generate_report "failed"
        exit 1
    fi
}

# Handle script termination
trap 'error "Script interrupted"; exit 1' INT TERM

# Run main function
main "$@"