import { ProductComplianceService } from '../product-compliance.service.js';
import { PrismaClient } from '@prisma/client';
import { jest } from '@jest/globals';

const prismaMock = {
  insuranceProductRule: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => prismaMock),
}));

describe('ProductComplianceService', () => {
  let service: ProductComplianceService;

  beforeEach(() => {
    service = new ProductComplianceService();
    jest.clearAllMocks();
  });

  describe('validateQuoteCompliance', () => {
    it('should return compliant if no rules are violated', async () => {
      (prismaMock.insuranceProductRule.findMany as any).mockResolvedValue([
        {
          id: 'rule1',
          ruleDescription: 'Min Premium',
          ruleCondition: JSON.stringify({ field: 'premium', operator: 'min', value: 100 }),
          severity: 'High',
        }
      ]);

      const quoteData = { productType: 'Auto', state: 'CA', premium: 150 };
      const result = await service.validateQuoteCompliance(quoteData);

      expect(result.compliant).toBe(true);
      expect(result.appliedRules).toContain('rule1');
    });

    it('should return non-compliant if a rule is violated', async () => {
      (prismaMock.insuranceProductRule.findMany as any).mockResolvedValue([
        {
          id: 'rule1',
          ruleDescription: 'Min Premium',
          ruleCondition: JSON.stringify({ field: 'premium', operator: 'min', value: 200 }),
          severity: 'High',
        }
      ]);

      const quoteData = { productType: 'Auto', state: 'CA', premium: 150 };
      const result = await service.validateQuoteCompliance(quoteData);

      expect(result.compliant).toBe(false);
      expect(result.violations.length).toBe(1);
      expect(result.violations[0].ruleId).toBe('rule1');
    });
  });
});
