import { PrismaClient } from '@prisma/client';
import {
  FinancialAdvisor,
  AdvisorStatus,
  AdvisorAvailability,
  AdvisorPerformance,
  CreateAdvisorRequest,
} from '@insurance-lead-gen/types';
import { Logger } from '../../logger.js';
import { AppError } from '../../errors.js';

/**
 * FinancialAdvisorService - Manages financial advisors and their operations
 */
export class FinancialAdvisorService {
  constructor(
    private prisma: PrismaClient,
    private logger: Logger
  ) {}

  /**
   * Create a new financial advisor
   */
  async createAdvisor(request: CreateAdvisorRequest): Promise<FinancialAdvisor> {
    try {
      this.logger.info('Creating financial advisor', { licenseNumber: request.licenseNumber });

      const advisor = await this.prisma.financialAdvisor.create({
        data: {
          userId: request.userId,
          licenseNumber: request.licenseNumber,
          licenseType: request.licenseType,
          specializations: request.specializations,
          credentials: request.credentials || {},
          maxClients: request.maxClients || 50,
          currentClients: 0,
          status: 'ACTIVE' as AdvisorStatus,
        },
      });

      this.logger.info('Financial advisor created successfully', { advisorId: advisor.id });
      return advisor;
    } catch (error) {
      this.logger.error('Failed to create financial advisor', { error, request });
      throw new AppError('Failed to create financial advisor', 500);
    }
  }

  /**
   * Get advisor by ID
   */
  async getAdvisorById(advisorId: string): Promise<FinancialAdvisor | null> {
    try {
      return await this.prisma.financialAdvisor.findUnique({
        where: { id: advisorId },
      });
    } catch (error) {
      this.logger.error('Failed to get advisor', { error, advisorId });
      throw new AppError('Failed to retrieve advisor', 500);
    }
  }

  /**
   * Get advisor by license number
   */
  async getAdvisorByLicense(licenseNumber: string): Promise<FinancialAdvisor | null> {
    try {
      return await this.prisma.financialAdvisor.findUnique({
        where: { licenseNumber },
      });
    } catch (error) {
      this.logger.error('Failed to get advisor by license', { error, licenseNumber });
      throw new AppError('Failed to retrieve advisor', 500);
    }
  }

  /**
   * List all advisors with optional filters
   */
  async listAdvisors(filters?: {
    organizationId?: string;
    status?: AdvisorStatus;
    specialization?: string;
  }): Promise<FinancialAdvisor[]> {
    try {
      const whereClause: any = {};

      if (filters?.organizationId) {
        whereClause.organizationId = filters.organizationId;
      }

      if (filters?.status) {
        whereClause.status = filters.status;
      }

      if (filters?.specialization) {
        whereClause.specializations = {
          has: filters.specialization,
        };
      }

      return await this.prisma.financialAdvisor.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Failed to list advisors', { error, filters });
      throw new AppError('Failed to list advisors', 500);
    }
  }

  /**
   * Update advisor profile
   */
  async updateAdvisor(
    advisorId: string,
    data: Partial<{
      specializations: string[];
      credentials: Record<string, any>;
      maxClients: number;
      status: AdvisorStatus;
      aum: number;
    }>
  ): Promise<FinancialAdvisor> {
    try {
      this.logger.info('Updating advisor profile', { advisorId });

      const advisor = await this.prisma.financialAdvisor.update({
        where: { id: advisorId },
        data,
      });

      this.logger.info('Advisor profile updated', { advisorId });
      return advisor;
    } catch (error) {
      this.logger.error('Failed to update advisor', { error, advisorId });
      throw new AppError('Failed to update advisor', 500);
    }
  }

  /**
   * Get advisor availability for scheduling
   */
  async getAvailability(
    advisorId: string,
    date?: Date
  ): Promise<AdvisorAvailability[]> {
    try {
      // In a real implementation, this would integrate with a calendar system
      // For now, return sample availability
      const availability: AdvisorAvailability[] = [];
      
      // Generate availability for next 7 days
      const startDate = date || new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        
        // Skip weekends for work hours
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        availability.push({
          advisorId,
          dayOfWeek,
          startTime: '09:00',
          endTime: '17:00',
          isAvailable: true,
        });
      }

      return availability;
    } catch (error) {
      this.logger.error('Failed to get availability', { error, advisorId });
      throw new AppError('Failed to get advisor availability', 500);
    }
  }

  /**
   * Schedule a meeting with advisor
   */
  async scheduleMeeting(
    advisorId: string,
    customerId: string,
    date: Date,
    duration: number = 60
  ): Promise<{
    meetingId: string;
    advisorId: string;
    customerId: string;
    scheduledTime: Date;
    duration: number;
    status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
  }> {
    try {
      this.logger.info('Scheduling meeting', { advisorId, customerId, date });

      // In real implementation, integrate with calendar API
      const meeting = {
        meetingId: `meet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        advisorId,
        customerId,
        scheduledTime: date,
        duration,
        status: 'SCHEDULED' as const,
      };

      this.logger.info('Meeting scheduled successfully', { meetingId: meeting.meetingId });
      return meeting;
    } catch (error) {
      this.logger.error('Failed to schedule meeting', { error, advisorId, customerId });
      throw new AppError('Failed to schedule meeting', 500);
    }
  }

  /**
   * Get clients for an advisor
   */
  async getAdvisorClients(advisorId: string): Promise<FinancialPlan[]> {
    try {
      return await this.prisma.financialPlan.findMany({
        where: { advisorId },
        include: {
          goals: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Failed to get advisor clients', { error, advisorId });
      throw new AppError('Failed to retrieve advisor clients', 500);
    }
  }

  /**
   * Get advisor performance metrics
   */
  async getPerformance(
    advisorId: string,
    month: number,
    year: number
  ): Promise<AdvisorPerformance | null> {
    try {
      // In real implementation, calculate metrics from database
      return {
        advisorId,
        month,
        year,
        clientsServed: await this.prisma.financialPlan.count({
          where: { advisorId },
        }),
        revenueGenerated: 0,
        customerSatisfaction: 4.5,
        planCompletions: await this.prisma.financialPlan.count({
          where: { 
            advisorId,
            status: 'COMPLETED',
          },
        }),
        createdAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to get advisor performance', { error, advisorId });
      throw new AppError('Failed to retrieve performance metrics', 500);
    }
  }
}