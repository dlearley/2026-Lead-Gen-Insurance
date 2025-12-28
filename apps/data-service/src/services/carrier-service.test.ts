import { CarrierService } from './carrier-service.js';
import { CarrierRepository } from '../repositories/carrier.repository.js';
import { PrismaClient } from '@prisma/client';
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';

describe('CarrierService', () => {
  let prisma: PrismaClient;
  let carrierRepository: CarrierRepository;
  let carrierService: CarrierService;

  beforeAll(() => {
    prisma = new PrismaClient();
    carrierRepository = new CarrierRepository(prisma);
    carrierService = new CarrierService(carrierRepository);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should be defined', () => {
    expect(carrierService).toBeDefined();
  });

  it('should have all required methods', () => {
    expect(typeof carrierService.createCarrier).toBe('function');
    expect(typeof carrierService.getCarrierById).toBe('function');
    expect(typeof carrierService.getAllCarriers).toBe('function');
    expect(typeof carrierService.updateCarrier).toBe('function');
    expect(typeof carrierService.deleteCarrier).toBe('function');
    expect(typeof carrierService.createPerformanceMetric).toBe('function');
    expect(typeof carrierService.getPerformanceMetrics).toBe('function');
    expect(typeof carrierService.updatePerformanceMetric).toBe('function');
    expect(typeof carrierService.getCarrierWithPerformance).toBe('function');
    expect(typeof carrierService.updatePerformanceScore).toBe('function');
    expect(typeof carrierService.updateConversionMetrics).toBe('function');
    expect(typeof carrierService.calculatePerformanceScore).toBe('function');
    expect(typeof carrierService.getTopPerformingCarriers).toBe('function');
    expect(typeof carrierService.getCarriersNeedingAttention).toBe('function');
    expect(typeof carrierService.updateCarrierPartnershipTier).toBe('function');
    expect(typeof carrierService.updateCarrierPartnershipStatus).toBe('function');
    expect(typeof carrierService.getCarrierPerformanceTrends).toBe('function');
    expect(typeof carrierService.getCarrierComparisonReport).toBe('function');
  });

  it('should calculate performance score correctly', async () => {
    // Mock the repository methods
    const mockCarrier = {
      id: 'test-carrier',
      name: 'Test Carrier',
      performanceScore: 0,
      performanceMetrics: [
        {
          id: 'metric-1',
          carrierId: 'test-carrier',
          month: 1,
          year: 2025,
          leadsReceived: 100,
          leadsConverted: 40,
          conversionRate: 40.0,
          averageResponseTime: 2.0,
          averageQuoteValue: 1000.0,
          customerSatisfaction: 90.0,
          onTimeDeliveryRate: 95.0,
          createdAt: new Date(),
        },
      ],
      // ... other carrier properties
    };

    // Mock the repository methods
    jest.spyOn(carrierRepository, 'getCarrierWithPerformance').mockResolvedValue(mockCarrier as any);
    jest.spyOn(carrierRepository, 'updatePerformanceScore').mockResolvedValue(mockCarrier as any);

    const score = await carrierService.calculatePerformanceScore('test-carrier');
    
    // Expected calculation:
    // conversion: 40/100 = 0.4 * 40% = 0.16
    // responseTime: 1 - 2/24 = 0.9167 * 20% = 0.1833
    // satisfaction: 90/100 = 0.9 * 20% = 0.18
    // delivery: 95/100 = 0.95 * 20% = 0.19
    // Total: (0.16 + 0.1833 + 0.18 + 0.19) * 100 ≈ 71.33
    
    expect(score).toBeGreaterThan(70);
    expect(score).toBeLessThan(75);
  });

  it('should identify top performing carriers', async () => {
    const mockCarriers = [
      { id: '1', name: 'Carrier A', performanceScore: 90, isActive: true, partnershipStatus: 'ACTIVE' },
      { id: '2', name: 'Carrier B', performanceScore: 80, isActive: true, partnershipStatus: 'ACTIVE' },
      { id: '3', name: 'Carrier C', performanceScore: 70, isActive: true, partnershipStatus: 'ACTIVE' },
      { id: '4', name: 'Carrier D', performanceScore: 60, isActive: false, partnershipStatus: 'ACTIVE' },
    ];

    jest.spyOn(carrierRepository, 'findMany').mockResolvedValue(mockCarriers as any);

    const topCarriers = await carrierService.getTopPerformingCarriers(2);
    
    expect(topCarriers).toHaveLength(2);
    expect(topCarriers[0].name).toBe('Carrier A');
    expect(topCarriers[1].name).toBe('Carrier B');
  });

  it('should identify carriers needing attention', async () => {
    const currentDate = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(currentDate.getDate() + 30);

    const mockCarriers = [
      {
        id: '1',
        name: 'Carrier A',
        performanceScore: 80,
        conversionRate: 0.25,
        contractEndDate: thirtyDaysFromNow,
        isActive: true,
      },
      {
        id: '2',
        name: 'Carrier B',
        performanceScore: 45,
        conversionRate: 0.25,
        contractEndDate: null,
        isActive: true,
      },
      {
        id: '3',
        name: 'Carrier C',
        performanceScore: 80,
        conversionRate: 0.05,
        contractEndDate: null,
        isActive: true,
      },
      {
        id: '4',
        name: 'Carrier D',
        performanceScore: 80,
        conversionRate: 0.25,
        contractEndDate: null,
        isActive: false,
      },
    ];

    jest.spyOn(carrierRepository, 'findMany').mockResolvedValue(mockCarriers as any);

    const carriersNeedingAttention = await carrierService.getCarriersNeedingAttention();
    
    // Should include carriers with contract expiring soon, low performance, or low conversion
    expect(carriersNeedingAttention).toHaveLength(3);
    expect(carriersNeedingAttention.some(c => c.name === 'Carrier A')).toBe(true); // Contract expiring
    expect(carriersNeedingAttention.some(c => c.name === 'Carrier B')).toBe(true); // Low performance score
    expect(carriersNeedingAttention.some(c => c.name === 'Carrier C')).toBe(true); // Low conversion rate
  });
});