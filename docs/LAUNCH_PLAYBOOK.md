# Launch Playbook

## Overview

This playbook provides step-by-step procedures for launching the Insurance Lead Generation AI Platform to production. It should be used in conjunction with `RUN_15_6.md` for launch readiness assessment.

## Pre-Launch Preparation (T-2 Weeks to T-1 Day)

### T-2 Weeks: Initial Assessment

**Objective**: Establish baseline and identify gaps

```bash
# 1. Run initial health check
./scripts/launch-health-check.sh > /tmp/health-check-t2w.log

# 2. Review and document any failures
# Assign owners to each failing check
# Set remediation deadlines

# 3. Set up monitoring dashboards
# Import dashboards into Grafana
# Verify all metrics are being collected

# 4. Prepare runbooks
# Review all operational runbooks
# Conduct runbook walkthrough with team
# Update runbooks with any gaps

# 5. Conduct dry run of rollback procedure
# Test in staging environment
# Document any issues
# Update rollback procedure
```

**Deliverables**:
- Initial health check report
- Remediation plan with owners and deadlines
- Monitoring dashboards operational
- Runbooks reviewed and updated
- Rollback procedure tested

### T-1 Week: Final Verification

**Objective**: Complete all checklist items

```bash
# 1. Complete pre-launch checklist
# Go through each item in RUN_15_6.md
# Mark complete or note blockers

# 2. Run load testing
k6 run --vus 100 --duration 30m scripts/load-test.js

# 3. Security audit
./scripts/security-audit.sh

# 4. Database verification
./scripts/verify-database.sh

# 5. Backup verification
./scripts/verify-backups.sh

# 6. Documentation review
# Ensure all docs are up to date
# Verify API docs are current
# Check runbooks are complete
```

**Deliverables**:
- Pre-launch checklist 100% complete
- Load test report
- Security audit report
- Database verification report
- Backup verification report
- Documentation review complete

### T-3 Days: Go/No-Go Review

**Objective**: Make final launch decision

**Meeting Participants**:
- Engineering Lead
- Product Manager
- DevOps Lead
- Security Lead
- QA Lead
- Operations Lead

**Agenda**:

1. **Review Must-Have Criteria (15 items)**
   - Each owner reports status
   - Any failures = NO-GO unless waived

2. **Review Should-Have Criteria (16 items)**
   - Need ≥ 80% (13 items) to pass
   - Document any missing items and impact

3. **Review Nice-to-Have Criteria (6 items)**
   - Need ≥ 50% (3 items) to pass
   - Note any gaps for post-launch

4. **Risk Assessment Review**
   - Review identified risks
   - Verify mitigation plans in place
   - Discuss any new risks

5. **Team Recommendations**
   - Each team lead gives GO/NO-GO
   - Discuss any concerns

6. **Final Decision**
   - Consensus or Engineering Lead decision
   - Document decision rationale
   - If NO-GO: Set next review date

**Deliverables**:
- Completed Go/No-Go decision form
- Documented decision with rationale
- Launch plan (if GO) or remediation plan (if NO-GO)

### T-1 Day: Launch Preparation

**Objective**: Final readiness before launch

```bash
# 1. Final system health check
./scripts/launch-health-check.sh

# 2. Verify on-call schedule
./scripts/verify-oncall.sh

# 3. Prepare deployment
./scripts/prepare-deployment.sh

# 4. Send pre-launch notification
# Use template from RUN_15_6_QUICKSTART.md

# 5. Brief all teams
# Schedule and run launch brief meeting
# Confirm everyone knows their role

# 6. Set up communication channels
# Verify #launch-status channel
# Verify #incidents channel
# Verify on-call pager/phone

# 7. Prepare monitoring
# Open Grafana dashboards
# Set up alert notifications
# Clear any old alerts
```

**Deliverables**:
- Final health check passed
- On-call schedule verified
- Deployment ready
- Pre-launch notification sent
- All teams briefed
- Communication channels ready
- Monitoring configured

## Launch Day Execution (T-0)

### Pre-Launch (T-1 hour)

**Timeline**: Launch time - 1 hour

**Tasks**:

1. **System Warm-up**
   ```bash
   # Verify all systems are running
   ./scripts/launch-health-check.sh

   # Check monitoring is active
   ./scripts/launch-metrics-check.sh

   # Verify backups are current
   ./scripts/verify-backups.sh
   ```

