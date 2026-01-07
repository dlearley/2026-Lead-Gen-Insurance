import { PrismaClient } from '@prisma/client';
import {
  FinancialPlan,
  FinancialGoal,
  PlanStatus,
  GoalStatus,
  CreateFinancialPlanRequest,
} from '@insurance-lead-gen/types';
import { Logger } from '../../logger.js';
import { AppError } from '../../errors.js';

/**
 * FinancialPlanningService - Manages financial plans and goals
 */
export class FinancialPlanningService {
  constructor(
    private prisma: PrismaClient,
    private logger: Logger
  ) {}

  /**
   * Create a new financial plan
   */
  async createPlan(request: CreateFinancialPlanRequest): Promise<FinancialPlan> {
    try {
      this.logger.info('Creating financial plan', { customerId: request.customerId });

      const plan = await this.prisma.financialPlan.create({
        data: {
          customerId: request.customerId,
          advisorId: request.advisorId,
          planType: request.planType || 'COMPREHENSIVE',
          status: 'DRAFT' as PlanStatus,
          creationDate: new Date(),
          goals: request.goals || [],
          recommendations: [],
        },
      });

      this.logger.info('Financial plan created successfully', { planId: plan.id });
      return plan;
    } catch (error) {
      this.logger.error('Failed to create financial plan', { error, request });
      throw new AppError('Failed to create financial plan', 500);
    }
  }

  /**
   * Get plan by ID
   */
  async getPlanById(planId: string): Promise<FinancialPlan | null> {
    try {
      return await this.prisma.financialPlan.findUnique({
        where: { id: planId },
        include: {
          goals: true,
        },
      });
    } catch (error) {
      this.logger.error('Failed to get plan', { error, planId });
      throw new AppError('Failed to retrieve financial plan', 500);
    }
  }

