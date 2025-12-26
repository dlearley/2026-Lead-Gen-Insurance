import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { app } from '../app.js';
import { prisma } from '@insurance-lead-gen/data-service';

describe('Activity API Integration Tests', () => {
  let testLeadId: string;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Create a test lead
    const lead = await prisma.lead.create({
      data: {
        firstName: 'Activity',
        lastName: 'Test',
        email: 'activity-test@example.com',
        phone: '+1-555-0300',
        insuranceType: 'HOME',
        source: 'API',
        city: 'Denver',
        state: 'CO',
        zipCode: '80201',
      },
    });

    testLeadId = lead.id;
  });

  describe('GET /api/v1/leads/:leadId/activity', () => {
    it('should get activity history for a lead', async () => {
      const response = await request(app)
        .get(`/api/v1/leads/${testLeadId}/activity`)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
      });
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/v1/leads/${testLeadId}/activity?skip=0&take=10`)
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

    it('should filter by activity type', async () => {
      const response = await request(app)
        .get(`/api/v1/leads/${testLeadId}/activity?type=STATUS_CHANGE`)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
      });
    });
  });

  describe('POST /api/v1/leads/:leadId/activity', () => {
    it('should create an activity record', async () => {
      const newActivity = {
        type: 'NOTE_ADDED',
        description: 'Customer called',
        userId: 'user_123',
      };

      const response = await request(app)
        .post(`/api/v1/leads/${testLeadId}/activity`)
        .send(newActivity)
        .expect(201)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          leadId: testLeadId,
          type: 'NOTE_ADDED',
          description: 'Customer called',
        },
      });
    });

    it('should validate required fields', async () => {
      const invalidActivity = {
        type: 'NOTE_ADDED',
      };

      const response = await request(app)
        .post(`/api/v1/leads/${testLeadId}/activity`)
        .send(invalidActivity)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});
