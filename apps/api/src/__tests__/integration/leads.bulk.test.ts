import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { app } from '../../app.js';
import { resetStore, store } from '../../storage/in-memory.js';

const AUTH_HEADER = { Authorization: 'Bearer dev-token' };

describe('Leads API Bulk Operations', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('POST /api/v1/leads/bulk/update', () => {
    it('should bulk update leads successfully', async () => {
      const leadIds: string[] = [];

      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/v1/leads')
          .set(AUTH_HEADER)
          .send({
            firstName: 'Bulk',
            lastName: `Update${i}`,
            email: `bulk-update-${i}@example.com`,
            phone: `+1-555-08${i}`,
            insuranceType: 'AUTO',
            source: 'API',
          });
        leadIds.push(response.body.id);
      }

      const response = await request(app)
        .post('/api/v1/leads/bulk/update')
        .set(AUTH_HEADER)
        .send({
          lead_ids: leadIds,
          updates: { status: 'contacted', priority: 'high' },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toHaveLength(3);
      expect(response.body.failed).toHaveLength(0);
      expect(response.body.message).toContain('Updated 3 lead(s)');
    });

    it('should return 400 for empty lead_ids array', async () => {
      const response = await request(app)
        .post('/api/v1/leads/bulk/update')
        .set(AUTH_HEADER)
        .send({
          lead_ids: [],
          updates: { status: 'contacted' },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('lead_ids must be a non-empty array');
    });

    it('should handle partial failures in bulk update', async () => {
      const leadIds: string[] = [];

      const createResponse = await request(app)
        .post('/api/v1/leads')
        .set(AUTH_HEADER)
        .send({
          firstName: 'Valid',
          lastName: 'Lead',
          email: 'valid@example.com',
          phone: '+1-555-0900',
          insuranceType: 'AUTO',
          source: 'API',
        });
      leadIds.push(createResponse.body.id);

      leadIds.push('non-existent-id-1');
      leadIds.push('non-existent-id-2');

      const response = await request(app)
        .post('/api/v1/leads/bulk/update')
        .set(AUTH_HEADER)
        .send({
          lead_ids: leadIds,
          updates: { status: 'qualified' },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toHaveLength(1);
      expect(response.body.failed).toHaveLength(2);
    });
  });

  describe('POST /api/v1/leads/bulk/assign', () => {
    it('should bulk assign leads to an agent', async () => {
      const leadIds: string[] = [];

      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/v1/leads')
          .set(AUTH_HEADER)
          .send({
            firstName: 'Bulk',
            lastName: `Assign${i}`,
            email: `bulk-assign-${i}@example.com`,
            phone: `+1-555-10${i}`,
            insuranceType: 'AUTO',
            source: 'API',
          });
        leadIds.push(response.body.id);
      }

      const response = await request(app)
        .post('/api/v1/leads/bulk/assign')
        .set(AUTH_HEADER)
        .send({
          lead_ids: leadIds,
          assignee_id: 'agent-1',
          reason: 'Bulk assignment test',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toHaveLength(3);
      expect(response.body.message).toContain('Assigned 3 lead(s)');
    });

    it('should return 400 when assignee_id is missing', async () => {
      const response = await request(app)
        .post('/api/v1/leads/bulk/assign')
        .set(AUTH_HEADER)
        .send({
          lead_ids: ['lead-1', 'lead-2'],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('assignee_id is required');
    });

    it('should return 404 when agent not found', async () => {
      const response = await request(app)
        .post('/api/v1/leads/bulk/assign')
        .set(AUTH_HEADER)
        .send({
          lead_ids: ['lead-1', 'lead-2'],
          assignee_id: 'non-existent-agent',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Agent not found');
    });
  });

  describe('POST /api/v1/leads/bulk/status', () => {
    it('should bulk update lead status', async () => {
      const leadIds: string[] = [];

      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/v1/leads')
          .set(AUTH_HEADER)
          .send({
            firstName: 'Bulk',
            lastName: `Status${i}`,
            email: `bulk-status-${i}@example.com`,
            phone: `+1-555-11${i}`,
            insuranceType: 'HOME',
            source: 'API',
          });
        leadIds.push(response.body.id);
      }

      const response = await request(app)
        .post('/api/v1/leads/bulk/status')
        .set(AUTH_HEADER)
        .send({
          lead_ids: leadIds,
          status: 'qualified',
          reason: 'Bulk status update test',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toHaveLength(3);
      expect(response.body.message).toContain('Updated status for 3 lead(s)');
    });

    it('should return 400 when status is missing', async () => {
      const response = await request(app)
        .post('/api/v1/leads/bulk/status')
        .set(AUTH_HEADER)
        .send({
          lead_ids: ['lead-1', 'lead-2'],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('status is required');
    });

    it('should return 400 for empty lead_ids array', async () => {
      const response = await request(app)
        .post('/api/v1/leads/bulk/status')
        .set(AUTH_HEADER)
        .send({
          lead_ids: [],
          status: 'qualified',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('lead_ids must be a non-empty array');
    });
  });

  describe('POST /api/v1/leads/bulk/delete', () => {
    it('should bulk delete leads successfully', async () => {
      const leadIds: string[] = [];

      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/v1/leads')
          .set(AUTH_HEADER)
          .send({
            firstName: 'Bulk',
            lastName: `Delete${i}`,
            email: `bulk-delete-${i}@example.com`,
            phone: `+1-555-12${i}`,
            insuranceType: 'LIFE',
            source: 'API',
          });
        leadIds.push(response.body.id);
      }

      const response = await request(app)
        .post('/api/v1/leads/bulk/delete')
        .set(AUTH_HEADER)
        .send({
          lead_ids: leadIds,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toHaveLength(3);
      expect(response.body.message).toContain('Deleted 3 lead(s)');

      for (const leadId of leadIds) {
        const getResponse = await request(app)
          .get(`/api/v1/leads/${leadId}`)
          .set(AUTH_HEADER);
        expect(getResponse.status).toBe(404);
      }
    });

    it('should handle partial failures in bulk delete', async () => {
      const leadIds: string[] = [];

      const createResponse = await request(app)
        .post('/api/v1/leads')
        .set(AUTH_HEADER)
        .send({
          firstName: 'Valid',
          lastName: 'Delete',
          email: 'valid-delete@example.com',
          phone: '+1-555-1300',
          insuranceType: 'AUTO',
          source: 'API',
        });
      leadIds.push(createResponse.body.id);

      leadIds.push('non-existent-id-1');
      leadIds.push('non-existent-id-2');

      const response = await request(app)
        .post('/api/v1/leads/bulk/delete')
        .set(AUTH_HEADER)
        .send({
          lead_ids: leadIds,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toHaveLength(1);
      expect(response.body.failed).toHaveLength(2);
    });

    it('should return 400 for empty lead_ids array', async () => {
      const response = await request(app)
        .post('/api/v1/leads/bulk/delete')
        .set(AUTH_HEADER)
        .send({
          lead_ids: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('lead_ids must be a non-empty array');
    });
  });

  describe('Bulk Operations Activity Logging', () => {
    it('should create activity log for bulk update', async () => {
      const leadIds: string[] = [];

      const createResponse = await request(app)
        .post('/api/v1/leads')
        .set(AUTH_HEADER)
        .send({
          firstName: 'Activity',
          lastName: 'Test',
          email: 'activity-test@example.com',
          phone: '+1-555-1400',
          insuranceType: 'AUTO',
          source: 'API',
        });
      leadIds.push(createResponse.body.id);

      await request(app)
        .post('/api/v1/leads/bulk/update')
        .set(AUTH_HEADER)
        .send({
          lead_ids: leadIds,
          updates: { status: 'contacted' },
        });

      const activities = Array.from(store.activities.values());
      const bulkActivity = activities.find(a => a.action === 'Bulk updated leads');
      expect(bulkActivity).toBeDefined();
      expect(bulkActivity?.metadata.lead_ids).toEqual(leadIds);
    });

    it('should create activity log for bulk status update', async () => {
      const leadIds: string[] = [];

      const createResponse = await request(app)
        .post('/api/v1/leads')
        .set(AUTH_HEADER)
        .send({
          firstName: 'Status',
          lastName: 'Activity',
          email: 'status-activity@example.com',
          phone: '+1-555-1500',
          insuranceType: 'HOME',
          source: 'API',
        });
      leadIds.push(createResponse.body.id);

      await request(app)
        .post('/api/v1/leads/bulk/status')
        .set(AUTH_HEADER)
        .send({
          lead_ids: leadIds,
          status: 'qualified',
          reason: 'Activity test',
        });

      const activities = Array.from(store.activities.values());
      const statusActivity = activities.find(a => a.action === 'Bulk updated lead status');
      expect(statusActivity).toBeDefined();
      expect(statusActivity?.metadata.status).toBe('qualified');
    });
  });

  describe('Bulk Operations with Real Agent', () => {
    beforeEach(() => {
      store.agents.set('agent-1', {
        id: 'agent-1',
        firstName: 'Test',
        lastName: 'Agent',
        email: 'testagent@example.com',
        specializations: ['AUTO', 'HOME'],
        location: { city: 'Test City', state: 'TC', country: 'USA' },
        rating: 4.5,
        currentLeadCount: 0,
        maxLeadCapacity: 10,
        conversionRate: 0.25,
        isActive: true,
        routingFactors: {
          specializationMatch: 0.8,
          locationProximity: 0.9,
          performanceScore: 0.85,
          currentWorkload: 1.0,
          qualityTierAlignment: 0.9,
        },
        confidence: 0.89,
      });
    });

    it('should bulk assign leads with agent capacity check', async () => {
      const leadIds: string[] = [];

      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/v1/leads')
          .set(AUTH_HEADER)
          .send({
            firstName: 'Capacity',
            lastName: `Test${i}`,
            email: `capacity-test-${i}@example.com`,
            phone: `+1-555-16${i}`,
            insuranceType: 'AUTO',
            source: 'API',
          });
        leadIds.push(response.body.id);
      }

      const response = await request(app)
        .post('/api/v1/leads/bulk/assign')
        .set(AUTH_HEADER)
        .send({
          lead_ids: leadIds,
          assignee_id: 'agent-1',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toHaveLength(5);

      const agent = store.agents.get('agent-1');
      expect(agent?.currentLeadCount).toBe(5);
    });

    it('should handle agent at capacity', async () => {
      const agent = store.agents.get('agent-1');
      agent!.currentLeadCount = 10;
      store.agents.set('agent-1', agent!);

      const leadIds: string[] = [];

      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/v1/leads')
          .set(AUTH_HEADER)
          .send({
            firstName: 'Full',
            lastName: `Agent${i}`,
            email: `full-agent-${i}@example.com`,
            phone: `+1-555-17${i}`,
            insuranceType: 'AUTO',
            source: 'API',
          });
        leadIds.push(response.body.id);
      }

      const response = await request(app)
        .post('/api/v1/leads/bulk/assign')
        .set(AUTH_HEADER)
        .send({
          lead_ids: leadIds,
          assignee_id: 'agent-1',
        });

      expect(response.status).toBe(200);
      expect(response.body.failed).toHaveLength(3);
      expect(response.body.failed[0].error).toContain('maximum lead capacity');
    });
  });
});
