#!/bin/bash

# ============================================
# Production Deployment Validation Script
# Insurance Lead Generation Platform - Phase 19.2
# ============================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="production"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="deployment-validation-${TIMESTAMP}.log"
FAILED_CHECKS=0
TOTAL_CHECKS=0

# Logging function
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_info() {
    log "${BLUE}[INFO]${NC} $1"
}

log_success() {
    log "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    log "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    log "${RED}[ERROR]${NC} $1"
}

# Counter functions
check_passed() {
    ((TOTAL_CHECKS++))
    log_success "✓ $1"
}

check_failed() {
    ((TOTAL_CHECKS++))
    ((FAILED_CHECKS++))
    log_error "✗ $1"
}

check_warning() {
    ((TOTAL_CHECKS++))
    log_warning "⚠ $1"
}

# Header
log_info "Starting Production Deployment Validation"
log_info "Timestamp: $TIMESTAMP"
log_info "Namespace: $NAMESPACE"
log_info "Log file: $LOG_FILE"
echo ""

# 1. Infrastructure Validation
log_info "=== 1. INFRASTRUCTURE VALIDATION ==="

# Check EKS cluster connectivity
log_info "Checking EKS cluster connectivity..."
if kubectl cluster-info --context "$(kubectl config current-context)" &>/dev/null; then
    check_passed "EKS cluster connectivity"
else
    check_failed "EKS cluster connectivity"
fi

# Check node availability
log_info "Checking node availability..."
NODE_COUNT=$(kubectl get nodes --no-headers 2>/dev/null | wc -l)
if [[ $NODE_COUNT -gt 0 ]]; then
    check_passed "Node availability ($NODE_COUNT nodes)"
else
    check_failed "Node availability"
fi

# Check namespace
log_info "Checking production namespace..."
if kubectl get namespace "$NAMESPACE" &>/dev/null; then
    check_passed "Production namespace exists"
else
    check_warning "Production namespace does not exist (will be created)"
fi

# 2. Kubernetes Resources Validation
log_info "=== 2. KUBERNETES RESOURCES VALIDATION ==="

