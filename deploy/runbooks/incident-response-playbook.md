# Incident Response Playbook - Phase 26 Production

## Incident Severity Levels

### P0 - Critical (Response: 15 minutes)
- Complete service outage
- Data loss or corruption
- Security breach
- Major compliance violation

### P1 - High (Response: 1 hour)
- Partial service degradation
- High error rates (>5%)
- Performance degradation (p95 >500ms)
- Single service down but not impacting all users

### P2 - Medium (Response: 4 hours)
- Minor service degradation
- Non-critical feature broken
- Performance issues (p95 200-500ms)
- Elevated but manageable error rates

### P3 - Low (Response: Next business day)
- Cosmetic issues
- Minor bugs
- Documentation issues
- Non-urgent feature requests

## Incident Response Process

### 1. Detection & Alert
**Who**: Automated monitoring (AlertManager) or manual report

**Actions**:
- Alert fires in #incidents-prod channel
- On-call engineer paged via PagerDuty/OpsGenie
- Alert includes service, metric, and severity

### 2. Triage (First 5 minutes)
**Who**: On-call engineer

**Actions**:
1. Acknowledge alert in paging system
2. Check Grafana dashboards
3. Review recent deployments
4. Assess severity level
5. If P0/P1: Create war room and escalate

**Decision Points**:
- Is this really an incident? (vs. false alarm)
- What's the customer impact?
- Do we need to escalate?

### 3. Investigation (5-30 minutes)
**Who**: On-call + escalated team

**Actions**:
1. Check service logs (Loki)
2. Check distributed traces (Jaeger)
3. Check database health
4. Check external dependencies (carrier APIs, etc.)
5. Identify root cause
6. Document findings in incident channel

**Tools**:
- Grafana: http://localhost:3001
- Loki: http://localhost:3100
- Jaeger: http://localhost:16686
- Prometheus: http://localhost:9090

### 4. Mitigation (Immediate)
**Who**: On-call + engineering manager

**Options by Scenario**:

#### High Error Rate
- Check recent deployments → rollback if needed
- Check database connections → restart pods
- Check carrier API rate limits → enable circuit breaker
- Check queue backlog → scale workers

#### High Latency
- Check database slow queries → add indexes
- Check memory leaks → restart pods
- Check external API latency → enable caching
- Check traffic spike → scale horizontally

#### Service Down
- Check pod status → restart if crashlooping
- Check health endpoints → investigate readiness failures
- Check database connectivity → verify credentials
- Check resource exhaustion → scale up

#### Data Integrity Issue
- Enable maintenance mode
- Stop background jobs
- Assess data corruption scope
- Restore from backup if needed
- Forward-fix data

#### Security Breach
- Isolate affected systems
- Revoke compromised credentials
- Enable additional logging
- Contact security team
- Notify stakeholders

### 5. Communication
**Who**: Incident commander

**Internal**:
- Post status updates every 15-30 minutes
- Keep #incidents-prod and war room updated
- Escalate to management for P0/P1

**External** (if customer-impacting):
- Update status page
- Send email to affected customers
- Post on social media if major outage

### 6. Resolution
**Who**: On-call engineer

**Actions**:
1. Implement permanent fix (or schedule if time-consuming)
2. Verify metrics return to normal
3. Monitor for 30 minutes post-fix
4. Close incident in paging system
5. Update status page
6. Notify stakeholders

### 7. Post-Incident Review (Within 48 hours)
**Who**: Incident commander + team

**Actions**:
1. Schedule PIR meeting
2. Document timeline
3. Identify root cause
4. List action items
5. Update runbooks
6. Share learnings

## Common Scenarios & Runbooks

### Scenario 1: Database Connection Pool Exhausted
**Symptoms**: High latency, 500 errors, "no connection available"

**Investigation**:
```bash
kubectl logs -n production deployment/api | grep "connection pool"
kubectl logs -n production deployment/data-service | grep "connection pool"
```

**Mitigation**:
1. Restart pods to reset connections
2. Check for connection leaks in code
3. Increase connection pool size in config
4. Scale up read replicas

**Prevention**:
- Add connection pool monitoring
- Set max connection lifetime
- Add connection leak detection

### Scenario 2: Carrier API Rate Limit Exceeded
**Symptoms**: Carrier API errors, "rate limit exceeded"

**Investigation**:
```bash
# Check carrier API request rate
curl http://localhost:9090/api/v1/query?query='rate(carrier_api_requests_total[5m])'
```

**Mitigation**:
1. Enable request queuing
2. Implement exponential backoff
3. Use cached quotes when available
4. Contact carrier to increase limits

**Prevention**:
- Monitor carrier API usage
- Implement circuit breaker
- Add request throttling

### Scenario 3: Memory Leak
**Symptoms**: Increasing memory usage, OOM kills, pod restarts

**Investigation**:
```bash
# Check memory usage trend
kubectl top pods -n production
kubectl describe pod <pod-name> -n production
```

**Mitigation**:
1. Restart affected pods
2. Take heap dump for analysis
3. Reduce traffic if needed
4. Scale horizontally

**Prevention**:
- Add memory leak detection
- Set memory limits on pods
- Regular memory profiling

### Scenario 4: Failed Deployment
**Symptoms**: Pods not ready, increased errors after deployment

**Investigation**:
```bash
kubectl get pods -n production
kubectl logs <pod-name> -n production
kubectl describe pod <pod-name> -n production
```

**Mitigation**:
1. Check deployment status
2. Review pod logs
3. Rollback deployment
4. Fix issue and redeploy

**Prevention**:
- Staging deployment validation
- Blue-green deployments
- Automated rollback triggers

## Key Contacts

### On-Call Rotation
- **Primary**: DevOps Engineer (PagerDuty)
- **Secondary**: Backend Engineer (PagerDuty)
- **Escalation**: Engineering Manager
- **Executive**: CTO

### External Contacts
- **Database Support**: support@database-provider.com
- **Carrier A Support**: tech@carrier-a.com
- **Carrier B Support**: support@carrier-b.com
- **AWS Support**: Enterprise Support (case portal)

## Tools & Resources

### Monitoring
- Grafana: http://grafana.company.com
- Prometheus: http://prometheus.company.com
- Loki: http://loki.company.com
- Jaeger: http://jaeger.company.com

### Infrastructure
- Kubernetes Dashboard: https://k8s.company.com
- AWS Console: https://console.aws.amazon.com
- CloudFlare Dashboard: https://dash.cloudflare.com

### Communication
- Slack: #incidents-prod
- War Room: #launch-war-room
- Status Page: https://status.company.com
- PagerDuty: https://company.pagerduty.com

## Post-Incident Actions

### Immediate (Day 1)
- [ ] Incident closed in paging system
- [ ] Status page updated
- [ ] Stakeholders notified
- [ ] Monitoring confirmed normal
- [ ] Temporary fixes documented

### Short-term (Week 1)
- [ ] PIR completed
- [ ] Action items created
- [ ] Runbooks updated
- [ ] Team debriefed

### Long-term (Month 1)
- [ ] Permanent fixes implemented
- [ ] Prevention measures added
- [ ] Monitoring improved
- [ ] Documentation updated
