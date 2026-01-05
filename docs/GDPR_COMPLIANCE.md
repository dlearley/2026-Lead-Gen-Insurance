# GDPR Compliance Guide

## Overview

This document outlines GDPR (General Data Protection Regulation) compliance requirements and how to implement them in Lead Management System.

## GDPR Applicability

### When GDPR Applies

GDPR applies when processing personal data of individuals in the EU, regardless of where your organization is located.

### Key Principles

1. **Lawfulness, Fairness, and Transparency**
2. **Purpose Limitation**
3. **Data Minimization**
4. **Accuracy**
5. **Storage Limitation**
6. **Integrity and Confidentiality**
7. **Accountability**

## Data Subject Rights

### Right to be Informed (Article 13 & 14)

**Implementation**:
- Clear privacy notice
- Information about data processing
- Purpose of data collection
- Legal basis for processing
- Data retention periods
- Data recipient information

**Privacy Notice**:
```markdown
# Privacy Policy

**What We Collect**
- Personal information: Name, email, phone, address
- Usage data: How you use our services
- Device information: Browser, IP address

**How We Use It**
- Provide and improve our services
- Communicate with you
- Analyze usage patterns
- Prevent fraud and abuse

**Legal Basis**
- Consent: You explicitly agree
- Contract: Necessary for service delivery
- Legitimate Interest: For business operations

**Your Rights**
- Access your data
- Correct inaccuracies
- Request deletion
- Object to processing
- Data portability
- Withdraw consent
- Lodge a complaint

[Contact Information]
[Regulatory Authority Contact]
```

### Right of Access (Article 15)

**Implementation**:
- API endpoint for data requests
- Identity verification required
- 30-day response timeframe
- Comprehensive data export
- Clear and understandable format

**Data Export API**:
```typescript
// packages/core/src/privacy/data-export.ts
export async function exportUserData(userId: string): Promise<DataExport> {
  // Verify identity
  const user = await verifyIdentity(userId);

  // Collect all user data
  const userData = {
    profile: await getUserProfile(userId),
    leads: await getUserLeads(userId),
    notes: await getUserNotes(userId),
    emails: await getUserEmails(userId),
    activities: await getUserActivities(userId),
    metadata: {
      exportDate: new Date().toISOString(),
      dataController: COMPANY_NAME,
      dataProtectionOfficer: DPO_CONTACT,
    },
  };

  // Log the access
  auditLogger.logDataAccess({
    userId: userId,
    resource: 'user_data_export',
    action: 'export',
    result: 'success',
    metadata: { requestId: generateId() },
  });

  return userData;
}
```

### Right to Rectification (Article 16)

**Implementation**:
- Easy-to-use correction interface
- Validation of corrections
- Update all data copies
- Notification of corrections

**Data Correction API**:
```typescript
export async function correctUserData(
  userId: string,
  corrections: Partial<UserData>
): Promise<void> {
  // Verify identity and consent
  await verifyIdentity(userId);

  // Validate corrections
  const validated = validateUserData(corrections);

  // Update data
  await updateUserData(userId, validated);

  // Update all related records
  await syncToAllSystems(userId, validated);

  // Log the correction
  auditLogger.logDataModification({
    userId: userId,
    resource: 'user_data',
    resourceId: userId,
    action: 'correction',
    result: 'success',
    metadata: { fields: Object.keys(validated) },
  });
}
```

### Right to Erasure (Right to be Forgotten) (Article 17)

**Implementation**:
- Clear deletion request process
- 30-day response timeframe
- Delete from all systems
- Verify no legal holds
- Notify third parties

