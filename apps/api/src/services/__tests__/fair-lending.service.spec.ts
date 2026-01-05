import { FairLendingService } from '../fair-lending.service.js';
import { PrismaClient } from '@prisma/client';
import { jest } from '@jest/globals';

const prismaMock = {
  disparateImpactMonitor: {
    upsert: jest.fn(),
    findMany: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => prismaMock),
}));

describe('FairLendingService', () => {
  let service: FairLendingService;

  beforeEach(() => {
    service = new FairLendingService();
    jest.clearAllMocks();
  });

  describe('validateApplicationForDiscrimination', () => {
    it('should flag application if decision factors include prohibited items', async () => {
      const applicationData = {
        id: 'app1',
        decisionFactors: ['creditScore', 'race'],
      };

      const result = await service.validateApplicationForDiscrimination(applicationData);

      expect(result.compliant).toBe(false);
      expect(result.discriminatoryFactorsDetected).toContain('race');
      expect(result.riskLevel).toBe('Medium');
    });

    it('should pass application if no prohibited factors are used', async () => {
      const applicationData = {
        id: 'app1',
        decisionFactors: ['creditScore', 'drivingHistory'],
      };

      const result = await service.validateApplicationForDiscrimination(applicationData);

      expect(result.compliant).toBe(true);
      expect(result.riskLevel).toBe('Low');
    });
  });

  describe('calculateDisparateImpactMetrics', () => {
    it('should return metrics with approval rates', async () => {
      const result = await service.calculateDisparateImpactMetrics('Auto');

      expect(result.periodId).toBeDefined();
      expect(result.products['Auto']).toBeDefined();
      expect(result.products['Auto'].approvalRateByClass).toBeDefined();
    });
  });
});
