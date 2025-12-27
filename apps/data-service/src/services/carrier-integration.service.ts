import { PrismaClient, InsuranceCarrier, IntegrationLog, IntegrationAction, Direction } from '@prisma/client';
import {
  CreateInsuranceCarrierDto,
  UpdateInsuranceCarrierDto,
  InsuranceCarrierFilterParams,
  PaginatedResponse,
  LeadSubmissionRequest,
  LeadSubmissionResult,
  QuoteRequest,
  QuoteResponse,
  IntegrationRequestResult,
} from '@insurance/types';
import { ApiClientService } from './api-client.service.js';
import { getPrismaClient } from '../prisma/client.js';
import logger from '../logger.js';

const prisma = getPrismaClient();

/**
 * Service for managing insurance carrier integrations
 */
export class CarrierIntegrationService {
  private apiClient: ApiClientService;

  constructor() {
    this.apiClient = new ApiClientService();
  }

  /**
   * Create a new insurance carrier
   */
  async createCarrier(data: CreateInsuranceCarrierDto): Promise<InsuranceCarrier> {
    logger.info('Creating insurance carrier', { code: data.code, name: data.name });

    const carrier = await prisma.insuranceCarrier.create({
      data: {
        name: data.name,
        code: data.code,
        website: data.website,
        logoUrl: data.logoUrl,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        supportedProducts: data.supportedProducts,
        apiEndpoint: data.apiEndpoint,
        webhookUrl: data.webhookUrl,
        documentationUrl: data.documentationUrl,
        integrationType: data.integrationType || 'REST_API',
        apiKey: data.apiKey,
        apiSecret: data.apiSecret,
        apiVersion: data.apiVersion,
        isActive: data.isActive ?? true,
        isPrimary: data.isPrimary ?? false,
        priority: data.priority ?? 0,
        rateLimit: data.rateLimit ?? 100,
        rateLimitWindow: data.rateLimitWindow ?? 60,
        metadata: data.metadata,
      },
    });

    logger.info('Insurance carrier created', { id: carrier.id, code: carrier.code });
    return carrier;
  }

  /**
   * Get carrier by ID
   */
  async getCarrierById(id: string): Promise<InsuranceCarrier | null> {
    return prisma.insuranceCarrier.findUnique({
      where: { id },
      include: {
        configs: true,
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * Get carrier by code
   */
  async getCarrierByCode(code: string): Promise<InsuranceCarrier | null> {
    return prisma.insuranceCarrier.findUnique({
      where: { code },
      include: {
        configs: true,
      },
    });
  }

  /**
   * Get all carriers with filtering and pagination
   */
  async getCarriers(filters: InsuranceCarrierFilterParams = {}): Promise<PaginatedResponse<InsuranceCarrier>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.code) {
      where.code = { contains: filters.code, mode: 'insensitive' as const };
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.integrationType) {
      where.integrationType = filters.integrationType;
    }

    if (filters.isPrimary !== undefined) {
      where.isPrimary = filters.isPrimary;
    }

    if (filters.supportedProduct) {
      where.supportedProducts = {
        has: filters.supportedProduct,
      };
    }

    const [carriers, total] = await Promise.all([
      prisma.insuranceCarrier.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [filters.sortBy ?? 'createdAt']: filters.sortOrder ?? 'desc',
        },
        include: {
          configs: true,
        },
      }),
      prisma.insuranceCarrier.count({ where }),
    ]);

