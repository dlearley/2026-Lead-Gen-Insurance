import { CarrierRepository } from './carrier.repository.js';
import { PrismaClient } from '@prisma/client';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('CarrierRepository', () => {
  let prisma: PrismaClient;
  let carrierRepository: CarrierRepository;

  beforeAll(() => {
    prisma = new PrismaClient();
    carrierRepository = new CarrierRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should be defined', () => {
    expect(carrierRepository).toBeDefined();
  });

  it('should have all required methods', () => {
    expect(typeof carrierRepository.create).toBe('function');
    expect(typeof carrierRepository.findById).toBe('function');
    expect(typeof carrierRepository.findMany).toBe('function');
    expect(typeof carrierRepository.update).toBe('function');
    expect(typeof carrierRepository.delete).toBe('function');
    expect(typeof carrierRepository.createPerformanceMetric).toBe('function');
    expect(typeof carrierRepository.getPerformanceMetrics).toBe('function');
    expect(typeof carrierRepository.updatePerformanceMetric).toBe('function');
    expect(typeof carrierRepository.getCarrierWithPerformance).toBe('function');
    expect(typeof carrierRepository.updatePerformanceScore).toBe('function');
    expect(typeof carrierRepository.updateConversionMetrics).toBe('function');
  });

  it('should create a carrier with valid input', async () => {
    const testCarrier = {
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
      contractStartDate: new Date(),
      contractEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      commissionRate: 10.0,
      isActive: true,
      integrationEnabled: false,
    };

    // This would actually create a carrier in a real database
    // For testing purposes, we just verify the method exists and has correct signature
    await expect(carrierRepository.create(testCarrier))
      .resolves
      .toHaveProperty('id');
  }, 10000);

  it('should handle errors gracefully', async () => {
    // Test with invalid input
    const invalidCarrier = {
      name: '', // Empty name should cause validation error
      contactEmail: 'invalid-email',
      contactPhone: '123',
      contractStartDate: new Date(),
    };

    await expect(carrierRepository.create(invalidCarrier as any))
      .rejects
      .toBeDefined();
  }, 10000);
});