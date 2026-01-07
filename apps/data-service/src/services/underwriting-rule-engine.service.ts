import { PrismaClient } from '@prisma/client';
import { logger } from '@insurance/core';

interface RuleEvaluationContext {
  dmv?: any;
  clue?: any;
  credit?: any;
  background?: any;
  riskAssessment?: any;
}

interface RuleEvaluationResult {
  decision: 'approve' | 'decline' | 'manual_review' | 'rate_adjustment';
  actionTaken: string;
  conditionsMet: boolean;
  adjustments?: Array<{
    type: 'premium' | 'deductible' | 'coverage';
    value: number;
    reason: string;
  }>;
  reasons: string[];
  manualReviewReasons?: string[];
  evaluatedAt: Date;
}

interface RuleCondition {
  field: string;
  operator: '>' | '>=' | '<' | '<=' | '=' | '!=' | 'in' | 'not_in';
  value: any;
}

export class UnderwritingRuleEngine {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async evaluatePolicy(policyId: string, context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    logger.info('Starting underwriting evaluation', { policyId });

    // Get active rules sorted by priority
    const rules = await this.prisma.underwritingRule.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' }
    });

    const results: RuleEvaluationResult[] = [];

    for (const rule of rules) {
      try {
        const ruleResult = await this.evaluateRule(rule, context, policyId);
        results.push(ruleResult);

        // Log rule evaluation
        await this.logRuleEvaluation(policyId, rule.id, ruleResult.conditionsMet, ruleResult.actionTaken);

        // If rule triggers a decline, stop evaluation
        if (ruleResult.decision === 'decline') {
          logger.info('Rule triggered decline, stopping evaluation', { 
            policyId, 
            ruleId: rule.id 
          });
          break;
        }

      } catch (error) {
        logger.error('Rule evaluation failed', { 
          policyId, 
          ruleId: rule.id, 
          error 
        });
      }
    }

    // Combine all rule results into final decision
    const finalResult = this.aggregateResults(results);
    
    logger.info('Underwriting evaluation completed', { 
      policyId, 
      decision: finalResult.decision,
      adjustments: finalResult.adjustments?.length || 0
    });

    return finalResult;
  }

  async createRule(ruleData: {
    ruleName: string;
    ruleDescription?: string;
    ruleType: string;
    conditions: any;
    actionType: string;
    actionParameters?: any;
    priority?: number;
  }): Promise<any> {
    return await this.prisma.underwritingRule.create({
      data: {
        ruleName: ruleData.ruleName,
        ruleDescription: ruleData.ruleDescription,
        ruleType: ruleData.ruleType,
        conditions: ruleData.conditions,
        actionType: ruleData.actionType,
        actionParameters: ruleData.actionParameters,
        priority: ruleData.priority || 100,
        isActive: true
      }
    });
  }

  async updateRule(ruleId: string, updates: Partial<{
    ruleName: string;
    ruleDescription: string;
    conditions: any;
    actionParameters: any;
    priority: number;
    isActive: boolean;
  }>): Promise<any> {
    return await this.prisma.underwritingRule.update({
      where: { id: ruleId },
      data: updates
    });
  }

  async listRules(filters?: {
    ruleType?: string;
    isActive?: boolean;
  }): Promise<any[]> {
    return await this.prisma.underwritingRule.findMany({
      where: {
        ruleType: filters?.ruleType,
        isActive: filters?.isActive
      },
      orderBy: { priority: 'asc' }
    });
  }

  async generateRuleImpactReport(startDate: Date, endDate: Date): Promise<any> {
    const evaluations = await this.prisma.ruleEvaluationResult.findMany({
      where: {
        evaluationTimestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        rule: true
      }
    });

    const ruleStats = {};
    evaluations.forEach(evaluation => {
      const ruleId = evaluation.ruleId;
      if (!ruleStats[ruleId]) {
        ruleStats[ruleId] = {
          ruleName: evaluation.rule.ruleName,
          triggeredCount: 0,
          totalEvaluations: 0,
          actions: {}
        };
      }

      ruleStats[ruleId].totalEvaluations++;
      if (evaluation.conditionMet) {
        ruleStats[ruleId].triggeredCount++;
        const action = evaluation.actionTaken || 'none';
        ruleStats[ruleId].actions[action] = (ruleStats[ruleId].actions[action] || 0) + 1;
      }
    });

    // Calculate aggregate statistics
    const totalPolicies = await this.prisma.ruleEvaluationResult.groupBy({
      by: ['policyId'],
      where: {
        evaluationTimestamp: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const autoApproved = evaluations.filter(e => 
      e.actionTaken === 'auto_approve' && e.conditionMet
    ).length;

    const manualReviews = evaluations.filter(e => 
      e.actionTaken === 'manual_review' && e.conditionMet
    ).length;

    const declines = evaluations.filter(e => 
      e.actionTaken === 'decline' && e.conditionMet
    ).length;

    return {
      period: { startDate, endDate },
      totalPoliciesEvaluated: totalPolicies.length,
      autoApproved,
      manualReviews,
      declines,
      autoApprovalRate: totalPolicies.length > 0 ? (autoApproved / totalPolicies.length) * 100 : 0,
      manualReviewRate: totalPolicies.length > 0 ? (manualReviews / totalPolicies.length) * 100 : 0,
      declineRate: totalPolicies.length > 0 ? (declines / totalPolicies.length) * 100 : 0,
      ruleStatistics: ruleStats
    };
  }

  private async evaluateRule(rule: any, context: RuleEvaluationContext, policyId: string): Promise<RuleEvaluationResult> {
    // Parse rule conditions (stored as JSON in database)
    const conditions = rule.conditions || {};
    const conditionResults = [];
    const manualReviewReasons: string[] = [];

    // Extract data sources from conditions
    const requiredDataSources = this.extractRequiredDataSources(conditions);
    
    // Check if we have all required data sources
    const missingDataSources = requiredDataSources.filter(source => !context[source]);
    if (missingDataSources.length > 0) {
      // If missing critical data, require manual review
      return {
        decision: 'manual_review',
        actionTaken: 'manual_review',
        conditionsMet: false,
        manualReviewReasons: [`Missing required data: ${missingDataSources.join(', ')}`],
        reasons: [],
        evaluatedAt: new Date()
      };
    }

    // Evaluate each condition
    for (const [conditionKey, conditionValue] of Object.entries(conditions)) {
      // Parse nested field access (e.g., "dmv.violation_count")
      const [dataSource, fieldPath] = conditionKey.split('.');
      const contextData = context[dataSource as keyof RuleEvaluationContext];
      
      if (!contextData) {
        conditionResults.push(false);
        manualReviewReasons.push(`Missing data source: ${dataSource}`);
        continue;
      }

      // Navigate nested field path
      const actualValue = this.getNestedValue(contextData, fieldPath);
      
      if (actualValue === undefined || actualValue === null) {
        conditionResults.push(false);
        manualReviewReasons.push(`Missing field: ${fieldPath}`);
        continue;
      }

      // Evaluate condition
      const conditionMet = this.evaluateCondition(actualValue, conditionValue);
      conditionResults.push(conditionMet);

      if (!conditionMet) {
        // Condition not met, rule doesn't apply
        return {
          decision: 'approve', // No action if conditions not met
          actionTaken: 'no_action',
          conditionsMet: false,
          reasons: [`Condition not met: ${conditionKey} ${JSON.stringify(conditionValue)}`],
          evaluatedAt: new Date()
        };
      }
    }

    // All conditions met, apply rule action
    return this.executeRuleAction(rule, context, policyId);
  }

  private executeRuleAction(rule: any, context: RuleEvaluationContext, policyId: string): RuleEvaluationResult {
    const actionType = rule.actionType;
    const actionParams = rule.actionParameters || {};
    const baseResult = {
      conditionsMet: true,
      evaluatedAt: new Date()
    };

    switch (actionType) {
      case 'auto_approve':
        return {
          ...baseResult,
          decision: 'approve',
          actionTaken: 'auto_approve',
          reasons: [actionParams.reason || 'Policy meets all underwriting criteria']
        };

      case 'manual_review':
        return {
          ...baseResult,
          decision: 'manual_review',
          actionTaken: 'manual_review',
          manualReviewReasons: [
            actionParams.reason || 'Policy requires manual underwriting review',
            ...(actionParams.required_documents ? [`Required documents: ${actionParams.required_documents.join(', ')}`] : [])
          ],
          reasons: [actionParams.reason || 'Manual review required']
        };

      case 'decline':
        return {
          ...baseResult,
          decision: 'decline',
          actionTaken: 'decline',
          reasons: [actionParams.reason || 'Policy does not meet underwriting guidelines']
        };

      case 'rate_adjustment':
        return {
          ...baseResult,
          decision: 'rate_adjustment',
          actionTaken: 'rate_adjustment',
          adjustments: [
            {
              type: actionParams.adjustment_type || 'premium',
              value: actionParams.adjustment_percentage || 0,
              reason: actionParams.reason || 'Rate adjustment based on risk factors'
            }
          ],
          reasons: [actionParams.reason || `Rate adjusted by ${actionParams.adjustment_percentage}%`]
        };

      default:
        return {
          ...baseResult,
          decision: 'approve',
          actionTaken: 'no_action',
          reasons: ['No matching action type found']
        };
    }
  }

  private evaluateCondition(actualValue: any, expectedCondition: any): boolean {
    if (typeof expectedCondition === 'object') {
      // Complex condition with operator
      for (const [operator, expectedValue] of Object.entries(expectedCondition)) {
        switch (operator) {
          case '>':
            return Number(actualValue) > Number(expectedValue);
          case '>=':
            return Number(actualValue) >= Number(expectedValue);
          case '<':
            return Number(actualValue) < Number(expectedValue);
          case '<=':
            return Number(actualValue) <= Number(expectedValue);
          case '=':
          case '==':
            return actualValue == expectedValue;
          case '!=':
            return actualValue != expectedValue;
          case 'in':
            return Array.isArray(expectedValue) && expectedValue.includes(actualValue);
          case 'not_in':
            return Array.isArray(expectedValue) && !expectedValue.includes(actualValue);
          default:
            return false;
        }
      }
    }
    
    // Simple equality check
    return actualValue === expectedCondition;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private extractRequiredDataSources(conditions: any): string[] {
    const dataSources = new Set<string>();
    
    Object.keys(conditions).forEach(conditionKey => {
      const [dataSource] = conditionKey.split('.');
      dataSources.add(dataSource);
    });

    return Array.from(dataSources);
  }

  private aggregateResults(results: RuleEvaluationResult[]): RuleEvaluationResult {
    if (results.length === 0) {
      return {
        decision: 'approve',
        actionTaken: 'auto_approve',
        conditionsMet: true,
        reasons: ['No rules matched - auto-approved'],
        evaluatedAt: new Date()
      };
    }

    // Find the highest priority decision (decline > manual_review > rate_adjustment > approve)
    const priorityMap = {
      'decline': 4,
      'manual_review': 3,
      'rate_adjustment': 2,
      'approve': 1
    };

    let finalDecision: any = 'approve';
    const allAdjustments: any[] = [];
    const allReasons: string[] = [];
    const allManualReviewReasons: string[] = [];
    let actionTaken = 'auto_approve';

    for (const result of results) {
      const resultPriority = priorityMap[result.decision] || 0;
      const currentPriority = priorityMap[finalDecision] || 0;

      // Choose higher priority decision
      if (resultPriority > currentPriority) {
        finalDecision = result.decision;
        actionTaken = result.actionTaken;
      }

      // Collect all adjustments
      if (result.adjustments) {
        allAdjustments.push(...result.adjustments);
      }

      // Collect all reasons
      if (result.reasons) {
        allReasons.push(...result.reasons);
      }

      // Collect manual review reasons
      if (result.manualReviewReasons) {
        allManualReviewReasons.push(...result.manualReviewReasons);
      }
    }

    return {
      decision: finalDecision,
      actionTaken,
      conditionsMet: true,
      adjustments: allAdjustments.length > 0 ? allAdjustments : undefined,
      reasons: allReasons,
      manualReviewReasons: allManualReviewReasons.length > 0 ? allManualReviewReasons : undefined,
      evaluatedAt: results[0]?.evaluatedAt || new Date()
    };
  }

  private async logRuleEvaluation(
    policyId: string, 
    ruleId: string, 
    conditionMet: boolean, 
    actionTaken: string
  ): Promise<void> {
    await this.prisma.ruleEvaluationResult.create({
      data: {
        policyId,
        ruleId,
        conditionMet,
        actionTaken,
        evaluatedBySystem: true,
        evaluatedData: {} // Could store actual data used for evaluation
      }
    });
  }
}

// Predefined underwriting rules
export const DEFAULT_UNDERWRITING_RULES = [
  {
    ruleName: "Violent Crime Decline",
    ruleDescription: "Automatically decline applicants with violent criminal history",
    ruleType: "decline",
    conditions: {
      "background.criminal_record": true,
      "background.violent_crime": true
    },
    actionType: "decline",
    actionParameters: {
      reason: "Applicant has violent criminal history",
      category: "high_risk"
    },
    priority: 1
  },
  {
    ruleName: "DUI High Risk Review",
    ruleDescription: "Require manual review for applicants with DUI incidents",
    ruleType: "manual_review",
    conditions: {
      "dmv.dui_count": { ">": 0 }
    },
    actionType: "manual_review",
    actionParameters: {
      reason: "DUI incidents detected",
      required_documents: ["driving_record", "rehabilitation_certificate"]
    },
    priority: 10
  },
  {
    ruleName: "Poor Credit Manual Review",
    ruleDescription: "Manual review for applicants with poor credit scores",
    ruleType: "manual_review",
    conditions: {
      "credit.credit_score": { "<": 600 }
    },
    actionType: "manual_review",
    actionParameters: {
      reason: "Credit score below threshold",
      required_documents: ["proof_of_income", "explanation_letter"]
    },
    priority: 20
  },
  {
    ruleName: "Frequent Claims Review",
    ruleDescription: "Manual review for applicants with frequent insurance claims",
    ruleType: "manual_review",
    conditions: {
      "clue.total_claims_5yr": { ">=": 3 }
    },
    actionType: "manual_review",
    actionParameters: {
      reason: "Frequent claims history detected",
      review_focus: "claims_pattern_analysis"
    },
    priority: 30
  },
  {
    ruleName: "Excellent Driver Discount",
    ruleDescription: "Premium discount for excellent driving record",
    ruleType: "rate_adjustment",
    conditions: {
      "dmv.violation_count": 0,
      "dmv.dui_count": 0,
      "dmv.traffic_points": 0,
      "credit.credit_score": { ">=": 750 }
    },
    actionType: "rate_adjustment",
    actionParameters: {
      adjustment_type: "premium",
      adjustment_percentage: -15,
      reason: "Excellent driving and credit record"
    },
    priority: 50
  },
  {
    ruleName: "Minor Violation Adjustment",
    ruleDescription: "Rate adjustment for minor driving violations",
    ruleType: "rate_adjustment",
    conditions: {
      "dmv.violation_count": { "<=": 2, ">": 0 },
      "dmv.dui_count": 0
    },
    actionType: "rate_adjustment",
    actionParameters: {
      adjustment_type: "premium",
      adjustment_percentage: 10,
      reason: "Minor moving violations"
    },
    priority: 60
  },
  {
    ruleName: "Fraud History Decline",
    ruleDescription: "Decline applicants with insurance fraud history",
    ruleType: "decline",
    conditions: {
      "background.fraud_count": { ">": 0 }
    },
    actionType: "decline",
    actionParameters: {
      reason: "Insurance fraud history detected",
      category: "fraud"
    },
    priority: 5
  },
  {
    ruleName: "Bankruptcy Credit Review",
    ruleDescription: "Manual review for recent bankruptcy",
    ruleType: "manual_review",
    conditions: {
      "credit.bankruptcy_history": true
    },
    actionType: "manual_review",
    actionParameters: {
      reason: "Bankruptcy history detected",
      review_focus: "financial_stability_assessment",
      required_documents: ["discharge_papers", "current_income_verification"]
    },
    priority: 15
  }
];