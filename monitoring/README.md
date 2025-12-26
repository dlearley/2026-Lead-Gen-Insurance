# Monitoring Configuration

This directory contains configuration files for the Insurance Lead Gen platform monitoring stack.

## Structure

```
monitoring/
├── prometheus/              # Prometheus configuration
│   ├── prometheus.yml      # Main Prometheus config
│   └── alerts.yml          # Alert rules
├── grafana/                # Grafana configuration
│   ├── provisioning/       # Auto-provisioned config
│   │   ├── datasources/   # Data source definitions
│   │   └── dashboards/    # Dashboard providers
│   └── dashboards/        # Dashboard JSON files
├── loki/                   # Loki configuration
│   └── loki-config.yml    # Loki server config
├── promtail/              # Promtail configuration
│   └── promtail-config.yml # Log collection config
└── alertmanager/          # AlertManager configuration
    └── alertmanager.yml   # Alert routing config
```

## Services

### Prometheus (Port 9090)

Metrics collection and alerting engine.

**Configuration**: `prometheus/prometheus.yml`

**Key Settings**:
- Scrape interval: 15s
- Evaluation interval: 15s
- Retention: 30 days

**Targets**:
- Application services (API, Data Service, Orchestrator, Backend)
- Node Exporter (system metrics)
- PostgreSQL Exporter
- Redis Exporter
- Database services (Neo4j, Qdrant, NATS)

### Grafana (Port 3003)

Visualization and dashboarding platform.

**Default Credentials**: admin / admin

**Datasources**:
- Prometheus (default)
- Loki (logs)
- Jaeger (traces)

**Dashboards**:
- System Overview
- Lead Processing Metrics
- AI Model Performance
- Infrastructure Monitoring

### Loki (Port 3100)

Log aggregation system.

**Configuration**: `loki/loki-config.yml`

**Key Settings**:
- Retention: 30 days (720h)
- Ingestion rate limit: 10 MB/s
- Max query length: 30 days

### Promtail

Log shipper for Loki.

**Configuration**: `promtail/promtail-config.yml`

**Scrape Jobs**:
- API Service logs
- Data Service logs
- Orchestrator logs
- Backend (Python) logs
- System logs

### Jaeger (Port 16686)

Distributed tracing system.

**Ports**:
- 16686: Jaeger UI
- 14268: Collector HTTP
- 4317: OTLP gRPC
- 4318: OTLP HTTP

**Storage**: Badger (embedded)

### AlertManager (Port 9093)

Alert routing and management.

**Configuration**: `alertmanager/alertmanager.yml`

**Receivers**:
- Default webhook
- Critical alerts (Slack, Email, PagerDuty)
- Warning alerts (Slack)
- Team-specific alerts (Database, Dev, ML teams)

### Exporters

#### Node Exporter (Port 9100)
System metrics (CPU, memory, disk, network)

#### PostgreSQL Exporter (Port 9187)
PostgreSQL database metrics

#### Redis Exporter (Port 9121)
Redis cache metrics

## Quick Start

### Start All Monitoring Services

```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

### Start Specific Service

```bash
docker-compose -f docker-compose.monitoring.yml up -d prometheus
docker-compose -f docker-compose.monitoring.yml up -d grafana
```

### View Logs

```bash
docker-compose -f docker-compose.monitoring.yml logs -f prometheus
docker-compose -f docker-compose.monitoring.yml logs -f grafana
```

### Stop Monitoring Services

```bash
docker-compose -f docker-compose.monitoring.yml down
```

## Configuration Changes

### Reload Prometheus Configuration

```bash
curl -X POST http://localhost:9090/-/reload
```

Or restart the container:
```bash
docker-compose -f docker-compose.monitoring.yml restart prometheus
```

### Update Grafana Datasources

Datasources are auto-provisioned from `grafana/provisioning/datasources/`.
Changes take effect after Grafana restart.

### Modify Alert Rules

Edit `prometheus/alerts.yml` and reload Prometheus configuration.

### Update AlertManager Routes

Edit `alertmanager/alertmanager.yml` and restart AlertManager:
```bash
docker-compose -f docker-compose.monitoring.yml restart alertmanager
```

## Customization

### Adding New Scrape Targets

Edit `prometheus/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'my-new-service'
    static_configs:
      - targets: ['my-service:9999']
        labels:
          service: 'my-service'
    metrics_path: '/metrics'
```

### Creating New Alerts

Edit `prometheus/alerts.yml`:

```yaml
groups:
  - name: my_alerts
    interval: 30s
    rules:
      - alert: MyAlert
        expr: my_metric > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "My alert summary"
          description: "My alert description"
