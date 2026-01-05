import { CompliancePolicyEngine } from '../compliance-policy.engine';
import {
  CompliancePolicy,
  PolicyEvaluationContext,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ComplianceViolation,
} from '@types/compliance';

describe('CompliancePolicyEngine', () => {
  let policyEngine: CompliancePolicyEngine;

  beforeEach(() => {
    policyEngine = new CompliancePolicyEngine();
  });

  describe('validateData', () => {
    it('should validate data against JSON schema successfully', async () => {
      // Arrange
      const data = {
        email: 'test@example.com',
        consentGiven: true,
        consentDate: '2024-01-01T00:00:00Z',
      };

      const validationRules = JSON.stringify({
        type: 'schema',
        required: ['email', 'consentGiven', 'consentDate'],
        properties: {
          email: { type: 'string', format: 'email' },
          consentGiven: { type: 'boolean' },
          consentDate: { type: 'string', format: 'date-time' },
        },
      });

      // Act
      const result = await policyEngine.validateData(data, validationRules);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return validation errors for missing required fields', async () => {
      // Arrange
      const data = {
        email: 'test@example.com',
        // Missing consentGiven and consentDate
      };

      const validationRules = JSON.stringify({
        type: 'schema',
        required: ['email', 'consentGiven', 'consentDate'],
      });

      // Act
      const result = await policyEngine.validateData(data, validationRules);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toEqual({
        field: 'consentGiven',
        message: "Required field 'consentGiven' is missing",
        code: 'REQUIRED_FIELD_MISSING',
      });
      expect(result.errors[1]).toEqual({
        field: 'consentDate',
        message: "Required field 'consentDate' is missing",
        code: 'REQUIRED_FIELD_MISSING',
      });
    });

    it('should handle invalid JSON validation rules gracefully', async () => {
      // Arrange
      const data = { email: 'test@example.com' };
      const invalidValidationRules = 'invalid json';

      // Act
      const result = await policyEngine.validateData(data, invalidValidationRules);

      // Assert
      expect(result.isValid).toBe(true); // Should default to valid when rules are invalid
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('not implemented');
    });

    it('should validate data types correctly', async () => {
      // Arrange
      const data = {
        email: 123, // Invalid: should be string
        consentGiven: 'yes', // Invalid: should be boolean
      };

      const validationRules = JSON.stringify({
        type: 'schema',
        properties: {
          email: { type: 'string' },
          consentGiven: { type: 'boolean' },
        },
      });

      // Act
      const result = await policyEngine.validateData(data, validationRules);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toEqual({
        field: 'email',
        message: "Field 'email' must be of type string",
        code: 'INVALID_TYPE',
      });
      expect(result.errors[1]).toEqual({
        field: 'consentGiven',
        message: "Field 'consentGiven' must be of type boolean",
        code: 'INVALID_TYPE',
      });
    });
  });

  describe('evaluatePolicies', () => {
    it('should evaluate multiple policies against context', async () => {
      // Arrange
      const mockPolicies: CompliancePolicy[] = [
        {
          id: 'policy-1',
          name: 'GDPR Policy',
          domain: 'GDPR',
          jurisdiction: 'EU',
          riskLevel: 'Critical',
          status: 'Active',
          requirements: [
            {
              id: 'req-1',
              policyId: 'policy-1',
              name: 'Consent Required',
              validationRule: JSON.stringify({
                type: 'schema',
                required: ['consentGiven'],
              }),
              enforcementLevel: 'Mandatory',
              createdAt: new Date(),
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'policy-2',
          name: 'HIPAA Policy',
          domain: 'HIPAA',
          jurisdiction: 'US',
          riskLevel: 'High',
          status: 'Active',
          requirements: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockContext: PolicyEvaluationContext = {
        entityId: 'lead-1',
        entityType: 'Lead',
        data: { consentGiven: true, jurisdiction: 'EU' },
        userId: 'user-1',
        jurisdiction: 'EU',
        timestamp: new Date(),
      };

      // Act
      const results = await policyEngine.evaluatePolicies(mockPolicies, mockContext);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].policyId).toBe('policy-1');
      expect(results[0].policyName).toBe('GDPR Policy');
      expect(results[1].policyId).toBe('policy-2');
      expect(results[1].policyName).toBe('HIPAA Policy');
    });

    it('should handle policy evaluation errors gracefully', async () => {
      // Arrange
      const mockPolicies: CompliancePolicy[] = [
        {
          id: 'policy-1',
          name: 'Test Policy',
          domain: 'GDPR',
          riskLevel: 'High',
          status: 'Active',
          requirements: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockContext: PolicyEvaluationContext = {
        entityId: 'lead-1',
        entityType: 'Lead',
        data: {},
        userId: 'user-1',
        timestamp: new Date(),
      };

      // Mock the evaluateSinglePolicy to throw an error
      jest.spyOn(policyEngine as any, 'evaluateSinglePolicy').mockRejectedValue(new Error('Evaluation failed'));

      // Act & Assert
      await expect(policyEngine.evaluatePolicies(mockPolicies, mockContext))
        .rejects
        .toThrow('Policy evaluation failed');
    });
  });

  describe('evaluateSinglePolicy', () => {
    let mockPolicy: CompliancePolicy;
    let mockContext: PolicyEvaluationContext;

    beforeEach(() => {
      mockPolicy = {
        id: 'policy-1',
        name: 'GDPR Policy',
        domain: 'GDPR',
        jurisdiction: 'EU',
        riskLevel: 'Critical',
        status: 'Active',
        requirements: [
          {
            id: 'req-1',
            policyId: 'policy-1',
            name: 'Consent Required',
            validationRule: JSON.stringify({
              type: 'schema',
              required: ['consentGiven'],
            }),
            enforcementLevel: 'Mandatory',
            createdAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockContext = {
        entityId: 'lead-1',
        entityType: 'Lead',
        data: { consentGiven: true },
        userId: 'user-1',
        jurisdiction: 'EU',
        timestamp: new Date(),
      };
    });

    it('should evaluate policy as compliant when all requirements met', async () => {
      // Act
      const result = await (policyEngine as any).evaluateSinglePolicy(mockPolicy, mockContext);

      // Assert
      expect(result.policyId).toBe('policy-1');
      expect(result.policyName).toBe('GDPR Policy');
      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.score).toBe(100);
    });

    it('should evaluate policy as non-compliant when requirements violated', async () => {
      // Arrange
      const nonCompliantContext = {
        ...mockContext,
        data: { consentGiven: false }, // Missing consent
      };

      // Act
      const result = await (policyEngine as any).evaluateSinglePolicy(mockPolicy, nonCompliantContext);

      // Assert
      expect(result.isCompliant).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toContain('GDPR consent not obtained');
      expect(result.score).toBeLessThan(100);
    });

    it('should handle policy jurisdiction applicability', async () => {
      // Arrange
      const usContext = {
        ...mockContext,
        jurisdiction: 'US', // EU policy should not apply to US context
      };

      // Act
      const result = await (policyEngine as any).evaluateSinglePolicy(mockPolicy, usContext);

      // Assert
      expect(result.isCompliant).toBe(true); // Not applicable = compliant
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Policy not applicable for jurisdiction');
      expect(result.score).toBe(100);
    });

    it('should apply policy overrides when available', async () => {
      // Arrange
      jest.spyOn(policyEngine, 'applyOverrides').mockResolvedValue(true);

      // Act
      const result = await (policyEngine as any).evaluateSinglePolicy(mockPolicy, mockContext);

      // Assert
      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(policyEngine.applyOverrides).toHaveBeenCalledWith('policy-1', mockContext);
    });

    it('should handle recommended requirements as warnings', async () => {
      // Arrange
      const recommendedPolicy = {
        ...mockPolicy,
        requirements: [
          {
            id: 'req-1',
            policyId: 'policy-1',
            name: 'Recommended Field',
            validationRule: JSON.stringify({
              type: 'schema',
              required: ['recommendedField'],
            }),
            enforcementLevel: 'Recommended', // Not mandatory
            createdAt: new Date(),
          },
        ],
      };

      const contextWithMissingRecommended = {
        ...mockContext,
        data: { consentGiven: true }, // Missing recommendedField
      };

      // Act
      const result = await (policyEngine as any).evaluateSinglePolicy(recommendedPolicy, contextWithMissingRecommended);

      // Assert
      expect(result.isCompliant).toBe(true); // Recommended violations don't make policy non-compliant
      expect(result.warnings).toHaveLength(1);
      expect(result.violations).toHaveLength(0); // Should be moved to warnings
    });
  });

  describe('applyOverrides', () => {
    it('should return false for no overrides', async () => {
      // Arrange
      const policyId = 'policy-1';
      const mockContext: PolicyEvaluationContext = {
        entityId: 'lead-1',
        entityType: 'Lead',
        data: {},
        userId: 'user-1',
        timestamp: new Date(),
      };

      // Act
      const result = await policyEngine.applyOverrides(policyId, mockContext);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('calculateComplianceScore', () => {
    it('should return 100 for no violations', () => {
      // Arrange
      const violations: ComplianceViolation[] = [];

      // Act
      const result = policyEngine.calculateComplianceScore(violations);

      // Assert
      expect(result).toBe(100);
    });

    it('should calculate score correctly with violations', () => {
      // Arrange
      const violations: ComplianceViolation[] = [
        {
          id: '1',
          policyId: 'policy-1',
          violationType: 'Critical Violation',
          severity: 'Critical',
          status: 'Open',
          description: 'Critical violation',
          detectedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          policyId: 'policy-2',
          violationType: 'High Violation',
          severity: 'High',
          status: 'Open',
          description: 'High violation',
          detectedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Act
      const result = policyEngine.calculateComplianceScore(violations);

      // Assert
      expect(result).toBe(60); // 100 - (25 + 15) = 60
    });

    it('should handle all severity levels correctly', () => {
      // Arrange
      const violations: ComplianceViolation[] = [
        { severity: 'Critical', id: '1', policyId: 'p1', violationType: '', status: '', description: '', detectedAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
        { severity: 'High', id: '2', policyId: 'p2', violationType: '', status: '', description: '', detectedAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
        { severity: 'Medium', id: '3', policyId: 'p3', violationType: '', status: '', description: '', detectedAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
        { severity: 'Low', id: '4', policyId: 'p4', violationType: '', status: '', description: '', detectedAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
      ];

      // Act
      const result = policyEngine.calculateComplianceScore(violations);

      // Assert
      expect(result).toBe(55); // 100 - (25 + 15 + 10 + 5) = 55
    });

    it('should not go below 0', () => {
      // Arrange
      const violations: ComplianceViolation[] = Array(10).fill(null).map((_, i) => ({
        severity: 'Critical',
        id: String(i),
        policyId: `policy-${i}`,
        violationType: '',
        status: '',
        description: '',
        detectedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Act
      const result = policyEngine.calculateComplianceScore(violations);

      // Assert
      expect(result).toBe(0); // Should be capped at 0
    });
  });

  describe('Domain-specific validation', () => {
    let mockContext: PolicyEvaluationContext;

    beforeEach(() => {
      mockContext = {
        entityId: 'lead-1',
        entityType: 'Lead',
        data: {},
        userId: 'user-1',
        jurisdiction: 'EU',
        timestamp: new Date(),
      };
    });

    describe('GDPR validation', () => {
      it('should detect missing GDPR consent', () => {
        // Arrange
        const requirement = {
          name: 'Consent Required',
          validationRule: '{}',
        };

        const data = {
          // Missing consentGiven and consentDate
        };

        // Act
        const violations = (policyEngine as any).validateGDPR(
          JSON.parse(requirement.validationRule),
          data,
          requirement
        );

        // Assert
        expect(violations).toHaveLength(1);
        expect(violations[0]).toContain('GDPR consent not obtained');
      });

      it('should detect expired GDPR data retention', () => {
        // Arrange
        const requirement = {
          name: 'Data Retention',
          validationRule: '{}',
        };

        const data = {
          retentionExpiry: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        };

        // Act
        const violations = (policyEngine as any).validateGDPR(
          JSON.parse(requirement.validationRule),
          data,
          requirement
        );

        // Assert
        expect(violations).toHaveLength(1);
        expect(violations[0]).toContain('GDPR data retention period has expired');
      });

      it('should detect unfulfilled GDPR erasure requests', () => {
        // Arrange
        const requirement = {
          name: 'Right to Erasure',
          validationRule: '{}',
        };

        const data = {
          erasureRequested: true,
          erasureCompleted: false,
        };

        // Act
        const violations = (policyEngine as any).validateGDPR(
          JSON.parse(requirement.validationRule),
          data,
          requirement
        );

        // Assert
        expect(violations).toHaveLength(1);
        expect(violations[0]).toContain('GDPR right to erasure not fulfilled');
      });
    });

    describe('HIPAA validation', () => {
      it('should detect unencrypted PHI', () => {
        // Arrange
        const requirement = {
          name: 'PHI Encryption',
          validationRule: '{}',
        };

        const data = {
          containsPHI: true,
          encrypted: false,
        };

        // Act
        const violations = (policyEngine as any).validateHIPAA(
          JSON.parse(requirement.validationRule),
          data,
          requirement
        );

        // Assert
        expect(violations).toHaveLength(1);
        expect(violations[0]).toContain('HIPAA PHI data not encrypted');
      });

      it('should detect missing access controls for PHI', () => {
        // Arrange
        const requirement = {
          name: 'Access Controls',
          validationRule: '{}',
        };

        const data = {
          containsPHI: true,
          accessControls: false,
        };

        // Act
        const violations = (policyEngine as any).validateHIPAA(
          JSON.parse(requirement.validationRule),
          data,
          requirement
        );

        // Assert
        expect(violations).toHaveLength(1);
        expect(violations[0]).toContain('HIPAA access controls not implemented');
      });
    });

    describe('CCPA validation', () => {
      it('should detect missing opt-out mechanism for California residents', () => {
        // Arrange
        const requirement = {
          name: 'Opt-Out Mechanism',
          validationRule: '{}',
        };

        const data = {
          state: 'CA',
          optOutAvailable: false,
        };

        // Act
        const violations = (policyEngine as any).validateCCPA(
          JSON.parse(requirement.validationRule),
          data,
          requirement
        );

        // Assert
        expect(violations).toHaveLength(1);
        expect(violations[0]).toContain('CCPA opt-out mechanism not provided');
      });

      it('should detect missing privacy notice for California residents', () => {
        // Arrange
        const requirement = {
          name: 'Privacy Notice',
          validationRule: '{}',
        };

        const data = {
          state: 'CA',
          privacyNoticeProvided: false,
        };

        // Act
        const violations = (policyEngine as any).validateCCPA(
          JSON.parse(requirement.validationRule),
          data,
          requirement
        );

        // Assert
        expect(violations).toHaveLength(1);
        expect(violations[0]).toContain('CCPA privacy notice not provided');
      });

      it('should not flag non-California residents for CCPA', () => {
        // Arrange
        const requirement = {
          name: 'Opt-Out Mechanism',
          validationRule: '{}',
        };

        const data = {
          state: 'NY', // Not California
          optOutAvailable: false,
        };

        // Act
        const violations = (policyEngine as any).validateCCPA(
          JSON.parse(requirement.validationRule),
          data,
          requirement
        );

        // Assert
        expect(violations).toHaveLength(0);
      });
    });

    describe('Insurance validation', () => {
      it('should detect unverified agent licenses', () => {
        // Arrange
        const requirement = {
          name: 'License Verification',
          validationRule: '{}',
        };

        const data = {
          agentId: 'agent-1',
          licenseVerified: false,
        };

        // Act
        const violations = (policyEngine as any).validateInsurance(
          JSON.parse(requirement.validationRule),
          data,
          requirement
        );

        // Assert
        expect(violations).toHaveLength(1);
        expect(violations[0]).toContain('Agent license not verified');
      });
    });
  });

  describe('Policy applicability checks', () => {
    it('should apply policy to all jurisdictions when no jurisdiction specified', () => {
      // Arrange
      const policy = {
        jurisdiction: null, // Applies to all
        domain: 'GDPR',
      };

      const context = {
        jurisdiction: 'US',
        entityType: 'Lead',
        entityId: 'lead-1',
        data: {},
        userId: 'user-1',
        timestamp: new Date(),
      };

      // Act
      const isApplicable = (policyEngine as any).isPolicyApplicable(policy, context);

      // Assert
      expect(isApplicable).toBe(true);
    });

    it('should apply policy when jurisdictions match', () => {
      // Arrange
      const policy = {
        jurisdiction: 'EU',
        domain: 'GDPR',
      };

      const context = {
        jurisdiction: 'EU',
        entityType: 'Lead',
        entityId: 'lead-1',
        data: {},
        userId: 'user-1',
        timestamp: new Date(),
      };

      // Act
      const isApplicable = (policyEngine as any).isPolicyApplicable(policy, context);

      // Assert
      expect(isApplicable).toBe(true);
    });

    it('should apply US federal policies to state contexts', () => {
      // Arrange
      const policy = {
        jurisdiction: 'US',
        domain: 'HIPAA',
      };

      const context = {
        jurisdiction: 'CA',
        entityType: 'Lead',
        entityId: 'lead-1',
        data: {},
        userId: 'user-1',
        timestamp: new Date(),
      };

      // Act
      const isApplicable = (policyEngine as any).isPolicyApplicable(policy, context);

      // Assert
      expect(isApplicable).toBe(true);
    });

    it('should apply federal policies to state contexts', () => {
      // Arrange
      const policy = {
        jurisdiction: 'Federal',
        domain: 'HIPAA',
      };

      const context = {
        jurisdiction: 'CA',
        entityType: 'Lead',
        entityId: 'lead-1',
        data: {},
        userId: 'user-1',
        timestamp: new Date(),
      };

      // Act
      const isApplicable = (policyEngine as any).isPolicyApplicable(policy, context);

      // Assert
      expect(isApplicable).toBe(true);
    });

    it('should not apply mismatched jurisdictions', () => {
      // Arrange
      const policy = {
        jurisdiction: 'EU',
        domain: 'GDPR',
      };

      const context = {
        jurisdiction: 'US',
        entityType: 'Lead',
        entityId: 'lead-1',
        data: {},
        userId: 'user-1',
        timestamp: new Date(),
      };

      // Act
      const isApplicable = (policyEngine as any).isPolicyApplicable(policy, context);

      // Assert
      expect(isApplicable).toBe(false);
    });
  });
});