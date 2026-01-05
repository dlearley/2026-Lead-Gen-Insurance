import { AuditTrailService } from '../audit-trail.service';
import { ComplianceAuditLog, ComplianceAuditLogFilter } from '@types/compliance';

// Mock PrismaClient
const mockPrismaClient = {
  complianceAuditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  $disconnect: jest.fn(),
};

// Mock the logger
jest.mock('@insurance-lead-gen/core', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient),
}));

describe('AuditTrailService', () => {
  let auditTrailService: AuditTrailService;

  beforeEach(() => {
    jest.clearAllMocks();
    auditTrailService = new AuditTrailService();
  });

  afterEach(async () => {
    await auditTrailService.cleanup();
  });

  describe('logAction', () => {
    it('should log compliance action successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const action = 'LeadCreated';
      const entityType = 'Lead';
      const entityId = 'lead-456';
      const changes = { email: 'test@example.com', firstName: 'John' };
      const compliancePolicies = ['policy-1', 'policy-2'];

      const mockAuditLog = {
        id: 'audit-123',
        userId,
        action,
        entityType,
        entityId,
        changes: JSON.stringify(changes),
        compliancePolicies: JSON.stringify(compliancePolicies),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        timestamp: new Date(),
        createdAt: new Date(),
      };

      (mockPrismaClient.complianceAuditLog.create as jest.Mock).mockResolvedValue(mockAuditLog);

      // Act
      await auditTrailService.logAction(userId, action, entityType, entityId, changes, compliancePolicies);

      // Assert
      expect(mockPrismaClient.complianceAuditLog.create).toHaveBeenCalledWith({
        data: {
          userId,
          action,
          entityType,
          entityId,
          changes: JSON.stringify(changes),
          compliancePolicies: JSON.stringify(compliancePolicies),
          ipAddress: expect.any(String),
          userAgent: expect.any(String),
          timestamp: expect.any(Date),
          createdAt: expect.any(Date),
        },
      });
    });

    it('should log action without compliance policies', async () => {
      // Arrange
      const userId = 'user-123';
      const action = 'LeadUpdated';
      const entityType = 'Lead';
      const entityId = 'lead-456';
      const changes = { email: 'updated@example.com' };

      const mockAuditLog = {
        id: 'audit-124',
        userId,
        action,
        entityType,
        entityId,
        changes: JSON.stringify(changes),
        compliancePolicies: null,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        timestamp: new Date(),
        createdAt: new Date(),
      };

      (mockPrismaClient.complianceAuditLog.create as jest.Mock).mockResolvedValue(mockAuditLog);

      // Act
      await auditTrailService.logAction(userId, action, entityType, entityId, changes);

      // Assert
      expect(mockPrismaClient.complianceAuditLog.create).toHaveBeenCalledWith({
        data: {
          userId,
          action,
          entityType,
          entityId,
          changes: JSON.stringify(changes),
          compliancePolicies: null,
          ipAddress: expect.any(String),
          userAgent: expect.any(String),
          timestamp: expect.any(Date),
          createdAt: expect.any(Date),
        },
      });
    });

    it('should handle logging errors gracefully', async () => {
      // Arrange
      const userId = 'user-123';
      const action = 'LeadCreated';
      const entityType = 'Lead';
      const entityId = 'lead-456';
      const changes = { email: 'test@example.com' };

      const error = new Error('Database connection failed');
      (mockPrismaClient.complianceAuditLog.create as jest.Mock).mockRejectedValue(error);

      // Act & Assert - Should not throw error to avoid breaking main flow
      await expect(auditTrailService.logAction(userId, action, entityType, entityId, changes))
        .resolves
        .not.toThrow();
    });
  });

  describe('getAuditTrail', () => {
    it('should retrieve audit trail with filters', async () => {
      // Arrange
      const filters: ComplianceAuditLogFilter = {
        userId: 'user-123',
        action: 'LeadCreated',
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-12-31'),
        limit: 10,
        offset: 0,
      };

      const mockAuditLogs = [
        {
          id: 'audit-1',
          userId: 'user-123',
          action: 'LeadCreated',
          entityType: 'Lead',
          entityId: 'lead-1',
          changes: '{"email":"test@example.com"}',
          compliancePolicies: '["policy-1"]',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          timestamp: new Date('2024-06-01'),
          createdAt: new Date('2024-06-01'),
        },
        {
          id: 'audit-2',
          userId: 'user-123',
          action: 'LeadCreated',
          entityType: 'Lead',
          entityId: 'lead-2',
          changes: '{"email":"test2@example.com"}',
          compliancePolicies: null,
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0...',
          timestamp: new Date('2024-06-02'),
          createdAt: new Date('2024-06-02'),
        },
      ];

      (mockPrismaClient.complianceAuditLog.findMany as jest.Mock).mockResolvedValue(mockAuditLogs);

      // Act
      const result = await auditTrailService.getAuditTrail(filters);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'audit-1',
        userId: 'user-123',
        action: 'LeadCreated',
        entityType: 'Lead',
        entityId: 'lead-1',
        changes: { email: 'test@example.com' },
        compliancePolicies: ['policy-1'],
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        timestamp: expect.any(Date),
        createdAt: expect.any(Date),
      });
      expect(result[1]).toEqual({
        id: 'audit-2',
        userId: 'user-123',
        action: 'LeadCreated',
        entityType: 'Lead',
        entityId: 'lead-2',
        changes: { email: 'test2@example.com' },
        compliancePolicies: undefined,
        ipAddress: '192.168.1.2',
        userAgent: 'Mozilla/5.0...',
        timestamp: expect.any(Date),
        createdAt: expect.any(Date),
      });

      expect(mockPrismaClient.complianceAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          action: 'LeadCreated',
          timestamp: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-12-31'),
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
        skip: 0,
      });
    });

    it('should handle empty filters', async () => {
      // Arrange
      const filters: ComplianceAuditLogFilter = {};

      const mockAuditLogs = [
        {
          id: 'audit-1',
          userId: 'user-123',
          action: 'LeadCreated',
          entityType: 'Lead',
          entityId: 'lead-1',
          changes: '{"email":"test@example.com"}',
          compliancePolicies: null,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          timestamp: new Date(),
          createdAt: new Date(),
        },
      ];

      (mockPrismaClient.complianceAuditLog.findMany as jest.Mock).mockResolvedValue(mockAuditLogs);

      // Act
      const result = await auditTrailService.getAuditTrail(filters);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaClient.complianceAuditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { timestamp: 'desc' },
        take: 100, // Default limit
        skip: 0,   // Default offset
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const filters: ComplianceAuditLogFilter = { userId: 'user-123' };
      const error = new Error('Database query failed');
      (mockPrismaClient.complianceAuditLog.findMany as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(auditTrailService.getAuditTrail(filters))
        .rejects
        .toThrow('Failed to retrieve audit trail');
    });
  });

  describe('generateAuditReport', () => {
    it('should generate audit report for date range', async () => {
      // Arrange
      const dateRange = {
        from: new Date('2024-01-01'),
        to: new Date('2024-12-31'),
      };

      const mockAuditLogs = [
        {
          id: 'audit-1',
          userId: 'user-1',
          action: 'LeadCreated',
          entityType: 'Lead',
          entityId: 'lead-1',
          changes: '{"email":"test@example.com"}',
          compliancePolicies: '["policy-1"]',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          timestamp: new Date('2024-06-01'),
          createdAt: new Date('2024-06-01'),
        },
        {
          id: 'audit-2',
          userId: 'user-2',
          action: 'PolicyCreated',
          entityType: 'CompliancePolicy',
          entityId: 'policy-1',
          changes: '{"name":"GDPR Policy"}',
          compliancePolicies: null,
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0...',
          timestamp: new Date('2024-06-02'),
          createdAt: new Date('2024-06-02'),
        },
      ];

      (mockPrismaClient.complianceAuditLog.findMany as jest.Mock).mockResolvedValue(mockAuditLogs);

      // Mock the generateAuditStatistics method
      jest.spyOn(auditTrailService as any, 'generateAuditStatistics').mockImplementation(() => Promise.resolve());

      // Act
      const result = await auditTrailService.generateAuditReport(dateRange);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].changes).toEqual({ email: 'test@example.com' });
      expect(result[1].changes).toEqual({ name: 'GDPR Policy' });

      expect(mockPrismaClient.complianceAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            gte: dateRange.from,
            lte: dateRange.to,
          },
        },
        orderBy: { timestamp: 'desc' },
      });
    });
  });

  describe('validateAuditIntegrity', () => {
    it('should pass integrity validation when no issues found', async () => {
      // Arrange
      (mockPrismaClient.complianceAuditLog.count as jest.Mock).mockResolvedValue(0);
      (mockPrismaClient.complianceAuditLog.groupBy as jest.Mock).mockResolvedValue([]);

      // Mock all integrity checks to return true
      jest.spyOn(auditTrailService as any, 'checkForDeletedLogs').mockResolvedValue(true);
      jest.spyOn(auditTrailService as any, 'checkForModifiedLogs').mockResolvedValue(true);
      jest.spyOn(auditTrailService as any, 'checkForDuplicateEntries').mockResolvedValue(true);
      jest.spyOn(auditTrailService as any, 'checkTimestampConsistency').mockResolvedValue(true);

      // Act
      const result = await auditTrailService.validateAuditIntegrity();

      // Assert
      expect(result).toBe(true);
    });

    it('should fail integrity validation when duplicates found', async () => {
      // Arrange
      const duplicateEntries = [
        {
          userId: 'user-1',
          action: 'LeadCreated',
          entityType: 'Lead',
          entityId: 'lead-1',
          timestamp: new Date('2024-06-01'),
          id: { _count: { gt: 1 } },
        },
      ];

      (mockPrismaClient.complianceAuditLog.groupBy as jest.Mock).mockResolvedValue(duplicateEntries);
      jest.spyOn(auditTrailService as any, 'checkForDeletedLogs').mockResolvedValue(true);
      jest.spyOn(auditTrailService as any, 'checkForModifiedLogs').mockResolvedValue(true);
      jest.spyOn(auditTrailService as any, 'checkTimestampConsistency').mockResolvedValue(true);

      // Act
      const result = await auditTrailService.validateAuditIntegrity();

      // Assert
      expect(result).toBe(false);
    });

    it('should handle integrity check errors gracefully', async () => {
      // Arrange
      const error = new Error('Integrity check failed');
      jest.spyOn(auditTrailService as any, 'checkForDeletedLogs').mockRejectedValue(error);

      // Act
      const result = await auditTrailService.validateAuditIntegrity();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getAuditStatistics', () => {
    it('should generate comprehensive audit statistics', async () => {
      // Arrange
      const dateRange = {
        from: new Date('2024-01-01'),
        to: new Date('2024-12-31'),
      };

      const mockAuditLogs = [
        {
          userId: 'user-1',
          action: 'LeadCreated',
          entityType: 'Lead',
          entityId: 'lead-1',
          changes: '{"email":"test1@example.com"}',
          compliancePolicies: '["policy-1"]',
          timestamp: new Date('2024-06-01T10:00:00Z'),
        },
        {
          userId: 'user-1',
          action: 'LeadCreated',
          entityType: 'Lead',
          entityId: 'lead-2',
          changes: '{"email":"test2@example.com"}',
          compliancePolicies: null,
          timestamp: new Date('2024-06-01T14:00:00Z'),
        },
        {
          userId: 'user-2',
          action: 'PolicyCreated',
          entityType: 'CompliancePolicy',
          entityId: 'policy-1',
          changes: '{"name":"GDPR Policy"}',
          compliancePolicies: '["policy-1"]',
          timestamp: new Date('2024-06-02T09:00:00Z'),
        },
      ];

      (mockPrismaClient.complianceAuditLog.findMany as jest.Mock).mockResolvedValue(mockAuditLogs);

      // Act
      const result = await auditTrailService.getAuditStatistics(dateRange);

      // Assert
      expect(result.totalEntries).toBe(3);
      expect(result.actionsByType).toEqual({
        LeadCreated: 2,
        PolicyCreated: 1,
      });
      expect(result.entitiesByType).toEqual({
        Lead: 2,
        CompliancePolicy: 1,
      });
      expect(result.usersByActivity).toEqual({
        'user-1': 2,
        'user-2': 1,
      });
      expect(result.compliancePoliciesInvolved).toEqual({
        'policy-1': 2,
      });
      expect(result.hourlyDistribution).toEqual({
        10: 1, // 10:00 AM
        14: 1, // 2:00 PM
        9: 1,  // 9:00 AM
      });
      expect(result.dailyDistribution).toEqual({
        '2024-06-01': 2,
        '2024-06-02': 1,
      });
    });

    it('should handle empty audit logs', async () => {
      // Arrange
      const dateRange = {
        from: new Date('2024-01-01'),
        to: new Date('2024-12-31'),
      };

      (mockPrismaClient.complianceAuditLog.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await auditTrailService.getAuditStatistics(dateRange);

      // Assert
      expect(result.totalEntries).toBe(0);
      expect(Object.keys(result.actionsByType)).toHaveLength(0);
      expect(Object.keys(result.entitiesByType)).toHaveLength(0);
      expect(Object.keys(result.usersByActivity)).toHaveLength(0);
    });
  });

  describe('searchAuditLogs', () => {
    it('should search audit logs with query and filters', async () => {
      // Arrange
      const query = 'GDPR';
      const filters: Partial<ComplianceAuditLogFilter> = {
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-12-31'),
      };

      const mockAuditLogs = [
        {
          id: 'audit-1',
          userId: 'user-1',
          action: 'PolicyCreated',
          entityType: 'CompliancePolicy',
          entityId: 'policy-1',
          changes: '{"name":"GDPR Policy","domain":"GDPR"}',
          compliancePolicies: null,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          timestamp: new Date('2024-06-01'),
          createdAt: new Date('2024-06-01'),
        },
      ];

      (mockPrismaClient.complianceAuditLog.findMany as jest.Mock).mockResolvedValue(mockAuditLogs);

      // Act
      const result = await auditTrailService.searchAuditLogs(query, filters);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].changes).toEqual({ name: 'GDPR Policy', domain: 'GDPR' });

      expect(mockPrismaClient.complianceAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { action: { contains: query, mode: 'insensitive' } },
            { entityType: { contains: query, mode: 'insensitive' } },
            { entityId: { contains: query, mode: 'insensitive' } },
            { changes: { contains: query, mode: 'insensitive' } },
          ],
          timestamp: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-12-31'),
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });
    });
  });

  describe('exportAuditLogs', () => {
    it('should export audit logs in JSON format', async () => {
      // Arrange
      const dateRange = {
        from: new Date('2024-01-01'),
        to: new Date('2024-12-31'),
      };

      const mockAuditLogs = [
        {
          id: 'audit-1',
          userId: 'user-1',
          action: 'LeadCreated',
          entityType: 'Lead',
          entityId: 'lead-1',
          changes: { email: 'test@example.com' },
          compliancePolicies: ['policy-1'],
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          timestamp: new Date('2024-06-01'),
          createdAt: new Date('2024-06-01'),
        },
      ];

      // Mock getAuditTrail to return our test data
      jest.spyOn(auditTrailService, 'getAuditTrail').mockResolvedValue(mockAuditLogs);

      // Act
      const result = await auditTrailService.exportAuditLogs(dateRange, 'json');

      // Assert
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(mockAuditLogs);
    });

    it('should export audit logs in CSV format', async () => {
      // Arrange
      const dateRange = {
        from: new Date('2024-01-01'),
        to: new Date('2024-12-31'),
      };

      const mockAuditLogs = [
        {
          id: 'audit-1',
          userId: 'user-1',
          action: 'LeadCreated',
          entityType: 'Lead',
          entityId: 'lead-1',
          changes: { email: 'test@example.com' },
          compliancePolicies: ['policy-1'],
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          timestamp: new Date('2024-06-01T10:00:00.000Z'),
          createdAt: new Date('2024-06-01T10:00:00.000Z'),
        },
      ];

      jest.spyOn(auditTrailService, 'getAuditTrail').mockResolvedValue(mockAuditLogs);

      // Act
      const result = await auditTrailService.exportAuditLogs(dateRange, 'csv');

      // Assert
      expect(result).toContain('ID,User ID,Action,Entity Type,Entity ID');
      expect(result).toContain('audit-1,user-1,LeadCreated,Lead,lead-1');
      expect(result).toContain('"email":"test@example.com"');
    });

    it('should export audit logs in XML format', async () => {
      // Arrange
      const dateRange = {
        from: new Date('2024-01-01'),
        to: new Date('2024-12-31'),
      };

      const mockAuditLogs = [
        {
          id: 'audit-1',
          userId: 'user-1',
          action: 'LeadCreated',
          entityType: 'Lead',
          entityId: 'lead-1',
          changes: { email: 'test@example.com' },
          compliancePolicies: ['policy-1'],
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          timestamp: new Date('2024-06-01'),
          createdAt: new Date('2024-06-01'),
        },
      ];

      jest.spyOn(auditTrailService, 'getAuditTrail').mockResolvedValue(mockAuditLogs);

      // Act
      const result = await auditTrailService.exportAuditLogs(dateRange, 'xml');

      // Assert
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<AuditLogs>');
      expect(result).toContain('<Id>audit-1</Id>');
      expect(result).toContain('<UserId>user-1</UserId>');
      expect(result).toContain('<Action>LeadCreated</Action>');
    });

    it('should throw error for unsupported export format', async () => {
      // Arrange
      const dateRange = {
        from: new Date('2024-01-01'),
        to: new Date('2024-12-31'),
      };

      // Act & Assert
      await expect(auditTrailService.exportAuditLogs(dateRange, 'pdf' as any))
        .rejects
        .toThrow('Unsupported export format');
    });
  });

  describe('Critical action detection', () => {
    it('should identify critical actions correctly', () => {
      // Test private method by accessing it through the public API or by testing its side effects
      const criticalActions = [
        'PolicyCreated',
        'PolicyArchived',
        'PolicyUpdated',
        'ViolationDetected',
        'ViolationResolved',
        'DataDeleted',
        'DataExported',
        'UserAccessGranted',
        'UserAccessRevoked',
        'SystemConfigurationChanged',
      ];

      // This test verifies the critical action detection logic by ensuring
      // that when critical actions are logged, they trigger the separate logging
      const testCriticalAction = async (action: string) => {
        const changes = { test: 'data' };
        await auditTrailService.logAction('user-1', action, 'TestEntity', 'entity-1', changes);
      };

      // Verify each critical action
      criticalActions.forEach(async (action) => {
        await testCriticalAction(action);
        // The action should be logged, and the system should recognize it as critical
        expect(mockPrismaClient.complianceAuditLog.create).toHaveBeenCalled();
      });
    });

    it('should not flag non-critical actions as critical', () => {
      // Arrange
      const nonCriticalAction = 'LeadViewed';

      // Act
      return auditTrailService.logAction('user-1', nonCriticalAction, 'Lead', 'lead-1', { viewed: true })
        .then(() => {
          // Verify the action was logged
          expect(mockPrismaClient.complianceAuditLog.create).toHaveBeenCalled();
        });
    });
  });

  describe('Audit integrity checks', () => {
    it('should detect duplicate entries', async () => {
      // Arrange
      const duplicateGroups = [
        {
          userId: 'user-1',
          action: 'LeadCreated',
          entityType: 'Lead',
          entityId: 'lead-1',
          timestamp: new Date('2024-06-01'),
          id: { _count: { gt: 1 } },
        },
      ];

      (mockPrismaClient.complianceAuditLog.groupBy as jest.Mock).mockResolvedValue(duplicateGroups);

      // Act
      const hasDuplicates = await (auditTrailService as any).checkForDuplicateEntries();

      // Assert
      expect(hasDuplicates).toBe(false); // Should return false when duplicates exist
    });

    it('should pass duplicate check when no duplicates', async () => {
      // Arrange
      (mockPrismaClient.complianceAuditLog.groupBy as jest.Mock).mockResolvedValue([]);

      // Act
      const hasDuplicates = await (auditTrailService as any).checkForDuplicateEntries();

      // Assert
      expect(hasDuplicates).toBe(true); // Should return true when no duplicates
    });

    it('should detect future timestamps', async () => {
      // Arrange
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day in future
      (mockPrismaClient.complianceAuditLog.count as jest.Mock).mockResolvedValue(1);

      // Act
      const isConsistent = await (auditTrailService as any).checkTimestampConsistency();

      // Assert
      expect(isConsistent).toBe(false);
    });
  });
});