# Operational Quick Reference

## Overview

This quick reference guide provides essential commands, configurations, and procedures for day-to-day operations of the Insurance Lead Gen Platform. Keep this guide handy for rapid access to common operational tasks.

---

## Table of Contents

1. [Emergency Contacts](#emergency-contacts)
2. [Service Endpoints](#service-endpoints)
3. [Essential Commands](#essential-commands)
4. [Common Operations](#common-operations)
5. [Troubleshooting Commands](#troubleshooting-commands)
6. [Configuration Reference](#configuration-reference)
7. [Log Locations](#log-locations)
8. [Thresholds & Alerts](#thresholds--alerts)
9. [Escalation Procedures](#escalation-procedures)

---

## Emergency Contacts

### Primary Response Team

| Role | Contact | Responsibility |
|------|---------|----------------|
| Primary On-Call | PagerDuty Rotation | Initial incident response |
| Secondary On-Call | PagerDuty Rotation | Backup and escalation |
| Platform Lead | See on-call schedule | Technical leadership |
| Engineering Manager | See on-call schedule | Resource allocation |
| VP Engineering | See on-call schedule | Executive escalation |

### External Contacts

| Service | Contact | Purpose |
|---------|---------|---------|
| AWS Support | AWS Console | Infrastructure issues |
| Cloudflare | Cloudflare Dashboard | CDN/DNS issues |
| PagerDuty | PagerDuty Console | Alert management |
| Monitoring | Grafana Admin | Dashboard access |

### Communication Channels

| Channel | Purpose | Link |
|---------|---------|------|
| #incidents | Active incident coordination | Slack |
| #oncall | On-call discussions | Slack |
| #devops | Technical discussions | Slack |
| Status Page | Public status | status.insurance-lead-gen.com |

---

## Service Endpoints

### Production Endpoints

| Service | Endpoint | Port | Health Check |
|---------|----------|------|--------------|
| API | https://api.insurance-lead-gen.com | 443 | /health |
| Frontend | https://insurance-lead-gen.com | 443 | /health |
| Backend | https://backend.insurance-lead-gen.com | 443 | /health |
| Data Service | https://data.insurance-lead-gen.com | 443 | /health |
| Orchestrator | https://orchestrator.insurance-lead-gen.com | 443 | /health |

### Staging Endpoints

| Service | Endpoint | Port | Health Check |
|---------|----------|------|--------------|
| API | https://staging-api.insurance-lead-gen.com | 443 | /health |
| Frontend | https://staging.insurance-lead-gen.com | 443 | /health |

### Monitoring Endpoints

| Service | Endpoint | Port | Credentials |
|---------|----------|------|-------------|
| Grafana | http://localhost:3003 | 3003 | admin / (see secret) |
| Prometheus | http://localhost:9090 | 9090 | No auth |
| Jaeger | http://localhost:16686 | 16686 | No auth |
| AlertManager | http://localhost:9093 | 9093 | No auth |

### Infrastructure Services

| Service | Internal DNS | Port |
|---------|--------------|------|
| PostgreSQL | postgres.postgres.svc.cluster.local | 5432 |
| Redis | redis.redis.svc.cluster.local | 6379 |
| NATS | nats.nats.svc.cluster.local | 4222 |
| Neo4j | neo4j.neo4j.svc.cluster.local | 7687 |
| Qdrant | qdrant.qdrant.svc.cluster.local | 6333 |

---

## Essential Commands

### Kubernetes Essentials

```bash
# Get all pods in production namespace
kubectl get pods -n production -o wide

# Get pod status with restart count
kubectl get pods -n production -l app=api -o jsonpath='{.items[*].status.containerStatuses[*].restartCount}'

# View pod logs (last 100 lines)
kubectl logs -n production -l app=api --tail=100

# Follow logs in real-time
kubectl logs -n production -l app=api -f

# Describe pod for detailed info
kubectl describe pod -n production -l app=api

# Get events sorted by timestamp
kubectl get events -n production --sort-by='.lastTimestamp'

# Restart a deployment
kubectl rollout restart deployment/api -n production

# Check rollout status
kubectl rollout status deployment/api -n production --timeout=5m

# Scale a deployment
kubectl scale deployment/api -n production --replicas=5

# Get resource usage
kubectl top pods -n production

# Get nodes with usage
kubectl top nodes

# Port forward to a service
kubectl port-forward -n production svc/api 8000:80

# Get service endpoints
kubectl get endpoints -n production -l app=api

# Check configmap
kubectl get configmap api-config -n production -o yaml

# Apply a config change
kubectl patch configmap api-config -n production --patch '{"data":{"key":"value"}}'
```

### Docker Commands

```bash
# List running containers
docker ps

# View container logs
docker logs -f <container_name>

# Check container resource usage
docker stats <container_name>

# Restart container
docker restart <container_name>

# View container networks
docker network ls

# Check volume usage
docker system df
```

### Database Commands

```bash
# Connect to PostgreSQL
kubectl exec -n production deployment/postgres -- psql -U postgres -d insurance_lead_gen

# Check active connections
SELECT count(*) FROM pg_stat_activity;

# View locks
SELECT * FROM pg_locks WHERE NOT granted;

# Check slow queries
SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;

# Check database size
SELECT pg_size_pretty(pg_database_size('insurance_lead_gen'));

# Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;
```

### Redis Commands

```bash
# Connect to Redis
kubectl exec -n production deployment/redis -- redis-cli

# Check server info
INFO

# Check memory usage
INFO memory

# Check stats
INFO stats

# Check keyspace
INFO keyspace

# List all keys (use sparingly in production)
KEYS *

# Check connected clients
INFO clients

# Monitor commands (debug)
MONITOR
```

### Monitoring Commands

```bash
# Query Prometheus
kubectl exec -n monitoring deployment/prometheus -- \
  promtool query instant 'rate(http_requests_total{service="api"}[5m])'

# Check AlertManager status
kubectl exec -n monitoring deployment/alertmanager -- amtool check-config

# View Prometheus targets
kubectl exec -n monitoring deployment/prometheus -- \
  curl localhost:9090/api/v1/targets
```

---

## Common Operations

### Restart a Service

```bash
# Restart API service
kubectl rollout restart deployment/api -n production
kubectl rollout status deployment/api -n production --timeout=5m

# Verify health
curl -f https://api.insurance-lead-gen.com/health
```

### Scale a Service

```bash
# Scale up API service
kubectl scale deployment/api -n production --replicas=5

# Verify pods
kubectl get pods -n production -l app=api -o wide
```

### View Logs

```bash
# API service logs
kubectl logs -n production -l app=api --tail=500

# Filter for errors
kubectl logs -n production -l app=api --tail=500 | grep -i error

# Backend service logs
kubectl logs -n production -l app=backend --tail=500

# Previous logs (if pod restarted)
kubectl logs -n production -l app=api --previous --tail=100
```

### Check Service Health

```bash
# API health check
curl -f https://api.insurance-lead-gen.com/health

# Detailed health
curl https://api.insurance-lead-gen.com/health/details

# Check specific dependencies
curl https://api.insurance-lead-gen.com/health/ready
```

### Rollback Deployment

```bash
# View deployment history
helm history api-service -n production

# Rollback to previous version
helm rollback api-service 1 -n production

# Verify rollback
kubectl rollout status deployment/api -n production
```

### Database Connection Test

```bash
# From API pod
kubectl exec -n production deployment/api -- npm run db:test-connection

# Direct connection test
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c "SELECT 1;"
```

### Clear Cache

```bash
# Flush Redis cache
kubectl exec -n production deployment/redis -- redis-cli FLUSHALL

# Clear specific cache
kubectl exec -n production deployment/redis -- redis-cli DEL "cache:key"
```

---

## Troubleshooting Commands

### Service Down Troubleshooting

```bash
# 1. Check pod status
kubectl get pods -n production -l app=api

# 2. Check pod events
kubectl describe pod -n production -l app=api

# 3. Check recent logs
kubectl logs -n production -l app=api --tail=100

# 4. Check resource usage
kubectl top pods -n production -l app=api

# 5. Check service endpoints
kubectl get endpoints -n production -l app=api

# 6. Check ingress
kubectl get ingress -n production -l app=api

# 7. Check events
kubectl get events -n production --sort-by='.lastTimestamp' | tail -30
```

### High CPU Troubleshooting

```bash
# Check CPU usage by pod
kubectl top pods -n production --sort-by=cpu

# Check node CPU usage
kubectl top nodes

# Check for CPU-intensive processes in pod
kubectl exec -n production deployment/api -- top -bn1 | head -20

# Check for infinite loops in logs
kubectl logs -n production -l app=api --tail=1000 | grep -E "infinite|loop|timeout"
```

### High Memory Troubleshooting

```bash
# Check memory usage by pod
kubectl top pods -n production --sort-by=memory

# Check pod memory limits
kubectl describe pod -n production -l app=api | grep -A 5 "Limits"

# Check for memory leaks in logs
kubectl logs -n production -l app=api --tail=1000 | grep -i "memory\|oom\|exit"

# Restart pods to clear memory
kubectl rollout restart deployment/api -n production
```

### Database Issues

```bash
# Check database connections
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c "SELECT count(*) FROM pg_stat_activity;"

# Check for connection leaks
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT pid, usename, application_name, state FROM pg_stat_activity WHERE state = 'idle in transaction';"

# Check slow queries
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c \
  "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check for locks
kubectl exec -n production deployment/postgres -- \
  psql -U postgres -d insurance_lead_gen -c "SELECT * FROM pg_locks WHERE NOT granted;"

# Check disk space
kubectl exec -n production deployment/postgres -- df -h /var/lib/postgresql/data
```

### Network Issues

```bash
# Test external connectivity
kubectl exec -n production deployment/api -- curl -f https://api.insurance-lead-gen.com/health

# Check service DNS
kubectl exec -n production deployment/api -- nslookup postgres.postgres.svc.cluster.local

# Check network policies
kubectl get networkpolicies -n production

# Test internal service connectivity
kubectl exec -n production deployment/api -- \
  curl -f http://backend.backend.svc.cluster.local/health

# Check ingress controller
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx -l app=ingress-nginx --tail=100
```

### Authentication Issues

```bash
# Test JWT token
curl -H "Authorization: Bearer <token>" https://api.insurance-lead-gen.com/api/v1/profile

# Check JWT secret in config
kubectl get secret jwt-secret -n production -o yaml

# Check Redis session store
kubectl exec -n production deployment/redis -- redis-cli GET "session:user123"

# Validate token locally
kubectl exec -n production deployment/api -- \
  node -e "const jwt = require('jsonwebtoken'); console.log(jwt.decode('<token>'));"
```

---

## Configuration Reference

### Namespace Configuration

| Namespace | Purpose | Services |
|-----------|---------|----------|
| production | Production services | api, backend, frontend |
| staging | Staging environment | api, frontend |
| monitoring | Monitoring stack | prometheus, grafana, loki |
| postgres | Database namespace | postgres |
| redis | Cache namespace | redis |
| nats | Message queue namespace | nats |

### Resource Limits

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---------|-------------|-----------|----------------|--------------|
| API | 500m | 2000m | 512Mi | 2Gi |
| Backend | 500m | 2000m | 512Mi | 2Gi |
| Frontend | 100m | 500m | 128Mi | 512Mi |
| PostgreSQL | 1000m | 4000m | 2Gi | 8Gi |
| Redis | 250m | 1000m | 512Mi | 2Gi |

### Health Check Intervals

| Check | Interval | Timeout | Failure Threshold |
|-------|----------|---------|-------------------|
| Liveness | 30s | 10s | 3 |
| Readiness | 15s | 5s | 3 |
| Startup | 30s | 30s | 10 |

### Replica Targets

| Service | Min Replicas | Max Replicas | Target CPU |
|---------|--------------|--------------|------------|
| API | 2 | 10 | 70% |
| Backend | 2 | 5 | 70% |
| Frontend | 2 | 5 | 70% |

---

## Log Locations

### Application Logs

| Service | Location | Format |
|---------|----------|--------|
| API | /var/log/api | JSON |
| Backend | /var/log/backend | JSON |
| Frontend | /var/log/nginx | Plain text |

### System Logs

| Component | Location |
|-----------|----------|
| Node logs | /var/log/syslog |
| Container logs | Docker log driver |
| Kernel logs | dmesg |

### Monitoring Logs

| Service | Access Method |
|---------|---------------|
| Loki | Grafana Explore |
| Application | kubectl logs |
| Audit | AWS CloudTrail |

### Log Retention

| Log Type | Retention Period |
|----------|------------------|
| Application logs | 30 days |
| Audit logs | 1 year |
| Access logs | 90 days |
| Error logs | 1 year |

---

## Thresholds & Alerts

### Critical Alerts (SEV-1)

| Alert | Condition | Threshold | Duration |
|-------|-----------|-----------|----------|
| API Down | Health check fails | 100% failure | 2 minutes |
| Database Down | Connection fails | 100% failure | 2 minutes |
| Data Loss | Replication broken | Replication lag > 0 | 5 minutes |

### High Priority Alerts (SEV-2)

| Alert | Condition | Threshold | Duration |
|-------|-----------|-----------|----------|
| High Error Rate | 5xx errors / total | > 5% | 5 minutes |
| High Latency | P95 response time | > 2s | 5 minutes |
| Connection Pool | Pool utilization | > 90% | 5 minutes |
| Disk Space | Disk usage | > 85% | 10 minutes |

### Medium Priority Alerts (SEV-3)

| Alert | Condition | Threshold | Duration |
|-------|-----------|-----------|----------|
| High CPU | CPU utilization | > 80% | 10 minutes |
| High Memory | Memory usage | > 85% | 10 minutes |
| Pod Restart Loop | Restarts per pod | > 3 | 10 minutes |

### Low Priority Alerts (SEV-4)

| Alert | Condition | Threshold | Duration |
|-------|-----------|-----------|----------|
| Certificate Expiry | Days remaining | < 30 days | 1 day |
| Backup Failure | Backup status | Failed | 1 hour |

---

## Escalation Procedures

### SEV-1 Escalation Path

```
Time 0:      Alert triggered
Time 5 min:  Primary on-call responds
Time 15 min: Escalate to secondary on-call if no response
Time 30 min: Escalate to platform lead
Time 60 min: Escalate to engineering manager
Time 120 min: Escalate to VP engineering
```

### SEV-2 Escalation Path

```
Time 0:       Alert triggered
Time 15 min:  Primary on-call responds
Time 60 min:  Escalate to secondary on-call if no progress
Time 120 min: Escalate to platform lead
Time 240 min: Escalate to engineering manager
```

### SEV-3 Escalation Path

```
Time 0:       Alert triggered
Time 60 min:  Primary on-call responds
Time 240 min: Escalate to secondary on-call
Time 480 min: Escalate to platform lead
```

### SEV-4 Escalation Path

```
Time 0:       Alert triggered
Time 24 hours: Primary on-call responds
Time 72 hours: Escalate to secondary on-call if no action
```

---

## Quick Command Reference Card

### Start of Shift

```bash
# Health check
./scripts/daily-health-check.sh

# Check for alerts
kubectl get events -n production --sort-by='.lastTimestamp' | tail -20
```

### During Incident

```bash
# Get pod status
kubectl get pods -n production -o wide

# View recent errors
kubectl logs -n production -l app=api --tail=1000 | grep ERROR

# Restart service
kubectl rollout restart deployment/api -n production

# Scale up
kubectl scale deployment/api -n production --replicas=5
```

### End of Shift

```bash
# Check all services healthy
kubectl get pods -n production

# Review any open incidents
# Update handoff document
# Notify next on-call
```

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | $(date) | Platform Team | Initial quick reference |

---

*Last Updated: $(date)*
*Document Owner: Platform Engineering Team*
*Keep this guide accessible for quick reference*