  /**
   * Get plans for a customer
   */
  async getCustomerPlans(customerId: string): Promise<FinancialPlan[]> {
    try {
      return await this.prisma.financialPlan.findMany({
        where: { customerId },
        include: {
          goals: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Failed to get customer plans', { error, customerId });
      throw new AppError('Failed to retrieve customer plans', 500);
    }
  }

  /**
   * Update plan status and details
   */
  async updatePlan(
    planId: string,
    data: Partial<{
      status: PlanStatus;
      planType: string;
      recommendations: Array<any>;
      goals: Array<any>;
      nextReviewDate: Date;
    }>
  ): Promise<FinancialPlan> {
    try {
      this.logger.info('Updating financial plan', { planId });

      const updateData: any = { ...data };

      if (data.status === 'COMPLETED') {
        updateData.lastReviewDate = new Date();
      }

      const plan = await this.prisma.financialPlan.update({
        where: { id: planId },
        data: updateData,
      });

      this.logger.info('Financial plan updated successfully', { planId });
      return plan;
    } catch (error) {
      this.logger.error('Failed to update plan', { error, planId });
      throw new AppError('Failed to update financial plan', 500);
    }
  }

  /**
   * Create a financial goal
   */
  async createGoal(data: {
    customerId: string;
    goalType?: string;
    goalDescription?: string;
    targetAmount?: number;
    targetDate?: Date;
    priorityLevel?: number;
  }): Promise<FinancialGoal> {
    try {
      this.logger.info('Creating financial goal', { customerId: data.customerId });

      const goal = await this.prisma.financialGoal.create({
        data: {
          customerId: data.customerId,
          goalType: data.goalType,
          goalDescription: data.goalDescription,
          targetAmount: data.targetAmount,
          targetDate: data.targetDate,
          priorityLevel: data.priorityLevel || 3,
          currentProgress: 0,
          status: 'NOT_STARTED' as GoalStatus,
        },
      });

      this.logger.info('Financial goal created successfully', { goalId: goal.id });
      return goal;
    } catch (error) {
      this.logger.error('Failed to create financial goal', { error, data });
      throw new AppError('Failed to create financial goal', 500);
    }
  }

  /**
   * Get goals for a customer
   */
  async getCustomerGoals(customerId: string): Promise<FinancialGoal[]> {
    try {
      return await this.prisma.financialGoal.findMany({
        where: { customerId },
        orderBy: [
          { priorityLevel: 'asc' },
          { targetDate: 'asc' },
        ],
      });
    } catch (error) {
      this.logger.error('Failed to get customer goals', { error, customerId });
      throw new AppError('Failed to retrieve customer goals', 500);
    }
  }

  /**
   * Get goal progress
   */
  async getGoalProgress(goalId: string): Promise<{
    goal: FinancialGoal;
    progressPercentage: number;
    daysRemaining: number;
    status: GoalStatus;
  }> {
    try {
      const goal = await this.prisma.financialGoal.findUnique({
        where: { id: goalId },
      });

      if (!goal) {
        throw new AppError('Goal not found', 404);
      }

      const progressPercentage = goal.targetAmount 
        ? (goal.currentProgress / goal.targetAmount) * 100 
        : 0;

      const daysRemaining = goal.targetDate 
        ? Math.ceil((goal.targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;

      let status = goal.status;
      if (progressPercentage >= 100) {
        status = 'COMPLETED' as GoalStatus;
      } else if (daysRemaining < 30 && progressPercentage < 80) {
        status = 'AT_RISK' as GoalStatus;
      } else if (progressPercentage > 0) {
        status = 'IN_PROGRESS' as GoalStatus;
      }

      return {
        goal,
        progressPercentage,
        daysRemaining,
        status,
      };
    } catch (error) {
      this.logger.error('Failed to get goal progress', { error, goalId });
      throw new AppError('Failed to retrieve goal progress', 500);
    }
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(
    goalId: string,
    currentProgress: number,
    status?: GoalStatus
  ): Promise<FinancialGoal> {
    try {
      this.logger.info('Updating goal progress', { goalId, currentProgress });

      const goal = await this.prisma.financialGoal.update({
        where: { id: goalId },
        data: {
          currentProgress,
          status: status,
          updatedAt: new Date(),
        },
      });

      this.logger.info('Goal progress updated successfully', { goalId });
      return goal;
    } catch (error) {
      this.logger.error('Failed to update goal progress', { error, goalId });
      throw new AppError('Failed to update goal progress', 500);
    }
  }

  /**
   * Add recommendation to plan
   */
  async addRecommendation(
    planId: string,
    recommendation: {
      recommendationType: string;
      description: string;
      priority: number;
      dueDate?: Date;
      productId?: string;
    }
  ): Promise<FinancialPlan> {
    try {
      const plan = await this.prisma.financialPlan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        throw new AppError('Plan not found', 404);
      }

      const recommendations = plan.recommendations || [];
      recommendations.push(recommendation);

      const updatedPlan = await this.prisma.financialPlan.update({
        where: { id: planId },
        data: {
          recommendations,
          updatedAt: new Date(),
        },
      });

      return updatedPlan;
    } catch (error) {
      this.logger.error('Failed to add recommendation', { error, planId });
      throw new AppError('Failed to add recommendation', 500);
    }
  }

  /**
   * Generate plan review schedule
   */
  generateReviewSchedule(plan: FinancialPlan): Date[] {
    const schedule: Date[] = [];
    const startDate = plan.creationDate || new Date();
    
    // Schedule reviews every 6 months for 5 years
    for (let i = 1; i <= 10; i++) {
      const reviewDate = new Date(startDate);
      reviewDate.setMonth(reviewDate.getMonth() + (i * 6));
      schedule.push(reviewDate);
    }

    return schedule;
  }

  /**
   * Calculate financial health score
   */
  calculateFinancialHealthScore(
    goals: FinancialGoal[],
    accounts: Array<{ balance: number }>
  ): number {
    const totalTarget = goals.reduce((sum, goal) => sum + (goal.targetAmount || 0), 0);
    const totalProgress = goals.reduce((sum, goal) => sum + goal.currentProgress, 0);
    const totalBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0);

    const savingsRate = totalTarget > 0 ? totalProgress / totalTarget : 0;
    const coverageRatio = totalTarget > 0 ? totalBalance / totalTarget : 0;
    const goalCompletion = goals.filter(g => g.status === 'COMPLETED').length / goals.length;

    // Weighted score calculation
    const score = (savingsRate * 0.3 + coverageRatio * 0.4 + goalCompletion * 0.3) * 100;
    
    return Math.round(Math.min(Math.max(score, 0), 100));
  }
}