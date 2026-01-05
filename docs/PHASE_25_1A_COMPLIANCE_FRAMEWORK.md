# Phase 25.1A: Compliance Framework & Architecture

## Overview

This document provides comprehensive documentation for the Compliance Framework and Architecture implemented in Phase 25.1A. The framework establishes foundational compliance capabilities for GDPR, HIPAA, CCPA, GLBA, and Insurance regulations across the insurance lead generation platform.

## Architecture Overview

The compliance framework follows a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Compliance API Layer                     │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │ Compliance      │ │ Compliance      │ │ Compliance      ││
│  │ Controller      │ │ Routes          │ │ Middleware      ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Compliance Services Layer                 │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │ Compliance      │ │ AuditTrail      │ │ Compliance      ││
│  │ Service         │ │ Service         │ │ Monitoring      ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
│  ┌─────────────────┐ ┌─────────────────┐                   │
│  │ Compliance      │ │ Policy Engine   │                   │
│  │ Policy Engine   │ │ Core            │                   │
│  └─────────────────┘ └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer (Prisma)                   │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │ Compliance      │ │ Audit Logs      │ │ Policy Data     ││
│  │ Policies        │ │ (Immutable)     │ │ & Status        ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Core Compliance Models

#### 1. CompliancePolicy
```sql
model CompliancePolicy {
  id                String      @id @default(cuid())
  name              String      // Policy name
  description       String?     // Policy description
  domain            String      // GDPR, HIPAA, CCPA, GLBA, Insurance
  jurisdiction      String?     // EU, US, CA, NY, TX, FL
  riskLevel         String      // Critical, High, Medium, Low
  status            String      // Active, Draft, Archived
  requirements      RequiredField[]
  violations        ComplianceViolation[]
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
}
```

**Key Features:**
- Multi-domain support (GDPR, HIPAA, CCPA, GLBA, Insurance)
- Jurisdiction-specific policies
- Risk-based policy classification
- Status lifecycle management

#### 2. RequiredField
```sql
model RequiredField {
  id                String      @id @default(cuid())
  policyId          String
  policy            CompliancePolicy @relation(fields: [policyId], references: [id], onDelete: Cascade)
  name              String      // Field requirement name
  description       String?     // Field description
  validationRule    String      // JSON schema or custom validation logic
  enforcementLevel  String      // Mandatory, Recommended
  createdAt         DateTime    @default(now())
}
```

**Validation Rule Examples:**
```json
{
  "type": "schema",
  "required": ["consentGiven", "consentDate"],
  "properties": {
    "consentGiven": { "type": "boolean" },
    "consentDate": { "type": "string", "format": "date-time" }
  }
}
```

#### 3. ComplianceViolation
```sql
model ComplianceViolation {
  id                String      @id @default(cuid())
  policyId          String
  policy            CompliancePolicy @relation(fields: [policyId], references: [id], onDelete: Cascade)
  leadId            String?     // Associated lead
  agentId           String?     // Associated agent
  violationType     String      // Type of violation
  severity          String      // Critical, High, Medium, Low
  status            String      // Open, Resolved, Waived
  description       String      // Violation description
  detectedAt        DateTime    @default(now())
  resolvedAt        DateTime?
  resolution        String?     // Resolution details
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
}
```

#### 4. ComplianceAuditLog (Immutable)
```sql
model ComplianceAuditLog {
  id                String      @id @default(cuid())
  userId            String      // User who performed action
  action            String      // Action performed
  entityType        String      // Type of entity affected
  entityId          String      // Entity ID
  changes           String      // JSON of changes
  compliancePolicies String?    // JSON array of policies involved
  ipAddress         String?     // Source IP
  userAgent         String?     // User agent
  timestamp         DateTime    @default(now()) // Immutable
  createdAt         DateTime    @default(now())
  
  @@index([userId])
  @@index([entityId])
  @@index([timestamp])
  @@index([action])
}
```

### Supporting Models

