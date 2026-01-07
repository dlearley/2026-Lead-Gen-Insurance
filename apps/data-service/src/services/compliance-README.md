# Compliance Service

The Compliance Service provides comprehensive regulatory compliance functionality for GDPR, CCPA, and other data protection regulations.

## Features

- **Consent Management**: Track and manage user consents with versioning
- **Data Deletion**: Handle "right to be forgotten" requests
- **Audit Logging**: Comprehensive audit trail for all data access
- **Report Generation**: Automated regulatory report generation
- **Retention Policies**: Automated data retention and cleanup
- **Violation Tracking**: Track and remediate compliance violations
- **Data Subject Rights**: Handle all GDPR data subject rights requests

## Usage

### Creating a Consent

```typescript
import { ComplianceService } from './services/compliance-service.js';
import { ConsentType } from '@insurance-lead-gen/types';

const complianceService = new ComplianceService(prisma);

const consent = await complianceService.createConsent({
  email: 'user@example.com',
  consentType: ConsentType.DATA_PROCESSING,
  consentGiven: true,
  consentText: 'I consent to my data being processed.',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
});
```

### Checking Consent

```typescript
const result = await complianceService.checkConsent(
  'user@example.com',
  ConsentType.DATA_PROCESSING
);

if (result?.hasValidConsent) {
  // Process user data
}
```

### Submitting Deletion Request

```typescript
const request = await complianceService.createDeletionRequest({
  email: 'user@example.com',
  requestType: DeletionRequestType.RIGHT_TO_BE_FORGOTTEN,
  requestedBy: 'user@example.com',
  reason: 'No longer using the service',
});
```

### Processing Deletion Request

```typescript
// Verify request
await complianceService.verifyDeletionRequest(requestId, 'admin@company.com');

// Process deletion
await complianceService.processDeletionRequest(requestId, 'admin@company.com');
```

### Generating Compliance Report

```typescript
// Create report
const report = await complianceService.createReport({
  reportType: ReportType.DATA_PROCESSING_REGISTRY,
  reportFormat: ReportFormat.PDF,
  title: 'Q4 2024 Data Processing Registry',
  generatedBy: 'admin@company.com',
  periodStart: new Date('2024-10-01'),
  periodEnd: new Date('2024-12-31'),
});

// Generate report
const generatedReport = await complianceService.generateReport(report.id);
```

### Creating Retention Policy

```typescript
const policy = await complianceService.createRetentionPolicy({
  entityType: EntityType.LEAD,
  retentionPeriod: 365, // 1 year
  action: RetentionAction.DELETE,
  condition: 'status = "CONVERTED"',
  isActive: true,
  priority: 10,
  createdBy: 'admin@company.com',
});
```

### Applying Retention Policy

```typescript
const result = await complianceService.applyRetentionPolicy(policyId);
console.log(`Deleted ${result.recordsDeleted} records`);
```

### Tracking Violations

```typescript
// Create violation
const violation = await complianceService.createViolation({
  violationType: ViolationType.UNAUTHORIZED_ACCESS,
  severity: ViolationSeverity.HIGH,
  description: 'Unauthorized access detected from IP 192.168.1.100',
  detectedBy: 'security-system',
  detectionMethod: 'automated',
  affectedRecords: 5,
  riskScore: 75,
});

// Remediate violation
await complianceService.remediateViolation(
  violation.id,
  'Revoked access and notified security team',
  'admin@company.com'
);
```

### Getting Compliance Metrics

```typescript
const metrics = await complianceService.getComplianceMetrics();

console.log({
  totalAuditLogs: metrics.totalAuditLogs,
  activeConsents: metrics.activeConsents,
  pendingDeletionRequests: metrics.pendingDeletionRequests,
  openViolations: metrics.openViolations,
  activePolicies: metrics.activePolicies,
  reportsGenerated: metrics.reportsGenerated,
  avgProcessingTime: metrics.avgProcessingTime,
  complianceScore: metrics.complianceScore,
});
```

## API Reference

### ComplianceService

#### Consent Methods

- `createConsent(input)`: Create a new consent record
- `getConsent(id)`: Get consent by ID
- `getConsentsByLead(leadId)`: Get all consents for a lead
- `getConsentsByEmail(email)`: Get all consents for an email
- `checkConsent(email, consentType)`: Check if user has valid consent
- `withdrawConsent(id, ipAddress, performedBy)`: Withdraw consent

#### Deletion Request Methods

- `createDeletionRequest(input)`: Create a deletion request
- `getDeletionRequest(id)`: Get deletion request by ID
- `verifyDeletionRequest(id, verifiedBy)`: Verify deletion request
- `processDeletionRequest(id, processedBy)`: Process deletion request

#### Audit Log Methods

- `createAuditLog(input)`: Create an audit log entry
- `getAuditLogs(filters)`: Get audit logs with filters

#### Report Methods

- `createReport(input)`: Create a compliance report
- `generateReport(id)`: Generate a compliance report

#### Retention Policy Methods

- `createRetentionPolicy(input)`: Create a retention policy
- `applyRetentionPolicy(id)`: Apply a retention policy

#### Violation Methods

- `createViolation(input)`: Create a violation record
- `remediateViolation(id, action, remediatedBy)`: Remediate a violation

#### Data Subject Request Methods

- `createDataSubjectRequest(input)`: Create a data subject request

#### Metrics Methods

- `getComplianceMetrics()`: Get compliance metrics

## Compliance Standards

### GDPR Compliance

This service implements the following GDPR requirements:

- **Article 15**: Right of access
- **Article 16**: Right to rectification
- **Article 17**: Right to erasure (right to be forgotten)
- **Article 18**: Right to restriction of processing
- **Article 20**: Right to data portability
- **Article 21**: Right to object

### CCPA Compliance

This service implements the following CCPA rights:

- Right to know
- Right to delete
- Right to opt-out
- Right to non-discrimination

## Best Practices

1. **Always check consent** before processing user data
2. **Process deletion requests** within the required timeframe (30 days for GDPR)
3. **Maintain comprehensive audit logs** for compliance
4. **Generate reports regularly** (monthly/quarterly)
5. **Monitor compliance metrics** and address issues promptly
6. **Review and update retention policies** regularly
7. **Respond to data subject requests** within legal timeframes

## Security Considerations

1. All sensitive operations are logged
2. IP addresses and user agents are captured
3. Consent versioning prevents issues
4. Data deletion is irreversible
5. Audit logs maintain PII for compliance

## Testing

```bash
# Run compliance service tests
pnpm test --filter @insurance-lead-gen/data-service compliance-service.test
```

## Documentation

See [Phase 26.6 Documentation](../../../docs/PHASE_26.6_REGULATORY_COMPLIANCE.md) for comprehensive details.
