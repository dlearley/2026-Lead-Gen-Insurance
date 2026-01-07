import { PrismaClient } from '@prisma/client';
import {
  WellnessProgram,
  WellnessEnrollment,
  WellnessActivity,
  WellnessStatus,
  CreateWellnessProgramRequest,
} from '@insurance-lead-gen/types';
import { Logger } from '../../logger.js';
import { AppError } from '../../errors.js';

/**
 * FinancialWellnessService - Manages financial wellness programs and progress tracking
 */
export class FinancialWellnessService {
  constructor(
    private prisma: PrismaClient,
    private logger: Logger
  ) {}

  /**
   * Create a new wellness program
   */
  async createProgram(request: CreateWellnessProgramRequest): Promise<WellnessProgram> {
    try {
      this.logger.info('Creating wellness program', { programName: request.programName });

      const program = await this.prisma.wellnessProgram.create({
        data: {
          programName: request.programName,
          description: request.description,
          programType: request.programType || 'EDUCATION',
          targetSegments: request.targetSegments || {},
          status: 'ACTIVE' as WellnessStatus,
        },
      });

      this.logger.info('Wellness program created successfully', { programId: program.id });
      return program;
    } catch (error) {
      this.logger.error('Failed to create wellness program', { error, request });
      throw new AppError('Failed to create wellness program', 500);
    }
  }

  /**
   * Get wellness program by ID
   */
  async getProgramById(programId: string): Promise<WellnessProgram | null> {
    try {
      return await this.prisma.wellnessProgram.findUnique({
        where: { id: programId },
      });
    } catch (error) {
      this.logger.error('Failed to get wellness program', { error, programId });
      throw new AppError('Failed to retrieve wellness program', 500);
    }
  }

  /**
   * Get all active wellness programs
   */
  async getActivePrograms(): Promise<WellnessProgram[]> {
    try {
      return await this.prisma.wellnessProgram.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Failed to get wellness programs', { error });
      throw new AppError('Failed to retrieve wellness programs', 500);
    }
  }

  /**
   * Enroll a customer in a wellness program
   */
  async enrollCustomer(
    customerId: string,
    programId: string
  ): Promise<WellnessEnrollment> {
    try {
      this.logger.info('Enrolling customer in wellness program', { 
        customerId, 
        programId 
      });

      // Check if already enrolled
      const existingEnrollment = await this.prisma.wellnessEnrollment.findFirst({
        where: {
          customerId,
          programId,
          status: 'ACTIVE',
        },
      });

      if (existingEnrollment) {
        throw new AppError('Customer already enrolled in this program', 400);
      }

      const enrollment = await this.prisma.wellnessEnrollment.create({
        data: {
          customerId,
          programId,
          completionStatus: 0,
          score: 0,
          status: 'ACTIVE' as WellnessStatus,
        },
      });

      this.logger.info('Customer enrolled successfully', { enrollmentId: enrollment.id });
      return enrollment;
    } catch (error) {
      this.logger.error('Failed to enroll customer', { error, customerId, programId });
      throw new AppError('Failed to enroll customer in program', 500);
    }
  }

  /**
   * Get customer wellness enrollment
   */
  async getCustomerEnrollment(customerId: string, programId: string): Promise<WellnessEnrollment | null> {
    try {
      return await this.prisma.wellnessEnrollment.findFirst({
        where: {
          customerId,
          programId,
        },
      });
    } catch (error) {
      this.logger.error('Failed to get enrollment', { error, customerId, programId });
      throw new AppError('Failed to retrieve enrollment', 500);
    }
  }

  /**
   * Log wellness activity
   */
  async logActivity(
    enrollmentId: string,
    activity: {
      activityType: string;
      activityName: string;
      pointsEarned: number;
    }
  ): Promise<WellnessActivity> {
    try {
      this.logger.info('Logging wellness activity', { enrollmentId });

      // Check if enrollment exists
      const enrollment = await this.prisma.wellnessEnrollment.findUnique({
        where: { id: enrollmentId },
      });

      if (!enrollment) {
        throw new AppError('Enrollment not found', 404);
      }

      const activityLogged = await this.prisma.wellnessActivity.create({
        data: {
          enrollmentId,
          activityType: activity.activityType,
          activityName: activity.activityName,
          pointsEarned: activity.pointsEarned,
          completedDate: new Date(),
        },
      });

      // Update enrollment progress
      await this.updateEnrollmentProgress(enrollmentId);

      this.logger.info('Wellness activity logged successfully', { activityId: activityLogged.id });
      return activityLogged;
    } catch (error) {
      this.logger.error('Failed to log activity', { error, enrollmentId });
      throw new AppError('Failed to log wellness activity', 500);
    }
  }

  /**
   * Update enrollment progress
   */
  async updateEnrollmentProgress(enrollmentId: string): Promise<WellnessEnrollment> {
    try {
      const activities = await this.prisma.wellnessActivity.findMany({
        where: { enrollmentId },
      });

      const totalPoints = activities.reduce((sum, activity) => sum + activity.pointsEarned, 0);
      const maxPoints = 1000; // Assuming 1000 points max per enrollment
      const completionStatus = Math.min((totalPoints / maxPoints) * 100, 100);
      const score = Math.round(completionStatus);

      const status = completionStatus >= 100 ? 'COMPLETED' : 'ACTIVE';

      return await this.prisma.wellnessEnrollment.update({
        where: { id: enrollmentId },
        data: {
          completionStatus,
          score,
          status: status as WellnessStatus,
        },
      });
    } catch (error) {
      this.logger.error('Failed to update enrollment progress', { error, enrollmentId });
      throw new AppError('Failed to update enrollment progress', 500);
    }
  }

