import { InsuranceLicenseService } from '../insurance-license.service.js';
import { PrismaClient } from '@prisma/client';
import { jest } from '@jest/globals';

// Mock PrismaClient
const prismaMock = {
  insuranceLicense: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  agentComplianceRecord: {
    create: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => prismaMock),
}));

describe('InsuranceLicenseService', () => {
  let service: InsuranceLicenseService;

  beforeEach(() => {
    service = new InsuranceLicenseService();
    jest.clearAllMocks();
  });

  describe('verifyLicense', () => {
    it('should return license details if found in database', async () => {
      const mockLicense = {
        licenseNumber: 'L123',
        licenseType: 'Property',
        states: ['CA'],
        lines: ['Auto'],
        status: 'Active',
        expiryDate: new Date(),
      };
      (prismaMock.insuranceLicense.findUnique as any).mockResolvedValue(mockLicense);

      const result = await service.verifyLicense('agent1', 'L123');

      expect(result.verified).toBe(true);
      expect(result.licenseNumber).toBe('L123');
    });

    it('should call NIPC if license not found in database', async () => {
      (prismaMock.insuranceLicense.findUnique as any).mockResolvedValue(null);
      
      const result = await service.verifyLicense('agent1', 'L999');

      expect(result.verified).toBe(true);
      expect(result.licenseNumber).toBe('L999');
    });
  });

  describe('isAgentLicensed', () => {
    it('should return true if active license exists for state and line', async () => {
      (prismaMock.insuranceLicense.findFirst as any).mockResolvedValue({ id: '1' });

      const result = await service.isAgentLicensed('agent1', 'CA', 'Auto');

      expect(result).toBe(true);
      expect(prismaMock.insuranceLicense.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          agentId: 'agent1',
          states: { has: 'CA' },
          lines: { has: 'Auto' },
        }),
      }));
    });
  });
});
