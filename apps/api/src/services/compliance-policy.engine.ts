import {
  CompliancePolicy,
  PolicyEvaluationContext,
  PolicyEvaluationResult,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ComplianceViolation,
  ICompliancePolicyEngine,
} from '@types/compliance';
import { logger } from '@insurance-lead-gen/core';

export class CompliancePolicyEngine implements ICompliancePolicyEngine {
  
  /**
   * Validate data against validation rules
   */
  async validateData(data: any, validationRules: string): Promise<ValidationResult> {
    try {
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];

      // Parse validation rules (assuming JSON schema format)
      let rules: any;
      try {
        rules = JSON.parse(validationRules);
      } catch {
        // If not valid JSON, treat as simple validation function reference
        rules = { type: 'custom', rule: validationRules };
      }

      // Apply validation rules based on type
      if (rules.type === 'schema') {
        const schemaValidation = await this.validateAgainstSchema(data, rules.schema);
        errors.push(...schemaValidation.errors);
        warnings.push(...schemaValidation.warnings);
      } else if (rules.type === 'function') {
        const customValidation = await this.validateWithCustomFunction(data, rules.function);
        errors.push(...customValidation.errors);
        warnings.push(...customValidation.warnings);
      } else {
        // Basic validation rules
        const basicValidation = this.validateBasicRules(data, rules);
        errors.push(...basicValidation.errors);
        warnings.push(...basicValidation.warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      logger.error('Error validating data', { error, data, validationRules });
      throw new Error(`Data validation failed: ${error.message}`);
    }
  }

  /**
   * Evaluate policies against evaluation context
   */
  async evaluatePolicies(policies: CompliancePolicy[], context: PolicyEvaluationContext): Promise<PolicyEvaluationResult[]> {
    try {
      const results: PolicyEvaluationResult[] = [];

      for (const policy of policies) {
        const result = await this.evaluateSinglePolicy(policy, context);
        results.push(result);
      }

      return results;
    } catch (error) {
      logger.error('Error evaluating policies', { error, policyCount: policies.length, context });
      throw new Error(`Policy evaluation failed: ${error.message}`);
    }
  }

  /**
   * Apply policy overrides based on context
   */
  async applyOverrides(policyId: string, context: PolicyEvaluationContext): Promise<boolean> {
    try {
      // Implementation for policy overrides
      // This would check if there are override rules that exempt certain entities
      // from specific policy requirements based on context
      
      // For now, return false (no overrides)
      return false;
    } catch (error) {
      logger.error('Error applying policy overrides', { error, policyId, context });
      return false;
    }
  }

  /**
   * Calculate compliance score from violations
   */
  calculateComplianceScore(violations: ComplianceViolation[]): number {
    if (violations.length === 0) return 100;

    const totalPenalty = violations.reduce((penalty, violation) => {
      switch (violation.severity) {
        case 'Critical':
          return penalty + 25;
        case 'High':
          return penalty + 15;
        case 'Medium':
          return penalty + 10;
        case 'Low':
          return penalty + 5;
        default:
          return penalty;
      }
    }, 0);

    return Math.max(0, 100 - totalPenalty);
  }

  /**
   * Evaluate a single policy against context
   */
  private async evaluateSinglePolicy(policy: CompliancePolicy, context: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
    const violations: string[] = [];
    const warnings: string[] = [];
    let isCompliant = true;

    try {
      // Check if policy is jurisdictionally applicable
      if (!this.isPolicyApplicable(policy, context)) {
        warnings.push(`Policy not applicable for jurisdiction: ${context.jurisdiction}`);
        return {
          policyId: policy.id,
          policyName: policy.name,
          isCompliant: true, // Not applicable means compliant
          violations: [],
          warnings,
          score: 100,
        };
      }

      // Evaluate each requirement
      for (const requirement of policy.requirements) {
        const requirementResult = await this.evaluateRequirement(requirement, context, policy);
        
        if (!requirementResult.isCompliant) {
          violations.push(...requirementResult.violations);
          isCompliant = false;
        }

        warnings.push(...requirementResult.warnings);
      }

      // Check for overrides
      const hasOverrides = await this.applyOverrides(policy.id, context);
      if (hasOverrides) {
        isCompliant = true;
        violations.length = 0; // Clear violations if overrides apply
      }

      const score = isCompliant ? 100 : Math.max(0, 100 - (violations.length * 10));

      return {
        policyId: policy.id,
        policyName: policy.name,
        isCompliant,
        violations,
        warnings,
        score,
      };
    } catch (error) {
      logger.error('Error evaluating single policy', { error, policyId: policy.id, context });
      throw error;
    }
  }

  /**
   * Evaluate a specific requirement
   */
  private async evaluateRequirement(
    requirement: any, 
    context: PolicyEvaluationContext, 
    policy: CompliancePolicy
  ): Promise<{ isCompliant: boolean; violations: string[]; warnings: string[] }> {
    try {
      const violations: string[] = [];
      const warnings: string[] = [];
      let isCompliant = true;

      // Parse validation rule
      let validationRule: any;
      try {
        validationRule = JSON.parse(requirement.validationRule);
      } catch {
        validationRule = { type: 'basic', field: requirement.name };
      }

      // Apply domain-specific validation
      const domainResult = await this.applyDomainSpecificValidation(
        policy.domain,
        validationRule,
        context.data,
        requirement
      );

      violations.push(...domainResult.violations);
      warnings.push(...domainResult.warnings);

      if (domainResult.violations.length > 0) {
        isCompliant = false;
      }

      // Check enforcement level
      if (requirement.enforcementLevel === 'Recommended' && violations.length > 0) {
        warnings.push(...violations);
        violations.length = 0; // Clear violations for recommendations
        isCompliant = true;
      }

      return { isCompliant, violations, warnings };
    } catch (error) {
      logger.error('Error evaluating requirement', { error, requirement, context });
      throw error;
    }
  }

  /**
   * Apply domain-specific validation logic
   */
  private async applyDomainSpecificValidation(
    domain: string,
    validationRule: any,
    data: any,
    requirement: any
  ): Promise<{ violations: string[]; warnings: string[] }> {
    const violations: string[] = [];
    const warnings: string[] = [];

    switch (domain) {
      case 'GDPR':
        violations.push(...this.validateGDPR(validationRule, data, requirement));
        break;
      case 'HIPAA':
        violations.push(...this.validateHIPAA(validationRule, data, requirement));
        break;
      case 'CCPA':
        violations.push(...this.validateCCPA(validationRule, data, requirement));
        break;
      case 'GLBA':
        violations.push(...this.validateGLBA(validationRule, data, requirement));
        break;
      case 'Insurance':
        violations.push(...this.validateInsurance(validationRule, data, requirement));
        break;
      default:
        violations.push(...this.validateGeneric(validationRule, data, requirement));
    }

    return { violations, warnings };
  }

  /**
   * GDPR-specific validation
   */
  private validateGDPR(validationRule: any, data: any, requirement: any): string[] {
    const violations: string[] = [];

    switch (requirement.name) {
      case 'Consent Required':
        if (!data.consentGiven && !data.consentDate) {
          violations.push('GDPR consent not obtained for data processing');
        }
        break;
      case 'Data Retention':
        if (data.retentionExpiry && new Date(data.retentionExpiry) < new Date()) {
          violations.push('GDPR data retention period has expired');
        }
        break;
      case 'Right to Erasure':
        if (data.erasureRequested && !data.erasureCompleted) {
          violations.push('GDPR right to erasure not fulfilled within required timeframe');
        }
        break;
      case 'Data Minimization':
        if (this.hasExcessiveData(data)) {
          violations.push('GDPR data minimization principle violated');
        }
        break;
    }

    return violations;
  }

  /**
   * HIPAA-specific validation
   */
  private validateHIPAA(validationRule: any, data: any, requirement: any): string[] {
    const violations: string[] = [];

    switch (requirement.name) {
      case 'PHI Encryption':
        if (data.containsPHI && !data.encrypted) {
          violations.push('HIPAA PHI data not encrypted');
        }
        break;
      case 'Access Controls':
        if (data.containsPHI && !data.accessControls) {
          violations.push('HIPAA access controls not implemented for PHI');
        }
        break;
      case 'Audit Trail':
        if (data.containsPHI && !data.auditTrail) {
          violations.push('HIPAA audit trail not maintained for PHI access');
        }
        break;
    }

    return violations;
  }

  /**
   * CCPA-specific validation
   */
  private validateCCPA(validationRule: any, data: any, requirement: any): string[] {
    const violations: string[] = [];

    switch (requirement.name) {
      case 'Opt-Out Mechanism':
        if (data.californiaResident && !data.optOutAvailable) {
          violations.push('CCPA opt-out mechanism not provided for California residents');
        }
        break;
      case 'Privacy Notice':
        if (data.californiaResident && !data.privacyNoticeProvided) {
          violations.push('CCPA privacy notice not provided at collection');
        }
        break;
    }

    return violations;
  }

  /**
   * GLBA-specific validation
   */
  private validateGLBA(validationRule: any, data: any, requirement: any): string[] {
    const violations: string[] = [];

    switch (requirement.name) {
      case 'Financial Privacy Notice':
        if (data.financialData && !data.privacyNoticeProvided) {
          violations.push('GLBA financial privacy notice not provided');
        }
        break;
      case 'Safeguards Rule':
        if (data.financialData && !data.safeguardsImplemented) {
          violations.push('GLBA safeguards not implemented for financial data');
        }
        break;
    }

    return violations;
  }

  /**
   * Insurance-specific validation
   */
  private validateInsurance(validationRule: any, data: any, requirement: any): string[] {
    const violations: string[] = [];

    switch (requirement.name) {
      case 'License Verification':
        if (data.agentId && !data.licenseVerified) {
          violations.push('Agent license not verified');
        }
        break;
      case 'State Registration':
        if (data.agentId && data.state && !data.stateRegistered) {
          violations.push(`Agent not registered in state: ${data.state}`);
        }
        break;
      case 'E&O Insurance':
        if (data.agentId && !data.eAndOInsurance) {
          violations.push('Agent errors and omissions insurance not verified');
        }
        break;
    }

    return violations;
  }

  /**
   * Generic validation for other domains
   */
  private validateGeneric(validationRule: any, data: any, requirement: any): string[] {
    const violations: string[] = [];

    // Basic field validation
    if (validationRule.required && !data[validationRule.field]) {
      violations.push(`Required field '${validationRule.field}' is missing`);
    }

    // Data type validation
    if (validationRule.type && typeof data[validationRule.field] !== validationRule.type) {
      violations.push(`Field '${validationRule.field}' must be of type ${validationRule.type}`);
    }

    return violations;
  }

  /**
   * Check if policy is applicable to the jurisdiction
   */
  private isPolicyApplicable(policy: CompliancePolicy, context: PolicyEvaluationContext): boolean {
    if (!policy.jurisdiction) {
      return true; // Policy applies to all jurisdictions
    }

    if (!context.jurisdiction) {
      return true; // Default to applicable if no jurisdiction specified
    }

    // Exact match
    if (policy.jurisdiction === context.jurisdiction) {
      return true;
    }

    // State vs Federal logic for US
    if (policy.jurisdiction === 'US' && context.jurisdiction.match(/^[A-Z]{2}$/)) {
      return true; // State policies apply to federal level in some cases
    }

    // Federal overrides state
    if (policy.jurisdiction === 'Federal' && context.jurisdiction !== 'Federal') {
      return true;
    }

    return false;
  }

  /**
   * Validate against JSON schema
   */
  private async validateAgainstSchema(data: any, schema: any): Promise<ValidationResult> {
    // Simplified schema validation - in production, use a library like Ajv
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (schema.required) {
      schema.required.forEach((field: string) => {
        if (!data[field]) {
          errors.push({
            field,
            message: `Required field '${field}' is missing`,
            code: 'REQUIRED_FIELD_MISSING',
          });
        }
      });
    }

    if (schema.properties) {
      Object.keys(schema.properties).forEach(field => {
        const propSchema = schema.properties[field];
        if (data[field] && propSchema.type) {
          if (Array.isArray(propSchema.type)) {
            if (!propSchema.type.includes(typeof data[field])) {
              errors.push({
                field,
                message: `Field '${field}' must be one of: ${propSchema.type.join(', ')}`,
                code: 'INVALID_TYPE',
              });
            }
          } else if (typeof data[field] !== propSchema.type) {
            errors.push({
              field,
              message: `Field '${field}' must be of type ${propSchema.type}`,
              code: 'INVALID_TYPE',
            });
          }
        }
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate with custom function
   */
  private async validateWithCustomFunction(data: any, functionName: string): Promise<ValidationResult> {
    // In production, this would call a registered validation function
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Placeholder implementation
    warnings.push({
      field: 'custom',
      message: `Custom validation function '${functionName}' not implemented`,
      suggestion: 'Implement custom validation logic',
    });

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Basic rule validation
   */
  private validateBasicRules(data: any, rules: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (rules.required) {
      rules.required.forEach((field: string) => {
        if (!data[field]) {
          errors.push({
            field,
            message: `Required field '${field}' is missing`,
            code: 'REQUIRED_FIELD_MISSING',
          });
        }
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Check if data contains excessive information (GDPR data minimization)
   */
  private hasExcessiveData(data: any): boolean {
    // Count number of fields and check against reasonable limits
    const fieldCount = Object.keys(data).length;
    const maxFields = 20; // Configurable limit
    
    return fieldCount > maxFields;
  }
}