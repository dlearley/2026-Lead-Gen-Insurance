# Data Service - Services

This directory contains core service implementations for data service, including reporting, alerting, and integration functionality.

## Services

### ReportGenerator

Generates reports based on data from the database. Supports multiple report types:

- Lead funnel analytics
- Agent performance metrics
- AI model metrics
- System health reports
- Lead volume analysis
- Conversion summaries

**Usage:**
```typescript
import { ReportGenerator } from './report-generator.js';

const generator = new ReportGenerator();
const report = await generator.generateReport('lead_funnel', {
  dateFrom: new Date('2024-01-01'),
  dateTo: new Date('2024-12-31')
});
```

### ReportExporter

Exports report data to various formats (JSON, CSV, PDF/HTML).

**Usage:**
```typescript
import { ReportExporter } from './report-exporter.js';

const exporter = new ReportExporter();
const buffer = await exporter.export(reportData, 'csv');
```

### ReportScheduler

Manages scheduled report generation and execution.

**Usage:**
```typescript
import { ReportScheduler } from './report-scheduler.js';

const scheduler = new ReportScheduler('./reports');

scheduler.addReportConfig({
  id: 'weekly-leads',
  name: 'Weekly Lead Report',
  type: 'lead_volume',
  format: 'pdf',
  schedule: 'weekly',
  enabled: true,
  // ... other config
});

// Generate on-demand
const generation = await scheduler.generateReport('weekly-leads');
```

### AlertService

Monitors metrics and triggers alerts based on configured rules.

**Usage:**
```typescript
import { AlertService } from './alert-service.js';

const alertService = new AlertService();

// Check metrics and get triggered alerts
const alerts = await alertService.checkMetrics();

// Add custom rule
alertService.addRule({
  id: 'custom-rule',
  name: 'High Volume Alert',
  metric: 'lead_volume_per_hour',
  condition: {
    operator: 'gt',
    threshold: 100
  },
  severity: 'warning',
  // ... other config
});
```

### ApiClientService

Generic HTTP client for external API integrations with retry logic and error handling.

**Usage:**
```typescript
import { ApiClientService } from './api-client.service.js';

const apiClient = new ApiClientService();

// GET request
const result = await apiClient.get('https://api.example.com/data');

// POST request
const result = await apiClient.post('https://api.example.com/leads', {
  firstName: 'John',
  lastName: 'Doe'
});
```

### CarrierIntegrationService

Manages insurance carrier integrations, lead submissions, and quote requests.

**Usage:**
```typescript
import { CarrierIntegrationService } from './carrier-integration.service.js';

const carrierService = new CarrierIntegrationService();

// Create carrier
const carrier = await carrierService.createCarrier({
  name: 'Acme Insurance',
  code: 'ACME',
  supportedProducts: ['AUTO', 'HOME'],
  apiEndpoint: 'https://api.acme.com/v1',
  apiKey: 'your-api-key'
});

// Submit lead to carrier
const result = await carrierService.submitLead({
  leadId: 'lead-uuid',
  carrierId: carrier.id,
  submissionData: { /* lead data */ }
});

// Get carrier health
const health = await carrierService.getCarrierHealth(carrier.id);
```

### BrokerIntegrationService

Manages broker integrations and lead submissions to broker systems.

**Usage:**
```typescript
import { BrokerIntegrationService } from './broker-integration.service.js';

const brokerService = new BrokerIntegrationService();

// Create broker
const broker = await brokerService.createBroker({
  name: 'ABC Brokerage',
  code: 'ABC',
  carrierId: 'carrier-id',
  apiKey: 'broker-api-key'
});

// Submit lead to broker
const result = await brokerService.submitLead({
  leadId: 'lead-uuid',
  brokerId: broker.id,
  submissionData: { /* lead data */ }
});

// Get broker health
const health = await brokerService.getBrokerHealth(broker.id);
```

### IntegrationConfigService

Manages integration configurations for carriers and brokers.

