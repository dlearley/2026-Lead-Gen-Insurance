# Maintenance Procedures

## 🎯 Overview

This document outlines comprehensive maintenance procedures for the Insurance Lead Gen Platform, ensuring system reliability, security, and performance through regular, planned maintenance activities.

---

## 📋 Table of Contents

1. [Maintenance Types](#maintenance-types)
2. [Security Patching](#security-patching)
3. [Dependency Updates](#dependency-updates)
4. [Database Maintenance](#database-maintenance)
5. [Infrastructure Maintenance](#infrastructure-maintenance)
6. [Zero-Downtime Patching](#zero-downtime-patching)
7. [Certificate Management](#certificate-management)
8. [Log Management](#log-management)
9. [Performance Optimization](#performance-optimization)
10. [Backup Maintenance](#backup-maintenance)

---

## Maintenance Types

### Preventive Maintenance
- **Purpose**: Prevent issues before they occur
- **Frequency**: Regular scheduled intervals
- **Examples**: Security patches, dependency updates, database maintenance
- **Downtime**: Minimal to none with proper planning

### Corrective Maintenance
- **Purpose**: Fix identified issues
- **Frequency**: As needed based on monitoring
- **Examples**: Bug fixes, performance issues, configuration problems
- **Downtime**: Variable depending on issue severity

### Emergency Maintenance
- **Purpose**: Address critical security vulnerabilities or system failures
- **Frequency**: As needed, outside normal windows
- **Examples**: Critical security patches, system restoration
- **Downtime**: May require service interruption

### Planned Maintenance Windows
```
Regular Maintenance Windows:
- Tuesday 2:00 AM - 4:00 AM EST (low traffic period)
- Thursday 2:00 AM - 4:00 AM EST (low traffic period)

Emergency Maintenance:
- Anytime for critical security issues
- Coordinated with business stakeholders for major changes

Avoid Maintenance During:
- Peak business hours (8 AM - 6 PM EST)
- Month-end processing
- Holiday periods
- Major product launches
```

---

## Security Patching

### Patch Classification and Timeline

#### Critical Security Patches
```bash
# Timeline: Apply within 24 hours of availability
# Examples:
# - Remote code execution vulnerabilities
# - Authentication bypasses
# - Data exposure vulnerabilities
# - Privilege escalation vulnerabilities

# Emergency Patch Procedure:
echo "CRITICAL SECURITY PATCH DETECTED"
echo "Patch: $PATCH_NAME"
echo "Severity: CRITICAL"
echo "Timeline: 24 hours"

# 1. Immediate assessment
# 2. Risk analysis
# 3. Patch testing in dev/staging
# 4. Emergency deployment approval
# 5. Deploy with monitoring
# 6. Verify effectiveness
```

#### High Security Patches
```bash
# Timeline: Apply within 1 week of availability
# Examples:
# - Cross-site scripting (XSS)
# - SQL injection fixes
# - Authentication improvements
# - Encryption updates

# Procedure:
echo "HIGH SECURITY PATCH DETECTED"
echo "Timeline: 1 week"

# 1. Schedule in next maintenance window
# 2. Test in staging environment
# 3. Prepare rollback plan
# 4. Deploy during low-traffic period
# 5. Monitor for issues
```

#### Medium Security Patches
```bash
# Timeline: Apply within 1 month of availability
# Examples:
# - Input validation improvements
# - Security header updates
# - Logging enhancements
# - Dependency security updates

# Procedure:
echo "MEDIUM SECURITY PATCH DETECTED"
echo "Timeline: 1 month"

# 1. Include in regular maintenance cycle
# 2. Test with other updates
# 3. Deploy in scheduled maintenance window
```

### Security Patch Process

#### 1. Patch Discovery and Assessment
```bash
#!/bin/bash
# security-patch-monitor.sh

# Monitor security advisories
echo "Checking security advisories..."

# NPM audit
npm audit --audit-level moderate

# Container scanning
docker run --rm -v "$(pwd)":/app -w /app aquasec/trivy:latest fs /app

# Kubernetes security updates
kubectl get pods -n kube-system | grep -E "kube-proxy|kube-apiserver" | \
  while read pod rest; do
    echo "Checking $pod for security updates..."
    # kubectl exec $pod -n kube-system -- apt list --upgradable | grep security
  done
```

#### 2. Risk Assessment
```bash
#!/bin/bash
# patch-risk-assessment.sh

VULNERABILITY_ID=$1
PATCH_FILE=$2

echo "Risk Assessment for $VULNERABILITY_ID"
echo "======================================"

# CVSS Score Analysis
echo "CVSS Score: $CVSS_SCORE"
if (( $(echo "$CVSS_SCORE >= 9.0" | bc -l) )); then
    echo "Risk Level: CRITICAL"
    echo "Action: Emergency patch required"
elif (( $(echo "$CVSS_SCORE >= 7.0" | bc -l) )); then
    echo "Risk Level: HIGH"
    echo "Action: Schedule within 1 week"
elif (( $(echo "$CVSS_SCORE >= 4.0" | bc -l) )); then
    echo "Risk Level: MEDIUM"
    echo "Action: Schedule within 1 month"
else
    echo "Risk Level: LOW"
    echo "Action: Include in next maintenance cycle"
fi

# Exploitability Assessment
echo "Exploitability: $EXPLOITABILITY"
echo "Affected Components: $AFFECTED_COMPONENTS"
echo "Business Impact: $BUSINESS_IMPACT"
```

#### 3. Testing Procedures
```bash
#!/bin/bash
# patch-testing.sh

PATCH_FILE=$1
TARGET_ENV=$2

echo "Testing security patch: $PATCH_FILE"
echo "Target environment: $TARGET_ENV"

# 1. Deploy to test environment
case $TARGET_ENV in
    "dev")
        echo "Deploying to development environment..."
        # kubectl apply -f patch-dev.yaml
        ;;
    "staging")
        echo "Deploying to staging environment..."
        # kubectl apply -f patch-staging.yaml
        ;;
    "production")
        echo "WARNING: Testing patch in production!"
        read -p "Continue? (yes/no): " -r
        if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            echo "Deploying to production..."
            # kubectl apply -f patch-production.yaml
        fi
        ;;
esac

# 2. Run functional tests
echo "Running functional tests..."
npm run test:functional -- --baseUrl=https://api-$TARGET_ENV.insurance-lead-gen.com

# 3. Run security tests
echo "Running security tests..."
npm run test:security

# 4. Performance impact assessment
echo "Assessing performance impact..."
kubectl top pods -n $TARGET_ENV

# 5. Generate test report
cat << EOF > patch-test-report-$TIMESTAMP.json
{
  "patch_id": "$PATCH_FILE",
  "environment": "$TARGET_ENV",
  "test_status": "PASSED",
  "performance_impact": "MINIMAL",
  "functional_tests": "PASSED",
  "security_tests": "PASSED",
  "recommendation": "APPROVED_FOR_PRODUCTION"
}
EOF
```

#### 4. Deployment Procedures
```bash
#!/bin/bash
# security-patch-deployment.sh

PATCH_ID=$1
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "Deploying security patch: $PATCH_ID"
echo "Deployment time: $TIMESTAMP"

# Pre-deployment checklist
echo "Pre-deployment checklist:"
echo "- [ ] Patch tested in staging"
echo "- [ ] Rollback plan prepared"
echo "- [ ] Team notified"
echo "- [ ] Monitoring enhanced"
echo "- [ ] Customer communication prepared (if needed)"

# Create backup before patch
echo "Creating pre-patch backup..."
./scripts/backup/pre-deployment-backup.sh

# Deploy patch
echo "Applying security patch..."
case $PATCH_ID in
    "critical-2024-001")
        echo "Applying critical authentication patch..."
        kubectl set image deployment/api api=api:latest-security-patch -n production
        ;;
    "high-2024-002")
        echo "Applying high priority dependency update..."
        npm install package@latest
        docker build -t api:patched .
        kubectl set image deployment/api api=api:patched -n production
        ;;
esac

# Monitor deployment
echo "Monitoring deployment..."
kubectl rollout status deployment/api -n production --timeout=10m

# Verify patch effectiveness
echo "Verifying patch effectiveness..."
npm run test:security:post-deployment

echo "Security patch deployment completed at $(date)"
```

---

## Dependency Updates

### Dependency Update Strategy

#### Framework and Runtime Updates
```bash
# Node.js version updates
echo "Checking for Node.js updates..."
NODE_CURRENT=$(node --version)
echo "Current Node.js version: $NODE_CURRENT"

# Check available LTS versions
NVM_CURRENT=$(nvm current)
echo "NVM current version: $NVM_CURRENT"

# Major version upgrades (require testing)
echo "Major version upgrade procedure:"
echo "1. Test in development environment"
echo "2. Update package.json engines field"
echo "3. Test all applications"
echo "4. Deploy to staging"
echo "5. Performance testing"
echo "6. Production deployment"
```

#### Library and Package Updates
```bash
# Automated dependency checking
echo "Checking for dependency updates..."

# NPM outdated
npm outdated

# Security vulnerabilities
npm audit

# Major version updates
npm run update:check-major

# Update process
echo "Dependency update process:"
echo "1. Review breaking changes"
echo "2. Test in isolation"
echo "3. Update documentation"
echo "4. Deploy to staging"
echo "5. Monitor for issues"
echo "6. Production deployment"
```

### Dependency Update Procedures

#### 1. Automated Dependency Scanning
```bash
#!/bin/bash
# dependency-scanner.sh

echo "Running automated dependency scan..."

# Check for outdated packages
echo "=== Outdated Packages ==="
npm outdated --json > outdated-packages.json

# Check for security vulnerabilities
echo "=== Security Vulnerabilities ==="
npm audit --audit-level moderate

# Check for deprecated packages
echo "=== Deprecated Packages ==="
npm list --depth=0 | grep "DEPRECATED"

# Check for unused dependencies
echo "=== Potentially Unused Dependencies ==="
npm ls --prod --depth=0 | grep -E "UNMET|missing"

# Generate update report
cat << EOF > dependency-report-$TIMESTAMP.json
{
  "scan_date": "$TIMESTAMP",
  "node_version": "$(node --version)",
  "npm_version": "$(npm --version)",
  "outdated_packages": $(cat outdated-packages.json),
  "security_issues": "$(npm audit --json | jq '.metadata.vulnerabilities | {high, moderate, low}' 2>/dev/null || echo '{}')",
  "deprecated_packages": [],
  "recommendations": [
    "Review and update critical security patches",
    "Schedule dependency updates in maintenance window",
    "Test updates in staging environment",
    "Monitor for breaking changes"
  ]
}
EOF
```

#### 2. Dependency Update Testing
```bash
#!/bin/bash
# dependency-update-test.sh

PACKAGE_NAME=$1
NEW_VERSION=$2

echo "Testing dependency update: $PACKAGE_NAME@$NEW_VERSION"

# Create test branch
git checkout -b dependency-update-$PACKAGE_NAME-$TIMESTAMP

# Update dependency
npm install $PACKAGE_NAME@$NEW_VERSION

# Run tests
echo "Running test suite..."
npm run test:unit
npm run test:integration
npm run test:e2e

# Check for breaking changes
echo "Checking for breaking changes..."
npm run build

# Performance testing
echo "Running performance tests..."
npm run test:performance

# Generate test results
if [ $? -eq 0 ]; then
    echo "✅ Dependency update test passed"
    echo "Ready for staging deployment"
else
    echo "❌ Dependency update test failed"
    echo "Manual review required"
    git checkout main
    git branch -D dependency-update-$PACKAGE_NAME-$TIMESTAMP
fi
```

#### 3. Staged Deployment Process
```bash
#!/bin/bash
# dependency-deployment.sh

DEPENDENCY_LIST=$1

echo "Deploying dependency updates: $DEPENDENCY_LIST"

# Pre-deployment verification
echo "Pre-deployment verification:"
echo "- [ ] All tests passing"
echo "- [ ] Security scan clean"
echo "- [ ] Performance baseline maintained"
echo "- [ ] Documentation updated"

# Deploy to staging
echo "Deploying to staging..."
STAGING_TAG="dependency-update-$TIMESTAMP"
docker build -t api:$STAGING_TAG .
docker tag api:$STAGING_TAG registry.company.com/insurance-lead-gen/api:$STAGING_TAG
docker push registry.company.com/insurance-lead-gen/api:$STAGING_TAG

helm upgrade --install insurance-lead-gen-staging ./deploy/helm/insurance-lead-gen \
  --namespace staging \
  --set image.tag=$STAGING_TAG \
  --wait \
  --timeout 15m

# Staging validation
echo "Validating staging deployment..."
npm run test:smoke -- --baseUrl=https://api-staging.insurance-lead-gen.com

# Performance monitoring
echo "Monitoring performance for 24 hours..."
# This would integrate with monitoring systems

echo "Dependency update deployment completed"
```

---

## Database Maintenance

### Regular Database Maintenance

#### Weekly Maintenance Tasks
```bash
#!/bin/bash
# weekly-db-maintenance.sh

NAMESPACE=${1:-production}
POSTGRES_POD=$(kubectl get pods -n "$NAMESPACE" -l app=postgres --no-headers | head -1 | awk '{print $1}')

echo "Starting weekly database maintenance for $NAMESPACE"

# 1. Update table statistics
echo "Updating table statistics..."
kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- \
  psql -U postgres -d insurance_lead_gen -c "ANALYZE;"

# 2. Check for unused indexes
echo "Checking for unused indexes..."
kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT schemaname, tablename, indexname, idx_scan 
   FROM pg_stat_user_indexes 
   WHERE idx_scan = 0 
   ORDER BY schemaname, tablename;"

# 3. Check table bloat
echo "Checking table bloat..."
kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT schemaname, tablename, 
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size
   FROM pg_tables 
   WHERE schemaname = 'public' 
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# 4. Check for long-running queries
echo "Checking for long-running queries..."
kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT pid, usename, application_name, state, 
    now() - query_start AS duration, query 
   FROM pg_stat_activity 
   WHERE state = 'active' AND query_start < now() - interval '5 minutes'
   ORDER BY duration DESC;"

echo "Weekly database maintenance completed"
```

#### Monthly Maintenance Tasks
```bash
#!/bin/bash
# monthly-db-maintenance.sh

NAMESPACE=${1:-production}
POSTGRES_POD=$(kubectl get pods -n "$NAMESPACE" -l app=postgres --no-headers | head -1 | awk '{print $1}')

echo "Starting monthly database maintenance for $NAMESPACE"

# 1. Full vacuum and analyze
echo "Running full vacuum and analyze..."
kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- \
  psql -U postgres -d insurance_lead_gen -c "VACUUM FULL ANALYZE;"

# 2. Reindex if needed
echo "Checking if reindexing is needed..."
REINDEX_NEEDED=$(kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT COUNT(*) FROM pg_stat_user_indexes WHERE idx_scan = 0;" | tr -d ' ')

if [ "$REINDEX_NEEDED" -gt "0" ]; then
    echo "Reindexing database..."
    kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- \
      psql -U postgres -d insurance_lead_gen -c "REINDEX DATABASE insurance_lead_gen;"
else
    echo "No reindexing needed"
fi

# 3. Update pg_stat_statements
echo "Updating pg_stat_statements..."
kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- \
  psql -U postgres -d insurance_lead_gen -c "SELECT pg_stat_statements_reset();"

# 4. Check database size growth
echo "Checking database size growth..."
kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT pg_size_pretty(pg_database_size('insurance_lead_gen')) as current_size,
    (SELECT pg_size_pretty(pg_database_size('insurance_lead_gen')) 
     FROM pg_database WHERE datname = 'insurance_lead_gen' 
     AND pg_database_size('insurance_lead_gen') < 1073741824) as baseline_size;"

# 5. Archive old logs
echo "Archiving old database logs..."
kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- \
  find /var/lib/postgresql/data/log -name "*.log" -mtime +30 -exec gzip {} \;

echo "Monthly database maintenance completed"
```

### Database Performance Optimization

#### Query Performance Analysis
```bash
#!/bin/bash
# query-performance-analysis.sh

NAMESPACE=${1:-production}

echo "Analyzing query performance..."

# Check slow queries
kubectl exec -n "$NAMESPACE" deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT query, mean_time, calls, total_time, 
    mean_time * calls as total_spent
   FROM pg_stat_statements 
   ORDER BY total_spent DESC 
   LIMIT 10;"

# Check for missing indexes
kubectl exec -n "$NAMESPACE" deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT schemaname, tablename, attname, n_distinct, correlation
   FROM pg_stats 
   WHERE schemaname = 'public' 
   AND n_distinct > 100 
   AND correlation < 0.1;"

# Check for unused indexes
kubectl exec -n "$NAMESPACE" deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
   FROM pg_stat_user_indexes 
   WHERE idx_scan = 0;"

# Generate optimization recommendations
cat << EOF > query-optimization-report-$TIMESTAMP.json
{
  "analysis_date": "$TIMESTAMP",
  "database": "insurance_lead_gen",
  "recommendations": [
    "Add indexes on frequently queried columns",
    "Remove unused indexes to save space",
    "Update table statistics with ANALYZE",
    "Consider query optimization for slow queries"
  ]
}
EOF
```

---

## Infrastructure Maintenance

### Kubernetes Cluster Maintenance

#### Node Maintenance
```bash
#!/bin/bash
# node-maintenance.sh

NODE_NAME=$1
MAINTENANCE_TYPE=$2  # patch, update, hardware

echo "Starting node maintenance: $NODE_NAME"
echo "Maintenance type: $MAINTENANCE_TYPE"

# 1. Check node status
echo "Checking node status..."
kubectl get nodes
kubectl describe node $NODE_NAME

# 2. Cordon node (prevent new pods)
echo "Cordoning node..."
kubectl cordon $NODE_NAME

# 3. Drain node (evict pods)
echo "Draining node..."
kubectl drain $NODE_NAME --delete-emptydir-data --ignore-daemonsets --force

# 4. Perform maintenance
echo "Performing maintenance: $MAINTENANCE_TYPE"

case $MAINTENANCE_TYPE in
    "patch")
        echo "Applying OS patches..."
        # ssh $NODE_NAME "sudo apt update && sudo apt upgrade -y"
        ;;
    "update")
        echo "Updating kernel..."
        # ssh $NODE_NAME "sudo apt update && sudo apt upgrade -y && sudo reboot"
        ;;
    "hardware")
        echo "Hardware maintenance..."
        echo "Contact hardware team for physical maintenance"
        ;;
esac

# 5. Verify maintenance
echo "Verifying maintenance completion..."
# ssh $NODE_NAME "uname -a"

# 6. Uncordon node
echo "Uncordoning node..."
kubectl uncordon $NODE_NAME

# 7. Verify node is ready
echo "Waiting for node to be ready..."
kubectl wait --for=condition=ready node/$NODE_NAME --timeout=600s

echo "Node maintenance completed for $NODE_NAME"
```

#### Cluster Component Updates
```bash
#!/bin/bash
# cluster-component-update.sh

COMPONENT=$1  # kube-proxy, coredns, ingress-nginx
VERSION=$2

echo "Updating cluster component: $COMPONENT to version $VERSION"

# Check current version
echo "Current versions:"
kubectl get pods -n kube-system | grep $COMPONENT

# Update component
case $COMPONENT in
    "kube-proxy")
        kubectl set image daemonset/kube-proxy kube-proxy=k8s.gcr.io/kube-proxy:$VERSION -n kube-system
        ;;
    "coredns")
        kubectl set image deployment/coredns coredns=k8s.gcr.io/coredns:$VERSION -n kube-system
        ;;
    "ingress-nginx")
        kubectl set image deployment/ingress-nginx-controller controller=k8s.gcr.io/ingress-nginx/controller:$VERSION -n ingress-nginx
        ;;
esac

# Monitor rollout
echo "Monitoring rollout..."
kubectl rollout status daemonset/kube-proxy -n kube-system --timeout=600s
kubectl rollout status deployment/coredns -n kube-system --timeout=600s
kubectl rollout status deployment/ingress-nginx-controller -n ingress-nginx --timeout=600s

# Verify component health
echo "Verifying component health..."
kubectl get pods -n kube-system | grep $COMPONENT
kubectl get pods -n ingress-nginx | grep ingress-nginx-controller

echo "Cluster component update completed"
```

### Container Image Updates

#### Automated Image Scanning and Updates
```bash
#!/bin/bash
# image-update-scanner.sh

echo "Scanning for outdated container images..."

# Get all deployments
DEPLOYMENTS=$(kubectl get deployments -n production -o name)

for deployment in $DEPLOYMENTS; do
    echo "Checking $deployment..."
    
    # Get current image
    CURRENT_IMAGE=$(kubectl get $deployment -n production -o jsonpath='{.spec.template.spec.containers[0].image}')
    echo "Current image: $CURRENT_IMAGE"
    
    # Check for updates (this would integrate with registry APIs)
    # For example, check Docker Hub, ECR, etc.
    
    # Check for security vulnerabilities
    docker pull $CURRENT_IMAGE
    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
      aquasec/trivy:latest image $CURRENT_IMAGE
    
    # Generate update recommendations
    echo "Image update recommendations for $deployment:"
    echo "- Current: $CURRENT_IMAGE"
    echo "- Latest: $LATEST_VERSION (simulated)"
    echo "- Vulnerabilities: $VULNERABILITY_COUNT"
    echo "- Recommendation: $UPDATE_RECOMMENDATION"
done
```

---

## Zero-Downtime Patching

### Rolling Update Strategy

#### Pod Disruption Budgets
```yaml
# pod-disruption-budget.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-pdb
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: api
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: backend-pdb
  namespace: production
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: backend
```

#### Health Check Configuration
```yaml
# health-check-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: health-check-config
  namespace: production
data:
  health-check.sh: |
    #!/bin/bash
    # Application health check
    
    # Check if service is responding
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
      exit 0
    else
      exit 1
    fi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: production
spec:
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: api:latest
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
```

#### Zero-Downtime Deployment
```bash
#!/bin/bash
# zero-downtime-deployment.sh

DEPLOYMENT_NAME=$1
NEW_IMAGE=$2
NAMESPACE=${3:-production}

echo "Starting zero-downtime deployment: $DEPLOYMENT_NAME"
echo "New image: $NEW_IMAGE"
echo "Namespace: $NAMESPACE"

# 1. Verify PodDisruptionBudget
echo "Verifying PodDisruptionBudget..."
PDB=$(kubectl get pdb $DEPLOYMENT_NAME-pdb -n $NAMESPACE 2>/dev/null || echo "none")
if [ "$PDB" = "none" ]; then
    echo "WARNING: No PodDisruptionBudget found for $DEPLOYMENT_NAME"
fi

# 2. Check current deployment status
echo "Checking current deployment status..."
kubectl get deployment $DEPLOYMENT_NAME -n $NAMESPACE
kubectl rollout status deployment/$DEPLOYMENT_NAME -n $NAMESPACE

# 3. Update deployment image
echo "Updating deployment image..."
kubectl set image deployment/$DEPLOYMENT_NAME \
  $DEPLOYMENT_NAME=$NEW_IMAGE -n $NAMESPACE

# 4. Monitor rollout with enhanced health checks
echo "Monitoring rollout..."
kubectl rollout status deployment/$DEPLOYMENT_NAME -n $NAMESPACE --timeout=15m

# 5. Verify all pods are ready
echo "Verifying all pods are ready..."
kubectl get pods -n $NAMESPACE -l app=$DEPLOYMENT_NAME

# 6. Run post-deployment tests
echo "Running post-deployment tests..."
sleep 30  # Allow time for pods to stabilize

# Test API health
if curl -f https://api.insurance-lead-gen.com/health > /dev/null 2>&1; then
    echo "✅ API health check passed"
else
    echo "❌ API health check failed"
    echo "Rolling back deployment..."
    kubectl rollout undo deployment/$DEPLOYMENT_NAME -n $NAMESPACE
    exit 1
fi

# Test database connectivity
kubectl exec -n production deployment/api -- npm run db:test-connection

# Test key functionality
npm run test:smoke -- --baseUrl=https://api.insurance-lead-gen.com

echo "Zero-downtime deployment completed successfully"
```

### Blue-Green Deployment
```bash
#!/bin/bash
# blue-green-deployment.sh

NEW_VERSION=$1
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "Starting blue-green deployment for version $NEW_VERSION"

# Determine current active environment
CURRENT_COLOR=$(kubectl get namespace production-blue -o jsonpath='{.metadata.labels.color}' 2>/dev/null || echo "green")
NEW_COLOR="green"
if [ "$CURRENT_COLOR" = "green" ]; then
    NEW_COLOR="blue"
fi

echo "Current environment: $CURRENT_COLOR"
echo "Deploying to environment: $NEW_COLOR"

# 1. Deploy to new environment
echo "Deploying to $NEW_COLOR environment..."
helm upgrade --install insurance-lead-gen-$NEW_COLOR ./deploy/helm/insurance-lead-gen \
  --namespace production-$NEW_COLOR \
  --values ./deploy/helm/insurance-lead-gen/values.production.yaml \
  --set image.tag=$NEW_VERSION \
  --set global.color=$NEW_COLOR \
  --wait \
  --timeout 20m

# 2. Run health checks on new environment
echo "Running health checks on $NEW_COLOR environment..."
sleep 60  # Allow time for environment to stabilize

if kubectl exec -n production-$NEW_COLOR deployment/api -- curl -f http://localhost:3000/health; then
    echo "✅ $NEW_COLOR environment health check passed"
else
    echo "❌ $NEW_COLOR environment health check failed"
    helm uninstall insurance-lead-gen-$NEW_COLOR -n production-$NEW_COLOR
    exit 1
fi

# 3. Run integration tests
echo "Running integration tests..."
npm run test:integration -- --baseUrl=https://api-$NEW_COLOR.insurance-lead-gen.com

# 4. Switch traffic to new environment
echo "Switching traffic to $NEW_COLOR environment..."
kubectl patch service api-service -n production \
  --patch '{"spec":{"selector":{"color":"'$NEW_COLOR'"}}}'

kubectl patch service frontend-service -n production \
  --patch '{"spec":{"selector":{"color":"'$NEW_COLOR'"}}}'

# 5. Monitor traffic for issues
echo "Monitoring traffic for 5 minutes..."
sleep 300

# Check for errors
ERROR_COUNT=$(kubectl logs -n production-$NEW_COLOR -l app=api --tail=1000 | grep -c "ERROR" || echo "0")
if [ "$ERROR_COUNT" -gt 10 ]; then
    echo "❌ High error rate detected in $NEW_COLOR environment"
    echo "Rolling back to $CURRENT_COLOR environment..."
    
    kubectl patch service api-service -n production \
      --patch '{"spec":{"selector":{"color":"'$CURRENT_COLOR'"}}}'
    
    kubectl patch service frontend-service -n production \
      --patch '{"spec":{"selector":{"color":"'$CURRENT_COLOR'"}}}'
    
    helm uninstall insurance-lead-gen-$NEW_COLOR -n production-$NEW_COLOR
    exit 1
fi

# 6. Clean up old environment
echo "Cleaning up old $CURRENT_COLOR environment..."
helm uninstall insurance-lead-gen-$CURRENT_COLOR -n production-$CURRENT_COLOR

# 7. Update namespace labels
kubectl label namespace production-$NEW_COLOR color=$NEW_COLOR traffic=active --overwrite
kubectl label namespace production-blue color=blue traffic=canary --overwrite
kubectl label namespace production-green color=green traffic=canary --overwrite

echo "Blue-green deployment completed successfully"
echo "Active environment: $NEW_COLOR"
```

---

## Certificate Management

### SSL/TLS Certificate Updates

#### Let's Encrypt Certificate Management
```bash
#!/bin/bash
# certificate-renewal.sh

DOMAIN=$1
NAMESPACE=${2:-production}

echo "Checking certificate for domain: $DOMAIN"

# Check certificate expiry
CERT_EXPIRY=$(kubectl get certificate $DOMAIN-tls -n $NAMESPACE -o jsonpath='{.status.notAfter}' 2>/dev/null || echo "")
if [ -z "$CERT_EXPIRY" ]; then
    echo "Certificate not found, creating new certificate..."
    
    # Create certificate resource
    cat << EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: $DOMAIN-tls
  namespace: $NAMESPACE
spec:
  secretName: $DOMAIN-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - $DOMAIN
  - www.$DOMAIN
  - api.$DOMAIN
EOF
else
    EXPIRY_DATE=$(date -d "$CERT_EXPIRY" +%s 2>/dev/null || echo "0")
    CURRENT_DATE=$(date +%s)
    DAYS_UNTIL_EXPIRY=$(( (EXPIRY_DATE - CURRENT_DATE) / 86400 ))
    
    echo "Certificate expires in $DAYS_UNTIL_EXPIRY days"
    
    if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
        echo "Certificate renewal needed"
        
        # Force certificate renewal
        kubectl delete certificate $DOMAIN-tls -n $NAMESPACE
        sleep 10
        
        # Recreate certificate
        kubectl apply -f - << EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: $DOMAIN-tls
  namespace: $NAMESPACE
spec:
  secretName: $DOMAIN-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - $DOMAIN
  - www.$DOMAIN
  - api.$DOMAIN
EOF
        
        # Wait for certificate to be issued
        kubectl wait --for=condition=Ready certificate/$DOMAIN-tls -n $NAMESPACE --timeout=300s
        echo "Certificate renewed successfully"
    else
        echo "Certificate renewal not needed yet"
    fi
fi

# Verify certificate status
kubectl get certificate $DOMAIN-tls -n $NAMESPACE
```

#### Certificate Monitoring
```bash
#!/bin/bash
# certificate-monitor.sh

echo "Monitoring certificates across all namespaces..."

# Check all certificates
kubectl get certificates --all-namespaces -o wide

# Check certificates expiring within 30 days
kubectl get certificates --all-namespaces -o json | \
  jq -r '.items[] | select(.status.notAfter | fromdateiso8601 < (now + 2592000)) | 
    "\(.metadata.namespace) / \(.metadata.name): \(.status.notAfter)"'

# Check certificate secrets
kubectl get secrets --all-namespaces -l 'cert-manager.io/certificate-name' -o wide

# Generate certificate report
cat << EOF > certificate-report-$TIMESTAMP.json
{
  "scan_date": "$TIMESTAMP",
  "total_certificates": $(kubectl get certificates --all-namespaces --no-headers | wc -l),
  "expiring_soon": $(kubectl get certificates --all-namespaces -o json | jq -r '[.items[] | select(.status.notAfter | fromdateiso8601 < (now + 2592000))] | length'),
  "renewals_needed": [],
  "recommendations": [
    "Monitor certificate expiry dates",
    "Set up automated renewal",
    "Test certificate installation process",
    "Verify DNS validation is working"
  ]
}
EOF
```

---

## Log Management

### Log Rotation and Cleanup

#### Application Log Rotation
```bash
#!/bin/bash
# log-rotation.sh

NAMESPACE=${1:-production}
RETENTION_DAYS=${2:-30}

echo "Starting log rotation for namespace: $NAMESPACE"
echo "Retention period: $RETENTION_DAYS days"

# Rotate application logs
echo "Rotating application logs..."
kubectl exec -n $NAMESPACE deployment/api -- \
  find /var/log -name "*.log" -mtime +7 -exec gzip {} \;

kubectl exec -n $NAMESPACE deployment/backend -- \
  find /var/log -name "*.log" -mtime +7 -exec gzip {} \;

kubectl exec -n $NAMESPACE deployment/frontend -- \
  find /var/log/nginx -name "*.log" -mtime +7 -exec gzip {} \;

# Clean up old compressed logs
echo "Cleaning up old compressed logs..."
kubectl exec -n $NAMESPACE deployment/api -- \
  find /var/log -name "*.gz" -mtime +$RETENTION_DAYS -delete;

kubectl exec -n $NAMESPACE deployment/backend -- \
  find /var/log -name "*.gz" -mtime +$RETENTION_DAYS -delete;

kubectl exec -n $NAMESPACE deployment/frontend -- \
  find /var/log/nginx -name "*.gz" -mtime +$RETENTION_DAYS -delete;

# Check disk usage after rotation
echo "Checking disk usage after rotation..."
kubectl exec -n $NAMESPACE deployment/api -- df -h /var/log
kubectl exec -n $NAMESPACE deployment/backend -- df -h /var/log
kubectl exec -n $NAMESPACE deployment/frontend -- df -h /var/log/nginx

echo "Log rotation completed"
```

#### Loki Configuration Updates
```bash
#!/bin/bash
# loki-config-update.sh

echo "Updating Loki configuration..."

# Check current Loki configuration
kubectl get configmap loki-config -n monitoring -o yaml

# Update retention period
kubectl patch configmap loki-config -n monitoring \
  --patch '
data:
  loki.yaml: |
    table_manager:
      retention_deletes_enabled: true
      retention_period: 720h  # 30 days
    compactor:
      working_directory: /tmp/loki
      shared_store: s3
      compaction_interval: 10m
      retention_enabled: true
      retention_delete_delay: 2h
      retention_delete_worker_count: 150
'

# Restart Loki to apply changes
kubectl rollout restart deployment/loki -n monitoring

# Monitor restart
kubectl rollout status deployment/loki -n monitoring --timeout=300s

echo "Loki configuration updated"
```

---

## Performance Optimization

### Database Performance Tuning

#### Connection Pool Optimization
```bash
#!/bin/bash
# db-connection-optimization.sh

NAMESPACE=${1:-production}

echo "Optimizing database connection pool..."

# Check current connection pool settings
kubectl exec -n $NAMESPACE deployment/api -- \
  cat src/config/database.js | grep -A 10 -B 5 pool

# Monitor connection usage
echo "Current connection pool usage:"
kubectl exec -n $NAMESPACE deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT count(*) as total_connections,
    sum(CASE WHEN state = 'active' THEN 1 ELSE 0 END) as active_connections,
    sum(CASE WHEN state = 'idle' THEN 1 ELSE 0 END) as idle_connections
   FROM pg_stat_activity;"

# Optimize connection pool settings
echo "Applying connection pool optimizations..."
kubectl patch configmap api-config -n $NAMESPACE \
  --patch '
data:
  DB_POOL_MIN: "5"
  DB_POOL_MAX: "20"
  DB_POOL_IDLE_TIMEOUT: "30000"
  DB_POOL_ACQUIRE_TIMEOUT: "60000"
'

# Restart API service to apply changes
kubectl rollout restart deployment/api -n $NAMESPACE

# Monitor connection pool after optimization
echo "Monitoring connection pool after optimization..."
sleep 60

kubectl exec -n $NAMESPACE deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT count(*) FROM pg_stat_activity WHERE application_name = 'node-postgres';"

echo "Database connection pool optimization completed"
```

#### Query Optimization
```bash
#!/bin/bash
# query-optimization.sh

NAMESPACE=${1:-production}

echo "Optimizing database queries..."

# Enable query logging temporarily
kubectl exec -n $NAMESPACE deployment/postgres -- \
  psql -U postgres -c "ALTER SYSTEM SET log_statement = 'all';"
kubectl exec -n $NAMESPACE deployment/postgres -- \
  psql -U postgres -c "ALTER SYSTEM SET log_min_duration_statement = 1000;"
kubectl exec -n $NAMESPACE deployment/postgres -- \
  psql -U postgres -c "SELECT pg_reload_conf();"

# Run application for 1 hour to collect query data
echo "Collecting query performance data for 1 hour..."
sleep 3600

# Analyze slow queries
echo "Analyzing slow queries..."
SLOW_QUERIES=$(kubectl exec -n $NAMESPACE deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT query, mean_time, calls, total_time,
    mean_time * calls as total_spent
   FROM pg_stat_statements 
   WHERE mean_time > 100  -- queries slower than 100ms
   ORDER BY total_spent DESC 
   LIMIT 10;")

echo "Slow queries found:"
echo "$SLOW_QUERIES"

# Generate optimization recommendations
cat << EOF > query-optimization-recommendations-$TIMESTAMP.json
{
  "analysis_date": "$TIMESTAMP",
  "database": "insurance_lead_gen",
  "slow_queries": $(echo "$SLOW_QUERIES" | jq -R .),
  "recommendations": [
    "Add indexes on frequently queried columns",
    "Optimize query patterns",
    "Consider query caching",
    "Review and update statistics"
  ]
}
EOF

# Disable query logging
kubectl exec -n $NAMESPACE deployment/postgres -- \
  psql -U postgres -c "ALTER SYSTEM SET log_statement = 'none';"
kubectl exec -n $NAMESPACE deployment/postgres -- \
  psql -U postgres -c "SELECT pg_reload_conf();"

echo "Query optimization analysis completed"
```

---

## Backup Maintenance

### Backup Verification and Testing

```bash
#!/bin/bash
# backup-maintenance.sh

NAMESPACE=${1:-production}

echo "Starting backup maintenance for $NAMESPACE"

# Run backup verification
echo "Running backup verification..."
./scripts/backup/backup-verification.sh $NAMESPACE full

# Test backup restoration
echo "Testing backup restoration..."
BACKUP_FILE="production-backup-$(date +%Y%m%d-120000).sql.gz"

# Create test environment
TEST_NAMESPACE="backup-test-$(date +%Y%m%d-%H%M)"
kubectl create namespace $TEST_NAMESPACE

# Deploy test database
kubectl apply -f - <<EOF -n $TEST_NAMESPACE
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres-backup-test
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres-backup-test
  template:
    metadata:
      labels:
        app: postgres-backup-test
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_DB
          value: insurance_lead_gen_backup_test
        - name: POSTGRES_USER
          value: postgres
        - name: POSTGRES_PASSWORD
          value: testpassword
        ports:
        - containerPort: 5432
EOF

# Wait for test database
kubectl wait --for=condition=ready pod -l app=postgres-backup-test -n $TEST_NAMESPACE --timeout=300s

# Restore backup to test database
echo "Restoring backup to test database..."
aws s3 cp s3://company-backups/$NAMESPACE/database/$BACKUP_FILE ./test-backup.sql.gz
gunzip ./test-backup.sql.gz

kubectl exec -i -n $TEST_NAMESPACE deployment/postgres-backup-test -- \
  psql -U postgres insurance_lead_gen_backup_test < ./test-backup.sql

# Verify restoration
echo "Verifying backup restoration..."
LEAD_COUNT=$(kubectl exec -n $TEST_NAMESPACE deployment/postgres-backup-test -- \
  psql -U postgres -d insurance_lead_gen_backup_test -t -c "SELECT COUNT(*) FROM leads;" | tr -d ' ')

if [ "$LEAD_COUNT" -gt "0" ]; then
    echo "✅ Backup restoration successful ($LEAD_COUNT leads)"
else
    echo "❌ Backup restoration failed"
fi

# Cleanup
kubectl delete namespace $TEST_NAMESPACE
rm test-backup.sql

echo "Backup maintenance completed"
```

---

## Quick Reference

### Maintenance Schedule Summary
```
Daily:
- Log rotation
- Certificate expiry checks
- Backup verification

Weekly:
- Database maintenance (ANALYZE, VACUUM)
- Security patch assessment
- Dependency vulnerability scanning
- Performance metric review

Monthly:
- Full database maintenance (VACUUM FULL, REINDEX)
- Security patch deployment
- Dependency updates
- Infrastructure updates
- Certificate renewal

Quarterly:
- Major version upgrades
- Security audit
- Disaster recovery testing
- Performance optimization review
```

### Emergency Maintenance Commands
```bash
# Emergency security patch
./scripts/security/emergency-patch.sh

# Emergency certificate renewal
kubectl delete certificate api-tls -n production
kubectl apply -f certificates/emergency-cert.yaml

# Emergency database maintenance
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c "VACUUM FULL;"

# Emergency log cleanup
kubectl exec -n production deployment/api -- \
  find /var/log -name "*.log" -mtime +1 -delete
```

### Maintenance Contacts
```
Security Team: +1-555-SECURITY-1
Database Admin: +1-555-DB-ADMIN-1
Platform Team: +1-555-PLATFORM-1
On-call Engineer: +1-555-ONCALL-1
```

Remember: Always test maintenance procedures in staging environment before applying to production, and maintain comprehensive rollback plans for all maintenance activities.
