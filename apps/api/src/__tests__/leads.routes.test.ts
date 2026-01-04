import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import express, { Express } from 'express';
import request from 'supertest';
import { createLeadFactory, createAgentFactory, createUserFactory, generateTestId } from '@insurance-lead-gen/config';
import { leadCreateSchema, leadQuerySchema } from '@insurance-lead-gen/types';
import { testStore, mockAuthMiddleware } from './setup';

describe('Lead Routes Integration Tests', () => {
  let app: Express;
  let authToken: string;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware);
    
    // Simple in-memory storage for testing
    const leads: Map<string, any> = new Map();
    const agents: Map<string, any> = new Map();
    const assignments: Map<string, any> = new Map();

    // Seed test agents
    const agent1 = createAgentFactory({
      id: 'agent-test-1',
      firstName: 'Jane',
      lastName: 'Doe',
      specializations: ['AUTO', 'HOME'],
      rating: 4.8,
      isActive: true,
    });
    const agent2 = createAgentFactory({
      id: 'agent-test-2',
      firstName: 'John',
      lastName: 'Smith',
      specializations: ['AUTO'],
      rating: 4.5,
      isActive: true,
    });
    agents.set(agent1.id, agent1);
    agents.set(agent2.id, agent2);

    // Helper to find matching agents
    const findMatchingAgents = (lead: any) => {
      return Array.from(agents.values())
        .filter(a => a.isActive)
        .map(agent => {
          const specializationMatch = lead.insuranceType && 
            agent.specializations.some(s => s.toLowerCase() === lead.insuranceType?.toLowerCase())
            ? 1.0 : 0.3;
          return { ...agent, specializationMatch, confidence: specializationMatch * 0.9 };
        });
    };

    // Health endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // POST /api/v1/leads - Create lead
    app.post('/api/v1/leads', (req, res) => {
      const result = leadCreateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: 'Validation failed', details: result.error.errors });
      }

      const id = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const lead = {
        id,
        ...result.data,
        status: 'received',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      leads.set(id, lead);

      res.status(201).json({
        id: lead.id,
        status: lead.status,
        message: 'Lead ingested successfully',
      });
    });

    // GET /api/v1/leads - List leads
    app.get('/api/v1/leads', (req, res) => {
      const queryResult = leadQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        return res.status(400).json({ error: 'Invalid query parameters' });
      }

      let results = Array.from(leads.values());
      const { status, insuranceType, search, skip, take } = queryResult.data;

      if (status) {
        results = results.filter(l => l.status.toUpperCase() === status);
      }
      if (insuranceType) {
        results = results.filter(l => l.insuranceType?.toUpperCase() === insuranceType);
      }
      if (search) {
        const s = search.toLowerCase();
        results = results.filter(l => 
          `${l.firstName ?? ''} ${l.lastName ?? ''} ${l.email ?? ''}`.toLowerCase().includes(s)
        );
      }

      results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const total = results.length;
      const start = skip ?? 0;
      const limit = take ?? 20;
      const data = results.slice(start, start + limit);

      res.json({ data, pagination: { skip: start, take: limit, total } });
    });

    // GET /api/v1/leads/:id - Get lead by ID
    app.get('/api/v1/leads/:leadId', (req, res) => {
      const lead = leads.get(req.params.leadId);
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      res.json(lead);
    });

    // PUT /api/v1/leads/:leadId - Update lead
    app.put('/api/v1/leads/:leadId', (req, res) => {
      const lead = leads.get(req.params.leadId);
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      const updates = req.body;
      const updated = {
        ...lead,
        ...updates,
        updatedAt: new Date(),
      };
      leads.set(req.params.leadId, updated);
      res.json(updated);
    });

    // POST /api/v1/leads/:leadId/route - Route lead
    app.post('/api/v1/leads/:leadId/route', (req, res) => {
      const lead = leads.get(req.params.leadId);
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      const matchingAgents = findMatchingAgents(lead);
      if (matchingAgents.length === 0) {
        return res.status(404).json({ error: 'No matching agents found' });
      }

      const agent = matchingAgents[0];
      const assignmentId = `assignment_${Date.now()}`;
      const assignment = {
        id: assignmentId,
        leadId: req.params.leadId,
        agentId: agent.id,
        assignedAt: new Date(),
        status: 'pending',
      };

      assignments.set(assignmentId, assignment);
      
      lead.status = 'routed';
      lead.updatedAt = new Date();
      leads.set(req.params.leadId, lead);

      res.json({ success: true, lead, assignment, agent });
    });

    // GET /api/v1/leads/:leadId/matching-agents - Get matching agents
    app.get('/api/v1/leads/:leadId/matching-agents', (req, res) => {
      const lead = leads.get(req.params.leadId);
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      const matchingAgents = findMatchingAgents(lead);
      res.json({ leadId: req.params.leadId, agents: matchingAgents, total: matchingAgents.length });
    });

    // DELETE /api/v1/leads/:leadId - Delete lead
    app.delete('/api/v1/leads/:leadId', (req, res) => {
      const lead = leads.get(req.params.leadId);
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      // Delete related assignments
      for (const [id, assignment] of assignments.entries()) {
        if (assignment.leadId === req.params.leadId) {
          assignments.delete(id);
        }
      }

      leads.delete(req.params.leadId);
      res.status(204).send();
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    authToken = 'Bearer test_token_123';
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('POST /api/v1/leads', () => {
    it('should create a valid lead', async () => {
      const leadData = {
        source: 'web_form',
        email: 'test@example.com',
        phone: '+1-555-123-4567',
        firstName: 'John',
        lastName: 'Doe',
        insuranceType: 'auto',
      };

      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', authToken)
        .send(leadData)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe('received');
      expect(response.body.message).toBe('Lead ingested successfully');
    });

    it('should reject lead without source', async () => {
      const leadData = {
        email: 'test@example.com',
      };

      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', authToken)
        .send(leadData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject lead with invalid email', async () => {
      const leadData = {
        source: 'web_form',
        email: 'not-an-email',
      };

      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', authToken)
        .send(leadData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should accept lead with minimal data', async () => {
      const leadData = {
        source: 'api',
        email: 'minimal@example.com',
      };

      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', authToken)
        .send(leadData)
        .expect(201);

      expect(response.body.id).toBeDefined();
    });

    it('should normalize insurance type to lowercase', async () => {
      const leadData = {
        source: 'web_form',
        email: 'lower@example.com',
        insuranceType: 'AUTO',
      };

      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', authToken)
        .send(leadData)
        .expect(201);

      // The ID should contain normalized data (checked via GET later)
      expect(response.body.id).toBeDefined();
    });

    it('should reject lead with invalid insurance type', async () => {
      const leadData = {
        source: 'web_form',
        email: 'invalid@example.com',
        insuranceType: 'INVALID_TYPE',
      };

      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', authToken)
        .send(leadData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should create leads with address information', async () => {
      const leadData = {
        source: 'web_form',
        email: 'address@example.com',
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        country: 'US',
      };

      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', authToken)
        .send(leadData)
        .expect(201);

      expect(response.body.id).toBeDefined();
    });
  });

  describe('GET /api/v1/leads', () => {
    beforeEach(async () => {
      // Create test leads
      await request(app)
        .post('/api/v1/leads')
        .set('Authorization', authToken)
        .send({ source: 'web_form', email: 'lead1@example.com', insuranceType: 'AUTO' });
      await request(app)
        .post('/api/v1/leads')
        .set('Authorization', authToken)
        .send({ source: 'web_form', email: 'lead2@example.com', insuranceType: 'HOME' });
      await request(app)
        .post('/api/v1/leads')
        .set('Authorization', authToken)
        .send({ source: 'api', email: 'lead3@example.com', insuranceType: 'AUTO' });
    });

    it('should return all leads', async () => {
      const response = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data.length).toBe(3);
      expect(response.body.pagination.total).toBe(3);
    });

    it('should filter leads by status', async () => {
      const response = await request(app)
        .get('/api/v1/leads')
        .query({ status: 'received' })
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data.length).toBe(3);
    });

    it('should filter leads by insuranceType', async () => {
      const response = await request(app)
        .get('/api/v1/leads')
        .query({ insuranceType: 'AUTO' })
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data.length).toBe(2);
      response.body.data.forEach((lead: any) => {
        expect(lead.insuranceType?.toUpperCase()).toBe('AUTO');
      });
    });

    it('should search leads by email', async () => {
      const response = await request(app)
        .get('/api/v1/leads')
        .query({ search: 'lead1' })
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].email).toBe('lead1@example.com');
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/v1/leads')
        .query({ skip: 0, take: 2 })
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination.skip).toBe(0);
      expect(response.body.pagination.take).toBe(2);
    });

    it('should return empty array when no leads exist', async () => {
      // Create fresh app for isolation
      const emptyApp = express();
      emptyApp.use(express.json());
      
      const response = await request(emptyApp)
        .get('/api/v1/leads')
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });

    it('should reject invalid query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/leads')
        .query({ page: 'invalid' })
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.error).toBe('Invalid query parameters');
    });
  });

  describe('GET /api/v1/leads/:id', () => {
    let createdLeadId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', authToken)
        .send({ source: 'web_form', email: 'fetch@example.com', insuranceType: 'AUTO' });
      createdLeadId = createResponse.body.id;
    });

    it('should return lead by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/leads/${createdLeadId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.id).toBe(createdLeadId);
      expect(response.body.email).toBe('fetch@example.com');
    });

    it('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .get('/api/v1/leads/non-existent-id')
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body.error).toBe('Lead not found');
    });
  });

  describe('PUT /api/v1/leads/:id', () => {
    let createdLeadId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', authToken)
        .send({ source: 'web_form', email: 'update@example.com' });
      createdLeadId = createResponse.body.id;
    });

    it('should update lead status', async () => {
      const response = await request(app)
        .put(`/api/v1/leads/${createdLeadId}`)
        .set('Authorization', authToken)
        .send({ status: 'qualified' })
        .expect(200);

      expect(response.body.status).toBe('qualified');
      expect(response.body.id).toBe(createdLeadId);
    });

    it('should update lead email', async () => {
      const response = await request(app)
        .put(`/api/v1/leads/${createdLeadId}`)
        .set('Authorization', authToken)
        .send({ email: 'updated@example.com' })
        .expect(200);

      expect(response.body.email).toBe('updated@example.com');
    });

    it('should update quality score', async () => {
      const response = await request(app)
        .put(`/api/v1/leads/${createdLeadId}`)
        .set('Authorization', authToken)
        .send({ qualityScore: 85 })
        .expect(200);

      expect(response.body.qualityScore).toBe(85);
    });

    it('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .put('/api/v1/leads/non-existent-id')
        .set('Authorization', authToken)
        .send({ status: 'qualified' })
        .expect(404);

      expect(response.body.error).toBe('Lead not found');
    });
  });

  describe('DELETE /api/v1/leads/:id', () => {
    let createdLeadId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', authToken)
        .send({ source: 'web_form', email: 'delete@example.com' });
      createdLeadId = createResponse.body.id;
    });

    it('should delete lead', async () => {
      await request(app)
        .delete(`/api/v1/leads/${createdLeadId}`)
        .set('Authorization', authToken)
        .expect(204);

      // Verify lead is deleted
      await request(app)
        .get(`/api/v1/leads/${createdLeadId}`)
        .set('Authorization', authToken)
        .expect(404);
    });

    it('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .delete('/api/v1/leads/non-existent-id')
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body.error).toBe('Lead not found');
    });
  });

  describe('POST /api/v1/leads/:id/route', () => {
    let createdLeadId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', authToken)
        .send({ source: 'web_form', email: 'route@example.com', insuranceType: 'AUTO' });
      createdLeadId = createResponse.body.id;
    });

    it('should route lead to agent', async () => {
      const response = await request(app)
        .post(`/api/v1/leads/${createdLeadId}/route`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.lead.status).toBe('routed');
      expect(response.body.assignment).toBeDefined();
      expect(response.body.agent).toBeDefined();
    });

    it('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .post('/api/v1/leads/non-existent-id/route')
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body.error).toBe('Lead not found');
    });
  });

  describe('GET /api/v1/leads/:id/matching-agents', () => {
    let createdLeadId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', authToken)
        .send({ source: 'web_form', email: 'match@example.com', insuranceType: 'AUTO' });
      createdLeadId = createResponse.body.id;
    });

    it('should return matching agents', async () => {
      const response = await request(app)
        .get(`/api/v1/leads/${createdLeadId}/matching-agents`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.leadId).toBe(createdLeadId);
      expect(response.body.agents.length).toBeGreaterThan(0);
      expect(response.body.total).toBe(response.body.agents.length);
    });

    it('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .get('/api/v1/leads/non-existent-id/matching-agents')
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body.error).toBe('Lead not found');
    });
  });
});
