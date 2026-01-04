#!/bin/bash

# Emergency rollback script for CI/CD pipeline
# Usage: ./rollback.sh <environment> <target_version> [options]
# Environment: dev, staging, prod
# Target version: Git SHA or tag
# Options: --auto (automatic rollback), --force (force rollback)

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Global variables
ROLLBACK_MODE=true
AUTO_ROLLBACK=false
FORCE_ROLLBACK=false
ENVIRONMENT=""
TARGET_VERSION=""
NAMESPACE=""
ROLLBACK_ID="rollback-$(date +%Y%m%d-%H%M%S)"

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
    echo "Usage: $0 <environment> <target_version> [options]"
    echo ""
    echo "Environment: dev, staging, prod"
    echo "Target version: Git SHA or tag to rollback to"
    echo ""
    echo "Options:"
    echo "  --auto          Automatic rollback (from failed deployment)"
    echo "  --force         Force rollback without safety checks"
    echo "  --dry-run       Show what would be done without executing"
    echo "  --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 staging v1.2.3"
    echo "  $0 production abc123def --auto"
    echo "  $0 dev v1.1.0 --force"
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --auto)
                AUTO_ROLLBACK=true
                shift
                ;;
            --force)
                FORCE_ROLLBACK=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --help)
                usage
                exit 0
                ;;
            dev|staging|prod)
                if [[ -z "${ENVIRONMENT:-}" ]]; then
                    ENVIRONMENT="$1"
                else
                    log_error "Environment already specified: $ENVIRONMENT"
                    exit 1
                fi
                shift
                ;;
            *)
                if [[ -z "${TARGET_VERSION:-}" ]]; then
                    TARGET_VERSION="$1"
                else
                    log_error "Target version already specified: $TARGET_VERSION"
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    # Validate required arguments
    if [[ -z "${ENVIRONMENT:-}" ]]; then
        log_error "Environment is required"
        usage
        exit 1
    fi
    
    if [[ -z "${TARGET_VERSION:-}" ]]; then
        log_error "Target version is required"
        usage
        exit 1
    fi
    
    # Set namespace based on environment
    case $ENVIRONMENT in
        dev)
            NAMESPACE="dev"
            ;;
        staging)
            NAMESPACE="staging"
            ;;
        prod)
            NAMESPACE="production"
            ;;
    esac
}

# Validate target version
validate_target_version() {
    log_info "Validating target version: $TARGET_VERSION"
    
    # Check if it's a valid Git reference
    if ! git rev-parse "$TARGET_VERSION" &>/dev/null; then
        log_error "Target version $TARGET_VERSION does not exist in repository"
        return 1
    fi
    
    log_success "Target version $TARGET_VERSION is valid"
    return 0
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking rollback prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed"
        exit 1
    fi
    
    # Check if aws cli is installed
    if ! command -v aws &> /dev/null; then
        log_error "aws CLI is not installed"
        exit 1
    fi
    
    log_success "All prerequisites are met"
}

# Check cluster connectivity
check_cluster_connectivity() {
    log_info "Checking cluster connectivity..."
    
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check if namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_error "Namespace $NAMESPACE does not exist"
        exit 1
    fi
    
    log_success "Cluster connectivity verified"
}

# Get current deployment information
get_current_deployment_info() {
    log_info "Getting current deployment information..."
    
    # Get current versions of deployments
    local deployments=("api" "backend" "data-service" "orchestrator" "frontend")
    
    CURRENT_VERSIONS=()
    for deployment in "${deployments[@]}"; do
        local current_version=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.spec.template.metadata.labels.version}' 2>/dev/null || echo "unknown")
        CURRENT_VERSIONS+=("$deployment:$current_version")
        log_info "Current $deployment version: $current_version"
    done
    
    log_success "Current deployment information collected"
}

# Assess rollback impact
assess_rollback_impact() {
    log_info "Assessing rollback impact..."
    
    # Get commit information
    local current_commit=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    local target_commit=$(git rev-parse "$TARGET_VERSION" 2>/dev/null || echo "unknown")
    
    if [[ "$current_commit" != "unknown" && "$target_commit" != "unknown" ]]; then
        # Get commits between target and current
        local commit_count=$(git rev-list "$TARGET_VERSION".."$current_commit" --oneline | wc -l)
        
        log_info "Rollback will revert $commit_count commits"
        log_info "From: $target_commit"
        log_info "To: $current_commit"
        
        # Get commit messages for context
        echo "Commits that will be reverted:"
        git rev-list "$TARGET_VERSION".."$current_commit" --oneline | head -10
        
        # Warn about significant rollbacks
        if [[ $commit_count -gt 50 ]]; then
            log_warning "Large rollback detected ($commit_count commits)"
        fi
    else
        log_warning "Cannot determine commit information"
    fi
    
    log_success "Rollback impact assessment completed"
}

