# Deployment Checklist

## 🎯 Overview

This comprehensive checklist ensures safe, reliable deployments across all environments. Complete all items before proceeding with deployment.

---

## 📋 Pre-Deployment Checklist

### Code Quality & Security
- [ ] **Code Review Completed**
  - [ ] All PRs reviewed by minimum 2 team members
  - [ ] Code review comments addressed
  - [ ] Security review completed for sensitive changes
  - [ ] Architecture review completed for major changes

- [ ] **Tests Passing**
  - [ ] Unit tests: `npm run test:unit` - 100% passing
  - [ ] Integration tests: `npm run test:integration` - 100% passing
  - [ ] End-to-end tests: `npm run test:e2e` - 100% passing
  - [ ] Code coverage > 80%

- [ ] **Security Scan Passed**
  - [ ] Snyk vulnerability scan: No critical/high vulnerabilities
  - [ ] CodeQL scan: No critical security issues
  - [ ] Dependency audit: `npm audit` - No high/critical issues
  - [ ] Container scan: No critical vulnerabilities in Docker images

- [ ] **Performance Baseline Met**
  - [ ] Load test results reviewed
  - [ ] Performance benchmarks maintained or improved
  - [ ] Database query performance validated
  - [ ] Memory/CPU usage within acceptable limits

- [ ] **Documentation Updated**
  - [ ] CHANGELOG.md updated with all changes
  - [ ] API documentation updated if needed
  - [ ] Runbooks updated if procedures changed
  - [ ] Architecture diagrams updated if needed

### Environment Validation
- [ ] **Staging Deployment Successful**
  - [ ] Recent deployment to staging completed
  - [ ] All tests passing in staging environment
  - [ ] Database migrations applied successfully
  - [ ] Environment variables configured correctly

- [ ] **Load Tests Passed**
  - [ ] Performance tests against staging completed
  - [ ] API response time < 200ms (p95)
  - [ ] Database query time < 100ms (p95)
  - [ ] Memory usage < 80% under load
  - [ ] No memory leaks detected

- [ ] **Database Migrations Tested**
  - [ ] Migration scripts reviewed and tested
  - [ ] Rollback scripts tested
  - [ ] Data migration validated
  - [ ] Migration timing documented
  - [ ] Performance impact assessed

- [ ] **Environment Configuration**
  - [ ] All environment variables documented
  - [ ] Secrets managed through secrets manager
  - [ ] Feature flags configured
  - [ ] External service configurations validated

- [ ] **External Dependencies**
  - [ ] Third-party API keys validated
  - [ ] Database connections tested
  - [ ] Message queue connectivity verified
  - [ ] CDN configurations tested
  - [ ] Email/SMS service connectivity validated

### Risk Assessment & Planning
- [ ] **Rollback Plan Documented**
  - [ ] Step-by-step rollback procedure written
  - [ ] Rollback testing completed
  - [ ] Rollback owner assigned
  - [ ] Rollback time estimated (< 15 minutes)

- [ ] **Change Risk Assessment**
  - [ ] Risk level determined (Low/Medium/High)
  - [ ] Impact analysis completed
  - [ ] Mitigation strategies documented
  - [ ] Escalation criteria defined

- [ ] **Team Notification**
  - [ ] All relevant team members notified
  - [ ] Stakeholders informed of timeline
  - [ ] Customer support team briefed
  - [ ] Sales team notified if customer-facing changes

- [ ] **On-Call Assignment**
  - [ ] Primary on-call engineer assigned
  - [ ] Secondary on-call engineer assigned
  - [ ] Contact information verified
  - [ ] Escalation path defined

- [ ] **Deployment Window Confirmed**
  - [ ] Low traffic period selected
  - [ ] No conflicting deployments scheduled
  - [ ] Business stakeholders approved timing
  - [ ] Weekend/holiday considerations evaluated

