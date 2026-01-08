/**
 * Business Data Source Repository
 * Database operations for business data sources and processing
 */

import { prisma } from '../db';
import {
  BusinessDataSource,
  BusinessDataProcessingJob,
  BusinessDataAnalytics,
  CreateBusinessDataSourceDto,
  UpdateBusinessDataSourceDto,
} from '@insurance-lead-gen/types';

export class BusinessDataSourceRepository {
  /**
   * Create a new business data source
   */
  async create(data: CreateBusinessDataSourceDto): Promise<BusinessDataSource> {
    return await prisma.businessDataSource.create({
      data: {
        ...data,
        status: 'active',
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageResponseTime: 0,
        dataQualityScore: 0,
      },
    });
  }

  /**
   * Get all business data sources
   */
  async findAll(): Promise<BusinessDataSource[]> {
    return await prisma.businessDataSource.findMany({
      orderBy: { priority: 'asc' },
    });
  }

  /**
   * Get business data source by ID
   */
  async findById(id: string): Promise<BusinessDataSource | null> {
    return await prisma.businessDataSource.findUnique({
      where: { id },
    });
  }

  /**
   * Get business data source by name
   */
  async findByName(name: string): Promise<BusinessDataSource | null> {
    return await prisma.businessDataSource.findUnique({
      where: { name },
    });
  }

