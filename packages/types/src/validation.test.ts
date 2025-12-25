import { describe, it, expect } from '@jest/globals';
import { leadCreateSchema, leadQuerySchema, addressSchema } from '../src/validation.js';

describe('Lead Validation Schemas', () => {
  describe('addressSchema', () => {
    it('should validate a valid address', () => {
      const validAddress = {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'US',
      };
      const result = addressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
    });

    it('should allow partial addresses', () => {
      const partialAddress = {
        city: 'Los Angeles',
        state: 'CA',
      };
      const result = addressSchema.safeParse(partialAddress);
      expect(result.success).toBe(true);
    });

    it('should reject invalid zip code', () => {
      const invalidAddress = {
        zipCode: 'invalid',
      };
      const result = addressSchema.safeParse(invalidAddress);
      expect(result.success).toBe(false);
    });

    it('should reject invalid country code', () => {
      const invalidCountry = {
        country: 'USA', // Should be 2 characters
      };
      const result = addressSchema.safeParse(invalidCountry);
      expect(result.success).toBe(false);
    });
  });

  describe('leadCreateSchema', () => {
    it('should validate a valid lead', () => {
      const validLead = {
        source: 'web_form',
        email: 'test@example.com',
        phone: '+1-555-123-4567',
        firstName: 'John',
        lastName: 'Doe',
        insuranceType: 'auto',
      };
      const result = leadCreateSchema.safeParse(validLead);
      expect(result.success).toBe(true);
    });

    it('should require source field', () => {
      const invalidLead = {
        email: 'test@example.com',
      };
      const result = leadCreateSchema.safeParse(invalidLead);
      expect(result.success).toBe(false);
    });

    it('should validate email format', () => {
      const invalidEmail = {
        source: 'test',
        email: 'not-an-email',
      };
      const result = leadCreateSchema.safeParse(invalidEmail);
      expect(result.success).toBe(false);
    });

    it('should validate phone format', () => {
      const invalidPhone = {
        source: 'test',
        phone: 'not-a-phone',
      };
      const result = leadCreateSchema.safeParse(invalidPhone);
      expect(result.success).toBe(false);
    });

    it('should validate insurance type enum', () => {
      const invalidType = {
        source: 'test',
        insuranceType: 'invalid_type',
      };
      const result = leadCreateSchema.safeParse(invalidType);
      expect(result.success).toBe(false);
    });

    it('should allow all valid insurance types', () => {
      const types = ['auto', 'home', 'life', 'health', 'commercial'];
      for (const type of types) {
        const result = leadCreateSchema.safeParse({ source: 'test', insuranceType: type });
        expect(result.success).toBe(true);
      }
    });

    it('should accept optional metadata', () => {
      const withMetadata = {
        source: 'test',
        metadata: { utm_source: 'google', campaign: 'summer_sale' },
      };
      const result = leadCreateSchema.safeParse(withMetadata);
      expect(result.success).toBe(true);
    });
  });

  describe('leadQuerySchema', () => {
    it('should validate default query parameters', () => {
      const query = {};
      const result = leadQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        page: 1,
        limit: 20,
      });
    });

    it('should validate pagination parameters', () => {
      const query = {
        page: '2',
        limit: '50',
      };
      const result = leadQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    });

    it('should validate status filter', () => {
      const query = {
        status: 'qualified',
      };
      const result = leadQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('qualified');
    });

    it('should validate score range', () => {
      const query = {
        minScore: '50',
        maxScore: '80',
      };
      const result = leadQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      expect(result.data.minScore).toBe(50);
      expect(result.data.maxScore).toBe(80);
    });

    it('should reject invalid status', () => {
      const query = {
        status: 'invalid_status',
      };
      const result = leadQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should reject limit over 100', () => {
      const query = {
        limit: '150',
      };
      const result = leadQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });
  });
});
