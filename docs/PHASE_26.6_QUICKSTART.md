# Phase 26.6: Regulatory Compliance - Quickstart Guide

## 🚀 Getting Started

This guide will help you quickly set up and use the regulatory compliance features of the Insurance Lead Generation Platform.

## Prerequisites

- PostgreSQL database with updated schema
- Running data-service and API services
- Basic understanding of GDPR/CCPA requirements

## Setup

### 1. Run Database Migration

First, apply the new compliance database models:

```bash
# Generate Prisma migration
pnpm migrate dev --name add_compliance_models

# Apply migration to production
pnpm migrate deploy
```

### 2. Verify Installation

Check that compliance services are available:

```bash
# Test compliance metrics endpoint
curl http://localhost:3001/api/v1/compliance/metrics
```

You should see a response with compliance metrics.

## Quickstart Scenarios

### Scenario 1: Collect User Consent

When a new lead is created, collect and store their consent:

```typescript
import { ComplianceService } from '@insurance-lead-gen/data-service';
import { ConsentType } from '@insurance-lead-gen/types';

const complianceService = new ComplianceService(prisma);

// Collect consent from user
const consent = await complianceService.createConsent({
  leadId: lead.id,
  email: lead.email,
  consentType: ConsentType.DATA_PROCESSING,
  consentGiven: true,
  consentText: 'I consent to my data being processed for lead management purposes.',
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});

console.log('Consent created:', consent);
```

### Scenario 2: Check Consent Before Processing

Always verify consent before processing user data:

```typescript
const result = await complianceService.checkConsent(
  user.email,
  ConsentType.DATA_PROCESSING
);

if (result?.hasValidConsent) {
  // Proceed with data processing
  console.log('User has valid consent');
} else {
  // Request consent or inform user
  console.log('No valid consent found');
  return res.status(403).json({
    error: 'Consent required',
    message: 'Please provide consent before we can process your data',
  });
}
```

### Scenario 3: Handle Data Deletion Request (Right to be Forgotten)

When a user requests deletion of their data:

```typescript
// Create deletion request
const request = await complianceService.createDeletionRequest({
  email: user.email,
  requestType: DeletionRequestType.RIGHT_TO_BE_FORGOTTEN,
  requestedBy: user.email,
  ipAddress: req.ip,
  reason: 'I no longer wish to use this service and request deletion of all my data.',
});

console.log('Deletion request created:', request.id);

// Verify user identity (in production, verify via email, SMS, etc.)
const verifiedRequest = await complianceService.verifyDeletionRequest(
  request.id,
  'admin@company.com'
);

// Process the deletion
await complianceService.processDeletionRequest(
  request.id,
  'admin@company.com'
);

console.log('Data deletion completed');
```

### Scenario 4: Generate Monthly Compliance Report

Generate a data processing registry report each month:

```typescript
const report = await complianceService.createReport({
  reportType: ReportType.DATA_PROCESSING_REGISTRY,
  reportFormat: ReportFormat.PDF,
  title: 'January 2024 Data Processing Registry',
  description: 'Monthly report of all data processing activities',
  generatedBy: 'compliance-officer@company.com',
  periodStart: new Date('2024-01-01'),
  periodEnd: new Date('2024-01-31'),
});

// Generate the report
const generatedReport = await complianceService.generateReport(report.id);

console.log('Report generated:', generatedReport.metrics);
```

### Scenario 5: Set Up Data Retention Policy

Automatically delete old data:

```typescript
const policy = await complianceService.createRetentionPolicy({
  entityType: EntityType.LEAD,
  retentionPeriod: 365, // 1 year
  action: RetentionAction.DELETE,
  condition: 'status = "CONVERTED"', // Only delete converted leads
  isActive: true,
  priority: 10,
  createdBy: 'data-protection-officer@company.com',
});

console.log('Retention policy created:', policy.id);

// Apply the policy immediately
const result = await complianceService.applyRetentionPolicy(policy.id);

console.log(`Processed ${result.recordsProcessed} records`);
console.log(`Deleted ${result.recordsDeleted} records`);
```

### Scenario 6: Track Compliance Violation

When a potential compliance issue is detected:

```typescript
const violation = await complianceService.createViolation({
  violationType: ViolationType.UNAUTHORIZED_ACCESS,
  severity: ViolationSeverity.HIGH,
  description: 'Multiple failed login attempts detected from IP 192.168.1.100',
  detectedBy: 'security-monitoring-system',
  detectionMethod: 'automated',
  affectedRecords: 0,
  riskScore: 85,
  notes: 'IP blocked temporarily. Security team notified.',
});

console.log('Violation created:', violation.id);

// When issue is resolved
await complianceService.remediateViolation(
  violation.id,
  'IP blocked and user notified. No data breach confirmed.',
  'security-officer@company.com'
);

console.log('Violation remediated');
```