### Infrastructure Readiness
- [ ] **Infrastructure Ready**
  - [ ] All required resources available
  - [ ] Network connectivity verified
  - [ ] Load balancer configurations updated
  - [ ] CDN cache invalidated if needed

- [ ] **Monitoring Dashboards Open**
  - [ ] Grafana dashboards accessible
  - [ ] Custom dashboards for deployment metrics
  - [ ] Dashboard permissions verified
  - [ ] Alert thresholds configured

- [ ] **Alert Rules Active**
  - [ ] All relevant alert rules enabled
  - [ ] PagerDuty integration tested
  - [ ] Slack notifications working
  - [ ] SMS alerts configured for critical issues

- [ ] **Communications Channel Open**
  - [ ] Slack/Teams deployment channel created
  - [ ] Real-time status updates planned
  - [ ] Customer communication templates prepared
  - [ ] Status page updates ready

- [ ] **Backups Current**
  - [ ] Latest database backup verified
  - [ ] Application data backup current
  - [ ] Backup restoration tested
  - [ ] Backup storage location confirmed

---

## 🚀 Deployment Checklist

### Pre-Deployment Setup
- [ ] **Pre-Flight Checks**
  - [ ] Kubernetes cluster healthy
  - [ ] All nodes in Ready state
  - [ ] Sufficient resources available
  - [ ] Network policies validated

- [ ] **Build Process**
  - [ ] Clean build environment
  - [ ] Dependency installation successful
  - [ ] Application build completed
  - [ ] Docker images built and tagged

- [ ] **Registry Push**
  - [ ] Images pushed to container registry
  - [ ] Image digest verified
  - [ ] Multi-architecture support verified
  - [ ] Image vulnerability scan passed

### Deployment Execution
- [ ] **Database Backup**
  - [ ] Pre-deployment backup created
  - [ ] Backup integrity verified
  - [ ] Backup storage location confirmed
  - [ ] Restoration procedure tested

- [ ] **Deployment Start**
  - [ ] Start deployment timestamp recorded
  - [ ] Deployment branch/tag confirmed
  - [ ] Deployment team assembled
  - [ ] Communication channels active

- [ ] **Application Deployment**
  - [ ] Helm chart deployment initiated
  - [ ] Rollout progress monitored
  - [ ] Health checks passing
  - [ ] Pods transitioning to Ready state

- [ ] **Database Migrations**
  - [ ] Migration scripts executed
  - [ ] Migration success verified
  - [ ] Data integrity validated
  - [ ] Performance impact assessed

- [ ] **Service Registration**
  - [ ] Service endpoints updated
  - [ ] Load balancer targets updated
  - [ ] DNS records updated if needed
  - [ ] CDN configurations updated

### Traffic Management
- [ ] **Blue-Green Setup**
  - [ ] Blue environment deployed and healthy
  - [ ] Green environment deployed and healthy
  - [ ] Health checks passing on new environment
  - [ ] Traffic switching mechanism ready

- [ ] **Canary Deployment**
  - [ ] Canary version deployed
  - [ ] Initial traffic routing (5%)
  - [ ] Canary metrics monitored
  - [ ] Gradual traffic increase planned

- [ ] **Traffic Switching**
  - [ ] Ingress rules updated
  - [ ] Load balancer weights adjusted
  - [ ] DNS TTL considered
  - [ ] Cache invalidation performed

### Monitoring & Validation
- [ ] **Health Monitoring**
  - [ ] Health endpoints responding
  - [ ] Service discovery working
  - [ ] Load balancer health checks passing
  - [ ] Database connectivity verified

- [ ] **Performance Monitoring**
  - [ ] Response times within SLA
  - [ ] Error rates within acceptable limits
  - [ ] Resource utilization normal
  - [ ] No memory leaks detected

- [ ] **Error Monitoring**
  - [ ] Application logs clean
  - [ ] No critical errors in logs
  - [ ] Error tracking (Sentry) functional
  - [ ] Alert escalation working

---

