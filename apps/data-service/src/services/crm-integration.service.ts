import { PrismaClient } from '@prisma/client';
import {
  CrmProvider,
  CrmIntegration,
  CreateCrmIntegrationDto,
  UpdateCrmIntegrationDto,
  CrmIntegrationFilters,
  PaginatedResponse,
} from '@insurance-lead-gen/types';
import { logger } from '@insurance-lead-gen/core';

export class CrmIntegrationService {
  constructor(private prisma: PrismaClient) {}

  async createIntegration(data: CreateCrmIntegrationDto): Promise<CrmIntegration> {
    logger.info('Creating CRM integration', { provider: data.provider, name: data.name });

    const integration = await this.prisma.crmIntegration.create({
      data: {
        name: data.name,
        provider: data.provider,
        isActive: data.isActive ?? true,
        syncDirection: data.syncDirection || 'BIDIRECTIONAL',
        syncFrequency: data.syncFrequency || 3600,
        autoSync: data.autoSync ?? true,
        metadata: data.metadata,
      },
    });

    logger.info('CRM integration created', { id: integration.id });
    return integration as CrmIntegration;
  }

  async getIntegrationById(id: string): Promise<CrmIntegration | null> {
    return this.prisma.crmIntegration.findUnique({
      where: { id },
      include: {
        fieldMappings: true,
        syncLogs: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    }) as Promise<CrmIntegration | null>;
  }

  async getIntegrations(filters: CrmIntegrationFilters = {}): Promise<PaginatedResponse<CrmIntegration>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.provider) {
      where.provider = filters.provider;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.isConnected !== undefined) {
      where.isConnected = filters.isConnected;
    }

    if (filters.syncStatus) {
      where.syncStatus = filters.syncStatus;
    }

    const [integrations, total] = await Promise.all([
      this.prisma.crmIntegration.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          fieldMappings: true,
        },
      }),
      this.prisma.crmIntegration.count({ where }),
    ]);

    return {
      data: integrations as CrmIntegration[],
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

  async updateIntegration(id: string, data: UpdateCrmIntegrationDto): Promise<CrmIntegration> {
    logger.info('Updating CRM integration', { id });

    const integration = await this.prisma.crmIntegration.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.accessToken !== undefined && { accessToken: data.accessToken }),
        ...(data.refreshToken !== undefined && { refreshToken: data.refreshToken }),
        ...(data.tokenExpiresAt !== undefined && { tokenExpiresAt: data.tokenExpiresAt }),
        ...(data.instanceUrl !== undefined && { instanceUrl: data.instanceUrl }),
        ...(data.webhookSecret !== undefined && { webhookSecret: data.webhookSecret }),
        ...(data.syncDirection !== undefined && { syncDirection: data.syncDirection }),
        ...(data.syncFrequency !== undefined && { syncFrequency: data.syncFrequency }),
        ...(data.autoSync !== undefined && { autoSync: data.autoSync }),
        ...(data.metadata !== undefined && { metadata: data.metadata }),
      },
    });

    logger.info('CRM integration updated', { id });
    return integration as CrmIntegration;
  }

  async deleteIntegration(id: string): Promise<void> {
    logger.info('Deleting CRM integration', { id });
    await this.prisma.crmIntegration.delete({
      where: { id },
    });
    logger.info('CRM integration deleted', { id });
  }

  async updateConnectionStatus(
    id: string,
    isConnected: boolean,
    error?: string,
  ): Promise<CrmIntegration> {
    const updateData: Record<string, unknown> = {
      isConnected,
      ...(error && {
        lastError: error,
        errorCount: { increment: 1 },
      }),
      ...(!error && {
        lastError: null,
        errorCount: 0,
      }),
    };

    return this.prisma.crmIntegration.update({
      where: { id },
      data: updateData,
    }) as Promise<CrmIntegration>;
  }

  async updateSyncStatus(
    id: string,
    status: string,
    lastSyncAt?: Date,
  ): Promise<CrmIntegration> {
    return this.prisma.crmIntegration.update({
      where: { id },
      data: {
        syncStatus: status,
        ...(lastSyncAt && { lastSyncAt }),
      },
    }) as Promise<CrmIntegration>;
  }

  async getIntegrationByProvider(provider: CrmProvider): Promise<CrmIntegration | null> {
    return this.prisma.crmIntegration.findFirst({
      where: {
        provider,
        isActive: true,
        isConnected: true,
      },
      include: {
        fieldMappings: true,
      },
    }) as Promise<CrmIntegration | null>;
  }
}
