# Phase 5.3: Reporting System & Alert Management

## Overview

Phase 5.3 implements a comprehensive reporting and alerting system for the Insurance Lead Generation AI Platform. This phase builds on Phase 5.1 (Analytics Dashboard) to provide scheduled reports, custom report generation, data export capabilities, and an anomaly detection system with configurable alerts.

## Implementation Date

December 26, 2024

## Features Implemented

### 1. Report Generation System

#### Report Types Supported
- **Lead Funnel Reports**: Track leads through funnel stages
- **Agent Performance Reports**: Agent metrics and performance analysis
- **AI Metrics Reports**: AI model performance and scoring accuracy
- **System Health Reports**: Overall system status and metrics
- **Lead Volume Reports**: Lead distribution by source and type
- **Conversion Summary Reports**: Conversion rates and analysis

#### Report Formats
- **JSON**: Structured data format for API consumption
- **CSV**: Tabular data for spreadsheet analysis
- **PDF/HTML**: Formatted reports for human reading

#### Components
- `ReportGenerator` - Core report generation logic
- `ReportExporter` - Export reports to different formats
- `ReportScheduler` - Schedule and manage report execution

### 2. Report Scheduling

#### Schedule Types
- **Once**: One-time report generation
- **Daily**: Daily scheduled reports
- **Weekly**: Weekly scheduled reports
- **Monthly**: Monthly scheduled reports

#### Features
- Create, update, and delete report configurations
- Enable/disable scheduled reports
- Configure report recipients
- Set custom filters and date ranges
- Track last run and next run times

### 3. Alert System

#### Alert Types
- **Anomaly Detected**: Unusual patterns in metrics
- **Threshold Exceeded**: Metrics exceeding configured thresholds
- **Performance Degradation**: System performance issues
- **System Error**: Error rate alerts
- **Unusual Pattern**: Unexpected behavior detection

#### Alert Severity Levels
- **Info**: Informational alerts
- **Warning**: Warnings requiring attention
- **Error**: Errors requiring action
- **Critical**: Critical issues requiring immediate action

#### Default Alert Rules
1. **High Lead Volume**: Alert when lead volume exceeds 100/hour
2. **Low Conversion Rate**: Alert when conversion rate drops below 10%
3. **High Error Rate**: Alert when error rate exceeds 5% (3 consecutive checks)
4. **Agent Assignment Failure**: Alert when assignment failure rate exceeds 20%
5. **AI Score Anomaly**: Alert when AI score standard deviation exceeds 30

#### Alert Features
- Configurable alert rules with custom conditions
- Cooldown periods to prevent alert spam
- Multiple notification channels (email, Slack, PagerDuty)
- Alert acknowledgment and resolution tracking
- Alert status management (open, acknowledged, resolved, ignored)

### 4. Custom Report Builder

Support for building custom reports with:
- Custom metrics with aggregations (sum, avg, min, max, count, distinct)
- Custom dimensions
- Flexible filters
- Group by clauses
- Order by with direction
- Result limits

## API Endpoints

### Report Endpoints

#### Create Report Configuration
```
POST /api/v1/reports/configs
```

**Request Body:**
```json
{
  "name": "Weekly Lead Report",
  "description": "Weekly summary of leads",
  "type": "lead_volume",
  "format": "pdf",
  "schedule": "weekly",
  "scheduleTime": "09:00",
  "enabled": true,
  "filters": {
    "insuranceType": ["auto", "home"],
    "dateFrom": "2024-01-01T00:00:00Z",
    "dateTo": "2024-12-31T23:59:59Z"
  },
  "recipients": ["manager@example.com"]
}
```

#### Get All Report Configurations
```
GET /api/v1/reports/configs
```

#### Get Report Configuration
```
GET /api/v1/reports/configs/:id
```

#### Update Report Configuration
```
PUT /api/v1/reports/configs/:id
```

#### Delete Report Configuration
```
DELETE /api/v1/reports/configs/:id
```

#### Generate Report
```
POST /api/v1/reports/generate
```

**Request Body:**
```json
{
  "type": "conversion_summary",
  "format": "csv",
  "filters": {
    "dateFrom": "2024-12-01T00:00:00Z",
    "dateTo": "2024-12-31T23:59:59Z"
  }
}
```

