import { PrismaClient, Broker, IntegrationLog } from '@prisma/client';
import {
  CreateBrokerDto,
  UpdateBrokerDto,
  BrokerFilterParams,
  PaginatedResponse,
  LeadSubmissionRequest,
  LeadSubmissionResult,
  IntegrationRequestResult,
} from '@insurance/types';
import { ApiClientService } from './api-client.service.js';
import { getPrismaClient } from '../prisma/client.js';
import logger from '../logger.js';

const prisma = getPrismaClient();

/**
 * Service for managing broker integrations
 */
export class BrokerIntegrationService {
  private apiClient: ApiClientService;

  constructor() {
    this.apiClient = new ApiClientService();
  }

  /**
   * Create a new broker
   */
  async createBroker(data: CreateBrokerDto): Promise<Broker> {
    logger.info('Creating broker', { code: data.code, name: data.name });

    const broker = await prisma.broker.create({
      data: {
        name: data.name,
        code: data.code,
        website: data.website,
        logoUrl: data.logoUrl,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        licenseNumber: data.licenseNumber,
        ein: data.ein,
        businessAddress: data.businessAddress,
        carrierId: data.carrierId,
        integrationType: data.integrationType || 'REST_API',
        apiKey: data.apiKey,
        apiSecret: data.apiSecret,
        apiVersion: data.apiVersion,
        isActive: data.isActive ?? true,
        priority: data.priority ?? 0,
        rateLimit: data.rateLimit ?? 100,
        rateLimitWindow: data.rateLimitWindow ?? 60,
        metadata: data.metadata,
      },
    });

    logger.info('Broker created', { id: broker.id, code: broker.code });
    return broker;
  }

  /**
   * Get broker by ID
   */
  async getBrokerById(id: string): Promise<Broker | null> {
    return prisma.broker.findUnique({
      where: { id },
      include: {
        carrier: true,
        configs: true,
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * Get broker by code
   */
  async getBrokerByCode(code: string): Promise<Broker | null> {
    return prisma.broker.findUnique({
      where: { code },
      include: {
        carrier: true,
        configs: true,
      },
    });
  }

  /**
   * Get all brokers with filtering and pagination
   */
  async getBrokers(filters: BrokerFilterParams = {}): Promise<PaginatedResponse<Broker>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.code) {
      where.code = { contains: filters.code, mode: 'insensitive' as const };
    }

    if (filters.carrierId) {
      where.carrierId = filters.carrierId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.integrationType) {
      where.integrationType = filters.integrationType;
    }

    const [brokers, total] = await Promise.all([
      prisma.broker.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [filters.sortBy ?? 'createdAt']: filters.sortOrder ?? 'desc',
        },
        include: {
          carrier: true,
          configs: true,
        },
      }),
      prisma.broker.count({ where }),
    ]);

