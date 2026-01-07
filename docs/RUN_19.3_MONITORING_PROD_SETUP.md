# Run 19.3: Monitoring & Observability Production Setup

## Overview

This document describes the production setup for the monitoring and observability stack for the Insurance Lead Generation AI Platform. The stack includes Prometheus, Grafana, Loki, Jaeger, and AlertManager with high availability, persistent storage, and security configurations.

## Architecture

### Components

1. **Prometheus** - Metrics collection and alerting
   - 2 replicas for high availability
   - 100Gi persistent storage
   - RBAC configured for Kubernetes service discovery
   - Service discovery for pods, services, and nodes

2. **Grafana** - Visualization and dashboards
   - 2 replicas for high availability
   - 20Gi persistent storage
   - Pre-configured datasources (Prometheus, Loki, Jaeger)
   - Dashboard auto-provisioning

3. **Loki** - Log aggregation
   - 2 replicas for high availability
   - 50Gi persistent storage
   - 30-day retention policy
   - Log compaction and optimization

4. **Jaeger** - Distributed tracing
   - Separate collector and query deployments
   - OTLP support (gRPC and HTTP)
   - Elasticsearch storage (requires external setup)

5. **AlertManager** - Alert routing and management
   - 2 replicas for high availability
   - 5Gi persistent storage
   - Clustering support
   - Multi-channel notifications (Slack, Email, PagerDuty)

6. **Exporters**
   - Node Exporter (system metrics) - DaemonSet
   - PostgreSQL Exporter - optional
   - Redis Exporter - optional

### Infrastructure

- **Storage**: AWS EBS GP3 volumes (gp3 storage class)
- **Networking**: ClusterIP services, Ingress for external access
- **Security**: NetworkPolicies for service isolation
- **TLS**: Cert-Manager with Let's Encrypt for production
- **Authentication**: Grafana admin credentials, Prometheus RBAC

## Prerequisites

### Kubernetes Cluster

- Kubernetes 1.27+
- AWS EKS cluster with gp3 storage class
- EBS CSI driver installed
- Ingress controller (NGINX) installed
- Cert-Manager installed for TLS certificates

### External Dependencies

- **Elasticsearch** (for Jaeger) - AWS OpenSearch or self-hosted
- **Notification services**
  - Slack webhook URL (optional)
  - SMTP server for email (optional)
  - PagerDuty integration key (optional)

### DNS Records

Create DNS records pointing to your ingress controller:

```
grafana.insurance-lead-gen.com      → Ingress IP
prometheus.insurance-lead-gen.com   → Ingress IP
alertmanager.insurance-lead-gen.com → Ingress IP
jaeger.insurance-lead-gen.com       → Ingress IP (if enabled)
```

## Deployment

### Option 1: Using Kustomize

```bash
# Apply to production cluster
cd deploy/k8s/monitoring
kubectl apply -k .

# Verify deployment
kubectl get all -n monitoring

# Check pod status
kubectl get pods -n monitoring
```

### Option 2: Using Helm

```bash
# Add dependencies (if using common chart)
cd deploy/helm/monitoring

# Deploy with production values
helm install insurance-lead-gen-monitoring . \
  --namespace monitoring \
  --create-namespace \
  --values values.production.yaml \
  --wait --timeout 10m

# Upgrade deployment
helm upgrade insurance-lead-gen-monitoring . \
  --namespace monitoring \
  --values values.production.yaml \
  --wait
```

### Configuration Updates

Update secrets before deployment:

```bash
# Create Grafana admin credentials
kubectl create secret generic grafana-admin-credentials \
  --from-literal=admin-user=admin \
  --from-literal=admin-password=your_secure_password \
  --namespace monitoring

# Create AlertManager config with notifications
kubectl create secret generic alertmanager-config \
  --from-file=alertmanager.yml=monitoring/alertmanager/alertmanager.yml \
  --namespace monitoring

# Create Elasticsearch credentials for Jaeger (if enabled)
kubectl create secret generic elasticsearch-credentials \
  --from-literal=username=elastic \
  --from-literal=password=your_es_password \
  --namespace monitoring
```

## Configuration

### Prometheus Configuration

Location: `deploy/k8s/monitoring/prometheus/prometheus.yml`

Key settings:
- Scrape interval: 15s
- Evaluation interval: 15s
- Retention: 30 days
- Service discovery: Kubernetes API, endpoints, pods, nodes
- External labels: cluster, environment

### Alert Rules

Location: `deploy/k8s/monitoring/prometheus/alerts.yml`

Alert categories:
- Service alerts (down, high CPU/memory/disk)
- Database alerts (PostgreSQL, Redis)
- Application alerts (API errors, slow response, queue depth)
- AI model alerts (latency, cost, errors)
- Observability alerts (target down, config reload failed)

### Grafana Configuration

Datasources auto-provisioned:
- Prometheus (default)
- Loki (logs)
- Jaeger (traces)

