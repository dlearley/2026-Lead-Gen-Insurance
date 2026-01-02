/**
 * Lead Management Smoke Tests
 *
 * Verifies all critical lead management operations
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TIMEOUT = parseInt(process.env.TEST_TIMEOUT || '30000', 10);

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

describe('Lead Management Smoke Tests', () => {
  describe('Lead Creation', () => {
    it('should create a new lead successfully', async () => {
      const leadData = {
        firstName: 'Smoke',
        lastName: 'Test',
        email: `smoke.test.${Date.now()}@example.com`,
        phone: '555-0123',
        dateOfBirth: '1990-01-01',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
        },
        insuranceType: 'auto',
        coverageAmount: 50000,
      };

      const response = await apiClient.post('/leads', leadData);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('firstName', leadData.firstName);
      expect(response.data).toHaveProperty('lastName', leadData.lastName);
      expect(response.data).toHaveProperty('email', leadData.email);
      testLeadId = response.data.id;
    });

    it('should validate required fields', async () => {
      const invalidLeadData = {
        firstName: 'Test',
        // Missing required fields
      };

      try {
        await apiClient.post('/leads', invalidLeadData);
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
        expect(error.response?.data).toHaveProperty('errors');
      }
    });
  });

  describe('Lead Retrieval', () => {
    it('should retrieve a lead by ID', async () => {
      const response = await apiClient.get(`/leads/${testLeadId}`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', testLeadId);
      expect(response.data).toHaveProperty('firstName');
      expect(response.data).toHaveProperty('lastName');
    });

    it('should retrieve all leads with pagination', async () => {
      const response = await apiClient.get('/leads?page=1&limit=10');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      expect(response.data).toHaveProperty('pagination');
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it('should search leads by email', async () => {
      const response = await apiClient.get(`/leads?email=smoke.test.${Date.now()}@example.com`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
    });

    it('should return 404 for non-existent lead', async () => {
      try {
        await apiClient.get('/leads/non-existent-id');
        fail('Should have thrown 404 error');
      } catch (error: any) {
        expect(error.response?.status).toBe(404);
      }
    });
  });

  describe('Lead Updates', () => {
    it('should update lead information', async () => {
      const updateData = {
        phone: '555-0999',
        status: 'contacted',
      };

      const response = await apiClient.patch(`/leads/${testLeadId}`, updateData);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('phone', updateData.phone);
      expect(response.data).toHaveProperty('status', updateData.status);
    });

    it('should add notes to lead', async () => {
      const noteData = {
        content: 'Smoke test note',
        createdBy: 'system',
      };

      const response = await apiClient.post(`/leads/${testLeadId}/notes`, noteData);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('content', noteData.content);
    });
  });

  describe('Lead Status Management', () => {
    it('should update lead status', async () => {
      const response = await apiClient.patch(`/leads/${testLeadId}/status`, {
        status: 'qualified',
      });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'qualified');
    });

    it('should track status changes', async () => {
      const response = await apiClient.get(`/leads/${testLeadId}/history`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      const statusChange = response.data.find((h: any) => h.field === 'status');
      expect(statusChange).toBeDefined();
    });
  });

  describe('Lead Assignment', () => {
    it('should assign lead to agent', async () => {
      // First create a test agent
      const agentData = {
        firstName: 'Test',
        lastName: 'Agent',
        email: `agent.${Date.now()}@example.com`,
        role: 'agent',
      };

      const agentResponse = await apiClient.post('/users', agentData);
      const agentId = agentResponse.data.id;

      // Assign lead to agent
      const response = await apiClient.patch(`/leads/${testLeadId}/assign`, {
        agentId,
      });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('assignedAgentId', agentId);
    });

    it('should retrieve leads by agent', async () => {
      const response = await apiClient.get('/leads/agent-assigned');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
    });
  });

  describe('Lead Deletion', () => {
    it('should soft delete lead', async () => {
      const response = await apiClient.delete(`/leads/${testLeadId}`);
      expect(response.status).toBe(204);
    });

    it('should not retrieve deleted lead', async () => {
      try {
        await apiClient.get(`/leads/${testLeadId}`);
        fail('Should have thrown 404 error for deleted lead');
      } catch (error: any) {
        expect(error.response?.status).toBe(404);
      }
    });
  });

  describe('Lead Filtering and Search', () => {
    let leadIds: string[] = [];

    beforeAll(async () => {
      // Create test leads for filtering
      const leadTypes = ['auto', 'home', 'life', 'health'];
      for (const type of leadTypes) {
        const leadData = {
          firstName: 'Filter',
          lastName: 'Test',
          email: `filter.${type}.${Date.now()}@example.com`,
          phone: '555-0123',
          insuranceType: type,
          status: 'new',
        };
        const response = await apiClient.post('/leads', leadData);
        leadIds.push(response.data.id);
      }
    });

    afterAll(async () => {
      // Clean up test leads
      for (const id of leadIds) {
        try {
          await apiClient.delete(`/leads/${id}`);
        } catch (error) {
          // Ignore errors if lead doesn't exist
        }
      }
    });

    it('should filter leads by insurance type', async () => {
      const response = await apiClient.get('/leads?insuranceType=auto');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      expect(response.data.data.every((l: any) => l.insuranceType === 'auto')).toBe(true);
    });

    it('should filter leads by status', async () => {
      const response = await apiClient.get('/leads?status=new');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      expect(response.data.data.every((l: any) => l.status === 'new')).toBe(true);
    });

    it('should filter leads by date range', async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiClient.get(`/leads?createdAfter=${today}`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
    });
  });

  describe('Lead Scoring and Qualification', () => {
    it('should calculate lead score', async () => {
      const leadData = {
        firstName: 'Score',
        lastName: 'Test',
        email: `score.test.${Date.now()}@example.com`,
        phone: '555-0123',
        insuranceType: 'auto',
      };

      const createResponse = await apiClient.post('/leads', leadData);
      const leadId = createResponse.data.id;

      const response = await apiClient.post(`/leads/${leadId}/score`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('score');
      expect(typeof response.data.score).toBe('number');

      // Clean up
      await apiClient.delete(`/leads/${leadId}`);
    });

    it('should qualify lead automatically', async () => {
      const leadData = {
        firstName: 'Qualify',
        lastName: 'Test',
        email: `qualify.test.${Date.now()}@example.com`,
        phone: '555-0123',
        insuranceType: 'auto',
        annualIncome: 100000,
      };

      const createResponse = await apiClient.post('/leads', leadData);
      const leadId = createResponse.data.id;

      const response = await apiClient.post(`/leads/${leadId}/qualify`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('qualified');
      expect(response.data).toHaveProperty('confidence');

      // Clean up
      await apiClient.delete(`/leads/${leadId}`);
    });
  });
});
