import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { app } from '../../app.js';
import { resetStore } from '../../storage/in-memory.js';

const AUTH_HEADER = { Authorization: 'Bearer dev-token' };

describe('Activity API Integration Tests', () => {
  let testLeadId: string;

  beforeEach(async () => {
    resetStore();

    const lead = await request(app)
      .post('/api/v1/leads')
      .set(AUTH_HEADER)
      .send({
        firstName: 'Activity',
        lastName: 'Test',
        email: 'activity-test@example.com',
        phone: '+1-555-0300',
        insuranceType: 'HOME',
        source: 'API',
        city: 'Denver',
        state: 'CO',
        zipCode: '80201',
      })
      .expect(201);

    testLeadId = lead.body.id;

    // Generate at least one more activity
    await request(app)
      .post(`/api/v1/leads/${testLeadId}/notes`)
      .set(AUTH_HEADER)
      .send({ content: 'Created a note to generate activity' })
      .expect(201);
  });

  describe('GET /api/v1/leads/:leadId/activity', () => {
    it('should get activity history for a lead', async () => {
      const response = await request(app)
        .get(`/api/v1/leads/${testLeadId}/activity`)
        .set(AUTH_HEADER)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        data: expect.any(Array),
        page: 1,
        limit: 20,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      });

      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/v1/leads/${testLeadId}/activity?page=1&limit=1`)
        .set(AUTH_HEADER)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        data: expect.any(Array),
        page: 1,
        limit: 1,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      });

      expect(response.body.data.length).toBe(1);
    });

    it('should filter by activity type', async () => {
      const response = await request(app)
        .get(`/api/v1/leads/${testLeadId}/activity?activityType=LEAD_CREATED`)
        .set(AUTH_HEADER)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.data).toEqual(expect.any(Array));

      for (const item of response.body.data) {
        expect(item.activityType).toBe('lead_created');
      }
    });
  });
});
