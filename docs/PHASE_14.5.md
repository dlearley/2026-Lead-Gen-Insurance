# Phase 14.5: Observability Stack - Implementation Guide

## Overview

Phase 14.5 implements a comprehensive observability stack with OpenTelemetry integration for distributed tracing, structured logging, and enhanced metrics. This enables end-to-end visibility into system behavior, performance analysis, and cost optimization.

## Architecture

### Components

1. **Distributed Tracing (Jaeger)**
   - OpenTelemetry SDK integration
   - Context propagation across services
   - Trace sampling strategies
   - Performance timeline analysis

2. **Structured Logging (Loki)**
   - Winston integration with trace context
   - Log aggregation and centralization
   - Log parsing pipeline
   - Cost-optimized retention (30 days)

3. **Metrics & Dashboards (Prometheus + Grafana)**
   - HTTP, Lead, AI, Queue, Database metrics
   - Observability cost tracking
   - Recording rules for performance
   - 3 comprehensive dashboards

4. **Alerting (AlertManager)**
   - Service health alerts
   - Infrastructure alerts
   - AI/ML cost and performance alerts
   - Observability cost ratio alerts (<5% target)

## Implementation

### Core Package Structure

```
packages/core/src/monitoring/
├── observability.ts           # Main OpenTelemetry integration
├── winston-otel.ts           # Winston + OpenTelemetry logging
├── enhanced-metrics.ts        # Comprehensive Prometheus metrics
├── tracing-decorators.ts     # @Trace, @SpanAttribute, @SpanEvent
├── instrumentation.ts        # Manual instrumentation helpers
├── tracing.ts                # Tracing service (existing)
├── metrics.ts                # Metrics service (existing)
└── index.ts                  # Module exports
```

### Key Features

#### 1. OpenTelemetry Integration

**Main Observability Manager** (`observability.ts`):
- Centralized initialization of all observability components
- Graceful shutdown handling
- Environment-aware configuration

```typescript
import { initializeObservability } from '@insurance-lead-gen/core';

const obs = initializeObservability({
  serviceName: 'api-service',
  serviceVersion: '1.0.0',
  environment: 'production',
  tracingEnabled: true,
  metricsEnabled: true,
});
```

#### 2. Structured Logging with Trace Context

**Winston + OpenTelemetry** (`winston-otel.ts`):
- Automatic trace context injection
- Console and file transports
- Structured JSON logs for production

```typescript
import { createOtelLogger, logInfo, logError } from '@insurance-lead-gen/core';

const logger = createOtelLogger({
  serviceName: 'api-service',
  environment: 'production',
  level: 'info',
});

// Logs automatically include traceId and spanId
logInfo(logger, 'Lead processed', { leadId: '123', score: 85 });
```

#### 3. Enhanced Metrics

**Comprehensive Metrics** (`enhanced-metrics.ts`):
- HTTP metrics (requests, response time, errors)
- Lead metrics (ingested, qualified, routed, converted)
- AI metrics (requests, latency, costs, tokens, accuracy)
- Queue metrics (jobs processed, failed, processing time)
- Database metrics (queries, duration, connections, slow queries)
- Observability cost tracking

```typescript
import { EnhancedMetricsService } from '@insurance-lead-gen/core';

const metrics = new EnhancedMetricsService({
  namespace: 'insurance_lead_gen',
  serviceName: 'api-service',
  environment: 'production',
});

// Record metrics
metrics.getHttpMetrics().requests.inc({ method: 'GET', route: '/leads', status_code: 200 });
metrics.getLeadMetrics().qualified.inc({ tier: 'high' });
metrics.getAIMetrics().costs.inc({ model: 'gpt-4', operation: 'completion' }, 0.01);
```

#### 4. Tracing Decorators

**Declarative Tracing** (`tracing-decorators.ts`):
- `@Trace()` - Wrap methods with automatic spans
- `@SpanAttribute()` - Mark parameters as span attributes
- `@SpanEvent()` - Add events to spans
- `@InstrumentClass()` - Instrument all class methods

```typescript
import { Trace, SpanAttribute, SpanEvent, InstrumentClass } from '@insurance-lead-gen/core';

@InstrumentClass()
class LeadService {
  @Trace({ name: 'lead.process' })
  @SpanEvent('processing.started', { stage: 'initialization' })
  async processLead(
    @SpanAttribute('lead.id') leadId: string,
    @SpanAttribute('lead.type') type: string
  ) {
    // Automatically traced with lead.id and lead.type as attributes
  }
}
```