**Data Deletion API**:
```typescript
// packages/core/src/privacy/data-deletion.ts
export async function deleteUserData(
  userId: string,
  reason: string
): Promise<DeletionResult> {
  // Verify identity
  await verifyIdentity(userId);

  // Check for legal holds
  if (await hasLegalHold(userId)) {
    throw new Error('Cannot delete data subject to legal hold');
  }

  // Delete from primary systems
  const deletions = await Promise.allSettled([
    deleteUserProfile(userId),
    deleteUserLeads(userId),
    deleteUserNotes(userId),
    deleteUserEmails(userId),
    deleteUserActivities(userId),
    deleteUserAuthTokens(userId),
    deleteFromCache(userId),
  ]);

  // Delete from backups (after retention period)
  await scheduleBackupDeletion(userId, BACKUP_RETENTION_DAYS);

  // Notify third parties
  await notifyThirdPartiesOfDeletion(userId);

  // Log the deletion
  auditLogger.logDataDeletion({
    userId: userId,
    resource: 'user_data',
    resourceId: userId,
    action: 'complete_deletion',
    result: 'success',
    reason: reason,
  });

  return {
    userId,
    deletionDate: new Date(),
    backupDeletionDate: new Date(Date.now() + BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000),
    systemsDeleted: deletions.map(d => d.status === 'fulfilled'),
  };
}
```

### Right to Restrict Processing (Article 18)

**Implementation**:
- Mark data as restricted
- Maintain data but don't process
- Identity verification
- Clear request process

**Data Restriction API**:
```typescript
export async function restrictDataProcessing(
  userId: string,
  reason: string
): Promise<void> {
  // Verify identity
  await verifyIdentity(userId);

  // Set restriction flag
  await setUserRestriction(userId, {
    restricted: true,
    reason: reason,
    restrictedAt: new Date(),
  });

  // Update data processing rules
  await updateProcessingRules(userId, 'read-only');

  // Log the restriction
  auditLogger.logAdminAction({
    userId: userId,
    action: 'restrict_processing',
    result: 'success',
    metadata: { reason },
  });
}
```

### Right to Data Portability (Article 20)

**Implementation**:
- Export in machine-readable format
- Common format (JSON, CSV)
- Direct transfer to other controllers
- 30-day response timeframe

**Data Portability Service**:
```typescript
export async function exportDataForPortability(
  userId: string,
  format: 'json' | 'csv' | 'xml'
): Promise<Buffer> {
  const userData = await exportUserData(userId);

  switch (format) {
    case 'json':
      return Buffer.from(JSON.stringify(userData, null, 2), 'utf8');

    case 'csv':
      return convertToCSV(userData);

    case 'xml':
      return convertToXML(userData);

    default:
      throw new Error('Unsupported format');
  }
}

export async function transferDataToController(
  userId: string,
  targetController: string,
  apiEndpoint: string
): Promise<void> {
  // Verify user consent
  const consent = await getConsent(userId, 'data_transfer');
  if (!consent || !consent.granted) {
    throw new Error('User has not consented to data transfer');
  }

  // Export data
  const userData = await exportUserData(userId);

  // Transfer to target controller
  await axios.post(apiEndpoint, {
    userData,
    sourceController: COMPANY_NAME,
    transferDate: new Date().toISOString(),
    consentId: consent.id,
  });

  // Log the transfer
  auditLogger.logDataDeletion({
    userId: userId,
    action: 'data_transfer',
    result: 'success',
    resource: 'user_data',
    resourceId: userId,
    metadata: {
      targetController,
      apiEndpoint: maskEndpoint(apiEndpoint),
    },
  });
}
```

### Right to Object (Article 21)

**Implementation**:
- Clear objection process
- Stop processing immediately
- Verify legitimate interest vs. objection
- Inform of rights

**Objection API**:
```typescript
export async function objectToProcessing(
  userId: string,
  processingType: string,
  reason: string
): Promise<void> {
  // Verify identity
  await verifyIdentity(userId);

  // Log objection
  await recordObjection(userId, {
    processingType,
    reason,
    objectedAt: new Date(),
  });

  // Stop processing (unless required by law)
  if (!await isRequiredByLaw(processingType)) {
    await stopProcessing(userId, processingType);
  } else {
    await notifyUserOfLegalRequirement(userId, processingType);
  }

  // Log the objection
  auditLogger.logPrivacyEvent({
    userId: userId,
    action: 'objection_to_processing',
    result: 'success',
    metadata: { processingType, reason },
  });
}
```

## Consent Management

### Consent Implementation

