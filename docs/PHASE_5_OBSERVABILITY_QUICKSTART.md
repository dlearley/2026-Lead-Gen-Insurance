# Phase 5: Observability & Operations - Quick Start Guide

**Phase**: 5 - Observability & Operations  
**Status**: ✅ COMPLETED

## 🚀 Quick Start

Get observability up and running in your service in 5 minutes.

## 📋 Prerequisites

- Service running with Express app
- Database connection (optional, for full health checks)
- Redis connection (optional, for full health checks)

## ⚡ Step 1: Add Observability to Your Service

### Basic Setup (No Dependencies)

```typescript
import express from 'express';
import { initializeServiceObservability } from '@insurance-lead-gen/core';

const app = express();

// Initialize observability
const { observability, metrics, logger } = initializeServiceObservability({
  serviceName: 'my-service',
  serviceVersion: '1.0.0',
  app,
  enableTracing: true,
  enableMetrics: true,
  enableHealthChecks: true,
});

// Use structured logger
logger.info('Service started', { port: 3000 });

// Your routes here...

// Start server
app.listen(3000);
```

### Full Setup (With Health Checks)

```typescript
import express from 'express';
import { 
  initializeServiceObservability,
  setupGracefulShutdown,
  DatabaseManager 
} from '@insurance-lead-gen/core';
import { createRedisConnection } from './redis';

const app = express();
const databaseManager = new DatabaseManager();
const redisClient = createRedisConnection();

// Initialize observability with full health checks
const { observability, health, metrics, logger } = initializeServiceObservability({
  serviceName: 'my-service',
  serviceVersion: '1.0.0',
  environment: process.env.NODE_ENV,
  app,
  databaseManager,
  redisClient,
  enableTracing: true,
  enableMetrics: true,
  enableHealthChecks: true,
});

// Setup graceful shutdown
setupGracefulShutdown(observability, async () => {
  await server.close();
  await databaseManager.disconnect();
  await redisClient.quit();
});

// Start server
const server = app.listen(3000);
```

## 🏥 Step 2: Verify Health Checks

Your service now has these endpoints:

```bash
# Liveness probe (is the service running?)
curl http://localhost:3000/health/live
curl http://localhost:3000/livez

# Readiness probe (is the service ready for traffic?)
curl http://localhost:3000/health/ready
curl http://localhost:3000/readyz

# Full health check (includes dependencies)
curl http://localhost:3000/health
curl http://localhost:3000/healthz

# Health summary (statistics)
curl http://localhost:3000/health/summary?minutes=60
```

**Example Response**:

```json
{
  "status": "healthy",
  "timestamp": "2025-01-16T12:00:00.000Z",
  "service": "my-service",
  "version": "1.0.0",
  "dependencies": [
    {
      "name": "database",
      "status": "healthy",
      "responseTime": 15,
      "lastCheck": "2025-01-16T12:00:00.000Z"
    },
    {
      "name": "redis",
      "status": "healthy",
      "responseTime": 5,
      "lastCheck": "2025-01-16T12:00:00.000Z"
    }
  ],
  "responseTime": 25
}
```

## 📊 Step 3: View Metrics

```bash
# Prometheus metrics endpoint
curl http://localhost:3000/metrics
```

**Key Metrics Available**:

- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request duration
- `http_requests_in_progress` - Current requests
- `leads_processed_total` - Leads processed (if using business metrics)
- `ai_model_calls_total` - AI API calls (if using AI metrics)

## 🔍 Step 4: Add Custom Business Metrics

```typescript
import { LeadMetrics, AIMetrics } from '@insurance-lead-gen/core';
import { register } from 'prom-client';

// Initialize business metrics
const leadMetrics = new LeadMetrics(register, 'my-service');
const aiMetrics = new AIMetrics(register, 'my-service');

// Record lead processing
leadMetrics.recordLeadProcessed('success', 'web', 'my-service');
leadMetrics.recordProcessingDuration('success', 'my-service', 1.5);

// Record AI model usage
aiMetrics.recordModelCall('gpt-4', 'success', 'my-service');
aiMetrics.recordModelLatency('gpt-4', 'my-service', 2.3);
aiMetrics.recordAPICost('gpt-4', 'my-service', 0.05);
```