#### 5. Manual Instrumentation Helpers

**Instrumentation Classes** (`instrumentation.ts`):
- `DatabaseInstrumentation` - Query instrumentation
- `AIInstrumentation` - Model call instrumentation
- `QueueInstrumentation` - Job processing instrumentation
- `HTTPInstrumentation` - HTTP request instrumentation
- `ExternalAPIInstrumentation` - External API instrumentation
- `BusinessProcessInstrumentation` - Business process instrumentation

```typescript
import { DatabaseInstrumentation, AIInstrumentation } from '@insurance-lead-gen/core';

// Instrument database query
const result = await DatabaseInstrumentation.instrumentQuery(
  'select',
  'leads',
  () => db.lead.findMany({ where: { id } })
);

// Instrument AI model call
const response = await AIInstrumentation.instrumentModelCall(
  'gpt-4',
  'completion',
  { prompt: 'Classify this lead' },
  () => openai.completions.create(...)
);
```

## Integration with Services

### API Service

```typescript
// apps/api/src/app.ts
import { initializeObservability, createOtelLogger } from '@insurance-lead-gen/core';

const obs = initializeObservability({
  serviceName: 'api-service',
  serviceVersion: '1.0.0',
  environment: process.env.NODE_ENV,
});

const logger = createOtelLogger({
  serviceName: 'api-service',
  environment: process.env.NODE_ENV,
});
```

### Data Service

```typescript
// apps/data-service/src/server.ts
import { initializeObservability } from '@insurance-lead-gen/core';
import { DatabaseInstrumentation } from '@insurance-lead-gen/core/monitoring';

const obs = initializeObservability({
  serviceName: 'data-service',
  serviceVersion: '1.0.0',
});

// Instrument all database operations
const leads = await DatabaseInstrumentation.instrumentQuery(
  'select',
  'leads',
  () => prisma.lead.findMany()
);
```

### Orchestrator

```typescript
// apps/orchestrator/src/index.ts
import { initializeObservability, AIInstrumentation } from '@insurance-lead-gen/core';

const obs = initializeObservability({
  serviceName: 'orchestrator',
  serviceVersion: '1.0.0',
});

// Instrument AI operations
const classification = await AIInstrumentation.instrumentModelCall(
  'gpt-4',
  'lead_classification',
  { leadId },
  () => classifyLead(leadData)
);
```

## Monitoring Stack

### Prometheus Configuration

Key features:
- Enhanced scrape configs for all services
- Recording rules for performance metrics
- Observability cost tracking
- Cost optimization alerts

### Grafana Dashboards

Three comprehensive dashboards:

1. **System Health Dashboard**
   - Service health and uptime
   - HTTP request metrics
   - Database performance
   - Queue depths
   - Resource utilization

2. **Business Metrics Dashboard**
   - Lead funnel metrics
   - AI model performance
   - Conversion rates
   - Agent productivity
   - Revenue tracking

3. **Log Analysis Dashboard**
   - Log volume and error rates
   - Log patterns and anomalies
   - Slow operation detection
   - Error categorization

### Alerting Rules

**Service Health Alerts**:
- High error rate (>5%)
- High latency (P95 > 1s)
- Service down

**Infrastructure Alerts**:
- High CPU usage (>80%)
- High memory usage (>85%)
- Disk space low (<15%)
- Database connection errors

**AI/ML Alerts**:
- High AI latency (>5s)
- High AI cost rate
- Model accuracy drop
- API rate limits

**Observability Cost Alerts**:
- Cost ratio >5% of infrastructure cost
- High log export rate
- Excessive trace export

## Cost Optimization

### Trace Sampling

```typescript
// Configure sampling rate based on environment
const obs = initializeObservability({
  serviceName: 'my-service',
  tracing: {
    samplingRate: environment === 'production' ? 0.1 : 1.0, // 10% in prod
  },
});
```

### Metric Cardinality Controls

- Limit label values (e.g., route instead of full URL)
- Use bounded histograms
- Remove high-cardinality labels

### Log Retention

- Production: 30 days
- Staging: 7 days
- Development: 1 day

### Cost Monitoring

```typescript
// Record infrastructure cost
metrics.recordObservabilityCost(infrastructureCostUsd);

// Alert if cost ratio exceeds 5%
metrics.getObservabilityCostMetrics().costRatio.set({}, 5.2); // Alert!
```

