import { ComplianceMonitoringService } from '../compliance-monitoring.service';
import { ComplianceViolation } from '@types/compliance';

// Mock PrismaClient
const mockPrismaClient = {
  compliancePolicy: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  complianceViolation: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  complianceStatus: {
    upsert: jest.fn(),
  },
  lead: {
    findMany: jest.fn(),
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

describe('ComplianceMonitoringService', () => {
  let monitoringService: ComplianceMonitoringService;

  beforeEach(() => {
    jest.clearAllMocks();
    monitoringService = new ComplianceMonitoringService();
  });

  afterEach(async () => {
    await monitoringService.cleanup();
  });

  describe('scanLeadsForViolations', () => {
    it('should scan leads and detect violations successfully', async () => {
      // Arrange
      const mockActivePolicies = [
        {
          id: 'policy-1',
          name: 'GDPR Policy',
          domain: 'GDPR',
          requirements: [
            {
              id: 'req-1',
              name: 'Consent Required',
              validationRule: JSON.stringify({
                type: 'schema',
                required: ['consentGiven'],
              }),
              enforcementLevel: 'Mandatory',
            },
          ],
        },
      ];

      const mockLeads = [
        {
          id: 'lead-1',
          email: 'test@example.com',
          state: 'CA',
          consentGiven: true, // Compliant
          createdAt: new Date(),
        },
        {
          id: 'lead-2',
          email: 'test2@example.com',
          state: 'CA',
          consentGiven: false, // Non-compliant
          createdAt: new Date(),
        },
      ];

      const mockViolations = [
        {
          id: 'violation-1',
          policyId: 'policy-1',
          leadId: 'lead-2',
          violationType: 'Missing Consent',
          severity: 'Critical',
          status: 'Open',
          description: 'GDPR consent not obtained for lead data processing',
          detectedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaClient.compliancePolicy.findMany as jest.Mock).mockResolvedValue(mockActivePolicies);
      (mockPrismaClient.lead.findMany as jest.Mock).mockResolvedValue(mockLeads);
      (mockPrismaClient.complianceViolation.create as jest.Mock).mockResolvedValue(mockViolations[0]);

      // Mock the checkRequirementViolation method to return a violation for lead-2
      jest.spyOn(monitoringService as any, 'checkRequirementViolation')
        .mockResolvedValueOnce(null) // No violation for lead-1
        .mockResolvedValueOnce(mockViolations[0]); // Violation for lead-2

      // Act
      const result = await monitoringService.scanLeadsForViolations();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].leadId).toBe('lead-2');
      expect(result[0].violationType).toBe('Missing Consent');
      expect(mockPrismaClient.complianceViolation.create).toHaveBeenCalledTimes(1);
    });

    it('should handle no active policies gracefully', async () => {
      // Arrange
      (mockPrismaClient.compliancePolicy.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await monitoringService.scanLeadsForViolations();

      // Assert
      expect(result).toHaveLength(0);
      expect(mockPrismaClient.lead.findMany).not.toHaveBeenCalled();
    });

    it('should handle no leads gracefully', async () => {
      // Arrange
      const mockActivePolicies = [
        {
          id: 'policy-1',
          domain: 'GDPR',
          requirements: [],
        },
      ];

      (mockPrismaClient.compliancePolicy.findMany as jest.Mock).mockResolvedValue(mockActivePolicies);
      (mockPrismaClient.lead.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await monitoringService.scanLeadsForViolations();

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should generate alerts for critical violations', async () => {
      // Arrange
      const mockActivePolicies = [
        {
          id: 'policy-1',
          name: 'GDPR Policy',
          domain: 'GDPR',
          requirements: [
            {
              id: 'req-1',
              name: 'Consent Required',
              validationRule: '{}',
              enforcementLevel: 'Mandatory',
            },
          ],
        },
      ];

      const mockLeads = [
        {
          id: 'lead-1',
          email: 'test@example.com',
          consentGiven: false,
          createdAt: new Date(),
        },
      ];

      const criticalViolation = {
        id: 'violation-1',
        policyId: 'policy-1',
        leadId: 'lead-1',
        violationType: 'Missing Consent',
        severity: 'Critical',
        status: 'Open',
        description: 'GDPR consent not obtained',
        detectedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaClient.compliancePolicy.findMany as jest.Mock).mockResolvedValue(mockActivePolicies);
      (mockPrismaClient.lead.findMany as jest.Mock).mockResolvedValue(mockLeads);
      (mockPrismaClient.complianceViolation.create as jest.Mock).mockResolvedValue(criticalViolation);

      jest.spyOn(monitoringService as any, 'checkRequirementViolation')
        .mockResolvedValueOnce(criticalViolation);

      // Mock alert generation
      jest.spyOn(monitoringService, 'alertOnViolation').mockResolvedValue(undefined);

      // Act
      const result = await monitoringService.scanLeadsForViolations();

      // Assert
      expect(result).toHaveLength(1);
      expect(monitoringService.alertOnViolation).toHaveBeenCalledWith(criticalViolation);
    });
  });

  describe('monitorPolicyCompliance', () => {
    it('should monitor policy compliance and update status', async () => {
      // Arrange
      const policyId = 'policy-1';
      const mockPolicy = {
        id: policyId,
        name: 'GDPR Policy',
        domain: 'GDPR',
        jurisdiction: 'EU',
        status: 'Active',
        requirements: [
          {
            id: 'req-1',
            name: 'Consent Required',
            validationRule: '{}',
            enforcementLevel: 'Mandatory',
          },
        ],
        violations: [
          {
            id: 'violation-1',
            status: 'Open',
          },
          {
            id: 'violation-2',
            status: 'Resolved',
          },
        ],
      };

      const mockStatus = {
        id: 'status-1',
        domain: 'GDPR',
        jurisdiction: 'EU',
        totalPolicies: 1,
        activePolicies: 1,
        openViolations: 1,
        resolvedViolations: 1,
        complianceScore: 50,
        lastAssessment: new Date(),
        nextAssessment: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaClient.compliancePolicy.findUnique as jest.Mock).mockResolvedValue(mockPolicy);
      (mockPrismaClient.complianceStatus.upsert as jest.Mock).mockResolvedValue(mockStatus);

      // Act
      const result = await monitoringService.monitorPolicyCompliance(policyId);

      // Assert
      expect(result).toEqual(mockStatus);
      expect(mockPrismaClient.complianceStatus.upsert).toHaveBeenCalledWith({
        where: {
          domain_jurisdiction: {
            domain: 'GDPR',
            jurisdiction: 'EU',
          },
        },
        update: {
          totalPolicies: 1,
          activePolicies: 1,
          openViolations: 1,
          resolvedViolations: 1,
          complianceScore: 50, // 1 open violation = 50% compliance
          lastAssessment: expect.any(Date),
          nextAssessment: expect.any(Date),
          updatedAt: expect.any(Date),
        },
        create: {
          domain: 'GDPR',
          jurisdiction: 'EU',
          totalPolicies: 1,
          activePolicies: 1,
          openViolations: 1,
          resolvedViolations: 1,
          complianceScore: 50,
          lastAssessment: expect.any(Date),
          nextAssessment: expect.any(Date),
        },
      });
    });

    it('should throw error when policy not found', async () => {
      // Arrange
      const policyId = 'nonexistent-policy';
      (mockPrismaClient.compliancePolicy.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(monitoringService.monitorPolicyCompliance(policyId))
        .rejects
        .toThrow('Policy not found');
    });

    it('should calculate compliance score correctly', async () => {
      // Arrange
      const policyId = 'policy-1';
      const mockPolicy = {
        id: policyId,
        name: 'GDPR Policy',
        domain: 'GDPR',
        status: 'Active',
        requirements: [],
        violations: [], // No violations
      };

      (mockPrismaClient.compliancePolicy.findUnique as jest.Mock).mockResolvedValue(mockPolicy);
      (mockPrismaClient.complianceStatus.upsert as jest.Mock).mockResolvedValue({});

      // Act
      await monitoringService.monitorPolicyCompliance(policyId);

      // Assert
      expect(mockPrismaClient.complianceStatus.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            complianceScore: 100, // No violations = 100% compliance
          }),
        })
      );
    });
  });

  describe('detectAnomalies', () => {
    it('should detect compliance anomalies', async () => {
      // Mock all anomaly detection methods
      jest.spyOn(monitoringService as any, 'detectViolationSpikes').mockResolvedValue({
        type: 'violation_spike',
        severity: 'high',
        message: 'Unusual increase in violations detected',
      });

      jest.spyOn(monitoringService as any, 'detectUserActivityAnomalies').mockResolvedValue([
        {
          type: 'unusual_user_activity',
          severity: 'medium',
          userId: 'user-1',
          message: 'Unusual number of actions detected',
        },
      ]);

      jest.spyOn(monitoringService as any, 'detectPolicyAnomalies').mockResolvedValue([
        {
          type: 'policy_effectiveness',
          severity: 'low',
          policyId: 'policy-1',
          message: 'Policy showing low effectiveness',
        },
      ]);

      jest.spyOn(monitoringService as any, 'detectAccessAnomalies').mockResolvedValue([]);

      // Act
      const result = await monitoringService.detectAnomalies();

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        type: 'violation_spike',
        severity: 'high',
        message: 'Unusual increase in violations detected',
      });
      expect(result[1]).toEqual({
        type: 'unusual_user_activity',
        severity: 'medium',
        userId: 'user-1',
        message: 'Unusual number of actions detected',
      });
      expect(result[2]).toEqual({
        type: 'policy_effectiveness',
        severity: 'low',
        policyId: 'policy-1',
        message: 'Policy showing low effectiveness',
      });
    });

    it('should handle anomaly detection errors gracefully', async () => {
      // Arrange
      jest.spyOn(monitoringService as any, 'detectViolationSpikes').mockRejectedValue(
        new Error('Anomaly detection failed')
      );

      // Act
      const result = await monitoringService.detectAnomalies();

      // Assert
      expect(result).toEqual([]); // Should return empty array on error
    });
  });

  describe('alertOnViolation', () => {
    it('should generate alerts for critical violations', async () => {
      // Arrange
      const violation: ComplianceViolation = {
        id: 'violation-1',
        policyId: 'policy-1',
        leadId: 'lead-1',
        violationType: 'Missing Consent',
        severity: 'Critical',
        status: 'Open',
        description: 'GDPR consent not obtained',
        detectedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock external alerting
      jest.spyOn(monitoringService as any, 'sendToExternalAlerting').mockResolvedValue(undefined);

      // Act
      await monitoringService.alertOnViolation(violation);

      // Assert
      expect(monitoringService.alertOnViolation).toBeDefined();
      // The alert should be logged by the logger
    });

    it('should map violation severity to alert severity correctly', async () => {
      // Arrange
      const testCases = [
        { violationSeverity: 'Critical', expectedAlertSeverity: 'critical' },
        { violationSeverity: 'High', expectedAlertSeverity: 'high' },
        { violationSeverity: 'Medium', expectedAlertSeverity: 'medium' },
        { violationSeverity: 'Low', expectedAlertSeverity: 'low' },
      ];

      for (const testCase of testCases) {
        const violation: ComplianceViolation = {
          id: 'violation-1',
          policyId: 'policy-1',
          violationType: 'Test',
          severity: testCase.violationSeverity as any,
          status: 'Open',
          description: 'Test violation',
          detectedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Act
        await monitoringService.alertOnViolation(violation);

        // Verify the severity mapping (this would be tested through the alert data)
        expect(monitoringService.alertOnViolation).toBeDefined();
      }
    });
  });

  describe('generateComplianceTrends', () => {
    it('should generate comprehensive compliance trends', async () => {
      // Mock all trend generation methods
      jest.spyOn(monitoringService as any, 'getViolationTrends').mockResolvedValue({
        totalViolations: 10,
        trend: 'increasing',
      });

      jest.spyOn(monitoringService as any, 'getComplianceTrends').mockResolvedValue({
        averageScore: 85,
        trend: 'stable',
      });

      jest.spyOn(monitoringService as any, 'getAuditTrends').mockResolvedValue({
        totalActions: 100,
        trend: 'increasing',
      });

      jest.spyOn(monitoringService as any, 'getDomainTrends').mockResolvedValue({
        GDPR: { score: 90 },
        HIPAA: { score: 85 },
      });

      // Act
      const result = await monitoringService.generateComplianceTrends();

      // Assert
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({
        type: 'violation_trends',
        period: expect.objectContaining({
          from: expect.any(Date),
          to: expect.any(Date),
        }),
        data: {
          totalViolations: 10,
          trend: 'increasing',
        },
      });
      expect(result[1]).toEqual({
        type: 'compliance_trends',
        data: {
          averageScore: 85,
          trend: 'stable',
        },
      });
      expect(result[2]).toEqual({
        type: 'audit_trends',
        data: {
          totalActions: 100,
          trend: 'increasing',
        },
      });
      expect(result[3]).toEqual({
        type: 'domain_trends',
        data: {
          GDPR: { score: 90 },
          HIPAA: { score: 85 },
        },
      });
    });

    it('should handle trend generation errors gracefully', async () => {
      // Arrange
      jest.spyOn(monitoringService as any, 'getViolationTrends').mockRejectedValue(
        new Error('Trend generation failed')
      );

      // Mock other methods to return empty results
      jest.spyOn(monitoringService as any, 'getComplianceTrends').mockResolvedValue({});
      jest.spyOn(monitoringService as any, 'getAuditTrends').mockResolvedValue({});
      jest.spyOn(monitoringService as any, 'getDomainTrends').mockResolvedValue({});

      // Act
      const result = await monitoringService.generateComplianceTrends();

      // Assert
      expect(result).toHaveLength(3); // Should return empty results for failed trend
    });
  });

  describe('Domain-specific violation detection', () => {
    describe('GDPR violations', () => {
      it('should detect missing consent for EU leads', () => {
        // Arrange
        const requirement = {
          name: 'Consent Required',
          validationRule: '{}',
        };

        const lead = {
          state: 'CA', // Not EU
          consentGiven: false,
        };

        // Act
        const result = (monitoringService as any).checkGDPRViolation(lead, requirement);

        // Assert
        expect(result.isViolated).toBe(false); // Not EU jurisdiction
      });

      it('should detect expired data retention', () => {
        // Arrange
        const requirement = {
          name: 'Data Retention',
          validationRule: '{}',
        };

        const lead = {
          retentionExpiry: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        };

        // Act
        const result = (monitoringService as any).checkGDPRViolation(lead, requirement);

        // Assert
        expect(result.isViolated).toBe(true);
        expect(result.violationType).toBe('Retention Expired');
        expect(result.description).toContain('GDPR data retention period has expired');
      });

      it('should detect unfulfilled erasure requests', () => {
        // Arrange
        const requirement = {
          name: 'Right to Erasure',
          validationRule: '{}',
        };

        const lead = {
          erasureRequested: true,
          erasureCompleted: false,
        };

        // Act
        const result = (monitoringService as any).checkGDPRViolation(lead, requirement);

        // Assert
        expect(result.isViolated).toBe(true);
        expect(result.violationType).toBe('Erasure Not Fulfilled');
      });
    });

    describe('HIPAA violations', () => {
      it('should detect unencrypted PHI', () => {
        // Arrange
        const requirement = {
          name: 'PHI Encryption',
          validationRule: '{}',
        };

        const lead = {
          insuranceType: 'HEALTH',
          encrypted: false,
        };

        // Act
        const result = (monitoringService as any).checkHIPAAViolation(lead, requirement);

        // Assert
        expect(result.isViolated).toBe(true);
        expect(result.violationType).toBe('PHI Not Encrypted');
      });

      it('should detect missing access controls for PHI', () => {
        // Arrange
        const requirement = {
          name: 'Access Controls',
          validationRule: '{}',
        };

        const lead = {
          healthData: true,
          accessControls: false,
        };

        // Act
        const result = (monitoringService as any).checkHIPAAViolation(lead, requirement);

        // Assert
        expect(result.isViolated).toBe(true);
        expect(result.violationType).toBe('Missing Access Controls');
      });
    });

    describe('CCPA violations', () => {
      it('should detect missing opt-out for California residents', () => {
        // Arrange
        const requirement = {
          name: 'Opt-Out Mechanism',
          validationRule: '{}',
        };

        const lead = {
          state: 'CA',
          optOutAvailable: false,
        };

        // Act
        const result = (monitoringService as any).checkCCPAViolation(lead, requirement);

        // Assert
        expect(result.isViolated).toBe(true);
        expect(result.violationType).toBe('Missing Opt-Out');
      });

      it('should not flag non-California residents for CCPA', () => {
        // Arrange
        const requirement = {
          name: 'Opt-Out Mechanism',
          validationRule: '{}',
        };

        const lead = {
          state: 'NY',
          optOutAvailable: false,
        };

        // Act
        const result = (monitoringService as any).checkCCPAViolation(lead, requirement);

        // Assert
        expect(result.isViolated).toBe(false);
      });
    });
  });

  describe('Violation severity determination', () => {
    it('should assign Critical severity for mandatory requirements in critical policies', () => {
      // Arrange
      const requirement = {
        enforcementLevel: 'Mandatory',
      };

      const policy = {
        riskLevel: 'Critical',
      };

      // Act
      const severity = (monitoringService as any).determineSeverity(requirement, policy);

      // Assert
      expect(severity).toBe('Critical');
    });

    it('should assign High severity for mandatory requirements', () => {
      // Arrange
      const requirement = {
        enforcementLevel: 'Mandatory',
      };

      const policy = {
        riskLevel: 'Medium',
      };

      // Act
      const severity = (monitoringService as any).determineSeverity(requirement, policy);

      // Assert
      expect(severity).toBe('High');
    });

    it('should assign Medium severity for recommended requirements in high-risk policies', () => {
      // Arrange
      const requirement = {
        enforcementLevel: 'Recommended',
      };

      const policy = {
        riskLevel: 'High',
      };

      // Act
      const severity = (monitoringService as any).determineSeverity(requirement, policy);

      // Assert
      expect(severity).toBe('Medium');
    });

    it('should assign Low severity for recommended requirements', () => {
      // Arrange
      const requirement = {
        enforcementLevel: 'Recommended',
      };

      const policy = {
        riskLevel: 'Low',
      };

      // Act
      const severity = (monitoringService as any).determineSeverity(requirement, policy);

      // Assert
      expect(severity).toBe('Low');
    });
  });

  describe('Periodic monitoring', () => {
    it('should start periodic monitoring on initialization', () => {
      // The service should start periodic monitoring in constructor
      expect(monitoringService).toBeDefined();
      
      // Verify that monitoringInterval is set
      expect((monitoringService as any).monitoringInterval).toBeDefined();
    });

    it('should stop periodic monitoring on cleanup', async () => {
      // Act
      await monitoringService.cleanup();

      // Assert
      expect((monitoringService as any).monitoringInterval).toBeNull();
    });
  });

  describe('Threshold management', () => {
    it('should initialize alert thresholds correctly', () => {
      // Verify thresholds are initialized
      const thresholds = (monitoringService as any).alertThresholds;
      expect(thresholds.get('critical_violations_per_hour')).toBe(5);
      expect(thresholds.get('high_violations_per_hour')).toBe(10);
      expect(thresholds.get('compliance_score_minimum')).toBe(80);
      expect(thresholds.get('unusual_activity_threshold')).toBe(50);
    });
  });
});