### Scenario 7: Query Audit Logs

Find specific audit log entries:

```typescript
const { logs, total } = await complianceService.getAuditLogs({
  entityType: EntityType.LEAD,
  actionType: ActionType.DELETE,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  limit: 100,
});

console.log(`Found ${total} audit logs`);
logs.forEach(log => {
  console.log(`${log.performedBy} ${log.actionType} ${log.entityType} ${log.entityId} at ${log.createdAt}`);
});
```

### Scenario 8: Get Compliance Dashboard Metrics

Generate a compliance scorecard:

```typescript
const metrics = await complianceService.getComplianceMetrics();

console.log('=== Compliance Dashboard ===');
console.log(`Compliance Score: ${metrics.complianceScore}/100`);
console.log(`Active Consents: ${metrics.activeConsents}`);
console.log(`Pending Deletions: ${metrics.pendingDeletionRequests}`);
console.log(`Open Violations: ${metrics.openViolations}`);
console.log(`Active Policies: ${metrics.activePolicies}`);
console.log(`Reports Generated: ${metrics.reportsGenerated}`);
console.log(`Avg Processing Time: ${metrics.avgProcessingTime.toFixed(2)} days`);

// Alert on issues
if (metrics.openViolations > 0) {
  console.warn(`⚠️  ${metrics.openViolations} open violations require attention`);
}

if (metrics.complianceScore < 90) {
  console.warn(`⚠️  Compliance score below target: ${metrics.complianceScore}`);
}
```

## API Examples

### Using the REST API

#### Create Consent

```bash
curl -X POST http://localhost:3001/api/v1/compliance/consents \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "consentType": "DATA_PROCESSING",
    "consentGiven": true,
    "consentText": "I consent to my data being processed.",
    "ipAddress": "192.168.1.1"
  }'
```

#### Check Consent

```bash
curl "http://localhost:3001/api/v1/compliance/consents/check?email=user@example.com&consentType=DATA_PROCESSING"
```

#### Create Deletion Request

```bash
curl -X POST http://localhost:3001/api/v1/compliance/deletion-requests \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "requestType": "RIGHT_TO_BE_FORGOTTEN",
    "requestedBy": "user@example.com",
    "reason": "No longer using the service"
  }'
```

#### Get Compliance Metrics

```bash
curl http://localhost:3001/api/v1/compliance/metrics
```

## Best Practices

### 1. Always Check Consent

```typescript
// ✅ Good - Check consent first
const consent = await complianceService.checkConsent(email, consentType);
if (consent?.hasValidConsent) {
  processData(user);
}

// ❌ Bad - Process without checking consent
processData(user);
```

### 2. Log All Sensitive Operations

```typescript
// Create audit log when accessing sensitive data
await complianceService.createAuditLog({
  entityType: EntityType.LEAD,
  entityId: lead.id,
  actionType: ActionType.READ,
  performedBy: user.id,
  performedByRole: user.role,
  sensitiveFields: ['email', 'phone', 'ssn'],
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});
```

### 3. Process Deletion Requests Promptly

```typescript
// Process within 30 days (GDPR requirement)
const pendingRequests = await complianceService.getPendingDeletionRequests();

for (const request of pendingRequests) {
  const daysSinceRequest = (Date.now() - request.createdAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceRequest > 25) {
    // Process soon to meet 30-day deadline
    await complianceService.processDeletionRequest(request.id, 'system');
  }
}
```

### 4. Generate Reports Regularly

```typescript
// Schedule monthly report generation
cron.schedule('0 0 1 * *', async () => {
  const lastMonthStart = new Date();
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
  lastMonthStart.setDate(1);

  const lastMonthEnd = new Date(lastMonthStart.getFullYear(), lastMonthStart.getMonth() + 1, 0);

  await complianceService.createReport({
    reportType: ReportType.DATA_PROCESSING_REGISTRY,
    reportFormat: ReportFormat.PDF,
    title: `${lastMonthStart.toLocaleString('default', { month: 'long' })} ${lastMonthStart.getFullYear()} Data Processing Registry`,
    periodStart: lastMonthStart,
    periodEnd: lastMonthEnd,
    generatedBy: 'system',
  });
});
```

### 5. Monitor Compliance Score

