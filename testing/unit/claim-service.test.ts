import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { ClaimService } from '../../../apps/data-service/src/services/claim-repository.js';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
const mockPrisma = {
  claim: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  claimDocument: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  claimNote: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  claimActivity: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  policy: {
    findUnique: jest.fn(),
  },
} as any;

describe('ClaimService Unit Tests', () => {
  let claimService: ClaimService;
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = mockPrisma as PrismaClient;
    claimService = new ClaimService(prisma);
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('Create Claim', () => {
    it('should create a claim with valid data', async () => {
      const claimData = {
        leadId: 'lead-123',
        policyId: 'policy-123',
        insuranceType: 'auto',
        claimType: 'auto_accident',
        incidentDate: new Date('2024-01-15'),
        incidentDescription: 'Rear-end collision at intersection',
        claimedAmount: 5000,
        incidentLocation: 'Main St & 5th Ave, New York, NY',
      };

      const mockPolicy = {
        id: 'policy-123',
        leadId: 'lead-123',
        status: 'active',
      };

      const mockClaim = {
        id: 'claim-123',
        claimNumber: 'CLM-2024-000001',
        ...claimData,
        status: 'submitted',
        priority: 'medium',
        severity: 'moderate',
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.policy.findUnique.mockResolvedValue(mockPolicy);
      mockPrisma.claim.create.mockResolvedValue(mockClaim);

      const result = await claimService.createClaim(claimData);

      expect(result).toHaveValidClaimNumber();
      expect(result.claimNumber).toMatch(/^CLM-\d{4}-\d{6}$/);
      expect(result.status).toBe('submitted');
      expect(result.claimedAmount).toBe(5000);
    });

    it('should throw error if policy not found', async () => {
      const claimData = {
        leadId: 'lead-123',
        policyId: 'non-existent-policy',
        insuranceType: 'auto',
        claimType: 'auto_accident',
        incidentDate: new Date(),
        incidentDescription: 'Test incident',
        claimedAmount: 1000,
      };

      mockPrisma.policy.findUnique.mockResolvedValue(null);

      await expect(
        claimService.createClaim(claimData)
      ).rejects.toThrow('Policy not found');
    });

    it('should throw error for invalid claim amount', async () => {
      const claimData = {
        leadId: 'lead-123',
        policyId: 'policy-123',
        insuranceType: 'auto',
        claimType: 'auto_accident',
        incidentDate: new Date(),
        incidentDescription: 'Test incident',
        claimedAmount: -100, // Invalid negative amount
      };

      await expect(
        claimService.createClaim(claimData)
      ).rejects.toThrow();
    });
  });

  describe('Get Claims', () => {
    it('should return paginated claims with filters', async () => {
      const mockClaims = [
        {
          id: 'claim-1',
          claimNumber: 'CLM-2024-000001',
          insuranceType: 'auto',
          status: 'submitted',
          priority: 'high',
          claimedAmount: 5000,
          createdAt: new Date(),
        },
        {
          id: 'claim-2',
          claimNumber: 'CLM-2024-000002',
          insuranceType: 'home',
          status: 'review',
          priority: 'medium',
          claimedAmount: 25000,
          createdAt: new Date(),
        },
      ];

      const filters = {
        status: 'submitted',
        priority: 'high',
        page: 1,
        limit: 10,
      };

      mockPrisma.claim.findMany.mockResolvedValue(mockClaims);
      mockPrisma.claim.count.mockResolvedValue(1);

      const result = await claimService.getClaims(filters);

      expect(result.claims).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.claims[0].status).toBe('submitted');
    });

    it('should filter by date range', async () => {
      const mockClaims = [
        {
          id: 'claim-1',
          incidentDate: new Date('2024-01-15'),
          createdAt: new Date(),
        },
      ];

      const filters = {
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      };

      mockPrisma.claim.findMany.mockResolvedValue(mockClaims);
      mockPrisma.claim.count.mockResolvedValue(1);

      await claimService.getClaims(filters);

      expect(mockPrisma.claim.findMany).toHaveBeenCalledWith({
        where: {
          incidentDate: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-31'),
          },
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should filter by amount range', async () => {
      const filters = {
        minAmount: 1000,
        maxAmount: 10000,
      };

      mockPrisma.claim.findMany.mockResolvedValue([]);
      mockPrisma.claim.count.mockResolvedValue(0);

      await claimService.getClaims(filters);

      expect(mockPrisma.claim.findMany).toHaveBeenCalledWith({
        where: {
          claimedAmount: {
            gte: 1000,
            lte: 10000,
          },
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });
  });

  describe('Update Claim Status', () => {
    it('should update claim status and log activity', async () => {
      const claimId = 'claim-123';
      const newStatus = 'approved';
      const mockClaim = {
        id: claimId,
        claimNumber: 'CLM-2024-000001',
        status: 'submitted',
        updatedAt: new Date(),
      };

      const mockUpdatedClaim = {
        ...mockClaim,
        status: newStatus,
        updatedAt: new Date(),
      };

      mockPrisma.claim.findUnique.mockResolvedValue(mockClaim);
      mockPrisma.claim.update.mockResolvedValue(mockUpdatedClaim);
      mockPrisma.claimActivity.create.mockResolvedValue({ id: 'activity-1' });

      const result = await claimService.updateClaimStatus(claimId, newStatus);

      expect(result.status).toBe(newStatus);
      expect(mockPrisma.claimActivity.create).toHaveBeenCalled();
    });

    it('should throw error for invalid status transition', async () => {
      const claimId = 'claim-123';
      const mockClaim = {
        id: claimId,
        status: 'paid',
      };

      mockPrisma.claim.findUnique.mockResolvedValue(mockClaim);

      // Cannot transition from 'paid' back to 'submitted'
      await expect(
        claimService.updateClaimStatus(claimId, 'submitted')
      ).rejects.toThrow('Invalid status transition');
    });
  });

  describe('Claim Statistics', () => {
    it('should calculate claim statistics correctly', async () => {
      const mockStats = {
        totalClaims: 50,
        submittedClaims: 10,
        reviewClaims: 5,
        approvedClaims: 15,
        deniedClaims: 5,
        paidClaims: 10,
        closedClaims: 5,
        totalClaimedAmount: 500000,
        totalApprovedAmount: 350000,
        totalPaidAmount: 300000,
        approvalRate: 60.0,
        denialRate: 10.0,
        averageProcessingTime: 15.5,
        byInsuranceType: {
          auto: 20,
          home: 15,
          life: 10,
          health: 5,
        },
        byClaimType: {
          auto_accident: 15,
          home_damage: 10,
          life_death: 5,
          health_medical: 5,
        },
      };

      // Mock aggregate queries
      mockPrisma.claim.aggregate.mockImplementation((args: any) => {
        if (args._count) return { _count: { id: 50 } };
        if (args.claimedAmount) return { _sum: { claimedAmount: 500000 } };
        if (args.approvedAmount) return { _sum: { approvedAmount: 350000 } };
        if (args.paidAmount) return { _sum: { paidAmount: 300000 } };
        return {};
      });

      // Mock groupBy queries
      mockPrisma.claim.groupBy.mockImplementation((args: any) => {
        if (args.by.includes('status')) {
          return [
            { status: 'submitted', _count: { id: 10 } },
            { status: 'review', _count: { id: 5 } },
            { status: 'approved', _count: { id: 15 } },
            { status: 'denied', _count: { id: 5 } },
            { status: 'paid', _count: { id: 10 } },
            { status: 'closed', _count: { id: 5 } },
          ];
        }
        if (args.by.includes('insuranceType')) {
          return [
            { insuranceType: 'auto', _count: { id: 20 } },
            { insuranceType: 'home', _count: { id: 15 } },
            { insuranceType: 'life', _count: { id: 10 } },
            { insuranceType: 'health', _count: { id: 5 } },
          ];
        }
        return [];
      });

      const result = await claimService.getClaimStatistics();

      expect(result.totalClaims).toBe(50);
      expect(result.approvalRate).toBe(60.0);
      expect(result.totalClaimedAmount).toBe(500000);
      expect(result.byInsuranceType.auto).toBe(20);
    });
  });

  describe('Document Management', () => {
    it('should add document to claim', async () => {
      const claimId = 'claim-123';
      const documentData = {
        documentType: 'police_report',
        fileName: 'police-report-001.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        description: 'Police report for accident',
      };

      const mockDocument = {
        id: 'doc-123',
        claimId,
        ...documentData,
        isVerified: false,
        uploadedAt: new Date(),
        createdAt: new Date(),
      };

      mockPrisma.claim.findUnique.mockResolvedValue({ id: claimId });
      mockPrisma.claimDocument.create.mockResolvedValue(mockDocument);

      const result = await claimService.addDocument(claimId, documentData);

      expect(result.documentType).toBe('police_report');
      expect(result.isVerified).toBe(false);
    });

    it('should verify document', async () => {
      const documentId = 'doc-123';
      const mockDocument = {
        id: documentId,
        claimId: 'claim-123',
        documentType: 'medical_report',
        isVerified: false,
      };

      const mockVerifiedDocument = {
        ...mockDocument,
        isVerified: true,
        verifiedAt: new Date(),
      };

      mockPrisma.claimDocument.findUnique.mockResolvedValue(mockDocument);
      mockPrisma.claimDocument.update.mockResolvedValue(mockVerifiedDocument);

      const result = await claimService.verifyDocument(documentId);

      expect(result.isVerified).toBe(true);
      expect(result.verifiedAt).toBeDefined();
    });
  });

  describe('Note Management', () => {
    it('should add note to claim', async () => {
      const claimId = 'claim-123';
      const noteData = {
        content: 'Customer called regarding claim status',
        isInternal: true,
        author: 'agent-123',
      };

      const mockNote = {
        id: 'note-123',
        claimId,
        ...noteData,
        createdAt: new Date(),
      };

      mockPrisma.claim.findUnique.mockResolvedValue({ id: claimId });
      mockPrisma.claimNote.create.mockResolvedValue(mockNote);

      const result = await claimService.addNote(claimId, noteData);

      expect(result.content).toBe('Customer called regarding claim status');
      expect(result.isInternal).toBe(true);
    });
  });

  describe('Activity Logging', () => {
    it('should log claim activities', async () => {
      const claimId = 'claim-123';
      const activityData = {
        action: 'status_changed',
        description: 'Claim status changed from submitted to review',
        userId: 'user-123',
        metadata: { from: 'submitted', to: 'review' },
      };

      const mockActivity = {
        id: 'activity-123',
        claimId,
        ...activityData,
        timestamp: new Date(),
      };

      mockPrisma.claim.findUnique.mockResolvedValue({ id: claimId });
      mockPrisma.claimActivity.create.mockResolvedValue(mockActivity);

      const result = await claimService.logActivity(claimId, activityData);

      expect(result.action).toBe('status_changed');
      expect(result.description).toContain('status changed');
    });
  });
});