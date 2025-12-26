import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { app } from '../app.js';
import { logger } from '@insurance-lead-gen/core';

describe('API Health Integration Tests', () => {
  it('should return health status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body).toMatchObject({
      status: 'ok',
      timestamp: expect.any(String),
      service: 'insurance-lead-gen-api',
      version: expect.any(String),
    });
  });

  it('should return 404 for non-existent routes', async () => {
    const response = await request(app)
      .get('/api/v1/non-existent')
      .expect(404);

    expect(response.body).toEqual({ error: 'Not found' });
  });
});