2. **Team Briefing**
   - Confirm all team members are available
   - Verify communication channels
   - Review launch timeline
   - Reiterate rollback triggers

3. **Final Verification**
   ```bash
   # Run smoke tests in staging
   ./scripts/smoke-tests.sh

   # Verify database is in sync
   ./scripts/verify-db-sync.sh

   # Check for any blocking issues
   # Review recent commits and PRs
   ```

4. **Prepare Monitoring**
   - Open all Grafana dashboards
   - Start continuous metrics monitoring
   - Clear any historical alerts
   - Set up real-time alerts on phone/pager

### Launch (T-0)

**Timeline**: Launch time

**Deployment Process**:

```bash
# 1. Create launch window in communication channel
# Post: "Launch window starting at [time]"

# 2. Deploy to production
./scripts/deploy-prod.sh

# 3. Monitor deployment
kubectl rollout status deployment/api
kubectl rollout status deployment/data-service
kubectl rollout status deployment/orchestrator
kubectl rollout status deployment/backend

# 4. Verify deployment
./scripts/verify-deployment.sh

# 5. Run smoke tests
./scripts/smoke-tests.sh

# 6. Check all services
./scripts/launch-health-check.sh
./scripts/launch-metrics-check.sh
```

**If Any Step Fails**:
1. Stop and assess
2. Determine if rollback needed
3. If rollback: Execute rollback procedure immediately
4. Communicate to team via #incidents

### Post-Launch (T+0 to T+1 hour)

**Critical Monitoring Period**

```bash
# Open 4 terminal windows:

# Terminal 1: System Health
watch -n 30 './scripts/launch-health-check.sh'

# Terminal 2: Metrics
watch -n 30 './scripts/launch-metrics-check.sh'

# Terminal 3: Quick Dashboard
watch -n 30 './scripts/quick-status-dashboard.sh'

# Terminal 4: Error Monitoring
watch -n 60 './scripts/error-monitor.sh'
```

**Checklist**:

- [ ] All pods healthy
- [ ] Health endpoints responding
- [ ] Error rate < 0.1%
- [ ] P95 response time < 300ms
- [ ] No database errors
- [ ] Cache hit rate > 80%
- [ ] No critical alerts
- [ ] Users can access platform
- [ ] Lead creation working
- [ ] AI scoring working

**Rollback Triggers** (if any occur, rollback immediately):
- Availability < 95% for 30 minutes
- Error rate > 5% for 15 minutes
- Data corruption detected
- Security breach confirmed
- Critical bug blocking core functionality

**If Rollback Needed**:

```bash
# 1. Identify issue and document
echo "[timestamp] ISSUE: <description>" >> /tmp/launch-issues.log

# 2. Execute rollback
./scripts/rollback.sh

# 3. Verify rollback
./scripts/launch-health-check.sh

# 4. Notify team
# Post to #incidents channel
# Page on-call engineer

# 5. Document incident
./scripts/document-incident.sh
```

**If No Rollback Needed**:

```bash
# 1. Confirm launch success
echo "Launch successful at $(date)" >> /tmp/launch-log.txt

# 2. Send launch announcement
# Use template from RUN_15_6_QUICKSTART.md

# 3. Post to #launch-status:
# "✅ Launch complete! All systems operational."

# 4. Begin close monitoring (next 23 hours)
```

## Post-Launch Monitoring

### T+1 to T+24 Hours: Close Monitoring

**Monitoring Schedule**:
- T+1 to T+4 hours: Monitor every 15 minutes
- T+4 to T+12 hours: Monitor every 30 minutes
- T+12 to T+24 hours: Monitor every hour

**Tasks**:

```bash
# Hourly checks (run in loop)
for hour in {1..24}; do
    echo "=== Hour $hour Check ===" >> /tmp/hourly-checks.log

    # Health check
    ./scripts/launch-health-check.sh >> /tmp/hourly-checks.log

    # Metrics check
    ./scripts/launch-metrics-check.sh >> /tmp/hourly-checks.log

    # Check for any issues
    ./scripts/issue-scan.sh >> /tmp/hourly-checks.log

    echo "=== Hour $hour Check Complete ===" >> /tmp/hourly-checks.log

    sleep 3600  # Wait 1 hour
done
```

**Daily Standup** (at T+24 hours):
- Review 24-hour metrics
- Discuss any issues encountered
- Plan any optimizations
- Adjust monitoring if needed