# Create rollback snapshot
create_rollback_snapshot() {
    log_info "Creating rollback safety snapshot..."
    
    local snapshot_dir="rollback-snapshots/$ROLLBACK_ID"
    mkdir -p "$snapshot_dir"
    
    # Save current deployment state
    kubectl get all -n "$NAMESPACE" -o yaml > "$snapshot_dir/current-state.yaml"
    
    # Save deployment configurations
    local deployments=("api" "backend" "data-service" "orchestrator" "frontend")
    for deployment in "${deployments[@]}"; do
        kubectl get deployment "$deployment" -n "$NAMESPACE" -o yaml > "$snapshot_dir/${deployment}-deployment.yaml" 2>/dev/null || true
    done
    
    # Create rollback metadata
    cat > "$snapshot_dir/rollback-metadata.json" << EOF
{
    "rollback_id": "$ROLLBACK_ID",
    "environment": "$ENVIRONMENT",
    "target_version": "$TARGET_VERSION",
    "rollback_timestamp": "$(date -Iseconds)",
    "auto_rollback": $AUTO_ROLLBACK,
    "force_rollback": $FORCE_ROLLBACK,
    "current_versions": $(printf '%s\n' "${CURRENT_VERSIONS[@]}" | jq -R . | jq -s .)
}
EOF
    
    log_success "Rollback snapshot created: $snapshot_dir"
}

# Execute rollback deployment
execute_rollback_deployment() {
    log_info "Executing rollback to version $TARGET_VERSION..."
    
    # Set environment variables for rollback
    export IMAGE_TAG="$TARGET_VERSION"
    export ROLLBACK_MODE=true
    export ENVIRONMENT="$ENVIRONMENT"
    export NAMESPACE="$NAMESPACE"
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log_info "[DRY RUN] Would execute rollback deployment"
        return 0
    fi
    
    # Deploy using the same deployment script but with rollback mode
    log_info "Deploying previous version using rolling strategy"
    
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local services=("api" "backend" "data-service" "orchestrator" "frontend")
    
    for service in "${services[@]}"; do
        log_info "Rolling back $service to $TARGET_VERSION..."
        
        # Update deployment with target version
        kubectl set image deployment/"$service" "$service"="${AWS_REGION}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}/${service}:${TARGET_VERSION}" -n "$NAMESPACE" --record=false
        
        # Wait for rollout to complete
        if kubectl rollout status "deployment/$service" -n "$NAMESPACE" --timeout=300s; then
            log_success "$service rollback completed"
        else
            log_error "$service rollback failed"
            kubectl describe "deployment/$service" -n "$NAMESPACE"
            return 1
        fi
    done
    
    log_success "Rollback deployment completed successfully"
}

