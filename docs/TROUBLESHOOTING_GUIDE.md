# Troubleshooting Guide

## 🎯 Overview

This comprehensive troubleshooting guide provides step-by-step procedures for diagnosing and resolving common issues across the Insurance Lead Gen Platform. Use this guide as a reference for systematic problem resolution.

---

## 📋 Table of Contents

1. [Service-Specific Troubleshooting](#service-specific-troubleshooting)
2. [Common Issues & Solutions](#common-issues--solutions)
3. [Performance Issues](#performance-issues)
4. [Database Issues](#database-issues)
5. [Infrastructure Issues](#infrastructure-issues)
6. [Integration Issues](#integration-issues)
7. [Security Issues](#security-issues)
8. [Diagnostic Commands](#diagnostic-commands)
9. [Log Analysis](#log-analysis)
10. [Monitoring and Metrics](#monitoring-and-metrics)

---

## Service-Specific Troubleshooting

### API Service Issues

#### High Response Time
```bash
# 1. Check API service health
curl -w "@curl-format.txt" -o /dev/null -s https://api.insurance-lead-gen.com/health

# 2. Check pod resource usage
kubectl top pods -n production -l app=api

# 3. Check database connection pool
kubectl exec -n production deployment/api -- npm run db:pool-stats

# 4. Check for slow queries
kubectl exec -n production deployment/api -- \
  psql -h postgres -U postgres -d insurance_lead_gen -c \
  "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"

# 5. Check cache hit rate
kubectl exec -n production deployment/api -- \
  redis-cli INFO stats | grep keyspace

# Resolution steps:
# - Scale up API pods if CPU/memory high
# - Optimize slow database queries
# - Check cache configuration
# - Review recent deployments for regressions
```

#### API Service Not Responding
```bash
# 1. Check pod status
kubectl get pods -n production -l app=api

# 2. Check pod logs for errors
kubectl logs -n production -l app=api --tail=100

# 3. Check pod events
kubectl describe pod -n production -l app=api

# 4. Check service endpoints
kubectl get endpoints -n production -l app=api

# 5. Check ingress configuration
kubectl get ingress -n production

# Common causes and solutions:
# - Pod CrashLoopBackOff: Check logs, restart pod
# - Service endpoint missing: Check pod labels, service selector
# - Ingress issues: Check ingress controller, DNS resolution
# - Database connection: Check database status, connection string
```

#### Authentication Issues
```bash
# 1. Check JWT token validation
curl -H "Authorization: Bearer invalid-token" https://api.insurance-lead-gen.com/api/v1/profile

# 2. Check token expiration
kubectl exec -n production deployment/api -- \
  node -e "console.log(new Date(Date.now() + 7*24*60*60*1000))"

# 3. Check JWT secret configuration
kubectl get secret jwt-secret -n production -o yaml

# 4. Check user session in Redis
kubectl exec -n production deployment/redis -- \
  redis-cli GET "session:user123"

# Resolution:
# - Verify JWT secret is consistent across services
# - Check token expiration times
# - Clear user sessions if corrupted
# - Validate authentication middleware configuration
```

### Backend Service Issues

#### Python Service Health Check
```bash
# 1. Check Python service status
kubectl exec -n production deployment/backend -- python health_check.py

# 2. Check Python service logs
kubectl logs -n production -l app=backend --tail=50

# 3. Check Python dependencies
kubectl exec -n production deployment/backend -- pip list

# 4. Check memory usage
kubectl exec -n production deployment/backend -- \
  python -c "import psutil; print(f'Memory: {psutil.virtual_memory().percent}%')"

# 5. Test specific backend endpoints
curl https://api.insurance-lead-gen.com/api/v1/analytics/dashboard
```

#### Background Job Failures
```bash
# 1. Check job queue status
kubectl exec -n production deployment/backend -- \
  python -c "from celery import Celery; app = Celery('tasks'); print(app.control.inspect().active())"

# 2. Check failed jobs
kubectl exec -n production deployment/backend -- \
  python -c "from celery.result import AsyncResult; print(AsyncResult('task-id').state)"

# 3. Check worker logs
kubectl logs -n production -l app=backend --tail=100 | grep ERROR

# 4. Restart celery workers
kubectl rollout restart deployment/backend -n production

# 5. Check queue length
kubectl exec -n production deployment/backend -- \
  python -c "from celery import Celery; app = Celery('tasks'); print(app.control.inspect().reserved())"
```

### Frontend Service Issues

#### Frontend Not Loading
```bash
# 1. Check frontend pod status
kubectl get pods -n production -l app=frontend

# 2. Check frontend logs
kubectl logs -n production -l app=frontend --tail=50

# 3. Check build artifacts
kubectl exec -n production deployment/frontend -- ls -la /usr/share/nginx/html

# 4. Test static file serving
curl -I https://insurance-lead-gen.com/static/js/app.js

# 5. Check environment variables
kubectl exec -n production deployment/frontend -- env | grep REACT_APP

# Common issues:
# - Build artifacts missing: Rebuild and redeploy
# - Environment variables incorrect: Update configmap
# - CDN issues: Check CDN configuration
# - Browser caching: Clear CDN cache
```

#### API Connection Issues from Frontend
```bash
# 1. Check CORS configuration
curl -H "Origin: https://insurance-lead-gen.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://api.insurance-lead-gen.com/api/v1/leads

# 2. Check frontend API configuration
kubectl exec -n production deployment/frontend -- \
  cat /etc/nginx/conf.d/default.conf | grep proxy_pass

# 3. Test API connectivity from frontend pod
kubectl exec -n production deployment/frontend -- \
  curl -f https://api.insurance-lead-gen.com/health

# Resolution:
# - Update CORS settings in API service
# - Fix API endpoint configuration in frontend
# - Check network policies
# - Verify SSL certificates
```

### Data Service Issues

#### Data Processing Failures
```bash
# 1. Check data service status
kubectl get pods -n production -l app=data-service

# 2. Check data processing logs
kubectl logs -n production -l app=data-service --tail=100 | grep ERROR

# 3. Check database connections
kubectl exec -n production deployment/data-service -- \
  npm run db:pool-status

# 4. Check file processing queue
kubectl exec -n production deployment/data-service -- \
  node -e "console.log(require('./src/queue').getQueueLength())"

# 5. Test data ingestion
curl -X POST https://api.insurance-lead-gen.com/api/v1/data/upload \
  -F "file=@test-document.pdf"

# Resolution:
# - Fix data validation issues
# - Update processing algorithms
# - Clear stuck processing queues
# - Restart data processing workers
```

### Orchestrator Issues

#### Workflow Failures
```bash
# 1. Check orchestrator status
kubectl get pods -n production -l app=orchestrator

# 2. Check workflow logs
kubectl logs -n production -l app=orchestrator --tail=100 | grep -A 10 ERROR

# 3. Check active workflows
kubectl exec -n production deployment/orchestrator -- \
  npm run workflow:list-active

# 4. Check workflow queue
kubectl exec -n production deployment/orchestrator -- \
  redis-cli LLEN workflow:queue

# 5. Test workflow execution
kubectl exec -n production deployment/orchestrator -- \
  npm run workflow:test-execution

# Resolution:
# - Fix workflow definition issues
# - Clear stuck workflows
# - Update workflow engine version
# - Check external service dependencies
```

---

## Common Issues & Solutions

### High Latency Issues

#### API Response Time > 2 seconds
```bash
# 1. Identify slow endpoints
kubectl exec -n production deployment/prometheus -- \
  promtool query instant 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service="api"}[5m]))' | \
  jq '.data.result[] | {endpoint: .metric.endpoint, latency: .value[1]}'

# 2. Check database query performance
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# 3. Check cache hit rate
kubectl exec -n production deployment/redis -- \
  redis-cli INFO stats | grep -E "keyspace|evicted"

# 4. Check CPU and memory usage
kubectl top pods -n production --sort-by=cpu
kubectl top pods -n production --sort-by=memory

# Resolution strategies:
# - Scale up API pods (horizontal scaling)
# - Optimize slow database queries (add indexes, rewrite queries)
# - Improve cache hit rate (increase cache size, fix cache keys)
# - Check for N+1 query problems
# - Review recent code changes for performance regressions
```

#### Database Query Performance
```bash
# 1. Find slow queries
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT query, mean_time, calls, total_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"

# 2. Analyze specific slow query
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "EXPLAIN ANALYZE SELECT * FROM leads WHERE status = 'pending';"

# 3. Check for missing indexes
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT schemaname, tablename, attname, n_distinct, correlation FROM pg_stats WHERE schemaname = 'public';"

# 4. Check database connections
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT count(*) FROM pg_stat_activity;"

# Resolution:
# - Add missing indexes for frequently queried columns
# - Optimize query structure
# - Increase database connection pool size
# - Check for long-running transactions
# - Consider read replicas for read-heavy workloads
```

### High Error Rate Issues

#### API Error Rate > 1%
```bash
# 1. Identify error patterns
kubectl exec -n production deployment/prometheus -- \
  promtool query instant 'rate(http_requests_total{service="api",status=~"5.."}[5m]) / rate(http_requests_total{service="api"}[5m]) * 100' | \
  jq '.data.result[] | {status: .metric.status, percentage: .value[1]}'

# 2. Check recent error logs
kubectl logs -n production -l app=api --tail=1000 | grep -A 5 -B 5 ERROR

# 3. Check external service dependencies
curl -f https://api.stripe.com/v1/charges || echo "Stripe API down"
curl -f https://api.sendgrid.com/v3/mail/send || echo "SendGrid API down"

# 4. Check database connectivity
kubectl exec -n production deployment/api -- npm run db:test-connection

# Resolution:
# - Fix application bugs causing 5xx errors
# - Improve error handling and retries
# - Check external service health and SLAs
# - Add circuit breakers for external dependencies
# - Review and fix database connection issues
```

#### Database Connection Failures
```bash
# 1. Check database pod status
kubectl get pods -n production | grep postgres

# 2. Check database connection count
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT count(*) FROM pg_stat_activity;"

# 3. Check for connection leaks
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT pid, usename, application_name, state, query_start FROM pg_stat_activity WHERE state = 'idle in transaction';"

# 4. Check connection pool configuration
kubectl exec -n production deployment/api -- \
  cat src/config/database.js | grep -A 5 -B 5 pool

# Resolution:
# - Restart applications with connection leaks
# - Increase connection pool size if needed
# - Fix long-running transactions
# - Check database resource limits
# - Restart database pods if necessary
```

### Memory Leak Issues

#### Application Memory Usage Increasing
```bash
# 1. Check memory usage trends
kubectl top pods -n production --sort-by=memory

# 2. Check for memory leaks in logs
kubectl logs -n production -l app=api --tail=5000 | grep -i "out of memory\|memory leak"

# 3. Generate heap dump (if available)
kubectl exec -n production deployment/api -- \
  node --inspect src/server.js &
sleep 5
curl http://localhost:9229/json/list

# 4. Check for growing collections
kubectl exec -n production deployment/api -- \
  node -e "console.log(process.memoryUsage())"

# Resolution:
# - Restart affected pods to clear memory
# - Profile application for memory leaks
# - Update dependencies with known memory leaks
# - Implement proper cleanup in code
# - Consider memory limits and garbage collection tuning
```

### Cache Issues

#### Redis Memory High (> 90%)
```bash
# 1. Check Redis memory usage
kubectl exec -n production deployment/redis -- \
  redis-cli INFO memory | grep used_memory_human

# 2. Check Redis key space
kubectl exec -n production deployment/redis -- \
  redis-cli INFO keyspace

# 3. Find largest keys
kubectl exec -n production deployment/redis -- \
  redis-cli --bigkeys

# 4. Check memory fragmentation
kubectl exec -n production deployment/redis -- \
  redis-cli INFO memory | grep mem_fragmentation_ratio

# Resolution:
# - Clear expired keys
# - Implement key expiration policies
# - Increase Redis memory allocation
# - Analyze and fix memory fragmentation
# - Consider Redis clustering for larger datasets
```

---

## Performance Issues

### System Performance Troubleshooting

#### High CPU Usage
```bash
# 1. Identify high CPU pods
kubectl top pods -n production --sort-by=cpu

# 2. Check node CPU usage
kubectl top nodes

# 3. Check for CPU-intensive processes
kubectl exec -n production deployment/api -- \
  top -bn1 | head -20

# 4. Check for infinite loops or runaway processes
kubectl logs -n production -l app=api --tail=1000 | grep -E "infinite|loop|timeout"

# Resolution:
# - Scale up pods horizontally
# - Optimize CPU-intensive code
# - Check for infinite loops or recursive functions
# - Implement rate limiting
# - Add horizontal pod autoscaling
```

#### High Memory Usage
```bash
# 1. Identify high memory pods
kubectl top pods -n production --sort-by=memory

# 2. Check node memory usage
kubectl top nodes

# 3. Check for memory-intensive operations
kubectl exec -n production deployment/api -- \
  ps aux --sort=-%mem | head -10

# 4. Check for memory leaks over time
# (Monitor memory usage for several hours)

# Resolution:
# - Scale up pods vertically (increase memory limits)
# - Fix memory leaks in application code
# - Implement proper garbage collection
# - Clear cached data periodically
# - Optimize data structures and algorithms
```

#### Disk Space Issues
```bash
# 1. Check disk usage on nodes
kubectl exec -n production node-name -- \
  df -h

# 2. Check disk usage in pods
kubectl exec -n production deployment/api -- \
  du -sh /var/log /tmp /usr/src/app

# 3. Check for large log files
kubectl exec -n production deployment/api -- \
  find /var/log -name "*.log" -size +100M -exec ls -lh {} \;

# 4. Check PVC usage
kubectl get pvc -n production

# Resolution:
# - Clean up old log files
# - Implement log rotation
# - Increase PVC size if needed
# - Archive old data to external storage
# - Clear temporary files and cache
```

### Network Performance Issues

#### High Network Latency
```bash
# 1. Check network policies
kubectl get networkpolicies -n production

# 2. Test network connectivity between services
kubectl exec -n production deployment/api -- \
  curl -w "@curl-format.txt" -o /dev/null -s http://backend-service:3001/health

# 3. Check DNS resolution
kubectl exec -n production deployment/api -- \
  nslookup postgres.insurance-lead-gen.svc.cluster.local

# 4. Check service mesh latency (if applicable)
kubectl exec -n production deployment/api -- \
  curl -w "Connect Time: %{time_connect}\nTTFB: %{time_starttransfer}\nTotal Time: %{time_total}\n" \
  http://backend-service:3001/health

# Resolution:
# - Review and optimize network policies
# - Check service mesh configuration
# - Optimize DNS caching
# - Consider proximity-based routing
```

---

## Database Issues

### PostgreSQL Troubleshooting

#### Database Not Starting
```bash
# 1. Check PostgreSQL pod status
kubectl get pods -n production | grep postgres

# 2. Check PostgreSQL logs
kubectl logs -n production -l app=postgres --tail=100

# 3. Check persistent volume
kubectl get pvc -n production | grep postgres

# 4. Check resource limits
kubectl describe pod -n production -l app=postgres

# Resolution:
# - Check PVC mount points and permissions
# - Verify resource limits and requests
# - Check for disk space issues
# - Review PostgreSQL configuration
# - Consider data migration if PVC corrupted
```

#### Database Performance Issues
```bash
# 1. Check active connections
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT count(*) FROM pg_stat_activity;"

# 2. Check slow queries
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"

# 3. Check database locks
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT * FROM pg_locks WHERE NOT granted;"

# 4. Check table sizes
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# Resolution:
# - Kill long-running queries
# - Add indexes for slow queries
# - Optimize query patterns
# - Increase connection pool size
# - Consider read replicas
```

#### Database Connection Issues
```bash
# 1. Check connection pool exhaustion
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# 2. Check for idle connections
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT count(*) FROM pg_stat_activity WHERE state = 'idle';"

# 3. Check max connections limit
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SHOW max_connections;"

# 4. Check connection configuration
kubectl exec -n production deployment/api -- \
  cat src/config/database.js | grep -i connection

# Resolution:
# - Increase max_connections if needed
# - Fix connection leaks in application
# - Implement connection timeout
# - Use connection pooling properly
```

### Backup and Recovery Issues

#### Backup Failures
```bash
# 1. Check backup job status
kubectl get cronjobs -n production

# 2. Check backup logs
kubectl logs -n production -l app=postgres | tail -50

# 3. Check backup storage
kubectl exec -n production deployment/postgres -- \
  ls -la /backups/

# 4. Test backup integrity
kubectl exec -n production deployment/postgres -- \
  pg_restore --list /backups/latest.sql | head -10

# Resolution:
# - Fix backup script permissions
# - Check storage space and access
# - Update backup retention policies
# - Test backup and restore procedures
```

---

## Infrastructure Issues

### Kubernetes Issues

#### Pod CrashLoopBackOff
```bash
# 1. Check pod status and events
kubectl get pods -n production -l app=api
kubectl describe pod -n production -l app=api

# 2. Check pod logs
kubectl logs -n production -l app=api --previous
kubectl logs -n production -l app=api --tail=50

# 3. Check resource limits
kubectl describe pod -n production -l app=api | grep -A 10 "Limits\|Requests"

# 4. Check liveness/readiness probes
kubectl describe pod -n production -l app=api | grep -A 10 "Liveness\|Readiness"

# Resolution:
# - Fix application startup errors
# - Adjust resource limits and requests
# - Fix liveness/readiness probe configuration
# - Check configuration file issues
# - Review environment variables
```

#### Node Issues
```bash
# 1. Check node status
kubectl get nodes
kubectl describe nodes

# 2. Check node resources
kubectl top nodes
kubectl describe nodes | grep -A 5 "Allocated resources"

# 3. Check node conditions
kubectl get nodes -o json | jq '.items[] | {name: .metadata.name, conditions: .status.conditions}'

# 4. Check node logs
kubectl get events --sort-by='.lastTimestamp' | tail -20

# Resolution:
# - Drain and cordon problematic nodes
# - Add more nodes to cluster
# - Fix node resource constraints
# - Address node hardware issues
# - Review cluster autoscaling
```

### Load Balancer Issues

#### Service Not Accessible
```bash
# 1. Check service status
kubectl get services -n production
kubectl describe service -n production -l app=api

# 2. Check service endpoints
kubectl get endpoints -n production -l app=api

# 3. Check ingress configuration
kubectl get ingress -n production
kubectl describe ingress -n production

# 4. Check external IP allocation
kubectl get services -n production -o wide

# Resolution:
# - Fix service selector labels
# - Check pod readiness and health
# - Update ingress rules
# - Verify load balancer configuration
# - Check DNS resolution
```

---

## Integration Issues

### External API Issues

#### Third-Party Service Down
```bash
# 1. Test external service connectivity
curl -f https://api.stripe.com/v1/charges || echo "Stripe API down"
curl -f https://api.sendgrid.com/v3/mail/send || echo "SendGrid API down"
curl -f https://api.twilio.com/2010-04-01/Accounts.json || echo "Twilio API down"

# 2. Check rate limits
curl -H "Authorization: Bearer $STRIPE_KEY" \
     https://api.stripe.com/v1/charges \
     -w "Rate Limit: %{header_json-Rate-Limit-Remaining} remaining\n"

# 3. Check service status pages
curl https://status.stripe.com/api/v2/status.json
curl https://status.sendgrid.com/api/v2/status.json

# Resolution:
# - Implement circuit breakers
# - Add retry logic with exponential backoff
# - Switch to backup providers if available
# - Queue requests for later processing
# - Update service status communication
```

#### Payment Processing Issues
```bash
# 1. Test Stripe connectivity
curl -H "Authorization: Bearer $STRIPE_KEY" \
     https://api.stripe.com/v1/charges \
     -d "amount=100" \
     -d "currency=usd" \
     -d "description=test charge"

# 2. Check webhook delivery
kubectl logs -n production -l app=backend | grep -i "webhook\|stripe"

# 3. Check payment event logs
kubectl exec -n production deployment/backend -- \
  python -c "from payments.models import Payment; print(Payment.objects.filter(status='pending').count())"

# Resolution:
# - Fix webhook endpoint configuration
# - Update API keys and secrets
# - Check payment flow logic
# - Implement payment retry mechanisms
```

### Message Queue Issues

#### Queue Backlog Building Up
```bash
# 1. Check queue length
kubectl exec -n production deployment/backend -- \
  python -c "from celery import Celery; app = Celery('tasks'); print('Queue length:', app.control.inspect().reserved())"

# 2. Check worker status
kubectl exec -n production deployment/backend -- \
  python -c "from celery import Celery; app = Celery('tasks'); print('Active workers:', app.control.inspect().active())"

# 3. Check failed tasks
kubectl exec -n production deployment/backend -- \
  python -c "from celery.result import AsyncResult; print('Failed tasks:', AsyncResult('failed_task_id').state)"

# 4. Restart workers if needed
kubectl rollout restart deployment/backend -n production

# Resolution:
# - Scale up worker instances
# - Fix failed task processing
# - Clear stuck queue messages
# - Optimize task processing logic
# - Add dead letter queue handling
```

---

## Security Issues

### Authentication Issues

#### JWT Token Problems
```bash
# 1. Check JWT secret configuration
kubectl get secret jwt-secret -n production -o yaml

# 2. Test token validation
curl -H "Authorization: Bearer invalid-token" \
     https://api.insurance-lead-gen.com/api/v1/profile

# 3. Check token expiration
kubectl exec -n production deployment/api -- \
  node -e "console.log(require('jsonwebtoken').decode('invalid.token'))"

# 4. Check session management
kubectl exec -n production deployment/redis -- \
  redis-cli KEYS "session:*"

# Resolution:
# - Rotate JWT secrets if compromised
# - Fix token validation logic
# - Clear corrupted user sessions
# - Update token expiration policies
```

#### API Key Exposure
```bash
# 1. Scan for exposed API keys in logs
kubectl logs -n production -l app=api | grep -i "sk_\|pk_\|api_key"

# 2. Check environment variables
kubectl get pods -n production -l app=api -o yaml | grep -A 5 -B 5 "API_KEY\|SECRET"

# 3. Audit Git history for secret commits
git log -p --grep="api_key\|secret\|password" --since="30 days ago"

# Resolution:
# - Rotate exposed API keys immediately
# - Implement secrets management properly
# - Add secret scanning to CI/CD
# - Update environment variable handling
```

---

## Diagnostic Commands

### Kubernetes Commands

```bash
# Cluster overview
kubectl cluster-info
kubectl get nodes -o wide
kubectl get pods --all-namespaces -o wide

# Namespace-specific checks
kubectl get pods -n production
kubectl get services -n production
kubectl get ingress -n production
kubectl get pvc -n production

# Resource usage
kubectl top nodes
kubectl top pods -n production
kubectl describe nodes
kubectl describe pods -n production -l app=api

# Events and logs
kubectl get events -n production --sort-by='.lastTimestamp' | tail -20
kubectl logs -n production -l app=api --tail=100
kubectl logs -n production -l app=api --previous
kubectl logs -n production -l app=api --since=5m

# Debugging
kubectl describe pod -n production -l app=api
kubectl exec -it -n production -l app=api -- /bin/sh
kubectl port-forward -n production svc/api-service 3000:80
```

### Database Commands

```bash
# PostgreSQL status
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -c "SELECT version();"

# Connection statistics
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT count(*) FROM pg_stat_activity;"

# Slow queries
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"

# Table sizes
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# Database backup
kubectl exec -n production deployment/postgres -- \
  pg_dump insurance_lead_gen > backup.sql
```

### Redis Commands

```bash
# Redis status
kubectl exec -n production deployment/redis -- redis-cli ping
kubectl exec -n production deployment/redis -- redis-cli INFO

# Memory usage
kubectl exec -n production deployment/redis -- \
  redis-cli INFO memory | grep used_memory_human

# Key space
kubectl exec -n production deployment/redis -- redis-cli INFO keyspace

# Large keys
kubectl exec -n production deployment/redis -- redis-cli --bigkeys

# Cache operations
kubectl exec -n production deployment/redis -- redis-cli FLUSHALL  # Clear all cache
```

### Monitoring Commands

```bash
# Prometheus queries (via port-forward)
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &

# API response time
curl -s "http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket{service=\"api\"}[5m]))"

# Error rate
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total{service=\"api\",status=~\"5..\"}[5m]) / rate(http_requests_total{service=\"api\"}[5m]) * 100"

# Database connections
curl -s "http://localhost:9090/api/v1/query?query=pg_stat_database_numbackends{datname=\"insurance_lead_gen\"}"

# Memory usage
curl -s "http://localhost:9090/api/v1/query?query=container_memory_usage_bytes{namespace=\"production\"}"
```

---

## Log Analysis

### Log Patterns to Look For

```bash
# Common error patterns
kubectl logs -n production -l app=api | grep -E "ERROR|Exception|Failed|Crash"

# Performance issues
kubectl logs -n production -l app=api | grep -E "timeout|slow|performance|latency"

# Security issues
kubectl logs -n production -l app=api | grep -E "unauthorized|forbidden|security|attack"

# Database issues
kubectl logs -n production -l app=api | grep -E "database|connection|query|sql"

# Memory issues
kubectl logs -n production -l app=api | grep -E "memory|oom|out of memory"

# Time-based log filtering
kubectl logs -n production -l app=api --since=5m
kubectl logs -n production -l app=api --since=1h
kubectl logs -n production -l app=api --tail=1000

# Log aggregation search (if using Loki)
# Search for errors in last hour
# Search for specific user or session
# Search for performance issues
```

### Log Analysis Commands

```bash
# Count error frequency
kubectl logs -n production -l app=api --tail=1000 | grep ERROR | wc -l

# Find most common errors
kubectl logs -n production -l app=api --tail=1000 | grep ERROR | \
  awk -F'ERROR' '{print $2}' | sort | uniq -c | sort -nr

# Extract timestamps and error codes
kubectl logs -n production -l app=api --tail=1000 | grep -E "ERROR|WARN" | \
  awk '{print $1, $2, $3}' | head -20

# Search for specific error patterns
kubectl logs -n production -l app=api | grep -A 5 -B 5 "Connection.*refused"
kubectl logs -n production -l app=api | grep -A 3 -B 3 "timeout.*exceeded"
```

---

## Monitoring and Metrics

### Key Metrics to Monitor

#### Application Metrics
- **Response Time**: P50, P95, P99 latency
- **Error Rate**: 4xx, 5xx error percentages
- **Throughput**: Requests per second
- **Saturation**: Resource utilization

#### Infrastructure Metrics
- **CPU Usage**: Per pod and node
- **Memory Usage**: Per pod and node
- **Disk Usage**: Storage utilization
- **Network**: Throughput and latency

#### Database Metrics
- **Connection Pool**: Active/idle connections
- **Query Performance**: Slow query frequency
- **Lock Wait Time**: Transaction conflicts
- **Replication Lag**: If using read replicas

#### Business Metrics
- **Lead Conversion**: Conversion rates
- **Payment Processing**: Success/failure rates
- **User Registration**: Sign-up rates
- **Feature Adoption**: Usage statistics

### Dashboard Monitoring

```bash
# Grafana access
kubectl port-forward -n monitoring svc/grafana 3000:3000 &

# Key dashboards to monitor:
# 1. Application Overview
# 2. Database Performance
# 3. Infrastructure Health
# 4. Business Metrics
# 5. Error Tracking

# Important Grafana panels:
# - API Response Time Trends
# - Error Rate by Service
# - Database Connection Pool
# - Pod Resource Usage
# - Customer Impact Dashboard
```

### Alert Configuration

```bash
# Common alerts to configure:
# 1. High Error Rate (> 1% for 5 minutes)
# 2. High Response Time (> 2s for 5 minutes)
# 3. Database Connection Issues
# 4. High Memory Usage (> 85% for 10 minutes)
# 5. Pod CrashLoopBackOff
# 6. External Service Down
# 7. Backup Failures

# Alert routing:
# - Critical: Page on-call immediately
# - Warning: Send to Slack channel
# - Info: Log for trend analysis
```

---

## Quick Reference

### Emergency Response Commands
```bash
# Quick system check
kubectl get pods -n production
curl https://api.insurance-lead-gen.com/health
kubectl top nodes

# Emergency restart
kubectl rollout restart deployment/api -n production
kubectl rollout restart deployment/backend -n production

# Emergency scale down
kubectl scale deployment --all -n production --replicas=0

# Check recent changes
kubectl get events -n production --sort-by='.lastTimestamp' | tail -10
helm history -n production
```

### Common Error Messages
- **Connection refused**: Service not running or port mismatch
- **Timeout**: Service overloaded or network issues
- **Out of memory**: Resource limits too low or memory leaks
- **Permission denied**: Access control or file system issues
- **Database connection failed**: Database down or connection string error

### Troubleshooting Priority Order
1. **Check system health** (pods, services, nodes)
2. **Check recent changes** (deployments, config changes)
3. **Check external dependencies** (databases, APIs, services)
4. **Check monitoring and logs** (metrics, error logs)
5. **Check resource usage** (CPU, memory, disk, network)
6. **Check application logic** (business logic, integration issues)

### Documentation References
- **Deployment Runbooks**: Check recent deployment changes
- **Architecture Documentation**: Understand system dependencies
- **API Documentation**: Check endpoint specifications
- **Database Schema**: Understand data relationships
- **Security Documentation**: Check access controls and permissions
