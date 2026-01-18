import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../../apps/api/src/app.js';
import { PrismaClient } from '@prisma/client';
import { createTestUser, createTestClaim, createTestPolicy, cleanupTestData } from '../../utils/setup.js';

let prisma: PrismaClient;
let authToken: string;
let testUser: any;

describe('Claims API Integration Tests', () => {
  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
    
    // Create test user and get auth token
    testUser = await createTestUser({
      email: 'test-adjuster@example.com',
      role: 'adjuster',
    });
    
    authToken = 'mock-jwt-token';
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  describe('POST /api/v1/claims', () => {
    it('should create a new claim successfully', async () => {
      const policy = await createTestPolicy({
        status: 'active',
      });

      const claimData = {
        policyId: policy.id,
        leadId: policy.leadId,
        insuranceType: 'auto',
        claimType: 'auto_accident',
        incidentDate: '2024-01-15T14:30:00Z',
        incidentDescription: 'Rear-end collision at Main St intersection',
        claimedAmount: 7500,
        incidentLocation: 'Main St & 5th Ave, New York, NY',
        priority: 'high',
      };

      const response = await request(app)
        .post('/api/v1/claims')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .send(claimData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveValidClaimNumber();
      expect(response.body.data.status).toBe('submitted');
      expect(response.body.data.priority).toBe('high');
      expect(response.body.data.claimedAmount).toBe(7500);
    });

    it('should return validation error for invalid claim data', async () => {
      const invalidClaimData = {
        policyId: 'non-existent-policy',
        insuranceType: 'auto',
        claimType: 'invalid_type',
        incidentDate: 'invalid-date',
        claimedAmount: -100, // Negative amount
      };

      const response = await request(app)
        .post('/api/v1/claims')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .send(invalidClaimData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should require authentication', async () => {
      const claimData = {
        policyId: 'policy-123',
        insuranceType: 'auto',
        claimType: 'auto_accident',
        incidentDate: new Date().toISOString(),
        claimedAmount: 5000,
      };

      const response = await request(app)
        .post('/api/v1/claims')
        .send(claimData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/claims', () => {
    beforeEach(async () => {
      // Create test claims for filtering tests
      const policy1 = await createTestPolicy({ insuranceType: 'auto' });
      const policy2 = await createTestPolicy({ insuranceType: 'home' });
      const policy3 = await createTestPolicy({ insuranceType: 'auto' });

      const claims = [
        {
          policyId: policy1.id,
          leadId: policy1.leadId,
          insuranceType: 'auto',
          claimType: 'auto_accident',
          status: 'submitted',
          priority: 'high',
          claimedAmount: 5000,
          incidentDate: new Date('2024-01-15'),
        },
        {
          policyId: policy2.id,
          leadId: policy2.leadId,
          insuranceType: 'home',
          claimType: 'home_damage',
          status: 'review',
          priority: 'medium',
          claimedAmount: 15000,
          incidentDate: new Date('2024-01-20'),
        },
        {
          policyId: policy3.id,
          leadId: policy3.leadId,
          insuranceType: 'auto',
          claimType: 'auto_theft',
          status: 'approved',
          priority: 'low',
          claimedAmount: 25000,
          incidentDate: new Date('2024-01-25'),
        },
      ];

      await prisma.claim.createMany({ data: claims });
    });

    it('should return paginated claims', async () => {
      const response = await request(app)
        .get('/api/v1/claims?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.claims).toHaveLength(2);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 3,
        pages: 2,
      });
    });

    it('should filter claims by status', async () => {
      const response = await request(app)
        .get('/api/v1/claims?status=submitted')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.claims).toHaveLength(1);
      expect(response.body.data.claims[0].status).toBe('submitted');
    });

    it('should filter claims by insurance type', async () => {
      const response = await request(app)
        .get('/api/v1/claims?insuranceType=auto')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.claims).toHaveLength(2); // Both auto claims
    });

    it('should filter claims by priority', async () => {
      const response = await request(app)
        .get('/api/v1/claims?priority=high')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.claims).toHaveLength(1);
      expect(response.body.data.claims[0].priority).toBe('high');
    });

    it('should filter claims by date range', async () => {
      const response = await request(app)
        .get('/api/v1/claims?dateFrom=2024-01-15&dateTo=2024-01-20')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.claims).toHaveLength(2); // Claims within date range
    });

    it('should filter claims by amount range', async () => {
      const response = await request(app)
        .get('/api/v1/claims?minAmount=1000&maxAmount=10000')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.claims).toHaveLength(1); // Only the 5000 claim
    });
  });

  describe('GET /api/v1/claims/:id', () => {
    let testClaim: any;

    beforeEach(async () => {
      testClaim = await createTestClaim({
        status: 'submitted',
        priority: 'medium',
      });
    });

    it('should return claim by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/claims/${testClaim.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testClaim.id);
      expect(response.body.data.claimNumber).toHaveValidClaimNumber();
    });

    it('should return 404 for non-existent claim', async () => {
      const response = await request(app)
        .get('/api/v1/claims/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/claims/number/:number', () => {
    let testClaim: any;

    beforeEach(async () => {
      testClaim = await createTestClaim({
        claimNumber: 'CLM-2024-TEST123',
      });
    });

    it('should return claim by claim number', async () => {
      const response = await request(app)
        .get(`/api/v1/claims/number/${testClaim.claimNumber}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.claimNumber).toBe(testClaim.claimNumber);
    });
  });

  describe('PATCH /api/v1/claims/:id', () => {
    let testClaim: any;

    beforeEach(async () => {
      testClaim = await createTestClaim({
        status: 'submitted',
        priority: 'medium',
      });
    });

    it('should update claim successfully', async () => {
      const updateData = {
        status: 'review',
        priority: 'high',
        notes: 'Claim under investigation',
      };

      const response = await request(app)
        .patch(`/api/v1/claims/${testClaim.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('review');
      expect(response.body.data.priority).toBe('high');
    });

    it('should update claim status with activity log', async () => {
      const updateData = {
        status: 'approved',
        approvedAmount: 4000,
      };

      const response = await request(app)
        .patch(`/api/v1/claims/${testClaim.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('approved');
      expect(response.body.data.approvedAmount).toBe(4000);
    });
  });

  describe('Document Management', () => {
    let testClaim: any;

    beforeEach(async () => {
      testClaim = await createTestClaim();
    });

    it('should add document to claim', async () => {
      const documentData = {
        documentType: 'police_report',
        fileName: 'police-report-001.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        description: 'Police report for accident',
      };

      const response = await request(app)
        .post(`/api/v1/claims/${testClaim.id}/documents`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .send(documentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.documentType).toBe('police_report');
      expect(response.body.data.isVerified).toBe(false);
    });

    it('should list claim documents', async () => {
      // Add a document first
      const documentData = {
        documentType: 'medical_report',
        fileName: 'medical-report.pdf',
        fileSize: 500000,
        mimeType: 'application/pdf',
      };

      await request(app)
        .post(`/api/v1/claims/${testClaim.id}/documents`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .send(documentData);

      const response = await request(app)
        .get(`/api/v1/claims/${testClaim.id}/documents`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].documentType).toBe('medical_report');
    });
  });

  describe('Notes Management', () => {
    let testClaim: any;

    beforeEach(async () => {
      testClaim = await createTestClaim();
    });

    it('should add note to claim', async () => {
      const noteData = {
        content: 'Customer called to check claim status',
        isInternal: false,
      };

      const response = await request(app)
        .post(`/api/v1/claims/${testClaim.id}/notes`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .send(noteData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(noteData.content);
      expect(response.body.data.isInternal).toBe(false);
    });

    it('should list claim notes', async () => {
      const noteData = {
        content: 'Internal note for adjuster',
        isInternal: true,
      };

      await request(app)
        .post(`/api/v1/claims/${testClaim.id}/notes`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .send(noteData);

      const response = await request(app)
        .get(`/api/v1/claims/${testClaim.id}/notes`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].content).toBe(noteData.content);
    });
  });

  describe('GET /api/v1/claims/statistics', () => {
    beforeEach(async () => {
      // Create claims with different statuses and types
      const policy1 = await createTestPolicy({ insuranceType: 'auto' });
      const policy2 = await createTestPolicy({ insuranceType: 'home' });
      const policy3 = await createTestPolicy({ insuranceType: 'auto' });

      const claims = [
        {
          policyId: policy1.id,
          leadId: policy1.leadId,
          insuranceType: 'auto',
          claimType: 'auto_accident',
          status: 'submitted',
          claimedAmount: 5000,
        },
        {
          policyId: policy2.id,
          leadId: policy2.leadId,
          insuranceType: 'home',
          claimType: 'home_damage',
          status: 'approved',
          claimedAmount: 15000,
          approvedAmount: 14000,
        },
        {
          policyId: policy3.id,
          leadId: policy3.leadId,
          insuranceType: 'auto',
          claimType: 'auto_theft',
          status: 'paid',
          claimedAmount: 25000,
          approvedAmount: 25000,
          paidAmount: 25000,
        },
      ];

      await prisma.claim.createMany({ data: claims });
    });

    it('should return claim statistics', async () => {
      const response = await request(app)
        .get('/api/v1/claims/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        totalClaims: expect.any(Number),
        submittedClaims: expect.any(Number),
        approvedClaims: expect.any(Number),
        paidClaims: expect.any(Number),
        totalClaimedAmount: expect.any(Number),
        totalApprovedAmount: expect.any(Number),
        totalPaidAmount: expect.any(Number),
        approvalRate: expect.any(Number),
        byInsuranceType: expect.any(Object),
        byClaimType: expect.any(Object),
      });

      expect(response.body.data.totalClaims).toBe(3);
      expect(response.body.data.approvalRate).toBeGreaterThan(0);
    });
  });
});