#### 5. ComplianceStatus
Tracks compliance dashboard metrics and scores.

#### 6. DataSubjectRequest
Handles GDPR DSAR and CCPA data subject requests.

#### 7. RegulatoryRequirement
Tracks implementation status of regulatory requirements.

## Service Architecture

### 1. ComplianceService

**Primary Responsibilities:**
- Policy management (CRUD operations)
- Lead compliance validation
- Compliance score calculation
- Report generation
- Policy evaluation orchestration

**Key Methods:**

```typescript
interface IComplianceService {
  validateLeadCompliance(leadData: any): Promise<ValidationResult>;
  registerPolicy(policyConfig: CreatePolicyRequest): Promise<CompliancePolicy>;
  getPoliciesByDomain(domain: ComplianceDomain): Promise<CompliancePolicy[]>;
  checkViolations(entityType: string, entityId: string): Promise<ComplianceViolation[]>;
  getComplianceScore(): Promise<number>;
  generateComplianceReport(request: ComplianceReportRequest): Promise<ComplianceReport>;
  archivePolicy(policyId: string): Promise<void>;
  evaluatePolicy(policyId: string, context: PolicyEvaluationContext): Promise<PolicyEvaluationResult>;
}
```

**Usage Example:**
```typescript
const complianceService = new ComplianceService();

// Validate lead against all active policies
const validation = await complianceService.validateLeadCompliance({
  id: 'lead-123',
  email: 'test@example.com',
  consentGiven: true,
  state: 'CA'
});

// Register new policy
const policy = await complianceService.registerPolicy({
  name: 'GDPR Consent Policy',
  domain: 'GDPR',
  jurisdiction: 'EU',
  riskLevel: 'Critical',
  requirements: [
    {
      name: 'Consent Required',
      validationRule: JSON.stringify({
        type: 'schema',
        required: ['consentGiven', 'consentDate']
      }),
      enforcementLevel: 'Mandatory'
    }
  ]
});
```

### 2. CompliancePolicyEngine

**Core Features:**
- Rule-based policy validation
- JSON schema validation
- Domain-specific validation logic
- Policy override mechanisms
- Compliance score calculation

**Domain-Specific Validators:**

#### GDPR Validation
- **Consent Required**: Checks for explicit consent before data processing
- **Data Retention**: Validates retention periods haven't expired
- **Right to Erasure**: Ensures erasure requests are fulfilled within timeframe
- **Data Minimization**: Prevents excessive data collection

```typescript
private validateGDPR(validationRule: any, data: any, requirement: any): string[] {
  const violations: string[] = [];
  
  switch (requirement.name) {
    case 'Consent Required':
      if (!data.consentGiven && !data.consentDate) {
        violations.push('GDPR consent not obtained for data processing');
      }
      break;
    case 'Data Retention':
      if (data.retentionExpiry && new Date(data.retentionExpiry) < new Date()) {
        violations.push('GDPR data retention period has expired');
      }
      break;
  }
  
  return violations;
}
```

#### HIPAA Validation
- **PHI Encryption**: Ensures protected health information is encrypted
- **Access Controls**: Validates proper access control implementation
- **Audit Trail**: Checks for audit logging of PHI access
- **Minimum Necessary**: Enforces minimum necessary rule

#### CCPA Validation
- **Opt-Out Mechanism**: Validates opt-out availability for California residents
- **Privacy Notice**: Ensures privacy notice provided at collection
- **Consumer Rights**: Validates consumer rights implementation

#### Insurance Validation
- **License Verification**: Checks agent licensing status
- **State Registration**: Validates state-specific registration
- **E&O Insurance**: Ensures errors and omissions insurance coverage

### 3. AuditTrailService

**Immutable Audit Trail Features:**
- Tamper-resistant logging
- Integrity validation
- Full-text search capabilities
- Export functionality (JSON, CSV, XML)
- Critical action detection

**Key Methods:**

