# Production Environment Deployment Runbook

## 🎯 Overview

This runbook provides comprehensive procedures for deploying the Insurance Lead Gen Platform to production environments. Production deployments require the highest level of caution, planning, and validation to ensure zero downtime and business continuity.

---

## 📋 Table of Contents

1. [Prerequisites & Access Requirements](#prerequisites--access-requirements)
2. [Pre-Flight Checks](#pre-flight-checks)
3. [Production Deployment Procedure](#production-deployment-procedure)
4. [Change Control Procedures](#change-control-procedures)
5. [Approval Gates](#approval-gates)
6. [Canary Deployment Steps](#canary-deployment-steps)
7. [Traffic Shifting Procedures](#traffic-shifting-procedures)
8. [Health Monitoring](#health-monitoring)
9. [Rollback Triggers](#rollback-triggers)
10. [Post-Deployment Validation](#post-deployment-validation)
11. [Emergency Procedures](#emergency-procedures)

---

## Prerequisites & Access Requirements

### Required Access Levels
- **Production Kubernetes Cluster**: Full cluster access with namespace management
- **Container Registry**: Push/pull access to production image repository
- **Database**: Production database admin access for migrations
- **Secrets Management**: AWS Secrets Manager / HashiCorp Vault access
- **Monitoring**: Grafana, Prometheus, Jaeger production access
- **Communication**: PagerDuty, Slack, Teams access for incident management
- **Change Management**: Change advisory board approval system access

### Required Tools & Versions
```bash
# Kubernetes tools (verified versions)
kubectl version --client  # v1.28+
helm version             # v3.12+
kustomize version        # v5.0+

# Container tools
docker version           # v24.0+
helm plugin install https://github.com/hypnoglow/helm-s3.git

# Monitoring tools
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &
kubectl port-forward -n monitoring svc/grafana 3000:3000 &

# Load testing tools
npm install -g artillery@latest
npm install -g k6@latest

# Security scanning tools
docker run --rm -v "$(pwd)":/app aquasec/trivy:latest fs /app
npm audit --audit-level moderate
```

### Production Configuration
```bash
# Set production context
kubectl config use-context production

# Verify production cluster
kubectl cluster-info
kubectl get nodes -o wide
kubectl get pods -n kube-system

# Verify production namespaces
kubectl get namespaces | grep -E "(production|kube-system|monitoring)"

# Check production resources
kubectl top nodes
kubectl describe nodes | grep -A 10 "Allocated resources"
```

### Security Requirements
- [ ] **Multi-factor Authentication**: Enabled for all production access
- [ ] **IP Whitelisting**: Access restricted to company IP ranges
- [ ] **VPN Required**: All production access through corporate VPN
- [ ] **Audit Logging**: All actions logged and monitored
- [ ] **Principle of Least Privilege**: Minimal required permissions
- [ ] **Time-based Access**: Temporary elevated access when needed

---

## Pre-Flight Checks

### 1. Infrastructure Readiness

```bash
#!/bin/bash
# production-preflight.sh

set -e

echo "=== Production Deployment Pre-Flight Checks ==="
echo "Starting at $(date)"

# 1. Cluster Health Check
echo ">>> Cluster Health"
kubectl get nodes
if [ $(kubectl get nodes --no-headers | grep -c "Ready") -lt 3 ]; then
    echo "ERROR: Insufficient ready nodes"
    exit 1
fi

# 2. System Components
echo ">>> System Components"
kubectl get cs
kubectl get pods -n kube-system | grep -E "(Error|CrashLoop)" && exit 1

# 3. Resource Availability
echo ">>> Resource Availability"
kubectl top nodes
AVAILABLE_CPU=$(kubectl describe nodes | grep "cpu " | awk '{sum+=$2} END {print sum}')
AVAILABLE_MEMORY=$(kubectl describe nodes | grep "memory " | awk '{sum+=$2} END {print sum}')
echo "Available CPU: $AVAILABLE_CPU"
echo "Available Memory: $AVAILABLE_MEMORY"

# 4. Storage
echo ">>> Storage"
kubectl get pv,pvc
kubectl get storageclass

# 5. Network Policies
echo ">>> Network Policies"
kubectl get networkpolicies -n production

# 6. Ingress Controllers
echo ">>> Ingress Controllers"
kubectl get pods -n ingress-nginx
kubectl get ingress -n production

echo "Infrastructure pre-flight checks completed"
```

### 2. Application Health Verification

```bash
# Check current production deployment
echo ">>> Current Production Status"
helm list -n production
kubectl get pods -n production -o wide
kubectl get services -n production
kubectl get ingress -n production

# Health check current deployment
echo ">>> Health Check Current Deployment"
curl -f https://api.insurance-lead-gen.com/health --max-time 10 || exit 1
curl -f https://insurance-lead-gen.com/health --max-time 10 || exit 1

# Check error rates
echo ">>> Current Error Rates"
PROMETHEUS_URL="http://prometheus.monitoring.svc.cluster.local:9090"
ERROR_RATE=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=rate(http_requests_total{service=\"api\",status=~\"5..\"}[5m])" | jq -r '.data.result[0].value[1] // "0"')
if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
    echo "WARNING: High error rate in current deployment: $ERROR_RATE"
fi

# Check response times
echo ">>> Current Response Times"
P95_RESPONSE=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket{service=\"api\"}[5m]))" | jq -r '.data.result[0].value[1] // "0"')
echo "P95 Response Time: ${P95_RESPONSE}s"
if (( $(echo "$P95_RESPONSE > 2.0" | bc -l) )); then
    echo "WARNING: High response time in current deployment: ${P95_RESPONSE}s"
fi
```

### 3. Backup Verification

```bash
# Database backup verification
echo ">>> Database Backup Verification"
LATEST_BACKUP=$(kubectl exec -n production deployment/postgres -- \
  ls -t /backups/*.sql | head -1)
echo "Latest backup: $LATEST_BACKUP"

# Verify backup integrity
kubectl exec -n production deployment/postgres -- \
  pg_restore --list "$LATEST_BACKUP" > /tmp/backup-contents.txt

# Check backup size
BACKUP_SIZE=$(kubectl exec -n production deployment/postgres -- \
  ls -lh "$LATEST_BACKUP" | awk '{print $5}')
echo "Backup size: $BACKUP_SIZE"

# Test backup restoration (in staging environment)
echo ">>> Testing Backup Restoration"
kubectl config use-context staging
kubectl exec -n staging deployment/postgres -- \
  psql -U staging_user -d test_restore -c "SELECT 1" || \
  kubectl exec -n staging deployment/postgres -- \
  createdb -U staging_user test_restore

# Restore to test database
kubectl exec -i -n staging deployment/postgres -- \
  psql -U staging_user test_restore < <(kubectl exec -n production deployment/postgres -- cat "$LATEST_BACKUP")

# Verify restoration
RECORD_COUNT=$(kubectl exec -n staging deployment/postgres -- \
  psql -U staging_user test_restore -t -c "SELECT count(*) FROM leads;")
echo "Leads count in test restore: $RECORD_COUNT"

# Clean up test database
kubectl exec -n staging deployment/postgres -- psql -U staging_user -c "DROP DATABASE test_restore;"

# Switch back to production context
kubectl config use-context production
```

### 4. Security Verification

```bash
# Security scan of new images
echo ">>> Security Scan"
docker run --rm -v "$(pwd)":/app -w /app aquasec/trivy:latest fs --severity HIGH,CRITICAL /app

# Vulnerability assessment
npm audit --audit-level high

# Container scan
docker build -t temp-security-scan ./apps/api/
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy:latest image temp-security-scan

# Secrets verification
echo ">>> Secrets Verification"
kubectl get secrets -n production | grep -E "(database|redis|jwt|api)"

# Certificate verification
echo ">>> Certificate Verification"
kubectl get certificates -n production
kubectl describe certificate api-tls -n production

# Network policy verification
echo ">>> Network Policy Verification"
kubectl get networkpolicies -n production -o yaml
```

### 5. Monitoring & Alerting Setup

```bash
# Verify monitoring stack
echo ">>> Monitoring Stack"
kubectl get pods -n monitoring
kubectl get servicemonitors -n monitoring

# Test alerting
echo ">>> Testing Alert Channels"
curl -X POST https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK \
  -H 'Content-type: application/json' \
  --data '{"text":"Production deployment test alert"}'

# Create deployment-specific dashboard
echo ">>> Creating Deployment Dashboard"
cat << EOF > deployment-dashboard.json
{
  "dashboard": {
    "title": "Production Deployment - $(date +%Y%m%d)",
    "tags": ["deployment", "$(date +%Y%m%d)"],
    "panels": [
      {
        "title": "API Response Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service=\"api\"}[5m]))"
          }
        ]
      },
      {
        "title": "API Error Rate", 
        "targets": [
          {
            "expr": "rate(http_requests_total{service=\"api\",status=~\"5..\"}[5m])"
          }
        ]
      },
      {
        "title": "Database Connections",
        "targets": [
          {
            "expr": "pg_stat_database_numbackends{datname=\"insurance_lead_gen\"}"
          }
        ]
      }
    ]
  }
}
EOF

# Apply dashboard (would need Grafana API call)
# This is a placeholder for actual Grafana API integration
```

---

## Production Deployment Procedure

### 1. Change Control Documentation

```bash
# Create change control record
cat << EOF > change-control-$(date +%Y%m%d-%H%M).md
# Production Change Control Record

**Change ID**: PROD-$(date +%Y%m%d-%H%M)
**Date**: $(date)
**Requested By**: $USER
**Change Type**: Regular Deployment
**Risk Level**: Medium

## Change Description
- **Service**: Insurance Lead Gen Platform
- **Version**: v$(node -p "require('./package.json').version")
- **Type**: Feature deployment with database migration
- **Impact**: All users, full functionality

## Change Details
$(git log --oneline -10)

## Risk Assessment
- **Rollback Complexity**: Low (Helm rollback available)
- **Data Migration**: Required (forward-only migration)
- **Service Downtime**: None (rolling deployment)
- **Customer Impact**: Minimal (blue-green deployment)

## Rollback Plan
1. Helm rollback to previous version
2. Database rollback if needed
3. Traffic switch back to previous environment

## Approvals
- [ ] Technical Lead Approval
- [ ] Product Manager Approval  
- [ ] Security Team Approval
- [ ] Change Advisory Board Approval

## Communications
- [ ] Customer support notified
- [ ] Sales team briefed
- [ ] Stakeholders informed

## Deployment Team
- **Deployment Lead**: $DEPLOYMENT_LEAD
- **Technical Lead**: $TECH_LEAD
- **On-call Engineer**: $ONCALL_ENGINEER
- **Database Admin**: $DB_ADMIN
EOF

echo "Change control record created: change-control-$(date +%Y%m%d-%H%M).md"
```

### 2. Build Production Images

```bash
#!/bin/bash
# build-production-images.sh

set -e

VERSION=$(node -p "require('./package.json').version")
TIMESTAMP=$(date +%Y%m%d-%H%M)
PROD_TAG="${VERSION}-${TIMESTAMP}"

echo "Building production images..."
echo "Version: $VERSION"
echo "Timestamp: $TIMESTAMP"
echo "Tag: $PROD_TAG"

# Build with production optimizations
echo ">>> Building API Service"
docker build \
  --build-arg NODE_ENV=production \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --build-arg VCS_REF=$(git rev-parse --short HEAD) \
  --label org.label-schema.build-date=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --label org.label-schema.vcs-ref=$(git rev-parse --short HEAD) \
  --label org.label-schema.version=$VERSION \
  -f apps/api/Dockerfile.production \
  -t registry.company.com/insurance-lead-gen/api:${PROD_TAG} \
  -t registry.company.com/insurance-lead-gen/api:latest \
  apps/api/

echo ">>> Building Backend Service"
docker build \
  --build-arg PYTHON_VERSION=3.11 \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --label org.label-schema.build-date=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --label org.label-schema.vcs-ref=$(git rev-parse --short HEAD) \
  --label org.label-schema.version=$VERSION \
  -f apps/backend/Dockerfile.production \
  -t registry.company.com/insurance-lead-gen/backend:${PROD_TAG} \
  -t registry.company.com/insurance-lead-gen/backend:latest \
  apps/backend/

echo ">>> Building Frontend Service"
docker build \
  --build-arg NODE_ENV=production \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --label org.label-schema.build-date=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --label org.label-schema.vcs-ref=$(git rev-parse --short HEAD) \
  --label org.label-schema.version=$VERSION \
  -f apps/frontend/Dockerfile.production \
  -t registry.company.com/insurance-lead-gen/frontend:${PROD_TAG} \
  -t registry.company.com/insurance-lead-gen/frontend:latest \
  apps/frontend/

echo ">>> Building Data Service"
docker build \
  --build-arg NODE_ENV=production \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --label org.label-schema.build-date=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --label org.label-schema.vcs-ref=$(git rev-parse --short HEAD) \
  --label org.label-schema.version=$VERSION \
  -f apps/data-service/Dockerfile.production \
  -t registry.company.com/insurance-lead-gen/data-service:${PROD_TAG} \
  -t registry.company.com/insurance-lead-gen/data-service:latest \
  apps/data-service/

echo ">>> Building Orchestrator"
docker build \
  --build-arg NODE_ENV=production \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --label org.label-schema.build-date=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --label org.label-schema.vcs-ref=$(git rev-parse --short HEAD) \
  --label org.label-schema.version=$VERSION \
  -f apps/orchestrator/Dockerfile.production \
  -t registry.company.com/insurance-lead-gen/orchestrator:${PROD_TAG} \
  -t registry.company.com/insurance-lead-gen/orchestrator:latest \
  apps/orchestrator/

# Push to registry
echo ">>> Pushing to Registry"
docker push registry.company.com/insurance-lead-gen/api:${PROD_TAG}
docker push registry.company.com/insurance-lead-gen/api:latest
docker push registry.company.com/insurance-lead-gen/backend:${PROD_TAG}
docker push registry.company.com/insurance-lead-gen/backend:latest
docker push registry.company.com/insurance-lead-gen/frontend:${PROD_TAG}
docker push registry.company.com/insurance-lead-gen/frontend:latest
docker push registry.company.com/insurance-lead-gen/data-service:${PROD_TAG}
docker push registry.company.com/insurance-lead-gen/data-service:latest
docker push registry.company.com/insurance-lead-gen/orchestrator:${PROD_TAG}
docker push registry.company.com/insurance-lead-gen/orchestrator:latest

# Security scan images
echo ">>> Security Scanning Images"
for service in api backend frontend data-service orchestrator; do
    echo "Scanning registry.company.com/insurance-lead-gen/${service}:${PROD_TAG}"
    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
      aquasec/trivy:latest image \
      --severity HIGH,CRITICAL \
      registry.company.com/insurance-lead-gen/${service}:${PROD_TAG}
done

echo "Production images built and pushed successfully"
echo "Production tag: $PROD_TAG"
```

### 3. Pre-Deployment Backup

```bash
# Create comprehensive backup
echo "Creating production backup..."

# Database backup
TIMESTAMP=$(date +%Y%m%d-%H%M)
BACKUP_FILE="production-backup-${TIMESTAMP}.sql"

kubectl exec -n production deployment/postgres -- \
  pg_dump --verbose --clean --no-owner --no-privileges \
  insurance_lead_gen > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

# Upload to S3
aws s3 cp "${BACKUP_FILE}.gz" \
  s3://company-backups/production/database/ \
  --server-side-encryption AES256

# Verify backup integrity
gunzip -t "${BACKUP_FILE}.gz"
echo "Backup integrity verified"

# Store backup metadata
cat << EOF > backup-metadata-${TIMESTAMP}.json
{
  "backup_file": "${BACKUP_FILE}.gz",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "database": "insurance_lead_gen",
  "size": "$(ls -lh "${BACKUP_FILE}.gz" | awk '{print $5}')",
  "md5": "$(md5sum "${BACKUP_FILE}.gz" | awk '{print $1}')",
  "created_by": "$USER",
  "version": "$(node -p "require('./package.json').version")"
}
EOF

echo "Backup completed: ${BACKUP_FILE}.gz"
echo "Backup metadata: backup-metadata-${TIMESTAMP}.json"
```

### 4. Deployment Execution

```bash
#!/bin/bash
# deploy-production.sh

set -e

VERSION=$(node -p "require('./package.json').version")
TIMESTAMP=$(date +%Y%m%d-%H%M)
PROD_TAG="${VERSION}-${TIMESTAMP}"

echo "============================================"
echo "PRODUCTION DEPLOYMENT STARTED"
echo "============================================"
echo "Start Time: $(date)"
echo "Version: $VERSION"
echo "Tag: $PROD_TAG"
echo "Deployed By: $USER"
echo "Deployment Lead: $DEPLOYMENT_LEAD"
echo "============================================"

# Notify start of deployment
curl -X POST https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK \
  -H 'Content-type: application/json' \
  --data "{
    \"text\": \"🚀 Production deployment started\",
    \"attachments\": [{\n      \"color\": \"warning\",\n      \"fields\": [\n        {\"title\": \"Version\", \"value\": \"$VERSION\", \"short\": true},\n        {\"title\": \"Deployed By\", \"value\": \"$USER\", \"short\": true},\n        {\"title\": \"Start Time\", \"value\": \"$(date)\", \"short\": false}\n      ]\n    }]\n  }"

# Pre-deployment health check
echo ">>> Pre-deployment health check"
kubectl get pods -n production | grep -E "(0/.*|Error|CrashLoop)" && exit 1
curl -f https://api.insurance-lead-gen.com/health --max-time 10 || exit 1

# Blue-Green Deployment Setup
echo ">>> Setting up blue-green deployment"

# Create blue environment if it doesn't exist
kubectl create namespace production-blue --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace production-green --dry-run=client -o yaml | kubectl apply -f -

# Determine current active color
CURRENT_COLOR=$(kubectl get namespace production-blue -o jsonpath='{.metadata.labels.color}' 2>/dev/null || echo "green")
NEW_COLOR="green"
if [ "$CURRENT_COLOR" = "green" ]; then
    NEW_COLOR="blue"
fi

echo "Current environment: $CURRENT_COLOR"
echo "Deploying to environment: $NEW_COLOR"

# Deploy to new environment
echo ">>> Deploying to $NEW_COLOR environment"
helm upgrade --install insurance-lead-gen-${NEW_COLOR} ./deploy/helm/insurance-lead-gen \
  --namespace production-${NEW_COLOR} \
  --values ./deploy/helm/insurance-lead-gen/values.production.yaml \
  --set image.tag=${PROD_TAG} \
  --set image.repository=registry.company.com/insurance-lead-gen \
  --set global.environment=production \
  --set global.color=${NEW_COLOR} \
  --wait \
  --timeout 20m \
  --debug

# Wait for rollout completion
echo ">>> Waiting for rollout completion"
kubectl rollout status deployment/api -n production-${NEW_COLOR} --timeout=15m
kubectl rollout status deployment/backend -n production-${NEW_COLOR} --timeout=15m
kubectl rollout status deployment/frontend -n production-${NEW_COLOR} --timeout=15m
kubectl rollout status deployment/data-service -n production-${NEW_COLOR} --timeout=15m
kubectl rollout status deployment/orchestrator -n production-${NEW_COLOR} --timeout=15m

# Database migrations
echo ">>> Running database migrations"
kubectl exec -n production-${NEW_COLOR} deployment/api -- npm run db:migrate

# Verify database migrations
kubectl exec -n production-${NEW_COLOR} deployment/api -- npm run db:migrate:status

# Health check new environment
echo ">>> Health checking $NEW_COLOR environment"
kubectl exec -n production-${NEW_COLOR} deployment/api -- curl -f http://localhost:3000/health || exit 1

# Run integration tests
echo ">>> Running integration tests"
npm run test:integration -- --baseUrl=https://api-${NEW_COLOR}.insurance-lead-gen.com || exit 1

echo "============================================"
echo "BLUE-GREEN DEPLOYMENT COMPLETED"
echo "New environment ($NEW_COLOR) is ready"
echo "============================================"
```

---

## Change Control Procedures

### Approval Workflow

```bash
#!/bin/bash
# change-approval-workflow.sh

CHANGE_ID="PROD-$(date +%Y%m%d-%H%M)"
RISK_LEVEL=${1:-medium}  # low, medium, high

echo "Change Control Workflow for $CHANGE_ID"

# Risk Assessment Matrix
case $RISK_LEVEL in
    "low")
        APPROVALS_REQUIRED=("tech_lead")
        NOTIFICATION_REQUIRED=false
        ;;
    "medium")
        APPROVALS_REQUIRED=("tech_lead" "product_manager")
        NOTIFICATION_REQUIRED=true
        ;;
    "high")
        APPROVALS_REQUIRED=("tech_lead" "product_manager" "security_team" "change_advisory_board")
        NOTIFICATION_REQUIRED=true
        ;;
    *)
        echo "Invalid risk level: $RISK_LEVEL"
        exit 1
        ;;
esac

echo "Risk Level: $RISK_LEVEL"
echo "Approvals Required: ${APPROVALS_REQUIRED[@]}"

# Create change request
cat << EOF > change-request-${CHANGE_ID}.md
# Change Request: $CHANGE_ID

**Risk Level**: $RISK_LEVEL
**Requestor**: $USER
**Date**: $(date)
**Estimated Duration**: 45 minutes

## Change Description
$(git log --oneline -10 | sed 's/^/- /')

## Risk Assessment
- **Technical Risk**: $RISK_LEVEL
- **Business Impact**: Medium
- **Rollback Complexity**: Low
- **Customer Impact**: None

## Testing Performed
- [ ] Unit tests passing
- [ ] Integration tests passing  
- [ ] Staging deployment successful
- [ ] Performance testing completed
- [ ] Security scan passed

## Rollback Plan
1. Helm rollback to previous version
2. Database rollback if critical issue
3. Traffic switch back to previous environment
4. Estimated rollback time: 10-15 minutes

## Communication Plan
- [ ] Customer support notified
- [ ] Sales team briefed
- [ ] Status page updated
- [ ] Stakeholders informed

## Approvals
EOF

# Approval workflow for each required approver
for approver in "${APPROVALS_REQUIRED[@]}"; do
    echo "- [ ] $approver approval (pending)" >> change-request-${CHANGE_ID}.md
    
    # In a real implementation, this would integrate with an approval system
    case $approver in
        "tech_lead")
            echo "Please get technical approval from tech lead"
            ;;
        "product_manager")
            echo "Please get product manager approval"
            ;;
        "security_team")
            echo "Please get security team approval"
            ;;
        "change_advisory_board")
            echo "Please get CAB approval in next meeting"
            ;;
    esac
done

echo "Change request created: change-request-${CHANGE_ID}.md"
```

### Change Advisory Board (CAB) Process

```bash
# Schedule CAB meeting for high-risk changes
schedule_cab_meeting() {
    local change_id=$1
    local urgency=$2
    
    # Calculate next CAB meeting date
    CAB_DAYS=("tuesday" "thursday")  # CAB meetings on Tuesday and Thursday
    
    # Find next CAB meeting day
    for day in "${CAB_DAYS[@]}"; do
        next_date=$(date -d "next $day" +%Y-%m-%d)
        echo "Next CAB meeting ($day): $next_date"
        break
    done
    
    # Create CAB agenda
    cat << EOF > cab-agenda-$(date +%Y%m%d).md
# CAB Agenda - $(date +%Y-%m-%d)

## Changes for Review

### $change_id
- **Requestor**: $USER
- **Risk**: High
- **Business Justification**: $(git log --oneline -1)
- **Rollback Plan**: Documented
- **Testing**: Completed in staging

## Discussion Points
1. Technical feasibility
2. Business impact
3. Rollback readiness
4. Communication plan

## Decision
- [ ] Approved for deployment
- [ ] Requires changes
- [ ] Deferred
- [ ] Rejected

**Chair**: CAB Chair
**Attendees**: Tech Lead, Product Manager, Security, SRE
EOF
    
    echo "CAB agenda created for $(date +%Y-%m-%d)"
}

# For urgent changes (hotfixes)
if [ "$2" = "urgent" ]; then
    echo "Urgent change - CAB approval may be expedited"
    # Emergency approval process
    cat << EOF > emergency-approval.md
# Emergency Change Approval

**Change ID**: $1
**Type**: Urgent Hotfix
**Justification**: Critical bug/security issue
**Approval Authority**: On-call Engineering Manager
**Notification**: CAB chair informed post-deployment

## Emergency Justification
$(git log --oneline -1)

## Approval
- [ ] On-call Engineering Manager: Approved
- [ ] Security Team: Reviewed
- [ ] Product Manager: Acknowledged

**Emergency Approval**: $(date)
EOF
fi
```

---

## Approval Gates

### Gate 1: Technical Readiness
- [ ] **Code Review**: All changes reviewed and approved
- [ ] **Testing**: All tests passing (unit, integration, e2e)
- [ ] **Security**: No critical vulnerabilities
- [ ] **Performance**: Meets performance benchmarks
- [ ] **Documentation**: Updated runbooks and API docs

### Gate 2: Environment Readiness
- [ ] **Staging Validation**: Successful deployment to staging
- [ ] **Database Migrations**: Tested and validated
- [ ] **Configuration**: Environment variables configured
- [ ] **Secrets**: All secrets properly configured
- [ ] **Monitoring**: Dashboards and alerts configured

### Gate 3: Risk Assessment
- [ ] **Risk Level**: Documented and accepted
- [ ] **Rollback Plan**: Tested and documented
- [ ] **Impact Analysis**: Business impact assessed
- [ ] **Mitigation**: Risk mitigation strategies defined
- [ ] **Communication**: Stakeholder communication plan ready

### Gate 4: Approvals
- [ ] **Technical Lead**: Approved
- [ ] **Product Manager**: Approved
- [ ] **Security Team**: Approved (if required)
- [ ] **Change Advisory Board**: Approved (for high-risk changes)

### Gate 5: Deployment Readiness
- [ ] **Team Assembled**: Deployment team ready
- [ ] **Communication Channels**: Active and tested
- [ ] **Monitoring**: Real-time monitoring ready
- [ ] **Backup**: Pre-deployment backup completed
- [ ] **Rollback**: Rollback team identified

---

## Canary Deployment Steps

### 1. Deploy Canary Version

```bash
#!/bin/bash
# canary-deployment.sh

VERSION=$(node -p "require('./package.json').version")
TIMESTAMP=$(date +%Y%m%d-%H%M)
CANARY_TAG="${VERSION}-canary-${TIMESTAMP}"

echo "Starting canary deployment..."
echo "Canary version: $CANARY_TAG"

# Deploy canary with limited traffic
kubectl apply -f - <<EOF
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: api-rollout
  namespace: production
spec:
  replicas: 10
  strategy:
    canary:
      canaryService: api-canary-svc
      stableService: api-stable-svc
      steps:
      - setWeight: 5
      - pause: {duration: 10m}
      - setWeight: 25
      - pause: {duration: 30m}
      - setWeight: 50
      - pause: {duration: 60m}
      - setWeight: 100
      analysis:
        templates:
        - templateName: success-rate
        args:
        - name: service-name
          value: api-svc
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: registry.company.com/insurance-lead-gen/api:${CANARY_TAG}
        ports:
        - containerPort: 3000
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
  namespace: production
spec:
  args:
  - name: service-name
  metrics:
  - name: success-rate
    successCondition: result[0] >= 0.95
    interval: 5m
    count: 3
    provider:
      prometheus:
        address: http://prometheus.monitoring.svc.cluster.local:9090
        query: |
          sum(rate(http_requests_total{service="{{args.service-name}}",status!~"5.."}[5m])) /
          sum(rate(http_requests_total{service="{{args.service-name}}"}[5m]))
EOF

# Monitor canary deployment
echo "Monitoring canary deployment..."
kubectl rollout status rollout/api-rollout -n production --timeout=30m
```

### 2. Canary Monitoring

```bash
# Monitor canary metrics
monitor_canary() {
    local duration=${1:-30}  # minutes
    local end_time=$(($(date +%s) + duration * 60))
    
    echo "Monitoring canary for $duration minutes..."
    
    while [ $(date +%s) -lt $end_time ]; do
        # Get canary metrics
        ERROR_RATE=$(kubectl exec -n production deployment/prometheus -- \
          promtool query instant 'rate(http_requests_total{service="api-canary",status=~"5.."}[5m])' | \
          jq -r '.data.result[0].value[1] // "0"')
        
        LATENCY_P95=$(kubectl exec -n production deployment/prometheus -- \
          promtool query instant 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service="api-canary"}[5m]))' | \
          jq -r '.data.result[0].value[1] // "0"')
        
        SUCCESS_RATE=$(kubectl exec -n production deployment/prometheus -- \
          promtool query instant 'rate(http_requests_total{service="api-canary",status!~"5.."}[5m]) / rate(http_requests_total{service="api-canary"}[5m])' | \
          jq -r '.data.result[0].value[1] // "1"')
        
        echo "$(date): Error Rate: $ERROR_RATE, P95 Latency: ${LATENCY_P95}s, Success Rate: $SUCCESS_RATE"
        
        # Check thresholds
        if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
            echo "ERROR: High error rate in canary: $ERROR_RATE"
            return 1
        fi
        
        if (( $(echo "$LATENCY_P95 > 2.0" | bc -l) )); then
            echo "WARNING: High latency in canary: ${LATENCY_P95}s"
        fi
        
        if (( $(echo "$SUCCESS_RATE < 0.95" | bc -l) )); then
            echo "ERROR: Low success rate in canary: $SUCCESS_RATE"
            return 1
        fi
        
        sleep 60  # Check every minute
    done
    
    echo "Canary monitoring completed successfully"
}

# Run canary monitoring
monitor_canary 30
```

### 3. Gradual Traffic Increase

```bash
# Gradually increase canary traffic
gradual_traffic_increase() {
    local weights=(5 25 50 75 100)
    local step_duration=15  # minutes
    
    for weight in "${weights[@]}"; do
        echo "Increasing traffic to ${weight}%"
        
        # Update Argo Rollouts canary weight
        kubectl patch rollout api-rollout -n production \
          --type='json' -p='[{"op": "replace", "path": "/spec/strategy/canary/steps/0/setWeight", "value": '$weight'}]'
        
        echo "Waiting ${step_duration} minutes at ${weight}% traffic..."
        sleep $((step_duration * 60))
        
        # Check metrics at this weight
        ERROR_RATE=$(get_error_rate "api-canary")
        LATENCY=$(get_latency "api-canary")
        
        echo "Metrics at ${weight}%: Error Rate: $ERROR_RATE, Latency: ${LATENCY}s"
        
        # If metrics are bad, pause or rollback
        if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
            echo "ERROR: High error rate at ${weight}% traffic, pausing deployment"
            kubectl patch rollout api-rollout -n production \
              --type='json' -p='[{"op": "add", "path": "/spec/strategy/canary/steps/-", "value": {"pause": {"duration": "30m"}}}]'
            break
        fi
    done
}

get_error_rate() {
    local service=$1
    kubectl exec -n production deployment/prometheus -- \
      promtool query instant "rate(http_requests_total{service=\"$service\",status=~\"5..\"}[5m])" | \
      jq -r '.data.result[0].value[1] // "0"'
}

get_latency() {
    local service=$1
    kubectl exec -n production deployment/prometheus -- \
      promtool query instant "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service=\"$service\"}[5m]))" | \
      jq -r '.data.result[0].value[1] // "0"'
}
```

---

## Traffic Shifting Procedures

### Blue-Green Traffic Switch

```bash
#!/bin/bash
# blue-green-traffic-switch.sh

NEW_COLOR=${1:-blue}  # blue or green
CURRENT_COLOR=${2:-green}

echo "Switching traffic from $CURRENT_COLOR to $NEW_COLOR"

# Update main ingress to point to new environment
kubectl patch ingress api-ingress -n production \
  --patch='{
    "spec": {
      "rules": [{
        "host": "api.insurance-lead-gen.com",
        "http": {
          "paths": [{
            "backend": {
              "service": {
                "name": "api-service-'$NEW_COLOR'",
                "port": {"number": 80}
              }
            },
            "path": "/",
            "pathType": "Prefix"
          }]
        }
      }]
    }
  }'

# Wait for DNS propagation
echo "Waiting for DNS propagation (2 minutes)..."
sleep 120

# Update frontend ingress
kubectl patch ingress frontend-ingress -n production \
  --patch='{
    "spec": {
      "rules": [{
        "host": "insurance-lead-gen.com",
        "http": {
          "paths": [{
            "backend": {
              "service": {
                "name": "frontend-service-'$NEW_COLOR'",
                "port": {"number": 80}
              }
            },
            "path": "/",
            "pathType": "Prefix"
          }]
        }
      }]
    }
  }'

# Update load balancer weights (if using weighted routing)
kubectl patch service api-service -n production \
  --patch='{"spec":{"selector":{"color":"'$NEW_COLOR'"}}}'

kubectl patch service frontend-service -n production \
  --patch='{"spec":{"selector":{"color":"'$NEW_COLOR'"}}}'

# Verify traffic switch
echo "Verifying traffic switch..."
sleep 30

# Check if new environment is receiving traffic
NEW_TRAFFIC=$(kubectl exec -n production deployment/prometheus -- \
  promtool query instant 'sum(rate(http_requests_total{service="api-'$NEW_COLOR'"}[5m]))' | \
  jq -r '.data.result[0].value[1] // "0"')

echo "New environment traffic: $NEW_TRAFFIC requests/5min"

# Update namespace labels
kubectl label namespace production-${CURRENT_COLOR} color=${CURRENT_COLOR} traffic=stable --overwrite
kubectl label namespace production-${NEW_COLOR} color=${NEW_COLOR} traffic=active --overwrite

echo "Traffic switch completed successfully"
echo "Active environment: $NEW_COLOR"
echo "Stable environment: $CURRENT_COLOR"
```

### Gradual Traffic Shifting

```bash
# Gradual traffic shift for canary
gradual_traffic_shift() {
    local target_weight=${1:-100}
    local step_size=${2:-10}
    local interval=${3:-60}  # seconds
    
    echo "Gradual traffic shift to ${target_weight}% over ${step_size}% increments"
    
    current_weight=$(kubectl get rollout api-rollout -n production -o jsonpath='{.status.currentStepAnalysis.startedAt}' 2>/dev/null || echo "0")
    
    for weight in $(seq $step_size $step_size $target_weight); do
        echo "Setting traffic weight to ${weight}%"
        
        # Update canary weight
        kubectl patch rollout api-rollout -n production \
          --type='json' -p='[{"op": "replace", "path": "/spec/strategy/canary/steps/0/setWeight", "value": '$weight'}]'
        
        echo "Waiting ${interval} seconds..."
        sleep $interval
        
        # Monitor for issues
        ERROR_RATE=$(get_error_rate "api-canary")
        if (( $(echo "$ERROR_RATE > 0.005" | bc -l) )); then
            echo "ERROR: High error rate at ${weight}% traffic: $ERROR_RATE"
            echo "Rolling back to previous stable version"
            kubectl rollout undo rollout/api-rollout -n production
            exit 1
        fi
        
        echo "Traffic shift to ${weight}% successful"
    done
    
    echo "Traffic shift to ${target_weight}% completed"
}

# DNS-based gradual shift
dns_traffic_shift() {
    local new_color=${1:-blue}
    local ttl=${2:-300}  # 5 minutes
    
    echo "DNS-based traffic shift to $new_color environment"
    
    # Update DNS records with short TTL
    cat << EOF > dns-update.json
{
  "Comment": "Traffic shift for deployment",
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "api.insurance-lead-gen.com",
      "Type": "CNAME",
      "TTL": $ttl,
      "ResourceRecords": [{"Value": "api-$new_color.internal.company.com"}]
    }
  },{
    "Action": "UPSERT", 
    "ResourceRecordSet": {
      "Name": "insurance-lead-gen.com",
      "Type": "CNAME",
      "TTL": $ttl,
      "ResourceRecords": [{"Value": "frontend-$new_color.internal.company.com"}]
    }
  }]
}
EOF
    
    # Apply DNS changes
    aws route53 change-resource-record-sets \
      --hosted-zone-id Z123456789 \
      --change-batch file://dns-update.json
    
    echo "DNS records updated with ${ttl}s TTL"
    echo "Monitoring traffic distribution..."
    
    # Monitor traffic distribution
    for i in {1..12}; do  # Monitor for 1 hour (12 * 5 min)
        echo "Monitoring round $i..."
        
        # Check traffic distribution
        OLD_TRAFFIC=$(kubectl exec -n production deployment/prometheus -- \
          promtool query instant 'sum(rate(http_requests_total{service="api-green"}[5m]))' | \
          jq -r '.data.result[0].value[1] // "0"')
        
        NEW_TRAFFIC=$(kubectl exec -n production deployment/prometheus -- \
          promtool query instant 'sum(rate(http_requests_total{service="api-blue"}[5m]))' | \
          jq -r '.data.result[0].value[1] // "0"')
        
        echo "Green traffic: $OLD_TRAFFIC, Blue traffic: $NEW_TRAFFIC"
        
        # Check for issues
        ERROR_RATE=$(get_error_rate "api-blue")
        if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
            echo "ERROR: High error rate in new environment"
            # Rollback DNS
            reverse_dns_change
            exit 1
        fi
        
        sleep 300  # 5 minutes
    done
    
    # Finalize DNS change (increase TTL back to normal)
    finalize_dns_change
}
```

---

## Health Monitoring

### Real-Time Health Checks

```bash
#!/bin/bash
# real-time-health-monitoring.sh

DURATION=${1:-60}  # minutes
INTERVAL=${2:-30}  # seconds

end_time=$(($(date +%s) + DURATION * 60))

echo "Starting real-time health monitoring for $DURATION minutes"
echo "Check interval: $INTERVAL seconds"
echo "Monitoring started at: $(date)"

while [ $(date +%s) -lt $end_time ]; do
    timestamp=$(date)
    
    # Check service health
    api_health=$(curl -s -o /dev/null -w "%{http_code}" https://api.insurance-lead-gen.com/health)
    frontend_health=$(curl -s -o /dev/null -w "%{http_code}" https://insurance-lead-gen.com/health)
    
    # Check database connectivity
    db_healthy=$(kubectl exec -n production deployment/api -- npm run db:health | grep -c "healthy" || echo "0")
    
    # Check error rates
    api_error_rate=$(get_error_rate "api")
    backend_error_rate=$(get_error_rate "backend")
    
    # Check response times
    api_response_time=$(curl -w "%{time_total}" -s -o /dev/null https://api.insurance-lead-gen.com/health)
    frontend_response_time=$(curl -w "%{time_total}" -s -o /dev/null https://insurance-lead-gen.com/health)
    
    # Check pod status
    failed_pods=$(kubectl get pods -n production --no-headers | grep -c "0/\|Error\|CrashLoop" || echo "0")
    
    # Log health status
    echo "[$timestamp] Health Status:"
    echo "  API Health: $api_health (${api_response_time}s)"
    echo "  Frontend Health: $frontend_health (${frontend_response_time}s)"
    echo "  Database: $db_healthy connections"
    echo "  API Error Rate: $api_error_rate"
    echo "  Backend Error Rate: $backend_error_rate"
    echo "  Failed Pods: $failed_pods"
    
    # Alert if critical issues detected
    if [ "$api_health" != "200" ]; then
        echo "ALERT: API health check failed!"
        send_alert "CRITICAL: API health check failed"
    fi
    
    if [ "$frontend_health" != "200" ]; then
        echo "ALERT: Frontend health check failed!"
        send_alert "CRITICAL: Frontend health check failed"
    fi
    
    if (( $(echo "$api_error_rate > 0.01" | bc -l) )); then
        echo "ALERT: High API error rate: $api_error_rate"
        send_alert "WARNING: High API error rate: $api_error_rate"
    fi
    
    if (( $(echo "$frontend_response_time > 5.0" | bc -l) )); then
        echo "ALERT: High frontend response time: ${frontend_response_time}s"
        send_alert "WARNING: High frontend response time: ${frontend_response_time}s"
    fi
    
    if [ "$failed_pods" -gt "0" ]; then
        echo "ALERT: Failed pods detected: $failed_pods"
        send_alert "WARNING: Failed pods detected: $failed_pods"
    fi
    
    echo "---"
    sleep $INTERVAL
done

echo "Health monitoring completed at $(date)"

get_error_rate() {
    local service=$1
    kubectl exec -n production deployment/prometheus -- \
      promtool query instant "rate(http_requests_total{service=\"$service\",status=~\"5..\"}[5m])" | \
      jq -r '.data.result[0].value[1] // "0"'
}

send_alert() {
    local message=$1
    curl -X POST https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK \
      -H 'Content-type: application/json' \
      --data "{\"text\":\"🚨 $message\"}"
}
```

### Grafana Dashboard Monitoring

```bash
# Setup deployment monitoring dashboard
setup_deployment_dashboard() {
    cat << 'EOF' > deployment-dashboard.json
{
  "dashboard": {
    "title": "Production Deployment Monitoring",
    "tags": ["deployment", "production"],
    "panels": [
      {
        "title": "API Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service=\"api\"}[5m]))",
            "legendFormat": "P95 Response Time"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket{service=\"api\"}[5m]))",
            "legendFormat": "P50 Response Time"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph", 
        "targets": [
          {
            "expr": "rate(http_requests_total{service=\"api\",status=~\"5..\"}[5m]) / rate(http_requests_total{service=\"api\"}[5m]) * 100",
            "legendFormat": "Error Rate %"
          }
        ]
      },
      {
        "title": "Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "pg_stat_database_numbackends{datname=\"insurance_lead_gen\"}",
            "legendFormat": "Active Connections"
          }
        ]
      },
      {
        "title": "Pod Status",
        "type": "stat",
        "targets": [
          {
            "expr": "kube_pod_status_ready{namespace=\"production\"}",
            "legendFormat": "Ready Pods"
          }
        ]
      }
    ]
  }
}
EOF

    # Deploy dashboard via Grafana API
    echo "Deployment monitoring dashboard created"
    # kubectl create configmap grafana-deployment-dashboard --from-file=deployment-dashboard.json -n monitoring
}

# Real-time dashboard monitoring
monitor_dashboard() {
    echo "Opening Grafana dashboard for monitoring..."
    kubectl port-forward -n monitoring svc/grafana 3000:3000 &
    
    echo "Dashboard available at: http://localhost:3000"
    echo "Key panels to monitor:"
    echo "  1. API Response Time (should be < 200ms P95)"
    echo "  2. Error Rate (should be < 0.1%)"
    echo "  3. Database Connections (should be < 80% of pool)"
    echo "  4. Pod Status (all should be Ready)"
    
    echo "Press Ctrl+C to stop monitoring"
    read -p "Continue monitoring? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Keep monitoring open
        while true; do
            sleep 60
            echo "Still monitoring at $(date)"
        done
    fi
}
```

---

## Rollback Triggers

### Automatic Rollback Conditions

```bash
#!/bin/bash
# rollback-triggers.sh

# Define rollback thresholds
ERROR_RATE_THRESHOLD=0.01  # 1%
RESPONSE_TIME_THRESHOLD=5.0  # 5 seconds
POD_FAILURE_THRESHOLD=2  # More than 2 failed pods
DATABASE_ERROR_THRESHOLD=0.001  # 0.1%

# Monitor for rollback conditions
monitor_rollback_conditions() {
    echo "Monitoring for rollback conditions..."
    
    while true; do
        # Check error rate
        API_ERROR_RATE=$(get_error_rate "api")
        BACKEND_ERROR_RATE=$(get_error_rate "backend")
        
        # Check response times
        API_RESPONSE_TIME=$(get_response_time "api")
        FRONTEND_RESPONSE_TIME=$(get_response_time "frontend")
        
        # Check pod failures
        FAILED_PODS=$(kubectl get pods -n production --no-headers | grep -c "0/\|Error\|CrashLoop" || echo "0")
        
        # Check database errors
        DB_ERROR_RATE=$(get_database_error_rate)
        
        echo "Current metrics:"
        echo "  API Error Rate: $API_ERROR_RATE"
        echo "  Backend Error Rate: $BACKEND_ERROR_RATE"
        echo "  API Response Time: ${API_RESPONSE_TIME}s"
        echo "  Frontend Response Time: ${FRONTEND_RESPONSE_TIME}s"
        echo "  Failed Pods: $FAILED_PODS"
        echo "  Database Error Rate: $DB_ERROR_RATE"
        
        # Check rollback conditions
        if (( $(echo "$API_ERROR_RATE > $ERROR_RATE_THRESHOLD" | bc -l) )); then
            echo "ROLLBACK TRIGGER: High API error rate: $API_ERROR_RATE"
            trigger_rollback "High API error rate: $API_ERROR_RATE"
            break
        fi
        
        if (( $(echo "$BACKEND_ERROR_RATE > $ERROR_RATE_THRESHOLD" | bc -l) )); then
            echo "ROLLBACK TRIGGER: High backend error rate: $BACKEND_ERROR_RATE"
            trigger_rollback "High backend error rate: $BACKEND_ERROR_RATE"
            break
        fi
        
        if (( $(echo "$API_RESPONSE_TIME > $RESPONSE_TIME_THRESHOLD" | bc -l) )); then
            echo "ROLLBACK TRIGGER: High API response time: ${API_RESPONSE_TIME}s"
            trigger_rollback "High API response time: ${API_RESPONSE_TIME}s"
            break
        fi
        
        if (( $(echo "$FRONTEND_RESPONSE_TIME > $RESPONSE_TIME_THRESHOLD" | bc -l) )); then
            echo "ROLLBACK TRIGGER: High frontend response time: ${FRONTEND_RESPONSE_TIME}s"
            trigger_rollback "High frontend response time: ${FRONTEND_RESPONSE_TIME}s"
            break
        fi
        
        if [ "$FAILED_PODS" -gt "$POD_FAILURE_THRESHOLD" ]; then
            echo "ROLLBACK TRIGGER: Too many failed pods: $FAILED_PODS"
            trigger_rollback "Too many failed pods: $FAILED_PODS"
            break
        fi
        
        if (( $(echo "$DB_ERROR_RATE > $DATABASE_ERROR_THRESHOLD" | bc -l) )); then
            echo "ROLLBACK TRIGGER: High database error rate: $DB_ERROR_RATE"
            trigger_rollback "High database error rate: $DB_ERROR_RATE"
            break
        fi
        
        sleep 30  # Check every 30 seconds
    done
}

get_error_rate() {
    local service=$1
    kubectl exec -n production deployment/prometheus -- \
      promtool query instant "rate(http_requests_total{service=\"$service\",status=~\"5..\"}[5m])" | \
      jq -r '.data.result[0].value[1] // "0"'
}

get_response_time() {
    local service=$1
    kubectl exec -n production deployment/prometheus -- \
      promtool query instant "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service=\"$service\"}[5m]))" | \
      jq -r '.data.result[0].value[1] // "0"'
}

get_database_error_rate() {
    kubectl exec -n production deployment/postgres -- \
      psql -U postgres -d insurance_lead_gen -t -c \
      "SELECT COALESCE(SUM(CASE WHEN state = 'active' AND query LIKE '%ERROR%' THEN 1 ELSE 0 END)::float / COUNT(*), 0) FROM pg_stat_activity;" | \
      xargs
}

# Start monitoring in background
monitor_rollback_conditions &
MONITOR_PID=$!
```

### Manual Rollback Triggers

```bash
# Manual rollback decision points
manual_rollback_triggers() {
    echo "Manual rollback triggers:"
    echo "  1. Customer-reported critical issues"
    echo "  2. Business logic errors affecting revenue"
    echo "  3. Security vulnerabilities discovered"
    echo "  4. Data integrity issues"
    echo "  5. Regulatory compliance issues"
    echo "  6. Integration failures with third-party services"
    echo ""
    echo "Rollback decision matrix:"
    echo "  SEV-1 (Critical): Immediate rollback"
    echo "  SEV-2 (High): Rollback within 15 minutes"
    echo "  SEV-3 (Medium): Evaluate and decide within 1 hour"
    echo "  SEV-4 (Low): Monitor and fix in next release"
}

# Emergency rollback command
emergency_rollback() {
    local reason=${1:-"Manual emergency rollback"}
    
    echo "========================================="
    echo "EMERGENCY ROLLBACK INITIATED"
    echo "========================================="
    echo "Reason: $reason"
    echo "Initiated by: $USER"
    echo "Time: $(date)"
    echo "========================================="
    
    # Notify team immediately
    curl -X POST https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK \
      -H 'Content-type: application/json' \
      --data "{
        \"text\": \"🚨 EMERGENCY ROLLBACK INITIATED\",
        \"attachments\": [{\n          \"color\": \"danger\",\n          \"fields\": [\n            {\"title\": \"Reason\", \"value\": \"$reason\", \"short\": true},\n            {\"title\": \"Initiated By\", \"value\": \"$USER\", \"short\": true},\n            {\"title\": \"Time\", \"value\": \"$(date)\", \"short\": false}\n          ]\n        }]\n      }"
    
    # Immediate rollback
    echo "Initiating immediate rollback..."
    helm rollback insurance-lead-gen 1 -n production
    
    # If Helm rollback fails, use kubectl
    if [ $? -ne 0 ]; then
        echo "Helm rollback failed, using kubectl..."
        kubectl rollout undo deployment/api -n production
        kubectl rollout undo deployment/backend -n production
        kubectl rollout undo deployment/frontend -n production
    fi
    
    # Database rollback if needed
    echo "Checking if database rollback is needed..."
    read -p "Do you need to rollback database migrations? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Rolling back database migrations..."
        kubectl exec -n production deployment/api -- npm run db:migrate:rollback
    fi
    
    # Verify rollback
    echo "Verifying rollback..."
    sleep 30
    kubectl get pods -n production
    curl -f https://api.insurance-lead-gen.com/health --max-time 10
    
    echo "========================================="
    echo "EMERGENCY ROLLBACK COMPLETED"
    echo "========================================="
    
    # Post-rollback actions
    post_rollback_actions
}

post_rollback_actions() {
    echo "Post-rollback actions:"
    echo "  1. Verify all services are healthy"
    echo "  2. Check error rates and response times"
    echo "  3. Notify stakeholders of resolution"
    echo "  4. Document root cause"
    echo "  5. Schedule post-mortem if SEV-1"
    echo "  6. Update incident tracking system"
    
    # Create incident record
    cat << EOF > incident-$(date +%Y%m%d-%H%M).md
# Incident Report - Rollback $(date +%Y%m%d-%H%M)

**Severity**: SEV-1 (Critical)
**Type**: Production Rollback
**Status**: Resolved
**Duration**: Approximately 15 minutes

## Summary
Emergency rollback initiated due to: $reason

## Timeline
- $(date): Deployment started
- $(date): Issues detected
- $(date): Rollback initiated  
- $(date): Rollback completed

## Root Cause
To be determined in post-mortem

## Resolution
Rolled back to previous stable version

## Action Items
- [ ] Root cause analysis
- [ ] Fix deployment pipeline
- [ ] Improve monitoring
- [ ] Update runbooks
EOF
}
```

---

## Post-Deployment Validation

### Comprehensive Validation Script

```bash
#!/bin/bash
# post-deployment-validation.sh

set -e

echo "========================================="
echo "POST-DEPLOYMENT VALIDATION"
echo "========================================="
echo "Started at: $(date)"
echo "========================================="

# Validation results
VALIDATION_PASSED=true

# 1. Service Health Validation
echo ">>> 1. Service Health Validation"
echo "Checking service endpoints..."

SERVICES=(
    "https://api.insurance-lead-gen.com/health"
    "https://insurance-lead-gen.com/health"
    "https://api.insurance-lead-gen.com/metrics"
    "https://api.insurance-lead-gen.com/api/v1/leads"
)

for service in "${SERVICES[@]}"; do
    echo "Checking $service"
    if curl -f "$service" --max-time 10; then
        echo "✅ $service - OK"
    else
        echo "❌ $service - FAILED"
        VALIDATION_PASSED=false
    fi
done

# 2. Pod Status Validation
echo ""
echo ">>> 2. Pod Status Validation"
FAILED_PODS=$(kubectl get pods -n production --no-headers | grep -E "0/.*|Error|CrashLoop" | wc -l)
if [ "$FAILED_PODS" -eq "0" ]; then
    echo "✅ All pods are running"
    kubectl get pods -n production
else
    echo "❌ Found $FAILED_PODS failed pods"
    kubectl get pods -n production | grep -E "0/.*|Error|CrashLoop"
    VALIDATION_PASSED=false
fi

# 3. Database Validation
echo ""
echo ">>> 3. Database Validation"
echo "Checking database connectivity and operations..."

# Test database connection
if kubectl exec -n production deployment/api -- npm run db:health | grep -q "healthy"; then
    echo "✅ Database connection healthy"
else
    echo "❌ Database connection failed"
    VALIDATION_PASSED=false
fi

# Test database operations
if kubectl exec -n production deployment/api -- npm run db:test-operations; then
    echo "✅ Database operations working"
else
    echo "❌ Database operations failed"
    VALIDATION_PASSED=false
fi

# 4. Functional Testing
echo ""
echo ">>> 4. Functional Testing"
echo "Running smoke tests..."

if npm run test:smoke -- --baseUrl=https://api.insurance-lead-gen.com; then
    echo "✅ Smoke tests passed"
else
    echo "❌ Smoke tests failed"
    VALIDATION_PASSED=false
fi

# 5. Performance Validation
echo ""
echo ">>> 5. Performance Validation"
echo "Checking performance metrics..."

# Response time check
API_RESPONSE_TIME=$(curl -w "%{time_total}" -s -o /dev/null https://api.insurance-lead-gen.com/health)
if (( $(echo "$API_RESPONSE_TIME < 2.0" | bc -l) )); then
    echo "✅ API response time: ${API_RESPONSE_TIME}s (acceptable)"
else
    echo "❌ API response time too high: ${API_RESPONSE_TIME}s"
    VALIDATION_PASSED=false
fi

# Error rate check
ERROR_RATE=$(get_error_rate "api")
if (( $(echo "$ERROR_RATE < 0.01" | bc -l) )); then
    echo "✅ API error rate: $ERROR_RATE (acceptable)"
else
    echo "❌ API error rate too high: $ERROR_RATE"
    VALIDATION_PASSED=false
fi

# 6. Integration Testing
echo ""
echo ">>> 6. Integration Testing"
echo "Testing key user flows..."

# Test lead creation flow
LEAD_RESPONSE=$(curl -s -X POST https://api.insurance-lead-gen.com/api/v1/leads \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","phone":"555-0123"}')

if echo "$LEAD_RESPONSE" | grep -q '"id"'; then
    echo "✅ Lead creation flow working"
    LEAD_ID=$(echo "$LEAD_RESPONSE" | jq -r '.id')
    
    # Clean up test lead
    curl -X DELETE https://api.insurance-lead-gen.com/api/v1/leads/$LEAD_ID
else
    echo "❌ Lead creation flow failed"
    VALIDATION_PASSED=false
fi

# 7. Security Validation
echo ""
echo ">>> 7. Security Validation"
echo "Checking security configurations..."

# Check if HTTPS is enforced
HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://api.insurance-lead-gen.com/health)
if [ "$HTTP_RESPONSE" = "301" ] || [ "$HTTP_RESPONSE" = "308" ]; then
    echo "✅ HTTPS redirection working"
else
    echo "❌ HTTPS redirection not working (HTTP response: $HTTP_RESPONSE)"
    VALIDATION_PASSED=false
fi

# 8. Monitoring Validation
echo ""
echo ">>> 8. Monitoring Validation"
echo "Checking monitoring and alerting..."

# Check if metrics are being collected
if kubectl exec -n production deployment/prometheus -- \
  promtool query instant 'up{job="api"}' | grep -q "1"; then
    echo "✅ Metrics collection working"
else
    echo "❌ Metrics collection failed"
    VALIDATION_PASSED=false
fi

# Check alerting
if kubectl get servicemonitors -n production | grep -q "api"; then
    echo "✅ Service monitoring configured"
else
    echo "❌ Service monitoring not configured"
    VALIDATION_PASSED=false
fi

# 9. Log Validation
echo ""
echo ">>> 9. Log Validation"
echo "Checking application logs..."

ERROR_COUNT=$(kubectl logs -n production -l app=api --tail=1000 | grep -c "ERROR" || echo "0")
if [ "$ERROR_COUNT" -lt "10" ]; then
    echo "✅ Log errors within acceptable range ($ERROR_COUNT errors)"
else
    echo "❌ Too many errors in logs ($ERROR_COUNT errors)"
    VALIDATION_PASSED=false
fi

# Final validation result
echo ""
echo "========================================="
echo "VALIDATION SUMMARY"
echo "========================================="

if [ "$VALIDATION_PASSED" = true ]; then
    echo "✅ ALL VALIDATIONS PASSED"
    echo "Deployment validation successful!"
    
    # Notify success
    curl -X POST https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK \
      -H 'Content-type: application/json' \
      --data "{
        \"text\": \"✅ Production deployment validation PASSED\",
        \"attachments\": [{\n          \"color\": \"good\",\n          \"fields\": [\n            {\"title\": \"Time\", \"value\": \"$(date)\", \"short\": true},\n            {\"title\": \"Validated By\", \"value\": \"$USER\", \"short\": true}\n          ]\n        }]\n      }"
else
    echo "❌ VALIDATION FAILED"
    echo "Some validations failed - review above output"
    
    # Notify failure
    curl -X POST https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK \
      -H 'Content-type: application/json' \
      --data "{
        \"text\": \"❌ Production deployment validation FAILED\",
        \"attachments\": [{\n          \"color\": \"danger\",\n          \"fields\": [\n            {\"title\": \"Time\", \"value\": \"$(date)\", \"short\": true},\n            {\"title\": \"Validated By\", \"value\": \"$USER\", \"short\": true}\n          ]\n        }]\n      }"
    exit 1
fi

echo "========================================="
echo "Validation completed at: $(date)"
echo "========================================="

get_error_rate() {
    local service=$1
    kubectl exec -n production deployment/prometheus -- \
      promtool query instant "rate(http_requests_total{service=\"$service\",status=~\"5..\"}[5m])" | \
      jq -r '.data.result[0].value[1] // "0"'
}
```

---

## Emergency Procedures

### Complete System Failure

```bash
#!/bin/bash
# emergency-failure-response.sh

SEVERITY=${1:-SEV1}
REASON=${2:-"Unknown system failure"}

echo "========================================="
echo "EMERGENCY RESPONSE ACTIVATED"
echo "========================================="
echo "Severity: $SEVERITY"
echo "Reason: $REASON"
echo "Time: $(date)"
echo "Responder: $USER"
echo "========================================="

# Immediate response based on severity
case $SEVERITY in
    "SEV1")
        echo "SEV-1 Response: Complete system failure"
        echo "Actions: Immediate rollback, all-hands response"
        emergency_rollback "$REASON"
        ;;
    "SEV2")
        echo "SEV-2 Response: Major functionality failure"
        echo "Actions: 15-minute response, rollback if needed"
        echo "Starting investigation..."
        investigate_issue
        ;;
    "SEV3")
        echo "SEV-3 Response: Partial functionality issues"
        echo "Actions: 1-hour response, planned fix"
        echo "Logging incident for tracking"
        log_incident "$REASON"
        ;;
    *)
        echo "Unknown severity level: $SEVERITY"
        exit 1
        ;;
esac

investigate_issue() {
    echo "Investigating issue..."
    
    # Check cluster health
    echo "Checking cluster health..."
    kubectl get nodes
    kubectl get pods --all-namespaces | grep -E "Error|CrashLoop"
    
    # Check recent deployments
    echo "Checking recent deployments..."
    helm history -n production
    kubectl get events -n production --sort-by='.lastTimestamp' | tail -20
    
    # Check resource usage
    echo "Checking resource usage..."
    kubectl top nodes
    kubectl top pods -n production
    
    # Check logs for errors
    echo "Checking application logs..."
    kubectl logs -n production -l app=api --tail=100 | grep ERROR
    kubectl logs -n production -l app=backend --tail=100 | grep ERROR
    
    echo "Investigation completed"
}

log_incident() {
    local reason=$1
    local incident_id="INC-$(date +%Y%m%d-%H%M)"
    
    echo "Creating incident record: $incident_id"
    
    cat << EOF > incidents/$incident_id.md
# Incident Report - $incident_id

**Severity**: $SEVERITY
**Status**: Investigating
**Reported**: $(date)
**Reported By**: $USER

## Summary
$reason

## Impact
- Services affected: TBD
- Customer impact: TBD
- Duration: Ongoing

## Timeline
- $(date): Issue detected
- $(date): Investigation started

## Actions Taken
- [ ] Issue investigation initiated
- [ ] Team notifications sent
- [ ] Root cause analysis started

## Next Steps
- [ ] Complete root cause analysis
- [ ] Implement fix
- [ ] Validate solution
- [ ] Post-incident review

## Communications
- Slack: #incidents
- PagerDuty: SEV-$SEVERITY incident
EOF
    
    echo "Incident logged: $incident_id"
}

# Emergency communication
send_emergency_communication() {
    local severity=$1
    local message=$2
    
    # Slack notification
    curl -X POST https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK \
      -H 'Content-type: application/json' \
      --data "{
        \"text\": \"🚨 EMERGENCY: $severity - $message\",
        \"attachments\": [{\n          \"color\": \"danger\",\n          \"fields\": [\n            {\"title\": \"Severity\", \"value\": \"$severity\", \"short\": true},\n            {\"title\": \"Responder\", \"value\": \"$USER\", \"short\": true},\n            {\"title\": \"Time\", \"value\": \"$(date)\", \"short\": false}\n          ]\n        }]\n      }"
    
    # PagerDuty escalation (if applicable)
    # This would integrate with PagerDuty API
    echo "Emergency communication sent"
}

# Start emergency response
send_emergency_communication "$SEVERITY" "$REASON"

case $SEVERITY in
    "SEV1")
        # For SEV-1, immediately rollback and page all hands
        echo "SEV-1: Page all hands and rollback immediately"
        # pagerduty-trigger-severity-1.sh
        ;;
    "SEV2")
        # For SEV-2, page on-call and start investigation
        echo "SEV-2: Page on-call and investigate"
        # pagerduty-trigger-severity-2.sh
        ;;
    "SEV3")
        # For SEV-3, log incident and schedule investigation
        echo "SEV-3: Log incident and schedule investigation"
        ;;
esac
```

---

## Quick Reference

### Emergency Commands
```bash
# Emergency rollback
emergency_rollback "Manual emergency trigger"

# Check system status
kubectl get pods -n production
curl https://api.insurance-lead-gen.com/health

# View recent errors
kubectl logs -n production -l app=api --tail=100 | grep ERROR

# Emergency scale down
kubectl scale deployment --all -n production --replicas=0

# Database emergency
kubectl exec -n production deployment/postgres -- psql -U postgres
```

### Critical URLs
- **API Health**: https://api.insurance-lead-gen.com/health
- **Frontend Health**: https://insurance-lead-gen.com/health
- **Grafana**: http://localhost:3000 (port-forward)
- **Prometheus**: http://localhost:9090 (port-forward)
- **Kubernetes Dashboard**: https://k8s-dashboard.company.com

### Emergency Contacts
- **Primary On-call**: +1-555-ONCALL-1
- **Secondary On-call**: +1-555-ONCALL-2  
- **Platform Lead**: +1-555-PLATFORM-1
- **Security Team**: +1-555-SECURITY-1
- **CTO**: +1-555-CTO-1

### Escalation Matrix
1. **Level 1**: On-call Engineer (0-15 min response)
2. **Level 2**: Platform Team Lead (15-30 min response)
3. **Level 3**: Engineering Manager (30-60 min response)
4. **Level 4**: Director of Engineering (1-2 hour response)
5. **Level 5**: CTO (2+ hour response)
