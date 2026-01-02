# Run 19.3: Monitoring & Observability Production Setup

## Overview

This run implements a production-ready monitoring and observability stack for the Insurance Lead Generation AI Platform. The implementation includes complete Kubernetes manifests, Helm charts, Terraform infrastructure, and comprehensive documentation for deploying Prometheus, Grafana, Loki, Jaeger, and AlertManager in a production Kubernetes environment.

## Objectives

1. Create production-grade Kubernetes manifests for all monitoring components
2. Develop Helm charts for flexible deployment
3. Implement Terraform modules for AWS infrastructure
4. Provide comprehensive documentation for operations
5. Ensure high availability, persistence, and security
6. Enable automated deployment and configuration

## Implementation Summary

### 1. Kubernetes Manifests

Location: `deploy/k8s/monitoring/`

**Namespace:**
- Dedicated `monitoring` namespace with security policies
- NetworkPolicies for service isolation
- PodSecurity enforcement

**Prometheus:**
- 2 replicas for high availability
- 100Gi gp3 persistent volume
- RBAC with ClusterRole for Kubernetes service discovery
- Service discovery for:
  - Kubernetes API Server
  - Kubernetes Nodes
  - Kubernetes Pods and Services (with annotations)
  - Node Exporter
  - Application services (API, Data Service, Orchestrator, Backend)
  - Infrastructure (Neo4j, Qdrant, NATS)
- Production alert rules:
  - Service alerts (down, high CPU/memory/disk)
  - Database alerts (PostgreSQL, Redis)
  - Application alerts (API errors, slow response, queue depth)
  - AI model alerts (latency, cost, errors)
  - Observability alerts (target down, config reload, cost ratio)

**Grafana:**
- 2 replicas for high availability
- 20Gi gp3 persistent volume
- Auto-provisioned datasources (Prometheus, Loki, Jaeger)
- Dashboard provisioning enabled
- Admin credentials via secret

**Loki:**
- 2 replicas for high availability
- 50Gi gp3 persistent volume
- 30-day retention (720h)
- Compaction enabled
- Query result caching
- 10 MB/s ingestion limit

**Jaeger:**
- Collector deployment (2 replicas)
- Query deployment (1 replica)
- OTLP endpoints (gRPC 4317, HTTP 4318)
- Elasticsearch storage support
- Separate services for collector and query

**AlertManager:**
- 2 replicas for high availability
- 5Gi gp3 persistent volume
- Clustering support
- Multi-channel notification routing:
  - Default webhook
  - Slack
  - Email
  - PagerDuty

**Node Exporter:**
- DaemonSet for all nodes
- System metrics collection
- Host network access
- Host PID access

**Ingress:**
- TLS-enabled via Cert-Manager
- Separate hosts for each component
- NGINX ingress controller integration
- Proxy timeouts and body size configured

**NetworkPolicies:**
- Prometheus ingress from: Ingress, Grafana, AlertManager
- Grafana ingress from: Ingress
- Loki ingress from: Promtail, Grafana
- AlertManager ingress from: Ingress, Prometheus
- Jaeger ingress from: Ingress, Applications, Grafana
- Exporters ingress from: Prometheus
- DNS egress for all pods

### 2. Helm Chart

Location: `deploy/helm/monitoring/`

**Templates:**
- `_helpers.tpl` - Template functions for common labels and names
- `namespace.yaml` - Namespace creation
- Prometheus resources (deployment, service, pvc)
- Grafana resources (deployment, service, pvc)
- Loki resources (deployment, service, pvc)
- AlertManager resources (deployment, service, pvc)

**Values Files:**
- `values.yaml` - Default configuration
- `values.production.yaml` - Production-specific:
  - Resource limits and requests
  - gp3 storage class
  - High availability (2 replicas)
  - Ingress configuration
  - NetworkPolicies enabled
  - Backup configuration
  - Jaeger disabled by default (requires Elasticsearch)

### 3. Terraform Module

Location: `deploy/terraform/aws/modules/monitoring/`

**S3 Resources:**
- S3 bucket for monitoring backups
- Versioning enabled
- Lifecycle configuration (90-day retention)
- Server-side encryption (AES256)
- Public access blocked

**IAM Resources:**
- Role for monitoring backup service
- Policy for S3 access
- Lambda role for automated backups

**EBS Volumes** (optional):
- Prometheus volumes (100Gi, 3000 IOPS, 125 MB/s throughput)
- Grafana volumes (20Gi)
- Loki volumes (50Gi)
- All encrypted

**CloudWatch Alarms:**
- Prometheus CPU utilization (>80%)
- Prometheus memory utilization (>85%)
- Disk space utilization (>85%)

