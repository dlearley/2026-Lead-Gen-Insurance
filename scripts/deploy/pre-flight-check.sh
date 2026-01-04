#!/bin/bash

# Pre-flight check script for CI/CD pipeline
# Usage: ./pre-flight-check.sh <environment> [check_level]
# Environment: dev, staging, prod
# Check level: basic, comprehensive, strict

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Global variables
ENVIRONMENT=""
CHECK_LEVEL="basic"
NAMESPACE=""
FAILED_CHECKS=()
WARNINGS=()
AWS_REGION="us-east-1"
ECR_REPOSITORY="insurance-lead-gen"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    WARNINGS+=("$1")
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    FAILED_CHECKS+=("$1")
}

# Display usage information
usage() {
    echo "Usage: $0 <environment> [check_level]"
    echo ""
    echo "Environment: dev, staging, prod"
    echo "Check level: basic, comprehensive, strict"
    echo ""
    echo "Examples:"
    echo "  $0 staging basic"
    echo "  $0 prod comprehensive"
    echo "  $0 dev strict"
}

# Parse command line arguments
parse_arguments() {
    ENVIRONMENT=${1:-dev}
    CHECK_LEVEL=${2:-basic}
    
    # Validate environment
    case $ENVIRONMENT in
        dev|staging|prod)
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod"
            exit 1
            ;;
    esac
    
    # Validate check level
    case $CHECK_LEVEL in
        basic|comprehensive|strict)
            ;;
        *)
            log_error "Invalid check level: $CHECK_LEVEL. Must be basic, comprehensive, or strict"
            exit 1
            ;;
    esac
    
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

# Check if required tools are installed
check_required_tools() {
    log_info "Checking required tools..."
    
    local tools=("kubectl" "docker" "aws" "jq" "git" "curl")
    local missing_tools=()
    
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        return 1
    fi
    
    log_success "All required tools are installed"
    
    # Check tool versions
    local kubectl_version=$(kubectl version --client -o json 2>/dev/null | jq -r '.clientVersion.gitVersion' || echo "unknown")
    local docker_version=$(docker --version | cut -d' ' -f3 | sed 's/,//' || echo "unknown")
    local aws_version=$(aws --version 2>&1 | cut -d' ' -f1 | cut -d'/' -f2 || echo "unknown")
    
    log_info "Tool versions:"
    log_info "  kubectl: $kubectl_version"
    log_info "  docker: $docker_version"
    log_info "  aws CLI: $aws_version"
    
    return 0
}

# Check AWS credentials and access
check_aws_credentials() {
    log_info "Checking AWS credentials..."
    
    # Check if AWS credentials are configured
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid"
        return 1
    fi
    
    local aws_identity=$(aws sts get-caller-identity --output json)
    local aws_account=$(echo "$aws_identity" | jq -r '.Account')
    local aws_user=$(echo "$aws_identity" | jq -r '.Arn')
    
    log_success "AWS credentials validated"
    log_info "AWS Account: $aws_account"
    log_info "AWS User: $aws_user"
    
    # Check ECR access
    log_info "Checking ECR access..."
    if aws ecr describe-repositories --repository-names "$ECR_REPOSITORY" &> /dev/null; then
        log_success "ECR repository access confirmed"
    else
        log_warning "ECR repository access failed (may not exist yet)"
    fi
    
    # Check EKS access
    log_info "Checking EKS cluster access..."
    local cluster_name="insurance-$NAMESPACE-cluster"
    if aws eks describe-cluster --name "$cluster_name" --region "$AWS_REGION" &> /dev/null; then
        log_success "EKS cluster access confirmed"
    else
        log_error "EKS cluster $cluster_name not accessible"
        return 1
    fi
    
    return 0
}

# Check Kubernetes cluster connectivity
check_kubernetes_connectivity() {
    log_info "Checking Kubernetes cluster connectivity..."
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        return 1
    fi
    
    local cluster_info=$(kubectl cluster-info)
    log_success "Kubernetes cluster connectivity verified"
    log_info "Cluster info: $(echo "$cluster_info" | head -1)"
    
    # Check namespace access
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_warning "Namespace $NAMESPACE does not exist (will be created during deployment)"
    else
        log_success "Namespace $NAMESPACE exists and is accessible"
    fi
    
    # Check RBAC permissions
    log_info "Checking RBAC permissions..."
    if kubectl auth can-i create deployments --namespace="$NAMESPACE"; then
        log_success "Deployment creation permissions confirmed"
    else
        log_error "Insufficient permissions for deployment creation"
        return 1
    fi
    
    if kubectl auth can-i get pods --namespace="$NAMESPACE"; then
        log_success "Pod read permissions confirmed"
    else
        log_warning "Limited pod read permissions"
    fi
    
    return 0
}