#### Get Scheduled Reports
```
GET /api/v1/reports/scheduled
```

#### Run Report Configuration
```
POST /api/v1/reports/configs/:id/run
```

### Alert Endpoints

#### Check Metrics for Alerts
```
GET /api/v1/alerts/check
```

#### Create Alert Rule
```
POST /api/v1/alerts/rules
```

**Request Body:**
```json
{
  "name": "High Lead Volume Alert",
  "description": "Alert when lead volume is unusually high",
  "metric": "lead_volume_per_hour",
  "condition": {
    "operator": "gt",
    "threshold": 100,
    "windowMinutes": 60
  },
  "severity": "warning",
  "enabled": true,
  "cooldownMinutes": 60,
  "notificationChannels": ["email", "slack"]
}
```

#### Get All Alert Rules
```
GET /api/v1/alerts/rules
```

#### Get Alert Rule
```
GET /api/v1/alerts/rules/:id
```

#### Update Alert Rule
```
PUT /api/v1/alerts/rules/:id
```

#### Delete Alert Rule
```
DELETE /api/v1/alerts/rules/:id
```

#### Acknowledge Alert
```
POST /api/v1/alerts/:id/acknowledge
```

**Request Body:**
```json
{
  "userId": "user-123",
  "notes": "Looking into this issue"
}
```

#### Resolve Alert
```
POST /api/v1/alerts/:id/resolve
```

**Request Body:**
```json
{
  "userId": "user-123",
  "resolution": "Issue resolved by restarting service",
  "notes": "Service restarted at 10:30 AM"
}
```

## File Structure

### New Files Created

```
packages/types/src/
├── reports.ts                          # Report and alert type definitions

apps/data-service/src/
├── services/
│   ├── report-generator.ts            # Report generation logic
│   ├── report-exporter.ts             # Report export to various formats
│   ├── report-scheduler.ts            # Report scheduling system
│   └── alert-service.ts               # Alert detection and management
├── routes/
│   ├── reports.routes.ts              # Report API routes
│   └── alerts.routes.ts               # Alert API routes
└── server.ts                          # HTTP server for data service

apps/api/src/routes/
├── reports.ts                          # Report API proxy routes
└── alerts.ts                           # Alert API proxy routes
```

### Modified Files

```
packages/types/src/
└── index.ts                            # Added report exports

apps/data-service/
├── src/index.ts                        # Integrated HTTP server
└── package.json                        # Added express dependencies

apps/api/src/
└── app.ts                              # Added report and alert routes
```

## Type Definitions

### Report Types
- `ReportType`: Types of reports available
- `ReportFormat`: Export formats (json, csv, pdf)
- `ReportSchedule`: Scheduling options (once, daily, weekly, monthly)
- `ReportStatus`: Report generation status
- `ReportConfig`: Report configuration
- `ReportGeneration`: Report generation tracking
- `ReportData`: Generated report data structure

### Alert Types
- `AlertType`: Types of alerts
- `AlertSeverity`: Alert severity levels
- `AlertStatus`: Alert lifecycle status
- `Alert`: Alert instance
- `AlertRule`: Alert rule configuration
- `AlertCondition`: Condition for triggering alerts

## Usage Examples

### Create a Scheduled Report

```typescript
const reportConfig = {
  name: "Daily Agent Performance",
  type: "agent_performance",
  format: "csv",
  schedule: "daily",
  scheduleTime: "08:00",
  enabled: true,
  recipients: ["manager@example.com"]
};

const response = await fetch('/api/v1/reports/configs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(reportConfig)
});
```

### Generate On-Demand Report

```typescript
const reportRequest = {
  type: "lead_funnel",
  format: "pdf",
  filters: {
    dateFrom: new Date('2024-12-01'),
    dateTo: new Date('2024-12-31'),
    insuranceType: ["auto", "home"]
  }
};

const response = await fetch('/api/v1/reports/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(reportRequest)
});

const blob = await response.blob();
// Download or display the report
```

### Create Custom Alert Rule

