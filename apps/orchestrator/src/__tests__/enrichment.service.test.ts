import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { EnrichmentService } from '../enrichment';
import { MockRedisClient, mockLogger, mockOpenAI } from './setup';

jest.mock('openai', () => ({
  OpenAI: jest.fn(() => mockOpenAI),
}));

describe('EnrichmentService', () => {
  let enrichmentService: EnrichmentService;
  let mockRedis: MockRedisClient;

  beforeEach(() => {
    mockRedis = new MockRedisClient();
    enrichmentService = new EnrichmentService(mockRedis as any);
  });

  describe('constructor', () => {
    it('should initialize with dependencies', () => {
      expect(enrichmentService).toBeDefined();
    });
  });

  describe('enrichLead', () => {
    it('should enrich lead data with additional information', async () => {
      const leadData = {
        id: 'lead-123',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const enrichedData = await enrichmentService.enrichLead(leadData);

      expect(enrichedData).toHaveProperty('id');
      expect(enrichedData).toHaveProperty('enrichmentData');
      expect(enrichedData).toHaveProperty('enrichedAt');
    });

    it('should include company info when available', async () => {
      const leadData = {
        id: 'lead-456',
        email: 'john@acme.com',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Corp',
      };

      const enrichedData = await enrichmentService.enrichLead(leadData);

      expect(enrichedData.enrichmentData).toHaveProperty('companyInfo');
    });

    it('should handle enrichment errors gracefully', async () => {
      const leadData = {
        id: 'lead-error',
        email: 'invalid-email',
        firstName: 'Test',
        lastName: 'User',
      };

      const enrichedData = await enrichmentService.enrichLead(leadData);

      expect(enrichedData).toHaveProperty('id');
      expect(enrichedData).toHaveProperty('enrichmentError');
    });
  });

  describe('getEnrichmentStatus', () => {
    it('should return enrichment status from cache', async () => {
      const cachedStatus = {
        id: 'lead-123',
        status: 'COMPLETED',
        enrichedAt: new Date().toISOString(),
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedStatus));

      const status = await enrichmentService.getEnrichmentStatus('lead-123');

      expect(status).toEqual(cachedStatus);
    });

    it('should return null for non-existent lead', async () => {
      mockRedis.get.mockResolvedValue(null);

      const status = await enrichmentService.getEnrichmentStatus('non-existent');

      expect(status).toBeNull();
    });
  });

  describe('queueEnrichment', () => {
    it('should add lead to enrichment queue', async () => {
      const leadId = 'lead-123';

      const jobId = await enrichmentService.queueEnrichment(leadId);

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
    });
  });

  describe('extractContactInfo', () => {
    it('should extract contact information from text', async () => {
      const text = 'Contact John Doe at john.doe@example.com or +1-555-123-4567';

      const contactInfo = await enrichmentService.extractContactInfo(text);

      expect(contactInfo).toHaveProperty('emails');
      expect(contactInfo).toHaveProperty('phones');
      expect(contactInfo.emails).toContain('john.doe@example.com');
    });

    it('should handle text without contact info', async () => {
      const text = 'This is a sample text without contact information.';

      const contactInfo = await enrichmentService.extractContactInfo(text);

      expect(contactInfo.emails).toEqual([]);
      expect(contactInfo.phones).toEqual([]);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email format', async () => {
      const result = await enrichmentService.validateEmail('test@example.com');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid email format', async () => {
      const result = await enrichmentService.validateEmail('not-an-email');
      expect(result.valid).toBe(false);
    });

    it('should check if email is disposable', async () => {
      const result = await enrichmentService.validateEmail('test@tempmail.com');
      expect(result).toHaveProperty('isDisposable');
    });
  });
});

describe('Lead Scoring', () => {
  let enrichmentService: EnrichmentService;

  beforeEach(() => {
    const mockRedis = new MockRedisClient();
    enrichmentService = new EnrichmentService(mockRedis as any);
  });

  describe('calculateLeadScore', () => {
    it('should calculate score based on lead data', async () => {
      const leadData = {
        id: 'lead-123',
        email: 'john@company.com',
        phone: '+1-555-123-4567',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Corp',
      };

      const score = await enrichmentService.calculateLeadScore(leadData);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should give higher score for complete data', async () => {
      const completeLead = {
        id: 'lead-1',
        email: 'john@company.com',
        phone: '+1-555-123-4567',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Corp',
        address: { street: '123 Main St', city: 'SF', state: 'CA' },
      };

      const minimalLead = {
        id: 'lead-2',
        email: 'test@example.com',
      };

      const completeScore = await enrichmentService.calculateLeadScore(completeLead);
      const minimalScore = await enrichmentService.calculateLeadScore(minimalLead);

      expect(completeScore).toBeGreaterThan(minimalScore);
    });

    it('should return score components', async () => {
      const leadData = {
        id: 'lead-123',
        email: 'john@company.com',
      };

      const result = await enrichmentService.calculateLeadScore(leadData);

      expect(result).toHaveProperty('totalScore');
      expect(result).toHaveProperty('components');
      expect(result.components).toHaveProperty('completeness');
      expect(result.components).toHaveProperty('quality');
      expect(result.components).toHaveProperty('engagement');
    });
  });

  describe('assessLeadQuality', () => {
    it('should assess lead quality tier', async () => {
      const leadData = {
        id: 'lead-123',
        email: 'john@enterprise.com',
        phone: '+1-555-123-4567',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Large Enterprise Inc',
        address: { street: '123 Main St', city: 'SF', state: 'CA', country: 'US' },
      };

      const quality = await enrichmentService.assessLeadQuality(leadData);

      expect(quality).toHaveProperty('tier');
      expect(quality.tier).toBeOneOf(['HOT', 'WARM', 'COLD']);
    });

    it('should return COLD for minimal data', async () => {
      const leadData = {
        id: 'lead-123',
        email: 'test@example.com',
      };

      const quality = await enrichmentService.assessLeadQuality(leadData);

      expect(quality.tier).toBe('COLD');
    });
  });
});
