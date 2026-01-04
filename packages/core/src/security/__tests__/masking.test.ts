import { describe, expect, it } from '@jest/globals';
import {
  maskEmail,
  maskPhone,
  maskSSN,
  maskCreditCard,
  maskName,
  redactSensitiveStrings,
  maskCommonPIIFields,
} from '../masking.js';

describe('masking utilities', () => {
  describe('maskEmail', () => {
    it.each([
      ['alice@example.com', '***@example.com'],
      ['a@b.co', '***@b.co'],
      ['invalid', '***@***'],
      ['@example.com', '***@***'],
      ['user@', '***@***'],
    ])('masks %s -> %s', (input, expected) => {
      expect(maskEmail(input)).toBe(expected);
    });
  });

  describe('maskPhone', () => {
    it.each([
      ['555-123-4567', '***-***-4567'],
      ['(555) 123 4567', '***-***-4567'],
      ['1234', '***-***-1234'],
      ['12', '***-***-****'],
    ])('masks %s -> %s', (input, expected) => {
      expect(maskPhone(input)).toBe(expected);
    });
  });

  describe('maskSSN', () => {
    it.each([
      ['123-45-6789', '***-**-6789'],
      ['123456789', '***-**-6789'],
      ['6789', '***-**-6789'],
      ['12', '***-**-****'],
    ])('masks %s -> %s', (input, expected) => {
      expect(maskSSN(input)).toBe(expected);
    });
  });

  describe('maskCreditCard', () => {
    it.each([
      ['4111 1111 1111 1111', '****-****-****-1111'],
      ['4111111111111111', '****-****-****-1111'],
      ['1111', '****-****-****-1111'],
      ['12', '****-****-****-****'],
    ])('masks %s -> %s', (input, expected) => {
      expect(maskCreditCard(input)).toBe(expected);
    });
  });

  describe('maskName', () => {
    it.each([
      ['John', 'J***'],
      [' j ', 'j***'],
      ['', '***'],
      ['   ', '***'],
    ])('masks %s -> %s', (input, expected) => {
      expect(maskName(input)).toBe(expected);
    });
  });

  describe('redactSensitiveStrings', () => {
    it('masks emails inside freeform text', () => {
      expect(redactSensitiveStrings('contact me at alice@example.com')).toBe('contact me at ***@example.com');
    });

    it('masks SSNs inside freeform text', () => {
      expect(redactSensitiveStrings('ssn=123-45-6789')).toBe('ssn=***-**-6789');
    });

    it('masks card numbers inside freeform text', () => {
      expect(redactSensitiveStrings('cc=4111 1111 1111 1111')).toBe('cc=****-****-****-1111');
    });
  });

  describe('maskCommonPIIFields', () => {
    it('masks common PII keys recursively', () => {
      const masked = maskCommonPIIFields({
        email: 'alice@example.com',
        phone: '555-123-4567',
        nested: {
          ssn: '123-45-6789',
          creditCard: '4111111111111111',
          name: 'John',
        },
      });

      expect(masked).toEqual({
        email: '***@example.com',
        phone: '***-***-4567',
        nested: {
          ssn: '***-**-6789',
          creditCard: '****-****-****-1111',
          name: 'J***',
        },
      });
    });

    it('returns primitives unchanged', () => {
      expect(maskCommonPIIFields('x' as any)).toBe('x');
      expect(maskCommonPIIFields(123 as any)).toBe(123);
      expect(maskCommonPIIFields(null as any)).toBeNull();
      expect(maskCommonPIIFields(undefined as any)).toBeUndefined();
    });
  });
});
