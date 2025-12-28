import request from 'supertest';
import app from '../index.js';
import { prisma } from '@insurance-lead-gen/data-service';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('API Integration Tests', () => {
  let server: any;

  beforeAll(async () => {
    await prisma.$connect();
    server = app.listen(3001);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  });

  describe('Health Check', () => {
    it('should return 200 OK for health endpoint', async () => {
      const response = await request(server).get('/health').expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Lead Endpoints', () => {
    it('should validate lead data', async () => {
      const response = await request(server)
        .post('/api/v1/leads')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should accept valid lead data', async () => {
      const response = await request(server)
        .post('/api/v1/leads')
        .send({
          source: 'web-form',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          phone: '555-123-4567',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('source', 'web-form');
      expect(response.body.data).toHaveProperty('email', 'test@example.com');
    });
  });
});