### T+1 to T+7 Days: Daily Monitoring

**Daily Tasks**:

1. **Morning Review** (9:00 AM)
   - Review overnight metrics
   - Check for any alerts
   - Review error logs
   - Note any performance issues

2. **Afternoon Review** (2:00 PM)
   - Review current performance
   - Check user feedback
   - Address any issues

3. **Evening Review** (6:00 PM)
   - Review day's metrics
   - Document any findings
   - Plan next day's priorities

**Weekly Report** (at T+7 days):
- Week 1 summary metrics
- Issues encountered and resolved
- User feedback summary
- Performance trends
- Optimization opportunities
- Recommendations for Week 2

### T+1 to T+30 Days: Weekly Optimization

**Weekly Tasks**:

1. **Performance Review**
   - Review all metrics vs targets
   - Identify trends
   - Plan optimizations

2. **Cost Review**
   - Review infrastructure costs
   - Review AI API costs
   - Identify cost optimization opportunities

3. **User Feedback Review**
   - Collect user feedback
   - Categorize issues
   - Prioritize fixes

4. **Security Review**
   - Review security logs
   - Check for vulnerabilities
   - Update security measures if needed

5. **Capacity Planning**
   - Review resource utilization
   - Plan scaling if needed
   - Budget forecast

## Incident Management

### Incident Classification

| Severity | Description | Response Time |
|----------|-------------|---------------|
| P1 - Critical | System down or severe impact | < 15 minutes |
| P2 - High | Major functionality broken | < 1 hour |
| P3 - Medium | Minor functionality issue | < 4 hours |
| P4 - Low | Cosmetic or non-critical issue | < 24 hours |

### Incident Response Process

1. **Detection**
   - Automated alert
   - User report
   - Manual discovery

2. **Triage**
   - Classify severity
   - Assign owner
   - Set response time target

3. **Response**
   - Implement fix or workaround
   - Monitor for resolution
   - Verify fix

4. **Recovery**
   - Verify system health
   - Check for data issues
   - Communicate resolution

5. **Post-Incident Review**
   - Root cause analysis
   - Document lessons learned
   - Update procedures

### Escalation Procedures

**P1 - Critical**:
1. Immediate: Page on-call engineer (all methods)
2. +15 min: Page engineering lead
3. +30 min: Page CTO

**P2 - High**:
1. Immediate: Slack message to on-call
2. +30 min: Page on-call if no response
3. +1 hour: Page engineering lead

**P3 - Medium**:
1. Create ticket in #engineering
2. Assign appropriate team
3. Monitor until resolved

**P4 - Low**:
1. Create ticket in #engineering
2. Prioritize in backlog
3. Address in upcoming sprint

## Communication Procedures

### Launch Communication

**Pre-Launch (T-1 day)**:
```markdown
📢 Launch Readiness - Tomorrow at 10:00 AM

Go/No-Go meeting tomorrow at 10:00 AM
Location: [Room/Zoom]
All team leads required to attend

Please ensure all checklist items complete by 9:00 AM
```

**Launch Day (T-0)**:
```markdown
🚀 LAUNCH INITIATED

Launch window starting at [time]

Expected duration: 30-60 minutes
Status updates in #launch-status

In case of issues: #incidents
```

**Launch Complete (T+0)**:
```markdown
✅ LAUNCH COMPLETE

Platform is now live!

📍 URL: https://platform.yourcompany.com

Status: All systems operational
Duration: XX minutes

Next: Close monitoring for 24 hours
```

**Day 1 Summary (T+1 day)**:
```markdown
📊 Launch Day 1 Summary

Metrics:
- System availability: 99.95%
- Average response time: 187ms
- Error rate: 0.02%
- Users onboarded: XX
- Leads created: XXX

Known Issues: None

Status: ✅ All systems operational
```

### Incident Communication

**P1 - Critical**:
- Immediate page to all channels
- Update #incidents every 15 minutes
- Post update to #launch-status if during launch

**P2 - High**:
- Initial post to #incidents
- Update every 30 minutes during active work
- Final summary when resolved

**P3/P4**:
- Create ticket in #engineering
- Regular updates via ticket comments
- Summary when resolved

## Rollback Procedures

### Rollback Triggers

Execute rollback if ANY of these occur:
- System availability < 95% for 30 minutes
- Error rate > 5% for 15 minutes
- Data corruption detected
- Security breach confirmed
- Critical bug blocking core functionality