**SNS Resources:**
- Topic for monitoring alerts
- Email subscription
- Webhook subscription

**Lambda Functions:**
- Automated backup function
- Backup Prometheus data to S3
- Scheduled via CloudWatch Events (daily at 2 AM)

### 4. Documentation

**Comprehensive Setup Guide:**
Location: `docs/RUN_19.3_MONITORING_PROD_SETUP.md`

Contents:
- Architecture overview and component descriptions
- Prerequisites and requirements
- Deployment instructions (Kustomize, Helm, script)
- Configuration details for each component
- Application integration (metrics, logging, tracing)
- Health checks and monitoring
- Troubleshooting guide
- Scaling strategies
- Cost optimization
- Security best practices
- Maintenance procedures
- Production checklist

**Quick Start Guide:**
Location: `deploy/monitoring-prod-quickstart.md`

Contents:
- 5-minute deployment guide
- Prerequisites checklist
- Step-by-step deployment
- Common tasks (password change, config reload, scaling)
- Troubleshooting
- Production readiness checklist

**Deployment Script:**
Location: `deploy/scripts/deploy-monitoring.sh`

Features:
- Colored output (info, warn, error)
- Prerequisites checking
- Automatic secret creation
- Kustomize and Helm deployment options
- Deployment verification
- Access information display
- Port forwarding setup
- Backup configuration

**Documentation Files:**
- `deploy/k8s/monitoring/README.md` - Component overview
- `docs/RUN_19.3_SUMMARY.md` - Implementation summary

### 5. Configuration

**Environment Variables:**
Location: `/.env.example`

Added production monitoring variables:
- Prometheus configuration (retention, scrape interval)
- Grafana configuration (server root URL)
- Loki configuration (retention, ingestion rate)
- Jaeger configuration (storage type, ES URL)
- AlertManager configuration (cluster port)
- Production host URLs
- Storage class
- Backup schedule
- Notification channels (Slack, PagerDuty, Email)

**Prometheus Configuration:**
- 15s scrape interval
- 15s evaluation interval
- 30-day retention
- External labels: cluster, environment
- AlertManager endpoint
- Comprehensive service discovery

**Alert Rules:**
- 6 alert groups
- 25+ alert rules
- Severity levels: critical, warning
- Team assignments: platform, database, backend, ml

**Grafana Configuration:**
- SQLite database
- Default home dashboard
- Analytics reporting disabled
- Session file storage
- Metrics enabled
- Alerting enabled

**Loki Configuration:**
- Boltdb-shipper storage
- 30-day retention
- 10 MB/s ingestion limit
- 20 MB/s burst
- Query splitting: 15m
- Cache results enabled
- Compaction enabled

### 6. Security

**Network Security:**
- NetworkPolicies for all components
- Restricted ingress to necessary sources
- DNS egress for all pods
- Service isolation

**Access Control:**
- RBAC with ClusterRoles
- Service accounts for each component
- Least privilege principle
- Grafana admin authentication

**Data Protection:**
- Encrypted EBS volumes
- Encrypted S3 bucket
- Secrets for sensitive data
- TLS/SSL for all endpoints
- Cert-Manager integration

**Pod Security:**
- Non-root containers
- Drop capabilities
- Read-only root filesystem (where applicable)
- Security contexts defined

## Storage Requirements

### Production Configuration

| Component | Size | Replicas | Type | IOPS | Total |
|-----------|------|----------|------|------|-------|
| Prometheus | 100Gi | 2 | gp3 | 3000 | 200Gi |
| Grafana | 20Gi | 2 | gp3 | 3000 | 40Gi |
| Loki | 50Gi | 2 | gp3 | 3000 | 100Gi |
| AlertManager | 5Gi | 2 | gp3 | 3000 | 10Gi |
| **Total** | - | - | - | - | **350Gi** |

### S3 Backup Storage

- Bucket for monitoring backups
- 90-day retention for backups
- 30-day retention for non-current versions
- Automatic compaction and deletion

## Access URLs

### Production (via Ingress)

- **Grafana**: https://grafana.insurance-lead-gen.com
- **Prometheus**: https://prometheus.insurance-lead-gen.com
- **AlertManager**: https://alertmanager.insurance-lead-gen.com
- **Jaeger**: https://jaeger.insurance-lead-gen.com (if enabled)

### Local (via Port Forwarding)

- **Grafana**: http://localhost:3000
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093
- **Jaeger**: http://localhost:16686 (if enabled)

## Deployment Methods

### Method 1: Kustomize

```bash
cd deploy/k8s/monitoring
kubectl apply -k .
kubectl wait --for=condition=available \
  -l app.kubernetes.io/component=monitoring \
  --namespace monitoring \
  --timeout 600s deployment
```

### Method 2: Helm

