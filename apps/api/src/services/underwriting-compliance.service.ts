import { UnderwritingRule } from '@prisma/client';
import { UnderwritingDecision, ReasoningValidation } from '@insurance-lead-gen/types';
import { prisma } from '../infra/prisma.js';

export class UnderwritingComplianceService {
  /**
   * Gets underwriting rules for a product and state
   */
  async getUnderwritingRules(productType: string, state: string): Promise<UnderwritingRule[]> {
    return prisma.underwritingRule.findMany({
      where: {
        productType,
        state,
        status: 'Active',
      },
    });
  }

  /**
   * Evaluates an application against underwriting rules
   */
  async evaluateApplication(appData: any): Promise<UnderwritingDecision> {
    const rules = await this.getUnderwritingRules(appData.productType, appData.state);
    let decision: UnderwritingDecision = {
      action: 'Approve',
      reasoning: 'Met all standard underwriting criteria',
      appliedRules: [],
    };

    for (const rule of rules) {
      decision.appliedRules.push(rule.id);
      
      // Evaluation logic based on ruleExpression
      const passed = this.evaluateExpression(appData, rule.ruleExpression);
      
      if (!passed) {
        if (rule.action === 'Decline') {
          return {
            action: 'Decline',
            reasoning: rule.reasoning,
            appliedRules: decision.appliedRules,
          };
        } else if (rule.action === 'ManualReview') {
          decision = {
            action: 'ManualReview',
            reasoning: rule.reasoning,
            appliedRules: decision.appliedRules,
          };
        }
      }
    }

    return decision;
  }

  /**
   * Evaluates a rule expression
   */
  private evaluateExpression(appData: any, expression: string): boolean {
    try {
      const condition = JSON.parse(expression);
      const val = appData[condition.field];
      if (val === undefined) return true;

      switch (condition.operator) {
        case 'gt': return val > condition.value;
        case 'lt': return val < condition.value;
        case 'gte': return val >= condition.value;
        case 'lte': return val <= condition.value;
        case 'eq': return val === condition.value;
        case 'neq': return val !== condition.value;
        case 'in': return Array.isArray(condition.value) && condition.value.includes(val);
      }
    } catch (e) {
      console.error("Error evaluating underwriting expression", e);
    }
    return true;
  }

  /**
   * Validates underwriting reasoning
   */
  async validateUnderwritingReasoning(decision: UnderwritingDecision): Promise<ReasoningValidation> {
    const issues: string[] = [];
    if (!decision.reasoning || decision.reasoning.length < 20) {
      issues.push("Reasoning is too brief for compliance audit");
    }
    if (decision.action === 'Decline' && decision.appliedRules.length === 0) {
      issues.push("Declination must be mapped to at least one underwriting rule");
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Handles an appeal of an underwriting decision
   */
  async appealUnderwritingDecision(appealData: any): Promise<any> {
    // Stub for appeal process
    return {
      appealId: `AP-${Date.now()}`,
      status: 'Received',
      receivedAt: new Date(),
    };
  }

  /**
   * Generates an audit trail for an underwriting decision
   */
  async generateUnderwritingAuditTrail(applicationId: string): Promise<any[]> {
    // In a real system, this would pull from an Event log or specialized audit table
    return [
      { timestamp: new Date(), action: 'ApplicationReceived', details: { applicationId } },
      { timestamp: new Date(), action: 'RulesEvaluated', details: { ruleCount: 5 } },
      { timestamp: new Date(), action: 'DecisionRendered', details: { action: 'Approve' } },
    ];
  }
}