# Check deployments
log_info "Checking deployments..."
DEPLOYMENTS=$(kubectl get deployments -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
if [[ $DEPLOYMENTS -gt 0 ]]; then
    check_passed "Deployments found ($DEPLOYMENTS)"
else
    check_warning "No deployments found"
fi

# Check services
log_info "Checking services..."
SERVICES=$(kubectl get services -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
if [[ $SERVICES -gt 0 ]]; then
    check_passed "Services found ($SERVICES)"
else
    check_warning "No services found"
fi

# Check ingress
log_info "Checking ingress..."
if kubectl get ingress -n "$NAMESPACE" &>/dev/null; then
    check_passed "Ingress configured"
else
    check_warning "No ingress configured"
fi

# Check secrets
log_info "Checking secrets..."
SECRETS=$(kubectl get secrets -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
if [[ $SECRETS -gt 0 ]]; then
    check_passed "Secrets found ($SECRETS)"
else
    check_warning "No secrets found"
fi

# Check configmaps
log_info "Checking configmaps..."
CONFIGMAPS=$(kubectl get configmaps -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
if [[ $CONFIGMAPS -gt 0 ]]; then
    check_passed "ConfigMaps found ($CONFIGMAPS)"
else
    check_warning "No ConfigMaps found"
fi

# 3. Pod Health Validation
log_info "=== 3. POD HEALTH VALIDATION ==="

# Check pod status
log_info "Checking pod status..."
POD_COUNT=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
RUNNING_PODS=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)

if [[ $POD_COUNT -eq $RUNNING_PODS ]] && [[ $POD_COUNT -gt 0 ]]; then
    check_passed "All pods running ($RUNNING_PODS/$POD_COUNT)"
else
    check_failed "Not all pods running ($RUNNING_PODS/$POD_COUNT)"
fi

# Check pod restarts
log_info "Checking for excessive pod restarts..."
RESTART_COUNT=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | awk '{sum+=$4} END {print sum}')
if [[ $RESTART_COUNT -eq 0 ]]; then
    check_passed "No pod restarts detected"
elif [[ $RESTART_COUNT -lt 10 ]]; then
    check_warning "Low pod restarts detected ($RESTART_COUNT)"
else
    check_failed "Excessive pod restarts detected ($RESTART_COUNT)"
fi

# Check readiness
log_info "Checking pod readiness..."
NOT_READY=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.conditions.status=false --no-headers 2>/dev/null | grep -c "False.*Ready" || echo "0")
if [[ $NOT_READY -eq 0 ]]; then
    check_passed "All pods ready"
else
    check_warning "$NOT_READY pods not ready"
fi

# 4. Service Health Validation
log_info "=== 4. SERVICE HEALTH VALIDATION ==="

# Check service endpoints
log_info "Checking service endpoints..."
for service in api-service data-service orchestrator-service backend-service frontend-service; do
    if kubectl get service "$service" -n "$NAMESPACE" &>/dev/null; then
        ENDPOINTS=$(kubectl get endpoints "$service" -n "$NAMESPACE" -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null | wc -w)
        if [[ $ENDPOINTS -gt 0 ]]; then
            check_passed "$service has endpoints ($ENDPOINTS)"
        else
            check_warning "$service has no endpoints"
        fi
    else
        check_warning "$service not found"
    fi
done

# Check load balancer
log_info "Checking load balancer..."
LB_SERVICE=$(kubectl get service -n "$NAMESPACE" --field-selector=status.loadBalancer.ingress --no-headers 2>/dev/null | wc -l)
if [[ $LB_SERVICE -gt 0 ]]; then
    check_passed "Load balancer configured"
else
    check_warning "No load balancer configured"
fi

# 5. Network Security Validation
log_info "=== 5. NETWORK SECURITY VALIDATION ==="

# Check network policies
log_info "Checking network policies..."
NETWORK_POLICIES=$(kubectl get networkpolicies -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
if [[ $NETWORK_POLICIES -gt 0 ]]; then
    check_passed "Network policies configured ($NETWORK_POLICIES)"
else
    check_warning "No network policies configured"
fi

# Check RBAC
log_info "Checking RBAC configuration..."
RBAC_COUNT=$(kubectl get roles,rolebindings,clusterroles,clusterrolebindings -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
if [[ $RBAC_COUNT -gt 0 ]]; then
    check_passed "RBAC configured ($RBAC_COUNT)"
else
    check_warning "No RBAC configured"
fi

# Check service accounts
log_info "Checking service accounts..."
SA_COUNT=$(kubectl get serviceaccounts -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
if [[ $SA_COUNT -gt 0 ]]; then
    check_passed "Service accounts configured ($SA_COUNT)"
else
    check_warning "No service accounts configured"
fi

# 6. Security Validation
log_info "=== 6. SECURITY VALIDATION ==="

# Check pod security context
log_info "Checking pod security contexts..."
SECURE_PODS=$(kubectl get pods -n "$NAMESPACE" -o jsonpath='{range .items[*]}{.spec.securityContext.runAsNonRoot}{" "}{.spec.securityContext.runAsUser}{"\n"}{end}' 2>/dev/null | grep -c "true" || echo "0")
if [[ $SECURE_PODS -gt 0 ]]; then
    check_passed "Pod security contexts configured ($SECURE_PODS)"
else
    check_warning "No pod security contexts configured"
fi

# Check for privileged pods
log_info "Checking for privileged pods..."
PRIVILEGED_PODS=$(kubectl get pods -n "$NAMESPACE" -o jsonpath='{range .items[*]}{.spec.containers[*].securityContext.privileged}{" "}{.spec.initContainers[*].securityContext.privileged}{"\n"}{end}' 2>/dev/null | grep -c "true" || echo "0")
if [[ $PRIVILEGED_PODS -eq 0 ]]; then
    check_passed "No privileged pods found"
else
    check_warning "$PRIVILEGED_PODS privileged pods found"
fi

# Check secrets encryption
log_info "Checking secrets encryption..."
ENCRYPTED_SECRETS=$(kubectl get secrets -n "$NAMESPACE" -o jsonpath='{range .items[*]}{.metadata.annotations}{"\n"}{end}' 2>/dev/null | grep -c "encryption" || echo "0")
if [[ $ENCRYPTED_SECRETS -gt 0 ]]; then
    check_passed "Encrypted secrets found"
else
    check_warning "No encrypted secrets detected"
fi

# 7. Monitoring Validation
log_info "=== 7. MONITORING VALIDATION ==="

# Check Prometheus service
log_info "Checking Prometheus service..."
if kubectl get service prometheus-server -n monitoring &>/dev/null; then
    check_passed "Prometheus service found"
else
    check_warning "Prometheus service not found"
fi

# Check Grafana service
log_info "Checking Grafana service..."
if kubectl get service grafana -n monitoring &>/dev/null; then
    check_passed "Grafana service found"
else
    check_warning "Grafana service not found"
fi

# Check ServiceMonitor resources
log_info "Checking ServiceMonitor resources..."
SM_COUNT=$(kubectl get servicemonitors -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
if [[ $SM_COUNT -gt 0 ]]; then
    check_passed "ServiceMonitors configured ($SM_COUNT)"
else
    check_warning "No ServiceMonitors configured"
fi

# Check AlertManager
log_info "Checking AlertManager..."
if kubectl get service alertmanager -n monitoring &>/dev/null; then
    check_passed "AlertManager service found"
else
    check_warning "AlertManager service not found"
fi

# 8. Resource Usage Validation
log_info "=== 8. RESOURCE USAGE VALIDATION ==="

# Check resource requests and limits
log_info "Checking resource requests and limits..."
PODS_WITH_RESOURCES=$(kubectl get pods -n "$NAMESPACE" -o jsonpath='{range .items[*]}{.spec.containers[*].resources}{"\n"}{end}' 2>/dev/null | grep -c "requests" || echo "0")
if [[ $PODS_WITH_RESOURCES -gt 0 ]]; then
    check_passed "Resource limits configured ($PODS_WITH_RESOURCES)"
else
    check_warning "No resource limits configured"
fi

# Check HPA
log_info "Checking Horizontal Pod Autoscaler..."
HPA_COUNT=$(kubectl get hpa -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
if [[ $HPA_COUNT -gt 0 ]]; then
    check_passed "HPA configured ($HPA_COUNT)"
else
    check_warning "No HPA configured"
fi

# Check PDB
log_info "Checking PodDisruptionBudget..."
PDB_COUNT=$(kubectl get pdb -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
if [[ $PDB_COUNT -gt 0 ]]; then
    check_passed "PodDisruptionBudget configured ($PDB_COUNT)"
else
    check_warning "No PodDisruptionBudget configured"
fi

# 9. Database Connectivity Validation
log_info "=== 9. DATABASE CONNECTIVITY VALIDATION ==="

# Check database connection (if possible)
log_info "Testing database connectivity..."
if kubectl get pods -n "$NAMESPACE" | grep -q "data-service"; then
    if kubectl exec -n "$NAMESPACE" deployment/data-service -- npm run db:test &>/dev/null; then
        check_passed "Database connectivity test passed"
    else
        check_warning "Database connectivity test failed"
    fi
else
    check_warning "Data service not found for database test"
fi

# Check Redis connectivity
log_info "Testing Redis connectivity..."
if kubectl get pods -n "$NAMESPACE" | grep -q "api-service"; then
    if kubectl exec -n "$NAMESPACE" deployment/api -- redis-cli ping &>/dev/null; then
        check_passed "Redis connectivity test passed"
    else
        check_warning "Redis connectivity test failed"
    fi
else
    check_warning "API service not found for Redis test"
fi

# 10. SSL/TLS Validation
log_info "=== 10. SSL/TLS VALIDATION ==="

# Check certificates
log_info "Checking SSL certificates..."
CERT_COUNT=$(kubectl get certificates -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
if [[ $CERT_COUNT -gt 0 ]]; then
    check_passed "SSL certificates configured ($CERT_COUNT)"
    
    # Check certificate status
    for cert in $(kubectl get certificates -n "$NAMESPACE" -o name); do
        if kubectl get "$cert" -n "$NAMESPACE" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' | grep -q "True"; then
            check_passed "Certificate $(basename "$cert") is ready"
        else
            check_warning "Certificate $(basename "$cert") is not ready"
        fi
    done
else
    check_warning "No SSL certificates configured"
fi

# 11. DNS Resolution Validation
log_info "=== 11. DNS RESOLUTION VALIDATION ==="

# Test DNS resolution
log_info "Testing DNS resolution..."
if kubectl exec -n "$NAMESPACE" deployment/api -- nslookup kubernetes.default &>/dev/null; then
    check_passed "DNS resolution working"
else
    check_warning "DNS resolution test failed"
fi

# Test external DNS
log_info "Testing external DNS resolution..."
if kubectl exec -n "$NAMESPACE" deployment/api -- nslookup google.com &>/dev/null; then
    check_passed "External DNS resolution working"
else
    check_warning "External DNS resolution test failed"
fi

# 12. Performance Validation
log_info "=== 12. PERFORMANCE VALIDATION ==="

# Check response times
log_info "Testing API response times..."
API_RESPONSE=$(curl -s -w "%{time_total}" -o /dev/null "http://api-service.$NAMESPACE.svc.cluster.local:3000/health" || echo "999")
if [[ $(echo "$API_RESPONSE < 1.0" | bc -l) -eq 1 ]]; then
    check_passed "API response time acceptable (${API_RESPONSE}s)"
else
    check_warning "API response time slow (${API_RESPONSE}s)"
fi

# Check memory usage
log_info "Checking memory usage..."
TOTAL_MEMORY=$(kubectl top nodes --no-headers 2>/dev/null | awk '{sum+=$3} END {print sum}' || echo "0")
if [[ $TOTAL_MEMORY -gt 0 ]]; then
    check_passed "Memory usage monitoring working (${TOTAL_MEMORY}Mi total)"
else
    check_warning "Memory usage monitoring not working"
fi

# Final Report
log_info "=== DEPLOYMENT VALIDATION SUMMARY ==="
log_info "Total checks performed: $TOTAL_CHECKS"
log_info "Failed checks: $FAILED_CHECKS"
log_info "Success rate: $(( (TOTAL_CHECKS - FAILED_CHECKS) * 100 / TOTAL_CHECKS ))%"

if [[ $FAILED_CHECKS -eq 0 ]]; then
    log_success "🎉 ALL VALIDATION CHECKS PASSED!"
    exit 0
elif [[ $FAILED_CHECKS -lt 5 ]]; then
    log_warning "⚠️  Some validation checks failed, but deployment may still be functional"
    exit 1
else
    log_error "❌ Multiple validation checks failed. Review required before proceeding to production."
    exit 2
fi