```bash
cd deploy/helm/monitoring
helm install insurance-lead-gen-monitoring . \
  --namespace monitoring \
  --create-namespace \
  --values values.production.yaml \
  --wait --timeout 10m
```

### Method 3: Deployment Script

```bash
cd deploy/scripts
export GRAFANA_ADMIN_PASSWORD="your_secure_password"
./deploy-monitoring.sh helm
```

## Application Integration

### Metrics Export

Applications must expose Prometheus metrics:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
```

### Logging Integration

Send logs to Loki:

```typescript
import { WinstonOtel } from '@your-org/monitoring';

const logger = new WinstonOtel({
  lokiUrl: 'http://loki.monitoring.svc.cluster.local:3100',
  serviceName: 'api-service',
});
```

### Tracing Integration

Send traces to Jaeger:

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://jaeger-collector.monitoring.svc.cluster.local:4317',
  }),
});
```

## High Availability

### Component Replication

- **Prometheus**: 2 replicas (no native HA, use Thanos for true HA)
- **Grafana**: 2 replicas (stateless, active-passive)
- **Loki**: 2 replicas (ring-based clustering)
- **AlertManager**: 2 replicas (peered)
- **Jaeger Collector**: 2 replicas (load balanced)
- **Jaeger Query**: 1 replica (stateless)

### Anti-Affinity

All deployments have pod anti-affinity rules to distribute replicas across nodes.

### Clustering

- **AlertManager**: Peered configuration
- **Loki**: Ring-based coordination
- **Prometheus**: Not clustered (external HA required)

## Backup Strategy

### Automated Backup

- Lambda function backups Prometheus data to S3
- Scheduled daily at 2 AM
- 30-day retention
- Incremental backups

### Manual Backup

```bash
# Prometheus
kubectl exec -n monitoring prometheus-0 -- \
  tar czf /tmp/prometheus-backup.tar.gz /prometheus
kubectl cp monitoring/prometheus-0:/tmp/prometheus-backup.tar.gz ./backups/

# Grafana
kubectl exec -n monitoring grafana-0 -- \
  tar czf /tmp/grafana-backup.tar.gz /var/lib/grafana
kubectl cp monitoring/grafana-0:/tmp/grafana-backup.tar.gz ./backups/

# Loki
kubectl exec -n monitoring loki-0 -- \
  tar czf /tmp/loki-backup.tar.gz /loki
kubectl cp monitoring/loki-0:/tmp/loki-backup.tar.gz ./backups/
```

### Disaster Recovery

- Restore from S3 backup
- EBS snapshots (if using direct EBS)
- Terraform state versioning
- Git-based configuration management

## Cost Optimization

### Storage Costs

- Total: 350Gi on gp3 ($0.08/GB/month) ≈ $28/month
- S3 backup: ~100Gi ($0.023/GB/month) ≈ $2.30/month

### Compute Costs

- Prometheus: 2x (500m CPU, 1Gi RAM)
- Grafana: 2x (250m CPU, 256Mi RAM)
- Loki: 2x (250m CPU, 512Mi RAM)
- AlertManager: 2x (100m CPU, 128Mi RAM)
- Node Exporter: DaemonSet (one per node)

### Optimization Strategies

1. **Reduce Retention**: 30d → 15d (50% storage savings)
2. **Adjust Scrape Interval**: 15s → 30s (50% query reduction)
3. **Reduce Replicas in Staging**: 2 → 1
4. **Use Spot Instances**: For worker nodes
5. **Enable Recording Rules**: Aggregate expensive queries

### Cost Monitoring

Target: Observability cost < 5% of infrastructure cost

Monitor: `rate(observability_cost_total[1h]) / rate(infrastructure_cost_total[1h])`

Alert when ratio > 5%

## Production Readiness Checklist

### Prerequisites

- [ ] Kubernetes cluster (EKS 1.27+) running
- [ ] gp3 storage class available
- [ ] NGINX ingress controller installed
- [ ] Cert-Manager installed
- [ ] DNS records configured
- [ ] Elasticsearch deployed (for Jaeger)

### Deployment

- [ ] Monitoring namespace created
- [ ] All pods running (2 replicas for HA)
- [ ] PVCs bound and mounting
- [ ] Services configured
- [ ] NetworkPolicies applied

### Configuration

- [ ] Grafana admin password changed
- [ ] AlertManager notification channels configured
- [ ] TLS certificates issued
- [ ] DNS records resolving
- [ ] Resource limits appropriate

### Verification

- [ ] Prometheus scraping all targets
- [ ] Grafana accessing datasources
- [ ] Loki receiving logs
- [ ] Jaeger collecting traces (if enabled)
- [ ] AlertManager routing alerts
- [ ] Alerts firing and notifying