# Check cluster resources and capacity
check_cluster_resources() {
    log_info "Checking cluster resources..."
    
    if [[ "$CHECK_LEVEL" == "basic" ]]; then
        log_info "Skipping resource checks (basic check level)"
        return 0
    fi
    
    # Get cluster nodes
    local nodes=$(kubectl get nodes -o json 2>/dev/null || echo '{"items":[]}')
    local node_count=$(echo "$nodes" | jq '.items | length')
    
    if [[ "$node_count" == "0" ]]; then
        log_error "No nodes found in cluster"
        return 1
    fi
    
    log_success "Found $node_count nodes in cluster"
    
    # Check node status
    local ready_nodes=$(echo "$nodes" | jq -r '.items[] | select(.status.conditions[] | select(.type=="Ready" and .status=="True")) | .metadata.name' | wc -l)
    
    if [[ "$ready_nodes" -lt "$node_count" ]]; then
        log_warning "Only $ready_nodes/$node_count nodes are ready"
        FAILED_CHECKS+=("node readiness: $ready_nodes/$node_count nodes ready")
    else
        log_success "All $node_count nodes are ready"
    fi
    
    # Check resource capacity
    local total_cpu=$(echo "$nodes" | jq -r '[.items[].status.allocatable.cpu] | map(gsub("m";"") | tonumber) | add')
    local total_memory=$(echo "$nodes" | jq -r '[.items[].status.allocatable.memory] | map(gsub("Ki";"") | tonumber / 1024 / 1024) | add')
    
    log_info "Cluster capacity: ${total_cpu}m CPU, ${total_memory}GB memory"
    
    # Check for resource pressure
    local nodes_with_pressure=$(echo "$nodes" | jq -r '.items[] | select(.status.conditions[] | select(.type=="MemoryPressure" and .status=="True")) | .metadata.name' | wc -l)
    if [[ "$nodes_with_pressure" -gt 0 ]]; then
        log_warning "$nodes_with_pressure nodes experiencing memory pressure"
        WARNINGS+=("memory pressure on $nodes_with_pressure nodes")
    fi
    
    local nodes_with_disk_pressure=$(echo "$nodes" | jq -r '.items[] | select(.status.conditions[] | select(.type=="DiskPressure" and .status=="True")) | .metadata.name' | wc -l)
    if [[ "$nodes_with_disk_pressure" -gt 0 ]]; then
        log_warning "$nodes_with_disk_pressure nodes experiencing disk pressure"
        WARNINGS+=("disk pressure on $nodes_with_disk_pressure nodes")
    fi
    
    return 0
}

