# Launch Readiness Documentation

## Overview

This directory contains comprehensive documentation and tools for launching the Insurance Lead Generation AI Platform to production.

## Documents

### Core Documentation

#### [RUN_15_6.md](../RUN_15_6.md)
**Complete Launch Readiness Guide**

The comprehensive guide covering:
- Go/No-Go decision criteria (15 must-have, 16 should-have, 6 nice-to-have)
- Pre-launch checklist (10 categories, 150+ items)
- Success metrics (18 targets across technical, business, and cost)
- Risk assessment (8 identified risks with mitigation)
- Rollback plan (triggers, procedures, success criteria)
- Post-launch monitoring (24 hours, 7 days, 30 days)
- Communication templates (pre-launch, launch day, post-launch)
- Go/No-Go decision form

**Who should read it**: Engineering leads, DevOps engineers, Product managers, Anyone making launch decisions

---

#### [RUN_15_6_SUMMARY.md](../RUN_15_6_SUMMARY.md)
**Executive Summary of Launch Readiness**

High-level overview including:
- Key deliverables summary
- Quick reference to all criteria
- Launch timeline
- Integration with existing phases
- Success criteria

**Who should read it**: Stakeholders, Executives, Anyone needing a quick overview

---

#### [RUN_15_6_QUICKSTART.md](../RUN_15_6_QUICKSTART.md)
**Quick Start Guide for Launch**

Fast-path to launch readiness including:
- Quick health check (10 minutes)
- Critical metrics check (5 minutes)
- Security scan (15 minutes)
- Load test (30 minutes)
- Database verification (10 minutes)
- Monitoring verification (10 minutes)
- Quick Go/No-Go checklist
- Launch day procedures
- Emergency rollback instructions
- Communication templates (copy & paste)
- Quick troubleshooting

**Who should read it**: Anyone needing to quickly assess or execute launch

---

#### [LAUNCH_PLAYBOOK.md](LAUNCH_PLAYBOOK.md)
**Step-by-Step Launch Procedures**

Detailed execution guide with:
- Pre-launch preparation (T-2 weeks to T-1 day)
- Launch day execution (T-0)
- Post-launch monitoring (T+1 to T+30 days)
- Incident management procedures
- Communication procedures
- Rollback procedures
- Launch success criteria

**Who should read it**: DevOps engineers, On-call engineers, Anyone executing the launch

---

## Tools & Scripts

### [../scripts/launch-health-check.sh](../scripts/launch-health-check.sh)
**Automated Health Check Script**

Checks all critical systems:
- Infrastructure (Kubernetes, Docker)
- Services (API, database, Redis, NATS)
- Monitoring (Prometheus, Grafana)
- Security (secrets, HTTPS)
- Build status (packages, tests)
- Configuration (env vars, Docker)
- Documentation

**Usage**:
```bash
./scripts/launch-health-check.sh
```

**Exit codes**: 0 = all passed, 1 = failures found

---

### [../scripts/launch-metrics-check.sh](../scripts/launch-metrics-check.sh)
**Automated Metrics Verification**

Verifies critical metrics against thresholds:
- Error rate (< 0.1%)
- P95 response time (< 300ms)
- P99 response time (< 500ms)
- System uptime (≥ 99.9%)
- Cache hit rate (> 80%)
- Database query time (< 100ms)
- Business metrics (leads, AI scoring)

**Usage**:
```bash
./scripts/launch-metrics-check.sh
```

**Requires**: Prometheus running and accessible

---

### [../scripts/quick-status-dashboard.sh](../scripts/quick-status-dashboard.sh)
**Real-Time Status Dashboard**

Live dashboard showing:
- Service health
- Performance metrics
- System availability
- Cache & resources
- Business metrics
- Monitoring status
- Quick actions
- Overall status

**Usage**:
```bash
# Run once
./scripts/quick-status-dashboard.sh

# Continuous monitoring (refresh every 30s)
watch -n 30 ./scripts/quick-status-dashboard.sh
```

---

## Launch Timeline