```typescript
interface IAuditTrailService {
  logAction(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    changes: Record<string, any>,
    compliancePolicies?: string[]
  ): Promise<void>;
  getAuditTrail(filters: ComplianceAuditLogFilter): Promise<ComplianceAuditLog[]>;
  generateAuditReport(dateRange: { from: Date; to: Date }): Promise<ComplianceAuditLog[]>;
  validateAuditIntegrity(): Promise<boolean>;
  searchAuditLogs(query: string, filters?: Partial<ComplianceAuditLogFilter>): Promise<ComplianceAuditLog[]>;
  exportAuditLogs(
    dateRange: { from: Date; to: Date },
    format: 'json' | 'csv' | 'xml',
    filters?: Partial<ComplianceAuditLogFilter>
  ): Promise<string>;
}
```

**Usage Example:**
```typescript
const auditService = new AuditTrailService();

// Log compliance action
await auditService.logAction(
  'user-123',
  'LeadCreated',
  'Lead',
  'lead-456',
  { email: 'test@example.com', consentGiven: true },
  ['policy-gdpr-consent']
);

// Get audit trail with filters
const auditLogs = await auditService.getAuditTrail({
  userId: 'user-123',
  dateFrom: new Date('2024-01-01'),
  dateTo: new Date('2024-12-31'),
  limit: 100
});

// Export audit logs
const csvExport = await auditService.exportAuditLogs(
  { from: new Date('2024-01-01'), to: new Date('2024-12-31') },
  'csv'
);
```

### 4. ComplianceMonitoringService

**Real-time Monitoring Features:**
- Automated violation scanning
- Anomaly detection
- Alert generation
- Compliance trend analysis
- Periodic compliance checks

**Key Methods:**

```typescript
interface IComplianceMonitoringService {
  scanLeadsForViolations(): Promise<ComplianceViolation[]>;
  monitorPolicyCompliance(policyId: string): Promise<ComplianceStatus>;
  detectAnomalies(): Promise<any[]>;
  alertOnViolation(violation: ComplianceViolation): Promise<void>;
  generateComplianceTrends(): Promise<any[]>;
}
```

## API Routes

### Compliance Endpoints

```typescript
// Policy Management
GET    /api/v1/compliance/policies              // List all policies
GET    /api/v1/compliance/policies/:id          // Get policy details
POST   /api/v1/compliance/policies              // Create new policy (admin)
PUT    /api/v1/compliance/policies/:id          // Update policy (admin)
DELETE /api/v1/compliance/policies/:id          // Archive policy (admin)

// Violations
GET    /api/v1/compliance/violations            // List violations
GET    /api/v1/compliance/violations/:id        // Get violation details
PUT    /api/v1/compliance/violations/:id        // Update violation status

// Audit Trail
GET    /api/v1/compliance/audit-logs            // Query audit trail

// Compliance Status
GET    /api/v1/compliance/status                // Get overall status
POST   /api/v1/compliance/score                 // Calculate compliance score

// Validation
POST   /api/v1/compliance/validate-lead         // Validate lead compliance

// Reports
POST   /api/v1/compliance/report                // Generate compliance report

// Requirements
GET    /api/v1/compliance/requirements          // List regulatory requirements
```

### Request/Response Examples

#### Create Policy
```typescript
POST /api/v1/compliance/policies
{
  "name": "GDPR Data Processing Policy",
  "description": "Ensures GDPR compliance for EU data processing",
  "domain": "GDPR",
  "jurisdiction": "EU",
  "riskLevel": "Critical",
  "requirements": [
    {
      "name": "Consent Required",
      "description": "Explicit consent must be obtained",
      "validationRule": "{\"type\":\"schema\",\"required\":[\"consentGiven\"]}",
      "enforcementLevel": "Mandatory"
    }
  ]
}
```

