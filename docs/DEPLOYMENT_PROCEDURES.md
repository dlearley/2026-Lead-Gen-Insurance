# Deployment Procedures & Runbooks

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Development Deployment](#development-deployment)
3. [Staging Deployment](#staging-deployment)
4. [Production Deployment](#production-deployment)
5. [Blue-Green Deployment](#blue-green-deployment)
6. [Canary Deployment](#canary-deployment)
7. [Rollback Procedures](#rollback-procedures)
8. [Post-Deployment Verification](#post-deployment-verification)
9. [Communication Templates](#communication-templates)

---

## Pre-Deployment Checklist

### Code Quality & Security
- [ ] **Code Review Completed**: All PRs reviewed and approved by at least 2 team members
- [ ] **Tests Passing**: All unit tests, integration tests, and E2E tests passing
- [ ] **Security Scan Passed**: Snyk/CodeQL scan shows no critical vulnerabilities
- [ ] **Dependency Audit**: No known security vulnerabilities in dependencies
- [ ] **Performance Baseline Met**: Load testing shows no regression in performance
- [ ] **Changelog Updated**: All changes documented in CHANGELOG.md
- [ ] **Documentation Updated**: Runbooks and procedures updated if needed

### Environment Validation
- [ ] **Staging Deployment Successful**: Recent deployment to staging completed without issues
- [ ] **Load Tests Passed**: Performance tests against staging environment
- [ ] **Database Migrations Tested**: All migrations applied successfully in staging
- [ ] **Environment Configuration**: All environment variables and secrets configured
- [ ] **External Dependencies**: All third-party services tested and available

### Risk Assessment & Planning
- [ ] **Rollback Plan Documented**: Step-by-step rollback procedure documented
- [ ] **Change Risk Assessment**: Risk level documented (Low/Medium/High)
- [ ] **Team Notified**: All relevant team members notified of deployment
- [ ] **On-Call Assigned**: Primary and secondary on-call engineers assigned
- [ ] **Deployment Window Confirmed**: Deployment scheduled during appropriate window

### Infrastructure Readiness
- [ ] **Infrastructure Ready**: All required infrastructure resources available
- [ ] **Monitoring Dashboards Open**: Grafana dashboards ready for monitoring
- [ ] **Alert Rules Active**: All relevant alert rules enabled and tested
- [ ] **Communications Channel Open**: Slack/Teams channel for real-time updates
- [ ] **Backups Current**: Latest database and application backups verified

---

## Development Deployment

### Quick Local Deployment

```bash
# Clone repository
git clone https://github.com/company/insurance-lead-gen.git
cd insurance-lead-gen

# Install dependencies
npm install
pnpm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with local configuration

# Start development services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Start application services
npm run dev:api
npm run dev:backend
npm run dev:frontend

# Verify deployment
curl http://localhost:3000/health
```

### Development Database Setup

```bash
# Start database
docker-compose up -d postgres redis

# Run migrations
npm run db:migrate

# Seed development data
npm run db:seed

# Verify setup
npm run db:status
```

### Common Development Issues

#### Port Already in Use
```bash
# Find process using port
lsof -i :3000
# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev:api
```

#### Database Connection Issues
```bash
# Check database container
docker-compose ps postgres

# Reset database
docker-compose down postgres
docker volume rm insurance-lead-gen_postgres-data
docker-compose up -d postgres
npm run db:migrate
```

#### Dependencies Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## Staging Deployment

### Staging Environment Setup

```bash
# Connect to staging cluster
kubectl config use-context staging

# Verify cluster access
kubectl cluster-info
kubectl get nodes

# Check current deployments
helm list -n staging
```

### Staging Deployment Procedure

```bash
# 1. Update to latest main branch
git checkout main
git pull origin main

# 2. Build application images
docker build -t api-staging:latest -f apps/api/Dockerfile apps/api/
docker build -t backend-staging:latest -f apps/backend/Dockerfile apps/backend/
docker build -t frontend-staging:latest -f apps/frontend/Dockerfile apps/frontend/

# 3. Push images to registry
docker push api-staging:latest
docker push backend-staging:latest
docker push frontend-staging:latest

# 4. Deploy using Helm
helm upgrade --install insurance-lead-gen-staging ./deploy/helm/insurance-lead-gen \
  --namespace staging \
  --values ./deploy/helm/insurance-lead-gen/values.staging.yaml \
  --wait \
  --timeout 10m

# 5. Run database migrations
kubectl exec -n staging deployment/api -- npm run db:migrate

# 6. Verify deployment
kubectl get pods -n staging
kubectl get services -n staging
```

### Staging-Specific Configuration

**Environment Variables:**
```bash
DATABASE_URL=postgresql://staging_user:password@staging-db:5432/insurance_lead_gen_staging
REDIS_URL=redis://staging-redis:6379
NODE_ENV=staging
API_BASE_URL=https://api-staging.insurance-lead-gen.com
FRONTEND_URL=https://staging.insurance-lead-gen.com
```

**Resource Limits:**
```yaml
resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

### Staging Data Management

```bash
# Refresh staging data from production (anonymized)
kubectl exec -n staging deployment/api -- npm run db:refresh-staging

# Load test data
kubectl exec -n staging deployment/api -- npm run db:load-test-data

# Backup staging data
kubectl exec -n staging postgres -- pg_dump insurance_lead_gen_staging > staging-backup.sql
```

### Staging Performance Validation

```bash
# Run load tests
npm run test:load -- --baseUrl=https://api-staging.insurance-lead-gen.com

# Check performance metrics
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &
# Access http://localhost:9090 and check metrics

# Run integration tests
npm run test:integration -- --baseUrl=https://api-staging.insurance-lead-gen.com
```

---

## Production Deployment

### Pre-Production Checklist

- [ ] All staging validations passed
- [ ] Security review completed
- [ ] Performance benchmarks met
- [ ] Backup strategy verified
- [ ] Rollback plan tested
- [ ] Monitoring and alerting configured
- [ ] Team notification sent

### Production Deployment Steps

```bash
# 1. Pre-deployment validation
echo "Starting production deployment at $(date)"

# 2. Create deployment branch
git checkout -b release/$(date +%Y%m%d)
git push origin release/$(date +%Y%m%d)

# 3. Tag release
git tag -a v$(node -p "require('./package.json').version") -m "Production release $(date)"
git push origin v$(node -p "require('./package.json').version")

# 4. Switch to production context
kubectl config use-context production

# 5. Verify production cluster
kubectl get nodes
kubectl get pods -n production

# 6. Build and push production images
docker build -t api-production:latest -f apps/api/Dockerfile apps/api/
docker build -t backend-production:latest -f apps/backend/Dockerfile apps/backend/
docker build -t frontend-production:latest -f apps/frontend/Dockerfile apps/frontend/

docker tag api-production:latest registry.company.com/insurance-lead-gen/api:$(date +%Y%m%d)
docker tag backend-production:latest registry.company.com/insurance-lead-gen/backend:$(date +%Y%m%d)
docker tag frontend-production:latest registry.company.com/insurance-lead-gen/frontend:$(date +%Y%m%d)

docker push registry.company.com/insurance-lead-gen/api:$(date +%Y%m%d)
docker push registry.company.com/insurance-lead-gen/backend:$(date +%Y%m%d)
docker push registry.company.com/insurance-lead-gen/frontend:$(date +%Y%m%d)

# 7. Pre-deployment backup
kubectl exec -n production deployment/postgres -- pg_dump insurance_lead_gen > pre-deployment-backup-$(date +%Y%m%d).sql

# 8. Deploy using Helm
helm upgrade --install insurance-lead-gen ./deploy/helm/insurance-lead-gen \
  --namespace production \
  --values ./deploy/helm/insurance-lead-gen/values.production.yaml \
  --set image.tag=$(date +%Y%m%d) \
  --wait \
  --timeout 15m

# 9. Run database migrations
kubectl exec -n production deployment/api -- npm run db:migrate

# 10. Verify deployment
echo "Verifying deployment..."
kubectl get pods -n production
kubectl get services -n production
kubectl get ingress -n production

# 11. Health checks
echo "Running health checks..."
curl -f https://api.insurance-lead-gen.com/health || exit 1
curl -f https://insurance-lead-gen.com/health || exit 1

# 12. Smoke tests
echo "Running smoke tests..."
npm run test:smoke -- --baseUrl=https://api.insurance-lead-gen.com

echo "Production deployment completed at $(date)"
```

### Production-Specific Configuration

**Production Values.yaml:**
```yaml
replicaCount: 3

image:
  repository: registry.company.com/insurance-lead-gen
  tag: "latest"

resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 2
    memory: 4Gi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

ingress:
  enabled: true
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: api.insurance-lead-gen.com
      paths: ["/"]
  tls:
    - secretName: api-tls
      hosts:
        - api.insurance-lead-gen.com

postgresql:
  enabled: true
  auth:
    database: insurance_lead_gen
    username: prod_user
  primary:
    persistence:
      enabled: true
      size: 100Gi
```

---

## Blue-Green Deployment

### Blue-Green Setup

```bash
# 1. Create blue-green namespaces
kubectl create namespace production-blue
kubectl create namespace production-green

# 2. Label namespaces for traffic management
kubectl label namespace production-blue color=blue traffic=canary
kubectl label namespace production-green color=green traffic=canary
```

### Blue-Green Deployment Process

```bash
# 1. Determine current active environment (blue or green)
CURRENT_COLOR=$(kubectl get namespace production-blue -o jsonpath='{.metadata.labels.color}' 2>/dev/null || echo "green")
NEW_COLOR="green"
if [ "$CURRENT_COLOR" = "green" ]; then
    NEW_COLOR="blue"
fi

echo "Current: $CURRENT_COLOR, Deploying to: $NEW_COLOR"

# 2. Deploy to new environment
helm upgrade --install insurance-lead-gen-$NEW_COLOR ./deploy/helm/insurance-lead-gen \
  --namespace production-$NEW_COLOR \
  --values ./deploy/helm/insurance-lead-gen/values.production.yaml \
  --set image.tag=$NEW_COLOR-$(date +%Y%m%d-%H%M) \
  --wait \
  --timeout 15m

# 3. Wait for new environment to be ready
echo "Waiting for $NEW_COLOR environment to be ready..."
kubectl rollout status deployment/api -n production-$NEW_COLOR --timeout=10m
kubectl rollout status deployment/backend -n production-$NEW_COLOR --timeout=10m

# 4. Run health checks on new environment
echo "Running health checks on $NEW_COLOR environment..."
kubectl exec -n production-$NEW_COLOR deployment/api -- curl -f http://localhost:3000/health || exit 1

# 5. Run integration tests
echo "Running integration tests..."
npm run test:integration -- --baseUrl=https://api-$NEW_COLOR.insurance-lead-gen.com

# 6. Update ingress to point to new environment
kubectl patch ingress api-ingress -n production \
  --patch='{"spec":{"rules":[{"host":"api.insurance-lead-gen.com","http":{"paths":[{"backend":{"service":{"name":"api-service","port":{"number":80}}},"path":"/","pathType":"Prefix"}}]}}}'

# 7. Monitor traffic for issues
echo "Monitoring $NEW_COLOR environment for issues..."
sleep 300  # Monitor for 5 minutes

# 8. Verify no errors in logs
ERROR_COUNT=$(kubectl logs -n production-$NEW_COLOR -l app=api --tail=1000 | grep -c "ERROR" || echo "0")
if [ "$ERROR_COUNT" -gt 10 ]; then
    echo "High error rate detected: $ERROR_COUNT errors in logs"
    echo "Rolling back..."
    # Rollback to previous environment
    kubectl patch ingress api-ingress -n production \
      --patch='{"spec":{"rules":[{"host":"api.insurance-lead-gen.com","http":{"paths":[{"backend":{"service":{"name":"api-service-'$CURRENT_COLOR'","port":{"number":80}}},"path":"/","pathType":"Prefix"}}]}}}'
    exit 1
fi

# 9. Update DNS to point to new environment
# This step varies based on your DNS setup

# 10. Clean up old environment
echo "Cleaning up old $CURRENT_COLOR environment..."
helm uninstall insurance-lead-gen-$CURRENT_COLOR -n production-$CURRENT_COLOR
```

### Blue-Green Rollback

```bash
# Immediate rollback to previous environment
ROLLBACK_COLOR=$(kubectl get namespace production-blue -o jsonpath='{.metadata.labels.color}' 2>/dev/null || echo "blue")
CURRENT_COLOR=$(kubectl get namespace production-green -o jsonpath='{.metadata.labels.color}' 2>/dev/null || echo "green")

echo "Rolling back from $CURRENT_COLOR to $ROLLBACK_COLOR"

# Update ingress back to previous environment
kubectl patch ingress api-ingress -n production \
  --patch='{"spec":{"rules":[{"host":"api.insurance-lead-gen.com","http":{"paths":[{"backend":{"service":{"name":"api-service-'$ROLLBACK_COLOR'","port":{"number":80}}},"path":"/","pathType":"Prefix"}}]}}}'

# Verify rollback
sleep 30
kubectl get pods -n production-$ROLLBACK_COLOR
curl -f https://api.insurance-lead-gen.com/health
```

---

## Canary Deployment

### Canary Deployment Strategy

```bash
# 1. Deploy canary version with 5% traffic
CANARY_VERSION=$(date +%Y%m%d-%H%M)

# Deploy canary
helm upgrade --install insurance-lead-gen-canary ./deploy/helm/insurance-lead-gen \
  --namespace production \
  --values ./deploy/helm/insurance-lead-gen/values.production.yaml \
  --set image.tag=$CANARY_VERSION \
  --set canary.enabled=true \
  --set canary.traffic=5 \
  --wait \
  --timeout 10m

# 2. Monitor canary for 30 minutes
echo "Monitoring canary for 30 minutes..."
sleep 1800

# 3. Check metrics for canary
CANARY_ERROR_RATE=$(kubectl exec -n production deployment/prometheus -- promtool query instant 'rate(http_requests_total{service="api-canary",status=~"5.."}[5m])')
CANARY_LATENCY=$(kubectl exec -n production deployment/prometheus -- promtool query instant 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service="api-canary"}[5m]))')

# 4. If metrics are acceptable, increase traffic to 25%
if [ "$CANARY_ERROR_RATE" < "0.01" ] && [ "$CANARY_LATENCY" < "1.0" ]; then
    echo "Canary metrics acceptable, increasing to 25% traffic"
    kubectl patch service api-service -n production --patch '{"spec":{"selector":{"version":"canary"}}}'
    
    # Wait 1 hour
    sleep 3600
    
    # Check metrics again
    # If still good, increase to 50%
    # Continue until 100%
else
    echo "Canary metrics concerning, rolling back"
    helm uninstall insurance-lead-gen-canary -n production
    exit 1
fi

# 5. Promote canary to production
echo "Promoting canary to production"
helm upgrade --install insurance-lead-gen ./deploy/helm/insurance-lead-gen \
  --namespace production \
  --values ./deploy/helm/insurance-lead-gen/values.production.yaml \
  --set image.tag=$CANARY_VERSION \
  --set canary.enabled=false \
  --wait \
  --timeout 10m

# 6. Clean up canary
helm uninstall insurance-lead-gen-canary -n production
```

---

## Rollback Procedures

### Emergency Rollback

```bash
# 1. Immediate rollback command
echo "EMERGENCY ROLLBACK INITIATED AT $(date)"

# 2. Rollback to previous Helm release
helm rollback insurance-lead-gen 1 -n production

# 3. If Helm rollback fails, scale down current and scale up previous
kubectl scale deployment api -n production --replicas=0
kubectl scale deployment backend -n production --replicas=0

# 4. Scale up previous version
kubectl rollout undo deployment/api -n production
kubectl rollout undo deployment/backend -n production

# 5. Verify rollback
kubectl get pods -n production
kubectl rollout status deployment/api -n production --timeout=5m
kubectl rollout status deployment/backend -n production --timeout=5m

# 6. Health check
curl -f https://api.insurance-lead-gen.com/health || echo "ROLLBACK FAILED"

# 7. Notify team
echo "ROLLBACK COMPLETED AT $(date)" | tee /tmp/rollback-notification.txt
```

### Database Rollback

```bash
# 1. Stop application traffic
kubectl scale deployment api -n production --replicas=0
kubectl scale deployment backend -n production --replicas=0

# 2. Backup current state
kubectl exec -n production deployment/postgres -- pg_dump insurance_lead_gen > rollback-point-$(date +%Y%m%d-%H%M).sql

# 3. Restore from pre-deployment backup
kubectl exec -i -n production deployment/postgres -- psql -U postgres insurance_lead_gen < pre-deployment-backup-$(date +%Y%m%d).sql

# 4. Run rollback migrations (if any)
kubectl exec -n production deployment/api -- npm run db:migrate:rollback

# 5. Verify data integrity
kubectl exec -n production deployment/postgres -- psql -U postgres -c "SELECT count(*) FROM leads;"
kubectl exec -n production deployment/postgres -- psql -U postgres -c "SELECT count(*) FROM customers;"

# 6. Restart applications
kubectl scale deployment api -n production --replicas=3
kubectl scale deployment backend -n production --replicas=3

# 7. Verify applications start successfully
sleep 60
curl -f https://api.insurance-lead-gen.com/health
```

### Partial Rollback (Specific Service)

```bash
# Rollback only API service
helm rollback api-service 1 -n production

# Rollback only database migration
kubectl exec -n production deployment/api -- npm run db:migrate:rollback

# Rollback specific Helm chart component
helm rollback redis 1 -n production
```

---

## Post-Deployment Verification

### Automated Verification Script

```bash
#!/bin/bash
# post-deployment-verification.sh

DEPLOYMENT_START=$(date +%s)
DEPLOYMENT_TIMEOUT=1800  # 30 minutes

echo "Starting post-deployment verification at $(date)"

# 1. Check all pods are running
echo ">>> Checking pod status"
kubectl get pods -n production | grep -E "(0/.*|Error|CrashLoop)" && exit 1

# 2. Check service endpoints
echo ">>> Checking service endpoints"
kubectl get endpoints -n production | grep "<none>" && exit 1

# 3. Health checks
echo ">>> Running health checks"
HEALTH_ENDPOINTS=(
    "https://api.insurance-lead-gen.com/health"
    "https://insurance-lead-gen.com/health"
    "https://api.insurance-lead-gen.com/metrics"
)

for endpoint in "${HEALTH_ENDPOINTS[@]}"; do
    echo "Checking $endpoint"
    if ! curl -f "$endpoint" --max-time 10; then
        echo "Health check failed for $endpoint"
        exit 1
    fi
done

# 4. Functional tests
echo ">>> Running functional tests"
npm run test:smoke -- --baseUrl=https://api.insurance-lead-gen.com || exit 1

# 5. Database connectivity
echo ">>> Checking database connectivity"
kubectl exec -n production deployment/api -- npm run db:test-connection || exit 1

# 6. Check for errors in logs
echo ">>> Checking for errors in recent logs"
ERROR_COUNT=$(kubectl logs -n production -l app=api --tail=1000 | grep -c "ERROR" || echo "0")
if [ "$ERROR_COUNT" -gt 5 ]; then
    echo "High error count in logs: $ERROR_COUNT"
    exit 1
fi

# 7. Check key metrics
echo ">>> Checking key metrics"
# Check API response time
RESPONSE_TIME=$(curl -w "%{time_total}" -s -o /dev/null https://api.insurance-lead-gen.com/health)
if (( $(echo "$RESPONSE_TIME > 2.0" | bc -l) )); then
    echo "High response time: $RESPONSE_TIME"
    exit 1
fi

# 8. Monitor for 5 minutes
echo ">>> Monitoring for 5 minutes"
sleep 300

# 9. Final health check
echo ">>> Final health check"
curl -f https://api.insurance-lead-gen.com/health || exit 1

DEPLOYMENT_END=$(date +%s)
DEPLOYMENT_DURATION=$((DEPLOYMENT_END - DEPLOYMENT_START))

echo "Post-deployment verification completed successfully in ${DEPLOYMENT_DURATION} seconds"
echo "Deployment verification passed at $(date)"
```

### Manual Verification Checklist

- [ ] **API Health**: All API endpoints responding normally
- [ ] **Frontend**: Application loads and renders correctly
- [ ] **Database**: CRUD operations working correctly
- [ ] **Cache**: Redis operations functioning
- [ ] **Authentication**: Login/logout working
- [ ] **Core Features**: Lead generation, customer management working
- [ ] **File Uploads**: Document processing functional
- [ ] **Email/SMS**: Notifications sending correctly
- [ ] **Background Jobs**: Queue processing working
- [ ] **External Integrations**: Third-party services connecting

---

## Communication Templates

### Pre-Deployment Notification

```markdown
# 🚀 Production Deployment Starting

**Deployment Details:**
- **Service**: Insurance Lead Gen Platform
- **Version**: v{VERSION}
- **Environment**: Production
- **Deployment Time**: {TIMESTAMP}
- **Estimated Duration**: 30-45 minutes

**Changes Included:**
- {CHANGES_LIST}

**Deployment Team:**
- Primary: {PRIMARY_ENGINEER}
- Secondary: {SECONDARY_ENGINEER}
- On-call: {ONCALL_ENGINEER}

**Rollback Plan:**
- Rollback procedure documented in: `docs/DEPLOYMENT_PROCEDURES.md`
- Estimated rollback time: 10-15 minutes

**Communication Channels:**
- Slack: #deployments
- Incident Channel: #incidents
- PagerDuty: On-call rotation

We will provide updates every 15 minutes during the deployment.
```

### Deployment In Progress

```markdown
# 🔄 Deployment In Progress

**Current Status**: {STATUS}
**Progress**: {PROGRESS_PERCENTAGE}%
**Time Elapsed**: {TIME_ELAPSED}
**Time Remaining**: {TIME_REMAINING}

**Current Step**: {CURRENT_STEP}

**Next Steps**:
- {NEXT_STEPS}

**Monitoring**: All systems normal, no alerts triggered.

Next update in 15 minutes or if any issues arise.
```

### Deployment Success

```markdown
# ✅ Deployment Completed Successfully

**Deployment Summary:**
- **Service**: Insurance Lead Gen Platform
- **Version**: v{VERSION}
- **Start Time**: {START_TIME}
- **Completion Time**: {COMPLETION_TIME}
- **Total Duration**: {DURATION}
- **Status**: SUCCESS ✅

**Verification Results**:
- ✅ All pods running successfully
- ✅ Health checks passing
- ✅ Database migrations completed
- ✅ Smoke tests passed
- ✅ No errors in logs
- ✅ Performance metrics normal

**Next Steps**:
- Monitor for next 2 hours
- Complete post-deployment review
- Update documentation if needed

Thank you to the deployment team!
```

### Deployment Failed

```markdown
# ❌ Deployment Failed - Rollback Initiated

**Deployment Summary:**
- **Service**: Insurance Lead Gen Platform
- **Version**: v{VERSION}
- **Start Time**: {START_TIME}
- **Failure Time**: {FAILURE_TIME}
- **Status**: FAILED ❌ - Rollback initiated

**Issue Details**:
- **Failure Step**: {FAILURE_STEP}
- **Error**: {ERROR_MESSAGE}
- **Impact**: {IMPACT_DESCRIPTION}

**Rollback Status**:
- Rollback initiated at: {ROLLBACK_TIME}
- Rollback method: {ROLLBACK_METHOD}
- Expected completion: {ROLLBACK_COMPLETION_TIME}

**Next Steps**:
- Complete rollback verification
- Analyze failure root cause
- Plan fix and re-deployment

Incident channel: #incidents
```

### Post-Deployment Summary

```markdown
# 📊 Post-Deployment Summary Report

**Deployment**: {DEPLOYMENT_ID}
**Date**: {DATE}
**Duration**: {TOTAL_DURATION}
**Status**: {STATUS}

**Performance Metrics**:
- API Response Time: {AVG_RESPONSE_TIME}ms (baseline: {BASELINE_RESPONSE_TIME}ms)
- Error Rate: {ERROR_RATE}% (baseline: {BASELINE_ERROR_RATE}%)
- Database Query Time: {DB_QUERY_TIME}ms
- Cache Hit Rate: {CACHE_HIT_RATE}%

**Resource Usage**:
- CPU Utilization: {CPU_UTILIZATION}%
- Memory Usage: {MEMORY_USAGE}GB
- Database Connections: {DB_CONNECTIONS}

**Issues Encountered**:
- {ISSUES_LIST}

**Lessons Learned**:
- {LESSONS_LEARNED}

**Action Items**:
- {ACTION_ITEMS}

**Next Deployment**: {NEXT_DEPLOYMENT_DATE}
```

---

## Quick Reference

### Emergency Contacts
- **Primary On-call**: +1-555-ONCALL-1
- **Secondary On-call**: +1-555-ONCALL-2
- **Platform Lead**: +1-555-LEAD-1
- **Security Team**: +1-555-SEC-1

### Critical Commands
```bash
# Quick rollback
helm rollback insurance-lead-gen 1 -n production

# Scale down to stop traffic
kubectl scale deployment api -n production --replicas=0

# Check recent errors
kubectl logs -n production -l app=api --tail=100 | grep ERROR

# Emergency database restore
kubectl exec -i -n production deployment/postgres -- psql -U postgres < backup.sql
```

### Useful Links
- **Grafana**: https://grafana.insurance-lead-gen.com
- **Prometheus**: https://prometheus.insurance-lead-gen.com
- **Jaeger**: https://jaeger.insurance-lead-gen.com
- **Kubernetes Dashboard**: https://k8s-dashboard.insurance-lead-gen.com