```typescript
// Set up monitoring alerts
const metrics = await complianceService.getComplianceMetrics();

if (metrics.complianceScore < 80) {
  // Send alert to compliance team
  await sendAlert({
    severity: 'HIGH',
    message: `Compliance score dropped to ${metrics.complianceScore}`,
    metrics,
  });
}

if (metrics.openViolations > 0) {
  // Send alert for violations
  const criticalViolations = await complianceService.getOpenViolations()
    .filter(v => v.severity === 'CRITICAL');

  if (criticalViolations.length > 0) {
    await sendUrgentAlert({
      message: `${criticalViolations.length} critical violations require immediate attention`,
    });
  }
}
```

## Common Tasks

### Collect All Required Consents

```typescript
const requiredConsents = [
  ConsentType.DATA_PROCESSING,
  ConsentType.MARKETING_COMMUNICATIONS,
  ConsentType.ANALYTICS,
];

for (const consentType of requiredConsents) {
  await complianceService.createConsent({
    email: user.email,
    consentType,
    consentGiven: user.consents[consentType],
    consentText: getConsentText(consentType),
    ipAddress: req.ip,
  });
}
```

### Generate Consent Report

```typescript
const report = await complianceService.createReport({
  reportType: ReportType.CONSENT_REGISTRY,
  reportFormat: ReportFormat.CSV,
  title: 'Consent Registry',
  description: 'Complete registry of all user consents',
  generatedBy: 'compliance-officer@company.com',
});

const generated = await complianceService.generateReport(report.id);
```

### Clean Up Old Data

```typescript
// Create policy for different entity types
const policies = [
  {
    entityType: EntityType.LEAD,
    retentionPeriod: 730, // 2 years for unconverted leads
    action: RetentionAction.DELETE,
    condition: 'status IN ("REJECTED", "EXPIRED")',
  },
  {
    entityType: EventType.AUDIT_LOG,
    retentionPeriod: 1825, // 5 years for audit logs
    action: RetentionAction.ARCHIVE,
  },
];

for (const policyInput of policies) {
  const policy = await complianceService.createRetentionPolicy({
    ...policyInput,
    isActive: true,
    priority: 10,
  });

  await complianceService.applyRetentionPolicy(policy.id);
}
```

## Troubleshooting

### Issue: Consent Check Returns Null

**Cause**: No valid consent exists for the user and consent type.

**Solution**:
```typescript
const result = await complianceService.checkConsent(email, consentType);

if (!result) {
  // Request consent from user
  return res.status(403).json({
    error: 'Consent required',
    message: 'Please provide consent before we can process your data',
    consentTypes: [consentType],
  });
}
```

### Issue: Deletion Request Fails

**Cause**: Lead ID not found or insufficient permissions.

**Solution**:
```typescript
try {
  await complianceService.processDeletionRequest(requestId, userId);
} catch (error) {
  if (error.message.includes('Lead not found')) {
    return res.status(404).json({
      error: 'Lead not found',
      message: 'The specified lead could not be found',
    });
  }
  if (error.message.includes('insufficient permissions')) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to process this request',
    });
  }
  throw error;
}
```

### Issue: Report Generation Times Out

**Cause**: Too much data to process.

**Solution**:
```typescript
// Break down into smaller time periods
const periods = [
  { start: '2024-01-01', end: '2024-03-31' },
  { start: '2024-04-01', end: '2024-06-30' },
  { start: '2024-07-01', end: '2024-09-30' },
  { start: '2024-10-01', end: '2024-12-31' },
];

for (const period of periods) {
  await complianceService.createReport({
    reportType: ReportType.AUDIT_LOG_REPORT,
    reportFormat: ReportFormat.CSV,
    title: `Audit Logs ${period.start} to ${period.end}`,
    periodStart: new Date(period.start),
    periodEnd: new Date(period.end),
    generatedBy: userId,
  });
}
```

## Next Steps

- Read the [full documentation](PHASE_26.6_REGULATORY_COMPLIANCE.md) for detailed information
- Review [GDPR requirements](https://gdpr-info.eu/)
- Review [CCPA requirements](https://oag.ca.gov/privacy/ccpa)
- Set up monitoring and alerting for compliance metrics
- Create automated report generation schedules
- Implement consent collection in your user onboarding flow

## Support

For questions or issues related to regulatory compliance features:

1. Check the [full documentation](PHASE_26.6_REGULATORY_COMPLIANCE.md)
2. Review the [service README](../apps/data-service/src/services/compliance-README.md)
3. Contact your compliance officer for regulatory guidance
4. Consult with legal counsel for jurisdiction-specific requirements
