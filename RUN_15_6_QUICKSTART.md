# Run 15.6: Launch Readiness - Quick Start Guide

## TL;DR

This guide provides a fast path to assess launch readiness. Use the comprehensive `RUN_15_6.md` for detailed criteria and procedures.

## Quick Launch Readiness Assessment

### Step 1: Quick Health Check (10 minutes)

```bash
# Check all services are running
kubectl get pods -l app=insurance-platform

# Check system health
curl https://api.yourplatform.com/health

# Check database connectivity
psql $DATABASE_URL -c "SELECT 1"

# Check Redis
redis-cli ping

# Check message broker
nats server info
```

**Expected Results:**
- All pods: Running state, 1/1 Ready
- Health endpoint: 200 OK
- Database: Connection successful
- Redis: PONG
- NATS: Server responding

### Step 2: Critical Metrics Check (5 minutes)

```bash
# Check error rate (should be < 0.1%)
curl https://prometheus.yourplatform.com/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m])

# Check response time (P95 < 300ms)
curl https://prometheus.yourplatform.com/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))

# Check system uptime (≥ 99.9%)
curl https://prometheus.yourplatform.com/api/v1/query?query=up

# Check cache hit rate (> 80%)
curl https://prometheus.yourplatform.com/api/v1/query?query=cache_hit_rate
```

### Step 3: Security Scan (15 minutes)

```bash
# Run dependency vulnerability scan
npm audit
pip-audit

# Run container vulnerability scan
trivy image your-platform/api:latest

# Check for secrets in code
gitleaks detect --source .

# Verify security headers
curl -I https://yourplatform.com | grep -E "X-|Content-Security-Policy|Strict-Transport-Security"
```

### Step 4: Load Test (30 minutes)

```bash
# Simple load test
k6 run --vus 100 --duration 5m scripts/load-test.js

# Expected results:
# - No 5xx errors
# - P95 response time < 300ms
# - Throughput > 1000 req/s
```

### Step 5: Database Verification (10 minutes)

```bash
# Check migration status
npx prisma migrate status

# Check database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size(current_database()));"

# Check table row counts
psql $DATABASE_URL -c "\dt" | awk '{print $2}'

# Verify recent backups
aws rds describe-db-snapshots --db-instance-id your-db | jq '.DBSnapshots[-1]'
```

### Step 6: Monitoring Verification (10 minutes)

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job, health}'

# Check Grafana dashboards
curl -u admin:admin http://localhost:3003/api/search | jq '.[].uri'

# Check alerts
curl http://localhost:9093/api/v1/alerts | jq '.data.alerts[] | {name, state}'

# Verify logs are flowing
curl -u admin:admin "http://localhost:3100/loki/api/v1/query_range?query={job=\"api\"}" | jq '.data.result | length'
```

## Quick Go/No-Go Decision

### Must-Have Quick Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | All services healthy (kubectl get pods) | ⬜ Pass |
| 2 | Health endpoint returning 200 OK | ⬜ Pass |
| 3 | Error rate < 0.1% | ⬜ Pass |
| 4 | P95 response time < 300ms | ⬜ Pass |
| 5 | System uptime ≥ 99.9% | ⬜ Pass |
| 6 | Cache hit rate > 80% | ⬜ Pass |
| 7 | No critical security vulnerabilities | ⬜ Pass |
| 8 | Load test passed (no 5xx, P95 < 300ms) | ⬜ Pass |
| 9 | Database migrated successfully | ⬜ Pass |
| 10 | Backups verified | ⬜ Pass |
| 11 | Monitoring active (Prometheus, Grafana, Loki) | ⬜ Pass |
| 12 | Alerts configured | ⬜ Pass |
| 13 | Test coverage ≥ 75% | ⬜ Pass |
| 14 | Runbooks complete | ⬜ Pass |
| 15 | Team trained and on-call ready | ⬜ Pass |

**Decision:**
- ✅ ALL PASS = GO for launch
- ❌ ANY FAIL = NO-GO, address and re-assess

## Launch Day Checklist

### T-1 Day

```bash
# 1. Final health checks
./scripts/health-check.sh