### Operations

- [ ] Backup procedures tested
- [ ] Restore procedures documented
- [ ] On-call rotation established
- [ ] Runbooks documented
- [ ] Incident response procedures defined
- [ ] SLAs and SLOs defined
- [ ] Cost monitoring enabled

### Integration

- [ ] Applications exposing metrics
- [ ] Applications sending logs
- [ ] Applications sending traces
- [ ] Dashboards created
- [ ] Alert thresholds tuned

## Troubleshooting

### Common Issues

1. **Pods stuck in Pending state**
   - Check PVCs are bound
   - Verify storage class exists
   - Check node resources

2. **Prometheus not scraping targets**
   - Check service discovery configuration
   - Verify service labels match
   - Check NetworkPolicies
   - Review Prometheus logs

3. **Grafana can't connect to datasources**
   - Verify datasource URLs
   - Check NetworkPolicies
   - Review Grafana logs
   - Test service connectivity

4. **Loki not receiving logs**
   - Check Promtail is running
   - Verify log paths exist
   - Test Loki endpoint
   - Review Loki logs

5. **Alerts not firing**
   - Check alert evaluation in Prometheus
   - Verify AlertManager configuration
   - Test notification channels
   - Review AlertManager logs

### Debug Commands

```bash
# Check pod status
kubectl get pods -n monitoring

# Check pod logs
kubectl logs -n monitoring -l app.kubernetes.io/name=prometheus -f

# Check events
kubectl get events -n monitoring --sort-by='.lastTimestamp'

# Describe pod
kubectl describe pod prometheus-0 -n monitoring

# Check service connectivity
kubectl exec -n monitoring grafana-0 -- \
  wget -qO- http://prometheus:9090/-/healthy

# Check NetworkPolicies
kubectl get networkpolicies -n monitoring

# Check PVCs
kubectl get pvc -n monitoring
```

## Maintenance

### Rolling Updates

```bash
# Using Helm
helm upgrade insurance-lead-gen-monitoring \
  deploy/helm/monitoring \
  --namespace monitoring \
  --values values.production.yaml

# Using Kubectl
kubectl apply -k deploy/k8s/monitoring
```

### Configuration Reload

```bash
# Prometheus
kubectl exec -n monitoring prometheus-0 -- \
  wget -qO- --post-data='' http://localhost:9090/-/reload

# AlertManager
kubectl exec -n monitoring alertmanager-0 -- \
  wget -qO- --post-data='' http://localhost:9093/-/reload
```

### Scale Up/Down

```bash
# Using Helm (edit values)
helm upgrade insurance-lead-gen-monitoring \
  deploy/helm/monitoring \
  --namespace monitoring \
  --set prometheus.replicaCount=3

# Using Kubectl
kubectl scale deployment prometheus -n monitoring --replicas=3
```

## Future Enhancements

### Short-term

1. **Dashboards**: Create production dashboards for:
   - System health
   - Application performance
   - Business metrics (leads, AI, queues)
   - Log analysis

2. **Alert Tuning**: Adjust thresholds based on production load

3. **Backup Automation**: Implement automated restore testing

### Long-term

1. **Thanos**: Add Thanos for Prometheus HA and long-term storage

2. **Cortex**: Consider Cortex for horizontally scalable metrics

3. **VictoriaMetrics**: Evaluate for high-performance metrics

4. **Tempo**: Replace Jaeger with Tempo for cost-effective tracing

5. **Grafana Mimir**: Evaluate for managed Grafana metrics

## Files Created

Total: 45+ files

### Kubernetes Manifests: 25 files
### Helm Templates: 13 files
### Terraform Module: 3 files
### Documentation: 4 files
### Scripts: 1 file
### Configuration: 1 file

## References

- **Full Documentation**: `docs/RUN_19.3_MONITORING_PROD_SETUP.md`
- **Quick Start**: `deploy/monitoring-prod-quickstart.md`
- **Deployment Script**: `deploy/scripts/deploy-monitoring.sh`
- **Kubernetes Manifests**: `deploy/k8s/monitoring/`
- **Helm Chart**: `deploy/helm/monitoring/`
- **Terraform Module**: `deploy/terraform/aws/modules/monitoring/`

## Conclusion

This implementation provides a complete production-ready monitoring and observability stack with:

- ✅ High availability configuration
- ✅ Persistent storage with backup
- ✅ Security hardening
- ✅ Flexible deployment options
- ✅ Comprehensive documentation
- ✅ Automated deployment scripts
- ✅ Infrastructure as Code
- ✅ Application integration examples
- ✅ Troubleshooting guides
- ✅ Cost optimization strategies

The monitoring stack is now ready for production deployment and can be easily customized for specific requirements.
