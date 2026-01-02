# Production Monitoring Stack

This directory contains Kubernetes manifests for deploying the production monitoring and observability stack for Insurance Lead Generation AI Platform.

## Components

- **Prometheus** - Metrics collection and alerting
- **Grafana** - Visualization and dashboards
- **Loki** - Log aggregation
- **Jaeger** - Distributed tracing
- **AlertManager** - Alert routing
- **Node Exporter** - System metrics

## Deployment

### Prerequisites

- Kubernetes 1.27+
- EKS cluster with gp3 storage class
- NGINX Ingress Controller
- Cert-Manager for TLS certificates

### Quick Deploy

```bash
kubectl apply -k .
```

### Verify Deployment

```bash
# Check pods
kubectl get pods -n monitoring

# Check services
kubectl get svc -n monitoring

# Check PVCs
kubectl get pvc -n monitoring
```

## Access

- Grafana: https://grafana.insurance-lead-gen.com
- Prometheus: https://prometheus.insurance-lead-gen.com
- AlertManager: https://alertmanager.insurance-lead-gen.com
- Jaeger: https://jaeger.insurance-lead-gen.com (if enabled)

## Configuration

### Prometheus

- Config: `prometheus/prometheus.yml`
- Alert Rules: `prometheus/alerts.yml`
- Storage: 100Gi
- Retention: 30 days

### Grafana

- Admin Credentials: Secret `grafana-admin-credentials`
- Datasources: Auto-provisioned
- Dashboards: Auto-provisioned
- Storage: 20Gi

### Loki

- Config: `loki/loki-config.yml`
- Storage: 50Gi
- Retention: 30 days
- Compaction: Enabled

### AlertManager

- Config: Secret `alertmanager-config`
- Storage: 5Gi
- Clustering: Enabled

## Troubleshooting

### Prometheus Not Scraping Targets

```bash
# Check targets
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Open http://localhost:9090/targets
```

### Grafana Can't Connect to Datasources

```bash
# Check datasources
kubectl get configmap grafana-datasources -n monitoring -o yaml

# Check logs
kubectl logs -n monitoring -l app.kubernetes.io/name=grafana -f
```

### Loki Not Receiving Logs

```bash
# Check Promtail logs
kubectl logs -n production -l app.kubernetes.io/name=promtail -f

# Check Loki logs
kubectl logs -n monitoring -l app.kubernetes.io/name=loki -f
```

## Maintenance

### Reload Prometheus

```bash
kubectl exec -n monitoring prometheus-0 -- \
  wget -qO- --post-data='' http://localhost:9090/-/reload
```

### Restart Grafana

```bash
kubectl rollout restart deployment/grafana -n monitoring
```

### Backup Data

```bash
# Prometheus
kubectl exec -n monitoring prometheus-0 -- \
  tar czf /tmp/prometheus-backup.tar.gz /prometheus
kubectl cp monitoring/prometheus-0:/tmp/prometheus-backup.tar.gz ./backups/

# Grafana
kubectl exec -n monitoring grafana-0 -- \
  tar czf /tmp/grafana-backup.tar.gz /var/lib/grafana
kubectl cp monitoring/grafana-0:/tmp/grafana-backup.tar.gz ./backups/
```

## Security

- NetworkPolicies restrict traffic to monitoring namespace
- RBAC configured for least privilege
- TLS certificates via Cert-Manager
- Secrets for sensitive configuration
- Encrypted EBS volumes

## Scaling

### Vertical Scaling

Edit resource limits in manifests or use Helm values.

### Horizontal Scaling

Prometheus does not support HA natively. Consider Thanos or Cortex for HA.

Grafana and Loki support HA with replica counts.

## Documentation

- **Full Setup Guide**: `docs/RUN_19.3_MONITORING_PROD_SETUP.md`
- **Quick Start**: `deploy/monitoring-prod-quickstart.md`
- **Deployment Script**: `deploy/scripts/deploy-monitoring.sh`
- **Summary**: `docs/RUN_19.3_SUMMARY.md`
