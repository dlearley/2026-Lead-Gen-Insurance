/* eslint-disable @typescript-eslint/no-explicit-any */

export enum DataClassification {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  HIGHLY_CONFIDENTIAL = 'highly_confidential',
  PII = 'pii',
  PHI = 'phi',
  PAYMENT_CARD = 'payment_card',
  TRADE_SECRET = 'trade_secret',
}

export type ClassificationEntity = 'user' | 'lead' | 'policy' | 'claim' | 'agent' | 'audit_log' | 'unknown';

export interface FieldClassification {
  classification: DataClassification;
  description?: string;
  encryptionRequired?: boolean;
}

export type ClassificationMatrix = Record<ClassificationEntity, Record<string, FieldClassification>>;

export const defaultClassificationMatrix: ClassificationMatrix = {
  user: {
    email: { classification: DataClassification.PII, encryptionRequired: true },
    firstName: { classification: DataClassification.PII },
    lastName: { classification: DataClassification.PII },
    phone: { classification: DataClassification.PII, encryptionRequired: true },
    address: { classification: DataClassification.PII, encryptionRequired: true },
  },
  lead: {
    source: { classification: DataClassification.INTERNAL },
    email: { classification: DataClassification.PII, encryptionRequired: true },
    phone: { classification: DataClassification.PII, encryptionRequired: true },
    firstName: { classification: DataClassification.PII },
    lastName: { classification: DataClassification.PII },
    street: { classification: DataClassification.PII, encryptionRequired: true },
    city: { classification: DataClassification.PII },
    state: { classification: DataClassification.PII },
    zipCode: { classification: DataClassification.PII },
    dateOfBirth: { classification: DataClassification.PHI, encryptionRequired: true },
    policyNumber: { classification: DataClassification.CONFIDENTIAL },
    status: { classification: DataClassification.INTERNAL },
  },
  policy: {
    policyNumber: { classification: DataClassification.CONFIDENTIAL },
    premium: { classification: DataClassification.CONFIDENTIAL },
    commission: { classification: DataClassification.CONFIDENTIAL },
  },
  claim: {
    amount: { classification: DataClassification.CONFIDENTIAL },
    medicalRecords: { classification: DataClassification.PHI, encryptionRequired: true },
  },
  agent: {
    email: { classification: DataClassification.PII, encryptionRequired: true },
    phone: { classification: DataClassification.PII, encryptionRequired: true },
    licenseNumber: { classification: DataClassification.CONFIDENTIAL },
    commission: { classification: DataClassification.CONFIDENTIAL },
  },
  audit_log: {
    old_values: { classification: DataClassification.CONFIDENTIAL, encryptionRequired: true },
    new_values: { classification: DataClassification.CONFIDENTIAL, encryptionRequired: true },
    error_message: { classification: DataClassification.INTERNAL },
  },
  unknown: {},
};

export function getFieldClassification(
  entity: ClassificationEntity,
  field: string,
  matrix: ClassificationMatrix = defaultClassificationMatrix
): FieldClassification {
  return (
    matrix[entity]?.[field] ??
    matrix[entity]?.[field.toLowerCase()] ?? {
      classification: DataClassification.INTERNAL,
    }
  );
}

export function discoverSensitiveFields<T extends Record<string, any>>(
  data: T,
  matrix?: ClassificationMatrix
): Array<{ field: keyof T; inferred: DataClassification }>
{
  const findings: Array<{ field: keyof T; inferred: DataClassification }> = [];

  const patterns: Array<{ rx: RegExp; classification: DataClassification }> = [
    { rx: /@/i, classification: DataClassification.PII },
    { rx: /\b\d{3}-?\d{2}-?\d{4}\b/, classification: DataClassification.HIGHLY_CONFIDENTIAL },
    { rx: /\b(?:\d[ -]*?){13,19}\b/, classification: DataClassification.PAYMENT_CARD },
  ];

  for (const [k, v] of Object.entries(data)) {
    if (matrix && Object.values(matrix).some((e) => (e as any)[k])) {
      continue;
    }

    const keyLower = k.toLowerCase();
    if (
      keyLower.includes('email') ||
      keyLower.includes('phone') ||
      keyLower.includes('address') ||
      keyLower.includes('name')
    ) {
      findings.push({ field: k as keyof T, inferred: DataClassification.PII });
      continue;
    }

    if (typeof v === 'string') {
      const match = patterns.find((p) => p.rx.test(v));
      if (match) findings.push({ field: k as keyof T, inferred: match.classification });
    }
  }

  return findings;
}

export function isSensitiveClassification(c: DataClassification): boolean {
  return (
    c === DataClassification.PII ||
    c === DataClassification.PHI ||
    c === DataClassification.PAYMENT_CARD ||
    c === DataClassification.HIGHLY_CONFIDENTIAL ||
    c === DataClassification.CONFIDENTIAL ||
    c === DataClassification.TRADE_SECRET
  );
}
