import type {
  ComplianceCheckResult,
  ComplianceViolation,
  ComplianceWarning,
  InsuranceType,
  RunComplianceCheckRequest,
  RunComplianceCheckResponse,
} from '@insurance-lead-gen/types';
import { randomUUID } from 'crypto';

const REQUIRED_FIELDS: Record<InsuranceType, string[]> = {
  auto: ['driverAge', 'vehicleYear', 'state'],
  home: ['propertyAddress', 'yearBuilt', 'state'],
  life: ['age', 'coverageAmount'],
  health: ['age', 'state', 'householdSize'],
  commercial: ['businessName', 'industry', 'state'],
};

function computeRiskLevel(
  violations: ComplianceViolation[]
): ComplianceCheckResult['riskLevel'] {
  const severityRank: Record<ComplianceViolation['severity'], number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  const max = violations.reduce((acc, v) => Math.max(acc, severityRank[v.severity]), 0);
  if (max >= 4) return 'critical';
  if (max >= 3) return 'high';
  if (max >= 2) return 'medium';
  return 'low';
}

export class AIComplianceService {
  runComplianceCheck(request: RunComplianceCheckRequest): RunComplianceCheckResponse {
    const violations: ComplianceViolation[] = [];
    const warnings: ComplianceWarning[] = [];

    const required = REQUIRED_FIELDS[request.insuranceType] || [];
    for (const field of required) {
      if (request.data[field] === undefined || request.data[field] === null || request.data[field] === '') {
        violations.push({
          regulation: 'data_completeness',
          section: `${request.insuranceType}.required_fields`,
          description: `Missing required field: ${field}`,
          severity: 'high',
          remediation: `Provide a valid value for ${field}.`,
        });
      }
    }

    // Basic PII hints
    const piiKeys = ['ssn', 'socialSecurityNumber', 'passportNumber'];
    for (const key of piiKeys) {
      if (key in request.data) {
        warnings.push({
          area: 'pii_handling',
          message: `Potential sensitive field detected: ${key}`,
          suggestion: 'Ensure PII is collected only when required and stored/transmitted securely.',
        });
      }
    }

    if (!request.jurisdiction || request.jurisdiction.trim().length < 2) {
      warnings.push({
        area: 'jurisdiction',
        message: 'Jurisdiction is missing or too short.',
        suggestion: 'Provide a valid jurisdiction (e.g., US state code) to enable more precise checks.',
      });
    }

    const riskLevel = computeRiskLevel(violations);
    const isCompliant = violations.length === 0;

    const result: ComplianceCheckResult = {
      checkId: `comp_${randomUUID()}`,
      insuranceType: request.insuranceType,
      regulationType: 'field_completeness',
      isCompliant,
      violations,
      warnings,
      recommendations: isCompliant
        ? ['No blocking issues detected. Continue current compliance practices.']
        : ['Address all missing required fields before proceeding.', 'Review data minimization and PII handling policies.'],
      riskLevel,
      checkedAt: new Date(),
    };

    return { success: true, result };
  }
}
