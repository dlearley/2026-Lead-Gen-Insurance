/**
 * Business Data Ingestion Pipeline Routes
 * API endpoints for managing business data ingestion and monitoring
 */

import { Router, Request, Response } from 'express';
import { logger } from '@insurance-lead-gen/core';
import { BusinessDataIngestionPipeline } from '../pipelines/business-data-ingestion-pipeline';
import {
  BusinessDataSource,
  CreateBusinessDataSourceDto,
  UpdateBusinessDataSourceDto,
  CreateBusinessDataPipelineDto,
  ManualIngestionRequest,
  BusinessDataAnalytics,
  PipelineHealthMetrics,
} from '@insurance-lead-gen/types';
import { prisma } from '../db';
import { z } from 'zod';

// Validation schemas for request bodies
const CreateBusinessDataSourceSchema = z.object({
  name: z.string(),
  type: z.enum(['zoominfo', 'apollo', 'clearbit', 'dun_bradstreet', 'linkedin_sales_navigator', 'custom']),
  description: z.string().optional(),
  apiEndpoint: z.string().optional(),
  apiKey: z.string().optional(),
  rateLimitPerMinute: z.number().optional(),
  rateLimitPerDay: z.number().optional(),
  priority: z.number().optional(),
  qualityThreshold: z.number().min(0).max(100).optional(),
  enabledFields: z.array(z.string()),
  config: z.record(z.any()).optional(),
});

const UpdateBusinessDataSourceSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  apiEndpoint: z.string().optional(),
  apiKey: z.string().optional(),
  rateLimitPerMinute: z.number().optional(),
  rateLimitPerDay: z.number().optional(),
  priority: z.number().optional(),
  qualityThreshold: z.number().min(0).max(100).optional(),
  enabledFields: z.array(z.string()).optional(),
  config: z.record(z.any()).optional(),
  status: z.enum(['active', 'inactive', 'error', 'rate_limited']).optional(),
});

const ManualIngestionSchema = z.object({
  sourceIds: z.array(z.string()).optional(),
  leadIds: z.array(z.string()).optional(),
  forceRefresh: z.boolean().optional(),
  batchSize: z.number().optional(),
});

const PipelineConfigSchema = z.object({
  enabledSources: z.array(z.string()),
  processingIntervalHours: z.number().min(1).max(168).optional(),
  batchSize: z.number().min(1).max(1000).optional(),
  retryAttempts: z.number().min(0).max(10).optional(),
  qualityThreshold: z.number().min(0).max(100).optional(),
  enrichmentEnabled: z.boolean().optional(),
  realtimeProcessing: z.boolean().optional(),
});

export class BusinessDataIngestionRoutes {
  private router: Router;
  private pipeline: BusinessDataIngestionPipeline;

  constructor() {
    this.router = Router();
    this.pipeline = new BusinessDataIngestionPipeline();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // ========================================
    // Business Data Source Management
    // ========================================

    /**
     * @route GET /api/v1/business-data/sources
     * @desc Get all business data sources
     * @access Public
     */
    this.router.get('/sources', async (req: Request, res: Response) => {
      try {
        const sources = await prisma.businessDataSource.findMany({
          orderBy: { priority: 'asc' },
        });

        res.json({
          success: true,
          data: sources,
          total: sources.length,
        });
      } catch (error) {
        logger.error('Failed to fetch business data sources:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch business data sources',
        });
      }
    });