```typescript
const alertRule = {
  name: "Critical Conversion Rate Drop",
  metric: "conversion_rate",
  condition: {
    operator: "lt",
    threshold: 5,
    windowMinutes: 120
  },
  severity: "critical",
  cooldownMinutes: 30,
  notificationChannels: ["email", "pagerduty"]
};

const response = await fetch('/api/v1/alerts/rules', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(alertRule)
});
```

### Check Active Alerts

```typescript
const response = await fetch('/api/v1/alerts/check');
const { data: alerts } = await response.json();

alerts.forEach(alert => {
  console.log(`[${alert.severity}] ${alert.title}`);
  console.log(`Current: ${alert.currentValue}, Threshold: ${alert.threshold}`);
});
```

## Configuration

### Environment Variables

No new environment variables required. Uses existing configuration from `@insurance-lead-gen/config`.

### Report Storage

Reports are stored in the `./reports` directory by default. This can be configured when initializing the `ReportScheduler`.

## Monitoring Metrics

### Report Metrics
- Number of scheduled reports
- Report generation success/failure rate
- Report generation duration
- Report file sizes

### Alert Metrics
- Active alerts by severity
- Alert trigger frequency
- Alert acknowledgment time
- Alert resolution time
- False positive rate

## Performance Considerations

### Report Generation
- Reports are generated asynchronously
- Large reports may take time to generate
- Consider pagination for very large datasets
- CSV format is most efficient for large datasets

### Alert Checking
- Alerts are checked every 5 minutes by default
- Cooldown periods prevent alert spam
- Alert rules are evaluated in memory for performance
- Database queries are optimized with indexes

## Future Enhancements

### Phase 5.4 Potential Features
1. **Advanced Analytics**: Machine learning-based anomaly detection
2. **Report Templates**: Customizable report templates with branding
3. **Dashboard Widgets**: Interactive dashboard components
4. **Real-time Streaming**: WebSocket-based real-time report updates
5. **Data Warehouse Integration**: Export to data warehouses (Snowflake, BigQuery)
6. **Advanced Visualizations**: Charts, graphs, and interactive visualizations
7. **Report Collaboration**: Share and collaborate on reports
8. **Automated Insights**: AI-generated insights from report data

## Testing

### Manual Testing

1. **Create Report Configuration**
```bash
curl -X POST http://localhost:3000/api/v1/reports/configs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Report",
    "type": "lead_volume",
    "format": "json",
    "schedule": "once",
    "enabled": true
  }'
```

2. **Generate Report**
```bash
curl -X POST http://localhost:3000/api/v1/reports/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "conversion_summary",
    "format": "csv"
  }' > report.csv
```

3. **Check Alerts**
```bash
curl http://localhost:3000/api/v1/alerts/check
```

4. **Create Alert Rule**
```bash
curl -X POST http://localhost:3000/api/v1/alerts/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Alert",
    "metric": "error_rate_percent",
    "condition": {
      "operator": "gt",
      "threshold": 10
    },
    "severity": "warning"
  }'
```

## Dependencies

### New Dependencies Added
- `express`: ^4.18.2 - HTTP server framework
- `cors`: ^2.8.5 - CORS middleware
- `helmet`: ^7.1.0 - Security middleware
- `@types/express`: ^4.17.21 - TypeScript types
- `@types/cors`: ^2.8.17 - TypeScript types
- `@types/node`: ^20.10.0 - TypeScript types

## Rollout Plan

1. **Development Testing**: Test all endpoints in development environment
2. **Staging Deployment**: Deploy to staging for integration testing
3. **User Acceptance**: Allow key users to test report generation
4. **Production Rollout**: Gradual rollout with monitoring
5. **Documentation**: Share user guides and API documentation

## Success Metrics

- Report generation success rate > 99%
- Average report generation time < 10 seconds
- Alert detection latency < 5 minutes
- Alert false positive rate < 5%
- User adoption of scheduled reports > 70%

## Conclusion

Phase 5.3 successfully implements a comprehensive reporting and alerting system that provides:
- Flexible report generation with multiple formats
- Automated report scheduling
- Proactive alert detection and management
- Custom report building capabilities
- Full API integration

This phase completes the analytics and optimization deliverables for Phase 5, providing teams with the tools they need to monitor, analyze, and optimize the lead generation platform.