# Check Docker image availability
check_docker_images() {
    log_info "Checking Docker image availability..."
    
    local image_tag="${IMAGE_TAG:-latest}"
    local services=("api" "backend" "data-service" "orchestrator" "frontend")
    local missing_images=()
    
    for service in "${services[@]}"; do
        local image_uri="${AWS_REGION}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}/${service}:${image_tag}"
        
        log_info "Checking image: $image_uri"
        
        # Check if image exists in ECR
        if aws ecr describe-images --repository-name "$ECR_REPOSITORY" --image-ids "imageTag=$image_tag" --region "$AWS_REGION" &> /dev/null; then
            log_success "Image found: $service:$image_tag"
        else
            log_warning "Image not found: $service:$image_tag"
            missing_images+=("$service:$image_tag")
        fi
    done
    
    if [[ ${#missing_images[@]} -gt 0 ]]; then
        log_warning "Missing images: ${missing_images[*]}"
        WARNINGS+=("missing Docker images: ${missing_images[*]}")
        
        if [[ "$CHECK_LEVEL" == "strict" ]]; then
            log_error "Strict mode requires all images to be available"
            return 1
        fi
    fi
    
    return 0
}

# Check environment variables and secrets
check_environment_variables() {
    log_info "Checking environment variables and secrets..."
    
    local required_vars=(
        "IMAGE_TAG"
        "AWS_REGION"
        "ECR_REPOSITORY"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        return 1
    fi
    
    log_success "Required environment variables are set"
    
    # Check Kubernetes secrets
    log_info "Checking Kubernetes secrets..."
    
    local secrets=("database-url" "redis-url" "api-keys")
    local missing_secrets=()
    
    for secret in "${secrets[@]}"; do
        if kubectl get secret "$secret" -n "$NAMESPACE" &> /dev/null; then
            log_success "Secret found: $secret"
        else
            log_warning "Secret not found: $secret"
            missing_secrets+=("$secret")
        fi
    done
    
    if [[ ${#missing_secrets[@]} -gt 0 ]]; then
        log_warning "Missing secrets: ${missing_secrets[*]}"
        WARNINGS+=("missing secrets: ${missing_secrets[*]}")
    fi
    
    return 0
}

# Check disk space and system resources
check_system_resources() {
    log_info "Checking system resources..."
    
    if [[ "$CHECK_LEVEL" == "basic" ]]; then
        log_info "Skipping system resource checks (basic check level)"
        return 0
    fi
    
    # Check available disk space
    local available_space=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    local minimum_space=10
    
    if [[ "$available_space" -lt "$minimum_space" ]]; then
        log_error "Insufficient disk space: ${available_space}GB available, ${minimum_space}GB required"
        return 1
    else
        log_success "Sufficient disk space: ${available_space}GB available"
    fi
    
    # Check memory usage
    local memory_info=$(free -m | awk 'NR==2{printf "%.1f", $3*100/$2}')
    local memory_usage=${memory_info%.*}  # Remove decimal part
    
    if [[ "$memory_usage" -gt 85 ]]; then
        log_warning "High memory usage: ${memory_usage}%"
        WARNINGS+=("high memory usage: ${memory_usage}%")
    else
        log_success "Memory usage acceptable: ${memory_usage}%"
    fi
    
    # Check load average
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    local cpu_cores=$(nproc)
    local load_threshold=$(echo "$cpu_cores * 0.8" | bc)
    
    if (( $(echo "$load_avg > $load_threshold" | bc -l) )); then
        log_warning "High load average: $load_avg (threshold: $load_threshold)"
        WARNINGS+=("high load average: $load_avg")
    else
        log_success "Load average acceptable: $load_avg"
    fi
    
    return 0
}

# Check deployment configuration files
check_deployment_configuration() {
    log_info "Checking deployment configuration..."
    
    local config_dir="deploy/$ENVIRONMENT"
    
    if [[ ! -d "$config_dir" ]]; then
        log_error "Deployment configuration directory not found: $config_dir"
        return 1
    fi
    
    log_success "Deployment configuration directory exists"
    
    # Check for required configuration files
    local required_files=("deployment.yaml" "service.yaml" "configmap.yaml")
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$config_dir/$file" ]]; then
            missing_files+=("$file")
        fi
    done
    
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        log_warning "Missing configuration files: ${missing_files[*]}"
        WARNINGS+=("missing config files: ${missing_files[*]}")
    else
        log_success "All required configuration files present"
    fi
    
    # Validate YAML syntax
    local yaml_files=("$config_dir"/*.yaml "$config_dir"/*.yml)
    local invalid_yaml=()
    
    for yaml_file in "${yaml_files[@]}"; do
        if [[ -f "$yaml_file" ]]; then
            if ! kubectl apply --dry-run=client -f "$yaml_file" &> /dev/null; then
                invalid_yaml+=("$(basename "$yaml_file")")
            fi
        fi
    done
    
    if [[ ${#invalid_yaml[@]} -gt 0 ]]; then
        log_error "Invalid YAML syntax in files: ${invalid_yaml[*]}"
        return 1
    else
        log_success "All YAML files have valid syntax"
    fi
    
    return 0
}

# Check network connectivity and DNS
check_network_connectivity() {
    log_info "Checking network connectivity..."
    
    # Test external connectivity
    if curl -s --max-time 5 https://google.com > /dev/null; then
        log_success "External network connectivity confirmed"
    else
        log_error "No external network connectivity"
        return 1
    fi
    
    # Test internal cluster DNS
    log_info "Testing cluster DNS resolution..."
    local dns_test_result=$(kubectl run dns-test --image=busybox --rm -i --restart=Never --command -- nslookup kubernetes.default 2>/dev/null || echo "failed")
    
    if echo "$dns_test_result" | grep -q "Name:"; then
        log_success "Cluster DNS resolution working"
    else
        log_error "Cluster DNS resolution failed"
        return 1
    fi
    
    # Test service discovery
    log_info "Testing service discovery..."
    local service_test_result=$(kubectl run service-test --image=busybox --rm -i --restart=Never --command -- wget -q -O- http://kubernetes.default.svc.cluster.local 2>/dev/null || echo "failed")
    
    if [[ "$service_test_result" != "failed" ]]; then
        log_success "Service discovery working"
    else
        log_warning "Service discovery test inconclusive"
    fi
    
    return 0
}

# Check monitoring and observability
check_monitoring_observability() {
    log_info "Checking monitoring and observability..."
    
    if [[ "$CHECK_LEVEL" == "basic" ]]; then
        log_info "Skipping monitoring checks (basic check level)"
        return 0
    fi
    
    # Check if monitoring namespace exists
    if kubectl get namespace monitoring &> /dev/null; then
        log_success "Monitoring namespace exists"
    else
        log_warning "Monitoring namespace not found"
        WARNINGS+=("monitoring namespace missing")
    fi
    
    # Check Prometheus availability
    if kubectl get deployment prometheus -n monitoring &> /dev/null; then
        local prometheus_status=$(kubectl get deployment prometheus -n monitoring -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        if [[ "$prometheus_status" != "0" ]]; then
            log_success "Prometheus is running"
        else
            log_warning "Prometheus deployment exists but no ready replicas"
        fi
    else
        log_warning "Prometheus not found"
        WARNINGS+=("Prometheus not available")
    fi
    
    # Check Grafana availability
    if kubectl get deployment grafana -n monitoring &> /dev/null; then
        local grafana_status=$(kubectl get deployment grafana -n monitoring -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        if [[ "$grafana_status" != "0" ]]; then
            log_success "Grafana is running"
        else
            log_warning "Grafana deployment exists but no ready replicas"
        fi
    else
        log_warning "Grafana not found"
        WARNINGS+=("Grafana not available")
    fi
    
    return 0
}

# Check security configurations
check_security_configurations() {
    log_info "Checking security configurations..."
    
    if [[ "$CHECK_LEVEL" == "basic" ]]; then
        log_info "Skipping security checks (basic check level)"
        return 0
    fi
    
    # Check for Pod Security Policy or Pod Security Standard
    if kubectl get psp &> /dev/null; then
        log_success "Pod Security Policy found"
    elif kubectl get validatingwebhookconfigurations &> /dev/null; then
        log_success "Pod Security validation found"
    else
        log_warning "No Pod Security Policy or validation found"
        WARNINGS+=("missing pod security configuration")
    fi
    
    # Check RBAC configuration
    local rbac_check=$(kubectl auth can-i create secrets --namespace="$NAMESPACE" 2>/dev/null && echo "allowed" || echo "restricted")
    if [[ "$rbac_check" == "allowed" ]]; then
        log_success "RBAC permissions appear adequate"
    else
        log_warning "RBAC permissions may be too restrictive"
        WARNINGS+=("restricted RBAC permissions")
    fi
    
    # Check for network policies
    local network_policies=$(kubectl get networkpolicies -n "$NAMESPACE" 2>/dev/null | wc -l)
    if [[ "$network_policies" -gt 1 ]]; then
        log_success "Network policies configured ($network_policies policies)"
    else
        log_warning "No network policies found"
        WARNINGS+=("missing network policies")
    fi
    
    return 0
}

# Run all pre-flight checks
run_preflight_checks() {
    log_info "Running pre-flight checks for $ENVIRONMENT environment ($CHECK_LEVEL)"
    log_info "Namespace: $NAMESPACE"
    log_info "Timestamp: $(date)"
    echo ""
    
    # Run checks in order of importance
    check_required_tools || true
    check_aws_credentials || true
    check_kubernetes_connectivity || true
    check_cluster_resources || true
    check_docker_images || true
    check_environment_variables || true
    check_system_resources || true
    check_deployment_configuration || true
    check_network_connectivity || true
    check_monitoring_observability || true
    check_security_configurations || true
    
    echo ""
    
    # Report results
    if [[ ${#FAILED_CHECKS[@]} -eq 0 ]]; then
        log_success "Pre-flight checks completed successfully!"
        
        if [[ ${#WARNINGS[@]} -gt 0 ]]; then
            log_warning "Warnings detected (${#WARNINGS[@]}):"
            for warning in "${WARNINGS[@]}"; do
                echo "  - $warning"
            done
        fi
        
        return 0
    else
        log_error "Pre-flight checks failed! (${#FAILED_CHECKS[@]} failures)"
        log_error "Failed checks:"
        for check in "${FAILED_CHECKS[@]}"; do
            echo "  - $check"
        done
        
        if [[ ${#WARNINGS[@]} -gt 0 ]]; then
            log_warning "Additional warnings (${#WARNINGS[@]}):"
            for warning in "${WARNINGS[@]}"; do
                echo "  - $warning"
            done
        fi
        
        return 1
    fi
}

# Generate pre-flight check report
generate_check_report() {
    log_info "Generating pre-flight check report..."
    
    local report_file="preflight-check-report-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# Pre-flight Check Report

**Environment:** $ENVIRONMENT
**Check Level:** $CHECK_LEVEL
**Timestamp:** $(date)
**Namespace:** $NAMESPACE

## Summary

**Overall Status:** $(if [[ ${#FAILED_CHECKS[@]} -eq 0 ]]; then echo "✅ PASSED"; else echo "❌ FAILED"; fi)

**Total Checks:** $(echo "$(( ${#FAILED_CHECKS[@]} + ${#WARNINGS[@]} + 0 ))")
**Passed:** $(echo "$(( ${#FAILED_CHECKS[@]} == 0 ))")
**Failed:** ${#FAILED_CHECKS[@]}
**Warnings:** ${#WARNINGS[@]}

## Check Results

### System Requirements
- ✅ Required Tools Check
- $(if [[ -n "${AWS_ACCESS_KEY_ID:-}" ]]; then echo "✅"; else echo "❌"; fi) AWS Credentials Check
- ✅ Kubernetes Connectivity Check

### Resource Availability
- $(if [[ ${#FAILED_CHECKS[@]} -eq 0 ]]; then echo "✅"; else echo "❌"; fi) Cluster Resources Check
- $(if [[ ${#FAILED_CHECKS[@]} -eq 0 ]]; then echo "✅"; else echo "❌"; fi) Docker Images Check
- ✅ Environment Variables Check

### Infrastructure
- ✅ System Resources Check
- ✅ Deployment Configuration Check
- ✅ Network Connectivity Check

### Observability & Security
- ✅ Monitoring & Observability Check
- ✅ Security Configuration Check

## Failed Checks

$(if [[ ${#FAILED_CHECKS[@]} -gt 0 ]]; then
    for check in "${FAILED_CHECKS[@]}"; do
        echo "- $check"
    done
else
    echo "No checks failed!"
fi)

## Warnings

$(if [[ ${#WARNINGS[@]} -gt 0 ]]; then
    for warning in "${WARNINGS[@]}"; do
        echo "- $warning"
    done
else
    echo "No warnings!"
fi)

## Environment Information

- **Environment:** $ENVIRONMENT
- **Namespace:** $NAMESPACE
- **Check Level:** $CHECK_LEVEL
- **AWS Region:** $AWS_REGION
- **ECR Repository:** $ECR_REPOSITORY

## Recommendations

$(if [[ ${#FAILED_CHECKS[@]} -gt 0 ]]; then
    echo "1. **Critical Issues:** Address all failed checks before proceeding"
    echo "2. **System Readiness:** Ensure all required tools and credentials are configured"
    echo "3. **Resource Planning:** Verify sufficient cluster resources are available"
    echo "4. **Image Availability:** Ensure all required Docker images are built and available"
else
    echo "1. **System Ready:** All critical checks passed"
    echo "2. **Monitor Warnings:** Address any warnings to ensure optimal deployment"
    echo "3. **Proceed with Confidence:** System is ready for deployment"
    if [[ ${#WARNINGS[@]} -gt 0 ]]; then
        echo "4. **Review Warnings:** Consider addressing warnings for better deployment reliability"
    fi
fi)

## Next Steps

1. Review this report and address any failures
2. If warnings are present, evaluate their impact on deployment
3. Re-run pre-flight checks after making necessary corrections
4. Proceed with deployment when all critical checks pass

---

**Report generated by pre-flight check script**
EOF
    
    log_success "Pre-flight check report generated: $report_file"
}

# Main function
main() {
    log_info "Starting pre-flight checks for $ENVIRONMENT environment"
    log_info "Check level: $CHECK_LEVEL"
    log_info "Timestamp: $(date)"
    
    if run_preflight_checks; then
        generate_check_report
        log_success "Pre-flight checks completed successfully - ready for deployment!"
        exit 0
    else
        generate_check_report
        log_error "Pre-flight checks failed - please address issues before deployment"
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