```
T-2 Weeks: Initial Readiness Assessment
  ├─ Run initial health check
  ├─ Identify gaps and assign owners
  ├─ Set up monitoring dashboards
  └─ Test rollback procedure

T-1 Week: Pre-Launch Verification
  ├─ Complete all checklist items
  ├─ Run load testing
  ├─ Security audit
  ├─ Database verification
  └─ Documentation review

T-3 Days: Final Go/No-Go Review
  ├─ Review all criteria
  ├─ Assess risks
  ├─ Team recommendations
  └─ Make final decision

T-1 Day: Launch Preparation
  ├─ Final health check
  ├─ Verify on-call schedule
  ├─ Send notifications
  └─ Brief all teams

T-0: LAUNCH
  ├─ Deploy to production
  ├─ Verify deployment
  ├─ Run smoke tests
  └─ Monitor first hour

T+1 to T+24 Hours: Close Monitoring
  ├─ Monitor every 15-60 minutes
  ├─ Daily standups
  └─ Issue response

T+1 to T+7 Days: Daily Monitoring
  ├─ Daily metric reviews
  ├─ User feedback collection
  └─ Issue resolution

T+1 to T+30 Days: Weekly Optimization
  ├─ Performance review
  ├─ Cost review
  ├─ User feedback review
  └─ Capacity planning
```

## Quick Start

### For a Quick Launch Assessment (15 minutes)

```bash
# 1. Run health check
./scripts/launch-health-check.sh

# 2. Check metrics
./scripts/launch-metrics-check.sh

# 3. Review results
# If both scripts pass, you're ready for Go/No-Go meeting
```

### For a Comprehensive Launch Readiness Review (1 day)

```bash
# 1. Complete pre-launch checklist
# Go through RUN_15_6.md checklist (150+ items)

# 2. Run all verification scripts
./scripts/launch-health-check.sh
./scripts/launch-metrics-check.sh

# 3. Run load test
k6 run --vus 100 --duration 30m scripts/load-test.js

# 4. Security scan
npm audit && pip-audit

# 5. Review documentation
# Ensure all docs are current

# 6. Prepare for Go/No-Go meeting
# Fill out decision form in RUN_15_6.md
```

### For Launch Day Execution

```bash
# Pre-Launch (T-1 hour)
./scripts/launch-health-check.sh
./scripts/launch-metrics-check.sh

# Launch (T-0)
./scripts/deploy-prod.sh
kubectl rollout status deployment/api
./scripts/verify-deployment.sh
./scripts/smoke-tests.sh

# Post-Launch Monitoring (T+0 to T+1 hour)
watch -n 30 ./scripts/quick-status-dashboard.sh
```

## Go/No-Go Decision Process

### Step 1: Complete Checklists

Run through all checklists in `RUN_15_6.md`:
- [ ] Must-Have Criteria (15 items) - ALL must pass
- [ ] Should-Have Criteria (16 items) - ≥ 80% must pass
- [ ] Nice-to-Have Criteria (6 items) - ≥ 50% should pass

### Step 2: Run Automated Checks

```bash
# Health check
./scripts/launch-health-check.sh

# Metrics check
./scripts/launch-metrics-check.sh
```

### Step 3: Review Risk Assessment

- Review 8 identified risks in `RUN_15_6.md`
- Verify all mitigation plans are in place
- Discuss any new concerns

### Step 4: Get Team Recommendations

- Engineering Lead: ☐ GO ☐ NO-GO
- Product Manager: ☐ GO ☐ NO-GO
- DevOps Lead: ☐ GO ☐ NO-GO
- Security Lead: ☐ GO ☐ NO-GO
- QA Lead: ☐ GO ☐ NO-GO
- Operations Lead: ☐ GO ☐ NO-GO

### Step 5: Make Final Decision

Use the Go/No-Go decision form in `RUN_15_6.md` to document:
- All criteria status
- Team recommendations
- Risk assessment
- Final decision with authorization

## Rollback Procedures

### Automatic Rollback Triggers

Rollback immediately if ANY occur:
- System availability < 95% for 30 minutes
- Error rate > 5% for 15 minutes
- Data corruption detected
- Security breach confirmed
- Critical bug blocking core functionality

### Manual Rollback

```bash
# Identify previous stable version
kubectl rollout history deployment/api

# Rollback (example: to revision 42)
kubectl rollout undo deployment/api --to-revision=42

# Rollback database if needed
npx prisma migrate resolve --rolled-back "migration_name"

# Verify rollback
./scripts/launch-health-check.sh
```

See `LAUNCH_PLAYBOOK.md` for detailed rollback procedures.

## Monitoring & Dashboards

### Access Points

| Service | URL | Credentials |
|----------|-----|-------------|
| Grafana | http://localhost:3003 | admin/admin |
| Prometheus | http://localhost:9090 | - |
| Jaeger Tracing | http://localhost:16686 | - |
| Loki Logs | http://localhost:3100 | - |
| API Health | http://localhost:3000/health | - |

### Key Metrics to Watch

**Critical (ALERT if exceeded)**:
- Error rate: > 0.1%
- P95 response time: > 300ms
- System uptime: < 99.9%

**Warning (MONITOR if exceeded)**:
- P99 response time: > 500ms
- Cache hit rate: < 80%
- Database query time: > 100ms