# 2. Verify backups
./scripts/verify-backups.sh

# 3. Send pre-launch notification
# Template from RUN_15_6.md

# 4. Brief all teams
# Schedule and run launch brief

# 5. Verify on-call schedule
./scripts/verify-oncall.sh
```

### T-0: Launch (Day of Launch)

```bash
# 1. Deploy to production
./scripts/deploy-prod.sh

# 2. Verify deployment
kubectl rollout status deployment/api

# 3. Run smoke tests
./scripts/smoke-tests.sh

# 4. Monitor first 10 minutes
watch -n 10 './scripts/health-check.sh'

# 5. Announce launch
# Send launch announcement (template from RUN_15_6.md)
```

### T+0 to T+1 Hour: Critical Monitoring

```bash
# Monitor in multiple terminals:
# Terminal 1: System health
watch -n 30 './scripts/health-check.sh'

# Terminal 2: Metrics
watch -n 30 './scripts/metrics-check.sh'

# Terminal 3: Errors
watch -n 30 './scripts/error-check.sh'

# Terminal 4: Alerts
watch -n 60 './scripts/alert-check.sh'
```

### T+1 to T+24 Hours: Close Monitoring

```bash
# Hourly checks
for hour in {1..24}; do
  echo "Hour $hour status check"
  ./scripts/hourly-check.sh
  sleep 3600
done
```

## Emergency Rollback

If any of these triggers occur:

- Availability < 95% for 30 minutes
- Error rate > 5% for 15 minutes
- Data corruption detected
- Security breach confirmed

**Execute immediate rollback:**

```bash
# 1. Identify previous stable version
kubectl rollout history deployment/api

# 2. Rollback (example: to revision 42)
kubectl rollout undo deployment/api --to-revision=42

# 3. Rollback database if needed
npx prisma migrate resolve --applied "rollback_migration_name"

# 4. Verify health
watch -n 10 './scripts/health-check.sh'

# 5. Notify team
# Send emergency notification
```

## Quick Status Dashboard

Create a simple dashboard script:

```bash
#!/bin/bash
# quick-status.sh

echo "=== Platform Launch Status ==="
echo ""

echo "Services:"
kubectl get pods -l app=insurance-platform
echo ""

echo "Health:"
curl -s https://api.yourplatform.com/health | jq .
echo ""

echo "Error Rate:"
curl -s 'https://prometheus.yourplatform.com/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m])' | jq '.data.result[0].value[1]'
echo ""

echo "P95 Response Time:"
curl -s 'https://prometheus.yourplatform.com/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))' | jq '.data.result[0].value[1]'
echo ""

echo "Uptime:"
curl -s 'https://prometheus.yourplatform.com/api/v1/query?query=up' | jq '.data.result[] | select(.metric.job=="api") | .value[1]'
echo ""

echo "Cache Hit Rate:"
curl -s 'https://prometheus.yourplatform.com/api/v1/query?query=cache_hit_rate' | jq '.data.result[0].value[1]'
echo ""
```

Usage:
```bash
chmod +x quick-status.sh
./quick-status.sh
```

## Communication Templates (Copy & Paste)

### Pre-Launch (T-1 day)

```
📢 Launch Readiness Assessment - Tomorrow at 10:00 AM

Team,

We are approaching launch day. Please ensure:

✅ All checklist items complete by 9:00 AM tomorrow
✅ Any blockers identified and communicated
✅ All team members available for the 10:00 AM Go/No-Go meeting

Agenda:
1. Review must-have criteria (15 items)
2. Review should-have criteria (≥ 80% pass)
3. Discuss any blockers or concerns
4. Make Go/No-Go decision
5. If GO: Launch at 2:00 PM

Location: [Conference Room / Zoom]
Time: Tomorrow 10:00 AM - 11:00 AM

Thank you for all your hard work!
```

### Launch Announcement (T-0)

```
🚀 WE ARE LIVE! Platform Launch Complete

