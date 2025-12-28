import { PrismaClient, IntegrationConfig, IntegrationConfigType } from '@prisma/client';
import {
  CreateIntegrationConfigDto,
  UpdateIntegrationConfigDto,
  IntegrationConfigFilterParams,
  PaginatedResponse,
} from '@insurance/types';
import { getPrismaClient } from '../prisma/client.js';
import logger from '../logger.js';

const prisma = getPrismaClient();

/**
 * Service for managing integration configurations
 */
export class IntegrationConfigService {
  /**
   * Create a new integration configuration
   */
  async createConfig(data: CreateIntegrationConfigDto): Promise<IntegrationConfig> {
    logger.info('Creating integration config', {
      name: data.name,
      configType: data.configType,
      carrierId: data.carrierId,
      brokerId: data.brokerId,
    });

    const config = await prisma.integrationConfig.create({
      data: {
        name: data.name,
        description: data.description,
        carrierId: data.carrierId,
        brokerId: data.brokerId,
        configType: data.configType,
        config: data.config,
        isActive: data.isActive ?? true,
        isEnabled: data.isEnabled ?? true,
        metadata: data.metadata,
      },
    });

    logger.info('Integration config created', { id: config.id, name: config.name });
    return config;
  }

  /**
   * Get config by ID
   */
  async getConfigById(id: string): Promise<IntegrationConfig | null> {
    return prisma.integrationConfig.findUnique({
      where: { id },
      include: {
        carrier: true,
        broker: true,
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * Get all configs with filtering and pagination
   */
  async getConfigs(filters: IntegrationConfigFilterParams = {}): Promise<PaginatedResponse<IntegrationConfig>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.carrierId) {
      where.carrierId = filters.carrierId;
    }

    if (filters.brokerId) {
      where.brokerId = filters.brokerId;
    }

    if (filters.configType) {
      where.configType = filters.configType;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.isEnabled !== undefined) {
      where.isEnabled = filters.isEnabled;
    }

    const [configs, total] = await Promise.all([
      prisma.integrationConfig.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          carrier: true,
          broker: true,
        },
      }),
      prisma.integrationConfig.count({ where }),
    ]);

    return {
      data: configs,
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
   * Get configs by type
   */
  async getConfigsByType(configType: IntegrationConfigType): Promise<IntegrationConfig[]> {
    return prisma.integrationConfig.findMany({
      where: {
        configType,
        isActive: true,
        isEnabled: true,
      },
      include: {
        carrier: true,
        broker: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get active configs for a carrier
   */
  async getActiveConfigsForCarrier(carrierId: string): Promise<IntegrationConfig[]> {
    return prisma.integrationConfig.findMany({
      where: {
        carrierId,
        isActive: true,
        isEnabled: true,
      },
      include: {
        carrier: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get active configs for a broker
   */
  async getActiveConfigsForBroker(brokerId: string): Promise<IntegrationConfig[]> {
    return prisma.integrationConfig.findMany({
      where: {
        brokerId,
        isActive: true,
        isEnabled: true,
      },
      include: {
        broker: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update config
   */
  async updateConfig(id: string, data: UpdateIntegrationConfigDto): Promise<IntegrationConfig> {
    logger.info('Updating integration config', { id });

    const config = await prisma.integrationConfig.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.carrierId !== undefined && { carrierId: data.carrierId }),
        ...(data.brokerId !== undefined && { brokerId: data.brokerId }),
        ...(data.configType !== undefined && { configType: data.configType }),
        ...(data.config !== undefined && { config: data.config }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
        ...(data.metadata !== undefined && { metadata: data.metadata }),
      },
    });

    logger.info('Integration config updated', { id });
    return config;
  }

  /**
   * Delete config
   */
  async deleteConfig(id: string): Promise<void> {
    logger.info('Deleting integration config', { id });

    await prisma.integrationConfig.delete({
      where: { id },
    });

    logger.info('Integration config deleted', { id });
  }

  /**
   * Enable or disable config
   */
  async toggleConfigEnabled(id: string, enabled: boolean): Promise<IntegrationConfig> {
    logger.info('Toggling integration config', { id, enabled });

    return prisma.integrationConfig.update({
      where: { id },
      data: {
        isEnabled: enabled,
      },
    });
  }

  /**
   * Validate configuration structure
   */
  validateConfigStructure(configType: IntegrationConfigType, config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (configType) {
      case 'API_ENDPOINTS':
        if (!config.endpoints || !Array.isArray(config.endpoints)) {
          errors.push('endpoints must be an array');
        }
        break;

      case 'MAPPING_RULES':
        if (!config.mappings || !Array.isArray(config.mappings)) {
          errors.push('mappings must be an array');
        }
        break;

      case 'VALIDATION_RULES':
        if (!config.rules || !Array.isArray(config.rules)) {
          errors.push('rules must be an array');
        }
        break;

      case 'AUTHENTICATION':
        if (!config.type || typeof config.type !== 'string') {
          errors.push('auth type is required');
        }
        break;

      case 'RATE_LIMITING':
        if (config.limit && typeof config.limit !== 'number') {
          errors.push('rate limit must be a number');
        }
        if (config.window && typeof config.window !== 'number') {
          errors.push('rate limit window must be a number');
        }
        break;

      default:
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get default configuration template for a type
   */
  getConfigTemplate(configType: IntegrationConfigType): Record<string, unknown> {
    const templates: Record<IntegrationConfigType, Record<string, unknown>> = {
      API_ENDPOINTS: {
        endpoints: [
          {
            name: 'submit_lead',
            method: 'POST',
            path: '/leads',
            timeout: 30000,
          },
          {
            name: 'get_quote',
            method: 'POST',
            path: '/quotes',
            timeout: 30000,
          },
          {
            name: 'check_status',
            method: 'GET',
            path: '/status/{id}',
            timeout: 10000,
          },
        ],
      },
      MAPPING_RULES: {
        mappings: [
          {
            sourceField: 'lead.firstName',
            targetField: 'applicant.first_name',
            required: true,
          },
          {
            sourceField: 'lead.lastName',
            targetField: 'applicant.last_name',
            required: true,
          },
          {
            sourceField: 'lead.email',
            targetField: 'applicant.email',
            required: true,
          },
        ],
      },
      VALIDATION_RULES: {
        rules: [
          {
            field: 'email',
            type: 'email',
            required: true,
          },
          {
            field: 'phone',
            type: 'phone',
            required: false,
          },
          {
            field: 'dateOfBirth',
            type: 'date',
            minAge: 18,
          },
        ],
      },
      TRANSFORMATION_RULES: {
        transformations: [
          {
            source: 'lead.firstName',
            target: 'applicant.first_name',
            transform: 'trim',
          },
          {
            source: 'lead.insuranceType',
            target: 'product.type',
            transform: 'uppercase',
          },
        ],
      },
      NOTIFICATION_SETTINGS: {
        email: {
          enabled: true,
          recipients: [],
          events: ['LEAD_SUBMITTED', 'LEAD_CONVERTED', 'LEAD_REJECTED'],
        },
        webhook: {
          enabled: false,
          url: '',
          events: [],
        },
      },
      RATE_LIMITING: {
        enabled: true,
        limit: 100,
        window: 60,
        strategy: 'token_bucket',
      },
      AUTHENTICATION: {
        type: 'bearer_token',
        apiKey: '',
        apiVersion: 'v1',
      },
    };

    return templates[configType] || {};
  }
}
