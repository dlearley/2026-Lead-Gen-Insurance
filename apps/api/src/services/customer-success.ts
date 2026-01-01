import { PrismaClient } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import type {
  Customer,
  CustomerSuccessProfile,
  SuccessPlan,
  HealthScore,
  BusinessReview,
  AdvocacyActivity,
  CustomerSuccessMetrics,
  CreateCustomerDto,
  UpdateCustomerDto,
  CreateSuccessPlanDto,
  CreateHealthScoreDto,
  CreateBusinessReviewDto,
  CreateAdvocacyActivityDto,
  CustomerFilterParams,
  HealthScoreInput,
  HealthScoreResult,
  CustomerStatistics,
  OnboardingMetrics,
  AdvocacyMetrics,
  ExpansionOpportunity,
  HealthScoreAlert,
} from '@insurance-lead-gen/types';

const prisma = new PrismaClient();

/**
 * Customer Success Service
 * Handles all customer success operations including health scoring, success plans, and advocacy
 */
export const customerSuccessService = {
  // ========================================
  // Customer CRUD Operations
  // ========================================

  /**
   * Get all customers with optional filters
   */
  async getCustomers(filters: CustomerFilterParams = {}) {
    const {
      tier,
      status,
      healthScoreMin,
      healthScoreMax,
      churnRiskLevel,
      csmId,
      onboardingStatus,
      search,
      customerSinceFrom,
      customerSinceTo,
      contractRenewalFrom,
      contractRenewalTo,
      tags,
      page = 1,
      limit = 20,
    } = filters;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (tier) {
      where.tier = Array.isArray(tier) ? { in: tier } : tier;
    }

    if (status) {
      where.status = Array.isArray(status) ? { in: status } : status;
    }

    if (healthScoreMin !== undefined || healthScoreMax !== undefined) {
      where.healthScore = {};
      if (healthScoreMin !== undefined) where.healthScore.gte = healthScoreMin;
      if (healthScoreMax !== undefined) where.healthScore.lte = healthScoreMax;
    }

    if (churnRiskLevel) {
      where.churnRiskLevel = Array.isArray(churnRiskLevel)
        ? { in: churnRiskLevel }
        : churnRiskLevel;
    }

    if (csmId) {
      where.successProfile = { csmId };
    }

    if (onboardingStatus) {
      where.successProfile = { ...where.successProfile, onboardingStatus };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (customerSinceFrom || customerSinceTo) {
      where.customerSince = {};
      if (customerSinceFrom) where.customerSince.gte = customerSinceFrom;
      if (customerSinceTo) where.customerSince.lte = customerSinceTo;
    }

    if (contractRenewalFrom || contractRenewalTo) {
      where.nextRenewalDate = {};
      if (contractRenewalFrom) where.nextRenewalDate.gte = contractRenewalFrom;
      if (contractRenewalTo) where.nextRenewalDate.lte = contractRenewalTo;
    }

    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          successProfile: true,
          _count: {
            select: {
              successPlans: true,
              businessReviews: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Get customer by ID
   */
  async getCustomerById(id: string): Promise<Customer | null> {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        successProfile: true,
        successPlans: {
          where: { status: 'ACTIVE' },
          include: { milestones: true },
          orderBy: { startDate: 'desc' },
          take: 1,
        },
        healthScores: {
          orderBy: { recordedAt: 'desc' },
          take: 5,
        },
        businessReviews: {
          orderBy: { reviewDate: 'desc' },
          take: 3,
        },
      },
    });

    return customer as Customer | null;
  },

  /**
   * Create a new customer
   */
  async createCustomer(data: CreateCustomerDto): Promise<Customer> {
    const customer = await prisma.customer.create({
      data: {
        ...data,
        // Create initial success profile
        successProfile: {
          create: {
            primaryObjective: data.metadata?.primaryObjective as string | undefined,
            secondaryObjectives: data.metadata?.secondaryObjectives as string[] || [],
            targetMetrics: data.metadata?.targetMetrics as Record<string, unknown> | undefined,
          },
        },
      },
      include: { successProfile: true },
    });

    logger.info('Customer created', { customerId: customer.id });

    return customer as Customer;
  },

  /**
   * Update customer
   */
  async updateCustomer(id: string, data: UpdateCustomerDto): Promise<Customer> {
    const customer = await prisma.customer.update({
      where: { id },
      data,
      include: { successProfile: true },
    });

    logger.info('Customer updated', { customerId: id });

    return customer as Customer;
  },

  /**
   * Delete customer (soft delete by updating status)
   */
  async deleteCustomer(id: string): Promise<void> {
    await prisma.customer.update({
      where: { id },
      data: { status: 'CHURNED' },
    });

    logger.info('Customer deleted', { customerId: id });
  },

  // ========================================
  // Customer Success Profile Operations
  // ========================================

  /**
   * Get customer success profile
   */
  async getCustomerSuccessProfile(customerId: string): Promise<CustomerSuccessProfile | null> {
    const profile = await prisma.customerSuccessProfile.findUnique({
      where: { customerId },
    });

    return profile as CustomerSuccessProfile | null;
  },

  /**
   * Update customer success profile
   */
  async updateCustomerSuccessProfile(customerId: string, data: any): Promise<CustomerSuccessProfile> {
    const profile = await prisma.customerSuccessProfile.upsert({
      where: { customerId },
      update: data,
      create: { customerId, ...data },
    });

    logger.info('Customer success profile updated', { customerId });

    return profile as CustomerSuccessProfile;
  },

  // ========================================
  // Health Score Operations
  // ========================================

  /**
   * Get health score history for customer
   */
  async getCustomerHealthScores(customerId: string, limit: number = 10) {
    const healthScores = await prisma.healthScore.findMany({
      where: { customerId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });

    return healthScores;
  },

  /**
   * Create a new health score entry
   */
  async createHealthScore(data: CreateHealthScoreDto): Promise<HealthScore> {
    const { customerId, engagementScore, successScore, satisfactionScore, financialScore, score, ...rest } = data;

    const healthLevel = this.calculateHealthLevel(score);

    const healthScore = await prisma.healthScore.create({
      data: {
        customerId,
        engagementScore: engagementScore || 0,
        successScore: successScore || 0,
        satisfactionScore: satisfactionScore || 0,
        financialScore: financialScore || 0,
        score,
        healthLevel,
        ...rest,
      },
    });

    // Update customer's current health score
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        healthScore: score,
        churnRiskLevel: this.calculateChurnRisk(healthLevel),
      },
    });

    logger.info('Health score created', { customerId, score, healthLevel });

    return healthScore as HealthScore;
  },

  /**
   * Calculate health score from component scores
   */
  async calculateHealthScore(input: HealthScoreInput): Promise<HealthScoreResult> {
    const { engagementScore, successScore, satisfactionScore, financialScore } = input;

    // Calculate weighted score
    const totalScore = Math.round(
      engagementScore * 0.3 +
      successScore * 0.3 +
      satisfactionScore * 0.2 +
      financialScore * 0.2
    );

    const healthLevel = this.calculateHealthLevel(totalScore);

    // Calculate trend by comparing with previous score
    const previousScore = await prisma.healthScore.findFirst({
      where: { customerId: input.customerId },
      orderBy: { recordedAt: 'desc' },
      take: 1,
    });

    let trend: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'UNKNOWN' = 'UNKNOWN';
    if (previousScore) {
      const diff = totalScore - previousScore.score;
      if (diff > 5) trend = 'IMPROVING';
      else if (diff < -5) trend = 'DECLINING';
      else trend = 'STABLE';
    }

    return {
      totalScore,
      healthLevel,
      engagementScore,
      successScore,
      satisfactionScore,
      financialScore,
      trend,
    };
  },

  /**
   * Calculate health level from score
   */
  private calculateHealthLevel(score: number): 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT' {
    if (score >= 80) return 'EXCELLENT';
    if (score >= 60) return 'GOOD';
    if (score >= 40) return 'FAIR';
    return 'POOR';
  },

  /**
   * Calculate churn risk from health level
   */
  private calculateChurnRisk(healthLevel: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    switch (healthLevel) {
      case 'EXCELLENT':
        return 'LOW';
      case 'GOOD':
        return 'LOW';
      case 'FAIR':
        return 'MEDIUM';
      case 'POOR':
        return 'HIGH';
      default:
        return 'LOW';
    }
  },

  /**
   * Get health score alerts for CSMs
   */
  async getHealthScoreAlerts(csmId?: string): Promise<HealthScoreAlert[]> {
    const alerts: HealthScoreAlert[] = [];

    // Find customers with significant health score drops
    const customers = await prisma.customer.findMany({
      where: csmId
        ? {
            successProfile: { csmId },
          }
        : undefined,
      include: {
        successProfile: true,
        healthScores: {
          orderBy: { recordedAt: 'desc' },
          take: 2,
        },
      },
    });

    for (const customer of customers) {
      const healthScores = customer.healthScores;
      if (healthScores.length < 2) continue;

      const currentScore = healthScores[0];
      const previousScore = healthScores[1];
      const scoreDiff = currentScore.score - previousScore.score;

      // Significant drop
      if (scoreDiff < -10) {
        alerts.push({
          customerId: customer.id,
          customerName: customer.name,
          currentScore: currentScore.score,
          previousScore: previousScore.score,
          healthLevel: currentScore.healthLevel as any,
          trend: 'DECLINING',
          alertType: 'SIGNIFICANT_DROP',
          timestamp: currentScore.recordedAt,
          csmId: customer.successProfile?.csmId,
          csmEmail: customer.successProfile?.csmEmail,
        });
      }

      // Below threshold
      if (currentScore.score < 60 && previousScore.score >= 60) {
        alerts.push({
          customerId: customer.id,
          customerName: customer.name,
          currentScore: currentScore.score,
          previousScore: previousScore.score,
          healthLevel: currentScore.healthLevel as any,
          trend: 'DECLINING',
          alertType: 'BELOW_THRESHOLD',
          timestamp: currentScore.recordedAt,
          csmId: customer.successProfile?.csmId,
          csmEmail: customer.successProfile?.csmEmail,
        });
      }

      // Red zone
      if (currentScore.score < 40) {
        alerts.push({
          customerId: customer.id,
          customerName: customer.name,
          currentScore: currentScore.score,
          previousScore: previousScore.score,
          healthLevel: currentScore.healthLevel as any,
          trend: currentScore.trend as any,
          alertType: 'RED_ZONE',
          timestamp: currentScore.recordedAt,
          csmId: customer.successProfile?.csmId,
          csmEmail: customer.successProfile?.csmEmail,
        });
      }
    }

    return alerts;
  },

  // ========================================
  // Success Plan Operations
  // ========================================

  /**
   * Get success plans for customer
   */
  async getCustomerSuccessPlans(customerId: string): Promise<SuccessPlan[]> {
    const successPlans = await prisma.successPlan.findMany({
      where: { customerId },
      include: { milestones: true },
      orderBy: { startDate: 'desc' },
    });

    return successPlans as SuccessPlan[];
  },

  /**
   * Get success plan by ID
   */
  async getSuccessPlanById(planId: string): Promise<SuccessPlan | null> {
    const successPlan = await prisma.successPlan.findUnique({
      where: { id: planId },
      include: { milestones: true },
    });

    return successPlan as SuccessPlan | null;
  },

  /**
   * Create a new success plan
   */
  async createSuccessPlan(data: CreateSuccessPlanDto): Promise<SuccessPlan> {
    const { milestones, ...planData } = data;

    const successPlan = await prisma.successPlan.create({
      data: {
        ...planData,
        milestones: milestones
          ? {
              create: milestones,
            }
          : undefined,
      },
      include: { milestones: true },
    });

    logger.info('Success plan created', { customerId: data.customerId, planId: successPlan.id });

    return successPlan as SuccessPlan;
  },

  /**
   * Update success plan
   */
  async updateSuccessPlan(planId: string, data: any): Promise<SuccessPlan> {
    const successPlan = await prisma.successPlan.update({
      where: { id: planId },
      data,
      include: { milestones: true },
    });

    logger.info('Success plan updated', { planId });

    return successPlan as SuccessPlan;
  },

  /**
   * Add milestone to success plan
   */
  async addMilestone(planId: string, data: any): Promise<any> {
    const milestone = await prisma.successPlanMilestone.create({
      data: {
        successPlanId: planId,
        ...data,
      },
    });

    logger.info('Milestone added', { planId, milestoneId: milestone.id });

    return milestone;
  },

  /**
   * Update milestone
   */
  async updateMilestone(milestoneId: string, data: any): Promise<any> {
    const milestone = await prisma.successPlanMilestone.update({
      where: { id: milestoneId },
      data,
    });

    logger.info('Milestone updated', { milestoneId });

    return milestone;
  },

  // ========================================
  // Business Review Operations
  // ========================================

  /**
   * Get business reviews for customer
   */
  async getCustomerBusinessReviews(customerId: string, reviewType?: string): Promise<BusinessReview[]> {
    const where: any = { customerId };
    if (reviewType) {
      where.reviewType = reviewType;
    }

    const businessReviews = await prisma.businessReview.findMany({
      where,
      orderBy: { reviewDate: 'desc' },
    });

    return businessReviews as BusinessReview[];
  },

  /**
   * Create a new business review
   */
  async createBusinessReview(data: CreateBusinessReviewDto): Promise<BusinessReview> {
    const businessReview = await prisma.businessReview.create({
      data,
    });

    logger.info('Business review created', { customerId: data.customerId, reviewId: businessReview.id });

    return businessReview as BusinessReview;
  },

  /**
   * Update business review
   */
  async updateBusinessReview(reviewId: string, data: any): Promise<BusinessReview> {
    const businessReview = await prisma.businessReview.update({
      where: { id: reviewId },
      data,
    });

    logger.info('Business review updated', { reviewId });

    return businessReview as BusinessReview;
  },

  // ========================================
  // Advocacy Operations
  // ========================================

  /**
   * Get advocacy activities for customer
   */
  async getCustomerAdvocacyActivities(
    customerId: string,
    activityType?: string,
    status?: string
  ): Promise<AdvocacyActivity[]> {
    const where: any = { customerId };
    if (activityType) {
      where.activityType = activityType;
    }
    if (status) {
      where.status = status;
    }

    const activities = await prisma.advocacyActivity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return activities as AdvocacyActivity[];
  },

  /**
   * Create a new advocacy activity
   */
  async createAdvocacyActivity(data: CreateAdvocacyActivityDto): Promise<AdvocacyActivity> {
    const activity = await prisma.advocacyActivity.create({
      data,
    });

    logger.info('Advocacy activity created', { customerId: data.customerId, activityId: activity.id });

    return activity as AdvocacyActivity;
  },

  /**
   * Update advocacy activity
   */
  async updateAdvocacyActivity(activityId: string, data: any): Promise<AdvocacyActivity> {
    const activity = await prisma.advocacyActivity.update({
      where: { id: activityId },
      data,
    });

    logger.info('Advocacy activity updated', { activityId });

    return activity as AdvocacyActivity;
  },

  // ========================================
  // Statistics & Analytics
  // ========================================

  /**
   * Get customer success statistics
   */
  async getStatistics(): Promise<CustomerStatistics> {
    const [
      totalCustomers,
      customersByTier,
      customersByStatus,
      avgHealthScore,
      totalRevenue,
      totalLTV,
      avgAdoption,
      avgNPS,
      avgCSAT,
    ] = await Promise.all([
      prisma.customer.count({ where: { status: { in: ['ACTIVE', 'ONBOARDING'] } } }),
      prisma.customer.groupBy({
        by: ['tier'],
        where: { status: { in: ['ACTIVE', 'ONBOARDING'] } },
        _count: true,
      }),
      prisma.customer.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.customer.aggregate({
        where: { status: { in: ['ACTIVE', 'ONBOARDING'] } },
        _avg: { healthScore: true },
      }),
      prisma.customer.aggregate({
        where: { status: { in: ['ACTIVE', 'ONBOARDING'] } },
        _sum: { annualContractValue: true },
      }),
      prisma.customer.aggregate({
        where: { status: { in: ['ACTIVE', 'ONBOARDING'] } },
        _sum: { lifetimeValue: true },
      }),
      prisma.customerSuccessProfile.aggregate({
        _avg: { adoptionRate: true },
      }),
      prisma.customerSuccessProfile.aggregate({
        where: { latestNPS: { not: null } },
        _avg: { latestNPS: true },
      }),
      prisma.customerSuccessProfile.aggregate({
        where: { latestCSAT: { not: null } },
        _avg: { latestCSAT: true },
      }),
    ]);

    const tierCounts: Record<string, number> = {
      ENTERPRISE: 0,
      MID_MARKET: 0,
      SMALL_BUSINESS: 0,
      TRIAL: 0,
    };
    customersByTier.forEach((group) => {
      tierCounts[group.tier] = group._count;
    });

    const statusCounts: Record<string, number> = {
      ACTIVE: 0,
      ONBOARDING: 0,
      AT_RISK: 0,
      CHURNED: 0,
      PAUSED: 0,
    };
    customersByStatus.forEach((group) => {
      statusCounts[group.status] = group._count;
    });

    return {
      totalCustomers,
      customersByTier: tierCounts as any,
      customersByStatus: statusCounts as any,
      averageHealthScore: Math.round(avgHealthScore._avg.healthScore || 0),
      totalAnnualRevenue: totalRevenue._sum.annualContractValue || 0,
      totalLifetimeValue: totalLTV._sum.lifetimeValue || 0,
      atRiskCustomers: statusCounts.AT_RISK,
      churnedCustomers: statusCounts.CHURNED,
      customersOnboarding: statusCounts.ONBOARDING,
      averageAdoptionRate: Math.round((avgAdoption._avg.adoptionRate || 0) * 100) / 100,
      averageNPS: Math.round(avgNPS._avg.latestNPS || 0),
      averageCSAT: Math.round((avgCSAT._avg.latestCSAT || 0) * 100) / 100,
    };
  },

  /**
   * Get onboarding metrics
   */
  async getOnboardingMetrics(): Promise<OnboardingMetrics> {
    const [
      totalOnboarding,
      completedOnboarding,
      avgTTV,
      customers,
    ] = await Promise.all([
      prisma.customerSuccessProfile.count({
        where: { onboardingStatus: { in: ['IN_PROGRESS', 'COMPLETED'] } },
      }),
      prisma.customerSuccessProfile.count({
        where: { onboardingStatus: 'COMPLETED' },
      }),
      prisma.customerSuccessProfile.aggregate({
        where: { onboardingStatus: 'COMPLETED', timeToValue: { not: null } },
        _avg: { timeToValue: true },
      }),
      prisma.customerSuccessProfile.findMany({
        where: { onboardingStatus: { in: ['IN_PROGRESS', 'COMPLETED'] } },
        select: {
          onboardingStartDate: true,
          onboardingEndDate: true,
          trainingCompleted: true,
        },
      }),
    ]);

    // Calculate average onboarding duration
    const completedProfiles = customers.filter((p) => p.onboardingEndDate);
    const avgDuration =
      completedProfiles.length > 0
        ? completedProfiles.reduce((acc, p) => {
            const duration =
              p.onboardingEndDate && p.onboardingStartDate
                ? Math.floor(
                    (p.onboardingEndDate.getTime() - p.onboardingStartDate.getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : 0;
            return acc + duration;
          }, 0) / completedProfiles.length
        : 0;

    const trainingCompletionRate =
      customers.length > 0
        ? (customers.filter((p) => p.trainingCompleted).length / customers.length) * 100
        : 0;

    const onboardingSuccessRate =
      totalOnboarding > 0 ? (completedOnboarding / totalOnboarding) * 100 : 0;

    return {
      totalOnboarding,
      completedOnboarding,
      averageTimeToValue: Math.round(avgTTV._avg.timeToValue || 0),
      averageOnboardingDuration: Math.round(avgDuration),
      trainingCompletionRate: Math.round(trainingCompletionRate * 100) / 100,
      onboardingSuccessRate: Math.round(onboardingSuccessRate * 100) / 100,
    };
  },

  /**
   * Get advocacy metrics
   */
  async getAdvocacyMetrics(): Promise<AdvocacyMetrics> {
    const [
      totalAdvocates,
      completedCaseStudies,
      completedTestimonials,
      completedReferenceCalls,
      inProgress,
      totalActivities,
    ] = await Promise.all([
      prisma.customer.count({
        where: {
          AND: [
            { status: 'ACTIVE' },
            {
              advocacyActivities: {
                some: { status: 'COMPLETED' },
              },
            },
          ],
        },
      }),
      prisma.advocacyActivity.count({
        where: { activityType: 'CASE_STUDY', status: 'COMPLETED' },
      }),
      prisma.advocacyActivity.count({
        where: { activityType: 'TESTIMONIAL', status: 'COMPLETED' },
      }),
      prisma.advocacyActivity.count({
        where: { activityType: 'REFERENCE_CALL', status: 'COMPLETED' },
      }),
      prisma.advocacyActivity.count({
        where: { status: 'IN_PROGRESS' },
      }),
      prisma.advocacyActivity.count(),
    ]);

    const advocacySuccessRate =
      totalActivities > 0
        ? ((totalActivities - inProgress) / totalActivities) * 100
        : 0;

    return {
      totalAdvocates,
      caseStudiesPublished: completedCaseStudies,
      testimonialsCollected: completedTestimonials,
      referenceCallsCompleted: completedReferenceCalls,
      advocacyActivitiesInProgress: inProgress,
      advocacySuccessRate: Math.round(advocacySuccessRate * 100) / 100,
    };
  },

  /**
   * Get expansion opportunities
   */
  async getExpansionOpportunities(csmId?: string): Promise<ExpansionOpportunity[]> {
    const opportunities: ExpansionOpportunity[] = [];

    const customers = await prisma.customer.findMany({
      where: {
        AND: [
          { status: 'ACTIVE' },
          csmId
            ? {
                successProfile: { csmId },
              }
            : undefined,
        ],
      },
      include: { successProfile: true },
    });

    for (const customer of customers) {
      const profile = customer.successProfile;

      // Check if customer is approaching tier limits
      if (
        profile?.expansionProbability &&
        profile.expansionProbability > 0.5
      ) {
        let potentialTier = customer.tier;
        const reason = profile.opportunityNotes || 'High engagement and satisfaction';

        if (customer.tier === 'SMALL_BUSINESS') {
          potentialTier = 'MID_MARKET';
        } else if (customer.tier === 'MID_MARKET') {
          potentialTier = 'ENTERPRISE';
        }

        if (potentialTier !== customer.tier) {
          opportunities.push({
            customerId: customer.id,
            customerName: customer.name,
            currentTier: customer.tier,
            potentialTier,
            reason,
            estimatedAdditionalRevenue: customer.annualContractValue * 0.5,
            probability: profile.expansionProbability,
            suggestedActions: [
              'Schedule strategic business review',
              'Identify additional use cases',
              'Present expansion proposal',
              'Engage executive sponsor',
            ],
            lastReviewed: customer.updatedAt,
          });
        }
      }
    }

    return opportunities;
  },
};