Team,

The Insurance Lead Generation AI Platform is now live!

📍 URL: https://platform.yourcompany.com

What's Live:
✅ Lead Generation
✅ AI Scoring
✅ Agent Matching
✅ Broker Network
✅ Marketing Automation
✅ Analytics & Reporting

Next Steps:
1. Monitor systems closely (watch the dashboards)
2. Report any issues immediately to #incidents
3. Collect user feedback in #product-feedback
4. Celebrate! 🎉

Status Page: https://status.yourcompany.com

Great work everyone!
```

### Day 1 Summary (T+1 day)

```
📊 Launch Day 1 Summary

Team,

Day 1 is in the books! Here's how it went:

📈 Metrics:
- Users onboarded: 142
- Leads created: 1,284
- Lead processing time: 23s average
- System availability: 99.95%
- Average response time: 187ms (P95)

✅ All Systems Operational

Known Issues: None (knock on wood 🤞)

Highlights:
- Zero downtime
- Performance exceeds targets
- Positive user feedback
- No critical bugs

Tomorrow: Continue close monitoring, start optimization work.

Thank you for an amazing launch day!
```

## Reference Links

### Monitoring Dashboards
- Grafana: http://localhost:3003 (admin/admin)
- Prometheus: http://localhost:9090
- Jaeger Tracing: http://localhost:16686
- Loki Logs: http://localhost:3100

### Documentation
- Full Launch Guide: `RUN_15_6.md`
- Architecture: `docs/ARCHITECTURE.md`
- Monitoring: `docs/MONITORING.md`
- Security: `docs/SECURITY_HARDENING.md`
- Runbooks: `docs/RUNBOOKS.md`

### Commands Reference
```bash
# Health check
kubectl get pods

# View logs
kubectl logs -f deployment/api

# Port forward for local debugging
kubectl port-forward svc/api 3000:3000

# Access database
psql $DATABASE_URL

# Run tests
pnpm test

# Build
pnpm build
```

## Quick Troubleshooting

### Service Not Starting
```bash
# Check pod status
kubectl describe pod <pod-name>

# Check logs
kubectl logs <pod-name>

# Common issues:
# - Missing env vars: Check ConfigMaps and Secrets
# - Image pull error: Check registry credentials
# - OOMKilled: Check memory limits
```

### High Error Rate
```bash
# Check recent errors
kubectl logs deployment/api --tail=100 | grep ERROR

# Check database
psql $DATABASE_URL -c "SELECT count(*) FROM leads WHERE status = 'error'"

# Check dependencies
kubectl get pods
```

### Slow Performance
```bash
# Check CPU/memory
kubectl top pods

# Check database queries
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10"

# Check cache
redis-cli INFO stats | grep keyspace
```

### Alerts Firing
```bash
# Check AlertManager
curl http://localhost:9093/api/v1/alerts

# Silence non-critical alerts
curl -X POST http://localhost:9093/api/v1/silences -d '{...}'

# Escalate if critical
# Notify #incidents channel
# Page on-call engineer
```

## Support & Contacts

| Role | Slack | Phone |
|------|-------|-------|
| Engineering Lead | @eng-lead | +1-XXX-XXX-XXXX |
| DevOps Lead | @devops-lead | +1-XXX-XXX-XXXX |
| Security Lead | @security-lead | +1-XXX-XXX-XXXX |
| On-Call Engineer | @oncall | +1-XXX-XXX-XXXX |

### Emergency Channels
- Critical Incidents: #incidents (urgent)
- Security Issues: #security (urgent)
- General Questions: #engineering (normal)

## Success Criteria Met?

- [ ] All 15 must-have criteria passed ✅
- [ ] ≥ 80% of should-have criteria passed ✅
- [ ] No critical blockers ✅
- [ ] Team signed off ✅
- [ ] Rollback plan tested ✅

If all checked: **GO FOR LAUNCH! 🚀**

---

**Quick Start Version**: 1.0.0
**Full Documentation**: RUN_15_6.md
**Last Updated**: January 1, 2026
