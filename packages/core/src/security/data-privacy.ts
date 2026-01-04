/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/require-await, @typescript-eslint/prefer-nullish-coalescing */
import { logger } from '../logger.js';

export interface ConsentRecord {
  userId: string;
  purpose: string;
  granted: boolean;
  timestamp: Date;
  expiresAt?: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface DataRetentionPolicy {
  dataType: string;
  retentionDays: number;
  deletionMethod: 'hard' | 'soft' | 'anonymize';
}

export interface DataExportRequest {
  userId: string;
  format: 'json' | 'csv' | 'pdf';
  includeDeleted?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface DataDeletionRequest {
  userId: string;
  reason?: string;
  retainAnalytics?: boolean;
  requestedAt: Date;
}

export class DataPrivacyService {
  private retentionPolicies: Map<string, DataRetentionPolicy> = new Map();
  private consentRecords: Map<string, ConsentRecord[]> = new Map();

  constructor() {
    this.initializeDefaultPolicies();
  }

  private initializeDefaultPolicies(): void {
    const defaultPolicies: DataRetentionPolicy[] = [
      { dataType: 'lead', retentionDays: 365, deletionMethod: 'soft' },
      { dataType: 'user', retentionDays: 730, deletionMethod: 'soft' },
      { dataType: 'audit_log', retentionDays: 2555, deletionMethod: 'hard' },
      { dataType: 'session', retentionDays: 30, deletionMethod: 'hard' },
      { dataType: 'analytics', retentionDays: 365, deletionMethod: 'anonymize' },
    ];

    for (const policy of defaultPolicies) {
      this.retentionPolicies.set(policy.dataType, policy);
    }
  }

  setRetentionPolicy(policy: DataRetentionPolicy): void {
    this.retentionPolicies.set(policy.dataType, policy);
    logger.info('Data retention policy updated', { dataType: policy.dataType });
  }

  getRetentionPolicy(dataType: string): DataRetentionPolicy | undefined {
    return this.retentionPolicies.get(dataType);
  }

  recordConsent(consent: Omit<ConsentRecord, 'timestamp'>): void {
    const record: ConsentRecord = {
      ...consent,
      timestamp: new Date(),
    };

    const userConsents = this.consentRecords.get(consent.userId) || [];
    userConsents.push(record);
    this.consentRecords.set(consent.userId, userConsents);

    logger.info('Consent recorded', {
      userId: consent.userId,
      purpose: consent.purpose,
      granted: consent.granted,
    });
  }

  getConsent(userId: string, purpose: string): ConsentRecord | undefined {
    const userConsents = this.consentRecords.get(userId) || [];
    return userConsents
      .filter((c) => c.purpose === purpose)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  }

  hasValidConsent(userId: string, purpose: string): boolean {
    const consent = this.getConsent(userId, purpose);

    if (!consent || !consent.granted) {
      return false;
    }

    if (consent.expiresAt && consent.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  withdrawConsent(userId: string, purpose: string): void {
    this.recordConsent({
      userId,
      purpose,
      granted: false,
    });

    logger.info('Consent withdrawn', { userId, purpose });
  }

  anonymizeData<T extends Record<string, any>>(data: T, fieldsToAnonymize: (keyof T)[]): T {
    const anonymized = { ...data };

    for (const field of fieldsToAnonymize) {
      if (anonymized[field] !== undefined && anonymized[field] !== null) {
        const value = anonymized[field];

        if (typeof value === 'string') {
          if (field === 'email' || String(field).includes('email')) {
            anonymized[field] = this.anonymizeEmail(value) as T[keyof T];
          } else if (field === 'phone' || String(field).includes('phone')) {
            anonymized[field] = this.anonymizePhone(value) as T[keyof T];
          } else if (
            field === 'ssn' ||
            String(field).toLowerCase().includes('ssn') ||
            String(field).toLowerCase().includes('tax')
          ) {
            anonymized[field] = this.anonymizeSSN(value) as T[keyof T];
          } else if (String(field).toLowerCase().includes('name')) {
            anonymized[field] = this.maskName(value) as T[keyof T];
          } else {
            anonymized[field] = this.maskString(value) as T[keyof T];
          }
        } else if (typeof value === 'number') {
          anonymized[field] = 0 as T[keyof T];
        } else if (value && typeof value === 'object' && 'getTime' in value) {
          // Check if it's a Date-like object
          anonymized[field] = new Date(0) as T[keyof T];
        }
      }
    }

    return anonymized;
  }

  private anonymizeEmail(email: string): string {
    const at = email.lastIndexOf('@');
    if (at <= 0 || at === email.length - 1) return '***@***';
    const domain = email.slice(at + 1);
    return `***@${domain}`;
  }

  private anonymizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '***-***-****';

    const lastFour = digits.slice(-4);
    return `***-***-${lastFour}`;
  }

  private anonymizeSSN(ssn: string): string {
    const digits = ssn.replace(/\D/g, '');
    if (digits.length < 4) return '***-**-****';

    const lastFour = digits.slice(-4);
    return `***-**-${lastFour}`;
  }

  private maskName(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) return '***';
    return `${trimmed[0]}***`;
  }

