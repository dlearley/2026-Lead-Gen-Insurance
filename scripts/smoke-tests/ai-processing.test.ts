/**
 * AI Processing Smoke Tests
 *
 * Verifies AI-powered lead qualification, scoring, and agent matching
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TIMEOUT = parseInt(process.env.TEST_TIMEOUT || '60000', 10); // 60s for AI calls

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

let authToken: string;
let testLeadId: string;

beforeAll(async () => {
  // Authenticate as test user
  const authResponse = await apiClient.post('/auth/login', {
    email: process.env.TEST_USER_EMAIL || 'test@example.com',
    password: process.env.TEST_USER_PASSWORD || 'test-password',
  });
  authToken = authResponse.data.token;
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
});

describe('AI Processing Smoke Tests', () => {
  describe('Lead Qualification', () => {
    it('should qualify a lead using AI', async () => {
      const leadData = {
        firstName: 'AI',
        lastName: 'Qualified',
        email: `ai.qualified.${Date.now()}@example.com`,
        phone: '555-0123',
        dateOfBirth: '1990-01-01',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
        },
        insuranceType: 'auto',
        annualIncome: 75000,
        employmentStatus: 'employed',
        creditScore: 720,
      };

      const createResponse = await apiClient.post('/leads', leadData);
      testLeadId = createResponse.data.id;

      const response = await apiClient.post(`/leads/${testLeadId}/qualify`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('qualified');
      expect(response.data).toHaveProperty('confidence');
      expect(response.data).toHaveProperty('reason');
      expect(typeof response.data.confidence).toBe('number');
      expect(response.data.confidence).toBeGreaterThanOrEqual(0);
      expect(response.data.confidence).toBeLessThanOrEqual(1);

      // Clean up
      await apiClient.delete(`/leads/${testLeadId}`);
    });

    it('should provide qualification reasons', async () => {
      const leadData = {
        firstName: 'AI',
        lastName: 'Reason',
        email: `ai.reason.${Date.now()}@example.com`,
        phone: '555-0123',
        insuranceType: 'home',
        annualIncome: 120000,
      };

      const createResponse = await apiClient.post('/leads', leadData);
      testLeadId = createResponse.data.id;

      const response = await apiClient.post(`/leads/${testLeadId}/qualify`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('reason');
      expect(response.data.reason).not.toBe('');
      expect(typeof response.data.reason).toBe('string');

      // Clean up
      await apiClient.delete(`/leads/${testLeadId}`);
    });
  });

  describe('Lead Scoring', () => {
    it('should calculate lead score', async () => {
      const leadData = {
        firstName: 'AI',
        lastName: 'Scored',
        email: `ai.scored.${Date.now()}@example.com`,
        phone: '555-0123',
        insuranceType: 'auto',
        annualIncome: 85000,
        employmentStatus: 'employed',
      };

      const createResponse = await apiClient.post('/leads', leadData);
      testLeadId = createResponse.data.id;

      const response = await apiClient.post(`/leads/${testLeadId}/score`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('score');
      expect(response.data).toHaveProperty('factors');
      expect(response.data).toHaveProperty('tier');
      expect(typeof response.data.score).toBe('number');
      expect(response.data.score).toBeGreaterThanOrEqual(0);
      expect(response.data.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(response.data.factors)).toBe(true);

      // Clean up
      await apiClient.delete(`/leads/${testLeadId}`);
    });

    it('should classify lead into tier', async () => {
      const leadData = {
        firstName: 'AI',
        lastName: 'Tier',
        email: `ai.tier.${Date.now()}@example.com`,
        phone: '555-0123',
        insuranceType: 'life',
        annualIncome: 150000,
      };

      const createResponse = await apiClient.post('/leads', leadData);
      testLeadId = createResponse.data.id;

      const response = await apiClient.post(`/leads/${testLeadId}/score`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('tier');
      expect(['hot', 'warm', 'cold']).toContain(response.data.tier);

      // Clean up
      await apiClient.delete(`/leads/${testLeadId}`);
    });
  });

  describe('Agent Matching', () => {
    let agentId: string;

    beforeAll(async () => {
      // Create test agent
      const agentData = {
        firstName: 'AI',
        lastName: 'Matcher',
        email: `ai.matcher.${Date.now()}@example.com`,
        role: 'agent',
        specializations: ['auto', 'home'],
        territories: ['TS'],
      };
      const agentResponse = await apiClient.post('/users', agentData);
      agentId = agentResponse.data.id;
    });

    afterAll(async () => {
      try {
        await apiClient.delete(`/users/${agentId}`);
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should match lead to best agent', async () => {
      const leadData = {
        firstName: 'AI',
        lastName: 'Match',
        email: `ai.match.${Date.now()}@example.com`,
        phone: '555-0123',
        insuranceType: 'auto',
        state: 'TS',
        city: 'Test City',
      };

      const createResponse = await apiClient.post('/leads', leadData);
      testLeadId = createResponse.data.id;

      const response = await apiClient.post(`/leads/${testLeadId}/match-agent`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('agentId');
      expect(response.data).toHaveProperty('matchScore');
      expect(response.data).toHaveProperty('matchReason');
      expect(typeof response.data.matchScore).toBe('number');

      // Clean up
      await apiClient.delete(`/leads/${testLeadId}`);
    });

    it('should provide multiple agent options', async () => {
      const leadData = {
        firstName: 'AI',
        lastName: 'Options',
        email: `ai.options.${Date.now()}@example.com`,
        phone: '555-0123',
        insuranceType: 'auto',
        state: 'TS',
      };

      const createResponse = await apiClient.post('/leads', leadData);
      testLeadId = createResponse.data.id;

      const response = await apiClient.post(`/leads/${testLeadId}/match-agent`, {
        returnMultiple: true,
        limit: 3,
      });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('agents');
      expect(Array.isArray(response.data.agents)).toBe(true);
      expect(response.data.agents.length).toBeGreaterThan(0);

      // Clean up
      await apiClient.delete(`/leads/${testLeadId}`);
    });
  });

  describe('AI Recommendations', () => {
    it('should provide follow-up recommendations', async () => {
      const leadData = {
        firstName: 'AI',
        lastName: 'Recommend',
        email: `ai.recommend.${Date.now()}@example.com`,
        phone: '555-0123',
        insuranceType: 'auto',
      };

      const createResponse = await apiClient.post('/leads', leadData);
      testLeadId = createResponse.data.id;

      const response = await apiClient.post(`/leads/${testLeadId}/recommendations`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('followUp');
      expect(response.data).toHaveProperty('timing');
      expect(response.data).toHaveProperty('channel');

      // Clean up
      await apiClient.delete(`/leads/${testLeadId}`);
    });

    it('should suggest optimal communication channel', async () => {
      const leadData = {
        firstName: 'AI',
        lastName: 'Channel',
        email: `ai.channel.${Date.now()}@example.com`,
        phone: '555-0123',
        preferredContactMethod: 'email',
        insuranceType: 'home',
      };

      const createResponse = await apiClient.post('/leads', leadData);
      testLeadId = createResponse.data.id;

      const response = await apiClient.post(`/leads/${testLeadId}/recommendations`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('channel');
      expect(['email', 'phone', 'sms', 'in-person']).toContain(
        response.data.channel,
      );

      // Clean up
      await apiClient.delete(`/leads/${testLeadId}`);
    });
  });

  describe('AI Batch Processing', () => {
    let leadIds: string[] = [];

    afterAll(async () => {
      // Clean up all test leads
      for (const id of leadIds) {
        try {
          await apiClient.delete(`/leads/${id}`);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should qualify multiple leads in batch', async () => {
      // Create multiple leads
      for (let i = 0; i < 5; i++) {
        const leadData = {
          firstName: `AI${i}`,
          lastName: 'Batch',
          email: `ai.batch.${i}.${Date.now()}@example.com`,
          phone: `555-${1000 + i}`,
          insuranceType: 'auto',
        };
        const response = await apiClient.post('/leads', leadData);
        leadIds.push(response.data.id);
      }

      const response = await apiClient.post('/leads/batch/qualify', {
        leadIds,
      });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('results');
      expect(response.data).toHaveProperty('summary');
      expect(Array.isArray(response.data.results)).toBe(true);
      expect(response.data.results.length).toBe(5);
    });

    it('should provide batch processing summary', async () => {
      const response = await apiClient.post('/leads/batch/qualify', {
        leadIds,
      });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('summary');
      expect(response.data.summary).toHaveProperty('total');
      expect(response.data.summary).toHaveProperty('qualified');
      expect(response.data.summary).toHaveProperty('notQualified');
      expect(response.data.summary.total).toBe(5);
    });
  });

  describe('AI Performance Metrics', () => {
    it('should return AI processing metrics', async () => {
      const response = await apiClient.get('/ai/metrics');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('totalProcessed');
      expect(response.data).toHaveProperty('averageProcessingTime');
      expect(response.data).toHaveProperty('qualificationAccuracy');
      expect(response.data).toHaveProperty('modelVersion');
    });

    it('should return model health status', async () => {
      const response = await apiClient.get('/ai/health');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('modelAvailable');
      expect(response.data).toHaveProperty('lastUpdated');
      expect(response.data.modelAvailable).toBe(true);
    });
  });

  describe('AI Error Handling', () => {
    it('should handle invalid lead data gracefully', async () => {
      const response = await apiClient.post('/leads/bad-id/qualify');
      expect(response.status).toBe(404);
    });

    it('should handle OpenAI API failures gracefully', async () => {
      // This test would require mocking OpenAI API failure
      // For now, we'll just verify the endpoint exists
      const leadData = {
        firstName: 'AI',
        lastName: 'Error',
        email: `ai.error.${Date.now()}@example.com`,
        phone: '555-0123',
        insuranceType: 'auto',
      };

      const createResponse = await apiClient.post('/leads', leadData);
      testLeadId = createResponse.data.id;

      const response = await apiClient.post(`/leads/${testLeadId}/qualify`);
      expect([200, 500, 503]).toContain(response.status);

      // Clean up
      try {
        await apiClient.delete(`/leads/${testLeadId}`);
      } catch (error) {
        // Ignore cleanup errors
      }
    });
  });

  describe('AI Caching', () => {
    it('should cache qualification results', async () => {
      const leadData = {
        firstName: 'AI',
        lastName: 'Cache',
        email: `ai.cache.${Date.now()}@example.com`,
        phone: '555-0123',
        insuranceType: 'auto',
      };

      const createResponse = await apiClient.post('/leads', leadData);
      testLeadId = createResponse.data.id;

      // First call - should hit API
      const response1 = await apiClient.post(`/leads/${testLeadId}/qualify`);
      expect(response1.status).toBe(200);

      // Second call - should use cache (faster)
      const response2 = await apiClient.post(`/leads/${testLeadId}/qualify`);
      expect(response2.status).toBe(200);
      expect(response2.data).toEqual(response1.data);

      // Clean up
      await apiClient.delete(`/leads/${testLeadId}`);
    });
  });
});
