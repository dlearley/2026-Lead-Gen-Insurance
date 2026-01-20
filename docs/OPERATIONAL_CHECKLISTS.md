# Operational Checklists

## Overview

This document provides comprehensive checklists for all operational activities on the Insurance Lead Gen Platform. These checklists ensure consistent, reliable operations and serve as both a training tool and reference guide.

---

## Table of Contents

1. [Daily Checklists](#daily-checklists)
2. [Weekly Checklists](#weekly-checklists)
3. [Monthly Checklists](#monthly-checklists)
4. [Deployment Checklists](#deployment-checklists)
5. [Incident Checklists](#incident-checklists)
6. [Maintenance Checklists](#maintenance-checklists)
7. [Security Checklists](#security-checklists)
8. [Troubleshooting Checklists](#troubleshooting-checklists)

---

## Daily Checklists

### Morning Health Check

**Time**: 9:00 AM  
**Duration**: 15 minutes  
**Owner**: On-call Engineer

#### System Health Verification

- [ ] **API Service Status**
  - [ ] Check pod status: `kubectl get pods -n production -l app=api`
  - [ ] Verify health endpoint: `curl -f https://api.insurance-lead-gen.com/health`
  - [ ] Check error rate: View Grafana dashboard
  - [ ] Verify response times: Check P95 latency

- [ ] **Backend Service Status**
  - [ ] Check pod status: `kubectl get pods -n production -l app=backend`
  - [ ] Verify health: `kubectl exec -n production deployment/backend -- python health_check.py`
  - [ ] Check job queue: View queue depth metrics

- [ ] **Database Status**
  - [ ] Check pod status: `kubectl get pods -n production | grep postgres`
  - [ ] Verify connections: Check connection pool usage < 80%
  - [ ] Check disk space: Verify > 20% free space
  - [ ] Check replication: Verify sync status

- [ ] **Cache Status**
  - [ ] Check Redis status: `kubectl exec -n production deployment/redis -- redis-cli INFO`
  - [ ] Verify hit rate: Check > 80% hit rate
  - [ ] Check memory: Verify < 80% memory usage

- [ ] **Infrastructure Status**
  - [ ] Check node status: `kubectl get nodes`
  - [ ] Verify resource usage: `kubectl top nodes`
  - [ ] Check PVC status: `kubectl get pvc -n production`

#### Monitoring Review

- [ ] **Alert Review**
  - [ ] Review triggered alerts from past 24 hours
  - [ ] Acknowledge any pending alerts
  - [ ] Verify alert resolution

- [ ] **Log Review**
  - [ ] Review error logs for patterns
  - [ ] Check for new error types
  - [ ] Verify log ingestion (Loki)

- [ ] **Metric Review**
  - [ ] Review business metrics (leads processed)
  - [ ] Check for anomalies
  - [ ] Verify SLO compliance

#### Communication

- [ ] **Handoff Review**
  - [ ] Review overnight incident logs
  - [ ] Check handoff document for pending items
  - [ ] Verify backup completion status

---

### End-of-Day Check

**Time**: 5:00 PM  
**Duration**: 10 minutes  
**Owner**: On-call Engineer

- [ ] All services running and healthy
- [ ] No unresolved SEV-1 or SEV-2 incidents
- [ ] No pending urgent alerts
- [ ] Backup completed successfully
- [ ] Update handoff document with any ongoing issues
- [ ] Notify next on-call of any pending items

---

## Weekly Checklists

### Monday: Log Analysis & Security

**Time**: 10:00 AM  
**Duration**: 30 minutes  
**Owner**: DevOps Team

- [ ] **Log Pattern Analysis**
  - [ ] Review error logs for recurring patterns
  - [ ] Identify top error types
  - [ ] Cross-reference with recent deployments
  - [ ] Update monitoring rules if needed

- [ ] **Security Review**
  - [ ] Check for new security advisories (CVE database)
  - [ ] Review failed authentication attempts
  - [ ] Verify SSL certificate expiry (> 30 days)
  - [ ] Check for unusual API access patterns

- [ ] **Documentation Review**
  - [ ] Review outstanding documentation PRs
  - [ ] Update runbooks based on recent incidents
  - [ ] Check for outdated procedures

### Tuesday: Backup Verification

**Time**: 2:00 PM  
**Duration**: 45 minutes  
**Owner**: Database Team

- [ ] **Backup Status Check**
  - [ ] Verify last backup completed successfully
  - [ ] Check backup size and growth trend
  - [ ] Verify backup storage availability

- [ ] **Restore Test**
  - [ ] Restore latest backup to staging environment
  - [ ] Verify data integrity
  - [ ] Document restore time (should meet RTO)

- [ ] **Cleanup**
  - [ ] Remove backups older than retention period
  - [ ] Verify cleanup completed successfully
  - [ ] Update backup documentation

### Wednesday: Access Audit

**Time**: 10:00 AM  
**Duration**: 30 minutes  
**Owner**: Security Team

- [ ] **User Access Review**
  - [ ] List all active user accounts
  - [ ] Identify inactive accounts (> 90 days)
  - [ ] Review privileged access
  - [ ] Verify service account necessity

- [ ] **API Key Review**
  - [ ] List all active API keys
  - [ ] Identify unused keys
  - [ ] Rotate keys older than 90 days

- [ ] **Secret Review**
  - [ ] Check secrets rotation status
  - [ ] Verify secrets are stored securely
  - [ ] Update any expiring secrets

### Thursday: Performance Analysis

**Time**: 2:00 PM  
**Duration**: 1 hour  
**Owner**: Engineering Team

- [ ] **Performance Metrics Review**
  - [ ] Review response time trends (P50, P95, P99)
  - [ ] Identify slow endpoints
  - [ ] Compare against baseline metrics

- [ ] **Resource Utilization Review**
  - [ ] Review CPU, memory, disk trends
  - [ ] Identify resource bottlenecks
  - [ ] Plan capacity adjustments

- [ ] **Optimization Planning**
  - [ ] Prioritize optimization opportunities
  - [ ] Create tickets for improvements
  - [ ] Schedule load testing if needed

### Friday: Week Wrap-up

**Time**: 4:00 PM  
**Duration**: 30 minutes  
**Owner**: Team Lead

- [ ] **Incident Summary**
  - [ ] Document any incidents from the week
  - [ ] Review action items from incidents
  - [ ] Update risk assessment

- [ ] **Change Summary**
  - [ ] Review deployed changes
  - [ ] Document lessons learned
  - [ ] Update deployment playbook

- [ ] **Next Week Planning**
  - [ ] Schedule any pending maintenance
  - [ ] Prepare deployment schedule
  - [ ] Update team on upcoming changes

---

## Monthly Checklists

### First Week: Certificate & Access Review

**Time**: 9:00 AM  
**Duration**: 1 hour  
**Owner**: Security Team

- [ ] **Certificate Inventory**
  - [ ] List all SSL/TLS certificates
  - [ ] Check expiry dates for all certificates
  - [ ] Schedule rotation for certificates expiring < 60 days
  - [ ] Verify certificate chain validity

- [ ] **Comprehensive Access Review**
  - [ ] Review all user permissions
  - [ ] Audit all service accounts
  - [ ] Remove deprecated access
  - [ ] Update access matrix documentation

### Second Week: Disaster Recovery Testing

**Time**: 10:00 AM  
**Duration**: 2 hours  
**Owner**: Platform Team

- [ ] **DR Test Preparation**
  - [ ] Notify stakeholders of test window
  - [ ] Prepare test scenarios
  - [ ] Verify backup availability
  - [ ] Document baseline metrics

- [ ] **DR Test Execution**
  - [ ] Execute failover procedure
  - [ ] Verify RTO/RPO compliance
  - [ ] Test data restoration
  - [ ] Validate service functionality

- [ ] **DR Test Documentation**
  - [ ] Document test results
  - [ ] Identify improvement areas
  - [ ] Update DR runbook
  - [ ] Present findings to team

### Third Week: Cost Analysis

**Time**: 2:00 PM  
**Duration**: 1 hour  
**Owner**: FinOps Team

- [ ] **Cost Review**
  - [ ] Analyze cloud spending for past month
  - [ ] Identify cost anomalies
  - [ ] Compare against budget
  - [ ] Review reserved instance coverage

- [ ] **Optimization Opportunities**
  - [ ] Identify underutilized resources
  - [ ] Review spot instance opportunities
  - [ ] Analyze storage costs
  - [ ] Plan optimization actions

### Fourth Week: Documentation Review

**Time**: 10:00 AM  
**Duration**: 1 hour  
**Owner**: Documentation Owner

- [ ] **Documentation Audit**
  - [ ] Review all operational runbooks
  - [ ] Identify outdated procedures
  - [ ] Update contact information
  - [ ] Remove deprecated references

- [ ] **Process Improvement**
  - [ ] Gather team feedback on procedures
  - [ ] Identify automation opportunities
  - [ ] Update checklists based on learnings

---

## Deployment Checklists

### Pre-Deployment Checklist

**Time**: Before each deployment  
**Duration**: 15 minutes  
**Owner**: Deployment Engineer

#### Code & Repository

- [ ] **Code Quality**
  - [ ] All tests passing (CI pipeline green)
  - [ ] Code review completed and approved
  - [ ] No outstanding critical PRs
  - [ ] Security scan passed

- [ ] **Repository State**
  - [ ] Branch is up to date with main
  - [ ] No uncommitted changes
  - [ ] Version bumped appropriately
  - [ ] Changelog updated

#### Database

- [ ] **Schema Changes**
  - [ ] Migration scripts tested on staging
  - [ ] Migration can be rolled back
  - [ ] No breaking changes to API contracts
  - [ ] Downtime window documented (if needed)

- [ ] **Data Impact**
  - [ ] Data migration tested
  - [ ] No data loss scenarios
  - [ ] Backup completed before deployment

#### Configuration

- [ ] **Environment Variables**
  - [ ] New variables added to secret manager
  - [ ] Environment-specific configs verified
  - [ ] Feature flags configured

- [ ] **Dependencies**
  - [ ] External service dependencies verified
  - [ ] API compatibility confirmed
  - [ ] Rate limits adjusted if needed

#### Infrastructure

- [ ] **Resources**
  - [ ] Sufficient resources available
  - [ ] Scaling policies updated
  - [ ] Health checks configured

- [ ] **Monitoring**
  - [ ] New metrics added to dashboards
  - [ ] Alerts configured for new services
  - [ ] Log aggregation verified

#### Communication & Planning

- [ ] **Stakeholder Notification**
  - [ ] Deployment window communicated
  - [ ] On-call team notified
  - [ ] Rollback plan documented

- [ ] **Rollback Preparation**
  - [ ] Previous version tagged
  - [ ] Rollback commands ready
  - [ ] Rollback criteria defined

### Deployment Execution Checklist

**Time**: During deployment  
**Duration**: Varies  
**Owner**: Deployment Engineer

- [ ] **Announce Deployment Start**
  - [ ] Post to #deployments channel
  - [ ] Include deployment window
  - [ ] List affected services

- [ ] **Execute Deployment**
  - [ ] Run deployment pipeline
  - [ ] Monitor deployment progress
  - [ ] Watch for errors

- [ ] **Verify Deployment**
  - [ ] Check pod status
  - [ ] Run smoke tests
  - [ ] Verify health endpoints
  - [ ] Check error rates

- [ ] **Post-Deployment**
  - [ ] Monitor for 15 minutes
  - [ ] Verify metrics normal
  - [ ] Update documentation
  - [ ] Announce completion

### Post-Deployment Checklist

**Time**: After deployment  
**Duration**: 15 minutes  
**Owner**: Deployment Engineer

- [ ] **Verification**
  - [ ] All pods running
  - [ ] Smoke tests passed
  - [ ] No new alerts triggered
  - [ ] Business metrics normal

- [ ] **Monitoring**
  - [ ] Watch error rates for 30 minutes
  - [ ] Monitor response times
  - [ ] Verify log ingestion

- [ ] **Cleanup**
  - [ ] Remove old deployment artifacts
  - [ ] Archive deployment logs
  - [ ] Close deployment tracking

- [ ] **Documentation**
  - [ ] Update changelog
  - [ ] Document any issues
  - [ ] Update runbooks if needed

---

## Incident Checklists

### Incident Declaration Checklist

**Time**: Immediately on incident detection  
**Duration**: 5 minutes  
**Owner**: First responder

- [ ] **Severity Assessment**
  - [ ] Determine severity level (SEV-1 to SEV-4)
  - [ ] Document affected systems
  - [ ] Assess customer impact

- [ ] **Incident Creation**
  - [ ] Create incident in tracking system
  - [ ] Assign severity level
  - [ ] Set incident commander

- [ ] **Communication**
  - [ ] Create incident channel
  - [ ] Notify on-call team
  - [ ] Update status page (if customer-facing)
  - [ ] Alert leadership (SEV-1/SEV-2)

- [ ] **Documentation**
  - [ ] Start incident timeline
  - [ ] Document initial findings
  - [ ] Set update frequency

### Incident Response Checklist

**Time**: During incident response  
**Duration**: Until resolution  
**Owner**: Incident Commander

- [ ] **Response Initiation**
  - [ ] Acknowledge incident
  - [ ] Assemble response team
  - [ ] Establish war room (if needed)

- [ ] **Investigation**
  - [ ] Gather system metrics
  - [ ] Review recent changes
  - [ ] Analyze error logs
  - [ ] Identify root cause

- [ ] **Mitigation**
  - [ ] Implement immediate fixes
  - [ ] Communicate status updates
  - [ ] Coordinate with stakeholders
  - [ ] Monitor fix effectiveness

- [ ] **Resolution**
  - [ ] Verify fix works
  - [ ] Monitor for recurrence
  - [ ] Clear incident status
  - [ ] Document resolution

### Post-Incident Checklist

**Time**: Within 48 hours of resolution  
**Duration**: 2 hours  
**Owner**: Incident Commander

- [ ] **Postmortem Preparation**
  - [ ] Gather all incident data
  - [ ] Collect timeline events
  - [ ] Identify participants

- [ ] **Postmortem Meeting**
  - [ ] Schedule blameless postmortem
  - [ ] Review timeline
  - [ ] Identify root cause
  - [ ] Document lessons learned

- [ ] **Action Items**
  - [ ] Create action tickets
  - [ ] Assign owners and due dates
  - [ ] Prioritize improvements

- [ ] **Documentation**
  - [ ] Publish postmortem report
  - [ ] Update runbooks
  - [ ] Share learnings with team

---

## Maintenance Checklists

### Database Maintenance

**Time**: Scheduled maintenance window  
**Duration**: 2 hours  
**Owner**: Database Admin

- [ ] **Pre-Maintenance**
  - [ ] Notify stakeholders
  - [ ] Verify backup complete
  - [ ] Check maintenance window
  - [ ] Prepare rollback plan

- [ ] **Maintenance Tasks**
  - [ ] Run VACUUM ANALYZE
  - [ ] Update statistics
  - [ ] Rebuild indexes if needed
  - [ ] Clean up old data

- [ ] **Post-Maintenance**
  - [ ] Verify database health
  - [ ] Check query performance
  - [ ] Monitor error rates
  - [ ] Document changes

### Kubernetes Maintenance

**Time**: Scheduled maintenance window  
**Duration**: 1 hour  
**Owner**: Platform Engineer

- [ ] **Pre-Maintenance**
  - [ ] Check cluster health
  - [ ] Verify node status
  - [ ] Check resource availability
  - [ ] Notify stakeholders

- [ ] **Maintenance Tasks**
  - [ ] Drain nodes for updates
  - [ ] Apply Kubernetes updates
  - [ ] Restart kubelet services
  - [ ] Verify node rejoining

- [ ] **Post-Maintenance**
  - [ ] Verify all nodes ready
  - [ ] Check pod scheduling
  - [ ] Monitor resource usage
  - [ ] Test service connectivity

### Certificate Rotation

**Time**: Before certificate expiry  
**Duration**: 30 minutes  
**Owner**: Security Engineer

- [ ] **Pre-Rotation**
  - [ ] Generate new certificate
  - [ ] Verify certificate chain
  - [ ] Test in staging environment

- [ ] **Rotation**
  - [ ] Update secret in cluster
  - [ ] Restart affected services
  - [ ] Verify new certificate active

- [ ] **Post-Rotation**
  - [ ] Verify certificate installed
  - [ ] Check for errors
  - [ ] Update documentation
  - [ ] Remove old certificate

---

## Security Checklists

### Daily Security Checks

- [ ] Review failed authentication attempts
- [ ] Check for unusual API patterns
- [ ] Verify no unauthorized access
- [ ] Monitor security alerts

### Weekly Security Checks

- [ ] Review access logs
- [ ] Check for security advisories
- [ ] Verify firewall rules
- [ ] Review network policies

### Monthly Security Checks

- [ ] Full access audit
- [ ] Penetration test review
- [ ] Vulnerability scan results
- [ ] Compliance checklist review

---

## Troubleshooting Checklists

### API Issues

- [ ] Check pod status
- [ ] Verify health endpoint
- [ ] Check resource usage
- [ ] Review error logs
- [ ] Check database connectivity
- [ ] Verify cache status
- [ ] Test external dependencies
- [ ] Check recent deployments

### Database Issues

- [ ] Check connection pool
- [ ] Review active queries
- [ ] Check for locks
- [ ] Monitor disk space
- [ ] Verify replication status
- [ ] Check slow queries
- [ ] Review index usage
- [ ] Test backup restoration

### Cache Issues

- [ ] Check Redis status
- [ ] Verify memory usage
- [ ] Check hit rate
- [ ] Review eviction policy
- [ ] Test connectivity
- [ ] Check cluster health

---

## Version History

| Version | Date    | Author        | Changes                         |
| ------- | ------- | ------------- | ------------------------------- |
| 1.0     | $(date) | Platform Team | Initial checklist documentation |

---

_Last Updated: $(date)_
_Document Owner: Platform Engineering Team_
