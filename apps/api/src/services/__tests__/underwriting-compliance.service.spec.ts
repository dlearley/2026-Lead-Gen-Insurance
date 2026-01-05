import { UnderwritingComplianceService } from '../underwriting-compliance.service.js';
import { PrismaClient } from '@prisma/client';
import { jest } from '@jest/globals';

const prismaMock = {
  underwritingRule: {
    findMany: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => prismaMock),
}));

describe('UnderwritingComplianceService', () => {
  let service: UnderwritingComplianceService;

  beforeEach(() => {
    service = new UnderwritingComplianceService();
    jest.clearAllMocks();
  });

  describe('evaluateApplication', () => {
    it('should approve if all rules pass', async () => {
      (prismaMock.underwritingRule.findMany as any).mockResolvedValue([
        {
          id: 'rule1',
          ruleExpression: JSON.stringify({ field: 'age', operator: 'gte', value: 18 }),
          action: 'Decline',
          reasoning: 'Underage'
        }
      ]);

      const appData = { productType: 'Auto', state: 'CA', age: 25 };
      const result = await service.evaluateApplication(appData);

      expect(result.action).toBe('Approve');
    });

    it('should decline if a decline rule fails', async () => {
      (prismaMock.underwritingRule.findMany as any).mockResolvedValue([
        {
          id: 'rule1',
          ruleExpression: JSON.stringify({ field: 'age', operator: 'gte', value: 18 }),
          action: 'Decline',
          reasoning: 'Underage'
        }
      ]);

      const appData = { productType: 'Auto', state: 'CA', age: 16 };
      const result = await service.evaluateApplication(appData);

      expect(result.action).toBe('Decline');
      expect(result.reasoning).toBe('Underage');
    });
  });
});