# Wait for rollback to stabilize
wait_for_rollback_stabilization() {
    log_info "Waiting for rollback to stabilize..."
    
    local stabilization_time=300  # 5 minutes
    
    log_info "Monitoring deployment for $stabilization_time seconds..."
    
    local services=("api" "backend" "data-service" "orchestrator" "frontend")
    local start_time=$(date +%s)
    local end_time=$((start_time + stabilization_time))
    
    while [[ $(date +%s) -lt $end_time ]]; do
        local all_ready=true
        
        for service in "${services[@]}"; do
            local ready_replicas=$(kubectl get deployment "$service" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
            local desired_replicas=$(kubectl get deployment "$service" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
            
            if [[ "$ready_replicas" != "$desired_replicas" ]]; then
                all_ready=false
                break
            fi
        done
        
        if [[ "$all_ready" == "true" ]]; then
            log_success "All services are ready"
            break
        fi
        
        sleep 30
    done
    
    log_success "Rollback stabilization check completed"
}

# Run post-rollback health checks
run_post_rollback_health_checks() {
    log_info "Running post-rollback health checks..."
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log_info "[DRY RUN] Would run post-rollback health checks"
        return 0
    fi
    
    local services=("api" "backend" "data-service" "orchestrator" "frontend")
    local failed_services=()
    
    for service in "${services[@]}"; do
        log_info "Checking $service health..."
        
        # Check if pods are running
        local running_pods=$(kubectl get pods -n "$NAMESPACE" -l "app=$service" -o jsonpath='{.items[*].status.phase}' | grep -c "Running" || echo "0")
        local expected_pods=$(kubectl get deployment "$service" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
        
        if [[ "$running_pods" == "$expected_pods" && "$expected_pods" != "0" ]]; then
            log_success "$service is healthy"
        else
            log_warning "$service health check failed (Running: $running_pods, Expected: $expected_pods)"
            failed_services+=("$service")
        fi
    done
    
    if [[ ${#failed_services[@]} -gt 0 ]]; then
        log_error "Health check failed for services: ${failed_services[*]}"
        return 1
    fi
    
    log_success "All health checks passed"
}

# Verify rollback success
verify_rollback_success() {
    log_info "Verifying rollback success..."
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log_info "[DRY RUN] Would verify rollback success"
        return 0
    fi
    
    # Check deployment status
    local deployments_status=$(kubectl get deployments -n "$NAMESPACE" -o json)
    local failed_deployments=$(echo "$deployments_status" | jq -r '.items[] | select(.status.unavailableReplicas != null) | .metadata.name' | wc -l)
    
    if [[ "$failed_deployments" != "0" ]]; then
        log_error "Some deployments have unavailable replicas"
        return 1
    fi
    
    # Verify version has changed
    local api_version=$(kubectl get deployment api -n "$NAMESPACE" -o jsonpath='{.spec.template.metadata.labels.version}' 2>/dev/null || echo "unknown")
    if [[ "$api_version" == "$TARGET_VERSION" ]]; then
        log_success "Rollback verified - API version is now $TARGET_VERSION"
    else
        log_warning "API version is $api_version, expected $TARGET_VERSION"
    fi
    
    log_success "Rollback verification completed"
}

# Cleanup old resources
cleanup_old_resources() {
    log_info "Cleaning up old resources..."
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log_info "[DRY RUN] Would cleanup old resources"
        return 0
    fi
    
    # Remove old pods that might be stuck
    kubectl delete pods -n "$NAMESPACE" --field-selector status.phase=Failed --ignore-not-found=true
    kubectl delete pods -n "$NAMESPACE" --field-selector status.phase=Succeeded --ignore-not-found=true
    
    log_success "Cleanup completed"
}

# Generate rollback report
generate_rollback_report() {
    log_info "Generating rollback report..."
    
    local report_file="rollback-report-$ROLLBACK_ID.md"
    
    cat > "$report_file" << EOF
# Rollback Report

**Rollback ID:** $ROLLBACK_ID
**Environment:** $ENVIRONMENT
**Target Version:** $TARGET_VERSION
**Timestamp:** $(date)
**Auto Rollback:** $AUTO_ROLLBACK
**Force Rollback:** $FORCE_ROLLBACK

## Summary

Emergency rollback executed from current version to $TARGET_VERSION in $ENVIRONMENT environment.

## Rollback Process

1. **Pre-rollback Validation** - Target version and prerequisites validated
2. **Impact Assessment** - Rollback impact analyzed
3. **Snapshot Creation** - Safety snapshot created
4. **Rollback Execution** - Services rolled back to target version
5. **Stabilization** - Deployment stabilization monitored
6. **Health Checks** - Post-rollback health validation
7. **Verification** - Rollback success confirmed
8. **Cleanup** - Old resources cleaned up

## Current Status

- **Environment:** $ENVIRONMENT
- **Namespace:** $NAMESPACE
- **Target Version:** $TARGET_VERSION
- **Rollback ID:** $ROLLBACK_ID
- **Status:** $(if [[ $? -eq 0 ]]; then echo "✅ Successful"; else echo "❌ Failed"; fi)

## Next Steps

1. Monitor environment for next 24 hours
2. Investigate root cause of issues that led to rollback
3. Plan next steps (hotfix, additional testing, etc.)
4. Update deployment procedures if needed

## Rollback Snapshot Location

Rollback snapshot saved to: rollback-snapshots/$ROLLBACK_ID/

---

**Report generated by rollback script**
EOF
    
    log_success "Rollback report generated: $report_file"
}

# Main rollback function
main() {
    log_info "Starting rollback process"
    log_info "Environment: $ENVIRONMENT"
    log_info "Target version: $TARGET_VERSION"
    log_info "Rollback ID: $ROLLBACK_ID"
    log_info "Auto rollback: $AUTO_ROLLBACK"
    log_info "Force rollback: $FORCE_ROLLBACK"
    
    # Run rollback steps
    check_prerequisites
    check_cluster_connectivity
    get_current_deployment_info
    
    if [[ "$FORCE_ROLLBACK" != "true" && "$AUTO_ROLLBACK" != "true" ]]; then
        assess_rollback_impact
    fi
    
    validate_target_version
    create_rollback_snapshot
    
    if execute_rollback_deployment; then
        wait_for_rollback_stabilization
        run_post_rollback_health_checks
        verify_rollback_success
        cleanup_old_resources
        generate_rollback_report
        
        log_success "Rollback completed successfully!"
    else
        log_error "Rollback failed!"
        generate_rollback_report
        exit 1
    fi
}

# Handle script arguments and main execution
if [[ $# -eq 0 ]]; then
    usage
    exit 1
fi

# Parse arguments and run main
parse_arguments "$@"
main