```

### Adding Grafana Dashboards

1. Create dashboard in Grafana UI
2. Export as JSON
3. Save to `grafana/dashboards/`
4. Restart Grafana

Or place JSON file directly in `grafana/dashboards/`.

### Configuring Notification Channels

Edit `alertmanager/alertmanager.yml`:

**Slack**:
```yaml
slack_configs:
  - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
    channel: '#alerts'
    title: 'Alert: {{ .GroupLabels.alertname }}'
```

**Email**:
```yaml
email_configs:
  - to: 'team@example.com'
    from: 'alerts@insurance-lead-gen.com'
    smarthost: 'smtp.gmail.com:587'
    auth_username: 'alerts@insurance-lead-gen.com'
    auth_password: 'your-app-password'
```

**PagerDuty**:
```yaml
pagerduty_configs:
  - routing_key: 'YOUR_PAGERDUTY_INTEGRATION_KEY'
```

## Environment Variables

Configure via `.env` file:

```bash
# Prometheus
PROMETHEUS_PORT=9090

# Grafana
GRAFANA_PORT=3003
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin

# Loki
LOKI_PORT=3100

# Jaeger
JAEGER_UI_PORT=16686
JAEGER_COLLECTOR_PORT=14268
JAEGER_OTLP_GRPC_PORT=4317
JAEGER_OTLP_HTTP_PORT=4318

# Exporters
NODE_EXPORTER_PORT=9100
POSTGRES_EXPORTER_PORT=9187
REDIS_EXPORTER_PORT=9121

# AlertManager
ALERTMANAGER_PORT=9093
```

## Troubleshooting

### Prometheus Can't Scrape Services

**Check target status**: http://localhost:9090/targets

**Verify service is running**:
```bash
curl http://localhost:3000/metrics
```

**Check Docker network**:
```bash
docker network inspect bridge
```

### Grafana Can't Connect to Datasources

**Check Prometheus URL**: Should be `http://prometheus:9090`

**Verify services are on same network**:
```bash
docker-compose -f docker-compose.monitoring.yml ps
```

**Check Grafana logs**:
```bash
docker logs insurance-lead-gen-grafana
```

### Loki Not Receiving Logs

**Check Promtail status**:
```bash
docker logs insurance-lead-gen-promtail
```

**Verify log paths exist**:
```bash
ls -la apps/api/logs/
ls -la apps/data-service/logs/
```

**Test Loki endpoint**:
```bash
curl http://localhost:3100/ready
```

### AlertManager Not Sending Alerts

**Check AlertManager status**:
http://localhost:9093

**View active alerts**:
http://localhost:9090/alerts

**Check AlertManager logs**:
```bash
docker logs insurance-lead-gen-alertmanager
```

## Data Persistence

Monitoring data is persisted in Docker volumes:

- `prometheus_data` - Prometheus time-series data
- `grafana_data` - Grafana dashboards and settings
- `loki_data` - Loki log data
- `jaeger_data` - Jaeger trace data
- `alertmanager_data` - AlertManager state

### Backup

```bash
# Backup all monitoring data
docker run --rm -v prometheus_data:/data -v $(pwd):/backup alpine tar czf /backup/prometheus-backup.tar.gz /data
docker run --rm -v grafana_data:/data -v $(pwd):/backup alpine tar czf /backup/grafana-backup.tar.gz /data
docker run --rm -v loki_data:/data -v $(pwd):/backup alpine tar czf /backup/loki-backup.tar.gz /data
```

### Restore

```bash
# Restore from backup
docker run --rm -v prometheus_data:/data -v $(pwd):/backup alpine tar xzf /backup/prometheus-backup.tar.gz -C /
```

## Production Recommendations

1. **Use external storage** for long-term data retention (S3, GCS, Azure Blob)
2. **Enable authentication** for all services
3. **Use TLS/SSL** for all endpoints
4. **Configure proper retention policies** based on requirements
5. **Set up alerting channels** (Slack, PagerDuty, Email)
6. **Regular backups** of configuration and data
7. **Monitor the monitoring** - Set up meta-monitoring
8. **Use recording rules** for expensive queries
9. **Implement proper RBAC** in Grafana
10. **Scale horizontally** for high-load environments

## Additional Resources

- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Grafana Tutorials](https://grafana.com/tutorials/)
- [Loki Best Practices](https://grafana.com/docs/loki/latest/best-practices/)
- [Jaeger Performance Tuning](https://www.jaegertracing.io/docs/latest/performance-tuning/)
