import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { app } from '../app.js';
import { prisma } from '@insurance-lead-gen/data-service';

describe('Leads API Integration Tests', () => {
  let testLeadId: string;

  beforeAll(async () => {
    // Setup database connection
    await prisma.$connect();
  });

  afterAll(async () => {
    // Cleanup
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Cleanup test data before each test
    await prisma.lead.deleteMany({
      where: { email: { contains: 'test-integration' } }
    });
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
        .send(newLead)
        .expect(201)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          firstName: 'Test',
          lastName: 'Integration',
          email: 'test-integration@example.com',
          insuranceType: 'AUTO',
        },
      });

      testLeadId = response.body.data.id;
    });

    it('should validate required fields', async () => {
      const invalidLead = {
        firstName: 'Test',
      };

      const response = await request(app)
        .post('/api/v1/leads')
        .send(invalidLead)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/leads/:id', () => {
    it('should get lead by id', async () => {
      // First create a lead
      const createResponse = await request(app)
        .post('/api/v1/leads')
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

      const leadId = createResponse.body.data.id;

      // Then get it
      const response = await request(app)
        .get(`/api/v1/leads/${leadId}`)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: leadId,
          firstName: 'Get',
          lastName: 'Test',
        },
      });
    });

    it('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .get('/api/v1/leads/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/leads', () => {
    it('should list leads with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/leads?skip=0&take=10')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        pagination: {
          skip: 0,
          take: 10,
          total: expect.any(Number),
        },
      });
    });

    it('should filter leads by status', async () => {
      const response = await request(app)
        .get('/api/v1/leads?status=NEW')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
      });
    });
  });

  describe('PUT /api/v1/leads/:id', () => {
    it('should update lead', async () => {
      // Create a lead first
      const createResponse = await request(app)
        .post('/api/v1/leads')
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

      const leadId = createResponse.body.data.id;

      // Update it
      const updateData = {
        firstName: 'Updated',
        city: 'Boston',
        state: 'MA',
      };

      const response = await request(app)
        .put(`/api/v1/leads/${leadId}`)
        .send(updateData)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: leadId,
          firstName: 'Updated',
          city: 'Boston',
          state: 'MA',
        },
      });
    });
  });

  describe('DELETE /api/v1/leads/:id', () => {
    it('should delete lead', async () => {
      // Create a lead first
      const createResponse = await request(app)
        .post('/api/v1/leads')
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

      const leadId = createResponse.body.data.id;

      // Delete it
      const response = await request(app)
        .delete(`/api/v1/leads/${leadId}`)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.any(String),
      });

      // Verify it's deleted
      await request(app)
        .get(`/api/v1/leads/${leadId}`)
        .expect(404);
    });
  });
});
