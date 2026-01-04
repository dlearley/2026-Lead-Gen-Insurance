import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  DataValidator,
  ConstraintValidator,
  BusinessRuleValidator,
  DataType,
  ConstraintType,
  commonValidationRules,
} from '../data-validator.js';

describe('DataValidator', () => {
  let validator: DataValidator;

  beforeEach(() => {
    validator = new DataValidator();
  });

  describe('Validation Rules Definition', () => {
    it('should define rules for a table', () => {
      validator.defineRules('leads', [
        {
          field: 'email',
          type: DataType.EMAIL,
          required: true,
          maxLength: 255,
          constraints: [ConstraintType.UNIQUE],
        },
        {
          field: 'phone',
          type: DataType.PHONE,
          required: false,
          maxLength: 20,
        },
      ]);

      expect(validator['rules'].has('leads')).toBe(true);
    });
  });

  describe('Email Validation', () => {
    beforeEach(() => {
      validator.defineRules('leads', [
        {
          field: 'email',
          type: DataType.EMAIL,
          required: true,
          maxLength: 255,
        },
      ]);
    });

    it('should validate correct email', () => {
      const result = validator.validate('leads', { email: 'test@example.com' });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email', () => {
      const result = validator.validate('leads', { email: 'invalid-email' });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe('email');
    });

    it('should reject missing required email', () => {
      const result = validator.validate('leads', {});

      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('REQUIRED');
    });
  });

  describe('Phone Validation', () => {
    beforeEach(() => {
      validator.defineRules('leads', [
        {
          field: 'phone',
          type: DataType.PHONE,
          required: false,
          maxLength: 20,
        },
      ]);
    });

    it('should validate correct phone in E.164 format', () => {
      const result = validator.validate('leads', { phone: '+1234567890' });

      expect(result.isValid).toBe(true);
    });

    it('should validate correct phone without country code', () => {
      const result = validator.validate('leads', { phone: '1234567890' });

      expect(result.isValid).toBe(true);
    });

    it('should reject invalid phone', () => {
      const result = validator.validate('leads', { phone: 'invalid' });

      expect(result.isValid).toBe(false);
    });

    it('should accept null for optional phone', () => {
      const result = validator.validate('leads', { phone: null });

      expect(result.isValid).toBe(true);
    });
  });

  describe('Numeric Validation', () => {
    beforeEach(() => {
      validator.defineRules('leads', [
        {
          field: 'qualityScore',
          type: DataType.NUMBER,
          required: false,
          min: 0,
          max: 100,
        },
      ]);
    });

    it('should validate number within range', () => {
      const result = validator.validate('leads', { qualityScore: 75 });

      expect(result.isValid).toBe(true);
    });

    it('should reject number below minimum', () => {
      const result = validator.validate('leads', { qualityScore: -5 });

      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('MIN_VALUE');
    });

    it('should reject number above maximum', () => {
      const result = validator.validate('leads', { qualityScore: 150 });

      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('MAX_VALUE');
    });
  });

  describe('String Length Validation', () => {
    beforeEach(() => {
      validator.defineRules('leads', [
        {
          field: 'firstName',
          type: DataType.STRING,
          required: false,
          minLength: 2,
          maxLength: 50,
        },
      ]);
    });

    it('should validate string within length', () => {
      const result = validator.validate('leads', { firstName: 'John' });

      expect(result.isValid).toBe(true);
    });

    it('should reject string below minimum length', () => {
      const result = validator.validate('leads', { firstName: 'J' });

      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('MIN_LENGTH');
    });

    it('should reject string above maximum length', () => {
      const result = validator.validate('leads', { firstName: 'A'.repeat(51) });

      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('MAX_LENGTH');
    });
  });

  describe('Enum Validation', () => {
    beforeEach(() => {
      validator.defineRules('leads', [
        {
          field: 'status',
          type: DataType.STRING,
          required: true,
          enum: ['RECEIVED', 'PROCESSING', 'QUALIFIED', 'ROUTED', 'CONVERTED', 'REJECTED'],
        },
      ]);
    });

    it('should validate valid enum value', () => {
      const result = validator.validate('leads', { status: 'QUALIFIED' });

      expect(result.isValid).toBe(true);
    });

    it('should reject invalid enum value', () => {
      const result = validator.validate('leads', { status: 'INVALID' });

      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('INVALID_ENUM');
    });

    it('should reject missing required enum', () => {
      const result = validator.validate('leads', {});

      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('REQUIRED');
    });
  });

  describe('Pattern Validation', () => {
    beforeEach(() => {
      validator.defineRules('leads', [
        {
          field: 'zipCode',
          type: DataType.STRING,
          required: false,
          pattern: /^\d{5}(-\d{4})?$/,
        },
      ]);
    });

    it('should validate matching pattern', () => {
      const result = validator.validate('leads', { zipCode: '12345' });

      expect(result.isValid).toBe(true);
    });

    it('should validate pattern with extension', () => {
      const result = validator.validate('leads', { zipCode: '12345-6789' });

      expect(result.isValid).toBe(true);
    });

    it('should reject non-matching pattern', () => {
      const result = validator.validate('leads', { zipCode: 'ABC' });

      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('PATTERN_MISMATCH');
    });
  });

  describe('Custom Validators', () => {
    it('should add and use custom validator', () => {
      validator.addCustomValidator('email', (value, record) => {
        const allowedDomains = ['gmail.com', 'yahoo.com'];
        const domain = value.split('@')[1];
        return allowedDomains.includes(domain) || 'Domain not allowed';
      });

      const validResult = validator.validate('leads', { email: 'test@gmail.com' });
      const invalidResult = validator.validate('leads', { email: 'test@other.com' });

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0].type).toBe('CUSTOM_VALIDATION');
    });
  });

  describe('URL Validation', () => {
    beforeEach(() => {
      validator.defineRules('carriers', [
        {
          field: 'website',
          type: DataType.URL,
          required: false,
        },
      ]);
    });

    it('should validate correct URL', () => {
      const result = validator.validate('carriers', { website: 'https://example.com' });

      expect(result.isValid).toBe(true);
    });

    it('should validate URL with path', () => {
      const result = validator.validate('carriers', {
        website: 'https://example.com/path/to/page',
      });

      expect(result.isValid).toBe(true);
    });

    it('should reject invalid URL', () => {
      const result = validator.validate('carriers', { website: 'not-a-url' });

      expect(result.isValid).toBe(false);
    });
  });

  describe('UUID Validation', () => {
    beforeEach(() => {
      validator.defineRules('leads', [
        {
          field: 'id',
          type: DataType.UUID,
          required: true,
        },
      ]);
    });

    it('should validate correct UUID', () => {
      const result = validator.validate('leads', {
        id: '123e4567-e89b-12d3-a456-426614174000',
      });

      expect(result.isValid).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = validator.validate('leads', { id: 'not-a-uuid' });

      expect(result.isValid).toBe(false);
    });
  });

  describe('Multiple Fields Validation', () => {
    beforeEach(() => {
      validator.defineRules('leads', [
        {
          field: 'email',
          type: DataType.EMAIL,
          required: true,
        },
        {
          field: 'phone',
          type: DataType.PHONE,
          required: false,
        },
        {
          field: 'qualityScore',
          type: DataType.NUMBER,
          required: false,
          min: 0,
          max: 100,
        },
      ]);
    });

    it('should validate all valid fields', () => {
      const result = validator.validate('leads', {
        email: 'test@example.com',
        phone: '+1234567890',
        qualityScore: 85,
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should report multiple validation errors', () => {
      const result = validator.validate('leads', {
        email: 'invalid-email',
        phone: 'invalid-phone',
        qualityScore: 150,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(3);
    });
  });

  describe('Common Validation Rules', () => {
    it('should have common validation rules defined', () => {
      expect(commonValidationRules).toBeInstanceOf(Array);
      expect(commonValidationRules.length).toBeGreaterThan(0);
    });
  });
});

describe('BusinessRuleValidator', () => {
  describe('Lead Status Transition', () => {
    it('should validate correct status transition', () => {
      const isValid = BusinessRuleValidator.validateLeadStatusTransition(
        'RECEIVED',
        'PROCESSING'
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid status transition', () => {
      const isValid = BusinessRuleValidator.validateLeadStatusTransition('RECEIVED', 'CONVERTED');

      expect(isValid).toBe(false);
    });

    it('should reject transition from final state', () => {
      const isValid = BusinessRuleValidator.validateLeadStatusTransition('CONVERTED', 'PROCESSING');

      expect(isValid).toBe(false);
    });
  });

  describe('Agent Capacity', () => {
    it('should validate agent below capacity', () => {
      const isValid = BusinessRuleValidator.validateAgentCapacity(8, 10);

      expect(isValid).toBe(true);
    });

    it('should reject agent at capacity', () => {
      const isValid = BusinessRuleValidator.validateAgentCapacity(10, 10);

      expect(isValid).toBe(false);
    });

    it('should reject agent over capacity', () => {
      const isValid = BusinessRuleValidator.validateAgentCapacity(15, 10);

      expect(isValid).toBe(false);
    });
  });

  describe('Partnership Dates', () => {
    it('should validate partnership with end date', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const isValid = BusinessRuleValidator.validatePartnershipDates(startDate, endDate);

      expect(isValid).toBe(true);
    });

    it('should validate partnership without end date', () => {
      const startDate = new Date('2024-01-01');

      const isValid = BusinessRuleValidator.validatePartnershipDates(startDate);

      expect(isValid).toBe(true);
    });

    it('should reject end date before start date', () => {
      const startDate = new Date('2024-12-31');
      const endDate = new Date('2024-01-01');

      const isValid = BusinessRuleValidator.validatePartnershipDates(startDate, endDate);

      expect(isValid).toBe(false);
    });
  });

  describe('Commission Rate', () => {
    it('should validate valid commission rate', () => {
      const isValid = BusinessRuleValidator.validateCommissionRate(15.5);

      expect(isValid).toBe(true);
    });

    it('should validate zero commission rate', () => {
      const isValid = BusinessRuleValidator.validateCommissionRate(0);

      expect(isValid).toBe(true);
    });

    it('should validate maximum commission rate', () => {
      const isValid = BusinessRuleValidator.validateCommissionRate(100);

      expect(isValid).toBe(true);
    });

    it('should reject negative commission rate', () => {
      const isValid = BusinessRuleValidator.validateCommissionRate(-5);

      expect(isValid).toBe(false);
    });

    it('should reject commission rate above 100', () => {
      const isValid = BusinessRuleValidator.validateCommissionRate(150);

      expect(isValid).toBe(false);
    });
  });

  describe('Performance Score', () => {
    it('should validate valid performance score', () => {
      const isValid = BusinessRuleValidator.validatePerformanceScore(75.5);

      expect(isValid).toBe(true);
    });

    it('should validate zero performance score', () => {
      const isValid = BusinessRuleValidator.validatePerformanceScore(0);

      expect(isValid).toBe(true);
    });

    it('should validate maximum performance score', () => {
      const isValid = BusinessRuleValidator.validatePerformanceScore(100);

      expect(isValid).toBe(true);
    });

    it('should reject negative performance score', () => {
      const isValid = BusinessRuleValidator.validatePerformanceScore(-5);

      expect(isValid).toBe(false);
    });

    it('should reject performance score above 100', () => {
      const isValid = BusinessRuleValidator.validatePerformanceScore(150);

      expect(isValid).toBe(false);
    });
  });
});