### Rollback Process

```bash
#!/bin/bash
# rollback.sh

echo "=== ROLLBACK INITIATED at $(date) ==="

# 1. Document rollback reason
echo "Reason: $1" >> /tmp/rollback-log.txt

# 2. Identify current revision
CURRENT_REVISION=$(kubectl rollout history deployment/api | tail -1 | awk '{print $1}')
echo "Current revision: $CURRENT_REVISION" >> /tmp/rollback-log.txt

# 3. Identify previous stable revision
STABLE_REVISION=$(kubectl rollout history deployment/api | grep stable | tail -1 | awk '{print $1}')
echo "Rolling back to revision: $STABLE_REVISION" >> /tmp/rollback-log.txt

# 4. Rollback deployments
echo "Rolling back API service..."
kubectl rollout undo deployment/api --to-revision=$STABLE_REVISION
kubectl rollout status deployment/api

echo "Rolling back data service..."
kubectl rollout undo deployment/data-service --to-revision=$STABLE_REVISION
kubectl rollout status deployment/data-service

echo "Rolling back orchestrator..."
kubectl rollout undo deployment/orchestrator --to-revision=$STABLE_REVISION
kubectl rollout status deployment/orchestrator

# 5. Rollback database if needed
read -p "Rollback database schema? (y/n): " rollback_db
if [ "$rollback_db" = "y" ]; then
    echo "Rolling back database..."
    npx prisma migrate resolve --rolled-back "latest_migration"
fi

# 6. Verify rollback
echo "Verifying rollback..."
./scripts/launch-health-check.sh

# 7. Notify team
echo "=== ROLLBACK COMPLETE at $(date) ===" >> /tmp/rollback-log.txt
echo "Rollback complete. See /tmp/rollback-log.txt for details."

# 8. Schedule review
echo "Please schedule incident review meeting."
```

### Post-Rollback Tasks

1. Verify system health
2. Check data integrity
3. Communicate to stakeholders
4. Document incident
5. Schedule root cause analysis
6. Plan re-launch

## Launch Success Criteria

### Technical Success

- [x] All services deployed successfully
- [x] System uptime ≥ 99.9% in first 24 hours
- [x] Error rate < 0.1% in first 24 hours
- [x] P95 response time < 300ms
- [x] No data loss or corruption
- [x] Rollback not required

### Business Success

- [x] Users can successfully onboard
- [x] Lead creation working
- [x] AI scoring operational
- [x] Broker network functioning
- [x] Email delivery > 95%
- [x] Positive user feedback

### Operational Success

- [x] On-call rotation working
- [x] Alerts firing correctly
- [x] Runbooks used effectively
- [x] Team responding to incidents
- [x] Monitoring dashboards operational
- [x] Documentation up to date

## Post-Launch Activities

### Week 1

1. **Daily standups** with launch team
2. **Close monitoring** of all metrics
3. **Quick fixes** for any issues
4. **User feedback** collection
5. **Performance** tuning if needed

### Week 2

1. **Daily monitoring** (less intensive)
2. **Bug fixes** and minor improvements
3. **User training** and onboarding
4. **Documentation** updates
5. **Capacity planning** review

### Week 3-4

1. **Feature prioritization** based on usage
2. **Performance optimization**
3. **Cost optimization**
4. **Scaling planning** if needed
5. **Monthly review** and planning

## References

### Documentation
- `RUN_15_6.md` - Launch readiness guide
- `RUN_15_6_QUICKSTART.md` - Quick reference
- `docs/ARCHITECTURE.md` - System architecture
- `docs/MONITORING.md` - Monitoring guide
- `docs/RUNBOOKS.md` - Operational runbooks

### Scripts
- `scripts/launch-health-check.sh` - Health verification
- `scripts/launch-metrics-check.sh` - Metrics verification
- `scripts/quick-status-dashboard.sh` - Real-time dashboard
- `scripts/deploy-prod.sh` - Production deployment
- `scripts/rollback.sh` - Rollback procedure

### Monitoring
- Grafana: http://localhost:3003
- Prometheus: http://localhost:9090
- Jaeger: http://localhost:16686
- Loki: http://localhost:3100

### Support
- #engineering - General questions
- #incidents - Critical issues
- #launch-status - Launch updates
- #product - User feedback

---

**Version**: 1.0.0
**Last Updated**: January 1, 2026
**Run**: 15.6 - Launch Readiness