**Business**:
- Lead creation rate
- AI scoring rate
- User registration success

## Communication Templates

All communication templates are in `RUN_15_6_QUICKSTART.md`:

1. **Pre-Launch (T-1 day)** - Go/No-Go meeting notice
2. **Launch Day (T-0)** - "We are live!" announcement
3. **Day 1 Summary (T+1 day)** - Launch success summary
4. **Incident** - P1/P2 incident notifications
5. **Rollback** - Rollback notifications

## Support & Contacts

| Role | Slack Channel | Escalation |
|------|---------------|------------|
| Engineering | #engineering | @eng-lead |
| DevOps | #devops | @devops-lead |
| Security | #security | @security-lead |
| Incidents | #incidents | @oncall |
| Launch Updates | #launch-status | - |
| Product | #product | @pm |

## Emergency Procedures

### P1 - Critical (System Down)
1. Page on-call immediately
2. Page engineering lead (+15 min if no response)
3. Page CTO (+30 min if no response)
4. Update #incidents every 15 minutes

### P2 - High (Major Issue)
1. Create ticket in #incidents
2. Slack message to on-call
3. Page on-call (+30 min if no response)
4. Page engineering lead (+1 hour if no response)

### P3 - Medium (Minor Issue)
1. Create ticket in #engineering
2. Assign to appropriate team
3. Monitor until resolved

### P4 - Low (Non-Critical)
1. Create ticket in #engineering
2. Add to backlog
3. Address in upcoming sprint

## Success Criteria

Launch is successful when:

### Technical
- ✅ All services deployed and healthy
- ✅ System uptime ≥ 99.9% in first 24 hours
- ✅ Error rate < 0.1%
- ✅ P95 response time < 300ms
- ✅ No data loss or corruption

### Business
- ✅ Users can successfully onboard
- ✅ Lead creation working
- ✅ AI scoring operational
- ✅ Email delivery > 95%
- ✅ Positive user feedback

### Operational
- ✅ On-call rotation working
- ✅ Alerts firing correctly
- ✅ Runbooks used effectively
- ✅ Team responding to incidents
- ✅ Documentation up to date

## References

### Documentation
- Architecture: [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
- Monitoring: [docs/MONITORING.md](../docs/MONITORING.md)
- Security: [docs/SECURITY_HARDENING.md](../docs/SECURITY_HARDENING.md)
- Runbooks: [docs/RUNBOOKS.md](../docs/RUNBOOKS.md)
- Disaster Recovery: [docs/DISASTER_RECOVERY.md](../docs/DISASTER_RECOVERY.md)

### Phase Integrations
- Phase 6.5: Production Deployment & Operations
- Phase 6.6: Security Hardening & Compliance
- Phase 14.5: Observability Stack

## FAQ

### Q: What's the difference between RUN_15_6.md and RUN_15_6_QUICKSTART.md?

**A**: RUN_15_6.md is the comprehensive guide with all details (15+ pages). RUN_15_6_QUICKSTART.md is a condensed version for quick reference and fast execution.

### Q: How long should the pre-launch process take?

**A**: Minimum 2 weeks from initial assessment to launch. First week for preparation, second week for final verification.

### Q: What if one must-have criterion fails?

**A**: That's an automatic NO-GO. Address the issue and reassess. All 15 must-have criteria must pass.

### Q: Can we launch with should-have criteria not met?

**A**: Yes, if at least 80% (13 of 16) are met. Document the gaps and plan to address post-launch.

### Q: What triggers a rollback?

**A**: See the 5 automatic rollback triggers in the Rollback Procedures section. Any trigger requires immediate rollback.

### Q: Who makes the final Go/No-Go decision?

**A**: The Engineering Lead makes the final decision, with strong input from all team leads. Consensus is preferred but not required.

### Q: How do I prepare for the Go/No-Go meeting?

**A**: 1) Complete all checklists, 2) Run automated scripts, 3) Document any gaps, 4) Prepare team recommendations.

### Q: What's included in the post-launch monitoring?

**A**: First 24 hours: close monitoring (every 15-60 min). First week: daily monitoring. First month: weekly optimization.

## Getting Help

If you need help with launch readiness:

1. **Documentation First**: Check the relevant documentation above
2. **Slack Channels**: Ask in the appropriate Slack channel
3. **Runbooks**: Review operational runbooks in `docs/RUNBOOKS.md`
4. **Team Leads**: Reach out to team leads for specific concerns
5. **Emergency**: For P1 incidents, page on-call immediately

---

**Version**: 1.0.0
**Run**: 15.6 - Launch Readiness & Go/No-Go Decision
**Last Updated**: January 1, 2026
