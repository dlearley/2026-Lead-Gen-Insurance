# Operational Runbooks

## 📋 Table of Contents

1. [Daily Operations](#daily-operations)
2. [Incident Response](#incident-response)
3. [Deployment Procedures](#deployment-procedures)
4. [Scaling Operations](#scaling-operations)
5. [Database Operations](#database-operations)
6. [Monitoring & Alerts](#monitoring--alerts)
7. [Maintenance Tasks](#maintenance-tasks)

---

## Daily Operations

### Morning Health Check

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

### Weekly Maintenance Checklist

- [ ] Review error logs for patterns
- [ ] Check backup completion status
- [ ] Review security advisories
- [ ] Verify SSL certificate expiry
- [ ] Check disk space on all nodes
- [ ] Review and rotate secrets if needed
- [ ] Check for Kubernetes version updates
- [ ] Review cost optimization opportunities

---

## Incident Response

### Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| SEV-1 | Critical - Complete outage | 15 min | All services down, data loss |
| SEV-2 | High - Major functionality affected | 1 hour | API unresponsive, data inconsistency |
| SEV-3 | Medium - Degraded service | 4 hours | Slow response, partial features down |
| SEV-4 | Low - Minor issue | 24 hours | Non-critical UI issues |

### SEV-1 Response Procedure

```bash
# 1. Acknowledge incident
# Notify on-call team via PagerDuty

# 2. Assess impact
kubectl get pods -n production -o wide
kubectl get events -n production --sort-by='.lastTimestamp'

# 3. Check Kubernetes cluster health
kubectl get nodes
kubectl describe node <affected-node>

# 4. Check resource constraints
kubectl top nodes
kubectl top pods -n production

# 5. View logs for affected services
kubectl logs -n production -l app=api --tail=100 --previous
kubectl logs -n production -l app=backend --tail=100 --previous

# 6. Restart affected deployments if needed
kubectl rollout restart deployment/api -n production
kubectl rollout restart deployment/backend -n production

# 7. Scale up if needed
kubectl scale deployment/api -n production --replicas=5

# 8. Verify recovery
kubectl get pods -n production -l app=api
```

### Common Incidents

#### API Service Not Responding

```bash
# Check API pods
kubectl get pods -n production -l app=api

# Check API logs
kubectl logs -n production -l app=api --tail=200

# Check resource usage
kubectl top pods -n production -l app=api

# Restart API deployment
kubectl rollout restart deployment/api -n production

# Verify health endpoint
curl https://api.insurance-lead-gen.com/health
```

#### Database Connection Failures

```bash
# Check PostgreSQL pods
kubectl get pods -n production -l app=postgres

# Check PostgreSQL logs
kubectl logs -n production -l app=postgres --tail=100

# Check connections
kubectl exec -n production <postgres-pod> -- psql -c "SELECT count(*) FROM pg_stat_activity;"

# Restart PostgreSQL if needed
kubectl rollout restart statefulset/postgres -n production
```

#### High Memory Usage

```bash
# Identify memory-intensive pods
kubectl top pods -n production --sort-by=memory

# Check pod details
kubectl describe pod <pod-name> -n production

# Increase memory limits if needed
kubectl set resources deployment/api -n production --limits=memory=1Gi

# Consider horizontal scaling
kubectl scale deployment/api -n production --replicas=5
```

---

## Deployment Procedures

### Standard Deployment (Helm)

```bash
# 1. Verify current release
helm list -n production

# 2. Check new chart values
helm upgrade --dry-run --debug api ./deploy/helm/api \
  -f ./deploy/helm/api/values.production.yaml \
  -n production

# 3. Perform deployment
helm upgrade --install api ./deploy/helm/api \
  -f ./deploy/helm/api/values.production.yaml \
  -n production \
  --wait \
  --timeout 10m

# 4. Verify rollout
kubectl rollout status deployment/api -n production

# 5. Run smoke tests
./scripts/smoke-tests.sh production

# 6. Check metrics
curl https://api.insurance-lead-gen.com/metrics | grep http_requests
```

### Blue-Green Deployment

```bash
# Create blue-green namespace
kubectl create namespace production-blue
kubectl create namespace production-green

# Deploy to blue namespace
helm upgrade --install api-blue ./deploy/helm/api \
  -f ./deploy/helm/api/values.production.yaml \
  -n production-blue

# Run tests against blue
./scripts/integration-tests.sh http://api-blue.insurance-lead-gen.com

# Switch traffic (update ingress)
kubectl annotate ingress/api -n production \
  kubernetes.io/ingress.class=nginx \
  nginx.ingress.kubernetes.io/canary="true" \
  nginx.ingress.kubernetes.io/canary-weight="100"

# Monitor for issues
kubectl logs -f -l app=api -n production-blue

# If issues, rollback:
kubectl annotate ingress/api -n production \
  nginx.ingress.kubernetes.io/canary-weight="0"

# If successful, finalize:
helm uninstall api -n production
helm upgrade --install api ./deploy/helm/api \
  -f ./deploy/helm/api/values.production.yaml \
  -n production
```

### Rollback Procedure

```bash
# List releases
helm list -n production

# Check revision history
helm history api -n production

# Rollback to previous revision
helm rollback api 1 -n production

# Verify rollback
kubectl rollout status deployment/api -n production

# If Kubernetes resources need rollback
kubectl rollout undo deployment/api -n production
```

---

## Scaling Operations

### Horizontal Scaling (Pods)

```bash
# Scale API service
kubectl scale deployment/api -n production --replicas=5

# Scale with HPA (automatic)
kubectl get hpa -n production

# Configure HPA
kubectl autoscale deployment/api -n production \
  --min=3 \
  --max=10 \
  --cpu-percent=70
```

### Vertical Scaling (Resources)

```bash
# Update resource requests/limits
kubectl set resources deployment/api -n production \
  --requests=cpu=500m,memory=512Mi \
  --limits=cpu=1000m,memory=1Gi

# Check current usage for right-sizing
kubectl top pods -n production -l app=api
```

### Node Scaling (Cluster)

```bash
# Scale node group in AWS
aws eks update-nodegroup-version \
  --cluster-name insurance-lead-gen-production \
  --nodegroup-name general \
  --release-version 1.27

# Add GPU nodes
kubectl scale nodegroup gpu --replicas=2
```

---

## Database Operations

### Backup

```bash
# Create PostgreSQL backup
kubectl exec -n production <postgres-pod> -- pg_dump -U postgres insurance_lead_gen > backup.sql

# Automated backup check
kubectl get cronjob -n production
kubectl describe cronjob <backup-cronjob> -n production

# Verify backup integrity
psql -U postgres -c "SELECT count(*) FROM leads;" < backup.sql
```

### Restore

```bash
# Stop applications
kubectl scale deployment/api -n production --replicas=0
kubectl scale deployment/backend -n production --replicas=0

# Restore from backup
kubectl exec -i -n production <postgres-pod> -- psql -U postgres insurance_lead_gen < backup.sql

# Verify restoration
kubectl exec -n production <postgres-pod> -- psql -U postgres -c "SELECT count(*) FROM leads;"

# Restart applications
kubectl scale deployment/api -n production --replicas=3
kubectl scale deployment/backend -n production --replicas=3
```

### Connection Pool Management

```bash
# Check active connections
kubectl exec -n production <postgres-pod> -- psql -c "SELECT count(*) FROM pg_stat_activity;"

# View long-running queries
kubectl exec -n production <postgres-pod> -- psql -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC LIMIT 5;"

# Kill long-running query (if needed)
kubectl exec -n production <postgres-pod> -- psql -c "SELECT pg_terminate_backend(<pid>);"
```

---

## Monitoring & Alerts

### Checking Metrics

```bash
# Prometheus queries
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# Query examples:
# - API error rate: rate(http_requests_total{status=~"5.."}[5m])
# - Request latency: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
# - Pod memory: container_memory_usage_bytes{namespace="production"}
```

### Alert Response

```bash
# View active alerts
kubectl get alertmanagerconfiguration -n monitoring

# Check AlertManager UI
kubectl port-forward -n monitoring svc/alertmanager 9093:9093

# Silence alert (if expected)
kubectl label namespace production alert.ignore=high-memory
```

### Grafana Dashboards

```bash
# Access Grafana
kubectl port-forward -n monitoring svc/grafana 3000:3000

# Default dashboards:
# - Platform Overview: ID 1234
# - API Performance: ID 5678
# - Database Metrics: ID 9012
```

---

## Maintenance Tasks

### Certificate Renewal

```bash
# Check certificate expiry
kubectl get certificates -n production
kubectl describe certificate api-tls -n production

# Manual renewal (if needed)
kubectl delete certificate api-tls -n production
kubectl apply -f certificates/api-tls.yaml -n production

# Verify renewal
kubectl get certificates -n production
```

### Log Rotation

```bash
# Configure log retention in Loki
kubectl get configmap loki-config -n monitoring -o yaml

# Adjust retention period
loki:
  table_manager:
    retention_deletes_enabled: true
    retention_period: 720h  # 30 days
```

### Secret Rotation

```bash
# Rotate database password
# 1. Update in AWS Secrets Manager
aws secretsmanager update-secret --secret-id insurance-lead-gen/production/database --secret-string "new-password"

# 2. Restart services to pick up new secret
kubectl rollout restart deployment/api -n production
kubectl rollout restart deployment/backend -n production

# 3. Update application connection strings
kubectl exec -n production <postgres-pod> -- psql -c "ALTER USER admin WITH PASSWORD 'new-password';"
```

### Kubernetes Version Upgrade

```bash
# Check available versions
aws eks list-versions --region us-east-1

# Update EKS cluster
aws eks update-cluster-version \
  --name insurance-lead-gen-production \
  --region us-east-1 \
  --kubernetes-version 1.28

# Update node groups
aws eks update-nodegroup-version \
  --cluster-name insurance-lead-gen-production \
  --nodegroup-name general \
  --release-version 1.28

# Verify upgrade
kubectl get nodes
kubectl version --short
```

---

## Useful Commands Reference

### Debugging

```bash
# Port forward to service
kubectl port-forward -n production svc/api 3000:3000

# Execute in pod
kubectl exec -it -n production <pod-name> -- /bin/sh

# Copy files from pod
kubectl cp -n production <pod-name>:/path/to/file ./local-file

# Describe resource
kubectl describe pod <pod-name> -n production

# View events
kubectl get events -n production --sort-by='.lastTimestamp'
```

### Resource Management

```bash
# View resource quotas
kubectl get quota -n production

# View limit ranges
kubectl get limitranges -n production

# Check resource usage over time
kubectl top pods -n production --sort-by=memory --all-namespaces
```

---

## Support Contacts

| Role | Contact | Responsibility |
|------|---------|----------------|
| Platform Team | #platform-oncall | Infrastructure, Kubernetes |
| SRE Team | #sre-oncall | Monitoring, Incidents |
| Security Team | #security-oncall | Security incidents |
| Database Team | #db-oncall | Database issues |

---

## Links

- **Grafana**: https://grafana.insurance-lead-gen.com
- **Prometheus**: https://prometheus.insurance-lead-gen.com
- **AlertManager**: https://alertmanager.insurance-lead-gen.com
- **Jaeger**: https://jaeger.insurance-lead-gen.com
- **API Documentation**: https://api.insurance-lead-gen.com/docs