## 🔭 Step 5: Add Custom Tracing

```typescript
// Get tracing service
const tracing = observability.getTracing();

// Create custom spans
await tracing?.withSpan('processLead', async (span) => {
  span.setAttribute('lead.id', leadId);
  span.setAttribute('lead.source', 'web');
  
  // Your processing logic
  const result = await processLead(leadId);
  
  return result;
});
```

## 📱 Step 6: Add Operations Dashboard (Optional)

```typescript
import { OperationsDashboard, OperationalExcellenceManager } from '@insurance-lead-gen/core';

// Initialize operational excellence manager
const opManager = new OperationalExcellenceManager();

// Create operations dashboard
const dashboard = new OperationsDashboard({
  serviceName: 'my-service',
  healthService: health,
  operationalManager: opManager,
});

// Mount dashboard
app.use('/api/v1/operations', dashboard.getRouter());
```

**Dashboard Endpoints**:

```bash
# Dashboard overview
curl http://localhost:3000/api/v1/operations/dashboard

# SLO metrics
curl http://localhost:3000/api/v1/operations/slos

# Active incidents
curl http://localhost:3000/api/v1/operations/incidents/active

# Runbooks
curl http://localhost:3000/api/v1/operations/runbooks

# Operational insights
curl http://localhost:3000/api/v1/operations/insights

# Active alerts
curl http://localhost:3000/api/v1/operations/alerts
```

## 🐳 Step 7: Configure Kubernetes Probes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: my-service
        image: my-service:latest
        ports:
        - containerPort: 3000
        
        # Liveness probe
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        # Readiness probe
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        
        env:
        - name: SERVICE_NAME
          value: "my-service"
        - name: NODE_ENV
          value: "production"
        - name: JAEGER_ENDPOINT
          value: "http://jaeger:14268/api/traces"