    return {
      data: brokers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Update broker
   */
  async updateBroker(id: string, data: UpdateBrokerDto): Promise<Broker> {
    logger.info('Updating broker', { id });

    const broker = await prisma.broker.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.code !== undefined && { code: data.code }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
        ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail }),
        ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone }),
        ...(data.licenseNumber !== undefined && { licenseNumber: data.licenseNumber }),
        ...(data.ein !== undefined && { ein: data.ein }),
        ...(data.businessAddress !== undefined && { businessAddress: data.businessAddress }),
        ...(data.carrierId !== undefined && { carrierId: data.carrierId }),
        ...(data.integrationType !== undefined && { integrationType: data.integrationType }),
        ...(data.apiKey !== undefined && { apiKey: data.apiKey }),
        ...(data.apiSecret !== undefined && { apiSecret: data.apiSecret }),
        ...(data.apiVersion !== undefined && { apiVersion: data.apiVersion }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.rateLimit !== undefined && { rateLimit: data.rateLimit }),
        ...(data.rateLimitWindow !== undefined && { rateLimitWindow: data.rateLimitWindow }),
        ...(data.metadata !== undefined && { metadata: data.metadata }),
      },
    });

    logger.info('Broker updated', { id });
    return broker;
  }

  /**
   * Delete broker
   */
  async deleteBroker(id: string): Promise<void> {
    logger.info('Deleting broker', { id });

    await prisma.broker.delete({
      where: { id },
    });

    logger.info('Broker deleted', { id });
  }

  /**
   * Submit lead to broker
   */
  async submitLead(request: LeadSubmissionRequest): Promise<LeadSubmissionResult> {
    const { leadId, carrierId, brokerId, submissionData } = request;

    logger.info('Submitting lead to broker', { leadId, brokerId });

    // Get broker details
    const broker = await this.getBrokerById(brokerId || '');
    if (!broker) {
      throw new Error(`Broker not found: ${brokerId}`);
    }

    if (!carrierId && !broker.carrierId) {
      throw new Error(`No carrier specified for broker ${broker.code}`);
    }

    const targetCarrierId = carrierId || broker.carrierId;
    const carrier = targetCarrierId ? await prisma.insuranceCarrier.findUnique({ where: { id: targetCarrierId } }) : null;

    // Determine API endpoint (broker or carrier)
    const apiEndpoint = broker.carrier?.apiEndpoint || broker.metadata?.apiEndpoint;
    if (!apiEndpoint) {
      throw new Error(`Broker ${broker.code} has no API endpoint configured`);
    }

    const startTime = Date.now();

    try {
      // Submit lead to broker API
      const response = await this.apiClient.post<Record<string, unknown>>(
        `${apiEndpoint}/leads`,
        {
          ...submissionData,
          brokerId: broker.id,
          brokerCode: broker.code,
        },
        {
          headers: this.buildAuthHeaders(broker, carrier),
          timeout: 30000,
        }
      );

      const duration = Date.now() - startTime;

      // Log
      const log = await this.createIntegrationLog({
        entityType: 'LEAD',
        entityId: leadId,
        carrierId: carrierId || carrier?.id,
        brokerId: broker.id,
        action: 'LEAD_SUBMITTED',
        direction: 'OUTBOUND',
        requestData: submissionData,
        responseData: response.data,
        statusCode: response.statusCode,
        success: response.success,
        duration,
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Lead submission failed');
      }

      return {
        submissionId: log.id,
        leadId,
        targetBroker: broker.code,
        success: true,
        externalId: (response.data as { id?: string })?.id,
        status: (response.data as { status?: string })?.status,
        submittedAt: new Date(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log failure
      await this.createIntegrationLog({
        entityType: 'LEAD',
        entityId: leadId,
        carrierId: carrierId || carrier?.id,
        brokerId: broker.id,
        action: 'LEAD_SUBMITTED',
        direction: 'OUTBOUND',
        requestData: submissionData,
        success: false,
        error: errorMessage,
        duration,
      });

      logger.error('Lead submission failed for broker', {
        leadId,
        brokerId: broker.id,
        error: errorMessage,
      });

      return {
        submissionId: '',
        leadId,
        targetBroker: broker.code,
        success: false,
        error: errorMessage,
        submittedAt: new Date(),
      };
    }
  }

  /**
   * Test broker integration
   */
  async testBrokerIntegration(brokerId: string): Promise<IntegrationRequestResult> {
    logger.info('Testing broker integration', { brokerId });

    const broker = await this.getBrokerById(brokerId);
    if (!broker) {
      throw new Error(`Broker not found: ${brokerId}`);
    }

    const apiEndpoint = broker.carrier?.apiEndpoint || broker.metadata?.apiEndpoint;
    if (!apiEndpoint) {
      throw new Error(`Broker ${broker.code} has no API endpoint configured`);
    }

    const startTime = Date.now();

    try {
      // Test with a health check endpoint
      const response = await this.apiClient.get(`${apiEndpoint}/health`, {
        headers: this.buildAuthHeaders(broker, broker.carrier || undefined),
        timeout: 10000,
      });

      const duration = Date.now() - startTime;

      // Log
      const log = await this.createIntegrationLog({
        entityType: 'BROKER',
        entityId: broker.id,
        carrierId: broker.carrierId,
        brokerId: broker.id,
        action: 'VALIDATION_CHECK',
        direction: 'OUTBOUND',
        requestData: { test: true },
        responseData: response.data,
        statusCode: response.statusCode,
        success: response.success,
        duration,
      });

      return {
        success: response.success,
        data: response.data,
        statusCode: response.statusCode,
        duration,
        logId: log.id,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log failure
      const log = await this.createIntegrationLog({
        entityType: 'BROKER',
        entityId: broker.id,
        carrierId: broker.carrierId,
        brokerId: broker.id,
        action: 'VALIDATION_CHECK',
        direction: 'OUTBOUND',
        requestData: { test: true },
        success: false,
        error: errorMessage,
        duration,
      });

      return {
        success: false,
        error: errorMessage,
        duration,
        logId: log.id,
      };
    }
  }

  /**
   * Get broker health status
   */
  async getBrokerHealth(brokerId: string) {
    const broker = await this.getBrokerById(brokerId);
    if (!broker) {
      throw new Error(`Broker not found: ${brokerId}`);
    }

    // Get recent logs for health assessment
    const recentLogs = await prisma.integrationLog.findMany({
      where: {
        brokerId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const successfulRequests = recentLogs.filter(l => l.success).length;
    const successRate = recentLogs.length > 0 ? successfulRequests / recentLogs.length : 0;
    const averageResponseTime =
      recentLogs.filter(l => l.duration).reduce((sum, l) => sum + (l.duration || 0), 0) / successfulRequests || 0;

    const lastSuccessfulLog = recentLogs.find(l => l.success);
    const lastFailedLog = recentLogs.find(l => !l.success);

    let consecutiveFailures = 0;
    for (const log of recentLogs) {
      if (log.success) break;
      consecutiveFailures++;
    }

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (successRate >= 0.95 && consecutiveFailures === 0) {
      status = 'healthy';
    } else if (successRate >= 0.8 && consecutiveFailures < 5) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      entityType: 'BROKER' as const,
      entityId: broker.id,
      name: broker.name,
      status,
      lastSuccessfulAt: lastSuccessfulLog?.createdAt,
      lastFailedAt: lastFailedLog?.createdAt,
      consecutiveFailures,
      averageResponseTime: averageResponseTime || undefined,
      totalRequests: recentLogs.length,
      successRate,
      lastCheckAt: new Date(),
    };
  }

  /**
   * Build authentication headers for broker API
   */
  private buildAuthHeaders(
    broker: Broker,
    carrier?: { apiKey?: string | null; apiVersion?: string | null } | null
  ): Record<string, string> {
    const headers: Record<string, string> = {};

    // Prefer broker API key, fallback to carrier
    const apiKey = broker.apiKey || carrier?.apiKey;
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const apiVersion = broker.apiVersion || carrier?.apiVersion;
    if (apiVersion) {
      headers['API-Version'] = apiVersion;
    }

    // Add broker identification
    headers['X-Broker-ID'] = broker.id;
    headers['X-Broker-Code'] = broker.code;

    return headers;
  }

  /**
   * Create an integration log entry
   */
  private async createIntegrationLog(data: Omit<Parameters<typeof prisma.integrationLog.create>[0]['data'], 'createdAt'>): Promise<IntegrationLog> {
    return prisma.integrationLog.create({
      data: {
        ...data,
        createdAt: new Date(),
      },
    });
  }
}
