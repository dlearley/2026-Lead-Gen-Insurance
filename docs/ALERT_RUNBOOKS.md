# Alert Runbooks

## 🎯 Overview

This document contains detailed runbooks for all alerts in the Insurance Lead Gen Platform. Each runbook provides immediate actions, investigation steps, resolution procedures, and escalation criteria to ensure rapid and effective incident response.

---

## 📋 Table of Contents

1. [Critical Service Alerts](#critical-service-alerts)
2. [Performance Alerts](#performance-alerts)
3. [Database Alerts](#database-alerts)
4. [Infrastructure Alerts](#infrastructure-alerts)
5. [Business Logic Alerts](#business-logic-alerts)
6. [Security Alerts](#security-alerts)
7. [External Dependency Alerts](#external-dependency-alerts)
8. [Alert Response Automation](#alert-response-automation)

---

## Critical Service Alerts

### API Service Down (SEV-1)

#### Alert Definition
```
Alert: API_SERVICE_DOWN
Severity: Critical (SEV-1)
Trigger: API health endpoint not responding for 2 minutes
Duration: 2 minutes
```

#### Immediate Actions (0-5 minutes)
```bash
# 1. Acknowledge alert in PagerDuty
# 2. Join incident channel: #incident-api-down
# 3. Check pod status
kubectl get pods -n production -l app=api

# 4. Check API logs for errors
kubectl logs -n production -l app=api --tail=100 | grep ERROR

# 5. Test API health endpoint
curl -f https://api.insurance-lead-gen.com/health --max-time 5 || echo "API_DOWN"
```

#### Investigation Steps (5-15 minutes)
```bash
# Check recent deployments
helm history -n production

# Check events
kubectl get events -n production --sort-by='.lastTimestamp' | tail -20

# Check database connectivity
kubectl exec -n production deployment/api -- npm run db:test-connection

# Check resource usage
kubectl top pods -n production -l app=api

# Check ingress configuration
kubectl get ingress -n production
```

#### Resolution Procedures
```bash
# If pods are in CrashLoopBackOff:
# 1. Check pod logs for specific errors
kubectl logs -n production -l app=api --previous

# 2. Describe pod for events
kubectl describe pod -n production -l app=api

# 3. Rollback if recent deployment
helm rollback api-service 1 -n production

# If resource exhaustion:
# 1. Scale up API pods
kubectl scale deployment api -n production --replicas=5

# 2. Check node resources
kubectl top nodes

# If database issues:
# 1. Check database status
kubectl get pods -n production | grep postgres

# 2. Restart API pods
kubectl rollout restart deployment/api -n production
```

#### Escalation Criteria
- **Immediate**: If pods not restarting after 5 minutes
- **15 minutes**: If database connectivity confirmed down
- **30 minutes**: If multiple services affected

---

### Frontend Service Down (SEV-2)

#### Alert Definition
```
Alert: FRONTEND_SERVICE_DOWN
Severity: High (SEV-2)
Trigger: Frontend not loading for 5 minutes
Duration: 5 minutes
```

#### Immediate Actions (0-15 minutes)
```bash
# 1. Check frontend pod status
kubectl get pods -n production -l app=frontend

# 2. Test frontend accessibility
curl -f https://insurance-lead-gen.com --max-time 10

# 3. Check frontend logs
kubectl logs -n production -l app=frontend --tail=50

# 4. Check ingress configuration
kubectl get ingress -n production | grep frontend
```

#### Investigation and Resolution
```bash
# Check static file serving
curl -I https://insurance-lead-gen.com/static/js/app.js

# Check build artifacts
kubectl exec -n production deployment/frontend -- ls -la /usr/share/nginx/html

# Restart frontend pods if needed
kubectl rollout restart deployment/frontend -n production

# Check CDN configuration if applicable
# Clear CDN cache if build artifacts updated
```

---

### Backend Service Down (SEV-2)

#### Alert Definition
```
Alert: BACKEND_SERVICE_DOWN
Severity: High (SEV-2)
Trigger: Backend health check failing for 5 minutes
Duration: 5 minutes
```

#### Immediate Actions (0-15 minutes)
```bash
# 1. Check backend pod status
kubectl get pods -n production -l app=backend

# 2. Test backend health
kubectl exec -n production deployment/backend -- python health_check.py

# 3. Check background job queue
kubectl exec -n production deployment/backend -- \
  python -c "from celery import Celery; app = Celery('tasks'); print(app.control.inspect().active())"

# 4. Check backend logs
kubectl logs -n production -l app=backend --tail=100 | grep ERROR
```

#### Resolution Procedures
```bash
# Check Python dependencies
kubectl exec -n production deployment/backend -- pip list

# Restart celery workers
kubectl rollout restart deployment/backend -n production

# Clear stuck job queue if needed
kubectl exec -n production deployment/backend -- \
  python -c "from celery import Celery; app = Celery('tasks'); app.control.purge()"
```

---

## Performance Alerts

### High API Latency (SEV-2)

#### Alert Definition
```
Alert: HIGH_API_LATENCY
Severity: High (SEV-2)
Trigger: P95 response time > 2 seconds for 5 minutes
Duration: 5 minutes
```

#### Immediate Actions (0-15 minutes)
```bash
# 1. Check current response times
kubectl exec -n production deployment/prometheus -- \
  promtool query instant 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service="api"}[5m]))'

# 2. Check resource usage
kubectl top pods -n production -l app=api

# 3. Check database performance
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"

# 4. Check cache hit rate
kubectl exec -n production deployment/redis -- \
  redis-cli INFO stats | grep keyspace
```

#### Investigation and Resolution
```bash
# Identify slow endpoints
kubectl exec -n production deployment/prometheus -- \
  promtool query instant 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service="api",endpoint!=""}[5m]))'

# Check for database connection pool exhaustion
kubectl exec -n production deployment/api -- npm run db:pool-stats

# Scale up API pods if CPU/memory high
kubectl scale deployment api -n production --replicas=5

# Check recent code deployments
helm history -n production | tail -5
```

---

### High Error Rate (SEV-2)

#### Alert Definition
```
Alert: HIGH_ERROR_RATE
Severity: High (SEV-2)
Trigger: Error rate > 1% for 5 minutes
Duration: 5 minutes
```

#### Immediate Actions (0-15 minutes)
```bash
# 1. Check error patterns
kubectl exec -n production deployment/prometheus -- \
  promtool query instant 'rate(http_requests_total{service="api",status=~"5.."}[5m]) / rate(http_requests_total{service="api"}[5m]) * 100'

# 2. Check recent error logs
kubectl logs -n production -l app=api --tail=1000 | grep -A 5 -B 5 ERROR

# 3. Test specific error patterns
curl -f https://api.insurance-lead-gen.com/api/v1/leads --max-time 5

# 4. Check external dependencies
curl -f https://api.stripe.com/v1/charges --max-time 5 || echo "Stripe down"
curl -f https://api.sendgrid.com/v3/mail/send --max-time 5 || echo "SendGrid down"
```

#### Resolution Procedures
```bash
# Fix application errors based on log analysis
# Check for external service failures
# Implement circuit breakers if needed
# Rollback recent deployment if error pattern matches

# Check database connectivity
kubectl exec -n production deployment/api -- npm run db:test-connection

# Check for configuration changes
kubectl get configmap -n production -o yaml
```

---

### Database High Latency (SEV-2)

#### Alert Definition
```
Alert: DATABASE_HIGH_LATENCY
Severity: High (SEV-2)
Trigger: P95 query time > 1 second for 10 minutes
Duration: 10 minutes
```

#### Immediate Actions (0-15 minutes)
```bash
# 1. Check active queries
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT pid, usename, application_name, state, query_start, query FROM pg_stat_activity WHERE state = 'active';"

# 2. Check for locks
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT * FROM pg_locks WHERE NOT granted;"

# 3. Check slow queries
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

#### Resolution Procedures
```bash
# Kill long-running queries
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT pg_terminate_backend(<pid>);"

# Check for missing indexes
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT schemaname, tablename, attname FROM pg_stats WHERE n_distinct > 100 AND correlation < 0.1;"

# Scale up database if needed
kubectl patch deployment postgres -n production -p '{"spec":{"replicas":2}}'

# Restart application if connection leak suspected
kubectl rollout restart deployment/api -n production
```

---

## Database Alerts

### Database Connection Pool Exhausted (SEV-2)

#### Alert Definition
```
Alert: DB_CONNECTION_POOL_EXHAUSTED
Severity: High (SEV-2)
Trigger: > 95% of connection pool in use for 5 minutes
Duration: 5 minutes
```

#### Immediate Actions (0-15 minutes)
```bash
# 1. Check connection pool status
kubectl exec -n production deployment/api -- npm run db:pool-stats

# 2. Check active connections
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT count(*) FROM pg_stat_activity;"

# 3. Check for connection leaks
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT pid, usename, application_name, state, query_start FROM pg_stat_activity WHERE state = 'idle in transaction';"
```

#### Resolution Procedures
```bash
# Increase connection pool size
kubectl patch configmap api-config -n production \
  --patch '{"data":{"DB_POOL_SIZE":"20"}}'

# Restart applications to clear connection leaks
kubectl rollout restart deployment/api -n production
kubectl rollout restart deployment/backend -n production

# Check for long-running transactions
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT pid, now() - query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC LIMIT 5;"
```

---

### Database Disk Space Low (SEV-2)

#### Alert Definition
```
Alert: DATABASE_DISK_SPACE_LOW
Severity: High (SEV-2)
Trigger: Database disk usage > 85% for 10 minutes
Duration: 10 minutes
```

#### Immediate Actions (0-15 minutes)
```bash
# 1. Check disk usage
kubectl exec -n production deployment/postgres -- \
  df -h /var/lib/postgresql/data

# 2. Check database size
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT pg_size_pretty(pg_database_size('insurance_lead_gen'));"

# 3. Check table sizes
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"
```

#### Resolution Procedures
```bash
# Clean up old logs
kubectl exec -n production deployment/postgres -- \
  find /var/lib/postgresql/data/log -name "*.log" -mtime +7 -delete

# Archive old data
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "DELETE FROM logs WHERE created_at < NOW() - INTERVAL '30 days';"

# Vacuum database
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c "VACUUM FULL;"

# Increase PVC size
kubectl patch pvc postgres-data -n production -p '{"spec":{"resources":{"requests":{"storage":"200Gi"}}}}'
```

---

## Infrastructure Alerts

### Pod Restart Loop (SEV-2)

#### Alert Definition
```
Alert: POD_RESTART_LOOP
Severity: High (SEV-2)
Trigger: Pod restarting > 3 times in 10 minutes
Duration: 10 minutes
```

#### Immediate Actions (0-15 minutes)
```bash
# 1. Check pod status
kubectl get pods -n production -l app=api

# 2. Check restart count
kubectl get pods -n production -l app=api -o jsonpath='{.items[*].status.containerStatuses[*].restartCount}'

# 3. Check pod events
kubectl describe pod -n production -l app=api

# 4. Check recent logs
kubectl logs -n production -l app=api --previous --tail=100
```

#### Resolution Procedures
```bash
# Check resource limits
kubectl describe pod -n production -l app=api | grep -A 10 "Limits\|Requests"

# Check liveness probe
kubectl describe pod -n production -l app=api | grep -A 10 "Liveness"

# Fix resource limits if too low
kubectl set resources deployment api -n production \
  --limits=cpu=1000m,memory=2Gi \
  --requests=cpu=500m,memory=1Gi

# Disable liveness probe temporarily if misconfigured
kubectl patch deployment api -n production -p \
  '{"spec":{"template":{"spec":{"containers":[{"name":"api","livenessProbe":null}]}}}}'
```

---

### High CPU Usage (SEV-3)

#### Alert Definition
```
Alert: HIGH_CPU_USAGE
Severity: Medium (SEV-3)
Trigger: CPU usage > 80% for 10 minutes
Duration: 10 minutes
```

#### Immediate Actions (0-30 minutes)
```bash
# 1. Check CPU usage by pod
kubectl top pods -n production --sort-by=cpu

# 2. Check node CPU usage
kubectl top nodes

# 3. Check for CPU-intensive processes
kubectl exec -n production deployment/api -- top -bn1 | head -20
```

#### Resolution Procedures
```bash
# Scale up pods horizontally
kubectl scale deployment api -n production --replicas=5

# Increase CPU limits
kubectl set resources deployment api -n production \
  --limits=cpu=2000m,memory=2Gi \
  --requests=cpu=1000m,memory=1Gi

# Check for infinite loops or CPU bugs
kubectl logs -n production -l app=api --tail=1000 | grep -E "infinite|loop|timeout"
```

---

### High Memory Usage (SEV-3)

#### Alert Definition
```
Alert: HIGH_MEMORY_USAGE
Severity: Medium (SEV-3)
Trigger: Memory usage > 85% for 10 minutes
Duration: 10 minutes
```

#### Immediate Actions (0-30 minutes)
```bash
# 1. Check memory usage by pod
kubectl top pods -n production --sort-by=memory

# 2. Check for memory leaks
kubectl exec -n production deployment/api -- \
  node -e "console.log(process.memoryUsage())"

# 3. Check memory growth over time
# (Monitor memory usage for several hours)
```

#### Resolution Procedures
```bash
# Scale up pods to distribute load
kubectl scale deployment api -n production --replicas=3

# Increase memory limits
kubectl set resources deployment api -n production \
  --limits=cpu=1000m,memory=4Gi \
  --requests=cpu=500m,memory=2Gi

# Restart pods to clear memory
kubectl rollout restart deployment/api -n production

# Profile application for memory leaks
kubectl exec -n production deployment/api -- \
  node --inspect src/server.js &
```

---

## Business Logic Alerts

### Lead Generation Failure Rate High (SEV-3)

#### Alert Definition
```
Alert: LEAD_GENERATION_FAILURE_HIGH
Severity: Medium (SEV-3)
Trigger: Lead creation failure rate > 10% for 15 minutes
Duration: 15 minutes
```

#### Immediate Actions (0-30 minutes)
```bash
# 1. Check lead creation API
curl -X POST https://api.insurance-lead-gen.com/api/v1/leads \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'

# 2. Check lead processing logs
kubectl logs -n production -l app=api --tail=1000 | grep -i lead

# 3. Check database for lead data
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT status, COUNT(*) FROM leads GROUP BY status;"
```

#### Resolution Procedures
```bash
# Check external service dependencies
curl -f https://api.stripe.com/v1/customers || echo "Stripe issues"

# Check email service
curl -f https://api.sendgrid.com/v3/mail/send || echo "SendGrid issues"

# Check database connectivity
kubectl exec -n production deployment/api -- npm run db:test-connection

# Fix validation issues based on log analysis
# Update API rate limits if needed
# Clear stuck processing queues
```

---

### Payment Processing Failure (SEV-2)

#### Alert Definition
```
Alert: PAYMENT_PROCESSING_FAILURE
Severity: High (SEV-2)
Trigger: Payment failure rate > 5% for 10 minutes
Duration: 10 minutes
```

#### Immediate Actions (0-15 minutes)
```bash
# 1. Check Stripe API connectivity
curl -H "Authorization: Bearer $STRIPE_KEY" \
     https://api.stripe.com/v1/charges \
     -w "HTTP Status: %{http_code}\n"

# 2. Check payment processing logs
kubectl logs -n production -l app=backend --tail=1000 | grep -i payment

# 3. Test payment processing
kubectl exec -n production deployment/backend -- \
  python -c "from payments.stripe import test_payment; test_payment()"
```

#### Resolution Procedures
```bash
# Check API key validity
kubectl get secret stripe-secret -n production -o yaml

# Check rate limits
curl -H "Authorization: Bearer $STRIPE_KEY" \
     https://api.stripe.com/v1/charges \
     -w "Rate Limit: %{header_json-Rate-Limit-Remaining}\n"

# Implement retry logic with exponential backoff
# Switch to backup payment provider if available
# Clear payment queue if stuck
```

---

## Security Alerts

### Suspicious API Access Pattern (SEV-2)

#### Alert Definition
```
Alert: SUSPICIOUS_API_ACCESS
Severity: High (SEV-2)
Trigger: > 100 failed authentication attempts from same IP in 5 minutes
Duration: 5 minutes
```

#### Immediate Actions (0-15 minutes)
```bash
# 1. Check failed authentication logs
kubectl logs -n production -l app=api --tail=1000 | grep -i "unauthorized\|forbidden\|401\|403"

# 2. Identify suspicious IP
# (Extract from logs)

# 3. Check for credential stuffing attack
# (Look for sequential email patterns)
```

#### Resolution Procedures
```bash
# Block suspicious IP addresses
kubectl patch networkpolicy api-ingress -n production \
  --patch '{"spec":{"ingress":[{"from":[{"ipBlock":{"cidr":"0.0.0.0/0","except":["SUSPICIOUS_IP"]}}]}]}}'

# Implement rate limiting
kubectl patch configmap api-config -n production \
  --patch '{"data":{"RATE_LIMIT":"100/m"}}'

# Monitor for continued attacks
# Alert security team
# Consider temporary API shutdown if severe
```

---

### Database Unauthorized Access (SEV-1)

#### Alert Definition
```
Alert: DATABASE_UNAUTHORIZED_ACCESS
Severity: Critical (SEV-1)
Trigger: Unauthorized database access attempt
Duration: Immediate
```

#### Immediate Actions (0-5 minutes)
```bash
# 1. Check database access logs
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT * FROM pg_stat_activity WHERE usename NOT IN ('postgres','api_user','backup_user');"

# 2. Revoke all connections
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename NOT IN ('postgres','api_user','backup_user');"

# 3. Change database passwords
kubectl patch secret db-credentials -n production \
  --patch '{"data":{"password":"NEW_ENCRYPTED_PASSWORD"}}'
```

#### Resolution Procedures
```bash
# Audit all database users
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT rolname, rolsuper, rolcreaterole FROM pg_roles;"

# Review and tighten database permissions
# Update application connection strings
# Implement database activity monitoring
# Alert security team immediately
```

---

## External Dependency Alerts

### Stripe API Down (SEV-2)

#### Alert Definition
```
Alert: STRIPE_API_DOWN
Severity: High (SEV-2)
Trigger: Stripe API not responding for 5 minutes
Duration: 5 minutes
```

#### Immediate Actions (0-15 minutes)
```bash
# 1. Test Stripe API connectivity
curl -f https://api.stripe.com/v1/charges --max-time 10 || echo "STRIPE_DOWN"

# 2. Check Stripe status page
curl https://status.stripe.com/api/v2/status.json

# 3. Test with valid API key
curl -H "Authorization: Bearer $STRIPE_KEY" \
     https://api.stripe.com/v1/charges \
     -d "amount=100" \
     -d "currency=usd" \
     --max-time 10
```

#### Resolution Procedures
```bash
# Implement circuit breaker pattern
# Queue payment requests for later processing
# Switch to backup payment provider if available
# Monitor Stripe status for recovery
# Notify customers of payment processing delays

# Check payment webhook delivery
kubectl logs -n production -l app=backend | grep -i webhook
```

---

### SendGrid Email Service Down (SEV-3)

#### Alert Definition
```
Alert: SENDGRID_EMAIL_DOWN
Severity: Medium (SEV-3)
Trigger: SendGrid API not responding for 10 minutes
Duration: 10 minutes
```

#### Immediate Actions (0-30 minutes)
```bash
# 1. Test SendGrid API
curl -f https://api.sendgrid.com/v3/mail/send --max-time 10 || echo "SENDGRID_DOWN"

# 2. Check email queue
kubectl exec -n production deployment/backend -- \
  python -c "from email.queue import get_queue_length; print(get_queue_length())"

# 3. Test with valid API key
curl -H "Authorization: Bearer $SENDGRID_KEY" \
     -H "Content-Type: application/json" \
     -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"noreply@company.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test email"}]}' \
     https://api.sendgrid.com/v3/mail/send \
     --max-time 10
```

#### Resolution Procedures
```bash
# Switch to backup email provider
# Queue emails for later delivery
# Implement retry logic with exponential backoff
# Monitor SendGrid status for recovery
# Notify users of email delivery delays
```

---

## Alert Response Automation

### Auto-Remediation Scripts

#### Restart Failed Pods
```bash
#!/bin/bash
# auto-restart-failed-pods.sh

NAMESPACE=${1:-production}
APP_LABEL=${2:-app}

echo "Checking for failed pods in $NAMESPACE with label $APP_LABEL..."

FAILED_PODS=$(kubectl get pods -n $NAMESPACE -l $APP_LABEL --no-headers | grep -E "0/.*|Error|CrashLoop" | awk '{print $1}')

if [ -n "$FAILED_PODS" ]; then
    echo "Found failed pods: $FAILED_PODS"
    
    for pod in $FAILED_PODS; do
        echo "Restarting pod: $pod"
        kubectl delete pod $pod -n $NAMESPACE
    done
    
    echo "Auto-remediation completed"
else
    echo "No failed pods found"
fi
```

#### Scale Up on High Load
```bash
#!/bin/bash
# auto-scale-on-load.sh

NAMESPACE=${1:-production}
DEPLOYMENT=${2:-api}
CURRENT_REPLICAS=$(kubectl get deployment $DEPLOYMENT -n $NAMESPACE -o jsonpath='{.spec.replicas}')
CPU_USAGE=$(kubectl top pods -n $NAMESPACE -l app=$DEPLOYMENT --no-headers | awk '{sum+=$2} END {print sum/NR}')

echo "Current replicas: $CURRENT_REPLICAS"
echo "Average CPU usage: $CPU_USAGE"

if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
    echo "High CPU usage detected, scaling up..."
    kubectl scale deployment $DEPLOYMENT -n $NAMESPACE --replicas=$((CURRENT_REPLICAS + 2))
    echo "Scaled to $((CURRENT_REPLICAS + 2)) replicas"
else
    echo "CPU usage normal, no action needed"
fi
```

#### Clear Redis Cache on Memory Issues
```bash
#!/bin/bash
# auto-clear-cache.sh

NAMESPACE=${1:-production}
REDIS_POD=$(kubectl get pods -n $NAMESPACE -l app=redis --no-headers | head -1 | awk '{print $1}')

echo "Checking Redis memory usage..."

MEMORY_USAGE=$(kubectl exec -n $NAMESPACE $REDIS_POD -- redis-cli INFO memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
MEMORY_PERCENT=$(kubectl exec -n $NAMESPACE $REDIS_POD -- redis-cli INFO memory | grep mem_fragmentation_ratio | cut -d: -f2 | tr -d '\r')

echo "Redis memory usage: $MEMORY_USAGE"
echo "Memory fragmentation ratio: $MEMORY_PERCENT"

if (( $(echo "$MEMORY_PERCENT > 1.5" | bc -l) )); then
    echo "High memory fragmentation detected, clearing cache..."
    kubectl exec -n $NAMESPACE $REDIS_POD -- redis-cli FLUSHALL
    echo "Cache cleared"
else
    echo "Memory usage normal"
fi
```

### Alert Integration

#### PagerDuty Integration
```bash
# Auto-acknowledge low-severity alerts
# Escalate based on response time
# Trigger auto-remediation scripts
# Update status page automatically
```

#### Slack Integration
```bash
# Send alert notifications to #alerts channel
# Post incident updates to #incidents
# Notify specific teams based on alert type
# Include runbook links in alert messages
```

#### Status Page Integration
```bash
# Auto-update status page for customer-facing issues
# Include incident details and ETA
# Regular updates during active incidents
# Resolution notifications
```

---

## Quick Reference

### Most Common Alerts Response Order
1. **API Service Down** - Check pods, restart, check database
2. **High Error Rate** - Check logs, external dependencies, recent deployments
3. **Database Issues** - Check connections, queries, locks
4. **High Latency** - Check resources, database performance, cache
5. **Pod Restarts** - Check resource limits, liveness probes, logs

### Emergency Commands
```bash
# Quick restart all services
kubectl rollout restart deployment --all -n production

# Scale up critical services
kubectl scale deployment api backend -n production --replicas=5

# Check system health
curl -f https://api.insurance-lead-gen.com/health
kubectl get pods -n production

# Emergency communication
# Post to #incidents channel immediately
```

### Escalation Triggers
- **SEV-1**: No progress in 15 minutes
- **SEV-2**: No progress in 60 minutes  
- **SEV-3**: No progress in 4 hours
- **Any Severity**: Customer escalation received

Remember: When in doubt, escalate early. It's better to have too many people involved than to miss a critical issue.