## ✅ Post-Deployment Checklist

### Immediate Verification (0-30 minutes)
- [ ] **Service Health**
  - [ ] All services responding to health checks
  - [ ] Pods in Running state
  - [ ] No CrashLoopBackOff pods
  - [ ] No ImagePullBackOff errors

- [ ] **Endpoint Validation**
  - [ ] API endpoints responding (200 status)
  - [ ] Frontend application loading
  - [ ] Static assets loading correctly
  - [ ] WebSocket connections working

- [ ] **Database Operations**
  - [ ] CRUD operations working
  - [ ] Transaction integrity maintained
  - [ ] Query performance normal
  - [ ] Connection pool healthy

- [ ] **Cache Operations**
  - [ ] Redis connections working
  - [ ] Cache hit rate normal
  - [ ] No connection timeouts
  - [ ] Memory usage within limits

- [ ] **Message Queue**
  - [ ] Queue processing working
  - [ ] Dead letter queue empty
  - [ ] Consumer groups healthy
  - [ ] Message delivery confirmed

### Functional Testing (30-60 minutes)
- [ ] **Authentication & Authorization**
  - [ ] User login/logout working
  - [ ] Token validation working
  - [ ] Role-based access control functional
  - [ ] Session management working

- [ ] **Core Business Functions**
  - [ ] Lead generation working
  - [ ] Customer management functional
  - [ ] Policy creation/management working
  - [ ] Claims processing functional

- [ ] **Data Operations**
  - [ ] File uploads working
  - [ ] Document processing functional
  - [ ] Data exports working
  - [ ] Report generation working

- [ ] **External Integrations**
  - [ ] Third-party API calls working
  - [ ] Payment processing functional
  - [ ] Email notifications sending
  - [ ] SMS notifications working

- [ ] **Background Jobs**
  - [ ] Scheduled jobs running
  - [ ] Batch processing working
  - [ ] Data synchronization functional
  - [ ] Cleanup jobs working

### Extended Monitoring (1-4 hours)
- [ ] **Performance Validation**
  - [ ] API response times stable
  - [ ] Database performance maintained
  - [ ] Memory usage stable
  - [ ] CPU utilization normal

- [ ] **Error Rate Monitoring**
  - [ ] Error rate < 0.1%
  - [ ] No error spikes detected
  - [ ] 404 errors within normal range
  - [ ] 5xx errors within acceptable limits

- [ ] **Resource Utilization**
  - [ ] Memory usage < 80%
  - [ ] CPU usage < 70%
  - [ ] Disk usage < 85%
  - [ ] Network latency normal

- [ ] **Database Health**
  - [ ] Connection count normal
  - [ ] Query execution time normal
  - [ ] Lock wait time acceptable
  - [ ] Replication lag < 1 second

- [ ] **Cache Performance**
  - [ ] Cache hit rate > 80%
  - [ ] Cache response time < 10ms
  - [ ] Memory usage stable
  - [ ] No connection failures

### Final Validation (4-24 hours)
- [ ] **Long-Running Tests**
  - [ ] 24-hour stability test passed
  - [ ] Memory leak tests passed
  - [ ] Database connection pool stable
  - [ ] File descriptor usage normal

- [ ] **Customer Impact Assessment**
  - [ ] No customer-reported issues
  - [ ] Support ticket volume normal
  - [ ] User experience metrics stable
  - [ ] Feature adoption tracking normal

- [ ] **Documentation Updates**
  - [ ] Runbooks updated if needed
  - [ ] API documentation updated
  - [ ] Troubleshooting guides current
  - [ ] Deployment notes recorded

- [ ] **Team Notification**
  - [ ] Deployment success communicated
  - [ ] Stakeholders notified
  - [ ] Post-mortem scheduled if needed
  - [ ] Lessons learned documented

### Cleanup Activities
- [ ] **Environment Cleanup**
  - [ ] Temporary resources removed
  - [ ] Old images cleaned from registry
  - [ ] Debug endpoints disabled
  - [ ] Development artifacts removed

