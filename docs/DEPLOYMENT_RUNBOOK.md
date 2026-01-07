# Deployment Runbook

## Overview

This runbook provides step-by-step procedures for deploying applications using the CI/CD pipeline, handling rollbacks, troubleshooting common issues, and managing emergency situations. It serves as the primary reference for operations engineers, DevOps teams, and incident responders.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Development Deployment](#development-deployment)
3. [Staging Deployment](#staging-deployment)
4. [Production Deployment](#production-deployment)
5. [Emergency Rollback Procedures](#emergency-rollback-procedures)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Monitoring and Health Checks](#monitoring-and-health-checks)
8. [Incident Response](#incident-response)
9. [Post-Deployment Activities](#post-deployment-activities)
10. [Emergency Contacts](#emergency-contacts)

## Pre-Deployment Checklist

### General Prerequisites

- [ ] **Code Review**: All code changes have been reviewed and approved
- [ ] **Testing**: Unit tests, integration tests, and E2E tests passing
- [ ] **Security Scan**: No critical or high vulnerabilities in dependencies
- [ ] **Documentation**: Updated relevant documentation
- [ ] **Rollback Plan**: Rollback strategy defined and tested

### Environment-Specific Checks

#### Development Environment
- [ ] **Branch**: Code merged to main branch
- [ ] **CI Pipeline**: Enhanced CI workflow completed successfully
- [ ] **Build**: Docker images built and pushed to ECR
- [ ] **Resources**: Development cluster has sufficient capacity

#### Staging Environment
- [ ] **Version**: Specific version/tag identified for deployment
- [ ] **Approval**: Tech Lead approval obtained
- [ ] **Strategy**: Deployment strategy selected (Blue-Green or Canary)
- [ ] **Backup**: Current staging environment backed up
- [ ] **Monitoring**: Monitoring dashboards prepared

#### Production Environment
- [ ] **Release**: Official release created with semantic version
- [ ] **Approvals**: Both Tech Lead and Product Manager approvals obtained
- [ ] **Change Window**: Deployment scheduled during appropriate window
- [ ] **Stakeholders**: All stakeholders notified of deployment
- [ ] **On-Call**: On-call engineer notified and available
- [ ] **Rollback**: Rollback plan reviewed and ready

### Technical Prerequisites

- [ ] **Kubernetes Access**: Valid kubeconfig with appropriate permissions
- [ ] **AWS Access**: Valid AWS credentials with ECR and EKS access
- [ ] **Secrets**: All required secrets and environment variables configured
- [ ] **Images**: Required Docker images available in ECR
- [ ] **Database**: Database migrations reviewed and tested

## Development Deployment

### Automated Deployment (Recommended)

Development deployments are automatically triggered when code is pushed to the main branch:

```bash
# Automatic trigger - no manual action required
git push origin feature-branch
# Merge to main → triggers Enhanced CI → Build Images → Deploy Dev
```

### Manual Deployment

If manual deployment is required:

1. **Navigate to GitHub Actions**
   - Go to repository Actions tab
   - Select "Deploy to Development" workflow

2. **Configure Deployment**
   ```yaml
   Environment: development
   Rollback Version: (optional - for rollback deployments)
   Force Deploy: false (unless in emergency)
   ```

3. **Execute Deployment**
   - Click "Run workflow"
   - Monitor deployment progress
   - Verify deployment success

### Manual Verification

```bash
# Check deployment status
./scripts/deploy/health-check.sh dev comprehensive

# Run smoke tests
./scripts/deploy/smoke-tests.sh dev critical

# Verify service accessibility
curl -f https://dev-api.insurance-lead-gen.com/health
curl -f https://dev.insurance-lead-gen.com
```

### Common Development Issues

#### Build Failures
```bash
# Check build logs in GitHub Actions
# Common causes:
# - Dependency conflicts
# - TypeScript compilation errors
# - Missing environment variables

# Resolution:
# 1. Check build logs for specific errors
# 2. Fix code issues locally
# 3. Push fixes and retry deployment
```

#### Health Check Failures
```bash
# Debug health check issues
./scripts/deploy/health-check.sh dev detailed

# Common causes:
# - Service not starting properly
# - Database connectivity issues
# - Configuration problems

# Resolution:
# 1. Check pod logs: kubectl logs -n dev deployment/api
# 2. Verify environment variables
# 3. Check resource availability
```

## Staging Deployment

### Prerequisites Confirmation

Before staging deployment, ensure:
- [ ] Development deployment successful
- [ ] All tests passing in development
- [ ] Security scans completed
- [ ] Performance benchmarks acceptable
- [ ] Tech Lead approval obtained

### Deployment Process

#### 1. Prepare for Deployment

```bash
# Create deployment backup
./scripts/deploy/backup.sh staging

# Verify pre-deployment health
./scripts/deploy/health-check.sh staging comprehensive

# Check resource availability
./scripts/deploy/pre-flight-check.sh staging comprehensive
```

#### 2. Execute Deployment via GitHub Actions

1. **Navigate to Deployment Workflow**
   - Go to GitHub Actions → "Deploy to Staging"

2. **Configure Deployment Parameters**
   ```yaml
   Version: v1.2.3 (or specific Git SHA)
   Deployment Strategy: blue-green  # or canary
   Force Deploy: false
   ```

3. **Request Approval**
   - Workflow will pause for approval
   - Obtain Tech Lead approval
   - Monitor deployment progress

#### 3. Monitor Deployment

```bash
# Monitor deployment in real-time
kubectl get pods -n staging -w

# Check deployment status
kubectl rollout status deployment/api -n staging
kubectl rollout status deployment/backend -n staging
kubectl rollout status deployment/data-service -n staging
kubectl rollout status deployment/orchestrator -n staging
kubectl rollout status deployment/frontend -n staging

# Monitor application metrics
curl -f https://monitoring.staging.insurance-lead-gen.com/api/v1/query?query=up{namespace="staging"}
```

#### 4. Post-Deployment Validation

```bash
# Run comprehensive health checks
./scripts/deploy/health-check.sh staging comprehensive

# Execute smoke tests
./scripts/deploy/smoke-tests.sh staging full

# Performance validation
./scripts/deploy/performance-test.sh staging baseline

# Verify monitoring
# Check Grafana dashboards for staging environment
```

### Blue-Green Deployment Specific Steps

#### Traffic Switching

```bash
# Verify green environment health before switch
./scripts/deploy/health-check.sh staging green

# Switch traffic (if health checks pass)
# This is typically automated in the workflow

# Monitor traffic switch
watch -n 5 'curl -s https://staging.insurance-lead-gen.com/health | jq .'
```

#### Verification Period

Monitor the new environment for **15 minutes**:
- [ ] Error rate < 1%
- [ ] Latency P95 < 2 seconds
- [ ] All services healthy
- [ ] Database operations working
- [ ] External integrations functional

### Canary Deployment Specific Steps

#### Stage Monitoring

Each canary stage requires monitoring:

**Stage 1: 10% Traffic (15 minutes)**
```bash
# Monitor metrics
curl -s "https://monitoring.staging.insurance-lead-gen.com/api/v1/query?query=rate(http_requests_total{deployment='canary'}[5m])"

# Check error rates
curl -s "https://monitoring.staging.insurance-lead-gen.com/api/v1/query?query=rate(http_requests_total{deployment='canary',status=~'5..'}[5m])"

# If issues detected, rollback automatically
```

**Stage 2: 50% Traffic (15 minutes)**
- Same monitoring as Stage 1
- More stringent thresholds

**Stage 3: 100% Traffic (30 minutes)**
- Final validation
- Production-ready verification

## Production Deployment

### Pre-Production Checklist

#### Stakeholder Approvals
- [ ] **Tech Lead Approval**: Technical review and sign-off
- [ ] **Product Manager Approval**: Business impact assessment
- [ ] **Operations Approval**: Operational readiness confirmation
- [ ] **Security Approval**: Security review completed

#### Deployment Preparation
- [ ] **Change Advisory Board**: CAB approval (if required)
- [ ] **Communication Plan**: Stakeholder notifications sent
- [ ] **Rollback Plan**: Detailed rollback procedure reviewed
- [ ] **Monitoring Setup**: Enhanced monitoring configured
- [ ] **On-Call Schedule**: On-call engineer confirmed available

#### Technical Validation
- [ ] **Staging Success**: Successful deployment and validation in staging
- [ ] **Performance Benchmarks**: Meets performance requirements
- [ ] **Security Scans**: No critical vulnerabilities
- [ ] **Database Migration**: Tested and ready
- [ ] **Backup Verification**: Current production backup available

### Production Deployment Execution

#### 1. Pre-Deployment Window (T-30 minutes)

```bash
# Final health check
./scripts/deploy/health-check.sh prod comprehensive

# Verify monitoring systems
curl -f https://monitoring.insurance-lead-gen.com/api/v1/label/__name__/values

# Check current performance baseline
curl -s "https://monitoring.insurance-lead-gen.com/api/v1/query?query=rate(http_requests_total[5m])"

# Create production backup
./scripts/deploy/backup.sh prod
```

#### 2. Initiate Deployment

1. **Navigate to Production Workflow**
   - GitHub Actions → "Deploy to Production"

2. **Configure Deployment**
   ```yaml
   Version: v1.2.3 (release tag)
   Deployment Strategy: canary  # or blue-green
   Force Deploy: false (never use in production)
   ```

3. **Obtain Approvals**
   - Workflow requires dual approval
   - Both Tech Lead and Product Manager must approve
   - Deployment will not proceed without both approvals

#### 3. Canary Deployment Execution

**Phase 1: 10% Traffic (15 minutes)**
```bash
# Monitor critical metrics
watch -n 30 '
echo "Error Rate: $(curl -s "https://monitoring.insurance-lead-gen.com/api/v1/query?query=rate(http_requests_total{deployment='canary',status=~'5..'}[5m])" | jq -r .data.result[0].value[1])"
echo "Latency P95: $(curl -s "https://monitoring.insurance-lead-gen.com/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket{deployment='canary'}[5m]))" | jq -r .data.result[0].value[1])"
echo "Availability: $(curl -s "https://monitoring.insurance-lead-gen.com/api/v1/query?query=up{deployment='canary'}" | jq -r .data.result[0].value[1])"
'

# Automatic rollback triggers:
# - Error rate > 0.5%
# - Latency P95 > 1 second
# - Availability < 99%
```

**Phase 2: 50% Traffic (15 minutes)**
- Same monitoring with more stringent thresholds
- Continue monitoring for business metrics

**Phase 3: 100% Traffic (30 minutes)**
- Full production traffic
- Comprehensive monitoring
- Final validation

#### 4. Blue-Green Deployment Execution

```bash
# Deploy to inactive environment (green)
./scripts/deploy/deploy.sh prod blue-green

# Comprehensive testing on green environment
./scripts/deploy/health-check.sh prod green comprehensive
./scripts/deploy/smoke-tests.sh prod green full
./scripts/deploy/performance-test.sh prod green baseline

# Switch traffic to green
kubectl patch service api -n production -p '{"spec":{"selector":{"version":"green"}}}'
kubectl patch service backend -n production -p '{"spec":{"selector":{"version":"green"}}}'
kubectl patch service frontend -n production -p '{"spec":{"selector":{"version":"green"}}}'

# Monitor for 5 minutes post-switch
watch -n 30 'curl -f https://api.insurance-lead-gen.com/health'
```

### Production Deployment Monitoring

#### Critical Metrics (Monitor Every 5 minutes)

```bash
# API Health
curl -f https://api.insurance-lead-gen.com/health

# Frontend Health  
curl -f https://insurance-lead-gen.com

# Error Rate
curl -s "https://monitoring.insurance-lead-gen.com/api/v1/query?query=rate(http_requests_total{status=~'5..'}[5m])"

# Response Time P95
curl -s "https://monitoring.insurance-lead-gen.com/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))"

# Database Connections
curl -s "https://monitoring.insurance-lead-gen.com/api/v1/query?query=pg_stat_database_numbackends"
```

#### Business Metrics

```bash
# Conversion Rate
curl -s "https://monitoring.insurance-lead-gen.com/api/v1/query?query=rate(conversions_total[5m]) / rate(visits_total[5m])"

# Revenue Impact
curl -s "https://monitoring.insurance-lead-gen.com/api/v1/query?query=rate(revenue_total[5m])"

# User Engagement
curl -s "https://monitoring.insurance-lead-gen.com/api/v1/query?query=rate(user_sessions_total[5m])"
```

## Emergency Rollback Procedures

### When to Execute Rollback

- **Error Rate**: >1% for 2 minutes
- **Latency**: P95 > 2 seconds for 5 minutes
- **Availability**: <99% for 1 minute
- **Business Impact**: Conversion rate drop >10%
- **Security Issues**: Critical vulnerabilities discovered
- **Manual Decision**: On-call engineer decision

### Rollback Execution

#### 1. Assess Situation

```bash
# Quick health check
./scripts/deploy/health-check.sh prod basic

# Check recent logs
kubectl logs -n production -l app=api --tail=100 --since=5m

# Review metrics
curl -s "https://monitoring.insurance-lead-gen.com/api/v1/query?query=rate(http_requests_total{status=~'5..'}[5m])"
```

#### 2. Execute Rollback

**Option A: Automated Rollback (Recommended)**
```bash
# Use GitHub Actions rollback workflow
# Navigate to: Actions → Emergency Rollback

# Configure:
Environment: production
Target Version: v1.2.2 (previous stable version)
Reason: "High error rate detected after deployment"
Auto Rollback: false
Force Rollback: false (unless emergency)
```

**Option B: Manual Rollback**
```bash
# Rollback using deployment script
./scripts/deploy/rollback.sh prod v1.2.2

# Monitor rollback progress
kubectl rollout status deployment/api -n production --timeout=300s
kubectl rollout status deployment/backend -n production --timeout=300s
kubectl rollout status deployment/frontend -n production --timeout=300s
```

#### 3. Verify Rollback Success

```bash
# Health check after rollback
./scripts/deploy/health-check.sh prod comprehensive

# Smoke tests
./scripts/deploy/smoke-tests.sh prod critical

# Monitor metrics for 15 minutes
watch -n 60 'curl -s "https://monitoring.insurance-lead-gen.com/api/v1/query?query=rate(http_requests_total{status=~'5..'}[5m])"'
```

### Rollback Communication

```bash
# Send rollback notifications
# Slack notification
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🚨 Emergency Rollback Executed\nEnvironment: Production\nVersion: v1.2.3 → v1.2.2\nReason: High error rate\nStatus: Completed\nTimeline: 2024-01-15 14:30 UTC"}' \
  $SLACK_WEBHOOK_URL

# PagerDuty alert
# Trigger incident in PagerDuty with rollback details
```

## Troubleshooting Guide

### Common Deployment Issues

#### Issue: Build Failures

**Symptoms**:
- Enhanced CI workflow fails at build stage
- Docker image build fails
- TypeScript compilation errors

**Diagnosis**:
```bash
# Check build logs in GitHub Actions
# Look for specific error messages

# Common error patterns:
# - Module not found errors
# - TypeScript type errors  
# - Memory limit exceeded
# - Dependency version conflicts
```

**Resolution**:
```bash
# 1. Fix code issues locally
git checkout main
git pull origin main
git checkout your-branch
git rebase main

# Fix any compilation errors
pnpm build

# 2. Push fixes
git add .
git commit -m "fix: resolve build errors"
git push origin your-branch

# 3. Verify in PR
# Create pull request and wait for CI to pass
```

#### Issue: Health Check Failures

**Symptoms**:
- Deployment succeeds but services unhealthy
- 503 Service Unavailable errors
- Pods in CrashLoopBackOff state

**Diagnosis**:
```bash
# Check pod status
kubectl get pods -n production

# Check pod logs
kubectl logs -n production deployment/api --tail=50

# Check events
kubectl get events -n production --sort-by='.lastTimestamp'

# Check resource usage
kubectl top pods -n production
```

**Resolution**:
```bash
# 1. Check configuration
kubectl get configmap -n production
kubectl describe configmap api-config -n production

# 2. Check secrets
kubectl get secrets -n production
kubectl describe secret api-secret -n production

# 3. Check resource limits
kubectl describe deployment api -n production

# 4. If resources are insufficient:
kubectl patch deployment api -n production -p '{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "api",
          "resources": {
            "limits": {"cpu": "2000m", "memory": "2Gi"},
            "requests": {"cpu": "500m", "memory": "512Mi"}
          }
        }]
      }
    }
  }
}'
```

#### Issue: Database Migration Failures

**Symptoms**:
- Application starts but database errors
- Schema incompatibilities
- Data migration timeouts

**Diagnosis**:
```bash
# Check database connection
kubectl exec -n production deployment/api -- \
  node -e "const { Client } = require('pg'); new Client(process.env.DATABASE_URL).connect().then(() => console.log('DB Connected')).catch(console.error)"

# Check migration status
kubectl exec -n production deployment/api -- npm run db:status

# Check database logs
# (Database logs would be in cloud provider console)
```

**Resolution**:
```bash
# 1. Rollback database migration
kubectl exec -n production deployment/api -- npm run db:migrate:down

# 2. Fix migration script
# Edit migration files in apps/api/prisma/migrations/

# 3. Re-run migration
kubectl exec -n production deployment/api -- npm run db:migrate

# 4. If migration is stuck, manually介入:
# - Connect to database directly
# - Check migration table status
# - Manually apply/rollback changes
```

#### Issue: High Error Rates Post-Deployment

**Symptoms**:
- Error rate >1% after deployment
- 500 errors from application
- User complaints

**Diagnosis**:
```bash
# Check application logs
kubectl logs -n production -l app=api --tail=100 --since=1h | grep ERROR

# Check error rate trends
curl -s "https://monitoring.insurance-lead-gen.com/api/v1/query?query=rate(http_requests_total{status=~'5..'}[5m])"

# Check recent deployments
kubectl get deployments -n production -o wide

# Check configuration changes
kubectl get configmap -n production -o yaml
```

**Resolution**:
```bash
# 1. Immediate rollback (recommended)
./scripts/deploy/rollback.sh prod v1.2.2

# 2. If rollback not possible, hotfix:
# - Identify root cause from logs
# - Fix configuration or code issue
# - Deploy hotfix through normal process
# - Monitor closely

# 3. Investigate root cause:
# - Code review of changes
# - Configuration comparison
# - Database schema changes
# - External dependency changes
```

### Performance Issues

#### Issue: High Latency

**Diagnosis**:
```bash
# Check response time metrics
curl -s "https://monitoring.insurance-lead-gen.com/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))"

# Check resource utilization
kubectl top pods -n production
kubectl top nodes

# Check database performance
curl -s "https://monitoring.insurance-lead-gen.com/api/v1/query?query=pg_stat_database_blk_read_time"
```

**Resolution**:
```bash
# 1. Scale up resources
kubectl patch deployment api -n production -p '{
  "spec": {
    "replicas": 5
  }
}'

# 2. Check database queries
# Enable slow query logging

# 3. Review recent changes
# - Check for inefficient queries
# - Review caching configuration
# - Validate external API performance
```

### Infrastructure Issues

#### Issue: Node Resource Exhaustion

**Diagnosis**:
```bash
# Check node status
kubectl get nodes

# Check node capacity
kubectl describe nodes

# Check pod resource requests vs limits
kubectl describe pods -n production
```

**Resolution**:
```bash
# 1. Scale cluster
# Add nodes to EKS cluster via Terraform or console

# 2. Optimize resource requests
kubectl patch deployment api -n production -p '{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "api",
          "resources": {
            "requests": {"cpu": "200m", "memory": "256Mi"},
            "limits": {"cpu": "1000m", "memory": "1Gi"}
          }
        }]
      }
    }
  }
}'

# 3. Implement auto-scaling
kubectl patch hpa api -n production -p '{
  "spec": {
    "maxReplicas": 10,
    "metrics": [{
      "type": "Resource",
      "resource": {"name": "cpu", "target": {"type": "Utilization", "averageUtilization": 70}}
    }]
  }
}'
```

## Monitoring and Health Checks

### Continuous Monitoring

#### Key Performance Indicators (KPIs)

```bash
# Service Availability
# Target: 99.9%
up{namespace="production"}

# Response Time P95
# Target: < 1 second
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error Rate
# Target: < 0.1%
rate(http_requests_total{status=~'5..'}[5m]) / rate(http_requests_total[5m])

# Throughput
# Target: > 1000 requests/second
rate(http_requests_total[5m])

# Database Performance
# Target: < 100ms query time
histogram_quantile(0.95, rate(pg_stat_database_blk_read_time[5m]))
```

#### Business Metrics

```bash
# Conversion Rate
# Target: Maintain baseline
rate(conversions_total[5m]) / rate(visits_total[5m])

# Revenue Impact
# Target: No negative impact
rate(revenue_total[5m])

# User Engagement
# Target: Maintain baseline
rate(user_sessions_total[5m])
```

### Alerting Thresholds

#### Critical Alerts (Immediate Response)
```yaml
# Service Down
- alert: ServiceDown
  expr: up{namespace="production"} == 0
  for: 30s
  action: "immediate_incident_response"

# High Error Rate
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~'5..'}[5m]) / rate(http_requests_total[5m]) > 0.01
  for: 2m
  action: "automatic_rollback"

# High Latency
- alert: HighLatency
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2000
  for: 5m
  action: "investigate_and_mitigate"
```

#### Warning Alerts (Investigate)
```yaml
# Elevated Error Rate
- alert: ElevatedErrorRate
  expr: rate(http_requests_total{status=~'5..'}[5m]) / rate(http_requests_total[5m]) > 0.005
  for: 5m
  action: "investigate"

# Resource Pressure
- alert: HighCPUUsage
  expr: rate(container_cpu_usage_seconds_total[5m]) > 0.8
  for: 10m
  action: "scale_or_optimize"

# Database Performance
- alert: HighDBLatency
  expr: histogram_quantile(0.95, rate(pg_stat_database_blk_read_time[5m])) > 500
  for: 10m
  action: "investigate_database"
```

## Incident Response

### Incident Severity Levels

#### Severity 1 (Critical)
- **Impact**: Complete service outage or major functionality broken
- **Response Time**: 15 minutes
- **Escalation**: Immediate to on-call and management
- **Communication**: Real-time updates to stakeholders

#### Severity 2 (High)
- **Impact**: Significant degradation or partial outage
- **Response Time**: 30 minutes
- **Escalation**: On-call and team lead
- **Communication**: Regular updates (every 30 minutes)

#### Severity 3 (Medium)
- **Impact**: Minor functionality issues
- **Response Time**: 2 hours
- **Escalation**: Team lead during business hours
- **Communication**: Status updates as needed

### Incident Response Process

#### 1. Detection and Alert (0-5 minutes)
```bash
# Alert received via:
# - PagerDuty
# - Slack notifications
# - Monitoring dashboards

# Immediate actions:
# 1. Acknowledge alert
# 2. Assess severity
# 3. Notify appropriate personnel
# 4. Begin incident documentation
```

#### 2. Initial Response (5-15 minutes)
```bash
# 1. Connect to incident bridge (Zoom/Teams)
# 2. Assign incident commander
# 3. Begin troubleshooting
# 4. Communicate status to stakeholders

# Document in incident log:
# - Time of detection
# - Initial assessment
# - Actions taken
# - Personnel involved
```

#### 3. Investigation and Mitigation (15-60 minutes)
```bash
# Systematic troubleshooting:
# 1. Check recent deployments
# 2. Review application logs
# 3. Analyze monitoring data
# 4. Check infrastructure status
# 5. Consider rollback if necessary

# Communicate progress:
# - Update status every 15 minutes
# - Document findings and actions
# - Request additional resources if needed
```

#### 4. Resolution and Recovery (Variable)
```bash
# 1. Implement fix or rollback
# 2. Verify service restoration
# 3. Monitor for stability
# 4. Confirm resolution with stakeholders

# Post-resolution:
# 1. Document root cause
# 2. Plan preventive measures
# 3. Schedule post-incident review
```

### Communication Templates

#### Initial Alert
```
🚨 INCIDENT ALERT [SEV-1]

Service: Insurance Lead Generation Platform
Issue: Complete API outage detected
Impact: All user requests failing
Detected: 2024-01-15 14:30:00 UTC
Response: On-call engineer notified
Next Update: 14:45 UTC

Team: Please join incident bridge
Link: [Zoom/Teams link]
```

#### Status Update
```
📊 INCIDENT UPDATE [SEV-1]

Time: 14:45 UTC
Status: Investigating
Findings: Database connection pool exhausted
Actions: Scaling database connections, investigating root cause
ETA: 15 minutes to resolution
Next Update: 15:00 UTC

Team: Continue investigation, consider rollback if no progress in 15 min
```

#### Resolution
```
✅ INCIDENT RESOLVED [SEV-1]

Time: 15:10 UTC
Resolution: Database connection pool increased from 20 to 50
Duration: 40 minutes
Root Cause: Deployment increased concurrent requests without adjusting DB pool
Prevention: Implement connection pool monitoring and auto-scaling

Post-Incident: Post-mortem scheduled for 2024-01-16 10:00 UTC
```

## Post-Deployment Activities

### Immediate Post-Deployment (0-4 hours)

#### Health Verification
```bash
# Comprehensive health check
./scripts/deploy/health-check.sh prod comprehensive

# Performance validation
./scripts/deploy/performance-test.sh prod baseline

# Business metrics validation
curl -s "https://monitoring.insurance-lead-gen.com/api/v1/query?query=rate(conversions_total[5m])"
curl -s "https://monitoring.insurance-lead-gen.com/api/v1/query?query=rate(revenue_total[5m])"
```

#### Monitoring Setup
```bash
# Enable enhanced monitoring for 24 hours
# Configure temporary alert rules
# Monitor key metrics every 15 minutes

# Alert thresholds for post-deployment:
# - Error rate > 0.5% (vs normal 0.1%)
# - Latency P95 > 1500ms (vs normal 800ms)
# - CPU usage > 80% (vs normal 60%)
```

#### Documentation
```bash
# Update deployment records
# Document any issues encountered
# Record performance metrics
# Note any manual interventions

# Update runbooks if new procedures were used
```

### Short-term Follow-up (1-7 days)

#### Performance Analysis
```bash
# Compare performance metrics pre vs post deployment
# Analyze trends and identify any degradation
# Review user feedback and support tickets
# Monitor business metrics impact

# Generate performance report:
./scripts/analysis/generate-performance-report.sh prod v1.2.3
```

#### Optimization
```bash
# Review resource utilization
# Optimize configurations if needed
# Address any performance bottlenecks
# Update monitoring thresholds

# Consider:
# - Auto-scaling configuration
# - Database optimization
# - Cache tuning
# - Network optimization
```

### Long-term Review (1-4 weeks)

#### Deployment Effectiveness
```bash
# Analyze deployment success metrics
# Review rollback frequency and reasons
# Assess business impact
# Gather team feedback

# Metrics to review:
# - Deployment success rate
# - Mean time to recovery
# - User satisfaction scores
# - Business KPI impact
```

#### Process Improvement
```bash
# Identify automation opportunities
# Review security scan effectiveness
# Optimize deployment strategies
# Update documentation and training

# Consider:
# - Deployment frequency optimization
# - Security scan improvements
# - Monitoring enhancements
# - Training needs
```

## Emergency Contacts

### On-Call Rotation
- **Primary On-Call**: [Name] - [Phone] - [Email]
- **Secondary On-Call**: [Name] - [Phone] - [Email]
- **Escalation**: [Manager Name] - [Phone] - [Email]

### Team Contacts
- **DevOps Lead**: [Name] - [Phone] - [Email]
- **Tech Lead**: [Name] - [Phone] - [Email]
- **Product Manager**: [Name] - [Phone] - [Email]
- **Security Team**: [Name] - [Phone] - [Email]

### External Contacts
- **AWS Support**: 1-800-AWS-SUPPORT
- **PagerDuty Support**: [Support contact]
- **Monitoring Vendor**: [Support contact]

### Communication Channels
- **Incident Bridge**: [Zoom/Teams link]
- **Slack Channel**: #incidents
- **Status Page**: [Status page URL]
- **Stakeholder Email List**: [Distribution list]

---

## Quick Reference Commands

### Health Checks
```bash
# Quick health check
./scripts/deploy/health-check.sh prod basic

# Comprehensive health check
./scripts/deploy/health-check.sh prod comprehensive

# Service-specific health check
kubectl exec -n production deployment/api -- curl -f http://localhost:3000/health
```

### Rollback Commands
```bash
# Emergency rollback
./scripts/deploy/rollback.sh prod v1.2.2 --auto

# Manual rollback with confirmation
./scripts/deploy/rollback.sh prod v1.2.2

# Rollback with force (emergency only)
./scripts/deploy/rollback.sh prod v1.2.2 --force
```

### Monitoring Commands
```bash
# Check service status
kubectl get pods -n production

# Monitor logs
kubectl logs -n production -l app=api --tail=100 -f

# Check metrics
curl -s "https://monitoring.insurance-lead-gen.com/api/v1/query?query=up{namespace='production'}"
```

### Scaling Commands
```bash
# Scale deployment
kubectl scale deployment api -n production --replicas=5

# Check HPA status
kubectl get hpa -n production

# Update resource limits
kubectl patch deployment api -n production -p '{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "api",
          "resources": {
            "limits": {"cpu": "2000m", "memory": "2Gi"}
          }
        }]
      }
    }
  }
}'
```

---

**Document Version**: 1.0  
**Last Updated**: January 15, 2024  
**Next Review**: February 15, 2024  
**Owner**: DevOps Team  
**Approver**: Engineering Manager