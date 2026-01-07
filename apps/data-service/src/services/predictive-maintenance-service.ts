import { PrismaClient } from '@prisma/client';
import {
  CustomerHealthScore,
  CustomerIntervention,
  CustomerHealthScoreInput,
  HealthScoreCalculationResult,
  ChurnRiskLevel,
  ScoreTrend,
  InterventionType,
  PriorityLevel,
  InterventionStatus,
  HealthScoreFilterParams,
  InterventionFilterParams,
  CreateInterventionRequest,
  UpdateInterventionRequest,
  PredictiveHealthAnalytics,
  RiskFactorAnalysis,
  HealthScoreTrend,
  AutoTriggerConfig,
  WorkflowTriggerType,
} from '@insurance/types';
import { logger } from '@insurance/core';

// ========================================
// PREDICTIVE MAINTENANCE SERVICE
// Phase 11.3: Customer Success
// ========================================

export class PredictiveMaintenanceService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  // ========================================
  // HEALTH SCORING METHODS
  // ========================================

  /**
   * Calculate customer health score based on multiple data points
   */
  async calculateHealthScore(
    customerId: string,
    inputData?: Partial<CustomerHealthScoreInput>,
    options?: {
      forceRecalculate?: boolean;
      useAiPrediction?: boolean;
      overrideManualScore?: boolean;
    }
  ): Promise<{ healthScore: CustomerHealthScore; createdNew: boolean }> {
    try {
      // Check if recent score exists (within 24 hours)
      const existingScore = await this.prisma.customerHealthScore.findFirst({
        where: {
          customerId,
          lastCalculated: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        orderBy: {
          lastCalculated: 'desc',
        },
      });

      if (existingScore && !options?.forceRecalculate) {
        logger.info(`Using existing health score for customer ${customerId}`, {
          score: existingScore.overallScore,
          risk: existingScore.churnRisk,
        });
        return { healthScore: existingScore, createdNew: false };
      }

      // Get input data if not provided
      const engagementData =
        inputData?.engagementData || (await this.getEngagementData(customerId));
      const satisfactionData =
        inputData?.satisfactionData || (await this.getSatisfactionData(customerId));
      const usageData = inputData?.usageData || (await this.getUsageData(customerId));
      const supportData = inputData?.supportData || (await this.getSupportData(customerId));
      const financialData = inputData?.financialData || (await this.getFinancialData(customerId));

      // Calculate component scores
      const componentScores = this.calculateComponentScores({
        engagementData,
        satisfactionData,
        usageData,
        supportData,
        financialData,
      });

      // Calculate overall score
      const calculationResult = this.calculateOverallScore(customerId, componentScores);

      // Create or update health score record
      let healthScore: CustomerHealthScore;
      if (existingScore && options?.overrideManualScore !== false) {
        healthScore = await this.prisma.customerHealthScore.update({
          where: { id: existingScore.id },
          data: {
            overallScore: calculationResult.overallScore,
            previousScore: existingScore.overallScore,
            scoreChange: calculationResult.overallScore - existingScore.overallScore,
            lastCalculated: new Date(),
            churnRisk: calculationResult.churnRisk,
            churnProbability: calculationResult.churnProbability,
            riskFactors: calculationResult.riskFactors,
            recommendedActions: calculationResult.recommendedActions,
            autoTriggerActions: calculationResult.autoTriggerActions,
            engagementScore: componentScores.engagement,
            satisfactionScore: componentScores.satisfaction,
            usageScore: componentScores.usage,
            supportScore: componentScores.support,
            financialScore: componentScores.financial,
            scoringCategories: this.buildScoringCategories(componentScores),
            notes: this.generateScoreNotes(calculationResult),
          },
        });
      } else {
        healthScore = await this.prisma.customerHealthScore.create({
          data: {
            customerId,
            overallScore: calculationResult.overallScore,
            calculationVersion: calculationResult.calculationVersion,
            churnRisk: calculationResult.churnRisk,
            churnProbability: calculationResult.churnProbability,
            riskFactors: calculationResult.riskFactors,
            recommendedActions: calculationResult.recommendedActions,
            autoTriggerActions: calculationResult.autoTriggerActions,
            engagementScore: componentScores.engagement,
            satisfactionScore: componentScores.satisfaction,
            usageScore: componentScores.usage,
            supportScore: componentScores.support,
            financialScore: componentScores.financial,
            scoringCategories: this.buildScoringCategories(componentScores),
            trend: this.determineTrend(existingScore?.overallScore, calculationResult.overallScore),
            notes: this.generateScoreNotes(calculationResult),
          },
        });
      }

      // Auto-trigger interventions if needed
      const autoTriggerConfig = this.getAutoTriggerConfig();
      if (autoTriggerConfig.enabled && calculationResult.churnRisk !== 'LOW') {
        logger.info('Auto-triggering interventions for high-risk customer', {
          customerId,
          risk: calculationResult.churnRisk,
        });
        await this.autoTriggerInterventions(healthScore, autoTriggerConfig, customerId);
      }

      return { healthScore, createdNew: !existingScore };
    } catch (error) {
      logger.error('Error calculating health score', { error, customerId });
      throw error;
    }
  }

  /**
   * Get engagement data for a customer
   */
  private async getEngagementData(customerId: string): Promise<any> {
    // This would integrate with customer portal, email tracking, etc.
    return {
      lastLoginDaysAgo: 5,
      emailOpenRate: 45,
      emailClickRate: 12,
      portalVisits30d: 8,
      documentViews30d: 15,
      messagesExchanged30d: 3,
      averageSessionDuration: 320,
      preferredCommunicationChannel: 'EMAIL',
    };
  }

  /**
   * Get satisfaction data for a customer
   */
  private async getSatisfactionData(customerId: string): Promise<any> {
    return {
      lastSurveyDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      satisfactionScore: 75,
      npsScore: 35,
      complaintCount30d: 0,
      complimentCount30d: 2,
      supportTickets30d: 1,
      supportTicketsResolved30d: 1,
    };
  }

  /**
   * Get usage data for a customer
   */
  private async getUsageData(customerId: string): Promise<any> {
    return {
      policyCount: 1,
      activePolicyCount: 1,
      claimsFiled30d: 0,
      quotesRequested30d: 1,
      policyChangesRequested30d: 0,
      renewalRate: 100,
    };
  }

  /**
   * Get support data for a customer
   */
  private async getSupportData(customerId: string): Promise<any> {
    return {
      averageResponseTimeHours: 4.2,
      escalations30d: 0,
      repeatContactRate: 15,
      satisfactionRating: 82,
      pendingTickets: 0,
      ticketsTrend: 20,
    };
  }

  /**
   * Get financial data for a customer
   */
  private async getFinancialData(customerId: string): Promise<any> {
    return {
      lifetimeValue: 2500,
      policyPremiumTotal: 1250,
      paymentDelinquencies30d: 0,
      paymentFailures30d: 0,
      claimsTotalPaid: 0,
      profitabilityScore: 85,
    };
  }

  /**
   * Calculate component scores
   */
  private calculateComponentScores(data: CustomerHealthScoreInput): any {
    const engagement = this.calculateEngagementScore(data.engagementData);
    const satisfaction = this.calculateSatisfactionScore(data.satisfactionData);
    const usage = this.calculateUsageScore(data.usageData);
    const support = this.calculateSupportScore(data.supportData);
    const financial = this.calculateFinancialScore(data.financialData);

    return { engagement, satisfaction, usage, support, financial };
  }

  /**
   * Calculate engagement score (0-100)
   */
  private calculateEngagementScore(data: any): number {
    let score = 0;
    let weight = 0;

    // Email engagement (30%)
    if (data.emailOpenRate !== undefined) {
      const normalizedOpenRate = Math.min(data.emailOpenRate / 100, 1);
      score += normalizedOpenRate * 30;
      weight += 30;
    }

    if (data.emailClickRate !== undefined) {
      const normalizedClickRate = Math.min(data.emailClickRate / 100, 1);
      score += normalizedClickRate * 20;
      weight += 20;
    }

    // Portal activity (30%)
    if (data.portalVisits30d !== undefined) {
      const normalizedVisits = Math.min(data.portalVisits30d / 15, 1);
      score += normalizedVisits * 30;
      weight += 30;
    }

    // Communication responsiveness (20%)
    if (data.messagesExchanged30d !== undefined) {
      const normalizedMessages = Math.min(data.messagesExchanged30d / 10, 1);
      score += normalizedMessages * 20;
      weight += 20;
    }

    return weight > 0 ? (score / weight) * 100 : 50;
  }

  /**
   * Calculate satisfaction score (0-100)
   */
  private calculateSatisfactionScore(data: any): number {
    let score = 0;
    let weight = 0;

    // Survey scores (40%)
    if (data.satisfactionScore !== undefined) {
      score += (data.satisfactionScore / 100) * 25;
      weight += 25;
    }

    if (data.npsScore !== undefined) {
      const normalizedNps = (data.npsScore + 100) / 200;
      score += Math.max(normalizedNps, 0) * 15;
      weight += 15;
    }

    // Complaint ratio (35%)
    const totalInteractions = Math.max(
      data.supportTicketsResolved30d + data.complaintCount30d + data.complimentCount30d,
      1
    );
    const satisfactionRatio = data.complimentCount30d / totalInteractions;
    score += Math.max(satisfactionRatio, 0) * 35;
    weight += 35;

    // Support ticket resolution (30%)
    const resolutionRate = data.supportTicketsResolved30d / Math.max(data.supportTickets30d, 1);
    score += resolutionRate * 20;
    weight += 20;

    // Recency penalty (if no recent surveys)
    const daysSinceSurvey = data.lastSurveyDate ? (Date.now() - data.lastSurveyDate.getTime()) / (24 * 60 * 60 * 1000) : 365;
    if (daysSinceSurvey > 90) {
      // Penalize slightly for old survey data
      score = score * 0.9;
    }

    return weight > 0 ? (score / weight) * 100 : 50;
  }

  /**
   * Calculate usage score (0-100)
   */
  private calculateUsageScore(data: any): number {
    let score = 0;
    let weight = 0;

    // Policy activity (40%)
    const policyRatio = data.activePolicyCount / Math.max(data.policyCount, 1);
    score += policyRatio * 40;
    weight += 40;

    // Claims activity (20%)
    const normalizedClaims = Math.min(data.claimsFiled30d / 5, 1);
    score += normalizedClaims * 20;
    weight += 20;

    // Policy management (25%)
    const normalizedChanges = Math.min(data.policyChangesRequested30d / 3, 1);
    score += normalizedChanges * 25;
    weight += 25;

    // Renewal rate (15%)
    score += (data.renewalRate / 100) * 15;
    weight += 15;

    return weight > 0 ? (score / weight) * 100 : 50;
  }

  /**
   * Calculate support score (0-100)
   */
  private calculateSupportScore(data: any): number {
    let score = 0;
    let weight = 0;

    // Response time (30%)
    const responseTimeScore = Math.max(100 - data.averageResponseTimeHours * 2, 0);
    score += (responseTimeScore / 100) * 30;
    weight += 30;

    // Escalations (25%)
    const escalationPenalty = Math.min(data.escalations30d * 25, 25);
    score += (100 - escalationPenalty) / 100 * 25;
    weight += 25;

    // Repeat contact rate (20%)
    const repeatContactScore = Math.max(100 - data.repeatContactRate, 0);
    score += (repeatContactScore / 100) * 20;
    weight += 20;

    // Pending tickets (15%)
    const pendingPenalty = Math.min(data.pendingTickets * 10, 15);
    score += (100 - pendingPenalty) / 100 * 15;
    weight += 15;

    // Support satisfaction (10%)
    if (data.satisfactionRating !== undefined) {
      score += (data.satisfactionRating / 100) * 10;
      weight += 10;
    }

    // Trend adjustment
    if (data.ticketsTrend > 50) {
      // More tickets vs previous period
      score = score * 0.85;
    }

    return weight > 0 ? (score / weight) * 100 : 50;
  }

  /**
   * Calculate financial score (0-100)
   */
  private calculateFinancialScore(data: any): number {
    let score = 0;
    let weight = 0;

    // Payment history (40%)
    const delinquencyPenalty = Math.min(data.paymentDelinquencies30d * 30, 40);
    score += (100 - delinquencyPenalty) / 100 * 40;
    weight += 40;

    // Payment failures (20%)
    const failurePenalty = Math.min(data.paymentFailures30d * 20, 20);
    score += (100 - failurePenalty) / 100 * 20;
    weight += 20;

    // Lifetime value (25%)
    const ltvScore = Math.min(data.lifetimeValue / 5000, 1) * 25;
    score += ltvScore;
    weight += 25;

    // Profitability (15%)
    if (data.profitabilityScore !== undefined) {
      score += (data.profitabilityScore / 100) * 15;
      weight += 15;
    }

    return weight > 0 ? (score / weight) * 100 : 50;
  }

  /**
   * Calculate overall score and determine churn risk
   */
  private calculateOverallScore(
    customerId: string,
    componentScores: any
  ): HealthScoreCalculationResult {
    // Weighted average
    const weights = {
      engagement: 0.2,
      satisfaction: 0.25,
      usage: 0.2,
      support: 0.2,
      financial: 0.15,
    };

    const overallScore = Math.round(
      componentScores.engagement * weights.engagement +
        componentScores.satisfaction * weights.satisfaction +
        componentScores.usage * weights.usage +
        componentScores.support * weights.support +
        componentScores.financial * weights.financial
    );

    // Determine churn risk
    let churnRisk: ChurnRiskLevel;
    let churnProbability: number;

    if (overallScore >= 80) {
      churnRisk = 'LOW';
      churnProbability = 0.05;
    } else if (overallScore >= 60) {
      churnRisk = 'LOW';
      churnProbability = 0.15;
    } else if (overallScore >= 40) {
      churnRisk = 'MEDIUM';
      churnProbability = 0.35;
    } else if (overallScore >= 20) {
      churnRisk = 'HIGH';
      churnProbability = 0.65;
    } else {
      churnRisk = 'CRITICAL';
      churnProbability = 0.85;
    }

    // Generate risk factors
    const riskFactors = this.identifyRiskFactors(componentScores, overallScore);

    // Generate recommended actions
    const recommendedActions = this.generateRecommendedActions(componentScores, overallScore, churnRisk);

    // Generate auto-trigger actions
    const autoTriggerActions = this.getAutoTriggerActions(componentScores, churnRisk);

    return {
      overallScore,
      componentScores,
      riskFactors,
      recommendedActions,
      autoTriggerActions,
      churnRisk,
      churnProbability,
      calculationVersion: 'v1.0',
    };
  }

  /**
   * Identify risk factors based on scores
   */
  private identifyRiskFactors(componentScores: any, overallScore: number): string[] {
    const factors: string[] = [];

    if (componentScores.engagement < 30) {
      factors.push('Very low engagement');
    } else if (componentScores.engagement < 50) {
      factors.push('Low engagement');
    }

    if (componentScores.satisfaction < 40) {
      factors.push('Poor satisfaction scores');
    } else if (componentScores.satisfaction < 60) {
      factors.push('Below average satisfaction');
    }

    if (componentScores.support < 40) {
      factors.push('Multiple support issues');
    } else if (componentScores.support < 60) {
      factors.push('Recent support challenges');
    }

    if (componentScores.financial < 30) {
      factors.push('Financial concerns');
    }

    if (overallScore < 40) {
      factors.push('Overall customer health declining');
    }

    return factors;
  }

  /**
   * Generate recommended actions
   */
  private generateRecommendedActions(
    componentScores: any,
    overallScore: number,
    churnRisk: ChurnRiskLevel
  ): string[] {
    const actions: string[] = [];

    if (componentScores.engagement < 60) {
      actions.push('Increase engagement through personalized communications');
    }

    if (componentScores.satisfaction < 60) {
      actions.push('Conduct satisfaction survey and address concerns');
    }

    if (componentScores.support < 60) {
      actions.push('Review and improve support interactions');
    }

    if (overallScore < 60) {
      actions.push('Schedule proactive outreach call');
      actions.push('Offer policy review and optimization');
    }

    if (churnRisk === 'CRITICAL' || overallScore < 30) {
      actions.push('Escalate to senior account manager');
      actions.push('Prepare win-back offer strategy');
    }

    if (churnRisk === 'MEDIUM') {
      actions.push('Monitor closely and increase touchpoints');
      actions.push('Provide educational content and resources');
    }

    return actions;
  }

  /**
   * Get auto-trigger actions for high-risk customers
   */
  private getAutoTriggerActions(componentScores: any, churnRisk: ChurnRiskLevel): string[] {
    const actions: string[] = [];

    if (churnRisk === 'HIGH' || churnRisk === 'CRITICAL') {
      actions.push('APPRECIATION_CALL');
      actions.push('POLICY_REVIEW');
      actions.push('RENEWAL_REMINDER');
    }

    if (componentScores.satisfaction < 40) {
      actions.push('CUSTOMER_FEEDBACK');
    }

    if (componentScores.engagement < 40) {
      actions.push('PROACTIVE_OUTREACH');
    }

    return actions;
  }

  /**
   * Build scoring categories JSON
   */
  private buildScoringCategories(componentScores: any): any {
    return {
      engagement: {
        score: componentScores.engagement,
        weight: 0.2,
      },
      satisfaction: {
        score: componentScores.satisfaction,
        weight: 0.25,
      },
      usage: {
        score: componentScores.usage,
        weight: 0.2,
      },
      support: {
        score: componentScores.support,
        weight: 0.2,
      },
      financial: {
        score: componentScores.financial,
        weight: 0.15,
      },
    };
  }

  /**
   * Determine trend based on previous score
   */
  private determineTrend(previousScore?: number, currentScore?: number): ScoreTrend {
    if (previousScore === undefined || currentScore === undefined) {
      return 'STABLE';
    }

    const change = currentScore - previousScore;
    const changePercent = previousScore > 0 ? (change / previousScore) * 100 : 0;

    if (changePercent > 10) {
      return 'IMPROVING';
    } else if (changePercent < -10) {
      return 'DECLINING';
    }

    return 'STABLE';
  }

  /**
   * Generate score notes
   */
  private generateScoreNotes(calculationResult: HealthScoreCalculationResult): string {
    const notes = [];
    notes.push(`Overall Score: ${calculationResult.overallScore}/100`);
    notes.push(`Churn Risk: ${calculationResult.churnRisk}`);
    if (calculationResult.riskFactors.length > 0) {
      notes.push(`Risk Factors: ${calculationResult.riskFactors.join(', ')}`);
    }
    return notes.join(' | ');
  }

  /**
   * Auto-trigger interventions for high-risk customers
   */
  private async autoTriggerInterventions(
    healthScore: CustomerHealthScore,
    config: AutoTriggerConfig,
    customerId: string
  ): Promise<void> {
    try {
      const activeInterventions = await this.prisma.customerIntervention.count({
        where: {
          customerId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      });

      if (activeInterventions >= config.maxConcurrentInterventions) {
        logger.info('Maximum concurrent interventions reached', {
          customerId,
          activeInterventions,
          max: config.maxConcurrentInterventions,
        });
        return;
      }

      for (const actionType of healthScore.autoTriggerActions.slice(0, config.maxConcurrentInterventions - activeInterventions)) {
        const priority = this.getPriorityForAction(actionType, healthScore.churnRisk);

        await this.createIntervention({
          customerId,
          healthScoreId: healthScore.id,
          interventionType: actionType as InterventionType,
          title: this.getInterventionTitle(actionType as InterventionType),
          description: this.getInterventionDescription(actionType as InterventionType, healthScore),
          priority,
          triggerSource: 'AUTO_TRIGGER',
        });
      }

      if (config.notifyOnTrigger) {
        // Send notification to assigned team
        // This would integrate with notification service
        logger.info('Intervention auto-trigger notifications sent', {
          customerId,
          triggeredCount: healthScore.autoTriggerActions.length,
        });
      }
    } catch (error) {
      logger.error('Error auto-triggering interventions', { error, customerId });
    }
  }

  /**
   * Get priority for action type
   */
  private getPriorityForAction(actionType: string, churnRisk: ChurnRiskLevel): PriorityLevel {
    if (churnRisk === 'CRITICAL') {
      return 'URGENT';
    }
    if (churnRisk === 'HIGH') {
      return 'HIGH';
    }
    if (actionType === 'SWOOP_SAVE') {
      return 'CRITICAL';
    }
    return 'MEDIUM';
  }

  /**
   * Get intervention title by type
   */
  private getInterventionTitle(type: InterventionType): string {
    const titles: Record<InterventionType, string> = {
      PROACTIVE_OUTREACH: 'Proactive Customer Outreach',
      APPRECIATION_CALL: 'Customer Appreciation Call',
      RENEWAL_REMINDER: 'Policy Renewal Reminder',
      POLICY_REVIEW: 'Policy Review Meeting',
      PREMIUM_ANALYSIS: 'Premium Analysis & Optimization',
      CUSTOMER_FEEDBACK: 'Customer Feedback Collection',
      RELATIONSHIP_BUILDING: 'Relationship Building Touchpoint',
      EDUCATIONAL_TOUCHPOINT: 'Educational Content Delivery',
      REFERRAL_REQUEST: 'Referral Program Invitation',
      SPECIAL_OFFER: 'Special Offer Presentation',
      SURVEY_INVITATION: 'Customer Satisfaction Survey',
      ACCOUNT_MANAGER_ASSIGNMENT: 'Account Manager Assignment',
      SWOOP_SAVE: 'Emergency Retention Intervention',
    };
    return titles[type] || 'Customer Intervention';
  }

  /**
   * Get intervention description
   */
  private getInterventionDescription(type: InterventionType, healthScore: CustomerHealthScore): string {
    const descriptions: Record<InterventionType, string> = {
      PROACTIVE_OUTREACH: `Proactive outreach to improve customer engagement. Current health score: ${healthScore.overallScore}`,
      APPRECIATION_CALL: `Show appreciation for the customer and gather feedback on their experience`,
      RENEWAL_REMINDER: `Remind customer about upcoming policy renewal and discuss options`,
      POLICY_REVIEW: `Review current policies and identify optimization opportunities`,
      PREMIUM_ANALYSIS: `Analyze current premiums and provide cost-saving recommendations`,
      CUSTOMER_FEEDBACK: `Collect detailed feedback to understand customer satisfaction`,
      RELATIONSHIP_BUILDING: `Strengthen relationship through personalized interaction`,
      EDUCATIONAL_TOUCHPOINT: `Provide valuable educational content relevant to their needs`,
      REFERRAL_REQUEST: `Invite customer to participate in referral program`,
      SPECIAL_OFFER: `Present special offer to improve satisfaction and retention`,
      SURVEY_INVITATION: `Request participation in satisfaction survey`,
      ACCOUNT_MANAGER_ASSIGNMENT: `Assign dedicated account manager for personalized service`,
      SWOOP_SAVE: `EMERGENCY: Immediate intervention required to prevent churn`,
    };
    return descriptions[type] || 'Personalized customer intervention';
  }

  /**
   * Get auto-trigger configuration
   */
  private getAutoTriggerConfig(): AutoTriggerConfig {
    return {
      enabled: true,
      riskThreshold: 'MEDIUM',
      scoreThreshold: 60,
      maxConcurrentInterventions: 3,
      coolDownPeriodDays: 7,
      triggerActions: ['PROACTIVE_OUTREACH', 'POLICY_REVIEW', 'APPRECIATION_CALL'],
      exclusionRules: ['recently_contacted', 'in_escalation'],
      notifyOnTrigger: true,
      assignToRoles: ['ACCOUNT_MANAGER', 'CUSTOMER_SUCCESS'],
      escalationRules: {
        afterHours: 48,
        escalationAction: 'ASSIGN_TO_AGENT' as any,
        escalationTarget: 'SENIOR_MANAGER',
      },
    };
  }

  // ========================================
  // INTERVENTION MANAGEMENT METHODS
  // ========================================

  /**
   * Create a new intervention
   */
  async createIntervention(request: CreateInterventionRequest): Promise<CustomerIntervention> {
    try {
      const intervention = await this.prisma.customerIntervention.create({
        data: {
          customerId: request.customerId,
          healthScoreId: request.healthScoreId,
          interventionType: request.interventionType,
          priority: request.priority || 'MEDIUM',
          status: 'PENDING',
          title: request.title,
          description: request.description,
          assignedTo: request.assignedTo,
          dueDate: request.dueDate,
          triggerSource: request.triggerSource,
          metadata: request.metadata,
        },
      });

      logger.info('Intervention created', {
        interventionId: intervention.id,
        customerId: request.customerId,
        type: request.interventionType,
      });

      return intervention;
    } catch (error) {
      logger.error('Error creating intervention', { error, customerId: request.customerId });
      throw error;
    }
  }

  /**
   * Update intervention
   */
  async updateIntervention(id: string, request: UpdateInterventionRequest): Promise<CustomerIntervention> {
    try {
      const intervention = await this.prisma.customerIntervention.findUnique({
        where: { id },
      });

      if (!intervention) {
        throw new Error(`Intervention not found: ${id}`);
      }

      const updated = await this.prisma.customerIntervention.update({
        where: { id },
        data: {
          status: request.status,
          outcome: request.outcome,
          outcomeNotes: request.outcomeNotes,
          notes: request.notes || intervention.notes,
          effectivenessScore: request.effectivenessScore,
          assignedTo: request.assignedTo,
          completedAt: request.completedAt,
        },
      });

      logger.info('Intervention updated', {
        interventionId: id,
        customerId: updated.customerId,
        status: request.status,
      });

      // If intervention was completed successfully, trigger score recalculation
      if (request.status === 'COMPLETED' && request.outcome === 'SUCCESS') {
        await this.calculateHealthScore(updated.customerId, {}, { forceRecalculate: true });
      }

      return updated;
    } catch (error) {
      logger.error('Error updating intervention', { error, id });
      throw error;
    }
  }

  /**
   * Get intervention by ID
   */
  async getIntervention(id: string): Promise<CustomerIntervention | null> {
    return this.prisma.customerIntervention.findUnique({
      where: { id },
      include: {
        healthScore: true,
      },
    });
  }

  /**
   * List interventions with filtering
   */
  async listInterventions(filter: InterventionFilterParams): Promise<{
    interventions: CustomerIntervention[];
    total: number;
  }> {
    const {
      customerId,
      status,
      priority,
      assignedTo,
      interventionType,
      dueDateFrom,
      dueDateTo,
      outcome,
      page = 1,
      limit = 50,
    } = filter;

    const where: any = {};

    if (customerId) where.customerId = customerId;
    if (status && status.length > 0) where.status = { in: status };
    if (priority && priority.length > 0) where.priority = { in: priority };
    if (assignedTo) where.assignedTo = assignedTo;
    if (interventionType && interventionType.length > 0) where.interventionType = { in: interventionType };
    if (outcome && outcome.length > 0) where.outcome = { in: outcome };

    // Date range filters
    if (dueDateFrom || dueDateTo) {
      where.dueDate = {};
      if (dueDateFrom) where.dueDate.gte = dueDateFrom;
      if (dueDateTo) where.dueDate.lte = dueDateTo;
    }

    const [interventions, total] = await Promise.all([
      this.prisma.customerIntervention.findMany({
        where,
        include: {
          healthScore: true,
        },
        orderBy: {
          priority: 'desc',
          dueDate: 'asc',
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.customerIntervention.count({ where }),
    ]);

    return { interventions, total };
  }

  /**
   * Bulk update interventions
   */
  async bulkUpdateInterventions(ids: string[], request: UpdateInterventionRequest): Promise<{ count: number }> {
    try {
      const updated = await this.prisma.customerIntervention.updateMany({
        where: {
          id: { in: ids },
        },
        data: request,
      });

      logger.info('Bulk update interventions', {
        count: updated.count,
        status: request.status,
      });

      return { count: updated.count };
    } catch (error) {
      logger.error('Error bulk updating interventions', { error, count: ids.length });
      throw error;
    }
  }

  // ========================================
  // ANALYTICS METHODS
  // ========================================

  /**
   * Get predictive health analytics
   */
  async getPredictiveAnalytics(): Promise<PredictiveHealthAnalytics> {
    const [
      healthScores,
      interventions,
      improvingCount,
      decliningCount,
      stableCount
    ] = await Promise.all([
      this.prisma.customerHealthScore.findMany(),
      this.prisma.customerIntervention.findMany(),
      this.prisma.customerHealthScore.count({
        where: { trend: 'IMPROVING' },
      }),
      this.prisma.customerHealthScore.count({
        where: { trend: 'DECLINING' },
      }),
      this.prisma.customerHealthScore.count({
        where: { trend: 'STABLE' },
      }),
    ]);

    // Calculate distribution
    const riskDistribution = {
      low: healthScores.filter(h => h.churnRisk === 'LOW').length,
      medium: healthScores.filter(h => h.churnRisk === 'MEDIUM').length,
      high: healthScores.filter(h => h.churnRisk === 'HIGH').length,
      critical: healthScores.filter(h => h.churnRisk === 'CRITICAL').length,
    };

    const averageScore = healthScores.reduce((sum, h) => sum + h.overallScore, 0) / healthScores.length || 0;

    // Score distribution
    const scoreDistribution = {
      excellent: healthScores.filter(h => h.overallScore >= 90).length,
      good: healthScores.filter(h => h.overallScore >= 70 && h.overallScore < 90).length,
      average: healthScores.filter(h => h.overallScore >= 50 && h.overallScore < 70).length,
      poor: healthScores.filter(h => h.overallScore >= 30 && h.overallScore < 50).length,
      atRisk: healthScores.filter(h => h.overallScore < 30).length,
    };

    // Intervention effectiveness
    const completedInterventions = interventions.filter(i => i.status === 'COMPLETED');
    const successfulInterventions = completedInterventions.filter(i => i.effectivenessScore && i.effectivenessScore >= 70);
    const interventionGroupedByType: any = {};
    completedInterventions.forEach(i => {
      if (!interventionGroupedByType[i.interventionType]) {
        interventionGroupedByType[i.interventionType] = [];
      }
      interventionGroupedByType[i.interventionType].push(i.effectivenessScore || 0);
    });

    const mostEffectiveTypes = Object.entries(interventionGroupedByType)
      .map(([type, scores]: [string, number[]]) => ({
        type: type as InterventionType,
        avgEffectiveness: scores.reduce((sum, score) => sum + score, 0) / scores.length,
        count: scores.length,
      }))
      .sort((a, b) => b.avgEffectiveness - a.avgEffectiveness)
      .slice(0, 5);

    return {
      totalCustomers: healthScores.length,
      riskDistribution,
      averageScore: Math.round(averageScore),
      scoreDistribution,
      trendingValues: {
        improving: improvingCount,
        stable: stableCount,
        declining: decliningCount,
      },
      interventionEfficacy: {
        totalInterventions: interventions.length,
        successfulInterventions: successfulInterventions.length,
        averageEffectiveness: successfulInterventions.reduce((sum, i) => sum + (i.effectivenessScore || 0), 0) /
          successfulInterventions.length || 0,
        mostEffectiveTypes: mostEffectiveTypes,
      },
      predictionAccuracy: {
        modelVersion: 'v1.0',
        accuracyRate: 0.85, // Mock for now - would be calculated from actual outcomes
        predictionsMade: healthScores.length,
        correctPredictions: Math.floor(healthScores.length * 0.85),
        falsePositives: Math.floor(healthScores.length * 0.1),
        falseNegatives: Math.floor(healthScores.length * 0.05),
      },
    };
  }

  /**
   * Get risk factor analysis
   */
  async getRiskFactorAnalysis(): Promise<RiskFactorAnalysis> {
    const healthScores = await this.prisma.customerHealthScore.findMany();

    const allRiskFactors = healthScores.flatMap(h => h.riskFactors || []);
    const factorFrequency = allRiskFactors.reduce((acc, factor) => {
      acc[factor] = (acc[factor] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topRiskFactors = Object.entries(factorFrequency)
      .map(([factor, frequency]) => ({
        factor,
        impact: this.calculateRiskImpact(factor, healthScores),
        frequency,
        affectedCustomers: frequency,
      }))
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 10);

    return {
      topRiskFactors,
      highRiskPatterns: [
        'Customers with multiple policy types show higher satisfaction',
        'Recent claim filing often precedes churn risk',
        'Payment issues are strong churn predictors',
        'Low portal engagement correlates with policy non-renewal',
      ],
      recommendedSystemChanges: [
        'Implement early warning system for payment issues',
        'Create automated engagement campaigns for low-activity users',
        'Establish premium analysis service for price-sensitive customers',
        'Develop comprehensive onboarding program',
      ],
    };
  }

  /**
   * Calculate risk factor impact
   */
  private calculateRiskImpact(factor: string, healthScores: any[]): number {
    const scoresWithFactor = healthScores.filter(h => 
      h.riskFactors && h.riskFactors.includes(factor)
    );
    const avgScoreWithFactor = scoresWithFactor.reduce((sum, h) => sum + h.overallScore, 0) / scoresWithFactor.length || 0;
    
    const scoresWithoutFactor = healthScores.filter(h => 
      !h.riskFactors || !h.riskFactors.includes(factor)
    );
    const avgScoreWithoutFactor = scoresWithoutFactor.reduce((sum, h) => sum + h.overallScore, 0) / scoresWithoutFactor.length || 0;
    
    return avgScoreWithoutFactor - avgScoreWithFactor; // Positive impact = negative effect on score
  }

  // ========================================
  // BATCH OPERATIONS
  // ========================================

  /**
   * Calculate health scores for multiple customers
   */
  async calculateBatchHealthScores(
    customerIds: string[]
  ): Promise<{
    scores: CustomerHealthScore[];
    summary: { totalProcessed: number; newlyCalculated: number; failed: number; averageScore: number };
  }> {
    const results = await Promise.allSettled(
      customerIds.map(id => 
        this.calculateHealthScore(id, {}, { forceRecalculate: false })
      )
    );

    const successful = results
      .filter((r): r is PromiseFulfilledResult<{ healthScore: CustomerHealthScore; createdNew: boolean }> => r.status === 'fulfilled')
      .map(r => ({
        ...r.value.healthScore,
        createdNew: r.value.createdNew,
      }));

    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

    const averageScore = successful.reduce((sum, h) => sum + h.overallScore, 0) / successful.length || 0;
    const newlyCalculated = successful.filter(h => h.createdNew as any).length;

    return {
      scores: successful.map(h => {
        const { createdNew, ...score } = h as any;
        return score;
      }),
      summary: {
        totalProcessed: customerIds.length,
        newlyCalculated,
        failed: failed.length,
        averageScore: Math.round(averageScore),
      },
    };
  }

  // ========================================
  // HEALTH SCORE QUERY METHODS
  // ========================================

  /**
   * Get customer health score by customer ID
   */
  async getHealthScoreByCustomerId(customerId: string): Promise<CustomerHealthScore | null> {
    return this.prisma.customerHealthScore.findUnique({
      where: { customerId },
      include: {
        interventions: {
          where: {
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
          orderBy: {
            priority: 'desc',
            dueDate: 'asc',
          },
        },
      },
    });
  }

  /**
   * List health scores with filtering
   */
  async listHealthScores(
    filter: HealthScoreFilterParams
  ): Promise<{
    healthScores: CustomerHealthScore[];
    total: number;
  }> {
    const {
      churnRiskLevels,
      minScore,
      maxScore,
      trending,
      page = 1,
      limit = 50,
    } = filter;

    const where: any = {};

    if (churnRiskLevels && churnRiskLevels.length > 0) {
      where.churnRisk = { in: churnRiskLevels };
    }

    if (minScore !== undefined) {
      where.overallScore = { ...where.overallScore, gte: minScore };
    }

    if (maxScore !== undefined) {
      where.overallScore = { ...where.overallScore, lte: maxScore };
    }

    if (trending && trending.length > 0) {
      where.trend = { in: trending };
    }

    const [healthScores, total] = await Promise.all([
      this.prisma.customerHealthScore.findMany({
        where,
        include: {
          interventions: true,
        },
        orderBy: {
          overallScore: 'asc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.customerHealthScore.count({ where }),
    ]);

    return { healthScores, total };
  }

  /**
   * Get health score trend for a customer
   */
  async getHealthScoreTrend(customerId: string, daysBack = 90): Promise<HealthScoreTrend> {
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const scores = await this.prisma.customerHealthScore.findMany({
      where: {
        customerId,
        lastCalculated: {
          gte: startDate,
        },
      },
      orderBy: {
        lastCalculated: 'asc',
      },
    });

    const scoreData = scores.map(h => ({
      date: h.lastCalculated,
      score: h.overallScore,
      riskLevel: h.churnRisk,
      trend: h.trend,
    }));

    const allScores = scoreData.map(s => s.score);
    const averageScore = allScores.reduce((sum, score) => sum + score, 0) / allScores.length || 0;
    const maxScore = Math.max(...allScores);
    const minScore = Math.min(...allScores);

    const changes = scores.map((h, i) => {
      if (i === 0) return 0;
      return h.overallScore - scores[i - 1].overallScore;
    }).filter((_, i) => i > 0);

    const improvements = changes.filter(c => c > 0).length;
    const declines = changes.filter(c => c < 0).length;

    const variance = allScores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) / allScores.length || 0;
    const stability = Math.min((100 - Math.sqrt(variance)) / 100 * 100, 100);

    return {
      customerId,
      scores: scoreData,
      averageScore: Math.round(averageScore),
      maxScore,
      minScore,
      improvements,
      declines,
      stability: Math.round(stability),
    };
  }
}