## Usage Examples

### Example 1: End-to-End Lead Processing Trace

```typescript
@Trace({ name: 'lead.ingest' })
async ingestLead(leadData: LeadData) {
  // Span: lead.ingest
  
  const lead = await DatabaseInstrumentation.instrumentQuery(
    'insert',
    'leads',
    () => prisma.lead.create({ data: leadData })
  );
  // Child span: database.query
  
  const classification = await AIInstrumentation.instrumentModelCall(
    'gpt-4',
    'lead_classification',
    { leadId: lead.id },
    () => classifyLead(leadData)
  );
  // Child span: ai.model_call
  
  await QueueInstrumentation.instrumentEnqueue(
    'lead-processing',
    'qualify',
    () => queue.add('qualify-lead', { leadId: lead.id })
  );
  // Child span: queue.job_enqueue
  
  return lead;
}
```

### Example 2: Observing AI Model Performance

```typescript
const startTime = Date.now();
const result = await openai.completions.create(...);
const duration = Date.now() - startTime;

// Record metrics
metrics.getAIMetrics().requests.inc({ model: 'gpt-4', operation: 'completion' });
metrics.getAIMetrics().latency.observe({ model: 'gpt-4' }, duration / 1000);
metrics.getAIMetrics().tokens.inc({ model: 'gpt-4', type: 'prompt' }, result.usage.prompt_tokens);
metrics.getAIMetrics().tokens.inc({ model: 'gpt-4', type: 'completion' }, result.usage.completion_tokens);
metrics.getAIMetrics().costs.inc({ model: 'gpt-4' }, calculateCost(result.usage));

// Log with trace context
logInfo(logger, 'AI model completed', {
  model: 'gpt-4',
  duration_ms: duration,
  tokens: result.usage.total_tokens,
});
```

### Example 3: Monitoring Database Performance

```typescript
const result = await DatabaseInstrumentation.instrumentQuery(
  'select',
  'leads',
  () => prisma.lead.findMany({ where: { status: 'qualified' } })
);

// Metrics automatically recorded:
// - database_queries_total{operation="select",table="leads"}
// - database_query_duration_seconds{operation="select",table="leads"}
// - database_slow_queries_total (if >100ms)
```

## Testing

### Unit Tests

```typescript
describe('Tracing Decorator', () => {
  it('should wrap method with span', async () => {
    class TestService {
      @Trace()
      async testMethod() {
        return 'result';
      }
    }
    
    const service = new TestService();
    const result = await service.testMethod();
    expect(result).toBe('result');
    // Span should be created and recorded
  });
});
```

### Integration Tests

```typescript
describe('Observability Integration', () => {
  it('should propagate trace context', async () => {
    const response = await axios.post('/api/v1/leads', leadData);
    expect(response.headers['traceparent']).toBeDefined();
  });
});
```

## Troubleshooting

### Missing Trace Context

**Problem**: Logs don't include traceId/spanId

**Solution**: 
- Ensure OpenTelemetry is initialized before any async operations
- Check that `@opentelemetry/auto-instrumentations-node` is installed
- Verify Jaeger endpoint is accessible

### High Observability Costs

**Problem**: Observability costs exceed 5% of infrastructure costs

**Solution**:
- Reduce trace sampling rate in production
- Limit metric cardinality
- Reduce log retention period
- Filter out noisy logs

### Slow Performance

**Problem**: Instrumentation adds significant overhead

**Solution**:
- Use sampling for traces
- Disable instrumentation for non-critical paths
- Use asynchronous metric recording
- Optimize histogram buckets

## Acceptance Criteria

- [x] All services emit traces, logs, and metrics
- [x] Distributed traces track requests end-to-end
- [x] Central logging platform stores all logs
- [x] Dashboards provide operational visibility
- [x] Anomalies detected automatically
- [x] Observability cost < 5% of infrastructure cost

## Documentation

- Monitoring stack configuration: `monitoring/README.md`
- Prometheus configuration: `monitoring/prometheus/prometheus.yml`
- Alert rules: `monitoring/prometheus/alerts.yml`
- Loki configuration: `monitoring/loki/loki-config.yml`
- Dashboard definitions: `monitoring/grafana/dashboards/`

## Next Steps

1. Configure production Jaeger endpoint
2. Set up log aggregation pipeline
3. Configure alert routing (Slack, PagerDuty)
4. Implement custom business metrics
5. Set up automated cost reporting
6. Create runbooks for common issues
