# Data Service - Services

This directory contains the core service implementations for the data service, including reporting and alerting functionality.

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

## Environment

Reports are stored in the `./reports` directory by default. Configure the path when initializing the ReportScheduler.

## Performance

- Reports are generated asynchronously
- Alert checks run every 5 minutes
- Alert rules include cooldown periods to prevent spam
- Database queries are optimized with appropriate indexes