#### Response
```typescript
{
  "success": true,
  "data": {
    "id": "policy-123",
    "name": "GDPR Data Processing Policy",
    "domain": "GDPR",
    "jurisdiction": "EU",
    "riskLevel": "Critical",
    "status": "Active",
    "requirements": [...],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### Validate Lead Compliance
```typescript
POST /api/v1/compliance/validate-lead
{
  "id": "lead-123",
  "email": "test@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "state": "CA",
  "consentGiven": true,
  "consentDate": "2024-01-01T00:00:00Z"
}
```

#### Response
```typescript
{
  "success": true,
  "data": {
    "isValid": true,
    "errors": [],
    "warnings": [
      {
        "field": "privacy",
        "message": "CCPA privacy notice should be provided",
        "suggestion": "Update privacy notice display"
      }
    ]
  },
  "leadId": "lead-123"
}
```

## Configuration Guide

### 1. Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/insurance_db"

# Compliance Configuration
COMPLIANCE_SCAN_INTERVAL="3600"        # 1 hour in seconds
ALERT_WEBHOOK_URL="https://hooks.slack.com/..." # External alerting
COMPLIANCE_SCORE_THRESHOLD="80"        # Minimum compliance score
AUDIT_RETENTION_DAYS="2555"            # 7 years for compliance

# Monitoring
MONITORING_ENABLED="true"
ANOMALY_DETECTION_ENABLED="true"
```

### 2. Policy Configuration

#### GDPR Policy Setup
```typescript
const gdprPolicy = {
  name: 'GDPR Complete Compliance',
  domain: 'GDPR',
  jurisdiction: 'EU',
  riskLevel: 'Critical',
  requirements: [
    {
      name: 'Lawful Basis',
      validationRule: JSON.stringify({
        type: 'schema',
        required: ['lawfulBasis', 'consentDate']
      }),
      enforcementLevel: 'Mandatory'
    },
    {
      name: 'Data Subject Rights',
      validationRule: JSON.stringify({
        type: 'function',
        function: 'validateDataSubjectRights'
      }),
      enforcementLevel: 'Mandatory'
    }
  ]
};
```

#### HIPAA Policy Setup
```typescript
const hipaaPolicy = {
  name: 'HIPAA Privacy & Security',
  domain: 'HIPAA',
  jurisdiction: 'US',
  riskLevel: 'Critical',
  requirements: [
    {
      name: 'PHI Protection',
      validationRule: JSON.stringify({
        type: 'schema',
        required: ['encrypted', 'accessControls', 'auditTrail']
      }),
      enforcementLevel: 'Mandatory'
    }
  ]
};
```

### 3. State-Specific Insurance Policies

#### California Insurance Requirements
```typescript
const caInsurancePolicy = {
  name: 'California Insurance Compliance',
  domain: 'Insurance',
  jurisdiction: 'CA',
  riskLevel: 'High',
  requirements: [
    {
      name: 'License Verification',
      validationRule: JSON.stringify({
        type: 'schema',
        required: ['licenseVerified', 'licenseNumber', 'expiryDate']
      }),
      enforcementLevel: 'Mandatory'
    },
    {
      name: 'E&O Insurance',
      validationRule: JSON.stringify({
        type: 'schema',
        required: ['eAndOInsurance', 'coverageAmount']
      }),
      enforcementLevel: 'Mandatory'
    }
  ]
};
```

## Integration Points

### 1. Lead Processing Pipeline

The compliance framework integrates with the lead processing pipeline:

```typescript
// In lead creation service
const leadProcessor = {
  async createLead(leadData) {
    // Create lead
    const lead = await this.createLeadRecord(leadData);
    
    // Validate compliance
    const complianceResult = await this.complianceService.validateLeadCompliance(leadData);
    
    if (!complianceResult.isValid) {
      // Log violation
      await this.auditService.logAction(
        'system',
        'LeadCreated_NonCompliant',
        'Lead',
        lead.id,
        leadData,
        complianceResult.errors.map(e => e.policyId)
      );
      
      // Create violation records
      for (const error of complianceResult.errors) {
        await this.createViolation(error, lead.id);
      }
    }
    
    // Log successful creation
    await this.auditService.logAction(
      'user-123',
      'LeadCreated',
      'Lead',
      lead.id,
      leadData,
      complianceResult.policiesInvolved
    );
    
    return lead;
  }
};
```