    return {
      data: carriers,
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
   * Update carrier
   */
  async updateCarrier(id: string, data: UpdateInsuranceCarrierDto): Promise<InsuranceCarrier> {
    logger.info('Updating insurance carrier', { id });

    const carrier = await prisma.insuranceCarrier.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.code !== undefined && { code: data.code }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
        ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail }),
        ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone }),
        ...(data.supportedProducts !== undefined && { supportedProducts: data.supportedProducts }),
        ...(data.apiEndpoint !== undefined && { apiEndpoint: data.apiEndpoint }),
        ...(data.webhookUrl !== undefined && { webhookUrl: data.webhookUrl }),
        ...(data.documentationUrl !== undefined && { documentationUrl: data.documentationUrl }),
        ...(data.integrationType !== undefined && { integrationType: data.integrationType }),
        ...(data.apiKey !== undefined && { apiKey: data.apiKey }),
        ...(data.apiSecret !== undefined && { apiSecret: data.apiSecret }),
        ...(data.apiVersion !== undefined && { apiVersion: data.apiVersion }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.rateLimit !== undefined && { rateLimit: data.rateLimit }),
        ...(data.rateLimitWindow !== undefined && { rateLimitWindow: data.rateLimitWindow }),
        ...(data.metadata !== undefined && { metadata: data.metadata }),
      },
    });

    logger.info('Insurance carrier updated', { id });
    return carrier;
  }

  /**
   * Delete carrier
   */
  async deleteCarrier(id: string): Promise<void> {
    logger.info('Deleting insurance carrier', { id });

    await prisma.insuranceCarrier.delete({
      where: { id },
    });

    logger.info('Insurance carrier deleted', { id });
  }

  /**
   * Submit lead to carrier
   */
  async submitLead(request: LeadSubmissionRequest): Promise<LeadSubmissionResult> {
    const { leadId, carrierId, brokerId, submissionData, priority, scheduledFor } = request;

    logger.info('Submitting lead to carrier', { leadId, carrierId, brokerId });

    // Get carrier details
    const carrier = await this.getCarrierById(carrierId || '');
    if (!carrier) {
      throw new Error(`Carrier not found: ${carrierId}`);
    }

    if (!carrier.apiEndpoint) {
      throw new Error(`Carrier ${carrier.code} has no API endpoint configured`);
    }

    const startTime = Date.now();

    try {
      // Submit lead to carrier API
      const response = await this.apiClient.post<Record<string, unknown>>(
        `${carrier.apiEndpoint}/leads`,
        submissionData,
        {
          headers: this.buildAuthHeaders(carrier),
          timeout: 30000,
        }
      );

      const duration = Date.now() - startTime;

      // Log the submission
      const log = await this.createIntegrationLog({
        entityType: 'LEAD',
        entityId: leadId,
        carrierId: carrier.id,
        brokerId,
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
        targetCarrier: carrier.code,
        success: true,
        externalId: (response.data as { id?: string })?.id,
        status: (response.data as { status?: string })?.status,
        submittedAt: new Date(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log the failure
      await this.createIntegrationLog({
        entityType: 'LEAD',
        entityId: leadId,
        carrierId: carrier.id,
        brokerId,
        action: 'LEAD_SUBMITTED',
        direction: 'OUTBOUND',
        requestData: submissionData,
        success: false,
        error: errorMessage,
        duration,
      });

      logger.error('Lead submission failed', { leadId, carrierId: carrier.id, error: errorMessage });

      return {
        submissionId: '',
        leadId,
        targetCarrier: carrier.code,
        success: false,
        error: errorMessage,
        submittedAt: new Date(),
      };
    }
  }

  /**
   * Request quote from carrier(s)
   */
  async requestQuote(request: QuoteRequest): Promise<QuoteResponse[]> {
    const { leadId, insuranceType, coverageData, carrierIds, brokerId } = request;

    logger.info('Requesting quotes', { leadId, insuranceType, carrierIds });

    // Get carriers to request quotes from
    const carriers = carrierIds
      ? await Promise.all(carrierIds.map(id => this.getCarrierById(id)))
      : await this.getActiveCarriersForInsuranceType(insuranceType);

    const validCarriers = carriers.filter((c): c is NonNullable<typeof c> => c !== null && c.isActive);

    if (validCarriers.length === 0) {
      throw new Error('No active carriers available for quote request');
    }

    // Request quotes from all carriers in parallel
    const quotePromises = validCarriers.map(async carrier => {
      try {
        const response = await this.apiClient.post<Record<string, unknown>>(
          `${carrier.apiEndpoint}/quotes`,
          {
            leadId,
            insuranceType,
            coverageData,
          },
          {
            headers: this.buildAuthHeaders(carrier),
            timeout: 30000,
          }
        );

        if (!response.success) {
          throw new Error(response.error?.message || 'Quote request failed');
        }

        const quoteData = response.data as {
          premium: number;
          coverage: Record<string, unknown>;
          validUntil: string;
          terms: string[];
        };

        return {
          quoteId: `${carrier.id}-${leadId}-${Date.now()}`,
          leadId,
          carrierId: carrier.id,
          premium: quoteData.premium,
          coverage: quoteData.coverage,
          validUntil: new Date(quoteData.validUntil),
          terms: quoteData.terms,
          receivedAt: new Date(),
        };
      } catch (error) {
        logger.error('Quote request failed for carrier', {
          carrierId: carrier.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return null;
      }
    });

    const results = await Promise.all(quotePromises);

    // Filter out null results and log
    const quotes = results.filter((q): q is QuoteResponse => q !== null);

    logger.info('Quotes received', {
      leadId,
      requested: validCarriers.length,
      received: quotes.length,
    });

    return quotes;
  }

  /**
   * Test carrier integration
   */
  async testCarrierIntegration(carrierId: string): Promise<IntegrationRequestResult> {
    logger.info('Testing carrier integration', { carrierId });

    const carrier = await this.getCarrierById(carrierId);
    if (!carrier) {
      throw new Error(`Carrier not found: ${carrierId}`);
    }

    if (!carrier.apiEndpoint) {
      throw new Error(`Carrier ${carrier.code} has no API endpoint configured`);
    }

    const startTime = Date.now();

    try {
      // Test with a health check endpoint
      const response = await this.apiClient.get(`${carrier.apiEndpoint}/health`, {
        headers: this.buildAuthHeaders(carrier),
        timeout: 10000,
      });

      const duration = Date.now() - startTime;

      // Log the test
      const log = await this.createIntegrationLog({
        entityType: 'INSURANCE_CARRIER',
        entityId: carrier.id,
        carrierId: carrier.id,
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

      // Log the failure
      const log = await this.createIntegrationLog({
        entityType: 'INSURANCE_CARRIER',
        entityId: carrier.id,
        carrierId: carrier.id,
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
   * Get integration health
   */
  async getCarrierHealth(carrierId: string) {
    const carrier = await this.getCarrierById(carrierId);
    if (!carrier) {
      throw new Error(`Carrier not found: ${carrierId}`);
    }

    // Get recent logs for health assessment
    const recentLogs = await prisma.integrationLog.findMany({
      where: {
        carrierId,
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
      entityType: 'INSURANCE_CARRIER' as const,
      entityId: carrier.id,
      name: carrier.name,
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
   * Get active carriers for a specific insurance type
   */
  private async getActiveCarriersForInsuranceType(insuranceType: string): Promise<InsuranceCarrier[]> {
    return prisma.insuranceCarrier.findMany({
      where: {
        isActive: true,
        supportedProducts: {
          has: insuranceType.toUpperCase(),
        },
      },
      orderBy: { priority: 'desc' },
    });
  }

  /**
   * Build authentication headers for carrier API
   */
  private buildAuthHeaders(carrier: InsuranceCarrier): Record<string, string> {
    const headers: Record<string, string> = {};

    if (carrier.apiKey) {
      headers['Authorization'] = `Bearer ${carrier.apiKey}`;
    }

    if (carrier.apiVersion) {
      headers['API-Version'] = carrier.apiVersion;
    }

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