Access credentials:
- Default: admin / CHANGE_ME_IN_PRODUCTION
- Update secret: `grafana-admin-credentials`

### Loki Configuration

Location: `deploy/k8s/monitoring/loki/loki-config.yml`

Key settings:
- Retention: 720h (30 days)
- Ingestion rate: 10 MB/s
- Max query length: 721h
- Compaction: Enabled with 10m interval
- Cache: Enabled for query results

### AlertManager Configuration

Location: `monitoring/alertmanager/alertmanager.yml`

Notification channels:
- Default: webhook
- Critical alerts: Slack, Email, PagerDuty
- Warning alerts: Slack
- Team-specific: Database, Dev, ML teams

Update for production:
```yaml
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts'
        title: 'Alert: {{ .GroupLabels.alertname }}'

  - name: 'email'
    email_configs:
      - to: 'team@insurance-lead-gen.com'
        from: 'alerts@insurance-lead-gen.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'alerts@insurance-lead-gen.com'
        auth_password: 'your_app_password'

  - name: 'pagerduty'
    pagerduty_configs:
      - routing_key: 'YOUR_PAGERDUTY_INTEGRATION_KEY'
```

## Storage Requirements

### Production Storage

| Component | Size | Type | IOPS | Throughput |
|-----------|------|------|------|------------|
| Prometheus | 100Gi | gp3 | 3000 | 125 MiB/s |
| Grafana | 20Gi | gp3 | 3000 | 125 MiB/s |
| Loki | 50Gi | gp3 | 3000 | 125 MiB/s |
| AlertManager | 5Gi | gp3 | 3000 | 125 MiB/s |
| Jaeger | 50Gi+ | gp3 | 3000 | 125 MiB/s |

**Total**: ~225Gi per monitoring stack replica

### Backup Strategy

```bash
# Backup Prometheus data
kubectl exec -n monitoring prometheus-0 -- tar czf /tmp/prometheus-backup.tar.gz /prometheus
kubectl cp monitoring/prometheus-0:/tmp/prometheus-backup.tar.gz ./backups/

# Backup Grafana data
kubectl exec -n monitoring grafana-0 -- tar czf /tmp/grafana-backup.tar.gz /var/lib/grafana
kubectl cp monitoring/grafana-0:/tmp/grafana-backup.tar.gz ./backups/

# Backup Loki data
kubectl exec -n monitoring loki-0 -- tar czf /tmp/loki-backup.tar.gz /loki
kubectl cp monitoring/loki-0:/tmp/loki-backup.tar.gz ./backups/
```

## Access URLs

After deployment, access the monitoring stack:

- **Grafana**: https://grafana.insurance-lead-gen.com
- **Prometheus**: https://prometheus.insurance-lead-gen.com
- **AlertManager**: https://alertmanager.insurance-lead-gen.com
- **Jaeger**: https://jaeger.insurance-lead-gen.com (if enabled)

## Application Integration

### Metrics Export

Applications must expose metrics at `/metrics` endpoint:

```typescript
// NestJS Example
import { makeCounterProvider } from '@willsoto/nestjs-prometheus';

@Module({
  providers: [
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    }),
  ],
})
export class AppModule {}
```

### Logging

Send logs to Loki using Winston-Otel:

```typescript
import { WinstonOtel } from '@your-org/monitoring';

const logger = new WinstonOtel({
  lokiUrl: 'http://loki.monitoring.svc.cluster.local:3100',
  serviceName: 'api-service',
});
```

### Tracing

Send traces to Jaeger using OpenTelemetry:

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://jaeger-collector.monitoring.svc.cluster.local:4317',
  }),
});
```

### Prometheus Annotations

Add annotations to pods for automatic discovery:

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

## Monitoring Health

### Check Component Status

```bash
# Prometheus
kubectl exec -n monitoring prometheus-0 -- wget -qO- http://localhost:9090/-/healthy

# Grafana
kubectl exec -n monitoring grafana-0 -- wget -qO- http://localhost:3000/api/health

# Loki
kubectl exec -n monitoring loki-0 -- wget -qO- http://localhost:3100/ready

# AlertManager
kubectl exec -n monitoring alertmanager-0 -- wget -qO- http://localhost:9093/-/healthy
```

### View Logs

```bash
# Prometheus logs
kubectl logs -n monitoring -l app.kubernetes.io/name=prometheus -f

# Grafana logs
kubectl logs -n monitoring -l app.kubernetes.io/name=grafana -f

# Loki logs
kubectl logs -n monitoring -l app.kubernetes.io/name=loki -f

# AlertManager logs
kubectl logs -n monitoring -l app.kubernetes.io/name=alertmanager -f
```

### Verify Metrics Collection

```bash
# Port forward to Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# Open http://localhost:9090/targets
# Verify all targets are UP
```

## Troubleshooting

### Prometheus Not Scraping Targets

1. Check target status: http://prometheus.insurance-lead-gen.com/targets
2. Verify service labels match Prometheus config
3. Check NetworkPolicies allow scraping
4. Verify pod annotations are correct

### Grafana Can't Connect to Datasources

1. Check datasource URLs: `http://service.namespace:port`
2. Verify services are in correct namespace
3. Check NetworkPolicies allow connections
4. View Grafana logs for connection errors

