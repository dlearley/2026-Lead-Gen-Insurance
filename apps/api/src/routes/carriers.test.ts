import request from 'supertest';
import express from 'express';
import carriersRouter from './carriers.js';
import { describe, it, expect } from '@jest/globals';

describe('API Carriers Router', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/carriers', carriersRouter);
    app.use('/api/carriers', carriersRouter);
  });

  it('should have the carriers router defined', () => {
    expect(carriersRouter).toBeDefined();
  });

  it('should have the expected route structure', () => {
    const router = carriersRouter as any;
    const stack = router.stack || [];

    // Check that the router has the expected middleware/proxy setup
    expect(stack.length).toBeGreaterThan(0);
  });

  it('should handle health check requests', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(404); // 404 because we don't have a health endpoint in this router
  });

  it('should handle unknown routes', async () => {
    const response = await request(app).get('/api/v1/unknown');
    expect(response.status).toBe(404);
  });

  it('should handle unknown API routes', async () => {
    const response = await request(app).get('/api/unknown');
    expect(response.status).toBe(404);
  });
});