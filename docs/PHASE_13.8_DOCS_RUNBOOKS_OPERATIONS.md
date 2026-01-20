# Phase 13.8: Documentation, Runbooks & Operations

## Overview

Phase 13.8 consolidates and enhances all operational documentation for the Insurance Lead Gen Platform. This phase establishes a comprehensive knowledge base containing runbooks, operational procedures, troubleshooting guides, and reference materials necessary for maintaining platform reliability, responding to incidents, and ensuring smooth day-to-day operations.

This documentation serves as the single source of truth for all operational procedures and is designed to be used by on-call engineers, DevOps teams, platform engineers, and anyone responsible for maintaining the platform.

---

## Table of Contents

1. [Documentation Overview](#documentation-overview)
2. [Runbooks Index](#runbooks-index)
3. [Operational Procedures](#operational-procedures)
4. [Incident Response](#incident-response)
5. [Disaster Recovery](#disaster-recovery)
6. [Monitoring & Alerting](#monitoring--alerting)
7. [Troubleshooting Guide](#troubleshooting-guide)
8. [Operational Checklists](#operational-checklists)
9. [Quick Reference](#quick-reference)
10. [Maintenance Calendar](#maintenance-calendar)
11. [Knowledge Base](#knowledge-base)

---

## Documentation Overview

### Documentation Structure

The platform documentation is organized into the following categories:

```
docs/
├── 📋 Core Documentation
│   ├── README.md                    # Main project documentation
│   ├── ARCHITECTURE.md              # System architecture overview
│   ├── DEVELOPMENT.md               # Development setup guide
│   └── IMPLEMENTATION_SUMMARY.md    # Implementation overview
│
├── 🚀 Deployment & Operations
│   ├── DEPLOYMENT_RUNBOOK.md        # Deployment procedures
│   ├── DEPLOYMENT_PROCEDURES.md     # Detailed deployment steps
│   ├── DEPLOYMENT_CHECKLIST.md      # Pre-deployment checklist
│   ├── DEPLOYMENT_STRATEGIES.md     # Deployment strategies
│   ├── HELM_DEPLOYMENT.md           # Helm chart deployment
│   └── KUBERNETES_DEPLOYMENT.md     # K8s deployment guide
│
├── 🔧 Runbooks
│   ├── RUNBOOKS.md                  # Master runbook index
│   ├── OPERATIONAL_RUNBOOK.md       # Day-to-day operations
│   ├── ALERT_RUNBOOKS.md            # Alert response procedures
│   ├── INCIDENT_RESPONSE_RUNBOOK.md # Incident response
│   ├── DISASTER_RECOVERY_RUNBOOK.md # Disaster recovery
│   ├── ON_CALL_RUNBOOK.md           # On-call procedures
│   ├── CAPACITY_PLANNING_RUNBOOK.md # Capacity management
│   ├── LOAD_TESTING_RUNBOOK.md      # Load testing procedures
│   ├── RUNBOOK_DEPLOY_DEV.md        # Development deployment
│   ├── RUNBOOK_DEPLOY_STAGING.md    # Staging deployment
│   └── RUNBOOK_DEPLOY_PROD.md       # Production deployment
│
├── 📊 Monitoring & Observability
│   ├── MONITORING.md                # Monitoring overview
│   ├── DATABASE_MONITORING.md       # Database monitoring
│   └── INFRASTRUCTURE_TOPOLOGY.md   # Infrastructure details
│
├── 🔒 Security & Compliance
│   ├── SECURITY_HARDENING_GUIDE.md  # Security procedures
│   ├── DATABASE_SECURITY.md         # Database security
│   ├── HIPAA_COMPLIANCE.md          # HIPAA compliance
│   ├── GDPR_COMPLIANCE.md           # GDPR compliance
│   ├── AUDIT_LOGGING.md             # Audit logging
│   └── DATA_CLASSIFICATION.md       # Data classification
│
├── 🗄️ Database Operations
│   ├── DATABASE_SETUP.md            # Database setup
│   ├── DATABASE_MAINTENANCE.md      # Maintenance procedures
│   ├── DATABASE_BACKUP_RECOVERY.md  # Backup & recovery
│   ├── DATABASE_MIGRATION.md        # Migration procedures
│   └── DATABASE_HARDENING_QUICK_START.md # Security hardening
│
└── 📞 Support & Troubleshooting
    ├── TROUBLESHOOTING_GUIDE.md     # Troubleshooting procedures
    ├── SUPPORT_TROUBLESHOOTING.md   # Support troubleshooting
    └── USER_GUIDE.md                # End-user guide
```

### Documentation Standards

#### Writing Style
- Use active voice and present tense
- Include code examples for complex procedures
- Reference related documentation where applicable
- Include warning and caution notes for critical steps
- Use consistent formatting throughout

#### Document Structure
Each operational document should follow this structure:
1. **Overview** - Brief description of the document's purpose
2. **Table of Contents** - Navigation aid
3. **Prerequisites** - Required access, tools, or permissions
4. **Step-by-step Procedures** - Numbered, actionable steps
5. **Verification** - How to confirm success
6. **Rollback** - How to revert if something goes wrong
7. **Related Documentation** - Cross-references

#### Version Control
- All documentation is version-controlled in Git
- Changes are reviewed via pull requests
- Documentation is updated alongside code changes
- Version numbers follow semantic versioning

---

## Runbooks Index

### Primary Runbooks

| Runbook | Purpose | Audience |
|---------|---------|----------|
| [ALERT_RUNBOOKS.md](./ALERT_RUNBOOKS.md) | Step-by-step response procedures for each alert type | On-call engineers |
| [INCIDENT_RESPONSE_RUNBOOK.md](./INCIDENT_RESPONSE_RUNBOOK.md) | Incident declaration, response, and resolution | All engineers |
| [DISASTER_RECOVERY_RUNBOOK.md](./DISASTER_RECOVERY_RUNBOOK.md) | Recovery procedures for major failures | DevOps, Platform engineers |
| [ON_CALL_RUNBOOK.md](./ON_CALL_RUNBOOK.md) | On-call responsibilities and escalation | On-call rotation |
| [OPERATIONAL_RUNBOOK.md](./OPERATIONAL_RUNBOOK.md) | Day-to-day operational procedures | Operations team |

### Deployment Runbooks

| Runbook | Environment | Use Case |
|---------|-------------|----------|
| [RUNBOOK_DEPLOY_DEV.md](./RUNBOOK_DEPLOY_DEV.md) | Development | Local and dev deployments |
| [RUNBOOK_DEPLOY_STAGING.md](./RUNBOOK_DEPLOY_STAGING.md) | Staging | Pre-production testing |
| [RUNBOOK_DEPLOY_PROD.md](./RUNBOOK_DEPLOY_PROD.md) | Production | Production deployments |

### Specialized Runbooks

| Runbook | Purpose |
|---------|---------|
| [CAPACITY_PLANNING_RUNBOOK.md](./CAPACITY_PLANNING_RUNBOOK.md) | Capacity management and scaling |
| [LOAD_TESTING_RUNBOOK.md](./LOAD_TESTING_RUNBOOK.md) | Performance and load testing |

---

## Operational Procedures

### Daily Operations

#### Morning Health Check

Execute the following checks at the start of each day:

```bash
#!/bin/bash
# daily-health-check.sh

echo "=== Insurance Lead Gen Platform Health Check ==="
echo "Date: $(date)"
echo ""

# Check pod status
echo ">>> Pod Status"
kubectl get pods -n production -o wide

# Check service endpoints
echo ""
echo ">>> Service Endpoints"
kubectl get endpoints -n production

# Check recent failures
echo ""
echo ">>> Recent Failures"
kubectl get events -n production --sort-by='.lastTimestamp' | tail -20

# Check resource usage
echo ""
echo ">>> Resource Usage"
kubectl top pods -n production

# Check PersistentVolumeClaims
echo ""
echo ">>> PVC Status"
kubectl get pvc -n production

echo ""
echo "=== Health Check Complete ==="
```

#### Checklist

- [ ] All pods in Running state
- [ ] No recent CrashLoopBackOff events
- [ ] Error rates within normal parameters (< 1%)
- [ ] Response times meet SLO targets (< 200ms P95)
- [ ] Database connections healthy (< 80% pool usage)
- [ ] Cache hit rate acceptable (> 80%)
- [ ] Queue depths within normal range
- [ ] Backup completed successfully (check last run)
- [ ] SSL certificates valid (> 30 days expiry)
- [ ] Disk space adequate (> 20% free)

### Weekly Maintenance

#### Maintenance Tasks

1. **Log Review** (Monday)
   - Review error logs for patterns
   - Identify recurring issues
   - Update monitoring if needed

2. **Backup Verification** (Tuesday)
   - Verify backup completion
   - Test restore procedure on non-production
   - Clean up old backups

3. **Security Review** (Wednesday)
   - Check for security advisories
   - Review access logs
   - Verify secrets rotation status

4. **Performance Review** (Thursday)
   - Analyze performance trends
   - Identify optimization opportunities
   - Plan maintenance windows

5. **Capacity Planning** (Friday)
   - Review resource utilization
   - Forecast capacity needs
   - Update scaling policies

### Monthly Operations

1. **Certificate Rotation**
   - Check SSL certificate expiry
   - Rotate certificates if needed
   - Update documentation

2. **Disaster Recovery Testing**
   - Execute failover test
   - Validate RTO/RPO targets
   - Document findings

3. **Cost Review**
   - Analyze cloud spending
   - Identify optimization opportunities
   - Update budget forecasts

4. **Access Review**
   - Audit user access levels
   - Remove unused accounts
   - Update permissions

---

## Incident Response

### Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **SEV-1** | Critical - Complete outage | 5 minutes | All services down, data loss |
| **SEV-2** | High - Major functionality affected | 15 minutes | API unresponsive, payment issues |
| **SEV-3** | Medium - Degraded service | 1 hour | Slow response, feature issues |
| **SEV-4** | Low - Minor issue | 24 hours | UI glitches, non-critical issues |

### Incident Response Process

#### 1. Detection & Alerting
- Automated alerts from monitoring system
- User-reported issues
- On-call engineer discovery

#### 2. Initial Assessment (0-15 minutes)
```
SEV-1: Acknowledge immediately, declare incident
SEV-2: Acknowledge within 15 minutes, assess impact
SEV-3: Acknowledge within 1 hour, schedule investigation
SEV-4: Acknowledge within 24 hours, add to backlog
```

#### 3. Investigation
- Gather relevant metrics and logs
- Identify affected systems
- Determine root cause
- Document findings

#### 4. Mitigation
- Implement temporary fix if possible
- Communicate status to stakeholders
- Monitor for effectiveness

#### 5. Resolution
- Apply permanent fix
- Verify service restoration
- Monitor for recurrence

#### 6. Post-Incident
- Conduct blameless postmortem
- Document lessons learned
- Update runbooks and procedures
- Track action items

### Incident Communication Templates

#### Initial Acknowledgment
```
SEV-$SEVERITY Incident Acknowledged
===================================
Alert: $ALERT_NAME
Acknowledged: $(date)
On-call: $USER
Initial Assessment: $BRIEF_DESCRIPTION
Next Actions: $IMMEDIATE_NEXT_STEPS
ETA for Update: $ETA_TIME
```

#### Status Update
```
STATUS UPDATE - $(date)
======================
Status: $STATUS (Investigating/Mitigating/Monitoring/Resolved)
Progress: $PROGRESS_SUMMARY
Findings: $KEY_FINDINGS
Next Steps: $NEXT_STEPS
ETA: $NEW_ETA
```

#### Resolution
```
INCIDENT RESOLVED - $(date)
===========================
Status: Resolved
Duration: $TOTAL_DURATION
Root Cause: $ROOT_CAUSE_SUMMARY
Resolution: $RESOLUTION_ACTION
Prevention: $PREVENTION_MEASURES
Post-Incident: $POST_INCIDENT_MONITORING
```

---

## Disaster Recovery

### Recovery Objectives

#### Recovery Time Objectives (RTO)
- **SEV-1 Services**: 5 minutes maximum
- **SEV-2 Services**: 15 minutes maximum
- **SEV-3 Services**: 1 hour maximum
- **SEV-4 Services**: 4 hours maximum

#### Recovery Point Objectives (RPO)
- **Database**: 0 minutes (synchronous replication)
- **Application Data**: 5 minutes maximum
- **File Storage**: 15 minutes maximum
- **Configuration**: 0 minutes (version controlled)

### Recovery Procedures

#### Single Service Failure
```bash
# API Service Recovery
kubectl rollout restart deployment/api -n production
kubectl rollout status deployment/api -n production --timeout=5m

# Backend Service Recovery
kubectl rollout restart deployment/backend -n production
kubectl exec -n production deployment/backend -- python health_check.py

# Frontend Service Recovery
kubectl rollout restart deployment/frontend -n production
```

#### Database Recovery
```bash
# Check database status
kubectl get pods -n production | grep postgres

# Check replication status
kubectl exec -n production postgres-0 -- \
  psql -U postgres -c "SELECT * FROM pg_stat_replication;"

# Initiate failover if primary is down
kubectl exec -n production postgres-0 -- \
  pg_ctl promote -D /var/lib/postgresql/data
```

#### Complete Region Recovery
1. Activate standby region
2. Update DNS to point to new region
3. Verify data consistency
4. Resume operations
5. Plan original region recovery

---

## Monitoring & Alerting

### Key Metrics

#### Application Metrics
- Request rate (requests/second)
- Error rate (5xx errors / total requests)
- Latency (P50, P95, P99)
- Active connections

#### Infrastructure Metrics
- CPU utilization
- Memory usage
- Disk I/O
- Network throughput

#### Business Metrics
- Leads processed
- Conversions
- API calls by endpoint
- Queue depths

### Alert Thresholds

| Alert | Severity | Threshold | Duration |
|-------|----------|-----------|----------|
| API Down | SEV-1 | Health check fails | 2 minutes |
| High Error Rate | SEV-2 | Error rate > 5% | 5 minutes |
| High Latency | SEV-2 | P95 > 2s | 5 minutes |
| Database Connection Pool | SEV-2 | > 90% usage | 5 minutes |
| Disk Space | SEV-2 | > 85% usage | 10 minutes |
| High CPU | SEV-3 | > 80% usage | 10 minutes |
| Pod Restart Loop | SEV-2 | > 3 restarts/10min | 10 minutes |

---

## Troubleshooting Guide

### Common Issues

#### API Service Issues

**High Response Time**
```bash
# Check API service health
curl -w "@curl-format.txt" -o /dev/null -s https://api.insurance-lead-gen.com/health

# Check pod resource usage
kubectl top pods -n production -l app=api

# Check database connection pool
kubectl exec -n production deployment/api -- npm run db:pool-stats

# Check for slow queries
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"
```

**Service Not Responding**
```bash
# Check pod status
kubectl get pods -n production -l app=api

# Check pod logs for errors
kubectl logs -n production -l app=api --tail=100

# Check pod events
kubectl describe pod -n production -l app=api

# Check service endpoints
kubectl get endpoints -n production -l app=api
```

#### Database Issues

**Connection Pool Exhausted**
```bash
# Check connection pool status
kubectl exec -n production deployment/api -- npm run db:pool-stats

# Check active connections
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT count(*) FROM pg_stat_activity;"

# Check for connection leaks
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT pid, usename, application_name, state FROM pg_stat_activity WHERE state = 'idle in transaction';"
```

**High Latency**
```bash
# Check active queries
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT pid, usename, application_name, state, query_start, query FROM pg_stat_activity WHERE state = 'active';"

# Check for locks
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT * FROM pg_locks WHERE NOT granted;"

# Check slow queries
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

#### Cache Issues

**Low Cache Hit Rate**
```bash
# Check Redis stats
kubectl exec -n production deployment/redis -- redis-cli INFO stats

# Check memory usage
kubectl exec -n production deployment/redis -- redis-cli INFO memory

# Check for evicted keys
kubectl exec -n production deployment/redis -- redis-cli INFO stats | grep evicted
```

---

## Operational Checklists

### Pre-Deployment Checklist

- [ ] Code review completed and approved
- [ ] All tests passing (unit, integration, e2e)
- [ ] Database migrations tested
- [ ] Configuration changes documented
- [ ] Rollback plan prepared
- [ ] Monitoring alerts configured
- [ ] Stakeholders notified of deployment window
- [ ] On-call engineer aware of deployment
- [ ] Staging environment verified
- [ ] Security scan passed
- [ ] Performance benchmarks met

### Post-Deployment Checklist

- [ ] Smoke tests passed
- [ ] All pods running
- [ ] Error rates normal
- [ ] Response times meet SLO
- [ ] No new alerts triggered
- [ ] Monitoring dashboards updated
- [ ] Logs flowing correctly
- [ ] Business metrics normal
- [ ] Documentation updated
- [ ] Deployment recorded in changelog

### Incident Declaration Checklist

- [ ] Incident severity determined
- [ ] Incident channel created
- [ ] Incident commander assigned
- [ ] Stakeholders notified
- [ ] Status page updated (if customer-facing)
- [ ] Timeline documentation started
- [ ] Communication plan established

### Change Management Checklist

- [ ] Change request submitted
- [ ] Risk assessment completed
- [ ] Rollback plan documented
- [ ] CAB approval obtained (if required)
- [ ] Maintenance window scheduled
- [ ] Affected teams notified
- [ ] Monitoring enhanced
- [ ] Success criteria defined

---

## Quick Reference

### Service Endpoints

| Service | Environment | URL | Port |
|---------|-------------|-----|------|
| API | Production | https://api.insurance-lead-gen.com | 443 |
| API | Staging | https://staging-api.insurance-lead-gen.com | 443 |
| Frontend | Production | https://insurance-lead-gen.com | 443 |
| Frontend | Staging | https://staging.insurance-lead-gen.com | 443 |
| Grafana | Monitoring | http://localhost:3003 | 3003 |
| Prometheus | Monitoring | http://localhost:9090 | 9090 |
| Jaeger | Monitoring | http://localhost:16686 | 16686 |

### Port Forward Commands

```bash
# Grafana
kubectl port-forward -n monitoring svc/grafana 3003:3000

# Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# API Service
kubectl port-forward -n production svc/api 8000:80

# PostgreSQL
kubectl port-forward -n production svc/postgres 5432:5432

# Redis
kubectl port-forward -n production svc/redis 6379:6379
```

### Key Commands

```bash
# Check all pods
kubectl get pods -n production -o wide

# View logs
kubectl logs -n production -l app=api --tail=100 -f

# Restart deployment
kubectl rollout restart deployment/api -n production

# Check events
kubectl get events -n production --sort-by='.lastTimestamp'

# Scale service
kubectl scale deployment api -n production --replicas=5

# Check resource usage
kubectl top pods -n production

# Describe pod
kubectl describe pod -n production -l app=api

# Check configmap
kubectl get configmap api-config -n production -o yaml

# Update configmap
kubectl patch configmap api-config -n production --patch
```

### Default Credentials

| Service | Username | Password Source |
|---------|----------|-----------------|
| Grafana | admin | `kubectl get secret grafana -n monitoring -o jsonpath='{.data.admin-password}' | base64 -d` |
| PostgreSQL | postgres | Configured in secret |
| Redis | N/A | No authentication |
| Jaeger | admin | Configured in secret |

### Emergency Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| Primary On-Call | PagerDuty Rotation | Primary |
| Secondary On-Call | PagerDuty Rotation | Secondary |
| Platform Lead | See On-Call Schedule | Third |
| Engineering Manager | See On-Call Schedule | Fourth |
| VP Engineering | See On-Call Schedule | Executive |

---

## Maintenance Calendar

### Daily
- Morning health check
- Error log review
- Backup verification

### Weekly (Monday)
- Log pattern analysis
- Security advisory review
- SSL certificate check

### Weekly (Tuesday)
- Backup restoration test
- Performance trend analysis

### Weekly (Wednesday)
- Access log audit
- Secret rotation check

### Weekly (Thursday)
- Capacity planning review
- Cost analysis

### Weekly (Friday)
- Week in review
- Next week preparation

### Monthly
- SSL certificate rotation (if needed)
- Disaster recovery test
- Access review
- Cost optimization review

### Quarterly
- Major upgrade planning
- Security audit
- BCP testing
- Documentation review

### Annually
- Full disaster recovery drill
- Compliance audit
- Architecture review
- Strategy planning

---

## Knowledge Base

### Key Concepts

#### SLO (Service Level Objective)
A target level of reliability for a service. For example:
- API Availability: 99.9%
- API Latency P95: < 200ms
- Error Rate: < 1%

#### Error Budget
The allowable amount of unreliability that can occur while still meeting SLOs. Used to balance reliability with development velocity.

#### MTTR (Mean Time To Recovery)
Average time to recover from an incident. Lower is better.

#### MTTD (Mean Time To Detect)
Average time to detect an incident. Lower is better.

#### Circuit Breaker
A pattern that prevents cascading failures by stopping requests to a failing service.

#### Canary Deployment
A deployment strategy that routes a small percentage of traffic to a new version before full rollout.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Insurance Lead Gen Platform                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐   │
│  │ Frontend │────▶│   API   │────▶│ Backend │────▶│ Database│   │
│  │  (Next)  │     │  (Nest) │     │(FastAPI)│     │ (PG)    │   │
│  └─────────┘     └─────────┘     └─────────┘     └─────────┘   │
│       │               │               │               │          │
│       │               ▼               ▼               │          │
│       │        ┌─────────┐     ┌─────────┐            │          │
│       │        │  Cache  │     │  Queue  │            │          │
│       │        │ (Redis) │     │ (NATS)  │            │          │
│       │        └─────────┘     └─────────┘            │          │
│       │                                               ▼          │
│       │        ┌─────────┐     ┌─────────┐     ┌─────────┐      │
│       └───────▶│   CDN   │     │Monitoring│     │  Graph  │      │
│                │(Cloudflare)│   │  (Prom)  │     │  (Neo4j)│      │
│                └─────────┘     └─────────┘     └─────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14 | React application |
| API | NestJS | TypeScript API server |
| Backend | FastAPI | Python processing |
| Database | PostgreSQL 16 | Primary data store |
| Cache | Redis 7 | Caching and sessions |
| Queue | NATS | Event streaming |
| Graph DB | Neo4j 5 | Relationship data |
| Vector DB | Qdrant | AI embeddings |
| Monitoring | Prometheus | Metrics collection |
| Visualization | Grafana | Dashboards |
| Tracing | Jaeger | Distributed tracing |
| Logs | Loki | Log aggregation |

---

## Related Documentation

### Core Documentation
- [Architecture Overview](./ARCHITECTURE.md)
- [Development Guide](./DEVELOPMENT.md)
- [API Documentation](./API.md)

### Deployment Documentation
- [Deployment Procedures](./DEPLOYMENT_PROCEDURES.md)
- [Deployment Runbook](./DEPLOYMENT_RUNBOOK.md)
- [Helm Deployment](./HELM_DEPLOYMENT.md)

### Security Documentation
- [Security Hardening Guide](./SECURITY_HARDENING_GUIDE.md)
- [HIPAA Compliance](./HIPAA_COMPLIANCE.md)
- [GDPR Compliance](./GDPR_COMPLIANCE.md)

### Database Documentation
- [Database Setup](./DATABASE_SETUP.md)
- [Database Maintenance](./DATABASE_MAINTENANCE.md)
- [Database Backup & Recovery](./DATABASE_BACKUP_RECOVERY.md)

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | $(date) | Platform Team | Initial documentation |

---

## Questions & Support

For questions about operational procedures:
1. Check this documentation first
2. Review the relevant runbook
3. Consult the troubleshooting guide
4. Contact on-call engineer if urgent
5. Create a documentation PR for improvements

---

*Last Updated: $(date)*
*Document Owner: Platform Engineering Team*
*Review Schedule: Quarterly*