  private maskString(str: string): string {
    const trimmed = str.trim();
    if (!trimmed) return '***';
    if (trimmed.length <= 2) return '***';
    return `${trimmed[0]}${'*'.repeat(Math.min(trimmed.length - 1, 6))}`;
  }

  identifyPII<T extends Record<string, any>>(data: T): (keyof T)[] {
    const piiFields: (keyof T)[] = [];
    const piiPatterns = [
      'email',
      'phone',
      'ssn',
      'social',
      'license',
      'passport',
      'credit',
      'card',
      'account',
      'address',
      'name',
      'birth',
      'age',
      'gender',
      'race',
      'ethnicity',
      'religion',
      'medical',
      'health',
      'biometric',
    ];

    for (const key of Object.keys(data)) {
      const keyLower = key.toLowerCase();
      if (piiPatterns.some((pattern) => keyLower.includes(pattern))) {
        piiFields.push(key as keyof T);
      }
    }

    return piiFields;
  }

  async exportUserData(request: DataExportRequest): Promise<any> {
    logger.info('Data export requested', {
      userId: request.userId,
      format: request.format,
    });

    // This is a placeholder - actual implementation would query databases
    const userData = {
      userId: request.userId,
      exportDate: new Date().toISOString(),
      format: request.format,
      data: {
        // Would include actual user data from databases
        profile: {},
        leads: [],
        activities: [],
        consents: this.consentRecords.get(request.userId) || [],
      },
    };

    return userData;
  }

  async requestDataDeletion(request: DataDeletionRequest): Promise<void> {
    logger.info('Data deletion requested', {
      userId: request.userId,
      reason: request.reason,
      retainAnalytics: request.retainAnalytics,
    });

    // This is a placeholder - actual implementation would:
    // 1. Mark user data for deletion
    // 2. Schedule deletion job
    // 3. Anonymize analytics if retainAnalytics is true
    // 4. Send confirmation email
    // 5. Log the deletion request in audit trail

    // Record the deletion request
    this.recordConsent({
      userId: request.userId,
      purpose: 'data_deletion',
      granted: true,
      ipAddress: undefined,
      userAgent: undefined,
    });
  }

  shouldDeleteData(dataType: string, createdAt: Date): boolean {
    const policy = this.retentionPolicies.get(dataType);
    if (!policy) {
      return false;
    }

    const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return ageInDays > policy.retentionDays;
  }

  generatePrivacyNotice(purposes: string[]): string {
    return `
# Privacy Notice

We collect and process your personal data for the following purposes:

${purposes.map((p) => `- ${p}`).join('\n')}

Your data will be:
- Stored securely with encryption
- Retained according to our data retention policies
- Never sold to third parties
- Accessible to you upon request

Your Rights:
- Right to access your data
- Right to rectification
- Right to erasure (right to be forgotten)
- Right to data portability
- Right to withdraw consent

To exercise your rights, please contact our Data Protection Officer.

Last updated: ${new Date().toISOString()}
    `.trim();
  }

  generateGDPRReport(): Record<string, any> {
    return {
      generatedAt: new Date().toISOString(),
      retentionPolicies: Array.from(this.retentionPolicies.values()),
      totalConsentRecords: Array.from(this.consentRecords.values()).reduce(
        (sum, records) => sum + records.length,
        0
      ),
      consentsByPurpose: this.aggregateConsentsByPurpose(),
      complianceChecks: {
        hasRetentionPolicies: this.retentionPolicies.size > 0,
        hasConsentTracking: this.consentRecords.size > 0,
        hasDataExportCapability: true,
        hasDataDeletionCapability: true,
      },
    };
  }

  private aggregateConsentsByPurpose(): Record<string, { granted: number; denied: number }> {
    const aggregated: Record<string, { granted: number; denied: number }> = {};

    for (const records of this.consentRecords.values()) {
      for (const record of records) {
        if (!aggregated[record.purpose]) {
          aggregated[record.purpose] = { granted: 0, denied: 0 };
        }
        const stats = aggregated[record.purpose];
        if (stats) {
          if (record.granted) {
            stats.granted++;
          } else {
            stats.denied++;
          }
        }
      }
    }

    return aggregated;
  }
}

export const dataPrivacyService = new DataPrivacyService();