**Consent Model**:
```typescript
interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  grantedAt?: Date;
  withdrawnAt?: Date;
  purpose: string;
  legalBasis: 'consent' | 'contract' | 'legitimate_interest' | 'legal_obligation';
  revocable: boolean;
  version: string;
}

export enum ConsentType {
  MARKETING_COMMUNICATIONS = 'marketing_communications',
  DATA_PROCESSING = 'data_processing',
  DATA_SHARING = 'data_sharing',
  ANALYTICS = 'analytics',
  COOKIES = 'cookies',
}

export class ConsentManager {
  async recordConsent(
    userId: string,
    consentType: ConsentType,
    granted: boolean,
    purpose: string
  ): Promise<ConsentRecord> {
    const consent: ConsentRecord = {
      id: generateId(),
      userId,
      consentType,
      granted,
      grantedAt: granted ? new Date() : undefined,
      withdrawnAt: granted ? undefined : new Date(),
      purpose,
      legalBasis: 'consent',
      revocable: true,
      version: '1.0',
    };

    await this.saveConsent(consent);

    auditLogger.logPrivacyEvent({
      userId,
      action: granted ? 'consent_granted' : 'consent_withdrawn',
      result: 'success',
      resource: consentType,
      metadata: { purpose, version: consent.version },
    });

    return consent;
  }

  async checkConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    const consent = await this.getLatestConsent(userId, consentType);

    if (!consent) {
      return false; // No consent = no processing
    }

    if (!consent.granted) {
      return false; // Consent withdrawn
    }

    if (consent.revocable && consent.withdrawnAt) {
      return false; // Consent was withdrawn
    }

    return true;
  }

  async withdrawConsent(userId: string, consentType: ConsentType): Promise<void> {
    const consent = await this.getLatestConsent(userId, consentType);

    if (!consent) {
      throw new Error('No consent record found');
    }

    consent.granted = false;
    consent.withdrawnAt = new Date();
    await this.saveConsent(consent);

    auditLogger.logPrivacyEvent({
      userId,
      action: 'consent_withdrawn',
      result: 'success',
      resource: consentType,
    });
  }
}
```

## Data Minimization

### Implementation Principles

```typescript
// Only collect necessary data
interface LeadFormData {
  // Required for business purpose
  email: string;        // Required for communication
  firstName?: string;    // Optional
  lastName?: string;     // Optional
  phone?: string;        // Optional

  // NOT collected unless needed
  // age: number;        // Only collect if needed for product
  // income: number;      // Only collect if needed for eligibility
  // ssn: string;        // Never collect SSN for leads
}
```

### Data Validation

```typescript
// Validate minimization
function validateDataMinimization(data: any, purpose: string): void {
  const requiredFields = REQUIRED_FIELDS[purpose];
  const providedFields = Object.keys(data);

  const unnecessaryFields = providedFields.filter(
    field => !requiredFields.includes(field)
  );

  if (unnecessaryFields.length > 0) {
    logger.warn('Unnecessary fields collected', {
      unnecessaryFields,
      purpose,
    });
  }
}

const REQUIRED_FIELDS = {
  lead_creation: ['email', 'insuranceType', 'source'],
  user_registration: ['email', 'password', 'firstName', 'lastName'],
  lead_contact: ['message', 'leadId'],
};
```

## Data Retention

### Retention Policy

```typescript
export interface DataRetentionPolicy {
  dataType: string;
  retentionPeriod: number; // in days
  retentionReason: string;
  legalBasis: string;
}

export const RETENTION_POLICIES: DataRetentionPolicy[] = [
  {
    dataType: 'lead_inactive',
    retentionPeriod: 365, // 1 year
    retentionReason: 'Business records',
    legalBasis: 'legitimate_interest',
  },
  {
    dataType: 'user_data',
    retentionPeriod: 2555, // 7 years
    retentionReason: 'Legal requirement',
    legalBasis: 'legal_obligation',
  },
  {
    dataType: 'audit_logs',
    retentionPeriod: 90,
    retentionReason: 'Security and compliance',
    legalBasis: 'legitimate_interest',
  },
  {
    dataType: 'marketing_emails',
    retentionPeriod: 1825, // 5 years
    retentionReason: 'Marketing records',
    legalBasis: 'legitimate_interest',
  },
];

export class RetentionPolicyManager {
  async applyRetentionPolicies(): Promise<void> {
    for (const policy of RETENTION_POLICIES) {
      await this.deleteExpiredData(policy);
    }
  }

  private async deleteExpiredData(policy: DataRetentionPolicy): Promise<void> {
    const cutoffDate = new Date(
      Date.now() - policy.retentionPeriod * 24 * 60 * 60 * 1000
    );

    logger.info('Applying retention policy', {
      dataType: policy.dataType,
      cutoffDate: cutoffDate.toISOString(),
    });

    // Delete expired data
    const deleted = await this.deleteDataBefore(
      policy.dataType,
      cutoffDate
    );

    logger.info('Data deleted per retention policy', {
      dataType: policy.dataType,
      recordsDeleted: deleted,
    });

    auditLogger.logAdminAction({
      userId: 'system',
      action: 'retention_policy_application',
      resource: policy.dataType,
      result: 'success',
      metadata: {
        recordsDeleted: deleted,
        cutoffDate: cutoffDate.toISOString(),
      },
    });
  }
}
```

