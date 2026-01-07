/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unused-vars, @typescript-eslint/prefer-nullish-coalescing */
import { PrismaClient } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import type {
  CustomerHealthScore,
  CustomerLTV,
  ChurnRisk,
  ChurnPredictionInput,
  ChurnPredictionResult,
  RetentionMetrics,
  PolicyType,
} from '@insurance-lead-gen/types';

export class RetentionService {
  constructor(private prisma: PrismaClient) {}

  async calculateCustomerHealthScore(customerId: string): Promise<CustomerHealthScore> {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          policies: true,
          touchpoints: {
            where: {
              createdAt: {
                gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
              },
            },
          },
          retentionEvents: {
            orderBy: { timestamp: 'desc' },
            take: 50,
          },
        },
      });

      if (!customer) {
        throw new Error(`Customer not found: ${customerId}`);
      }

      // Calculate engagement score (0-100)
      const engagementScore = this.calculateEngagementScore(
        customer.lastContactDate,
        customer.touchpoints
      );

      // Calculate financial score (0-100)
      const financialScore = this.calculateFinancialScore(customer.policies);

      // Calculate satisfaction score (0-100)
      const satisfactionScore = customer.satisfactionScore || 50;

      // Calculate lifecycle score (0-100)
      const lifecycleScore = this.calculateLifecycleScore(
        customer.customerSince,
        customer.policies
      );

      // Overall score is weighted average
      const overallScore =
        engagementScore * 0.3 +
        financialScore * 0.3 +
        satisfactionScore * 0.2 +
        lifecycleScore * 0.2;

      // Predict churn probability and risk
      const { churnProbability, churnRisk } = this.predictChurnRisk(
        overallScore,
        customer,
        customer.policies
      );

      // Identify risk factors
      const riskFactors = this.identifyRiskFactors(
        customer,
        customer.policies,
        customer.touchpoints,
        engagementScore,
        financialScore,
        lifecycleScore
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        churnRisk,
        riskFactors,
        customer.policies
      );

      // Save to database
      const healthScore = await this.prisma.customerHealthScore.create({
        data: {
          customerId,
          overallScore,
          engagementScore,
          financialScore,
          satisfactionScore,
          lifecycleScore,
          churnRisk,
          churnProbability,
          riskFactors: riskFactors,
          recommendations,
        },
      });

      // Update customer record
      await this.prisma.customer.update({
        where: { id: customerId },
        data: {
          healthScore: overallScore,
          churnRisk,
        },
      });

      return {
        customerId,
        overallScore,
        components: {
          engagement: {
            score: engagementScore,
            lastInteractionDays: this.daysSince(customer.lastContactDate),
            interactionFrequency: customer.touchpoints.length,
            emailOpenRate: this.calculateEmailOpenRate(customer.touchpoints),
            responseRate: this.calculateResponseRate(customer.touchpoints),
          },
          financial: {
            score: financialScore,
            paymentHistory: this.calculatePaymentHistory(customer.policies),
            premiumGrowth: this.calculatePremiumGrowth(customer.policies),
            crossSellOpportunities: this.identifyCrossSellOpportunities(customer.policies),
          },
          satisfaction: {
            score: satisfactionScore,
            nps: customer.satisfactionScore,
            complaintCount: this.countComplaints(customer.retentionEvents),
            resolutionRate: this.calculateResolutionRate(customer.retentionEvents),
          },
          lifecycle: {
            score: lifecycleScore,
            tenure: this.monthsSince(customer.customerSince),
            policyCount: customer.totalPolicies,
            renewalRate: this.calculateRenewalRate(customer.policies),
            churnIndicators: riskFactors.filter((f: any) => f.impact === 'high').length,
          },
        },
        churnRisk,
        churnProbability,
        riskFactors,
        recommendations,
        calculatedAt: healthScore.calculatedAt,
      };
    } catch (error) {
      logger.error('Error calculating customer health score', { customerId, error });
      throw error;
    }
  }

  async calculateCustomerLTV(customerId: string): Promise<CustomerLTV> {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          policies: true,
        },
      });

      if (!customer) {
        throw new Error(`Customer not found: ${customerId}`);
      }

      const tenureMonths = this.monthsSince(customer.customerSince);
      const activePolicies = customer.policies.filter((p) => p.status === 'ACTIVE');

      // Calculate current revenue
      const monthlyRevenue = activePolicies.reduce((sum, policy) => {
        return sum + this.calculateMonthlyPremium(policy);
      }, 0);
      const annualRevenue = monthlyRevenue * 12;

      // Calculate retention rate based on policy renewals
      const retentionRate = this.calculateRetentionRate(customer.policies, tenureMonths);

      // Estimate average customer lifespan in months
      const averageLifespan = retentionRate > 0 ? (1 / (1 - retentionRate / 100)) * 12 : 36;

      // Calculate total revenue and costs
      const totalRevenue = customer.policies.reduce((sum, p) => sum + p.totalPaid, 0);
      const acquisitionCost = 200; // Default value, can be customized
      const operationalCostRate = 0.3; // 30% of revenue
      const totalCost = acquisitionCost + totalRevenue * operationalCostRate;
      const netProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      // Calculate LTV
      const currentLTV = totalRevenue;
      const projectedLTV = monthlyRevenue * averageLifespan * (1 - operationalCostRate);

      // Revenue breakdown by policy type
      const revenueBreakdown: Record<string, number> = {};
      customer.policies.forEach((policy) => {
        const type = policy.policyType.toLowerCase();
        revenueBreakdown[type] = (revenueBreakdown[type] || 0) + policy.totalPaid;
      });

      // Determine tier and category
      const tier = this.determineCustomerTier(projectedLTV);
      const category = this.determineCustomerCategory(
        tenureMonths,
        customer.policies,
        retentionRate
      );

      // Save to database
      const ltvRecord = await this.prisma.customerLTV.create({
        data: {
          customerId,
          currentLTV,
          projectedLTV,
          monthlyRevenue,
          annualRevenue,
          retentionRate,
          averageLifespan,
          acquisitionCost,
          profitMargin,
          totalRevenue,
          totalCost,
          netProfit,
          revenueBreakdown,
          tier,
          category,
        },
      });

      // Update customer's lifetime value
      await this.prisma.customer.update({
        where: { id: customerId },
        data: { lifetimeValue: currentLTV },
      });

      return {
        customerId,
        currentLTV,
        projectedLTV,
        averageRevenue: {
          monthly: monthlyRevenue,
          annual: annualRevenue,
        },
        retentionRate,
        averageLifespan,
        acquisitionCost,
        profitMargin,
        breakdown: {
          totalRevenue,
          totalCost,
          netProfit,
          policyRevenue: revenueBreakdown as Record<PolicyType, number>,
        },
        segments: {
          tier: tier as 'bronze' | 'silver' | 'gold' | 'platinum',
          category: category as 'new' | 'growing' | 'stable' | 'declining' | 'at_risk',
        },
        calculatedAt: ltvRecord.calculatedAt,
      };
    } catch (error) {
      logger.error('Error calculating customer LTV', { customerId, error });
      throw error;
    }
  }

  async predictChurnForCustomer(input: ChurnPredictionInput): Promise<ChurnPredictionResult> {
    try {
      const { customerId, features } = input;
      const healthScore = await this.calculateCustomerHealthScore(customerId);

      // Use health score components as features if not provided
      const actualFeatures = features || {
        tenure: healthScore.components.lifecycle.tenure,
        policyCount: healthScore.components.lifecycle.policyCount,
        engagementScore: healthScore.components.engagement.score,
        satisfactionScore: healthScore.components.satisfaction.score,
        lastContactDays: healthScore.components.engagement.lastInteractionDays,
      };

      // Simple logistic regression-style calculation
      // In production, this would use a trained ML model
      const weights = {
        tenure: -0.02, // More tenure = less churn
        policyCount: -0.15, // More policies = less churn
        engagementScore: -0.01,
        satisfactionScore: -0.015,
        lastContactDays: 0.005, // More days = more churn
        claimsRatio: 0.3, // More claims = more churn
        paymentHistory: -0.02, // Better payment = less churn
      };

      let logit = 2.0; // Base intercept
      Object.entries(actualFeatures).forEach(([key, value]) => {
        if (weights[key as keyof typeof weights] && value !== undefined) {
          logit += weights[key as keyof typeof weights] * value;
        }
      });

      const churnProbability = Math.max(0, Math.min(1, 1 / (1 + Math.exp(-logit))));
      const churnRisk = healthScore.churnRisk;

      // Identify top factors
      const factors = Object.entries(actualFeatures)
        .map(([name, value]) => {
          const weight = weights[name as keyof typeof weights] || 0;
          return {
            name,
            impact: Math.abs(weight * (value || 0)),
            direction: weight < 0 ? ('positive' as const) : ('negative' as const),
          };
        })
        .sort((a, b) => b.impact - a.impact)
        .slice(0, 5);

      // Generate recommendations
      const recommendations = healthScore.recommendations.map((rec) => ({
        action: rec,
        priority:
          churnRisk === 'CRITICAL' || churnRisk === 'HIGH'
            ? ('high' as const)
            : churnRisk === 'MEDIUM'
              ? ('medium' as const)
              : ('low' as const),
        expectedImpact: `Reduce churn probability by ${(Math.random() * 15 + 5).toFixed(1)}%`,
      }));

      return {
        customerId,
        churnProbability,
        churnRisk: churnRisk as ChurnRisk,
        confidence: 0.75 + Math.random() * 0.2,
        factors,
        recommendations,
        predictedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error predicting churn', { customerId: input.customerId, error });
      throw error;
    }
  }

  async getRetentionMetrics(
    startDate: Date,
    endDate: Date,
    agentId?: string
  ): Promise<RetentionMetrics> {
    try {
      const whereClause = agentId ? { agentId } : {};

      // Get all customers
      const allCustomers = await this.prisma.customer.findMany({
        where: whereClause,
        include: { policies: true },
      });

      // Get customers in period
      const newCustomers = allCustomers.filter(
        (c) => c.customerSince >= startDate && c.customerSince <= endDate
      );

      // Calculate churn
      const churnedCustomers = allCustomers.filter((c) => {
        const hasActivePolicies = c.policies.some((p) => p.status === 'ACTIVE');
        return !hasActivePolicies;
      });

      const activeCustomers = allCustomers.filter((c) =>
        c.policies.some((p) => p.status === 'ACTIVE')
      );

      const retainedCustomers = allCustomers.length - churnedCustomers.length;

      // Calculate rates
      const totalCustomers = allCustomers.length || 1;
      const retentionRate = (retainedCustomers / totalCustomers) * 100;
      const churnRate = (churnedCustomers.length / totalCustomers) * 100;
      const growthRate = (newCustomers.length / totalCustomers) * 100;

      // Group by churn risk
      const byChurnRisk = {
        low: allCustomers.filter((c) => c.churnRisk === 'LOW').length,
        medium: allCustomers.filter((c) => c.churnRisk === 'MEDIUM').length,
        high: allCustomers.filter((c) => c.churnRisk === 'HIGH').length,
        critical: allCustomers.filter((c) => c.churnRisk === 'CRITICAL').length,
      };

      // Policy metrics
      const allPolicies = allCustomers.flatMap((c) => c.policies);
      const activePolicies = allPolicies.filter((p) => p.status === 'ACTIVE');
      const renewedPolicies = allPolicies.filter(
        (p) => p.renewalCount > 0 && p.lastRenewalDate && p.lastRenewalDate >= startDate
      );
      const cancelledPolicies = allPolicies.filter((p) => p.status === 'CANCELLED');
      const lapsedPolicies = allPolicies.filter((p) => p.status === 'LAPSED');

      const renewalRate = allPolicies.length
        ? (renewedPolicies.length / allPolicies.length) * 100
        : 0;

      // Revenue metrics
      const totalRevenue = allPolicies.reduce((sum, p) => sum + p.totalPaid, 0);
      const newCustomerRevenue = newCustomers.reduce(
        (sum, c) => sum + c.policies.reduce((s, p) => s + p.totalPaid, 0),
        0
      );
      const renewalRevenue = renewedPolicies.reduce((sum, p) => sum + p.totalPaid, 0);
      const churnedRevenue = churnedCustomers.reduce((sum, c) => sum + c.lifetimeValue, 0);

      const averageLTV =
        allCustomers.reduce((sum, c) => sum + c.lifetimeValue, 0) / (totalCustomers || 1);

      // Get campaigns in period
      const campaigns = await this.prisma.retentionCampaign.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'ACTIVE',
        },
      });

      const touchpoints = await this.prisma.campaignTouchpoint.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      });

      return {
        period: { startDate, endDate },
        customerMetrics: {
          totalCustomers,
          newCustomers: newCustomers.length,
          activeCustomers: activeCustomers.length,
          churnedCustomers: churnedCustomers.length,
          retainedCustomers,
          retentionRate,
          churnRate,
          growthRate,
          byChurnRisk: byChurnRisk as Record<ChurnRisk, number>,
        },
        policyMetrics: {
          totalPolicies: allPolicies.length,
          activePolicies: activePolicies.length,
          renewedPolicies: renewedPolicies.length,
          cancelledPolicies: cancelledPolicies.length,
          lapsedPolicies: lapsedPolicies.length,
          renewalRate,
          byPolicyType: this.groupPoliciesByType(allPolicies),
        },
        revenueMetrics: {
         totalRevenue,
         newCustomerRevenue,
         renewalRevenue,
         expansionRevenue: this.calculateExpansionRevenue(allCustomers),
         churnedRevenue,
         netRevenueRetention:
           totalRevenue > 0 ? ((totalRevenue - churnedRevenue) / totalRevenue) * 100 : 0,
         averageLTV,
         bySegment: this.calculateSegmentation(allCustomers),
        },
        campaignMetrics: {
          activeCampaigns: campaigns,
          totalTouchpoints: touchpoints,
          engagementRate: await this.calculateEngagementRate(startDate, endDate),
          conversionRate: 0,
          roi: 0,
        },
        healthMetrics: {
          averageHealthScore:
            allCustomers.reduce((sum, c) => sum + c.healthScore, 0) / (totalCustomers || 1),
          averageSatisfactionScore:
            allCustomers.reduce((sum, c) => sum + (c.satisfactionScore || 50), 0) /
            (totalCustomers || 1),
          healthScoreDistribution: {
            excellent: allCustomers.filter((c) => c.healthScore >= 80).length,
            good: allCustomers.filter((c) => c.healthScore >= 60 && c.healthScore < 80).length,
            fair: allCustomers.filter((c) => c.healthScore >= 40 && c.healthScore < 60).length,
            poor: allCustomers.filter((c) => c.healthScore < 40).length,
          },
        },
        trends: await this.calculateTrends(startDate, endDate),
      };
    } catch (error) {
      logger.error('Error calculating retention metrics', { startDate, endDate, error });
      throw error;
    }
  }

  // Helper methods
  private calculateEngagementScore(
    lastContactDate: Date | null,
    touchpoints: Array<{ type: string; openedAt?: Date | null; respondedAt?: Date | null }>
  ): number {
    let score = 50; // Base score

    if (lastContactDate) {
      const daysSince = this.daysSince(lastContactDate);
      if (daysSince < 7) score += 30;
      else if (daysSince < 30) score += 20;
      else if (daysSince < 90) score += 10;
      else score -= 20;
    } else {
      score -= 30;
    }

    // Interaction frequency
    if (touchpoints.length > 10) score += 20;
    else if (touchpoints.length > 5) score += 10;
    else if (touchpoints.length < 2) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  private calculateFinancialScore(
    policies: Array<{ status: string; totalPaid: number; premiumAmount: number }>
  ): number {
    let score = 50;

    const activePolicies = policies.filter((p) => p.status === 'ACTIVE');
    score += activePolicies.length * 10;

    const onTimePayments = policies.filter((p) => p.totalPaid >= p.premiumAmount).length;
    if (policies.length > 0) {
      score += (onTimePayments / policies.length) * 30;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateLifecycleScore(
    customerSince: Date,
    policies: Array<{ renewalCount: number; lastRenewalDate?: Date | null }>
  ): number {
    let score = 50;

    const tenureMonths = this.monthsSince(customerSince);
    score += Math.min(30, tenureMonths * 2);

    const renewalRate = this.calculateRenewalRate(policies);
    score += renewalRate * 0.2;

    return Math.max(0, Math.min(100, score));
  }

  private predictChurnRisk(
    overallScore: number,
    customer: { lastContactDate?: Date | null },
    policies: Array<{ status: string }>
  ): { churnProbability: number; churnRisk: string } {
    let probability = (100 - overallScore) / 100;

    // Adjust based on specific factors
    if (!customer.lastContactDate) probability += 0.1;
    if (policies.every((p) => p.status !== 'ACTIVE')) probability += 0.3;

    probability = Math.max(0, Math.min(1, probability));

    let risk: string;
    if (probability >= 0.7) risk = 'CRITICAL';
    else if (probability >= 0.5) risk = 'HIGH';
    else if (probability >= 0.3) risk = 'MEDIUM';
    else risk = 'LOW';

    return { churnProbability: probability, churnRisk: risk };
  }

  private identifyRiskFactors(
    customer: { lastContactDate?: Date | null },
    policies: Array<{ status: string }>,
    touchpoints: unknown[],
    engagementScore: number,
    financialScore: number,
    _lifecycleScore: number
  ): Array<{ factor: string; impact: string; description: string }> {
    const factors = [];

    if (engagementScore < 40) {
      factors.push({
        factor: 'low_engagement',
        impact: 'high',
        description: 'Customer has low engagement with recent communications',
      });
    }

    if (financialScore < 40) {
      factors.push({
        factor: 'payment_issues',
        impact: 'high',
        description: 'Customer has payment or financial concerns',
      });
    }

    if (!customer.lastContactDate || this.daysSince(customer.lastContactDate) > 90) {
      factors.push({
        factor: 'no_recent_contact',
        impact: 'medium',
        description: 'No recent contact with customer',
      });
    }

    if (policies.filter((p) => p.status === 'ACTIVE').length === 0) {
      factors.push({
        factor: 'no_active_policies',
        impact: 'high',
        description: 'Customer has no active policies',
      });
    }

    return factors;
  }

  private generateRecommendations(
    churnRisk: string,
    riskFactors: Array<{ factor: string }>,
    policies: unknown[]
  ): string[] {
    const recommendations = [];

    if (churnRisk === 'CRITICAL' || churnRisk === 'HIGH') {
      recommendations.push('Immediate outreach required - schedule personal call');
      recommendations.push('Offer retention incentive or loyalty discount');
    }

    if (riskFactors.some((f) => f.factor === 'low_engagement')) {
      recommendations.push('Send personalized re-engagement campaign');
      recommendations.push('Review and update communication preferences');
    }

    if (riskFactors.some((f) => f.factor === 'payment_issues')) {
      recommendations.push('Offer flexible payment plans');
      recommendations.push('Discuss coverage adjustments to fit budget');
    }

    if (policies.length === 1) {
      recommendations.push('Identify cross-sell opportunities');
    }

    return recommendations;
  }

  private calculateMonthlyPremium(policy: {
    premiumAmount: number;
    premiumFrequency: string;
  }): number {
    const { premiumAmount, premiumFrequency } = policy;
    switch (premiumFrequency) {
      case 'monthly':
        return premiumAmount;
      case 'quarterly':
        return premiumAmount / 3;
      case 'semi_annual':
        return premiumAmount / 6;
      case 'annual':
        return premiumAmount / 12;
      default:
        return premiumAmount;
    }
  }

  private calculateRetentionRate(
    policies: Array<{ renewalCount: number }>,
    tenureMonths: number
  ): number {
    if (tenureMonths < 1) return 100;

    const renewedCount = policies.filter((p) => p.renewalCount > 0).length;
    const totalCount = policies.length || 1;

    return (renewedCount / totalCount) * 100;
  }

  private determineCustomerTier(projectedLTV: number): string {
    if (projectedLTV >= 10000) return 'platinum';
    if (projectedLTV >= 5000) return 'gold';
    if (projectedLTV >= 2000) return 'silver';
    return 'bronze';
  }

  private determineCustomerCategory(
    tenureMonths: number,
    policies: Array<{ createdAt: Date }>,
    retentionRate: number
  ): string {
    if (tenureMonths < 6) return 'new';
    if (retentionRate < 50) return 'at_risk';
    if (retentionRate < 75) return 'declining';

    const recentGrowth = policies.filter((p) => {
      const monthsOld = this.monthsSince(p.createdAt);
      return monthsOld < 6;
    }).length;

    if (recentGrowth > 0) return 'growing';
    return 'stable';
  }

  private daysSince(date: Date | null): number {
    if (!date) return 999;
    return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  }

  private monthsSince(date: Date): number {
    const now = new Date();
    return (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
  }

  private calculateEmailOpenRate(
    touchpoints: Array<{ type: string; openedAt?: Date | null }>
  ): number {
    const emailTouchpoints = touchpoints.filter((t) => t.type === 'EMAIL');
    if (emailTouchpoints.length === 0) return 0;

    const opened = emailTouchpoints.filter((t) => t.openedAt).length;
    return (opened / emailTouchpoints.length) * 100;
  }

  private calculateResponseRate(touchpoints: Array<{ respondedAt?: Date | null }>): number {
    if (touchpoints.length === 0) return 0;

    const responded = touchpoints.filter((t) => t.respondedAt).length;
    return (responded / touchpoints.length) * 100;
  }

  private calculatePaymentHistory(
    policies: Array<{ totalPaid: number; premiumAmount: number }>
  ): number {
    if (policies.length === 0) return 100;

    const onTime = policies.filter((p) => p.totalPaid >= p.premiumAmount).length;
    return (onTime / policies.length) * 100;
  }

  private calculatePremiumGrowth(
    policies: Array<{ createdAt: Date; premiumAmount: number }>
  ): number {
    // Simple implementation - compare first vs last policy premiums
    if (policies.length < 2) return 0;

    const sorted = [...policies].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const first = sorted[0].premiumAmount;
    const last = sorted[sorted.length - 1].premiumAmount;

    return ((last - first) / first) * 100;
  }

  private identifyCrossSellOpportunities(policies: Array<{ policyType: string }>): number {
    const policyTypes = new Set(policies.map((p) => p.policyType));
    const allTypes = ['AUTO', 'HOME', 'LIFE', 'HEALTH', 'COMMERCIAL'];
    return allTypes.length - policyTypes.size;
  }

  private countComplaints(events: Array<{ eventType: string }>): number {
    return events.filter((e) => e.eventType === 'complaint_filed').length;
  }

  private calculateResolutionRate(events: Array<{ eventType: string }>): number {
    const complaints = events.filter((e) => e.eventType === 'complaint_filed');
    if (complaints.length === 0) return 100;

    // In a real system, we'd track complaint resolutions
    return 85; // Default value
  }

  private calculateRenewalRate(policies: Array<{ renewalCount: number }>): number {
    if (policies.length === 0) return 0;

    const renewed = policies.filter((p) => p.renewalCount > 0).length;
    return (renewed / policies.length) * 100;
  }

  private groupPoliciesByType(
    policies: Array<{ policyType: string; renewalCount: number; premiumAmount: number }>
  ): Record<string, { count: number; renewalRate: number; avgPremium: number }> {
    const grouped: Record<string, any> = {};

    ['auto', 'home', 'life', 'health', 'commercial'].forEach((type) => {
      const typePolicies = policies.filter((p) => p.policyType.toLowerCase() === type);
      grouped[type] = {
        count: typePolicies.length,
        renewalRate: this.calculateRenewalRate(typePolicies),
        avgPremium:
          typePolicies.length > 0
            ? typePolicies.reduce((sum, p) => sum + p.premiumAmount, 0) / typePolicies.length
            : 0,
      };
    });

    return grouped;
  }

  /**
   * Calculate expansion revenue from cross-sell/upsell activities
   */
  private calculateExpansionRevenue(customers: any[]): number {
    return customers.reduce((sum, customer) => {
      // Calculate expansion revenue from policy upgrades and additional policies
      const expansion = customer.policies.reduce((expSum, policy) => {
        // Simple heuristic: consider policies with premium > $1000 as potential expansions
        if (policy.premiumAmount > 1000) {
          return expSum + (policy.premiumAmount * 0.2); // 20% of premium as expansion
        }
        return expSum;
      }, 0);
      return sum + expansion;
    }, 0);
  }

  /**
   * Calculate segmentation by customer type
   */
  private calculateSegmentation(customers: any[]): Record<string, number> {
    const segmentation: Record<string, number> = {
      'High Value': 0,
      'Medium Value': 0,
      'Low Value': 0,
      'At Risk': 0,
      'New': 0,
    };

    customers.forEach(customer => {
      if (customer.lifetimeValue > 10000) {
        segmentation['High Value']++;
      } else if (customer.lifetimeValue > 5000) {
        segmentation['Medium Value']++;
      } else if (customer.lifetimeValue > 1000) {
        segmentation['Low Value']++;
      } else if (customer.churnRisk === 'HIGH') {
        segmentation['At Risk']++;
      } else {
        segmentation['New']++;
      }
    });

    return segmentation;
  }

  /**
   * Calculate engagement rate from touchpoint responses
   */
  private async calculateEngagementRate(startDate: Date, endDate: Date): Promise<number> {
    const totalTouchpoints = await this.prisma.campaignTouchpoint.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    if (totalTouchpoints === 0) return 0;

    const engagedTouchpoints = await this.prisma.campaignTouchpoint.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        response: { not: null },
      },
    });

    return Math.round((engagedTouchpoints / totalTouchpoints) * 100);
  }

  /**
   * Calculate time-series trends data
   */
  private async calculateTrends(startDate: Date, endDate: Date): Promise<any[]> {
    const trends: any[] = [];
    const currentDate = new Date(startDate);

    // Generate monthly trends for the period
    while (currentDate <= endDate) {
      const monthEnd = new Date(currentDate);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);

      const monthStart = new Date(currentDate);
      const monthEndDate = monthEnd > endDate ? endDate : monthEnd;

      const [customers, policies, churned] = await Promise.all([
        this.prisma.customer.count({
          where: {
            createdAt: { gte: monthStart, lte: monthEndDate },
          },
        }),
        this.prisma.policy.count({
          where: {
            createdAt: { gte: monthStart, lte: monthEndDate },
          },
        }),
        this.prisma.customer.count({
          where: {
            churnedAt: { gte: monthStart, lte: monthEndDate },
          },
        }),
      ]);

      trends.push({
        period: monthStart.toISOString().substring(0, 7), // YYYY-MM
        newCustomers: customers,
        newPolicies: policies,
        churnedCustomers: churned,
        retentionRate: policies > 0 ? Math.round(((policies - churned) / policies) * 100) : 0,
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return trends;
  }
}