```

## 📈 Step 8: Configure Prometheus Scraping

```yaml
# prometheus-config.yml
scrape_configs:
  - job_name: 'my-service'
    static_configs:
      - targets: ['my-service:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

## 🎯 Step 9: View Traces in Jaeger

1. Open Jaeger UI: `http://localhost:16686`
2. Select service from dropdown: `my-service`
3. Click "Find Traces"
4. Click on a trace to see the span details

## 📊 Step 10: Create Grafana Dashboard

**Import Pre-built Dashboard**:

1. Open Grafana: `http://localhost:3003`
2. Login (admin/admin)
3. Navigate to Dashboards → Import
4. Use dashboard ID from `monitoring/grafana/dashboards/`

**Create Custom Panel**:

```
Panel Title: Request Rate
Query: rate(http_requests_total{service="my-service"}[5m])
Visualization: Graph
```

```
Panel Title: P95 Latency
Query: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service="my-service"}[5m]))
Visualization: Graph
```

## 🧪 Testing Observability

### Test Health Checks

```bash
# Test liveness
curl -i http://localhost:3000/health/live

# Test readiness
curl -i http://localhost:3000/health/ready

# Test full health
curl -i http://localhost:3000/health
```

### Test Metrics Collection

```bash
# Generate some traffic
for i in {1..100}; do
  curl http://localhost:3000/api/v1/leads
done

# Check metrics
curl http://localhost:3000/metrics | grep http_requests_total
```

### Test Tracing

```bash
# Make a request
curl -v http://localhost:3000/api/v1/leads

# Find the trace ID in response headers
# Look for: trace-id: 1234567890abcdef

# View in Jaeger
# http://localhost:16686/trace/1234567890abcdef
```

## ⚙️ Environment Variables

```bash
# Service Info
SERVICE_NAME=my-service
VERSION=1.0.0
NODE_ENV=production

# Logging
LOG_LEVEL=info

# Tracing
JAEGER_ENDPOINT=http://jaeger:14268/api/traces

# Monitoring
ENABLE_TRACING=true
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true
```

## 📚 Common Patterns

### Pattern 1: Service with Full Observability

```typescript
import express from 'express';
import { initializeServiceObservability, setupGracefulShutdown } from '@insurance-lead-gen/core';

const app = express();
const { observability, health, metrics, logger } = initializeServiceObservability({
  serviceName: 'my-service',
  app,
  databaseManager,
  redisClient,
});

app.get('/api/data', async (req, res) => {
  logger.info('Fetching data', { userId: req.userId });
  const data = await getData();
  res.json(data);
});

const server = app.listen(3000);
setupGracefulShutdown(observability, async () => {
  await server.close();
});
```

### Pattern 2: Custom Metrics for Business Logic

```typescript
import { Counter, Histogram } from 'prom-client';

const orderCounter = metrics.createCounter('orders_total', 'Total orders', ['status']);
const orderValue = metrics.createHistogram('order_value_usd', 'Order value', ['product']);

// Use in your code
orderCounter.labels('completed').inc();
orderValue.labels('insurance-policy').observe(1250.50);
```

### Pattern 3: Structured Logging with Context

```typescript
// Add request ID to all logs
app.use((req, res, next) => {
  req.id = generateId();
  next();
});

// Log with context
app.get('/api/leads/:id', async (req, res) => {
  logger.info('Fetching lead', {
    requestId: req.id,
    leadId: req.params.id,
    userId: req.user?.id,
  });
  
  try {
    const lead = await getLead(req.params.id);
    res.json(lead);
  } catch (error) {
    logger.error('Failed to fetch lead', {
      requestId: req.id,
      leadId: req.params.id,
      error: error.message,
    });
    res.status(500).json({ error: 'Internal error' });
  }
});
```

## 🔍 Troubleshooting

### Metrics Not Appearing

```bash
# Check if metrics endpoint is accessible
curl http://localhost:3000/metrics

# Check Prometheus configuration
curl http://localhost:9090/targets

# Check Prometheus logs
docker logs prometheus
```

### Traces Not Showing in Jaeger

```bash
# Check Jaeger is running
curl http://localhost:16686

# Check JAEGER_ENDPOINT env var
echo $JAEGER_ENDPOINT

# Check service logs for tracing errors
docker logs my-service | grep -i tracing
```

### Health Checks Failing

```bash
# Check dependencies manually
curl http://localhost:5432  # PostgreSQL
curl http://localhost:6379  # Redis

# Check health check logs
curl http://localhost:3000/health | jq

# Check service logs
docker logs my-service | grep -i health
```

## 📖 Additional Resources

- [Full Phase 5 Documentation](./PHASE_5_OBSERVABILITY_OPERATIONS.md)
- [Monitoring Guide](./MONITORING.md)
- [OpenTelemetry Docs](https://opentelemetry.io/docs/)
- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Docs](https://grafana.com/docs/)
- [Jaeger Docs](https://www.jaegertracing.io/docs/)

## ✅ Verification Checklist

- [ ] Health check endpoints respond correctly
- [ ] Metrics are exposed at `/metrics`
- [ ] Traces appear in Jaeger UI
- [ ] Prometheus scrapes metrics successfully
- [ ] Grafana dashboards show data
- [ ] Kubernetes probes configured (if using K8s)
- [ ] Graceful shutdown works
- [ ] Structured logging includes trace IDs

## 🎉 You're Done!

Your service now has enterprise-grade observability! Monitor your service health, track performance metrics, trace requests, and respond to incidents effectively.

---

**Generated**: January 2025  
**Phase**: 5 - Observability & Operations
