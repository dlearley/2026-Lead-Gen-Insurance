import { ComplianceService } from '../compliance.service';
import { CompliancePolicyEngine } from '../compliance-policy.engine';
import { AuditTrailService } from '../audit-trail.service';
import { ComplianceMonitoringService } from '../compliance-monitoring.service';
import {
  CreatePolicyRequest,
  ComplianceDomain,
  PolicyEvaluationContext,
  ComplianceViolation,
  ComplianceAuditLog,
} from '@types/compliance';

// Mock PrismaClient
const mockPrismaClient = {
  compliancePolicy: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
  },
  requiredField: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  complianceViolation: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  complianceAuditLog: {
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  complianceStatus: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    create: jest.fn(),
  },
  lead: {
    findMany: jest.fn(),
    count: jest.fn(),
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

describe('ComplianceService', () => {
  let complianceService: ComplianceService;
  let policyEngine: CompliancePolicyEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    complianceService = new ComplianceService();
    policyEngine = new CompliancePolicyEngine();
  });

  afterEach(async () => {
    await complianceService.cleanup();
  });

  describe('validateLeadCompliance', () => {
    it('should validate lead compliance successfully', async () => {
      // Arrange
      const mockLeadData = {
        id: 'lead-123',
        email: 'test@example.com',
        consentGiven: true,
        consentDate: new Date().toISOString(),
        state: 'CA',
        userId: 'user-456',
      };

      const mockActivePolicies = [
        {
          id: 'policy-1',
          name: 'GDPR Data Processing',
          domain: 'GDPR',
          jurisdiction: 'EU',
          status: 'Active',
          requirements: [
            {
              id: 'req-1',
              name: 'Consent Required',
              validationRule: JSON.stringify({
                type: 'schema',
                required: ['consentGiven', 'consentDate'],
              }),
              enforcementLevel: 'Mandatory',
            },
          ],
        },
      ];

      const mockValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
      };

      // Mock the dependencies
      (mockPrismaClient.compliancePolicy.findMany as jest.Mock).mockResolvedValue(mockActivePolicies);
      
      // Mock policy engine evaluation
      jest.spyOn(policyEngine, 'evaluatePolicies').mockResolvedValue([
        {
          policyId: 'policy-1',
          policyName: 'GDPR Data Processing',
          isCompliant: true,
          violations: [],
          warnings: [],
          score: 100,
        },
      ]);

      // Act
      const result = await complianceService.validateLeadCompliance(mockLeadData);

      // Assert
      expect(result).toEqual(mockValidationResult);
      expect(mockPrismaClient.compliancePolicy.findMany).toHaveBeenCalledWith({
        where: { status: 'Active' },
        include: { requirements: true },
      });
    });

    it('should handle validation errors gracefully', async () => {
      // Arrange
      const mockLeadData = {
        id: 'lead-123',
        email: 'test@example.com',
        // Missing required consent fields
      };

      const mockActivePolicies = [
        {
          id: 'policy-1',
          name: 'GDPR Data Processing',
          domain: 'GDPR',
          status: 'Active',
          requirements: [
            {
              id: 'req-1',
              name: 'Consent Required',
              validationRule: JSON.stringify({
                type: 'schema',
                required: ['consentGiven', 'consentDate'],
              }),
              enforcementLevel: 'Mandatory',
            },
          ],
        },
      ];

      (mockPrismaClient.compliancePolicy.findMany as jest.Mock).mockResolvedValue(mockActivePolicies);

      // Mock policy engine to return validation errors
      jest.spyOn(policyEngine, 'evaluatePolicies').mockResolvedValue([
        {
          policyId: 'policy-1',
          policyName: 'GDPR Data Processing',
          isCompliant: false,
          violations: ['GDPR consent not obtained for data processing'],
          warnings: [],
          score: 0,
        },
      ]);

      // Act
      const result = await complianceService.validateLeadCompliance(mockLeadData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('COMPLIANCE_VIOLATION');
      expect(result.errors[0].message).toContain('GDPR consent not obtained');
    });
  });

  describe('registerPolicy', () => {
    it('should register a new compliance policy successfully', async () => {
      // Arrange
      const mockPolicyConfig: CreatePolicyRequest = {
        name: 'Test GDPR Policy',
        description: 'Test policy for GDPR compliance',
        domain: 'GDPR' as ComplianceDomain,
        jurisdiction: 'EU',
        riskLevel: 'Critical',
        status: 'Active',
        requirements: [
          {
            name: 'Consent Required',
            description: 'Consent must be obtained',
            validationRule: JSON.stringify({
              type: 'schema',
              required: ['consentGiven'],
            }),
            enforcementLevel: 'Mandatory',
          },
        ],
      };

      const mockCreatedPolicy = {
        id: 'policy-123',
        ...mockPolicyConfig,
        createdAt: new Date(),
        updatedAt: new Date(),
        requirements: mockPolicyConfig.requirements.map((req, index) => ({
          id: `req-${index}`,
          ...req,
          policyId: 'policy-123',
          createdAt: new Date(),
        })),
      };

      (mockPrismaClient.compliancePolicy.create as jest.Mock).mockResolvedValue(mockCreatedPolicy);
      (mockPrismaClient.complianceStatus.upsert as jest.Mock).mockResolvedValue({});

      // Act
      const result = await complianceService.registerPolicy(mockPolicyConfig);

      // Assert
      expect(result).toEqual(mockCreatedPolicy);
      expect(mockPrismaClient.compliancePolicy.create).toHaveBeenCalledWith({
        data: {
          name: mockPolicyConfig.name,
          description: mockPolicyConfig.description,
          domain: mockPolicyConfig.domain,
          jurisdiction: mockPolicyConfig.jurisdiction,
          riskLevel: mockPolicyConfig.riskLevel,
          status: mockPolicyConfig.status,
          requirements: {
            create: mockPolicyConfig.requirements,
          },
        },
        include: {
          requirements: true,
        },
      });
    });

    it('should throw error for invalid policy configuration', async () => {
      // Arrange
      const mockInvalidPolicyConfig = {
        name: '', // Invalid: empty name
        domain: 'InvalidDomain' as ComplianceDomain,
        riskLevel: 'InvalidLevel',
        requirements: [],
      };

      // Mock policy engine to return validation errors
      jest.spyOn(policyEngine, 'validateData').mockResolvedValue({
        isValid: false,
        errors: [
          {
            field: 'name',
            message: 'Policy name is required',
            code: 'REQUIRED_FIELD_MISSING',
          },
        ],
        warnings: [],
      });

      // Act & Assert
      await expect(complianceService.registerPolicy(mockInvalidPolicyConfig as any))
        .rejects
        .toThrow('Invalid policy configuration');
    });
  });

  describe('getPoliciesByDomain', () => {
    it('should return policies for specified domain', async () => {
      // Arrange
      const mockDomain = 'GDPR' as ComplianceDomain;
      const mockPolicies = [
        {
          id: 'policy-1',
          name: 'GDPR Policy 1',
          domain: 'GDPR',
          jurisdiction: 'EU',
          status: 'Active',
          requirements: [],
          violations: [],
        },
        {
          id: 'policy-2',
          name: 'GDPR Policy 2',
          domain: 'GDPR',
          jurisdiction: 'EU',
          status: 'Draft',
          requirements: [],
          violations: [],
        },
      ];

      (mockPrismaClient.compliancePolicy.findMany as jest.Mock).mockResolvedValue(mockPolicies);

      // Act
      const result = await complianceService.getPoliciesByDomain(mockDomain);

      // Assert
      expect(result).toEqual(mockPolicies);
      expect(mockPrismaClient.compliancePolicy.findMany).toHaveBeenCalledWith({
        where: { domain: mockDomain, status: { not: 'Archived' } },
        include: {
          requirements: true,
          violations: {
            where: { status: 'Open' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('checkViolations', () => {
    it('should return violations for specified entity', async () => {
      // Arrange
      const entityType = 'Lead';
      const entityId = 'lead-123';
      const mockViolations = [
        {
          id: 'violation-1',
          policyId: 'policy-1',
          leadId: 'lead-123',
          violationType: 'Missing Consent',
          severity: 'Critical',
          status: 'Open',
          description: 'GDPR consent not obtained',
          policy: {
            id: 'policy-1',
            name: 'GDPR Policy',
            domain: 'GDPR',
          },
        },
      ];

      (mockPrismaClient.complianceViolation.findMany as jest.Mock).mockResolvedValue(mockViolations);

      // Act
      const result = await complianceService.checkViolations(entityType, entityId);

      // Assert
      expect(result).toEqual(mockViolations);
      expect(mockPrismaClient.complianceViolation.findMany).toHaveBeenCalledWith({
        where: {
          entityType: entityType.toLowerCase(),
          entityId: entityId,
          status: 'Open',
        },
        include: {
          policy: true,
        },
        orderBy: { detectedAt: 'desc' },
      });
    });
  });

  describe('getComplianceScore', () => {
    it('should calculate overall compliance score', async () => {
      // Arrange
      const mockStatusRecords = [
        { complianceScore: 95 },
        { complianceScore: 88 },
        { complianceScore: 92 },
      ];

      (mockPrismaClient.complianceStatus.findMany as jest.Mock).mockResolvedValue(mockStatusRecords);

      // Act
      const result = await complianceService.getComplianceScore();

      // Assert
      expect(result).toBe(91.67); // (95 + 88 + 92) / 3
      expect(mockPrismaClient.complianceStatus.findMany).toHaveBeenCalled();
    });

    it('should return 100 when no policies exist', async () => {
      // Arrange
      (mockPrismaClient.complianceStatus.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await complianceService.getComplianceScore();

      // Assert
      expect(result).toBe(100);
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate comprehensive compliance report', async () => {
      // Arrange
      const mockRequest = {
        domain: 'GDPR' as ComplianceDomain,
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-12-31'),
        includeViolations: true,
        includeAuditLogs: true,
        format: 'json' as const,
      };

      const mockViolations = [
        {
          id: 'violation-1',
          policyId: 'policy-1',
          violationType: 'Missing Consent',
          severity: 'Critical',
          status: 'Open',
          description: 'GDPR consent not obtained',
          policy: {
            id: 'policy-1',
            name: 'GDPR Policy',
            domain: 'GDPR',
          },
          detectedAt: new Date('2024-06-01'),
          createdAt: new Date('2024-06-01'),
          updatedAt: new Date('2024-06-01'),
        },
      ];

      const mockAuditLogs = [
        {
          id: 'audit-1',
          userId: 'user-1',
          action: 'LeadCreated',
          entityType: 'Lead',
          entityId: 'lead-1',
          changes: '{}',
          timestamp: new Date('2024-06-01'),
          createdAt: new Date('2024-06-01'),
        },
      ];

      (mockPrismaClient.complianceViolation.findMany as jest.Mock).mockResolvedValue(mockViolations);
      (mockPrismaClient.complianceAuditLog.findMany as jest.Mock).mockResolvedValue(mockAuditLogs);

      // Mock getPolicySummary
      jest.spyOn(complianceService as any, 'getPolicySummary').mockResolvedValue({
        totalPolicies: 2,
        activePolicies: 2,
      });

      // Mock calculatePeriodComplianceScore
      jest.spyOn(complianceService as any, 'calculatePeriodComplianceScore').mockResolvedValue(85);

      // Act
      const result = await complianceService.generateComplianceReport(mockRequest);

      // Assert
      expect(result.domain).toBe('GDPR');
      expect(result.summary.totalPolicies).toBe(2);
      expect(result.summary.totalViolations).toBe(1);
      expect(result.summary.openViolations).toBe(1);
      expect(result.violations).toEqual(mockViolations);
      expect(result.auditLogs).toEqual(mockAuditLogs);
    });
  });

  describe('archivePolicy', () => {
    it('should archive policy and resolve violations', async () => {
      // Arrange
      const policyId = 'policy-1';
      const mockPolicy = {
        id: policyId,
        name: 'Test Policy',
        domain: 'GDPR',
        status: 'Active',
        violations: [
          {
            id: 'violation-1',
            status: 'Open',
          },
        ],
      };

      (mockPrismaClient.compliancePolicy.findUnique as jest.Mock).mockResolvedValue(mockPolicy);
      (mockPrismaClient.compliancePolicy.update as jest.Mock).mockResolvedValue({ ...mockPolicy, status: 'Archived' });
      (mockPrismaClient.complianceViolation.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (mockPrismaClient.complianceStatus.upsert as jest.Mock).mockResolvedValue({});

      // Act
      await complianceService.archivePolicy(policyId);

      // Assert
      expect(mockPrismaClient.compliancePolicy.update).toHaveBeenCalledWith({
        where: { id: policyId },
        data: { status: 'Archived' },
      });

      expect(mockPrismaClient.complianceViolation.updateMany).toHaveBeenCalledWith({
        where: { policyId, status: 'Open' },
        data: {
          status: 'Resolved',
          resolution: 'Policy archived - violations automatically resolved',
          resolvedAt: expect.any(Date),
        },
      });
    });

    it('should throw error when policy not found', async () => {
      // Arrange
      const policyId = 'nonexistent-policy';
      (mockPrismaClient.compliancePolicy.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(complianceService.archivePolicy(policyId))
        .rejects
        .toThrow('Policy not found');
    });
  });

  describe('evaluatePolicy', () => {
    it('should evaluate policy against context', async () => {
      // Arrange
      const policyId = 'policy-1';
      const mockContext: PolicyEvaluationContext = {
        entityId: 'lead-1',
        entityType: 'Lead',
        data: { email: 'test@example.com', consentGiven: true },
        userId: 'user-1',
        jurisdiction: 'EU',
        timestamp: new Date(),
      };

      const mockPolicy = {
        id: policyId,
        name: 'GDPR Policy',
        domain: 'GDPR',
        requirements: [],
      };

      const mockEvaluationResult = {
        policyId: 'policy-1',
        policyName: 'GDPR Policy',
        isCompliant: true,
        violations: [],
        warnings: [],
        score: 100,
      };

      (mockPrismaClient.compliancePolicy.findUnique as jest.Mock).mockResolvedValue(mockPolicy);
      jest.spyOn(policyEngine, 'evaluatePolicies').mockResolvedValue([mockEvaluationResult]);

      // Act
      const result = await complianceService.evaluatePolicy(policyId, mockContext);

      // Assert
      expect(result).toEqual(mockEvaluationResult);
      expect(mockPrismaClient.compliancePolicy.findUnique).toHaveBeenCalledWith({
        where: { id: policyId },
        include: { requirements: true },
      });
    });

    it('should throw error when policy not found', async () => {
      // Arrange
      const policyId = 'nonexistent-policy';
      const mockContext: PolicyEvaluationContext = {
        entityId: 'lead-1',
        entityType: 'Lead',
        data: {},
        userId: 'user-1',
        timestamp: new Date(),
      };

      (mockPrismaClient.compliancePolicy.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(complianceService.evaluatePolicy(policyId, mockContext))
        .rejects
        .toThrow('Policy not found');
    });
  });
});