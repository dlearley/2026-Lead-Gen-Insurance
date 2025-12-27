import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { app } from '../../app.js';
import { resetStore } from '../../storage/in-memory.js';

const AUTH_HEADER = { Authorization: 'Bearer dev-token' };

describe('Leads API Integration Tests', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('POST /api/v1/leads', () => {
    it('should create a new lead', async () => {
      const newLead = {
        firstName: 'Test',
        lastName: 'Integration',
        email: 'test-integration@example.com',
        phone: '+1-555-0100',
        insuranceType: 'AUTO',
        source: 'WEB_FORM',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90001',
      };

      const response = await request(app)
        .post('/api/v1/leads')
        .set(AUTH_HEADER)
        .send(newLead)
        .expect(201)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        firstName: 'Test',
        lastName: 'Integration',
        email: 'test-integration@example.com',
        insuranceType: 'auto',
        status: 'received',
        address: {
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90001',
        },
      });
    });

    it('should validate required fields', async () => {
      const invalidLead = {
        firstName: 'Test',
      };

      const response = await request(app)
        .post('/api/v1/leads')
        .set(AUTH_HEADER)
        .send(invalidLead)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/leads/:id', () => {
    it('should get lead by id', async () => {
      const createResponse = await request(app)
        .post('/api/v1/leads')
        .set(AUTH_HEADER)
        .send({
          firstName: 'Get',
          lastName: 'Test',
          email: 'get-test-integration@example.com',
          phone: '+1-555-0101',
          insuranceType: 'HOME',
          source: 'API',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
        });

      const leadId = createResponse.body.id;

      const response = await request(app)
        .get(`/api/v1/leads/${leadId}`)
        .set(AUTH_HEADER)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        id: leadId,
        firstName: 'Get',
        lastName: 'Test',
      });
    });

    it('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .get('/api/v1/leads/non-existent-id')
        .set(AUTH_HEADER)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/leads', () => {
    it('should list leads with pagination', async () => {
      await request(app)
        .post('/api/v1/leads')
        .set(AUTH_HEADER)
        .send({
          firstName: 'List',
          lastName: 'Test',
          email: 'list-test-integration@example.com',
          source: 'WEB_FORM',
          insuranceType: 'AUTO',
        });

      const response = await request(app)
        .get('/api/v1/leads?skip=0&take=10')
        .set(AUTH_HEADER)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        data: expect.any(Array),
        pagination: {
          skip: 0,
          take: 10,
          total: expect.any(Number),
        },
      });
    });

    it('should filter leads by status', async () => {
      await request(app)
        .post('/api/v1/leads')
        .set(AUTH_HEADER)
        .send({
          firstName: 'Filter',
          lastName: 'Status',
          email: 'filter-status-integration@example.com',
          source: 'WEB_FORM',
          insuranceType: 'AUTO',
        });

      const response = await request(app)
        .get('/api/v1/leads?status=RECEIVED')
        .set(AUTH_HEADER)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.data).toEqual(expect.any(Array));
    });
  });

  describe('PUT /api/v1/leads/:id', () => {
    it('should update lead', async () => {
      const createResponse = await request(app)
        .post('/api/v1/leads')
        .set(AUTH_HEADER)
        .send({
          firstName: 'Update',
          lastName: 'Test',
          email: 'update-test-integration@example.com',
          phone: '+1-555-0102',
          insuranceType: 'LIFE',
          source: 'WEB_FORM',
          city: 'Chicago',
          state: 'IL',
          zipCode: '60601',
        });

      const leadId = createResponse.body.id;

      const updateData = {
        firstName: 'Updated',
        city: 'Boston',
        state: 'MA',
      };

      const response = await request(app)
        .put(`/api/v1/leads/${leadId}`)
        .set(AUTH_HEADER)
        .send(updateData)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        id: leadId,
        firstName: 'Updated',
        address: {
          city: 'Boston',
          state: 'MA',
        },
      });
    });
  });

  describe('DELETE /api/v1/leads/:id', () => {
    it('should delete lead', async () => {
      const createResponse = await request(app)
        .post('/api/v1/leads')
        .set(AUTH_HEADER)
        .send({
          firstName: 'Delete',
          lastName: 'Test',
          email: 'delete-test-integration@example.com',
          phone: '+1-555-0103',
          insuranceType: 'HEALTH',
          source: 'API',
          city: 'Miami',
          state: 'FL',
          zipCode: '33101',
        });

      const leadId = createResponse.body.id;

      await request(app).delete(`/api/v1/leads/${leadId}`).set(AUTH_HEADER).expect(204);

      await request(app).get(`/api/v1/leads/${leadId}`).set(AUTH_HEADER).expect(404);
    });
  });
});
