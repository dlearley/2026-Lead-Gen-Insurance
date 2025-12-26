# Monitoring & Observability Guide

## Overview

The Insurance Lead Gen platform implements comprehensive monitoring and observability using industry-standard tools:

- **Prometheus** - Metrics collection and alerting
- **Grafana** - Visualization and dashboards
- **Loki** - Log aggregation
- **Jaeger** - Distributed tracing
- **AlertManager** - Alert routing and management

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Services                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   API    │  │   Data   │  │Orchestr. │  │ Backend  │   │
│  │ Service  │  │ Service  │  │ Service  │  │ (Python) │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │ /metrics    │ /metrics    │ /metrics    │ /metrics │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
┌───────────────────────────────────────────────────────────┐
│                      Prometheus                            │
│              (Scrapes metrics every 15s)                   │
└───────────────┬───────────────────────────────────────────┘
                │
        ┌───────┴────────┐
        ▼                ▼
┌──────────────┐  ┌──────────────┐
│   Grafana    │  │ AlertManager │
│  Dashboards  │  │   Alerts     │
└──────────────┘  └──────────────┘

┌───────────────────────────────────────────────────────────┐
│                    Log Collection                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ App Logs │──│ Promtail │──│   Loki   │──┐            │
│  └──────────┘  └──────────┘  └──────────┘  │            │
└─────────────────────────────────────────────┼────────────┘
                                              │
                                              ▼
                                        ┌──────────┐
                                        │ Grafana  │
                                        │   Logs   │
                                        └──────────┘

┌───────────────────────────────────────────────────────────┐
│                 Distributed Tracing                        │
│  ┌──────────────────────────────────────────────────┐    │
│  │     OpenTelemetry Auto-Instrumentation           │    │
│  └──────────────┬───────────────────────────────────┘    │
│                 │                                          │
│                 ▼                                          │
│         ┌───────────────┐                                 │
│         │    Jaeger     │                                 │
│         │ (All-in-One)  │                                 │
│         └───────────────┘                                 │
└───────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Start Monitoring Stack

```bash
# Start all monitoring services
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# Or start monitoring services only
docker-compose -f docker-compose.monitoring.yml up -d
```

### 2. Access Dashboards

| Service | URL | Default Credentials |
|---------|-----|---------------------|
| Grafana | http://localhost:3003 | admin / admin |
| Prometheus | http://localhost:9090 | - |
| AlertManager | http://localhost:9093 | - |
| Jaeger UI | http://localhost:16686 | - |
| Loki | http://localhost:3100 | - |

### 3. View Metrics

Each service exposes metrics at `/metrics`:

```bash
# API Service metrics
curl http://localhost:3000/metrics

# Data Service metrics
curl http://localhost:3001/metrics

# Orchestrator metrics
curl http://localhost:3002/metrics

# Backend (Python) metrics
curl http://localhost:8000/metrics
```

## Metrics

### Standard HTTP Metrics

All services expose these standard metrics:

- `http_requests_total` - Total HTTP requests by method, path, status
- `http_request_duration_seconds` - Request duration histogram
- `http_requests_in_progress` - Current in-progress requests

### Business Metrics

#### Lead Processing

- `leads_processed_total` - Total leads processed by status and source
- `leads_queue_depth` - Current queue depth
- `lead_processing_duration_seconds` - Time to process a lead
- `lead_scoring_duration_seconds` - Time to score a lead with AI

#### AI Model Metrics

- `ai_model_calls_total` - Total AI API calls by model
- `ai_model_latency_seconds` - AI model response time
- `ai_model_errors_total` - AI model errors by type
- `ai_api_cost_total` - Total AI API costs in USD

#### Database Metrics

- `pg_stat_activity_count` - PostgreSQL active connections
- `redis_db_keys` - Redis key count
- `redis_memory_used_bytes` - Redis memory usage

### System Metrics

- `node_cpu_seconds_total` - CPU usage
- `node_memory_MemTotal_bytes` - Total memory
- `node_memory_MemAvailable_bytes` - Available memory
- `node_filesystem_size_bytes` - Disk size
- `node_filesystem_avail_bytes` - Available disk space

## Alerts

### Configured Alerts

#### Critical Alerts (1-minute threshold)

- **ServiceDown** - Service is unreachable
- **PostgresDown** - PostgreSQL database is down
- **RedisDown** - Redis cache is down

#### Warning Alerts (5-minute threshold)

- **HighCPUUsage** - CPU usage > 80%
- **HighMemoryUsage** - Memory usage > 85%
- **HighDiskUsage** - Disk usage > 85%
- **HighAPIErrorRate** - API error rate > 5%
- **SlowAPIResponseTime** - P95 latency > 2 seconds
- **HighQueueDepth** - Queue depth > 1000
- **HighAIModelLatency** - AI model latency > 5 seconds
- **HighAIAPICost** - AI API cost > $10/hour

### Alert Configuration

Alerts are defined in:
- `monitoring/prometheus/alerts.yml` - Alert rules
- `monitoring/alertmanager/alertmanager.yml` - Alert routing

### Notification Channels

Configure notification channels in `monitoring/alertmanager/alertmanager.yml`:

```yaml
# Slack
slack_configs:
  - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
    channel: '#alerts'

# Email
email_configs:
  - to: 'oncall@insurance-lead-gen.com'

# PagerDuty
pagerduty_configs:
  - routing_key: 'YOUR_PAGERDUTY_INTEGRATION_KEY'
```

## Dashboards

### Pre-configured Grafana Dashboards

1. **System Overview** - High-level system health
   - Service status
   - Request rates
   - Error rates
   - Response times
   - Resource usage

2. **Lead Processing** - Business metrics
   - Lead processing rate
   - Queue depths
   - Processing times
   - Success/failure rates

3. **AI Models** - AI/ML performance
   - Model latency
   - API costs
   - Error rates
   - Usage patterns

4. **Infrastructure** - System resources
   - CPU usage
   - Memory usage
   - Disk usage
   - Network I/O
   - Database connections

### Creating Custom Dashboards

1. Log into Grafana (http://localhost:3003)
2. Click "+" → "Dashboard"
3. Add Panel
4. Select Prometheus data source
5. Write PromQL query
6. Configure visualization
7. Save dashboard

## Distributed Tracing

### OpenTelemetry Integration

All TypeScript services use OpenTelemetry for automatic instrumentation:

```typescript
import { initializeTracing } from '@insurance-lead-gen/core';

// Initialize tracing
const tracing = initializeTracing({
  serviceName: 'api-service',
  serviceVersion: '1.0.0',
  jaegerEndpoint: 'http://localhost:14268/api/traces'
});

// Traces are automatically captured for:
// - HTTP requests/responses
// - Database queries
// - External API calls
// - Message queue operations
```

### Manual Span Creation

For custom tracing:

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('my-service');

async function processLead(leadId: string) {
  return await tracer.startActiveSpan('processLead', async (span) => {
    span.setAttribute('lead.id', leadId);
    
    try {
      // Your code here
      const result = await doWork();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ 
        code: SpanStatusCode.ERROR,
        message: error.message 
      });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### Viewing Traces

1. Open Jaeger UI: http://localhost:16686
2. Select service from dropdown
3. Click "Find Traces"
4. Click on a trace to view span details

## Log Aggregation

### Loki Configuration

Logs are collected by Promtail and stored in Loki:

- **Retention**: 30 days
- **Labels**: job, service, level
- **Format**: JSON with timestamp, level, message

### Viewing Logs in Grafana

1. Open Grafana
2. Click "Explore"
3. Select "Loki" data source
4. Use LogQL queries:

```logql
# All logs from API service
{service="api"}

# Error logs only
{service="api"} |= "ERROR"

# Logs from last hour with specific text
{service="data-service"} |= "lead processing" [1h]

# Rate of errors per minute
rate({level="error"}[1m])
```

## Best Practices

### Metric Labels

- Keep cardinality low (< 10 values per label)
- Use consistent label names across services
- Avoid user IDs or timestamps as labels

### Alerting

- Set appropriate thresholds based on baseline
- Use `for` duration to avoid alert flapping
- Group related alerts
- Include runbook links in alert annotations

### Dashboard Design

- Start with high-level overview
- Drill down to specific services
- Use consistent time ranges
- Add descriptions to panels

### Tracing

- Sample in production (e.g., 10% of requests)
- Add custom attributes for business context
- Trace critical paths (lead processing, AI scoring)

## Troubleshooting

### Metrics Not Appearing

```bash
# Check if service is exposing metrics
curl http://localhost:3000/metrics

# Check Prometheus targets
# Go to: http://localhost:9090/targets

# Check Prometheus logs
docker logs insurance-lead-gen-prometheus
```

### Alerts Not Firing

```bash
# Check alert rules
# Go to: http://localhost:9090/alerts

# Check AlertManager
# Go to: http://localhost:9093

# Test alert rule manually
curl -X POST http://localhost:9090/-/reload
```

### Missing Traces

```bash
# Check Jaeger collector
docker logs insurance-lead-gen-jaeger

# Verify OTLP endpoint
curl http://localhost:14268/api/traces

# Check service configuration
echo $JAEGER_ENDPOINT
```

### High Cardinality

If Prometheus is using too much memory:

1. Identify high-cardinality metrics:
   ```promql
   topk(10, count by (__name__)({__name__=~".+"}))
   ```

2. Reduce label cardinality
3. Increase retention time
4. Use recording rules for expensive queries

## Production Considerations

### Scaling

- Use Prometheus federation for multiple clusters
- Consider Thanos or Cortex for long-term storage
- Use Grafana Loki with object storage (S3, GCS)
- Deploy Jaeger with Elasticsearch or Cassandra backend

### Security

- Enable authentication for Grafana
- Restrict Prometheus and AlertManager access
- Use TLS for metric endpoints
- Encrypt data at rest

### Retention

- Prometheus: 30 days default (adjust in docker-compose)
- Loki: 30 days default (adjust in loki-config.yml)
- Jaeger: 7 days default (adjust with environment variables)

### Backup

- Prometheus: Backup `/prometheus` volume
- Grafana: Export dashboards as JSON
- Loki: Backup `/loki` volume
- AlertManager: Backup config files

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
