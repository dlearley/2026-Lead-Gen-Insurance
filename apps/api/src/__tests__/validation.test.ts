import { describe, it, expect, beforeEach } from './setup';
import { createLeadFactory, createAgentFactory, createUserFactory, VALID_LEAD_DATA, INVALID_LEAD_DATA } from '@insurance-lead-gen/config';
import { leadCreateSchema, leadQuerySchema, leadUpdateSchema } from '@insurance-lead-gen/types';

describe('Lead Validation Schemas', () => {
  describe('leadCreateSchema', () => {
    it('should validate a complete lead', () => {
      const result = leadCreateSchema.safeParse(VALID_LEAD_DATA.full);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('john.doe@example.com');
        expect(result.data.insuranceType).toBe('AUTO');
      }
    });

    it('should validate a lead with minimum required fields', () => {
      const result = leadCreateSchema.safeParse(VALID_LEAD_DATA.minimum);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.source).toBe('web_form');
        expect(result.data.email).toBe('test@example.com');
      }
    });

    it('should reject a lead without source', () => {
      const result = leadCreateSchema.safeParse(INVALID_LEAD_DATA.missingSource);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.errors;
        expect(errors.some(e => e.path.includes('source'))).toBe(true);
      }
    });

    it('should reject a lead with invalid email', () => {
      const result = leadCreateSchema.safeParse(INVALID_LEAD_DATA.invalidEmail);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.errors;
        expect(errors.some(e => e.path.includes('email'))).toBe(true);
      }
    });

    it('should reject empty source', () => {
      const result = leadCreateSchema.safeParse(INVALID_LEAD_DATA.emptySource);
      expect(result.success).toBe(false);
    });

    it('should reject invalid insurance type', () => {
      const result = leadCreateSchema.safeParse(INVALID_LEAD_DATA.invalidInsuranceType);
      expect(result.success).toBe(false);
    });

    it('should normalize insurance type to lowercase', () => {
      const input = { ...VALID_LEAD_DATA.minimum, insuranceType: 'AUTO' };
      const result = leadCreateSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.insuranceType).toBe('auto');
      }
    });

    it('should accept valid phone numbers', () => {
      const validPhones = [
        '+1-555-123-4567',
        '(555) 123-4567',
        '555-123-4567',
        '+1 555 123 4567',
      ];
      for (const phone of validPhones) {
        const result = leadCreateSchema.safeParse({
          source: 'web_form',
          email: 'test@example.com',
          phone,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('leadQuerySchema', () => {
    it('should validate empty query', () => {
      const result = leadQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate pagination parameters', () => {
      const result = leadQuerySchema.safeParse({
        page: '2',
        limit: '50',
        skip: 10,
        take: 20,
      });
      expect(result.success).toBe(true);
    });

    it('should validate status filter', () => {
      const result = leadQuerySchema.safeParse({ status: 'received' });
      expect(result.success).toBe(true);
    });

    it('should validate insuranceType filter', () => {
      const result = leadQuerySchema.safeParse({ insuranceType: 'auto' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid page number', () => {
      const result = leadQuerySchema.safeParse({ page: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should reject negative skip value', () => {
      const result = leadQuerySchema.safeParse({ skip: -1 });
      expect(result.success).toBe(false);
    });
  });

  describe('leadUpdateSchema', () => {
    it('should validate partial updates', () => {
      const result = leadUpdateSchema.safeParse({ email: 'new@example.com' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('new@example.com');
      }
    });

    it('should validate status updates', () => {
      const result = leadUpdateSchema.safeParse({ status: 'qualified' });
      expect(result.success).toBe(true);
    });

    it('should validate quality score updates', () => {
      const result = leadUpdateSchema.safeParse({ qualityScore: 85 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.qualityScore).toBe(85);
      }
    });

    it('should reject quality score below 0', () => {
      const result = leadUpdateSchema.safeParse({ qualityScore: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject quality score above 100', () => {
      const result = leadUpdateSchema.safeParse({ qualityScore: 101 });
      expect(result.success).toBe(false);
    });
  });
});

describe('Test Factories', () => {
  describe('createLeadFactory', () => {
    it('should create a lead with defaults', () => {
      const lead = createLeadFactory();
      expect(lead.id).toBeDefined();
      expect(lead.source).toBeDefined();
      expect(lead.email).toBeDefined();
      expect(lead.createdAt).toBeInstanceOf(Date);
    });

    it('should override defaults with input', () => {
      const lead = createLeadFactory({
        source: 'api',
        email: 'custom@example.com',
        insuranceType: 'AUTO',
      });
      expect(lead.source).toBe('api');
      expect(lead.email).toBe('custom@example.com');
      expect(lead.insuranceType).toBe('AUTO');
    });

    it('should generate unique IDs for each lead', () => {
      const lead1 = createLeadFactory();
      const lead2 = createLeadFactory();
      expect(lead1.id).not.toBe(lead2.id);
    });

    it('should set default status to received', () => {
      const lead = createLeadFactory();
      expect(lead.status).toBe('received');
    });
  });

  describe('createAgentFactory', () => {
    it('should create an agent with defaults', () => {
      const agent = createAgentFactory();
      expect(agent.id).toBeDefined();
      expect(agent.email).toBeDefined();
      expect(agent.specializations).toBeInstanceOf(Array);
      expect(agent.rating).toBeGreaterThanOrEqual(0);
      expect(agent.rating).toBeLessThanOrEqual(5);
    });

    it('should override defaults with input', () => {
      const agent = createAgentFactory({
        firstName: 'Jane',
        lastName: 'Doe',
        rating: 4.9,
        isActive: false,
      });
      expect(agent.firstName).toBe('Jane');
      expect(agent.lastName).toBe('Doe');
      expect(agent.rating).toBe(4.9);
      expect(agent.isActive).toBe(false);
    });

    it('should generate valid license numbers', () => {
      const agent = createAgentFactory();
      expect(agent.licenseNumber).toMatch(/^LIC-[A-Z0-9]{6}$/);
    });
  });

  describe('createUserFactory', () => {
    it('should create a user with defaults', () => {
      const user = createUserFactory();
      expect(user.id).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.role).toBeDefined();
      expect(['ADMIN', 'AGENT', 'BROKER', 'VIEWER']).toContain(user.role);
    });

    it('should override defaults with input', () => {
      const user = createUserFactory({
        email: 'admin@example.com',
        role: 'ADMIN',
      });
      expect(user.email).toBe('admin@example.com');
      expect(user.role).toBe('ADMIN');
    });
  });

  describe('Batch creation', () => {
    it('should create multiple leads', () => {
      const leads = Array.from({ length: 10 }, () => createLeadFactory());
      expect(leads.length).toBe(10);
      expect(new Set(leads.map(l => l.id)).size).toBe(10);
    });

    it('should create multiple agents', () => {
      const agents = Array.from({ length: 5 }, () => createAgentFactory());
      expect(agents.length).toBe(5);
    });
  });
});

describe('Validation Edge Cases', () => {
  it('should handle very long email addresses', () => {
    const longEmail = `${'a'.repeat(50)}@${'b'.repeat(50)}.com`;
    const result = leadCreateSchema.safeParse({
      source: 'web_form',
      email: longEmail,
    });
    // Should either pass or fail gracefully
    if (result.success) {
      expect(result.data.email).toBe(longEmail);
    }
  });

  it('should handle special characters in names', () => {
    const result = leadCreateSchema.safeParse({
      source: 'web_form',
      email: 'test@example.com',
      firstName: "O'Connor",
      lastName: 'Smith-Jones',
    });
    expect(result.success).toBe(true);
  });

  it('should handle Unicode characters in names', () => {
    const result = leadCreateSchema.safeParse({
      source: 'web_form',
      email: 'test@example.com',
      firstName: 'José',
      lastName: ' García',
    });
    expect(result.success).toBe(true);
  });

  it('should handle whitespace in phone numbers', () => {
    const result = leadCreateSchema.safeParse({
      source: 'web_form',
      email: 'test@example.com',
      phone: '+1 555 123 4567',
    });
    expect(result.success).toBe(true);
  });
});
