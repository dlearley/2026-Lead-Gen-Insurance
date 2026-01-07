import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CarrierService } from '../services/carrier-service';
import { mockPrismaClient, mockLogger, generateId } from './setup';

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
}));

describe('CarrierService', () => {
  let service: CarrierService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CarrierService();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getCarriers', () => {
    it('should return list of carriers', async () => {
      const mockCarriers = [
        { id: 'carrier-1', name: 'State Farm', code: 'SF', active: true },
        { id: 'carrier-2', name: 'GEICO', code: 'GE', active: true },
      ];

      mockPrismaClient.carrier.findMany.mockResolvedValue(mockCarriers);

      const carriers = await service.getCarriers({});

      expect(carriers).toEqual(mockCarriers);
      expect(mockPrismaClient.carrier.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { name: 'asc' },
      });
    });

    it('should filter by active status', async () => {
      const mockCarriers = [
        { id: 'carrier-1', name: 'State Farm', code: 'SF', active: true },
      ];

      mockPrismaClient.carrier.findMany.mockResolvedValue(mockCarriers);

      const carriers = await service.getCarriers({ activeOnly: true });

      expect(carriers).toEqual(mockCarriers);
      expect(mockPrismaClient.carrier.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { name: 'asc' },
      });
    });

    it('should handle empty results', async () => {
      mockPrismaClient.carrier.findMany.mockResolvedValue([]);

      const carriers = await service.getCarriers({});

      expect(carriers).toEqual([]);
    });
  });

  describe('getCarrierById', () => {
    it('should return carrier when found', async () => {
      const mockCarrier = { id: 'carrier-1', name: 'State Farm', code: 'SF', active: true };
      mockPrismaClient.carrier.findUnique.mockResolvedValue(mockCarrier);

      const carrier = await service.getCarrierById('carrier-1');

      expect(carrier).toEqual(mockCarrier);
      expect(mockPrismaClient.carrier.findUnique).toHaveBeenCalledWith({
        where: { id: 'carrier-1' },
      });
    });

    it('should return null when carrier not found', async () => {
      mockPrismaClient.carrier.findUnique.mockResolvedValue(null);

      const carrier = await service.getCarrierById('non-existent');

      expect(carrier).toBeNull();
    });
  });

  describe('createCarrier', () => {
    it('should create a new carrier', async () => {
      const carrierData = {
        name: 'New Carrier',
        code: 'NC',
        active: true,
      };

      const createdCarrier = {
        id: 'carrier-new',
        ...carrierData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.carrier.create.mockResolvedValue(createdCarrier);

      const carrier = await service.createCarrier(carrierData);

      expect(carrier).toEqual(createdCarrier);
      expect(mockPrismaClient.carrier.create).toHaveBeenCalledWith({
        data: carrierData,
      });
    });

    it('should generate unique code if not provided', async () => {
      const carrierData = {
        name: 'Test Carrier',
      };

      const createdCarrier = {
        id: 'carrier-new',
        name: 'Test Carrier',
        code: 'TC',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.carrier.create.mockResolvedValue(createdCarrier);

      const carrier = await service.createCarrier(carrierData);

      expect(carrier.code).toBeDefined();
    });
  });

  describe('updateCarrier', () => {
    it('should update carrier fields', async () => {
      const existingCarrier = { id: 'carrier-1', name: 'Old Name', code: 'ON', active: true };
      mockPrismaClient.carrier.findUnique.mockResolvedValue(existingCarrier);

      const updatedCarrier = {
        id: 'carrier-1',
        name: 'New Name',
        code: 'ON',
        active: true,
        updatedAt: new Date(),
      };
      mockPrismaClient.carrier.update.mockResolvedValue(updatedCarrier);

      const carrier = await service.updateCarrier('carrier-1', { name: 'New Name' });

      expect(carrier.name).toBe('New Name');
      expect(mockPrismaClient.carrier.update).toHaveBeenCalled();
    });

    it('should throw error for non-existent carrier', async () => {
      mockPrismaClient.carrier.findUnique.mockResolvedValue(null);

      await expect(service.updateCarrier('non-existent', { name: 'New Name' }))
        .rejects.toThrow('Carrier not found');
    });
  });

  describe('deactivateCarrier', () => {
    it('should deactivate carrier', async () => {
      const existingCarrier = { id: 'carrier-1', name: 'State Farm', code: 'SF', active: true };
      mockPrismaClient.carrier.findUnique.mockResolvedValue(existingCarrier);

      const deactivatedCarrier = {
        ...existingCarrier,
        active: false,
        updatedAt: new Date(),
      };
      mockPrismaClient.carrier.update.mockResolvedValue(deactivatedCarrier);

      const carrier = await service.deactivateCarrier('carrier-1');

      expect(carrier.active).toBe(false);
      expect(mockPrismaClient.carrier.update).toHaveBeenCalledWith({
        where: { id: 'carrier-1' },
        data: { active: false },
      });
    });
  });

  describe('searchCarriers', () => {
    it('should search carriers by name', async () => {
      const mockCarriers = [
        { id: 'carrier-1', name: 'State Farm Insurance', code: 'SF', active: true },
      ];

      mockPrismaClient.carrier.findMany.mockResolvedValue(mockCarriers);

      const carriers = await service.searchCarriers('State');

      expect(carriers).toEqual(mockCarriers);
      expect(mockPrismaClient.carrier.findMany).toHaveBeenCalledWith({
        where: {
          name: { contains: 'State', mode: 'insensitive' },
        },
      });
    });

    it('should return empty array for no matches', async () => {
      mockPrismaClient.carrier.findMany.mockResolvedValue([]);

      const carriers = await service.searchCarriers('NonExistent');

      expect(carriers).toEqual([]);
    });
  });

  describe('getCarrierStatistics', () => {
    it('should return carrier statistics', async () => {
      mockPrismaClient.carrier.findMany.mockResolvedValue([
        { id: 'carrier-1', name: 'State Farm', active: true },
        { id: 'carrier-2', name: 'GEICO', active: true },
        { id: 'carrier-3', name: 'Old Carrier', active: false },
      ]);

      mockPrismaClient.carrier.count.mockResolvedValue(3);

      const stats = await service.getCarrierStatistics();

      expect(stats).toHaveProperty('totalCarriers', 3);
      expect(stats).toHaveProperty('activeCarriers', 2);
      expect(stats).toHaveProperty('inactiveCarriers', 1);
    });
  });
});
