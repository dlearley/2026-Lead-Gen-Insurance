/**
 * Phase 30: Partner Ecosystem & Integrations
 * Integration Service - Handles integration management and monitoring
 */

import { PrismaClient } from '@prisma/client';
import type {
  Integration,
  IntegrationStatus,
  IntegrationHealthStatus,
  CreateIntegrationRequest,
} from '@insurance-platform/types';

export class IntegrationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create new integration
   */
  async createIntegration(request: CreateIntegrationRequest): Promise<Integration> {
    const application = await this.prisma.partnerApplication.findUnique({
      where: { id: request.appId },
      include: { partner: true },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== 'APPROVED' && application.status !== 'PUBLISHED') {
      throw new Error('Application must be approved to create integration');
    }

    const integration = await this.prisma.integration.create({
      data: {
        partnerId: application.partnerId,
        appId: request.appId,
        integrationName: request.integrationName,
        integrationType: request.integrationType,
        config: request.config,
        status: 'INACTIVE',
      },
    });

    // Create field mappings if provided
    if (request.mappings && request.mappings.length > 0) {
      await this.prisma.integrationMapping.createMany({
        data: request.mappings.map((mapping) => ({
          integrationId: integration.id,
          sourceField: mapping.sourceField,
          targetField: mapping.targetField,
          transformation: mapping.transformation,
        })),
      });
    }

    return integration as Integration;
  }

  /**
   * Get integration by ID
   */
  async getIntegrationById(id: string): Promise<Integration | null> {
    const integration = await this.prisma.integration.findUnique({
      where: { id },
      include: {
        partner: true,
        application: true,
        mappings: true,
        webhooks: true,
        apiKey: true,
      },
    });

    return integration as Integration | null;
  }

  /**
   * List integrations
   */
  async listIntegrations(filters: {
    partnerId?: string;
    appId?: string;
    organizationId?: string;
    status?: IntegrationStatus;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ integrations: Integration[]; total: number }> {
    const where: any = {};

    if (filters.partnerId) where.partnerId = filters.partnerId;
    if (filters.appId) where.appId = filters.appId;
    if (filters.organizationId) where.organizationId = filters.organizationId;
    if (filters.status) where.status = filters.status;
    if (filters.type) where.integrationType = filters.type;

    const [integrations, total] = await Promise.all([
      this.prisma.integration.findMany({
        where,
        include: {
          partner: true,
          application: true,
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.integration.count({ where }),
    ]);

    return {
      integrations: integrations as Integration[],
      total,
    };
  }

  /**
   * Update integration
   */
  async updateIntegration(
    id: string,
    updates: {
      integrationName?: string;
      config?: Record<string, any>;
      status?: IntegrationStatus;
    }
  ): Promise<Integration> {
    const integration = await this.prisma.integration.update({
      where: { id },
      data: updates,
    });

    return integration as Integration;
  }

  /**
   * Activate integration
   */
  async activateIntegration(id: string): Promise<Integration> {
    // Run health check first
    const healthCheck = await this.checkIntegrationHealth(id);

    if (!healthCheck.status || healthCheck.status === 'ERROR') {
      throw new Error('Integration health check failed');
    }

    const integration = await this.prisma.integration.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        lastHealthCheck: new Date(),
        healthStatus: 'healthy',
      },
    });

    return integration as Integration;
  }

  /**
   * Deactivate integration
   */
  async deactivateIntegration(id: string): Promise<Integration> {
    const integration = await this.prisma.integration.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    return integration as Integration;
  }

  /**
   * Delete integration
   */
  async deleteIntegration(id: string): Promise<void> {
    await this.prisma.integration.delete({
      where: { id },
    });
  }

  /**
   * Test integration connection
   */
  async testConnection(id: string): Promise<{
    success: boolean;
    message: string;
    latency?: number;
  }> {
    const integration = await this.prisma.integration.findUnique({
      where: { id },
      include: { apiKey: true },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    const startTime = Date.now();

    try {
      // TODO: Implement actual connection test based on integration type
      // For now, simulate a test
      await new Promise((resolve) => setTimeout(resolve, 100));

      const latency = Date.now() - startTime;

      return {
        success: true,
        message: 'Connection successful',
        latency,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Check integration health
   */
  async checkIntegrationHealth(id: string): Promise<IntegrationHealthStatus> {
    const integration = await this.prisma.integration.findUnique({
      where: { id },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    // Get recent metrics
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const metrics = await this.prisma.integrationMetric.findMany({
      where: {
        integrationId: id,
        timestamp: { gte: oneDayAgo },
      },
      orderBy: { timestamp: 'desc' },
    });

    if (metrics.length === 0) {
      return {
        integrationId: id,
        status: 'INACTIVE',
        lastCheck: new Date(),
        uptime: 0,
        errorRate: 0,
        avgResponseTime: 0,
        issues: ['No recent activity'],
      };
    }

    // Calculate health metrics
    const totalCalls = metrics.reduce((sum, m) => sum + m.apiCalls, 0);
    const totalErrors = metrics.reduce((sum, m) => sum + m.errorCount, 0);
    const avgUptime =
      metrics.reduce((sum, m) => sum + m.uptimePercentage, 0) / metrics.length;
    const avgResponseTime =
      metrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / metrics.length;

    const errorRate = totalCalls > 0 ? (totalErrors / totalCalls) * 100 : 0;

    const issues: string[] = [];
    let status: IntegrationStatus = 'ACTIVE';

    if (avgUptime < 95) {
      issues.push(`Low uptime: ${avgUptime.toFixed(1)}%`);
      status = 'ERROR';
    }

    if (errorRate > 5) {
      issues.push(`High error rate: ${errorRate.toFixed(1)}%`);
      status = 'ERROR';
    }

    if (avgResponseTime > 5000) {
      issues.push(`Slow response time: ${avgResponseTime.toFixed(0)}ms`);
      if (status !== 'ERROR') status = 'MAINTENANCE';
    }

    // Update integration health status
    await this.prisma.integration.update({
      where: { id },
      data: {
        lastHealthCheck: new Date(),
        healthStatus: issues.length === 0 ? 'healthy' : 'degraded',
        status,
      },
    });

    return {
      integrationId: id,
      status,
      lastCheck: new Date(),
      uptime: avgUptime,
      errorRate,
      avgResponseTime,
      issues,
    };
  }

  /**
   * Record integration metrics
   */
  async recordMetrics(
    integrationId: string,
    metrics: {
      apiCalls: number;
      errorCount: number;
      avgResponseTime: number;
      dataProcessedBytes: bigint;
    }
  ): Promise<void> {
    const timestamp = new Date();
    const hourStart = new Date(
      timestamp.getFullYear(),
      timestamp.getMonth(),
      timestamp.getDate(),
      timestamp.getHours()
    );

    await this.prisma.integrationMetric.create({
      data: {
        integrationId,
        timestamp: hourStart,
        apiCalls: metrics.apiCalls,
        errorCount: metrics.errorCount,
        avgResponseTime: metrics.avgResponseTime,
        uptimePercentage: metrics.errorCount === 0 ? 100 : 99,
        dataProcessedBytes: metrics.dataProcessedBytes,
      },
    });
  }

  /**
   * Record integration error
   */
  async recordError(
    integrationId: string,
    error: {
      errorCode: string;
      errorMessage: string;
      stackTrace?: string;
      requestDetails?: Record<string, any>;
      responseDetails?: Record<string, any>;
    }
  ): Promise<void> {
    // Check if error already exists
    const existingError = await this.prisma.integrationError.findFirst({
      where: {
        integrationId,
        errorCode: error.errorCode,
        errorMessage: error.errorMessage,
      },
    });

    if (existingError) {
      // Update occurrence count
      await this.prisma.integrationError.update({
        where: { id: existingError.id },
        data: {
          occurrenceCount: { increment: 1 },
          lastOccurrence: new Date(),
        },
      });
    } else {
      // Create new error record
      await this.prisma.integrationError.create({
        data: {
          integrationId,
          errorCode: error.errorCode,
          errorMessage: error.errorMessage,
          stackTrace: error.stackTrace,
          requestDetails: error.requestDetails,
          responseDetails: error.responseDetails,
          occurrenceCount: 1,
        },
      });
    }
  }

  /**
   * Get integration errors
   */
  async getErrors(
    integrationId: string,
    filters?: {
      errorCode?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<any[]> {
    const where: any = { integrationId };

    if (filters?.errorCode) {
      where.errorCode = filters.errorCode;
    }

    if (filters?.startDate || filters?.endDate) {
      where.lastOccurrence = {};
      if (filters.startDate) where.lastOccurrence.gte = filters.startDate;
      if (filters.endDate) where.lastOccurrence.lte = filters.endDate;
    }

    const errors = await this.prisma.integrationError.findMany({
      where,
      orderBy: [
        { occurrenceCount: 'desc' },
        { lastOccurrence: 'desc' },
      ],
      take: filters?.limit || 50,
    });

    return errors;
  }

  /**
   * Get integration logs (for debugging)
   */
  async getLogs(
    integrationId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<any[]> {
    // TODO: Implement log retrieval from logging system
    // For now, return metrics as logs
    const where: any = { integrationId };

    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters?.startDate) where.timestamp.gte = filters.startDate;
      if (filters?.endDate) where.timestamp.lte = filters.endDate;
    }

    const metrics = await this.prisma.integrationMetric.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters?.limit || 100,
    });

    return metrics;
  }
}
