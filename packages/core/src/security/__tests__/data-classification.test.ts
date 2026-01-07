import { describe, expect, it } from '@jest/globals';
import {
  DataClassification,
  defaultClassificationMatrix,
  discoverSensitiveFields,
  getFieldClassification,
  isSensitiveClassification,
} from '../data-classification.js';

describe('data classification', () => {
  it('has default matrix entries for key entities', () => {
    expect(defaultClassificationMatrix.user.email.classification).toBe(DataClassification.PII);
    expect(defaultClassificationMatrix.lead.source.classification).toBe(DataClassification.INTERNAL);
  });

  describe('getFieldClassification', () => {
    it.each([
      ['user', 'email', DataClassification.PII],
      ['user', 'firstName', DataClassification.PII],
      ['lead', 'policyNumber', DataClassification.CONFIDENTIAL],
      ['lead', 'dateOfBirth', DataClassification.PHI],
      ['agent', 'licenseNumber', DataClassification.CONFIDENTIAL],
    ])('returns classification for %s.%s', (entity, field, expected) => {
      expect(getFieldClassification(entity as any, field).classification).toBe(expected);
    });

    it('defaults unknown fields to internal', () => {
      expect(getFieldClassification('lead', 'nonexistent').classification).toBe(DataClassification.INTERNAL);
    });
  });

  describe('isSensitiveClassification', () => {
    it.each([
      [DataClassification.PII, true],
      [DataClassification.PHI, true],
      [DataClassification.PAYMENT_CARD, true],
      [DataClassification.HIGHLY_CONFIDENTIAL, true],
      [DataClassification.CONFIDENTIAL, true],
      [DataClassification.INTERNAL, false],
      [DataClassification.PUBLIC, false],
    ])('%s => %s', (c, expected) => {
      expect(isSensitiveClassification(c)).toBe(expected);
    });
  });

  describe('discoverSensitiveFields', () => {
    it('discovers likely sensitive keys by name', () => {
      const findings = discoverSensitiveFields({
        emailAddress: 'alice@example.com',
        phoneNumber: '555-123-4567',
        displayName: 'Alice',
      });

      const byField = Object.fromEntries(findings.map((f) => [String(f.field), f.inferred]));
      expect(byField.emailAddress).toBe(DataClassification.PII);
      expect(byField.phoneNumber).toBe(DataClassification.PII);
      expect(byField.displayName).toBe(DataClassification.PII);
    });

    it('discovers sensitive values by content patterns', () => {
      const findings = discoverSensitiveFields({
        notes: 'my ssn is 123-45-6789',
        payment: '4111 1111 1111 1111',
      });

      const byField = Object.fromEntries(findings.map((f) => [String(f.field), f.inferred]));
      expect(byField.notes).toBe(DataClassification.HIGHLY_CONFIDENTIAL);
      expect(byField.payment).toBe(DataClassification.PAYMENT_CARD);
    });
  });
});