- [ ] **Monitoring Cleanup**
  - [ ] Deployment-specific dashboards cleaned
  - [ ] Temporary alerts disabled
  - [ ] Log retention policies applied
  - [ ] Performance baselines updated

- [ ] **Security Validation**
  - [ ] Security scan results reviewed
  - [ ] Vulnerability assessment completed
  - [ ] Access controls verified
  - [ ] Secrets rotation completed if needed

- [ ] **Backup Verification**
  - [ ] Post-deployment backup created
  - [ ] Backup integrity verified
  - [ ] Backup restoration tested
  - [ ] Backup retention policy applied

---

## 🚨 Rollback Criteria

### Immediate Rollback Triggers
- [ ] **Service Unavailability**
  - [ ] API endpoints not responding
  - [ ] Health checks failing
  - [ ] Database connectivity lost
  - [ ] Critical service down

- [ ] **High Error Rate**
  - [ ] Error rate > 5% for 2 minutes
  - [ ] 5xx errors > 1% for 5 minutes
  - [ ] Database errors > 0.1%
  - [ ] Authentication failures > 10%

- [ ] **Performance Degradation**
  - [ ] Response time > 5 seconds (p95)
  - [ ] Database query time > 30 seconds
  - [ ] Memory usage > 95%
  - [ ] CPU usage > 90%

- [ ] **Data Integrity Issues**
  - [ ] Data corruption detected
  - [ ] Transaction failures
  - [ ] Inconsistent state detected
  - [ ] Referential integrity violations

### Rollback Execution
- [ ] **Decision Made**
  - [ ] Rollback criteria met
  - [ ] Stakeholder notification sent
  - [ ] Rollback team assembled
  - [ ] Communication channels activated

- [ ] **Rollback Executed**
  - [ ] Helm rollback initiated
  - [ ] Database rollback if needed
  - [ ] Traffic redirected
  - [ ] Services restarted

- [ ] **Rollback Verified**
  - [ ] Services healthy
  - [ ] Performance metrics normal
  - [ ] Error rates low
  - [ ] Customer impact minimal

- [ ] **Post-Rollback Activities**
  - [ ] Incident documented
  - [ ] Root cause analysis started
  - [ ] Fix strategy developed
  - [ ] Re-deployment planned

---

## 📊 Success Metrics

### Performance Metrics
- **Response Time**: < 200ms (p95), < 100ms (p50)
- **Error Rate**: < 0.1% overall, < 0.01% critical
- **Availability**: 99.9% uptime
- **Throughput**: Maintained or improved

### Operational Metrics
- **Deployment Success Rate**: > 95%
- **Rollback Rate**: < 5%
- **Time to Recovery**: < 15 minutes for critical issues
- **Mean Time to Detect**: < 2 minutes

### Business Metrics
- **Customer Impact**: Zero critical issues
- **Feature Adoption**: No significant drop
- **Support Ticket Volume**: Normal levels
- **Revenue Impact**: No negative impact

---

## 🔗 Quick Reference

### Emergency Contacts
- **Primary On-call**: @primary-oncall
- **Secondary On-call**: @secondary-oncall
- **Platform Lead**: @platform-lead
- **Security Team**: @security-team

### Critical Commands
```bash
# Quick health check
kubectl get pods -n production

# Check errors
kubectl logs -n production -l app=api --tail=100 | grep ERROR

# Emergency rollback
helm rollback insurance-lead-gen 1 -n production

# Scale down
kubectl scale deployment api -n production --replicas=0
```

### Useful Links
- [Deployment Dashboard](https://dashboard.insurance-lead-gen.com)
- [Grafana Monitoring](https://grafana.insurance-lead-gen.com)
- [PagerDuty Incidents](https://company.pagerduty.com)
- [Slack #deployments](https://company.slack.com/channels/deployments)
