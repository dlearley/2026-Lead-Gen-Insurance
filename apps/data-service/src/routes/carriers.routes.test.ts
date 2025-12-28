import request from 'supertest';
import express from 'express';
import { createCarrierRoutes } from './carriers.routes.js';
import { CarrierService } from '../services/carrier-service.js';
import { describe, it, expect, jest } from '@jest/globals';

describe('Carrier Routes', () => {
  let app: express.Express;
  let mockCarrierService: Partial<CarrierService>;

  beforeAll(() => {
    // Create mock carrier service
    mockCarrierService = {
      createCarrier: jest.fn().mockImplementation((input) => Promise.resolve({
        id: 'test-carrier-id',
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      getCarrierById: jest.fn().mockImplementation((id) => 
        Promise.resolve({
          id,
          name: 'Test Carrier',
          contactEmail: 'test@test.com',
          contactPhone: '+1-555-123-4567',
          contractStartDate: new Date(),
          partnershipTier: 'BASIC',
          partnershipStatus: 'ACTIVE',
          commissionRate: 10.0,
          isActive: true,
          integrationEnabled: false,
          performanceScore: 0,
          conversionRate: 0,
          averageResponseTime: 0,
          totalLeadsReceived: 0,
          totalLeadsConverted: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      getAllCarriers: jest.fn().mockImplementation(() => 
        Promise.resolve([
          {
            id: 'carrier-1',
            name: 'Carrier 1',
            contactEmail: 'carrier1@test.com',
            contactPhone: '+1-555-111-1111',
            contractStartDate: new Date(),
            partnershipTier: 'BASIC',
            partnershipStatus: 'ACTIVE',
            commissionRate: 10.0,
            isActive: true,
            integrationEnabled: false,
            performanceScore: 75,
            conversionRate: 0.25,
            averageResponseTime: 2.5,
            totalLeadsReceived: 100,
            totalLeadsConverted: 25,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ])
      ),
      updateCarrier: jest.fn().mockImplementation((id, input) => 
        Promise.resolve({
          id,
          name: input.name || 'Updated Carrier',
          contactEmail: 'test@test.com',
          contactPhone: '+1-555-123-4567',
          contractStartDate: new Date(),
          partnershipTier: 'STANDARD',
          partnershipStatus: 'ACTIVE',
          commissionRate: 15.0,
          isActive: true,
          integrationEnabled: false,
          performanceScore: 0,
          conversionRate: 0,
          averageResponseTime: 0,
          totalLeadsReceived: 0,
          totalLeadsConverted: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      deleteCarrier: jest.fn().mockImplementation((id) => 
        Promise.resolve({
          id,
          name: 'Deleted Carrier',
          contactEmail: 'test@test.com',
          contactPhone: '+1-555-123-4567',
          contractStartDate: new Date(),
          partnershipTier: 'BASIC',
          partnershipStatus: 'TERMINATED',
          commissionRate: 10.0,
          isActive: false,
          integrationEnabled: false,
          performanceScore: 0,
          conversionRate: 0,
          averageResponseTime: 0,
          totalLeadsReceived: 0,
          totalLeadsConverted: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      getCarrierWithPerformance: jest.fn().mockImplementation((id) => 
        Promise.resolve({
          id,
          name: 'Test Carrier',
          contactEmail: 'test@test.com',
          contactPhone: '+1-555-123-4567',
          contractStartDate: new Date(),
          partnershipTier: 'BASIC',
          partnershipStatus: 'ACTIVE',
          commissionRate: 10.0,
          isActive: true,
          integrationEnabled: false,
          performanceScore: 85,
          conversionRate: 0.35,
          averageResponseTime: 1.8,
          totalLeadsReceived: 200,
          totalLeadsConverted: 70,
          createdAt: new Date(),
          updatedAt: new Date(),
          performanceMetrics: [
            {
              id: 'metric-1',
              carrierId: id,
              month: 1,
              year: 2025,
              leadsReceived: 200,
              leadsConverted: 70,
              conversionRate: 35.0,
              averageResponseTime: 1.8,
              averageQuoteValue: 1200.0,
              customerSatisfaction: 90.0,
              onTimeDeliveryRate: 95.0,
              createdAt: new Date(),
            },
          ],
        })
      ),
      getTopPerformingCarriers: jest.fn().mockImplementation((limit = 5) => 
        Promise.resolve([
          {
            id: 'top-1',
            name: 'Top Carrier 1',
            contactEmail: 'top1@test.com',
            contactPhone: '+1-555-111-1111',
            contractStartDate: new Date(),
            partnershipTier: 'ELITE',
            partnershipStatus: 'ACTIVE',
            commissionRate: 20.0,
            isActive: true,
            integrationEnabled: true,
            performanceScore: 95,
            conversionRate: 0.45,
            averageResponseTime: 1.2,
            totalLeadsReceived: 500,
            totalLeadsConverted: 225,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ])
      ),
      getCarriersNeedingAttention: jest.fn().mockImplementation(() => 
        Promise.resolve([
          {
            id: 'attention-1',
            name: 'Needs Attention Carrier',
            contactEmail: 'attention@test.com',
            contactPhone: '+1-555-999-9999',
            contractStartDate: new Date(),
            contractEndDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
            partnershipTier: 'BASIC',
            partnershipStatus: 'ACTIVE',
            commissionRate: 5.0,
            isActive: true,
            integrationEnabled: false,
            performanceScore: 45,
            conversionRate: 0.08,
            averageResponseTime: 8.5,
            totalLeadsReceived: 100,
            totalLeadsConverted: 8,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ])
      ),
      calculatePerformanceScore: jest.fn().mockImplementation((id) => 
        Promise.resolve(87.5)
      ),
      updateCarrierPartnershipTier: jest.fn().mockImplementation((id, tier) => 
        Promise.resolve({
          id,
          name: 'Updated Tier Carrier',
          contactEmail: 'test@test.com',
          contactPhone: '+1-555-123-4567',
          contractStartDate: new Date(),
          partnershipTier: tier,
          partnershipStatus: 'ACTIVE',
          commissionRate: 10.0,
          isActive: true,
          integrationEnabled: false,
          performanceScore: 0,
          conversionRate: 0,
          averageResponseTime: 0,
          totalLeadsReceived: 0,
          totalLeadsConverted: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      updateCarrierPartnershipStatus: jest.fn().mockImplementation((id, status) => 
        Promise.resolve({
          id,
          name: 'Updated Status Carrier',
          contactEmail: 'test@test.com',
          contactPhone: '+1-555-123-4567',
          contractStartDate: new Date(),
          partnershipTier: 'BASIC',
          partnershipStatus: status,
          commissionRate: 10.0,
          isActive: true,
          integrationEnabled: false,
          performanceScore: 0,
          conversionRate: 0,
          averageResponseTime: 0,
          totalLeadsReceived: 0,
          totalLeadsConverted: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      getCarrierPerformanceTrends: jest.fn().mockImplementation((id, months = 6) => 
        Promise.resolve([
          {
            id: 'trend-1',
            carrierId: id,
            month: 1,
            year: 2025,
            leadsReceived: 180,
            leadsConverted: 63,
            conversionRate: 35.0,
            averageResponseTime: 2.1,
            averageQuoteValue: 1150.0,
            customerSatisfaction: 88.0,
            onTimeDeliveryRate: 94.0,
            createdAt: new Date(),
          },
        ])
      ),
      getCarrierComparisonReport: jest.fn().mockImplementation((carrierIds) => 
        Promise.resolve(carrierIds.map(id => ({
          id,
          name: `Comparison Carrier ${id}`,
          contactEmail: `${id}@test.com`,
          contactPhone: '+1-555-123-4567',
          contractStartDate: new Date(),
          partnershipTier: 'STANDARD',
          partnershipStatus: 'ACTIVE',
          commissionRate: 12.5,
          isActive: true,
          integrationEnabled: true,
          performanceScore: 80 + (carrierIds.indexOf(id) * 2),
          conversionRate: 0.30 + (carrierIds.indexOf(id) * 0.02),
          averageResponseTime: 2.5 - (carrierIds.indexOf(id) * 0.1),
          totalLeadsReceived: 200 + (carrierIds.indexOf(id) * 50),
          totalLeadsConverted: 70 + (carrierIds.indexOf(id) * 15),
          createdAt: new Date(),
          updatedAt: new Date(),
        })))
      ),
    };

    app = express();
    app.use(express.json());
    app.use('/api/v1/carriers', createCarrierRoutes(mockCarrierService as CarrierService));
  });

  it('should create a carrier', async () => {
    const response = await request(app)
      .post('/api/v1/carriers')
      .send({
        name: 'Test Carrier',
        description: 'Test description',
        website: 'https://test.com',
        contactEmail: 'test@test.com',
        contactPhone: '+1-555-123-4567',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'US',
        partnershipTier: 'BASIC',
        partnershipStatus: 'ACTIVE',
        contractStartDate: new Date().toISOString(),
        contractEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        commissionRate: 10.0,
        isActive: true,
        integrationEnabled: false,
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id', 'test-carrier-id');
    expect(response.body).toHaveProperty('name', 'Test Carrier');
  });

  it('should get all carriers', async () => {
    const response = await request(app).get('/api/v1/carriers');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toHaveProperty('name', 'Carrier 1');
  });

  it('should get a carrier by ID', async () => {
    const response = await request(app).get('/api/v1/carriers/test-id');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', 'test-id');
    expect(response.body).toHaveProperty('name', 'Test Carrier');
  });

  it('should return 404 for non-existent carrier', async () => {
    jest.spyOn(mockCarrierService, 'getCarrierById').mockResolvedValueOnce(null);

    const response = await request(app).get('/api/v1/carriers/non-existent');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Carrier not found');
  });

  it('should update a carrier', async () => {
    const response = await request(app)
      .put('/api/v1/carriers/test-id')
      .send({
        name: 'Updated Carrier Name',
        partnershipTier: 'PREMIUM',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', 'test-id');
    expect(response.body).toHaveProperty('name', 'Updated Carrier Name');
    expect(response.body).toHaveProperty('partnershipTier', 'STANDARD'); // From mock
  });

  it('should delete a carrier', async () => {
    const response = await request(app).delete('/api/v1/carriers/test-id');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', 'test-id');
    expect(response.body).toHaveProperty('partnershipStatus', 'TERMINATED');
  });

  it('should get carrier with performance', async () => {
    const response = await request(app).get('/api/v1/carriers/test-id/performance');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', 'test-id');
    expect(response.body).toHaveProperty('performanceScore', 85);
    expect(response.body).toHaveProperty('performanceMetrics');
    expect(Array.isArray(response.body.performanceMetrics)).toBe(true);
  });

  it('should get top performing carriers', async () => {
    const response = await request(app).get('/api/v1/carriers/top-performing');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toHaveProperty('partnershipTier', 'ELITE');
  });

  it('should get carriers needing attention', async () => {
    const response = await request(app).get('/api/v1/carriers/needing-attention');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toHaveProperty('name', 'Needs Attention Carrier');
  });

  it('should calculate performance score', async () => {
    const response = await request(app)
      .post('/api/v1/carriers/test-id/performance/calculate');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('carrierId', 'test-id');
    expect(response.body).toHaveProperty('performanceScore');
    expect(response.body.performanceScore).toBe(87.5);
  });

  it('should update partnership tier', async () => {
    const response = await request(app)
      .put('/api/v1/carriers/test-id/partnership-tier')
      .send({
        tier: 'ELITE',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', 'test-id');
    expect(response.body).toHaveProperty('partnershipTier', 'ELITE');
  });

  it('should update partnership status', async () => {
    const response = await request(app)
      .put('/api/v1/carriers/test-id/partnership-status')
      .send({
        status: 'RENEWAL_NEEDED',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', 'test-id');
    expect(response.body).toHaveProperty('partnershipStatus', 'RENEWAL_NEEDED');
  });

  it('should get performance trends', async () => {
    const response = await request(app).get('/api/v1/carriers/test-id/performance/trends');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toHaveProperty('conversionRate', 35.0);
  });

  it('should get carrier comparison report', async () => {
    const response = await request(app)
      .post('/api/v1/carriers/compare')
      .send({
        carrierIds: ['carrier-1', 'carrier-2', 'carrier-3'],
      });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(3);
    expect(response.body[0]).toHaveProperty('name', 'Comparison Carrier carrier-1');
  });

  it('should return 400 for invalid comparison request', async () => {
    const response = await request(app)
      .post('/api/v1/carriers/compare')
      .send({
        carrierIds: [],
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'carrierIds must be a non-empty array');
  });
});