  /**
   * Get customer wellness progress
   */
  async getCustomerProgress(customerId: string): Promise<{
    totalScore: number;
    programsCompleted: number;
    totalPointsEarned: number;
    currentPrograms: WellnessEnrollment[];
  }> {
    try {
      const enrollments = await this.prisma.wellnessEnrollment.findMany({
        where: { customerId },
        include: {
          program: true,
          activities: true,
        },
      });

      const totalPointsEarned = enrollments.reduce(
        (sum, enrollment) => sum + (enrollment.score || 0),
        0
      );

      const programsCompleted = enrollments.filter(
        e => e.status === 'COMPLETED'
      ).length;

      const totalScore = enrollments.reduce(
        (sum, enrollment) => sum + (enrollment.score || 0),
        0
      ) / Math.max(enrollments.length, 1);

      const currentPrograms = enrollments.filter(
        e => e.status === 'ACTIVE'
      );

      return {
        totalScore: Math.round(totalScore),
        programsCompleted,
        totalPointsEarned,
        currentPrograms,
      };
    } catch (error) {
      this.logger.error('Failed to get customer progress', { error, customerId });
      throw new AppError('Failed to retrieve wellness progress', 500);
    }
  }

  /**
   * Get wellness activities for enrollment
   */
  async getEnrollmentActivities(enrollmentId: string): Promise<WellnessActivity[]> {
    try {
      return await this.prisma.wellnessActivity.findMany({
        where: { enrollmentId },
        orderBy: { completedDate: 'desc' },
      });
    } catch (error) {
      this.logger.error('Failed to get activities', { error, enrollmentId });
      throw new AppError('Failed to retrieve activities', 500);
    }
  }

  /**
   * Award reward points
   */
  async awardRewardPoints(
    customerId: string,
    points: number,
    reason: string
  ): Promise<void> {
    try {
      // In real implementation, this would integrate with a rewards system
      this.logger.info('Reward points awarded', { customerId, points, reason });
    } catch (error) {
      this.logger.error('Failed to award reward points', { error, customerId });
      throw new AppError('Failed to award reward points', 500);
    }
  }

  /**
   * Get personalized wellness recommendations
   */
  async getPersonalizedRecommendations(customerId: string): Promise<{
    enrollment: WellnessEnrollment;
    recommendedActivities: Array<{
      activityName: string;
      activityType: string;
      points: number;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
    }>;
  }[]> {
    try {
      const enrollments = await this.prisma.wellnessEnrollment.findMany({
        where: {
          customerId,
          status: 'ACTIVE',
        },
        include: {
          program: true,
          activities: true,
        },
      });

      return enrollments.map(enrollment => {
        // Generate personalized recommendations based on progress and program type
        const progress = enrollment.completionStatus || 0;
        let recommendedActivities: Array<any> = [];

        if (progress < 25) {
          recommendedActivities = [
            { activityName: 'Complete financial assessment', activityType: 'ASSESSMENT', points: 50, priority: 'HIGH' },
            { activityName: 'Set first financial goal', activityType: 'GOAL_SETTING', points: 30, priority: 'HIGH' },
            { activityName: 'Watch budgeting basics video', activityType: 'EDUCATION', points: 20, priority: 'MEDIUM' },
          ];
        } else if (progress < 50) {
          recommendedActivities = [
            { activityName: 'Create emergency fund plan', activityType: 'PLANNING', points: 40, priority: 'HIGH' },
            { activityName: 'Review debt strategy', activityType: 'PLANNING', points: 35, priority: 'MEDIUM' },
            { activityName: 'Take insurance needs quiz', activityType: 'ASSESSMENT', points: 25, priority: 'MEDIUM' },
          ];
        } else if (progress < 75) {
          recommendedActivities = [
            { activityName: 'Optimize investment allocation', activityType: 'INVESTMENT', points: 45, priority: 'HIGH' },
            { activityName: 'Review retirement plan', activityType: 'PLANNING', points: 40, priority: 'HIGH' },
            { activityName: 'Learn tax optimization', activityType: 'EDUCATION', points: 30, priority: 'MEDIUM' },
          ];
        } else {
          recommendedActivities = [
            { activityName: 'Complete advanced investing course', activityType: 'EDUCATION', points: 50, priority: 'MEDIUM' },
            { activityName: 'Review estate plan', activityType: 'PLANNING', points: 45, priority: 'LOW' },
            { activityName: 'Mentor another member', activityType: 'COMMUNITY', points: 35, priority: 'LOW' },
          ];
        }

        return {
          enrollment,
          recommendedActivities,
        };
      });
    } catch (error) {
      this.logger.error('Failed to get recommendations', { error, customerId });
      throw new AppError('Failed to retrieve recommendations', 500);
    }
  }
}