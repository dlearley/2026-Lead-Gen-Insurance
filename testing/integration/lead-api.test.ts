import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../../apps/api/src/app.js';
import { PrismaClient } from '@prisma/client';
import { createTestUser, createTestLead, createTestClaim, cleanupTestData } from '../../utils/setup.js';

let prisma: PrismaClient;
let authToken: string;
let testUser: any;

describe('Lead API Integration Tests', () => {
  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
    
    // Create test user and get auth token
    testUser = await createTestUser({
      email: 'test-agent@example.com',
      role: 'agent',
    });
    
    // Mock authentication - in real tests, you'd have proper JWT
    authToken = 'mock-jwt-token';
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean database before each test
    await cleanupTestData();
  });

  describe('POST /api/v1/leads', () => {
    it('should create a new lead successfully', async () => {
      const leadData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        insuranceType: 'auto',
        source: 'website',
        priority: 'high',
        estimatedValue: 5000,
        notes: 'Interested in comprehensive coverage',
      };

      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .send(leadData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        firstName: leadData.firstName,
        lastName: leadData.lastName,
        email: leadData.email,
        insuranceType: leadData.insuranceType,
        status: 'new',
        priority: 'high',
      });
      expect(response.body.data.id).toBeDefined();
    });

    it('should return validation error for invalid data', async () => {
      const invalidLeadData = {
        firstName: '', // Required field
        lastName: 'Doe',
        email: 'invalid-email', // Invalid email format
        insuranceType: 'invalid-type', // Invalid insurance type
      };

      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .send(invalidLeadData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should require authentication', async () => {
      const leadData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        insuranceType: 'auto',
      };

      const response = await request(app)
        .post('/api/v1/leads')
        .send(leadData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Unauthorized');
    });
  });

  describe('GET /api/v1/leads', () => {
    beforeEach(async () => {
      // Create test leads for filtering tests
      const leads = [
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          insuranceType: 'auto',
          status: 'new',
          priority: 'high',
          source: 'website',
          assignedTo: testUser.id,
        },
        {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '+1987654321',
          insuranceType: 'home',
          status: 'contacted',
          priority: 'medium',
          source: 'referral',
          assignedTo: testUser.id,
        },
        {
          firstName: 'Bob',
          lastName: 'Johnson',
          email: 'bob@example.com',
          phone: '+1555555555',
          insuranceType: 'auto',
          status: 'qualified',
          priority: 'low',
          source: 'social_media',
          assignedTo: testUser.id,
        },
      ];

      await prisma.lead.createMany({ data: leads });
    });

    it('should return paginated leads', async () => {
      const response = await request(app)
        .get('/api/v1/leads?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.leads).toHaveLength(2);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 3,
        pages: 2,
      });
    });

    it('should filter leads by status', async () => {
      const response = await request(app)
        .get('/api/v1/leads?status=new')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.leads).toHaveLength(1);
      expect(response.body.data.leads[0].status).toBe('new');
    });

    it('should filter leads by insurance type', async () => {
      const response = await request(app)
        .get('/api/v1/leads?insuranceType=auto')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.leads).toHaveLength(2); // John and Bob
    });

    it('should filter leads by priority', async () => {
      const response = await request(app)
        .get('/api/v1/leads?priority=high')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.leads).toHaveLength(1);
      expect(response.body.data.leads[0].priority).toBe('high');
    });

    it('should search leads by text', async () => {
      const response = await request(app)
        .get('/api/v1/leads?search=john')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.leads).toHaveLength(1);
      expect(response.body.data.leads[0].firstName.toLowerCase()).toContain('john');
    });

    it('should sort leads by created date', async () => {
      const response = await request(app)
        .get('/api/v1/leads?sortBy=createdAt&sortOrder=desc')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.leads).toHaveLength(3);
      
      // Verify descending order
      const dates = response.body.data.leads.map((lead: any) => new Date(lead.createdAt).getTime());
      expect(dates).toEqual(dates.sort((a, b) => b - a));
    });
  });

  describe('GET /api/v1/leads/:id', () => {
    let testLead: any;

    beforeEach(async () => {
      testLead = await createTestLead({
        firstName: 'Test',
        lastName: 'Lead',
        email: 'test@example.com',
        insuranceType: 'auto',
      });
    });

    it('should return lead by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/leads/${testLead.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testLead.id);
      expect(response.body.data.firstName).toBe(testLead.firstName);
      expect(response.body.data.lastName).toBe(testLead.lastName);
    });

    it('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .get('/api/v1/leads/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('PATCH /api/v1/leads/:id', () => {
    let testLead: any;

    beforeEach(async () => {
      testLead = await createTestLead({
        firstName: 'Original',
        lastName: 'Name',
        status: 'new',
        priority: 'medium',
      });
    });

    it('should update lead successfully', async () => {
      const updateData = {
        status: 'contacted',
        priority: 'high',
        notes: 'Customer contacted successfully',
      };

      const response = await request(app)
        .patch(`/api/v1/leads/${testLead.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('contacted');
      expect(response.body.data.priority).toBe('high');
      expect(response.body.data.notes).toBe('Customer contacted successfully');
    });

    it('should return validation error for invalid status', async () => {
      const updateData = {
        status: 'invalid-status',
      };

      const response = await request(app)
        .patch(`/api/v1/leads/${testLead.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('DELETE /api/v1/leads/:id', () => {
    let testLead: any;

    beforeEach(async () => {
      testLead = await createTestLead({
        firstName: 'ToDelete',
        lastName: 'Lead',
        status: 'new',
      });
    });

    it('should soft delete lead', async () => {
      const response = await request(app)
        .delete(`/api/v1/leads/${testLead.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify lead is soft deleted
      const deletedLead = await prisma.lead.findUnique({
        where: { id: testLead.id },
      });
      
      expect(deletedLead?.status).toBe('cancelled');
      expect(deletedLead?.isActive).toBe(false);
    });
  });

  describe('GET /api/v1/leads/statistics', () => {
    beforeEach(async () => {
      // Create test leads with different statuses and types
      const leads = [
        { insuranceType: 'auto', status: 'new', priority: 'high', estimatedValue: 5000, assignedTo: testUser.id },
        { insuranceType: 'auto', status: 'contacted', priority: 'medium', estimatedValue: 3000, assignedTo: testUser.id },
        { insuranceType: 'home', status: 'qualified', priority: 'high', estimatedValue: 8000, assignedTo: testUser.id },
        { insuranceType: 'home', status: 'converted', priority: 'high', estimatedValue: 12000, assignedTo: testUser.id },
        { insuranceType: 'life', status: 'cancelled', priority: 'low', estimatedValue: 2000, assignedTo: testUser.id },
      ];

      await prisma.lead.createMany({ data: leads });
    });

    it('should return lead statistics', async () => {
      const response = await request(app)
        .get('/api/v1/leads/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        totalLeads: expect.any(Number),
        newLeads: expect.any(Number),
        contactedLeads: expect.any(Number),
        qualifiedLeads: expect.any(Number),
        convertedLeads: expect.any(Number),
        conversionRate: expect.any(Number),
        averageValue: expect.any(Number),
        byStatus: expect.any(Object),
        byInsuranceType: expect.any(Object),
        byPriority: expect.any(Object),
      });

      expect(response.body.data.totalLeads).toBe(5);
      expect(response.body.data.convertedLeads).toBe(1);
      expect(response.body.data.byInsuranceType.auto).toBe(2);
    });
  });
});