## Data Protection by Design

### Privacy Impact Assessment (PIA)

**When PIA is Required**:
- New technologies or processing methods
- Large-scale processing
- Special category data
- Systematic monitoring
- Profiling on large scale

**PIA Template**:
```markdown
# Privacy Impact Assessment

**Project**: [Project Name]
**Date**: [Date]
**Assessor**: [Name]

## 1. Processing Description
- What data are you processing?
- Why are you processing it?
- How will you process it?

## 2. Necessity and Proportionality
- Is this processing necessary?
- Is it proportionate to the purpose?
- Are there less intrusive alternatives?

## 3. Risks to Individuals
- Privacy risks
- Discrimination risks
- Reputational risks

## 4. Mitigation Measures
- Technical measures
- Organizational measures
- Legal measures

## 5. Compliance Assessment
- Does it meet GDPR principles?
- Are legal bases identified?
- Are data subject rights supported?

## 6. Approval
[ ] PIA completed
[ ] Risks assessed and mitigated
[ ] Stakeholders consulted
[ ] Approval obtained
```

### Privacy by Default Settings

```typescript
// Default privacy settings
export const DEFAULT_PRIVACY_SETTINGS = {
  // Opt-in, not opt-out
  marketingEmails: false,
  dataSharing: false,
  analytics: false,
  cookies: false,

  // Most private by default
  profileVisibility: 'private',
  searchHistory: false,
  activityTracking: 'minimal',
};

// Apply defaults on registration
async function createUser(data: UserData): Promise<User> {
  const user = {
    ...data,
    privacySettings: DEFAULT_PRIVACY_SETTINGS,
    consents: [], // No consent until granted
  };

  return await saveUser(user);
}
```

## Data Transfers

### Cross-Border Transfers

**Requirements**:
- Adequacy decision from EU (if country on adequacy list)
- Standard Contractual Clauses (SCCs) for other countries
- Binding Corporate Rules (BCRs) for internal transfers

**Implementation**:
```typescript
interface DataTransfer {
  id: string;
  dataController: string;
  destinationCountry: string;
  dataTypes: string[];
  transferMechanism: 'adequacy' | 'scc' | 'bcr' | 'gdpr';
  sccVersion?: string;
  transferDate: Date;
  purpose: string;
}

export async function transferDataToThirdCountry(
  userId: string,
  destinationCountry: string,
  dataTypes: string[]
): Promise<void> {
  // Check if country has adequacy decision
  const hasAdequacy = await checkAdequacy(destinationCountry);

  const transferMechanism = hasAdequacy ? 'adequacy' : 'scc';

  // If using SCCs, ensure they're in place
  if (transferMechanism === 'scc') {
    await verifySCCsInPlace(destinationCountry);
  }

  // Log the transfer
  const transfer: DataTransfer = {
    id: generateId(),
    dataController: COMPANY_NAME,
    destinationCountry,
    dataTypes,
    transferMechanism,
    sccVersion: transferMechanism === 'scc' ? '2021' : undefined,
    transferDate: new Date(),
    purpose: 'service_delivery',
  };

  await saveTransferRecord(transfer);

  auditLogger.logPrivacyEvent({
    userId,
    action: 'international_data_transfer',
    result: 'success',
    metadata: {
      destinationCountry,
      transferMechanism,
      dataTypes,
    },
  });
}
```

