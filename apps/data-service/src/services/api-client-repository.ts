import { PrismaClient, ApiClient, ApiKey, WebhookSubscription, WebhookDelivery, ApiUsageLog, ApiRateLimit } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';

const prisma = new PrismaClient();

/**
 * Repository for API ecosystem data operations
 */
export class ApiClientRepository {
  /**
   * Create a new API client
   */
  async createApiClient(data: {
    name: string;
    description?: string;
    redirectUris: string[];
    website?: string;
    logoUrl?: string;
    contactEmail: string;
    rateLimitTier?: string;
    webhookUrl?: string;
    webhookSecret?: string;
    scopes?: string[];
    metadata?: unknown;
  }): Promise<ApiClient> {
    return prisma.apiClient.create({
      data,
      include: {
        apiKeys: true,
        webhookSubscriptions: true,
      },
    });
  }

  /**
   * Get API client by ID
   */
  async getApiClientById(id: string): Promise<ApiClient | null> {
    return prisma.apiClient.findUnique({
      where: { id },
      include: {
        apiKeys: {
          orderBy: { createdAt: 'desc' },
        },
        webhookSubscriptions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Get API client by key ID (for authentication)
   */
  async getApiClientByKeyId(keyId: string): Promise<{ client: ApiClient; key: ApiKey } | null> {
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyId },
      include: {
        apiClient: true,
      },
    });

    if (!apiKey || apiKey.status !== 'ACTIVE') {
      return null;
    }

    // Check if client is active
    if (apiKey.apiClient.status !== 'ACTIVE') {
      return null;
    }

    return { client: apiKey.apiClient, key: apiKey };
  }

  /**
   * List API clients with filtering and pagination
   */
  async listApiClients(params: {
    status?: string;
    rateLimitTier?: string;
    contactEmail?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: ApiClient[]; total: number; page: number; limit: number }> {
    const { status, rateLimitTier, contactEmail, search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (rateLimitTier) {
      where.rateLimitTier = rateLimitTier;
    }

    if (contactEmail) {
      where.contactEmail = { contains: contactEmail, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.apiClient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          apiKeys: {
            where: { status: 'ACTIVE' },
            select: { id: true, keyId: true, name: true, status: true, createdAt: true },
          },
          _count: {
            select: {
              apiKeys: true,
              webhookSubscriptions: true,
            },
          },
        },
      }),
      prisma.apiClient.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Update API client
   */
  async updateApiClient(id: string, data: Partial<Omit<ApiClient, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ApiClient> {
    return prisma.apiClient.update({
      where: { id },
      data,
      include: {
        apiKeys: true,
        webhookSubscriptions: true,
      },
    });
  }

  /**
   * Delete API client
   */
  async deleteApiClient(id: string): Promise<void> {
    await prisma.apiClient.delete({ where: { id } });
  }

  /**
   * Generate a new API key for a client
   */
  async createApiKey(data: {
    clientId: string;
    name: string;
    expiresAt?: Date;
    scopes?: string[];
    rateLimitOverride?: number;
    metadata?: unknown;
  }): Promise<ApiKey> {
    // Generate a secure API key
    const keyId = this.generateKeyId();
    const secretKey = this.generateSecretKey();
    const keyHash = this.hashKey(secretKey);
    const keyPrefix = secretKey.slice(0, 8);

    const apiKey = await prisma.apiKey.create({
      data: {
        ...data,
        keyId,
        keyHash,
        keyPrefix,
        status: 'ACTIVE',
      },
    });

    // Return the key with the secret (only time it's returned)
    return { ...apiKey, keyHash: secretKey } as ApiKey;
  }

  /**
   * Verify an API key
   */
  async verifyApiKey(keyId: string, secretKey: string): Promise<{ clientId: string; apiKeyId: string } | null> {
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyId },
    });

    if (!apiKey) {
      return null;
    }

    // Check if key is active and not expired
    if (apiKey.status !== 'ACTIVE') {
      return null;
    }

    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      // Update status to expired
      await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { status: 'EXPIRED' },
      });
      return null;
    }

    // Verify key hash
    const keyHash = this.hashKey(secretKey);
    if (keyHash !== apiKey.keyHash) {
      return null;
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return { clientId: apiKey.clientId, apiKeyId: apiKey.id };
  }

  /**
   * Get API keys for a client
   */
  async getApiKeys(clientId: string): Promise<ApiKey[]> {
    return prisma.apiKey.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(apiKeyId: string): Promise<void> {
    await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { status: 'REVOKED' },
    });
  }

  /**
   * Create a webhook subscription
   */
  async createWebhookSubscription(data: {
    clientId: string;
    url: string;
    events: string[];
    retryConfig?: unknown;
    metadata?: unknown;
  }): Promise<WebhookSubscription> {
    const secret = this.generateWebhookSecret();

    return prisma.webhookSubscription.create({
      data: {
        ...data,
        secret,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Get webhook subscriptions for a client
   */
  async getWebhookSubscriptions(clientId: string, status?: string): Promise<WebhookSubscription[]> {
    const where: any = { clientId };
    if (status) {
      where.status = status;
    }

    return prisma.webhookSubscription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { deliveries: true },
        },
      },
    });
  }

  /**
   * Update webhook subscription
   */
  async updateWebhookSubscription(id: string, data: Partial<Omit<WebhookSubscription, 'id' | 'clientId' | 'secret' | 'createdAt' | 'updatedAt'>>): Promise<WebhookSubscription> {
    return prisma.webhookSubscription.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete webhook subscription
   */
  async deleteWebhookSubscription(id: string): Promise<void> {
    await prisma.webhookSubscription.delete({ where: { id } });
  }

  /**
   * Get active webhook subscriptions for an event type
   */
  async getActiveWebhooksForEvent(eventType: string): Promise<WebhookSubscription[]> {
    return prisma.webhookSubscription.findMany({
      where: {
        status: 'ACTIVE',
        events: {
          has: eventType,
        },
      },
      include: {
        apiClient: {
          select: { id: true, name: true, status: true },
        },
      },
    });
  }

  /**
   * Create a webhook delivery record
   */
  async createWebhookDelivery(data: {
    subscriptionId: string;
    eventType: string;
    payload: unknown;
  }): Promise<WebhookDelivery> {
    return prisma.webhookDelivery.create({
      data: {
        ...data,
        status: 'PENDING',
        attemptCount: 0,
      },
    });
  }

  /**
   * Update webhook delivery
   */
  async updateWebhookDelivery(id: string, data: Partial<Omit<WebhookDelivery, 'id' | 'subscriptionId' | 'eventType' | 'payload' | 'createdAt'>>>): Promise<WebhookDelivery> {
    return prisma.webhookDelivery.update({
      where: { id },
      data,
    });
  }

  /**
   * Get webhook delivery history
   */
  async getWebhookDeliveries(subscriptionId: string, limit = 50): Promise<WebhookDelivery[]> {
    return prisma.webhookDelivery.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Log API usage
   */
  async logApiUsage(data: {
    clientId: string;
    apiKeyId?: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTimeMs: number;
    requestIp?: string;
    userAgent?: string;
    requestSize?: number;
    responseSize?: number;
  }): Promise<ApiUsageLog> {
    return prisma.apiUsageLog.create({ data });
  }

  /**
   * Get API usage statistics
   */
  async getApiUsageStats(clientId: string, params: {
    dateFrom?: Date;
    dateTo?: Date;
    groupBy?: 'hour' | 'day';
  } = {}): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    requestsByEndpoint: Array<{ endpoint: string; count: number; avgResponseTime: number }>;
    requestsByTime: Array<{ time: string; count: number }>;
    topErrorCodes: Array<{ statusCode: number; count: number }>;
  }> {
    const { dateFrom, dateTo, groupBy = 'day' } = params;
    const where: any = { clientId };

    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) where.timestamp.gte = dateFrom;
      if (dateTo) where.timestamp.lte = dateTo;
    }

    const [total, successful, failed, byEndpoint, byTime, errorCodes] = await Promise.all([
      prisma.apiUsageLog.count({ where }),
      prisma.apiUsageLog.count({ where: { ...where, statusCode: { lt: 400 } } }),
      prisma.apiUsageLog.count({ where: { ...where, statusCode: { gte: 400 } } }),
      prisma.apiUsageLog.groupBy({
        by: ['endpoint'],
        where,
        _count: { endpoint: true },
        _avg: { responseTimeMs: true },
        orderBy: { _count: { endpoint: 'desc' } },
        take: 20,
      }),
      this.getUsageByTime(clientId, dateFrom, dateTo, groupBy),
      prisma.apiUsageLog.groupBy({
        by: ['statusCode'],
        where: { ...where, statusCode: { gte: 400 } },
        _count: { statusCode: true },
        orderBy: { _count: { statusCode: 'desc' } },
        take: 10,
      }),
    ]);

    const avgResponseTime = await prisma.apiUsageLog.aggregate({
      where,
      _avg: { responseTimeMs: true },
    });

    return {
      totalRequests: total,
      successfulRequests: successful,
      failedRequests: failed,
      averageResponseTime: avgResponseTime._avg.responseTimeMs || 0,
      requestsByEndpoint: byEndpoint.map(item => ({
        endpoint: item.endpoint,
        count: item._count.endpoint,
        avgResponseTime: item._avg.responseTimeMs || 0,
      })),
      requestsByTime: byTime,
      topErrorCodes: errorCodes.map(item => ({
        statusCode: item.statusCode,
        count: item._count.statusCode,
      })),
    };
  }

  /**
   * Get usage grouped by time
   */
  private async getUsageByTime(clientId: string, dateFrom?: Date, dateTo?: Date, groupBy: 'hour' | 'day' = 'day'): Promise<Array<{ time: string; count: number }>> {
    const where: any = { clientId };
    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) where.timestamp.gte = dateFrom;
      if (dateTo) where.timestamp.lte = dateTo;
    }

    // For simplicity, we're doing a basic grouping
    // In production, you might want to use date_trunc for PostgreSQL
    const logs = await prisma.apiUsageLog.findMany({
      where,
      select: { timestamp: true },
      orderBy: { timestamp: 'asc' },
    });

    const grouped = new Map<string, number>();

    logs.forEach(log => {
      const date = new Date(log.timestamp);
      let key: string;

      if (groupBy === 'hour') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      }

      grouped.set(key, (grouped.get(key) || 0) + 1);
    });

    return Array.from(grouped.entries()).map(([time, count]) => ({ time, count }));
  }

  /**
   * Check and update rate limit
   */
  async checkRateLimit(clientId: string, window: string, limit: number): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const now = new Date();
    const resetAt = this.calculateResetTime(window, now);

    // Get or create rate limit record
    let rateLimit = await prisma.apiRateLimit.findUnique({
      where: { clientId_window: { clientId, window } },
    });

    if (!rateLimit || rateLimit.resetAt < now) {
      // Create new window or reset expired window
      rateLimit = await prisma.apiRateLimit.upsert({
        where: { clientId_window: { clientId, window } },
        create: {
          clientId,
          window,
          requestCount: 0,
          requestLimit: limit,
          resetAt,
        },
        update: {
          requestCount: 0,
          requestLimit: limit,
          resetAt,
        },
      });
    }

    const remaining = Math.max(0, limit - rateLimit.requestCount);
    const allowed = rateLimit.requestCount < limit;

    if (allowed) {
      await prisma.apiRateLimit.update({
        where: { clientId_window: { clientId, window } },
        data: { requestCount: rateLimit.requestCount + 1 },
      });
    }

    return { allowed, remaining, resetAt: rateLimit.resetAt };
  }

  /**
   * Calculate reset time based on window
   */
  private calculateResetTime(window: string, now: Date): Date {
    const reset = new Date(now);

    switch (window) {
      case '1m':
        reset.setMinutes(reset.getMinutes() + 1, 0, 0);
        break;
      case '1h':
        reset.setHours(reset.getHours() + 1, 0, 0, 0);
        break;
      case '1d':
        reset.setDate(reset.getDate() + 1);
        reset.setHours(0, 0, 0, 0);
        break;
      default:
        reset.setMinutes(reset.getMinutes() + 1, 0, 0);
    }

    return reset;
  }

  /**
   * Generate a unique key ID
   */
  private generateKeyId(): string {
    return `ins_${randomBytes(16).toString('hex')}`;
  }

  /**
   * Generate a secret API key
   */
  private generateSecretKey(): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(24).toString('hex');
    return `ins_${timestamp}_${random}`;
  }

  /**
   * Hash an API key
   */
  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  /**
   * Generate webhook secret
   */
  private generateWebhookSecret(): string {
    return randomBytes(32).toString('hex');
  }
}

export const apiClientRepository = new ApiClientRepository();