    /**
     * @route POST /api/v1/business-data/sources
     * @desc Create a new business data source
     * @access Public
     */
    this.router.post('/sources', async (req: Request, res: Response) => {
      try {
        const validatedData = CreateBusinessDataSourceSchema.parse(req.body);
        
        const source = await prisma.businessDataSource.create({
          data: {
            ...validatedData,
            status: 'active',
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            averageResponseTime: 0,
            dataQualityScore: 0,
          },
        });

        logger.info('Business data source created', { sourceId: source.id });
        res.status(201).json({
          success: true,
          data: source,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            error: 'Validation error',
            details: error.errors,
          });
        }
        
        logger.error('Failed to create business data source:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to create business data source',
        });
      }
    });

    /**
     * @route GET /api/v1/business-data/sources/:id
     * @desc Get business data source by ID
     * @access Public
     */
    this.router.get('/sources/:id', async (req: Request, res: Response) => {
      try {
        const source = await prisma.businessDataSource.findUnique({
          where: { id: req.params.id },
        });

        if (!source) {
          return res.status(404).json({
            success: false,
            error: 'Business data source not found',
          });
        }

        res.json({
          success: true,
          data: source,
        });
      } catch (error) {
        logger.error('Failed to fetch business data source:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch business data source',
        });
      }
    });

    /**
     * @route PUT /api/v1/business-data/sources/:id
     * @desc Update business data source
     * @access Public
     */
    this.router.put('/sources/:id', async (req: Request, res: Response) => {
      try {
        const validatedData = UpdateBusinessDataSourceSchema.parse(req.body);
        
        const source = await prisma.businessDataSource.update({
          where: { id: req.params.id },
          data: {
            ...validatedData,
            updatedAt: new Date(),
          },
        });

        logger.info('Business data source updated', { sourceId: source.id });
        res.json({
          success: true,
          data: source,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            error: 'Validation error',
            details: error.errors,
          });
        }
        
        logger.error('Failed to update business data source:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to update business data source',
        });
      }
    });

    /**
     * @route DELETE /api/v1/business-data/sources/:id
     * @desc Delete business data source
     * @access Public
     */
    this.router.delete('/sources/:id', async (req: Request, res: Response) => {
      try {
        await prisma.businessDataSource.delete({
          where: { id: req.params.id },
        });

        logger.info('Business data source deleted', { sourceId: req.params.id });
        res.json({
          success: true,
          message: 'Business data source deleted successfully',
        });
      } catch (error) {
        logger.error('Failed to delete business data source:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to delete business data source',
        });
      }
    });

    // ========================================
    // Pipeline Execution
    // ========================================

    /**
     * @route POST /api/v1/business-data/ingestion/run
     * @desc Trigger manual business data ingestion
     * @access Public
     */
    this.router.post('/ingestion/run', async (req: Request, res: Response) => {
      try {
        const validatedData = ManualIngestionSchema.parse(req.body);
        
        // Override pipeline config with request parameters
        if (validatedData.batchSize) {
          this.pipeline.updateConfiguration({ batchSize: validatedData.batchSize });
        }

        // Run the ingestion cycle
        const results = await this.pipeline.executeIngestionCycle();

        logger.info('Manual business data ingestion completed', {
          results: results.map(r => ({ sourceId: r.sourceId, status: r.status })),
        });

        res.json({
          success: true,
          data: {
            executionId: `exec_${Date.now()}`,
            startedAt: new Date(),
            results,
            summary: {
              totalSources: results.length,
              successfulSources: results.filter(r => r.status === 'success').length,
              failedSources: results.filter(r => r.status === 'failed').length,
              totalRecordsProcessed: results.reduce((sum, r) => sum + r.recordsProcessed, 0),
              totalRecordsEnriched: results.reduce((sum, r) => sum + r.recordsEnriched, 0),
            },
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            error: 'Validation error',
            details: error.errors,
          });
        }
        
        logger.error('Manual business data ingestion failed:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to run business data ingestion',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    /**
     * @route GET /api/v1/business-data/ingestion/status
     * @desc Get pipeline health and status
     * @access Public
     */
    this.router.get('/ingestion/status', async (req: Request, res: Response) => {
      try {
        const health = await this.pipeline.getPipelineHealth();

        res.json({
          success: true,
          data: health,
        });
      } catch (error) {
        logger.error('Failed to get pipeline health:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get pipeline health status',
        });
      }
    });

    // ========================================
    // Analytics and Reporting
    // ========================================

    /**
     * @route GET /api/v1/business-data/analytics
     * @desc Get business data analytics
     * @access Public
     */
    this.router.get('/analytics', async (req: Request, res: Response) => {
      try {
        const { startDate, endDate, sourceId } = req.query;

        const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate as string) : new Date();

        // Mock analytics data - in real implementation, this would query actual metrics
        const analytics: BusinessDataAnalytics = {
          period: { start, end },
          totalLeadsProcessed: 1250,
          leadsWithBusinessData: 890,
          enrichmentRate: 71.2,
          averageQualityScore: 87.5,
          sourceBreakdown: {
            'zoominfo': {
              recordsProcessed: 450,
              successRate: 89.2,
              averageQualityScore: 91.5,
              responseTime: 1200,
            },
            'apollo': {
              recordsProcessed: 380,
              successRate: 85.7,
              averageQualityScore: 88.2,
              responseTime: 980,
            },
            'clearbit': {
              recordsProcessed: 420,
              successRate: 82.4,
              averageQualityScore: 83.8,
              responseTime: 1500,
            },
          },
          industryBreakdown: {
            'Technology': 340,
            'Healthcare': 280,
            'Finance': 210,
            'Manufacturing': 180,
            'Retail': 140,
            'Other': 100,
          },
          revenueBreakdown: {
            'Under $1M': 180,
            '$1M-$10M': 420,
            '$10M-$100M': 290,
            'Over $100M': 100,
          },
          growthTrends: {
            leadsWithBusinessData: [
              { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), count: 125 },
              { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), count: 142 },
              { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), count: 138 },
              { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), count: 156 },
              { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), count: 149 },
              { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), count: 168 },
              { date: new Date(), count: 172 },
            ],
            averageQualityScore: [
              { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), score: 85.2 },
              { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), score: 86.1 },
              { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), score: 87.3 },
              { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), score: 88.2 },
              { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), score: 87.8 },
              { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), score: 89.1 },
              { date: new Date(), score: 88.9 },
            ],
          },
        };

        res.json({
          success: true,
          data: analytics,
        });
      } catch (error) {
        logger.error('Failed to get business data analytics:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get business data analytics',
        });
      }
    });

    /**
     * @route GET /api/v1/business-data/reports/quality
     * @desc Get data quality report
     * @access Public
     */
    this.router.get('/reports/quality', async (req: Request, res: Response) => {
      try {
        const { sourceId, startDate, endDate } = req.query;

        // Mock quality report data
        const qualityReport = {
          period: {
            start: startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            end: endDate ? new Date(endDate as string) : new Date(),
          },
          overallMetrics: {
            totalRecords: 1250,
            enrichedRecords: 890,
            failedRecords: 360,
            enrichmentRate: 71.2,
            averageQualityScore: 87.5,
            dataCompleteness: 78.3,
            dataAccuracy: 92.1,
            dataFreshness: 85.7,
          },
          sourceMetrics: [
            {
              sourceId: 'zoominfo',
              sourceName: 'ZoomInfo',
              totalRecords: 450,
              enrichedRecords: 401,
              failedRecords: 49,
              enrichmentRate: 89.1,
              averageQualityScore: 91.5,
              dataCompleteness: 88.2,
              dataAccuracy: 94.8,
              dataFreshness: 87.3,
            },
            {
              sourceId: 'apollo',
              sourceName: 'Apollo',
              totalRecords: 380,
              enrichedRecords: 326,
              failedRecords: 54,
              enrichmentRate: 85.8,
              averageQualityScore: 88.2,
              dataCompleteness: 82.7,
              dataAccuracy: 91.5,
              dataFreshness: 84.9,
            },
            {
              sourceId: 'clearbit',
              sourceName: 'Clearbit',
              totalRecords: 420,
              enrichedRecords: 346,
              failedRecords: 74,
              enrichmentRate: 82.4,
              averageQualityScore: 83.8,
              dataCompleteness: 76.4,
              dataAccuracy: 90.2,
              dataFreshness: 85.1,
            },
          ],
          topIssues: [
            {
              issue: 'Incomplete company profiles',
              count: 156,
              severity: 'medium',
              affectedSources: ['clearbit', 'apollo'],
            },
            {
              issue: 'Outdated financial data',
              count: 89,
              severity: 'high',
              affectedSources: ['apollo'],
            },
            {
              issue: 'Missing industry classification',
              count: 67,
              severity: 'low',
              affectedSources: ['clearbit'],
            },
          ],
        };

        res.json({
          success: true,
          data: qualityReport,
        });
      } catch (error) {
        logger.error('Failed to get quality report:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get data quality report',
        });
      }
    });

    // ========================================
    // Configuration Management
    // ========================================

    /**
     * @route GET /api/v1/business-data/config
     * @desc Get current pipeline configuration
     * @access Public
     */
    this.router.get('/config', (req: Request, res: Response) => {
      try {
        const config = this.pipeline.getConfiguration();

        res.json({
          success: true,
          data: config,
        });
      } catch (error) {
        logger.error('Failed to get pipeline configuration:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get pipeline configuration',
        });
      }
    });

    /**
     * @route PUT /api/v1/business-data/config
     * @desc Update pipeline configuration
     * @access Public
     */
    this.router.put('/config', (req: Request, res: Response) => {
      try {
        const validatedConfig = PipelineConfigSchema.parse(req.body);
        
        this.pipeline.updateConfiguration(validatedConfig);

        logger.info('Pipeline configuration updated', validatedConfig);

        res.json({
          success: true,
          message: 'Pipeline configuration updated successfully',
          data: this.pipeline.getConfiguration(),
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            error: 'Validation error',
            details: error.errors,
          });
        }
        
        logger.error('Failed to update pipeline configuration:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to update pipeline configuration',
        });
      }
    });

    // ========================================
    // Jobs and Processing History
    // ========================================

    /**
     * @route GET /api/v1/business-data/jobs
     * @desc Get recent processing jobs
     * @access Public
     */
    this.router.get('/jobs', async (req: Request, res: Response) => {
      try {
        const { limit = 50, offset = 0 } = req.query;

        // Mock jobs data - in real implementation, this would query actual job records
        const jobs = [
          {
            id: 'job_1',
            sourceId: 'zoominfo',
            status: 'completed',
            startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            completedAt: new Date(Date.now() - 90 * 60 * 1000),
            recordsProcessed: 150,
            recordsEnriched: 134,
            recordsFailed: 16,
            qualityScore: 89.3,
            processingTime: 1800000, // 30 minutes
            errors: [],
            warnings: ['Some records had incomplete data'],
          },
          {
            id: 'job_2',
            sourceId: 'apollo',
            status: 'completed',
            startedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
            completedAt: new Date(Date.now() - 150 * 60 * 1000),
            recordsProcessed: 120,
            recordsEnriched: 103,
            recordsFailed: 17,
            qualityScore: 85.8,
            processingTime: 2100000, // 35 minutes
            errors: ['API rate limit reached for 5 records'],
            warnings: [],
          },
          {
            id: 'job_3',
            sourceId: 'clearbit',
            status: 'failed',
            startedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
            completedAt: new Date(Date.now() - 5.5 * 60 * 60 * 1000),
            recordsProcessed: 80,
            recordsEnriched: 0,
            recordsFailed: 80,
            qualityScore: 0,
            processingTime: 1800000, // 30 minutes
            errors: ['Connection timeout', 'Invalid API credentials'],
            warnings: [],
          },
        ];

        res.json({
          success: true,
          data: jobs,
          pagination: {
            limit: Number(limit),
            offset: Number(offset),
            total: jobs.length,
          },
        });
      } catch (error) {
        logger.error('Failed to get processing jobs:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get processing jobs',
        });
      }
    });
  }

  public getRouter(): Router {
    return this.router;
  }
}

export const businessDataIngestionRoutes = new BusinessDataIngestionRoutes().getRouter();