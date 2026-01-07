/**
 * Unit tests for Claims API routes (Phase 26.4)
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import claimsRouter from './claims.js';

describe('Claims API Routes', () => {
  let app: express.Express;
  const AUTH_HEADER = { 'Authorization': 'Bearer dev-token', 'x-user-id': 'test-user-123' };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req: any, res, next) => {
      // Mock auth middleware
      req.user = { id: 'test-user-123', email: 'test@example.com' };
      next();
    });
    app.use('/api/v1/claims', claimsRouter);
  });

  describe('GET /api/v1/claims', () => {
    it('should return claims list', async () => {
      const response = await request(app)
        .get('/api/v1/claims')
        .set(AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('claims');
      expect(Array.isArray(response.body.claims)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/claims?page=1&limit=10')
        .set(AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should filter by leadId', async () => {
      const response = await request(app)
        .get('/api/v1/claims?leadId=test-lead-123')
        .set(AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.claims)).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/claims?status=submitted')
        .set(AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.claims)).toBe(true);
    });

    it('should support search', async () => {
      const response = await request(app)
        .get('/api/v1/claims?search=accident')
        .set(AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.claims)).toBe(true);
    });
  });

  describe('POST /api/v1/claims', () => {
    const validClaimData = {
      leadId: 'test-lead-123',
      policyNumber: 'POL-2024-001234',
      insuranceType: 'auto',
      claimType: 'auto_accident',
      incidentDate: '2024-01-15T14:30:00Z',
      incidentDescription: 'Test accident description',
      claimedAmount: 5000.0,
      deductible: 500.0,
      priority: 'high',
      severity: 'moderate',
    };

    it('should create a new claim', async () => {
      const response = await request(app)
        .post('/api/v1/claims')
        .set(AUTH_HEADER)
        .send(validClaimData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('claimNumber');
      expect(response.body.leadId).toBe(validClaimData.leadId);
      expect(response.body.status).toBe('draft');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        leadId: 'test-lead-123',
        // missing required fields
      };

      const response = await request(app)
        .post('/api/v1/claims')
        .set(AUTH_HEADER)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should generate unique claim number', async () => {
      const response1 = await request(app)
        .post('/api/v1/claims')
        .set(AUTH_HEADER)
        .send(validClaimData);

      const response2 = await request(app)
        .post('/api/v1/claims')
        .set(AUTH_HEADER)
        .send(validClaimData);

      expect(response1.body.claimNumber).not.toBe(response2.body.claimNumber);
    });
  });

  describe('GET /api/v1/claims/:claimId', () => {
    it('should return 404 for non-existent claim', async () => {
      const response = await request(app)
        .get('/api/v1/claims/non-existent-id')
        .set(AUTH_HEADER);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/claims/:claimId', () => {
    it('should update claim status', async () => {
      // Create claim first
      const createResponse = await request(app)
        .post('/api/v1/claims')
        .set(AUTH_HEADER)
        .send({
          leadId: 'test-lead-123',
          insuranceType: 'auto',
          claimType: 'auto_accident',
          incidentDate: new Date().toISOString(),
          incidentDescription: 'Test',
          claimedAmount: 1000.0,
        });

      const claimId = createResponse.body.id;

      // Update status
      const updateResponse = await request(app)
        .patch(`/api/v1/claims/${claimId}`)
        .set(AUTH_HEADER)
        .send({ status: 'submitted' });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.status).toBe('submitted');
    });
  });

  describe('GET /api/v1/claims/statistics', () => {
    it('should return claim statistics', async () => {
      const response = await request(app)
        .get('/api/v1/claims/statistics')
        .set(AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalClaims');
      expect(response.body).toHaveProperty('claimsByStatus');
      expect(response.body).toHaveProperty('claimsByType');
      expect(response.body).toHaveProperty('totalClaimedAmount');
    });
  });

  describe('POST /api/v1/claims/:claimId/documents', () => {
    it('should add document to claim', async () => {
      // Create claim first
      const createResponse = await request(app)
        .post('/api/v1/claims')
        .set(AUTH_HEADER)
        .send({
          leadId: 'test-lead-123',
          insuranceType: 'auto',
          claimType: 'auto_accident',
          incidentDate: new Date().toISOString(),
          incidentDescription: 'Test',
          claimedAmount: 1000.0,
        });

      const claimId = createResponse.body.id;

      const documentData = {
        documentType: 'police_report',
        fileName: 'report.pdf',
        fileUrl: '/uploads/report.pdf',
        fileSize: 12345,
        mimeType: 'application/pdf',
      };

      const response = await request(app)
        .post(`/api/v1/claims/${claimId}/documents`)
        .set(AUTH_HEADER)
        .send(documentData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.documentType).toBe('police_report');
    });
  });

  describe('POST /api/v1/claims/:claimId/notes', () => {
    it('should add note to claim', async () => {
      // Create claim first
      const createResponse = await request(app)
        .post('/api/v1/claims')
        .set(AUTH_HEADER)
        .send({
          leadId: 'test-lead-123',
          insuranceType: 'auto',
          claimType: 'auto_accident',
          incidentDate: new Date().toISOString(),
          incidentDescription: 'Test',
          claimedAmount: 1000.0,
        });

      const claimId = createResponse.body.id;

      const noteData = {
        content: 'Test note content',
        isInternal: false,
      };

      const response = await request(app)
        .post(`/api/v1/claims/${claimId}/notes`)
        .set(AUTH_HEADER)
        .send(noteData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.content).toBe('Test note content');
    });
  });
});