**Usage:**
```typescript
import { IntegrationConfigService } from './integration-config.service.js';

const configService = new IntegrationConfigService();

// Get configuration template
const template = configService.getConfigTemplate('API_ENDPOINTS');

// Create configuration
const config = await configService.createConfig({
  name: 'Carrier API Config',
  carrierId: 'carrier-id',
  configType: 'API_ENDPOINTS',
  config: template
});

// Validate configuration
const validation = configService.validateConfigStructure('API_ENDPOINTS', config);
if (!validation.valid) {
  console.log('Validation errors:', validation.errors);
}
```

## Alert Metrics

The alert service monitors the following metrics:

- `lead_volume_per_hour`: Leads per hour
- `conversion_rate`: Percentage of converted leads
- `assignment_failure_rate`: Percentage of failed agent assignments
- `ai_score_std_deviation`: Standard deviation of AI quality scores
- `error_rate_percent`: Error rate percentage

## Report Filters

All reports support the following filters:

```typescript
interface ReportFilters {
  dateFrom?: Date;
  dateTo?: Date;
  insuranceType?: string[];
  leadSource?: string[];
  agentIds?: string[];
  status?: string[];
  customFields?: Record<string, unknown>;
}
```

## Integration Features

### API Client

- Automatic retry logic with exponential backoff
- Rate limit detection and handling
- Request/response sanitization for security
- Configurable timeouts
- Comprehensive error handling

### Carrier Integration

- Multi-product support (AUTO, HOME, LIFE, HEALTH, etc.)
- Lead submission with full tracking
- Quote requests from multiple carriers (parallel)
- Health monitoring and status tracking
- Rate limiting per carrier

### Broker Integration

- Carrier association and management
- Independent API endpoints
- Lead submission with logging
- Health monitoring
- Rate limiting per broker

### Configuration Management

- Multiple configuration types (API_ENDPOINTS, MAPPING_RULES, VALIDATION_RULES, etc.)
- Configuration templates for quick setup
- Validation support
- Enable/disable functionality
- Per-carrier and per-broker configs

### Health Monitoring

Tracks integration health with:

- Success rate calculation (24-hour window)
- Consecutive failure tracking
- Average response time
- Total request counts
- Health status classification (healthy/degraded/unhealthy)

**Health Criteria:**
- **Healthy**: Success rate ≥ 95%, no consecutive failures
- **Degraded**: Success rate ≥ 80%, < 5 consecutive failures
- **Unhealthy**: Below degraded thresholds

## Default Alert Rules

The system includes these default alert rules:

1. **High Lead Volume**: Triggers when leads/hour > 100
2. **Low Conversion Rate**: Triggers when conversion rate < 10%
3. **High Error Rate**: Triggers when error rate > 5% (3 consecutive)
4. **Agent Assignment Failure**: Triggers when failure rate > 20%
5. **AI Score Anomaly**: Triggers when score std deviation > 30

## Integration

These services are integrated into the data service via:

- `src/server.ts`: HTTP server exposing REST endpoints
- `src/routes/reports.routes.ts`: Report API routes
- `src/routes/alerts.routes.ts`: Alert API routes
- `src/routes/carriers.routes.ts`: Carrier API routes
- `src/routes/brokers.routes.ts`: Broker API routes
- `src/routes/integration-configs.routes.ts`: Integration config routes
- `src/routes/integration-logs.routes.ts`: Integration log routes

## Environment

Reports are stored in the `./reports` directory by default. Configure the path when initializing the ReportScheduler.

## Performance

- Reports are generated asynchronously
- Alert checks run every 5 minutes
- Alert rules include cooldown periods to prevent spam
- Database queries are optimized with appropriate indexes
- API client uses retry logic with exponential backoff
- Quote requests are executed in parallel for efficiency
- Integration health checks use optimized queries with indexes

## Documentation

For detailed integration documentation, see:
- [Phase 8.6 Implementation Guide](../../docs/PHASE_8.6_IMPLEMENTATION.md)
- [Phase 8.6 Quick Start](../../docs/PHASE_8.6_QUICKSTART.md)