  /**
   * Update business data source
   */
  async update(id: string, data: UpdateBusinessDataSourceDto): Promise<BusinessDataSource> {
    return await prisma.businessDataSource.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete business data source
   */
  async delete(id: string): Promise<void> {
    await prisma.businessDataSource.delete({
      where: { id },
    });
  }

  /**
   * Get active business data sources
   */
  async findActive(): Promise<BusinessDataSource[]> {
    return await prisma.businessDataSource.findMany({
      where: { 
        status: 'active',
        isEnabled: true,
      },
      orderBy: { priority: 'asc' },
    });
  }

  /**
   * Update source metrics
   */
  async updateMetrics(id: string, metrics: {
    totalCalls?: number;
    successfulCalls?: number;
    failedCalls?: number;
    averageResponseTime?: number;
    dataQualityScore?: number;
    lastSuccessfulAt?: Date;
    lastErrorAt?: Date;
    lastErrorMessage?: string;
  }): Promise<BusinessDataSource> {
    return await prisma.businessDataSource.update({
      where: { id },
      data: {
        ...metrics,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Calculate success rate
   */
  async calculateSuccessRate(id: string): Promise<number> {
    const source = await prisma.businessDataSource.findUnique({
      where: { id },
      select: {
        totalCalls: true,
        successfulCalls: true,
        failedCalls: true,
      },
    });

    if (!source || source.totalCalls === 0) return 100;
    
    return (source.successfulCalls / source.totalCalls) * 100;
  }

  /**
   * Get source performance metrics
   */
  async getPerformanceMetrics(id: string, days: number = 30): Promise<{
    successRate: number;
    averageResponseTime: number;
    totalCalls: number;
    recentActivity: Date | null;
  }> {
    const source = await prisma.businessDataSource.findUnique({
      where: { id },
      select: {
        totalCalls: true,
        successfulCalls: true,
        failedCalls: true,
        averageResponseTime: true,
        lastSuccessfulAt: true,
        lastErrorAt: true,
      },
    });

    if (!source) {
      throw new Error(`Business data source not found: ${id}`);
    }

    const successRate = source.totalCalls > 0 
      ? (source.successfulCalls / source.totalCalls) * 100 
      : 100;

    const recentActivity = source.lastSuccessfulAt || source.lastErrorAt;

    return {
      successRate,
      averageResponseTime: source.averageResponseTime,
      totalCalls: source.totalCalls,
      recentActivity,
    };
  }

  /**
   * Get all sources with their performance metrics
   */
  async findAllWithMetrics(): Promise<Array<BusinessDataSource & {
    successRate: number;
    performanceMetrics: any;
  }>> {
    const sources = await prisma.businessDataSource.findMany({
      orderBy: { priority: 'asc' },
    });

    const sourcesWithMetrics = await Promise.all(
      sources.map(async (source) => {
        const metrics = await this.getPerformanceMetrics(source.id);
        return {
          ...source,
          successRate: metrics.successRate,
          performanceMetrics: metrics,
        };
      })
    );

    return sourcesWithMetrics;
  }
}

export class BusinessDataProcessingJobRepository {
  /**
   * Create a new processing job
   */
  async create(data: {
    sourceId: string;
    status?: 'pending' | 'processing' | 'completed' | 'failed' | 'partial_success';
    config?: any;
  }): Promise<BusinessDataProcessingJob> {
    return await prisma.businessDataProcessingJob.create({
      data: {
        ...data,
        status: data.status || 'pending',
      },
    });
  }

  /**
   * Update job
   */
  async update(id: string, data: Partial<BusinessDataProcessingJob>): Promise<BusinessDataProcessingJob> {
    return await prisma.businessDataProcessingJob.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Complete job
   */
  async complete(id: string, results: {
    status: 'completed' | 'failed' | 'partial_success';
    recordsProcessed: number;
    recordsEnriched: number;
    recordsFailed: number;
    qualityScore: number;
    processingTime: number;
    errors?: string[];
    warnings?: string[];
  }): Promise<BusinessDataProcessingJob> {
    return await prisma.businessDataProcessingJob.update({
      where: { id },
      data: {
        ...results,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Get job by ID
   */
  async findById(id: string): Promise<BusinessDataProcessingJob | null> {
    return await prisma.businessDataProcessingJob.findUnique({
      where: { id },
    });
  }

  /**
   * Get recent jobs
   */
  async findRecent(limit: number = 50, offset: number = 0): Promise<BusinessDataProcessingJob[]> {
    return await prisma.businessDataProcessingJob.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get jobs by source
   */
  async findBySource(sourceId: string, limit: number = 20): Promise<BusinessDataProcessingJob[]> {
    return await prisma.businessDataProcessingJob.findMany({
      where: { sourceId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get job statistics
   */
  async getStatistics(sourceId?: string, days: number = 30): Promise<{
    totalJobs: number;
    successfulJobs: number;
    failedJobs: number;
    totalRecordsProcessed: number;
    totalRecordsEnriched: number;
    totalRecordsFailed: number;
    averageQualityScore: number;
    averageProcessingTime: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const whereClause = sourceId 
      ? { sourceId, startedAt: { gte: startDate } }
      : { startedAt: { gte: startDate } };

    const jobs = await prisma.businessDataProcessingJob.findMany({
      where: whereClause,
      select: {
        status: true,
        recordsProcessed: true,
        recordsEnriched: true,
        recordsFailed: true,
        qualityScore: true,
        processingTime: true,
      },
    });

    const totalJobs = jobs.length;
    const successfulJobs = jobs.filter(j => j.status === 'completed').length;
    const failedJobs = jobs.filter(j => j.status === 'failed').length;
    const totalRecordsProcessed = jobs.reduce((sum, j) => sum + j.recordsProcessed, 0);
    const totalRecordsEnriched = jobs.reduce((sum, j) => sum + j.recordsEnriched, 0);
    const totalRecordsFailed = jobs.reduce((sum, j) => sum + j.recordsFailed, 0);
    
    const qualityScores = jobs.filter(j => j.qualityScore > 0).map(j => j.qualityScore);
    const processingTimes = jobs.filter(j => j.processingTime).map(j => j.processingTime);

    return {
      totalJobs,
      successfulJobs,
      failedJobs,
      totalRecordsProcessed,
      totalRecordsEnriched,
      totalRecordsFailed,
      averageQualityScore: qualityScores.length > 0 
        ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length 
        : 0,
      averageProcessingTime: processingTimes.length > 0 
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
        : 0,
    };
  }
}

export class BusinessDataAnalyticsRepository {
  /**
   * Create analytics record
   */
  async create(data: {
    periodStart: Date;
    periodEnd: Date;
    totalLeadsProcessed: number;
    leadsWithBusinessData: number;
    enrichmentRate: number;
    averageQualityScore: number;
    sourceBreakdown: any;
    industryBreakdown: any;
    revenueBreakdown: any;
    growthTrends: any;
  }): Promise<BusinessDataAnalytics> {
    return await prisma.businessDataAnalytics.create({
      data,
    });
  }

  /**
   * Get analytics for period
   */
  async findByPeriod(startDate: Date, endDate: Date): Promise<BusinessDataAnalytics[]> {
    return await prisma.businessDataAnalytics.findMany({
      where: {
        periodStart: { lte: endDate },
        periodEnd: { gte: startDate },
      },
      orderBy: { periodStart: 'desc' },
    });
  }

  /**
   * Get latest analytics
   */
  async findLatest(): Promise<BusinessDataAnalytics | null> {
    return await prisma.businessDataAnalytics.findFirst({
      orderBy: { periodEnd: 'desc' },
    });
  }

  /**
   * Update analytics
   */
  async update(id: string, data: Partial<BusinessDataAnalytics>): Promise<BusinessDataAnalytics> {
    return await prisma.businessDataAnalytics.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }
}

export class SystemConfigRepository {
  /**
   * Get config value
   */
  async get(key: string): Promise<string | null> {
    const config = await prisma.systemConfig.findUnique({
      where: { key },
    });
    return config?.value || null;
  }

  /**
   * Set config value
   */
  async set(key: string, value: string): Promise<void> {
    await prisma.systemConfig.upsert({
      where: { key },
      create: { key, value },
      update: { 
        value, 
        updatedAt: new Date() 
      },
    });
  }

  /**
   * Get all configs
   */
  async getAll(): Promise<Array<{ key: string; value: string }>> {
    const configs = await prisma.systemConfig.findMany();
    return configs.map(config => ({
      key: config.key,
      value: config.value,
    }));
  }

  /**
   * Delete config
   */
  async delete(key: string): Promise<void> {
    await prisma.systemConfig.delete({
      where: { key },
    });
  }
}

// Export repository instances
export const businessDataSourceRepository = new BusinessDataSourceRepository();
export const businessDataProcessingJobRepository = new BusinessDataProcessingJobRepository();
export const businessDataAnalyticsRepository = new BusinessDataAnalyticsRepository();
export const systemConfigRepository = new SystemConfigRepository();