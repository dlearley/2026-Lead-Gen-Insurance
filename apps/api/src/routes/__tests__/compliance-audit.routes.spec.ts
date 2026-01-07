/**
 * Phase 25.1E: Compliance Audit Routes Integration Tests
 */

import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../infra/prisma';

describe('Compliance Audit API Routes', () => {
  describe('GET /api/v1/audit/logs', () => {
    it('should return audit logs', async () => {
      const response = await request(app).get('/api/v1/audit/logs').query({ limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by actorId', async () => {
      const response = await request(app)
        .get('/api/v1/audit/logs')
        .query({ actorId: 'user-123', limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter by date range', async () => {
      const end = new Date().toISOString();
      const start = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const response = await request(app)
        .get('/api/v1/audit/logs')
        .query({ startDate: start, endDate: end, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/audit/timeline/:resourceId', () => {
    it('should return timeline for a resource', async () => {
      const response = await request(app).get('/api/v1/audit/timeline/test-resource-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('resourceId');
      expect(response.body.data).toHaveProperty('events');
      expect(Array.isArray(response.body.data.events)).toBe(true);
    });
  });

  describe('GET /api/v1/compliance/events', () => {
    it('should return compliance events', async () => {
      const response = await request(app).get('/api/v1/compliance/events').query({ limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by jurisdiction', async () => {
      const response = await request(app)
        .get('/api/v1/compliance/events')
        .query({ jurisdiction: 'GDPR', limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/compliance/violations', () => {
    it('should return violations', async () => {
      const response = await request(app).get('/api/v1/compliance/violations').query({ limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by severity', async () => {
      const response = await request(app)
        .get('/api/v1/compliance/violations')
        .query({ severityLevel: 'Critical', limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/audit/verify-integrity', () => {
    it('should verify audit log integrity', async () => {
      const response = await request(app).post('/api/v1/audit/verify-integrity').send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isValid');
      expect(response.body.data).toHaveProperty('totalRecordsChecked');
      expect(response.body.data).toHaveProperty('discrepanciesFound');
    });
  });

  describe('GET /api/v1/audit/integrity-report', () => {
    it('should return integrity report', async () => {
      const response = await request(app).get('/api/v1/audit/integrity-report');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
    });
  });

  describe('GET /api/v1/audit/data-access', () => {
    it('should return data access logs', async () => {
      const response = await request(app).get('/api/v1/audit/data-access').query({ limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/audit/suspicious-access', () => {
    it('should return suspicious access alerts', async () => {
      const response = await request(app).get('/api/v1/audit/suspicious-access');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/audit/certification-status', () => {
    it('should return certification status', async () => {
      const response = await request(app).get('/api/v1/audit/certification-status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('active');
      expect(response.body.data).toHaveProperty('expiring');
      expect(response.body.data).toHaveProperty('expired');
    });
  });
});