## Data Breach Notification

### Breach Notification Requirements

**To Supervisory Authority**:
- Within 72 hours of becoming aware
- Include: Nature, categories, approximate numbers, consequences, measures taken
- Without undue delay if high risk

**To Data Subjects**:
- Without undue delay if high risk
- Include: Nature, likely consequences, measures taken
- Clear and plain language

### Breach Response Procedure

```typescript
interface DataBreach {
  id: string;
  breachDate: Date;
  discoveryDate: Date;
  affectedRecords: number;
  affectedUsers: string[];
  dataTypes: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  measuresTaken: string[];
  notifiedAuthority: boolean;
  notifiedUsers: boolean;
}

export class DataBreachManager {
  async reportBreach(breach: Partial<DataBreach>): Promise<void> {
    const breachRecord: DataBreach = {
      id: generateId(),
      ...breach,
      discoveryDate: new Date(),
      notifiedAuthority: false,
      notifiedUsers: false,
    };

    await saveBreachRecord(breachRecord);

    // Assess severity
    const riskLevel = await assessBreachRisk(breachRecord);

    if (riskLevel === 'high' || riskLevel === 'critical') {
      // Notify authority within 72 hours
      await this.notifyAuthority(breachRecord);

      // Notify affected individuals without undue delay
      await this.notifyAffectedUsers(breachRecord);
    }

    // Notify DPO
    await this.notifyDPO(breachRecord);

    // Document the breach
    await this.documentBreach(breachRecord);
  }

  private async notifyAuthority(breach: DataBreach): Promise<void> {
    const notification = {
      dataController: COMPANY_NAME,
      dataProtectionOfficer: DPO_CONTACT,
      breachDescription: breach.description,
      dataCategories: breach.dataTypes,
      approximateNumber: breach.affectedRecords,
      likelyConsequences: this.assessConsequences(breach),
      measuresTaken: breach.measuresTaken,
    };

    await sendToSupervisoryAuthority(notification);

    breach.notifiedAuthority = true;
    await saveBreachRecord(breach);
  }

  private async notifyAffectedUsers(breach: DataBreach): Promise<void> {
    for (const userId of breach.affectedUsers) {
      await sendBreachNotification(userId, {
        breachDescription: breach.description,
        likelyConsequences: this.assessConsequences(breach),
        measuresTaken: breach.measuresTaken,
        contactInformation: COMPANY_SUPPORT,
        rightToComplain: true,
        rightToCompensation: true,
      });
    }

    breach.notifiedUsers = true;
    await saveBreachRecord(breach);
  }
}
```

## Data Protection Officer (DPO)

### DPO Responsibilities

- Monitor compliance with GDPR
- Advise on data protection obligations
- Cooperate with supervisory authority
- Point of contact for data subjects
- Conduct PIAs
- Maintain records of processing activities

### DPO Contact Information

```
Data Protection Officer
[Name]
[Email]
[Phone]
[Address]
```

## Implementation Checklist

### GDPR Compliance Checklist

- [ ] Privacy policy published and accessible
- [ ] Cookie consent implemented
- [ ] Data subject rights implemented
- [ ] Data access request API (30-day response)
- [ ] Data deletion request API (30-day response)
- [ ] Data correction API
- [ ] Data portability API
- [ ] Consent management system
- [ ] Data minimization in design
- [ ] Retention policy defined and implemented
- [ ] Data encryption (at rest and in transit)
- [ ] Access controls implemented
- [ ] Audit logging enabled
- [ ] Breach notification procedures
- [ ] DPIA process for high-risk processing
- [ ] DPO appointed
- [ ] Records of processing activities
- [ ] Cross-border transfer mechanisms
- [ ] Third-party contracts with GDPR clauses
- [ ] Regular GDPR training
- [ ] Compliance monitoring

## References

- [GDPR Official Text](https://gdpr-info.eu/)
- [ICO GDPR Guide](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/)
- [EDPB Guidelines](https://edpb.europa.eu/)

---

**Document Owner**: Data Protection Officer
**Last Updated**: 2024-01-05
**Review Frequency**: Annually
**Version**: 1.0
