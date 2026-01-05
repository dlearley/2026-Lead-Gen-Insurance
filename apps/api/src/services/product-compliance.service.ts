import { InsuranceProductRule } from '@prisma/client';
import { ComplianceResult, ProductRules, RuleEvaluationResult } from '@insurance-lead-gen/types';
import { prisma } from '../infra/prisma.js';

export class ProductComplianceService {
  /**
   * Gets rules for a product type and jurisdiction
   */
  async getProductRules(productType: string, jurisdiction: string): Promise<ProductRules> {
    const rules = await prisma.insuranceProductRule.findMany({
      where: {
        productType,
        OR: [
          { jurisdiction },
          { jurisdiction: 'Federal' }
        ],
        status: 'Active',
      },
    });

    return {
      productType,
      jurisdiction,
      rules,
    };
  }

  /**
   * Validates a quote against compliance rules
   */
  async validateQuoteCompliance(quoteData: any): Promise<ComplianceResult> {
    const { productType, state } = quoteData;
    const rules = await prisma.insuranceProductRule.findMany({
      where: {
        productType,
        OR: [
          { jurisdiction: state },
          { jurisdiction: 'Federal' }
        ],
        status: 'Active',
      },
    });

    const violations: any[] = [];
    const appliedRules: string[] = [];
    const warnings: string[] = [];

    for (const rule of rules) {
      appliedRules.push(rule.id);
      const result = await this.evaluateRule(quoteData, rule);
      if (!result.passed) {
        violations.push({
          ruleId: rule.id,
          description: result.message || rule.ruleDescription,
          severity: rule.severity as any,
        });
      }
    }

    return {
      compliant: violations.length === 0,
      violations,
      warnings,
      appliedRules,
      requiresManualReview: violations.some(v => v.severity === 'Critical' || v.severity === 'High'),
    };
  }

  /**
   * Evaluates a single rule
   */
  async evaluateRule(quoteData: any, rule: InsuranceProductRule): Promise<RuleEvaluationResult> {
    // Basic evaluation logic based on ruleCondition (JSON string)
    try {
      const condition = JSON.parse(rule.ruleCondition);
      
      // Example condition: { "field": "premium", "operator": "min", "value": 100 }
      if (condition.field && condition.operator && condition.value !== undefined) {
        const val = quoteData[condition.field];
        if (val === undefined) return { ruleId: rule.id, passed: true }; // Skip if field missing

        switch (condition.operator) {
          case 'min':
            return { ruleId: rule.id, passed: val >= condition.value, message: `Value ${val} is below minimum ${condition.value}` };
          case 'max':
            return { ruleId: rule.id, passed: val <= condition.value, message: `Value ${val} is above maximum ${condition.value}` };
          case 'equals':
            return { ruleId: rule.id, passed: val === condition.value };
          case 'contains':
            return { ruleId: rule.id, passed: Array.isArray(val) && val.includes(condition.value) };
        }
      }
    } catch (e) {
      console.error(`Error evaluating rule ${rule.id}:`, e);
    }

    return { ruleId: rule.id, passed: true };
  }

  /**
   * Lists all product rules
   */
  async listProductRules(productType?: string, jurisdiction?: string): Promise<InsuranceProductRule[]> {
    const where: any = {};
    if (productType) where.productType = productType;
    if (jurisdiction) where.jurisdiction = jurisdiction;
    
    return prisma.insuranceProductRule.findMany({ where });
  }

  /**
   * Creates a new product rule
   */
  async createProductRule(ruleData: any): Promise<InsuranceProductRule> {
    return prisma.insuranceProductRule.create({
      data: {
        productType: ruleData.productType,
        jurisdiction: ruleData.jurisdiction,
        ruleType: ruleData.ruleType,
        ruleDescription: ruleData.ruleDescription,
        ruleCondition: typeof ruleData.ruleCondition === 'string' ? ruleData.ruleCondition : JSON.stringify(ruleData.ruleCondition),
        severity: ruleData.severity,
        effectiveDate: ruleData.effectiveDate || new Date(),
        status: 'Active',
      },
    });
  }

  /**
   * Updates a product rule
   */
  async updateProductRule(ruleId: string, updates: any): Promise<InsuranceProductRule> {
    if (updates.ruleCondition && typeof updates.ruleCondition !== 'string') {
      updates.ruleCondition = JSON.stringify(updates.ruleCondition);
    }
    return prisma.insuranceProductRule.update({
      where: { id: ruleId },
      data: updates,
    });
  }

  /**
   * Archives a product rule
   */
  async archiveProductRule(ruleId: string): Promise<void> {
    await prisma.insuranceProductRule.update({
      where: { id: ruleId },
      data: { status: 'Archived', expiryDate: new Date() },
    });
  }
}
