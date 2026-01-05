import { DisclosureService } from '../disclosure.service.js';
import { PrismaClient } from '@prisma/client';
import { jest } from '@jest/globals';

const prismaMock = {
  requiredDisclosure: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  disclosureDelivery: {
    create: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => prismaMock),
}));

describe('DisclosureService', () => {
  let service: DisclosureService;

  beforeEach(() => {
    service = new DisclosureService();
    jest.clearAllMocks();
  });

  describe('getRequiredDisclosures', () => {
    it('should return disclosures for state and federal', async () => {
      (prismaMock.requiredDisclosure.findMany as any).mockResolvedValue([
        { id: '1', jurisdiction: 'CA' },
        { id: '2', jurisdiction: 'Federal' }
      ]);

      const result = await service.getRequiredDisclosures('CA', 'Auto');

      expect(result.length).toBe(2);
      expect(prismaMock.requiredDisclosure.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { jurisdiction: 'CA' },
            { jurisdiction: 'Federal' }
          ]
        })
      }));
    });
  });

  describe('validateDisclosureCompliance', () => {
    it('should return true if all required disclosures are acknowledged', async () => {
      (prismaMock.requiredDisclosure.findMany as any).mockResolvedValue([
        { id: 'disc1', isRequired: true }
      ]);
      (prismaMock.disclosureDelivery.findFirst as any).mockResolvedValue({ id: 'del1', acknowledged: true });

      const result = await service.validateDisclosureCompliance('lead1', 'CA', 'Auto');

      expect(result).toBe(true);
    });

    it('should return false if a required disclosure is missing', async () => {
      (prismaMock.requiredDisclosure.findMany as any).mockResolvedValue([
        { id: 'disc1', isRequired: true }
      ]);
      (prismaMock.disclosureDelivery.findFirst as any).mockResolvedValue(null);

      const result = await service.validateDisclosureCompliance('lead1', 'CA', 'Auto');

      expect(result).toBe(false);
    });
  });
});
