import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { app } from '../../app.js';
import { resetStore } from '../../storage/in-memory.js';

const AUTH_HEADER = { Authorization: 'Bearer dev-token' };

describe('Leads API Performance Tests', () => {
  const PERFORMANCE_THRESHOLDS = {
    createLead: 500, // ms
    getLead: 200, // ms
    listLeads: 300, // ms
    updateLead: 300, // ms
    deleteLead: 300, // ms
  };

  const BULK_OPERATIONS_COUNT = 10;

  beforeEach(() => {
    resetStore();
  });

  describe('Single Operation Performance', () => {
    it('should create lead within threshold', async () => {
      const startTime = Date.now();

      await request(app)
        .post('/api/v1/leads')
        .set(AUTH_HEADER)
        .send({
          firstName: 'Performance',
          lastName: 'Test',
          email: 'performance-test-1@example.com',
          phone: '+1-555-0600',
          insuranceType: 'AUTO',
          source: 'WEB_FORM',
          city: 'Performance City',
          state: 'PC',
          zipCode: '12345',
        })
        .expect(201);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.createLead);
    });

    it('should get lead within threshold', async () => {
      const createResponse = await request(app)
        .post('/api/v1/leads')
        .set(AUTH_HEADER)
        .send({
          firstName: 'Performance',
          lastName: 'Get',
          email: 'performance-test-2@example.com',
          phone: '+1-555-0601',
          insuranceType: 'HOME',
          source: 'API',
          city: 'Performance City',
          state: 'PC',
          zipCode: '12346',
        });

      const leadId = createResponse.body.id;

      const startTime = Date.now();

      await request(app).get(`/api/v1/leads/${leadId}`).set(AUTH_HEADER).expect(200);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.getLead);
    });

    it('should list leads within threshold', async () => {
      await request(app)
        .post('/api/v1/leads')
        .set(AUTH_HEADER)
        .send({ firstName: 'List', lastName: 'One', email: 'performance-list-1@example.com', insuranceType: 'AUTO', source: 'API' });

      const startTime = Date.now();

      await request(app).get('/api/v1/leads?skip=0&take=10').set(AUTH_HEADER).expect(200);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.listLeads);
    });

    it('should update lead within threshold', async () => {
      const createResponse = await request(app)
        .post('/api/v1/leads')
        .set(AUTH_HEADER)
        .send({
          firstName: 'Performance',
          lastName: 'Update',
          email: 'performance-test-3@example.com',
          phone: '+1-555-0602',
          insuranceType: 'LIFE',
          source: 'WEB_FORM',
          city: 'Performance City',
          state: 'PC',
          zipCode: '12347',
        });

      const leadId = createResponse.body.id;

      const startTime = Date.now();

      await request(app)
        .put(`/api/v1/leads/${leadId}`)
        .set(AUTH_HEADER)
        .send({ firstName: 'Updated' })
        .expect(200);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.updateLead);
    });

    it('should delete lead within threshold', async () => {
      const createResponse = await request(app)
        .post('/api/v1/leads')
        .set(AUTH_HEADER)
        .send({
          firstName: 'Performance',
          lastName: 'Delete',
          email: 'performance-test-4@example.com',
          phone: '+1-555-0603',
          insuranceType: 'HEALTH',
          source: 'API',
          city: 'Performance City',
          state: 'PC',
          zipCode: '12348',
        });

      const leadId = createResponse.body.id;

      const startTime = Date.now();

      await request(app).delete(`/api/v1/leads/${leadId}`).set(AUTH_HEADER).expect(204);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.deleteLead);
    });
  });

  describe('Bulk Operation Performance', () => {
    it('should handle concurrent lead creation', async () => {
      const startTime = Date.now();

      const promises = Array.from({ length: BULK_OPERATIONS_COUNT }, (_, i) =>
        request(app)
          .post('/api/v1/leads')
          .set(AUTH_HEADER)
          .send({
            firstName: 'Bulk',
            lastName: `Test${i}`,
            email: `bulk-performance-test-${i}@example.com`,
            phone: `+1-555-07${String(i).padStart(2, '0')}`,
            insuranceType: 'AUTO',
            source: 'API',
            city: 'Bulk City',
            state: 'BC',
            zipCode: '99999',
          })
      );

      const results = await Promise.all(promises);

      const duration = Date.now() - startTime;

      for (const r of results) {
        expect(r.status).toBe(201);
        expect(r.body).toHaveProperty('id');
      }

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.createLead * BULK_OPERATIONS_COUNT);
    });
  });
});