### Loki Not Receiving Logs

1. Check Promtail is running and configured
2. Verify log paths exist in containers
3. Test Loki endpoint: `kubectl exec -n monitoring loki-0 -- wget -qO- http://localhost:3100/ready`
4. Check NetworkPolicies allow Promtail → Loki

### Alerts Not Firing

1. Check AlertManager status: http://alertmanager.insurance-lead-gen.com
2. Verify alert rules are loaded in Prometheus
3. Check alert evaluation: http://prometheus.insurance-lead-gen.com/alerts
4. Verify notification channel configuration

### High Resource Usage

1. Check resource limits in Helm values or Kustomize
2. Adjust retention periods (Prometheus, Loki)
3. Review scrape intervals and metrics cardinality
4. Add recording rules for expensive queries

## Scaling

### Vertical Scaling

Edit Helm values or Kustomize:

```yaml
prometheus:
  resources:
    limits:
      cpu: 2000m  # Increase
      memory: 4Gi  # Increase
```

### Horizontal Scaling

Prometheus doesn't support HA out of the box. Use:
- Thanos for long-term storage and HA
- Cortex for horizontally scalable Prometheus
- VictoriaMetrics for high-performance metrics

Grafana and Loki support HA with replica counts.

## Cost Optimization

### Reduce Storage Costs

1. Decrease retention periods:
   - Prometheus: 30d → 15d
   - Loki: 30d → 7d

2. Enable compression and compaction
3. Use recording rules to store aggregated data
4. Archive old data to S3 Glacier

### Reduce Compute Costs

1. Adjust scrape intervals: 15s → 30s
2. Reduce replica counts in staging
3. Use spot instances for worker nodes
4. Implement downscaling during off-hours

### Observability Cost Ratio

Target: <5% of infrastructure cost

Monitor: `rate(observability_cost_total[1h]) / rate(infrastructure_cost_total[1h])`

## Security

### TLS/SSL

All monitoring endpoints use TLS via Cert-Manager:

```bash
# Verify certificates
kubectl get certificate -n monitoring
```

### Authentication

- Grafana: Basic auth with admin credentials
- Prometheus: No auth (use network policies)
- AlertManager: No auth (use network policies)

### Authorization

- RBAC: Service accounts with ClusterRoles
- NetworkPolicies: Restrict traffic to monitoring namespace
- PodSecurity: Enforce privileged policies for node-exporter

### Secrets Management

Store sensitive data in Kubernetes Secrets:

```bash
# Rotate Grafana password
kubectl create secret generic grafana-admin-credentials \
  --from-literal=admin-user=admin \
  --from-literal=admin-password=new_secure_password \
  --namespace monitoring \
  --dry-run=client -o yaml | kubectl apply -f -

# Rotate AlertManager config
kubectl create secret generic alertmanager-config \
  --from-file=alertmanager.yml=monitoring/alertmanager/alertmanager.yml \
  --namespace monitoring \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Maintenance

### Rolling Updates

```bash
# Upgrade using Helm
helm upgrade insurance-lead-gen-monitoring \
  deploy/helm/monitoring \
  --namespace monitoring \
  --values deploy/helm/monitoring/values.production.yaml
```

### Configuration Reload

```bash
# Reload Prometheus config
kubectl exec -n monitoring prometheus-0 -- wget -qO- --post-data='' http://localhost:9090/-/reload

# Reload AlertManager config
kubectl exec -n monitoring alertmanager-0 -- wget -qO- --post-data='' http://localhost:9093/-/reload
```

### Backup and Restore

See "Storage Requirements" section for backup commands.

Restore:
```bash
# Restore Prometheus
kubectl cp ./backups/prometheus-backup.tar.gz monitoring/prometheus-0:/tmp/
kubectl exec -n monitoring prometheus-0 -- tar xzf /tmp/prometheus-backup.tar.gz -C /
kubectl exec -n monitoring prometheus-0 -- rm /tmp/prometheus-backup.tar.gz
```

## Production Checklist

Before deploying to production:

- [ ] DNS records configured
- [ ] TLS certificates issued (Cert-Manager)
- [ ] Grafana admin password changed
- [ ] AlertManager notification channels configured
- [ ] Storage classes verified (gp3)
- [ ] NetworkPolicies applied
- [ ] Resource limits appropriate
- [ ] Backup procedures tested
- [ ] Alert thresholds tuned
- [ ] On-call rotation established
- [ ] Runbooks documented
- [ ] Incident response procedures defined
- [ ] SLAs and SLOs defined
- [ ] Cost monitoring enabled

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [Kubernetes Monitoring](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-usage-monitoring/)
- [AWS EBS Storage](https://docs.aws.amazon.com/ebs/)
