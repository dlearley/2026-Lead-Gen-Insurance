import request from 'supertest';
import app from '../index.js';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('API Integration Tests', () => {
  let server: any;

  beforeAll(() => {
    server = app.listen(3001); // Use different port for testing
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('Health Check', () => {
    it('should return 200 OK for health endpoint', async () => {
      const response = await request(server)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Lead Endpoints', () => {
    it('should require API key for lead creation', async () => {
      const response = await request(server)
        .post('/api/v1/leads')
        .send({
          source: 'test',
          email: 'test@example.com',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should validate lead data', async () => {
      const response = await request(server)
        .post('/api/v1/leads')
        .set('X-API-Key', 'dev-key-12345')
        .send({
          // Missing required source field
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toBeInstanceOf(Array);
    });

    it('should accept valid lead data', async () => {
      const response = await request(server)
        .post('/api/v1/leads')
        .set('X-API-Key', 'dev-key-12345')
        .send({
          source: 'web-form',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          phone: '555-123-4567',
          address: {
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'US',
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status', 'received');
      expect(response.body).toHaveProperty('message', 'Lead ingested successfully');
    });
  });
});