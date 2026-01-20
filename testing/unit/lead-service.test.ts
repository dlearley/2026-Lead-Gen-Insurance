import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { LeadService } from '../../../apps/data-service/src/services/lead-service.js';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
const mockPrisma = {
  lead: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
} as any;

describe('LeadService Unit Tests', () => {
  let leadService: LeadService;
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = mockPrisma as PrismaClient;
    leadService = new LeadService(prisma);
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('Create Lead', () => {
    it('should create a lead with valid data', async () => {
      const leadData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        insuranceType: 'auto',
        source: 'website',
      };

      const mockUser = { id: 'user-123', role: 'agent' };
      const mockLead = {
        id: 'lead-123',
        ...leadData,
        status: 'new',
        priority: 'medium',
        estimatedValue: 0,
        assignedTo: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.lead.create.mockResolvedValue(mockLead);

      const result = await leadService.createLead(leadData, mockUser.id);

      expect(result).toEqual(mockLead);
      expect(mockPrisma.lead.create).toHaveBeenCalledWith({
        data: {
          ...leadData,
          status: 'new',
          priority: 'medium',
          estimatedValue: 0,
          assignedTo: mockUser.id,
        },
      });
    });

    it('should throw error if user does not exist', async () => {
      const leadData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        insuranceType: 'auto',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        leadService.createLead(leadData, 'non-existent-user')
      ).rejects.toThrow('Assigned user not found');
    });

    it('should validate required fields', async () => {
      const invalidLeadData = {
        firstName: '',
        lastName: 'Doe',
        email: 'invalid-email',
      };

      await expect(
        leadService.createLead(invalidLeadData, 'user-123')
      ).rejects.toThrow();
    });
  });

  describe('Get Leads', () => {
    it('should return paginated leads with filters', async () => {
      const mockLeads = [
        {
          id: 'lead-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          insuranceType: 'auto',
          status: 'new',
          priority: 'high',
          assignedTo: 'user-123',
          createdAt: new Date(),
        },
        {
          id: 'lead-2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          insuranceType: 'home',
          status: 'contacted',
          priority: 'medium',
          assignedTo: 'user-123',
          createdAt: new Date(),
        },
      ];

      const filters = {
        status: 'new',
        priority: 'high',
        page: 1,
        limit: 10,
      };

      mockPrisma.lead.findMany.mockResolvedValue(mockLeads);
      mockPrisma.lead.count.mockResolvedValue(1);

      const result = await leadService.getLeads(filters);

      expect(result.leads).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter by insurance type', async () => {
      const mockLeads = [
        {
          id: 'lead-1',
          insuranceType: 'auto',
          status: 'new',
          createdAt: new Date(),
        },
      ];

      const filters = { insuranceType: 'auto' };
      mockPrisma.lead.findMany.mockResolvedValue(mockLeads);
      mockPrisma.lead.count.mockResolvedValue(1);

      await leadService.getLeads(filters);

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith({
        where: { insuranceType: 'auto' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });
  });

  describe('Update Lead', () => {
    it('should update lead successfully', async () => {
      const leadId = 'lead-123';
      const updateData = {
        status: 'contacted',
        priority: 'high',
        notes: 'Follow up needed',
      };

      const mockUpdatedLead = {
        id: leadId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        ...updateData,
        updatedAt: new Date(),
      };

      mockPrisma.lead.findUnique.mockResolvedValue({ id: leadId });
      mockPrisma.lead.update.mockResolvedValue(mockUpdatedLead);

      const result = await leadService.updateLead(leadId, updateData);

      expect(result).toEqual(mockUpdatedLead);
      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: leadId },
        data: {
          ...updateData,
          updatedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });
    });

    it('should throw error if lead not found', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(null);

      await expect(
        leadService.updateLead('non-existent-lead', { status: 'contacted' })
      ).rejects.toThrow('Lead not found');
    });
  });

  describe('Delete Lead', () => {
    it('should soft delete lead by changing status', async () => {
      const leadId = 'lead-123';
      const mockLead = {
        id: leadId,
        status: 'new',
        isActive: true,
      };

      const mockDeletedLead = {
        ...mockLead,
        status: 'cancelled',
        isActive: false,
        updatedAt: new Date(),
      };

      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);
      mockPrisma.lead.update.mockResolvedValue(mockDeletedLead);

      const result = await leadService.deleteLead(leadId);

      expect(result.status).toBe('cancelled');
      expect(result.isActive).toBe(false);
    });
  });

  describe('Lead Statistics', () => {
    it('should calculate lead statistics correctly', async () => {
      const mockStats = {
        totalLeads: 100,
        newLeads: 20,
        contactedLeads: 30,
        qualifiedLeads: 25,
        convertedLeads: 15,
        conversionRate: 15.0,
        averageValue: 2500,
        byStatus: {
          new: 20,
          contacted: 30,
          qualified: 25,
          converted: 15,
          cancelled: 10,
        },
        byInsuranceType: {
          auto: 40,
          home: 35,
          life: 25,
        },
      };

      // Mock the aggregate query
      mockPrisma.lead.aggregate.mockResolvedValue({
        _count: { id: 100 },
        _avg: { estimatedValue: 2500 },
      });

      // Mock the groupBy queries for status and insurance type
      mockPrisma.lead.groupBy.mockResolvedValue([
        { status: 'new', _count: { id: 20 } },
        { status: 'contacted', _count: { id: 30 } },
        { status: 'qualified', _count: { id: 25 } },
        { status: 'converted', _count: { id: 15 } },
        { status: 'cancelled', _count: { id: 10 } },
      ] as any);

      const result = await leadService.getLeadStatistics();

      expect(result.totalLeads).toBe(100);
      expect(result.conversionRate).toBe(15.0);
      expect(result.byStatus.new).toBe(20);
    });
  });

  describe('Lead Assignment', () => {
    it('should assign lead to available agent', async () => {
      const leadId = 'lead-123';
      const mockLead = {
        id: leadId,
        assignedTo: null,
        status: 'new',
      };

      const mockAgents = [
        { id: 'agent-1', leadCount: 5 },
        { id: 'agent-2', leadCount: 3 },
      ];

      const mockUpdatedLead = {
        ...mockLead,
        assignedTo: 'agent-2',
        updatedAt: new Date(),
      };

      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);
      mockPrisma.user.findMany.mockResolvedValue(mockAgents);
      mockPrisma.lead.update.mockResolvedValue(mockUpdatedLead);

      const result = await leadService.assignLeadToAgent(leadId);

      expect(result.assignedTo).toBe('agent-2');
    });

    it('should throw error if no agents available', async () => {
      const leadId = 'lead-123';
      mockPrisma.lead.findUnique.mockResolvedValue({ id: leadId });
      mockPrisma.user.findMany.mockResolvedValue([]);

      await expect(
        leadService.assignLeadToAgent(leadId)
      ).rejects.toThrow('No agents available for assignment');
    });
  });
});