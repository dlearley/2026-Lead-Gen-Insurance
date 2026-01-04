import { describe, it, expect, beforeEach } from '@jest/globals';
import { ScorecardService, type ScoringConfig } from '../services/scoring-service';
import { mockPrismaClient, mockLogger, generateId } from './setup';

describe('ScorecardService', () => {
  let service: ScorecardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ScorecardService();
  });

  describe('calculateLeadScore', () => {
    it('should calculate lead score based on data completeness', () => {
      const lead = {
        id: generateId(),
        source: 'web_form',
        email: 'test@example.com',
        phone: '+1-555-123-4567',
        firstName: 'John',
        lastName: 'Doe',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          country: 'US',
        },
        insuranceType: 'AUTO',
      };

      const score = service.calculateLeadScore(lead);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should return higher score for complete data', () => {
      const completeLead = {
        id: generateId(),
        source: 'web_form',
        email: 'john@company.com',
        phone: '+1-555-123-4567',
        firstName: 'John',
        lastName: 'Doe',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          country: 'US',
        },
        insuranceType: 'AUTO',
        metadata: { utm_source: 'google' },
      };

      const minimalLead = {
        id: generateId(),
        source: 'api',
        email: 'test@example.com',
      };

      const completeScore = service.calculateLeadScore(completeLead);
      const minimalScore = service.calculateLeadScore(minimalLead);

      expect(completeScore).toBeGreaterThan(minimalScore);
    });

    it('should calculate score components', () => {
      const lead = {
        id: generateId(),
        source: 'web_form',
        email: 'test@example.com',
      };

      const result = service.calculateLeadScore(lead);

      expect(result).toHaveProperty('totalScore');
      expect(result).toHaveProperty('components');
      expect(result.components).toHaveProperty('completeness');
      expect(result.components).toHaveProperty('quality');
      expect(result.components).toHaveProperty('engagement');
    });
  });

  describe('assessLeadQuality', () => {
    it('should return quality tier based on score', () => {
      const hotLead = {
        id: generateId(),
        source: 'web_form',
        email: 'john@enterprise.com',
        phone: '+1-555-123-4567',
        firstName: 'John',
        lastName: 'Doe',
        address: { street: '123 Main St', city: 'SF', state: 'CA' },
        insuranceType: 'AUTO',
      };

      const quality = service.assessLeadQuality(hotLead);

      expect(quality).toHaveProperty('tier');
      expect(['HOT', 'WARM', 'COLD']).toContain(quality.tier);
    });

    it('should return COLD for minimal data', () => {
      const lead = {
        id: generateId(),
        source: 'api',
        email: 'test@example.com',
      };

      const quality = service.assessLeadQuality(lead);

      expect(quality.tier).toBe('COLD');
    });

    it('should return HOT for high-quality leads', () => {
      const lead = {
        id: generateId(),
        source: 'referral',
        email: 'john@fortune500.com',
        phone: '+1-555-123-4567',
        firstName: 'John',
        lastName: 'Doe',
        address: { street: '123 Main St', city: 'SF', state: 'CA', zipCode: '94102', country: 'US' },
        insuranceType: 'AUTO',
        metadata: { 
          company_size: '1000+',
          annual_revenue: '50000000',
          utm_source: 'enterprise',
        },
      };

      const quality = service.assessLeadQuality(lead);

      expect(quality.tier).toBe('HOT');
    });
  });

  describe('updateScore', () => {
    it('should update lead score in database', async () => {
      const leadId = generateId();
      const newScore = 85;

      mockPrismaClient.lead.update.mockResolvedValue({
        id: leadId,
        qualityScore: newScore,
      });

      const result = await service.updateScore(leadId, newScore);

      expect(result.qualityScore).toBe(newScore);
      expect(mockPrismaClient.lead.update).toHaveBeenCalledWith({
        where: { id: leadId },
        data: { qualityScore: newScore },
      });
    });
  });

  describe('batchScore', () => {
    it('should score multiple leads', async () => {
      const leads = [
        { id: generateId(), source: 'web_form', email: 'test1@example.com' },
        { id: generateId(), source: 'api', email: 'test2@example.com' },
        { id: generateId(), source: 'phone', email: 'test3@example.com' },
      ];

      const results = await service.batchScore(leads);

      expect(results.length).toBe(3);
      results.forEach((result) => {
        expect(result).toHaveProperty('leadId');
        expect(result).toHaveProperty('score');
        expect(result.score).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('getScoringConfig', () => {
    it('should return current scoring configuration', () => {
      const config = service.getScoringConfig();

      expect(config).toHaveProperty('weights');
      expect(config.weights).toHaveProperty('completeness');
      expect(config.weights).toHaveProperty('quality');
      expect(config.weights).toHaveProperty('engagement');
    });
  });

  describe('updateScoringConfig', () => {
    it('should update scoring configuration', () => {
      const newConfig: Partial<ScoringConfig> = {
        weights: {
          completeness: 0.5,
          quality: 0.3,
          engagement: 0.2,
        },
      };

      service.updateScoringConfig(newConfig);
      const config = service.getScoringConfig();

      expect(config.weights.completeness).toBe(0.5);
    });
  });

  describe('getScoreHistory', () => {
    it('should return score history for a lead', async () => {
      const leadId = generateId();
      const mockHistory = [
        { date: new Date('2024-01-01'), score: 50 },
        { date: new Date('2024-01-02'), score: 65 },
        { date: new Date('2024-01-03'), score: 80 },
      ];

      mockPrismaClient.lead.findUnique.mockResolvedValue({
        id: leadId,
        qualityScore: 80,
        scoreHistory: mockHistory,
      });

      const history = await service.getScoreHistory(leadId);

      expect(history).toEqual(mockHistory);
    });
  });

  describe('validateScore', () => {
    it('should return true for valid score', () => {
      expect(service.validateScore(0)).toBe(true);
      expect(service.validateScore(50)).toBe(true);
      expect(service.validateScore(100)).toBe(true);
    });

    it('should return false for invalid score', () => {
      expect(service.validateScore(-1)).toBe(false);
      expect(service.validateScore(101)).toBe(false);
    });
  });
});