### 2. Real-time WebSocket Events

Compliance events are broadcast via WebSocket:

```typescript
// Compliance event types
interface ComplianceEvent {
  type: 'VIOLATION_DETECTED' | 'POLICY_UPDATED' | 'COMPLIANCE_SCORED';
  data: any;
  timestamp: Date;
}

// WebSocket integration
const websocketHandler = {
  async handleComplianceEvent(event: ComplianceEvent) {
    // Broadcast to compliance dashboard clients
    this.broadcast('compliance-events', event);
    
    // Send alerts for critical violations
    if (event.type === 'VIOLATION_DETECTED' && event.data.severity === 'Critical') {
      await this.sendCriticalAlert(event.data);
    }
  }
};
```

### 3. Monitoring Integration

Integration with existing monitoring stack:

```typescript
// Metrics collection
const complianceMetrics = {
  async collectMetrics() {
    return {
      compliance_score: await this.complianceService.getComplianceScore(),
      open_violations: await this.getOpenViolationCount(),
      policies_active: await this.getActivePolicyCount(),
      last_scan: await this.getLastScanTimestamp()
    };
  }
};

// Alert integration
const alertHandler = {
  async handleCriticalViolation(violation: ComplianceViolation) {
    // Send to PagerDuty
    await this.pagerDuty.trigger({
      service_key: process.env.PAGERDUTY_SERVICE_KEY,
      event_type: 'trigger',
      description: `Critical Compliance Violation: ${violation.description}`,
      details: violation
    });
    
    // Send to Slack
    await this.slack.sendMessage({
      channel: '#compliance-alerts',
      text: `🚨 Critical Compliance Violation Detected`,
      attachments: [{
        color: 'danger',
        fields: [
          { title: 'Violation Type', value: violation.violationType, short: true },
          { title: 'Severity', value: violation.severity, short: true },
          { title: 'Lead ID', value: violation.leadId || 'N/A', short: true }
        ]
      }]
    });
  }
};
```

## Testing Guide

### 1. Unit Testing

Run compliance service tests:
```bash
cd /home/engine/project/apps/api
npm test -- --testPathPattern=compliance
```

**Test Coverage Areas:**
- Policy validation logic
- Violation detection
- Audit logging accuracy
- Compliance score calculations
- Multi-domain policy support

### 2. Integration Testing

```typescript
// Integration test example
describe('Compliance Integration', () => {
  it('should validate lead through entire compliance pipeline', async () => {
    // Create test lead
    const leadData = {
      id: 'test-lead-123',
      email: 'test@example.com',
      state: 'CA',
      consentGiven: false // This should trigger a violation
    };
    
    // Validate compliance
    const validation = await complianceService.validateLeadCompliance(leadData);
    
    // Should detect violation
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toHaveLength(1);
    expect(validation.errors[0].code).toBe('COMPLIANCE_VIOLATION');
    
    // Check violation was logged
    const violations = await complianceService.checkViolations('Lead', leadData.id);
    expect(violations).toHaveLength(1);
    
    // Check audit log was created
    const auditLogs = await auditService.getAuditTrail({
      entityId: leadData.id,
      action: 'LeadCreated'
    });
    expect(auditLogs).toHaveLength(1);
  });
});
```

### 3. Compliance Validation Testing

Test specific regulatory requirements:

```typescript
// GDPR compliance test
describe('GDPR Compliance', () => {
  it('should detect missing consent for EU leads', () => {
    const euLead = {
      jurisdiction: 'EU',
      consentGiven: false
    };
    
    const result = policyEngine.validateGDPR({}, euLead, {
      name: 'Consent Required'
    });
    
    expect(result).toContain('GDPR consent not obtained');
  });
  
  it('should detect expired data retention', () => {
    const leadWithExpiredData = {
      retentionExpiry: new Date(Date.now() - 86400000).toISOString() // 1 day ago
    };
    
    const result = policyEngine.validateGDPR({}, leadWithExpiredData, {
      name: 'Data Retention'
    });
    
    expect(result).toContain('GDPR data retention period has expired');
  });
});
```

## Deployment Considerations

### 1. Database Migration

```bash
# Apply compliance framework migration
npx prisma migrate dev --name add_compliance_framework

# Generate Prisma client
npx prisma generate

# Seed compliance policies
npm run seed:compliance
```

### 2. Infrastructure Requirements

**Database:**
- PostgreSQL 12+ with JSON support
- Adequate storage for audit logs (plan for 7-year retention)
- Regular backups with point-in-time recovery

**Memory & CPU:**
- 2GB RAM minimum for compliance services
- CPU scaling based on lead volume

**Monitoring:**
- Disk space monitoring for audit log growth
- Database performance monitoring
- Compliance score trending

### 3. Security Considerations

**Data Protection:**
- Audit logs are immutable and tamper-resistant
- Encryption at rest for sensitive compliance data
- Role-based access control for policy management

**Compliance Monitoring:**
- Regular integrity checks for audit logs
- Automated compliance scanning
- Anomaly detection for unusual patterns

### 4. Performance Optimization

**Database Indexing:**
```sql
-- Optimize common query patterns
CREATE INDEX CONCURRENTLY idx_compliance_audit_logs_timestamp 
ON "ComplianceAuditLog"("timestamp");

CREATE INDEX CONCURRENTLY idx_compliance_violations_status_severity 
ON "ComplianceViolation"("status", "severity");
```

**Caching Strategy:**
- Cache compliance scores
- Cache active policies
- Cache violation counts

**Batch Processing:**
- Process violations in batches
- Use background jobs for compliance scanning
- Implement rate limiting for API endpoints

## Maintenance and Operations

### 1. Regular Maintenance Tasks

**Daily:**
- Monitor compliance scores
- Review critical violations
- Check audit log integrity

**Weekly:**
- Run compliance trend analysis
- Update policy effectiveness metrics
- Review and update alert thresholds

**Monthly:**
- Compliance status assessment
- Policy review and updates
- Regulatory requirement updates

### 2. Troubleshooting

**Common Issues:**

1. **High Violation Rate**
   - Check policy configuration
   - Review validation rules
   - Verify jurisdiction settings

2. **Audit Log Performance**
   - Check database indexes
   - Monitor query performance
   - Consider archiving old logs

3. **Compliance Score Drops**
   - Investigate root cause violations
   - Review policy changes
   - Check data quality issues

### 3. Monitoring and Alerting

**Key Metrics to Monitor:**
- Overall compliance score
- Number of open violations
- Policy effectiveness rates
- Audit log integrity status
- Compliance scan performance

**Alert Conditions:**
- Compliance score below threshold
- Critical violations detected
- Audit integrity check failures
- System performance degradation

## Future Enhancements

### 1. Advanced Features

**Machine Learning Integration:**
- Predictive violation detection
- Anomaly detection algorithms
- Compliance trend forecasting

**Advanced Analytics:**
- Compliance cost analysis
- Policy ROI calculations
- Risk assessment modeling

**External Integrations:**
- Regulatory body reporting
- Third-party compliance tools
- Industry standard certifications

### 2. Scalability Improvements

**Performance Optimization:**
- Distributed compliance processing
- Caching layer implementation
- Database sharding for audit logs

**Enhanced Monitoring:**
- Real-time compliance dashboards
- Advanced alerting rules
- Compliance health scoring

This comprehensive compliance framework provides a solid foundation for regulatory compliance across multiple domains while maintaining flexibility for future enhancements and regulatory changes.