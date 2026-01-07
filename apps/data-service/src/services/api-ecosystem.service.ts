import {
  ApiClient,
  ApiKey,
  WebhookSubscription,
  WebhookDelivery,
  ApiUsageStats,
  CreateApiClientDto,
  UpdateApiClientDto,
  CreateApiKeyDto,
  ApiKeyResponse,
  CreateWebhookSubscriptionDto,
  UpdateWebhookSubscriptionDto,
  WebhookRetryConfig,
  WebhookEventPayload,
  RATE_LIMIT_TIERS,
  RateLimitTier,
} from '@insurance/types';
import { apiClientRepository } from './api-client-repository.js';
import logger from '../logger.js';

/**
 * Service for managing API ecosystem functionality
 * Handles API clients, keys, webhooks, and usage tracking
 */
export class ApiEcosystemService {
  /**
   * Create a new API client
   */
  async createApiClient(data: CreateApiClientDto): Promise<ApiClient> {
    // Validate redirect URIs
    if (!data.redirectUris || data.redirectUris.length === 0) {
      throw new Error('At least one redirect URI is required');
    }

    data.redirectUris.forEach(uri => {
      try {
        new URL(uri);
      } catch {
        throw new Error(`Invalid redirect URI: ${uri}`);
      }
    });

    // Validate contact email
    if (!this.isValidEmail(data.contactEmail)) {
      throw new Error('Invalid contact email');
    }

    // Set default rate limit tier if not provided
    const rateLimitTier = data.rateLimitTier || 'basic';

    // Create the client
    const client = await apiClientRepository.createApiClient({
      ...data,
      rateLimitTier,
      scopes: data.scopes || [],
    });

    logger.info('API client created', { clientId: client.id, name: client.name });

    return client;
  }

  /**
   * Get API client by ID
   */
  async getApiClient(id: string): Promise<ApiClient | null> {
    return apiClientRepository.getApiClientById(id);
  }

  /**
   * List API clients
   */
  async listApiClients(params: {
    status?: string;
    rateLimitTier?: string;
    contactEmail?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    return apiClientRepository.listApiClients(params);
  }

  /**
   * Update API client
   */
  async updateApiClient(id: string, data: UpdateApiClientDto): Promise<ApiClient> {
    const existing = await apiClientRepository.getApiClientById(id);
    if (!existing) {
      throw new Error('API client not found');
    }

    // Validate redirect URIs if provided
    if (data.redirectUris) {
      if (data.redirectUris.length === 0) {
        throw new Error('At least one redirect URI is required');
      }
      data.redirectUris.forEach(uri => {
        try {
          new URL(uri);
        } catch {
          throw new Error(`Invalid redirect URI: ${uri}`);
        }
      });
    }

    // Validate contact email if provided
    if (data.contactEmail && !this.isValidEmail(data.contactEmail)) {
      throw new Error('Invalid contact email');
    }

    return apiClientRepository.updateApiClient(id, data);
  }

  /**
   * Delete API client
   */
  async deleteApiClient(id: string): Promise<void> {
    const existing = await apiClientRepository.getApiClientById(id);
    if (!existing) {
      throw new Error('API client not found');
    }

    await apiClientRepository.deleteApiClient(id);
    logger.info('API client deleted', { clientId: id });
  }

  /**
   * Create API key
   */
  async createApiKey(data: CreateApiKeyDto): Promise<ApiKeyResponse> {
    const client = await apiClientRepository.getApiClientById(data.clientId);
    if (!client) {
      throw new Error('API client not found');
    }

    if (client.status !== 'ACTIVE') {
      throw new Error('Cannot create API key for inactive client');
    }

    const apiKey = await apiClientRepository.createApiKey(data);
    const key = (apiKey as any).keyHash || ''; // The temporary secret key

    logger.info('API key created', { clientId: data.clientId, keyId: apiKey.keyId });

    return {
      id: apiKey.id,
      keyId: apiKey.keyId,
      keyPrefix: apiKey.keyPrefix,
      key,
      name: apiKey.name,
      status: apiKey.status,
      expiresAt: apiKey.expiresAt,
      scopes: apiKey.scopes,
      createdAt: apiKey.createdAt,
    };
  }

  /**
   * Verify API key for authentication
   */
  async verifyApiKey(keyId: string, secretKey: string): Promise<{ clientId: string; apiKeyId: string } | null> {
    const result = await apiClientRepository.verifyApiKey(keyId, secretKey);
    if (result) {
      logger.debug('API key verified', { keyId, clientId: result.clientId });
    }
    return result;
  }

  /**
   * Get API keys for a client
   */
  async getApiKeys(clientId: string): Promise<ApiKey[]> {
    return apiClientRepository.getApiKeys(clientId);
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(apiKeyId: string, clientId: string): Promise<void> {
    const keys = await apiClientRepository.getApiKeys(clientId);
    const key = keys.find(k => k.id === apiKeyId);

    if (!key) {
      throw new Error('API key not found');
    }

    if (key.clientId !== clientId) {
      throw new Error('API key does not belong to this client');
    }

    await apiClientRepository.revokeApiKey(apiKeyId);
    logger.info('API key revoked', { apiKeyId, clientId });
  }

  /**
   * Create webhook subscription
   */
  async createWebhookSubscription(clientId: string, data: CreateWebhookSubscriptionDto): Promise<WebhookSubscription> {
    // Validate URL
    try {
      new URL(data.url);
    } catch {
      throw new Error(`Invalid webhook URL: ${data.url}`);
    }

    // Validate events
    if (!data.events || data.events.length === 0) {
      throw new Error('At least one event type is required');
    }

    // Set default retry config
    const retryConfig: WebhookRetryConfig = data.retryConfig || {
      maxRetries: 3,
      retryDelay: 60,
      backoffMultiplier: 2,
      timeout: 30,
    };

    const subscription = await apiClientRepository.createWebhookSubscription({
      clientId,
      url: data.url,
      events: data.events,
      retryConfig,
      metadata: data.metadata,
    });

    logger.info('Webhook subscription created', { subscriptionId: subscription.id, clientId });

    return subscription;
  }

  /**
   * Get webhook subscriptions
   */
  async getWebhookSubscriptions(clientId: string, status?: string): Promise<WebhookSubscription[]> {
    return apiClientRepository.getWebhookSubscriptions(clientId, status);
  }

  /**
   * Update webhook subscription
   */
  async updateWebhookSubscription(id: string, clientId: string, data: UpdateWebhookSubscriptionDto): Promise<WebhookSubscription> {
    const subscriptions = await apiClientRepository.getWebhookSubscriptions(clientId);
    const subscription = subscriptions.find(s => s.id === id);

    if (!subscription) {
      throw new Error('Webhook subscription not found');
    }

    // Validate URL if provided
    if (data.url) {
      try {
        new URL(data.url);
      } catch {
        throw new Error(`Invalid webhook URL: ${data.url}`);
      }
    }

    return apiClientRepository.updateWebhookSubscription(id, data);
  }

  /**
   * Delete webhook subscription
   */
  async deleteWebhookSubscription(id: string, clientId: string): Promise<void> {
    const subscriptions = await apiClientRepository.getWebhookSubscriptions(clientId);
    const subscription = subscriptions.find(s => s.id === id);

    if (!subscription) {
      throw new Error('Webhook subscription not found');
    }

    await apiClientRepository.deleteWebhookSubscription(id);
    logger.info('Webhook subscription deleted', { subscriptionId: id, clientId });
  }

  /**
   * Trigger webhook for event
   */
  async triggerWebhook(eventType: string, payload: Record<string, unknown>): Promise<void> {
    const subscriptions = await apiClientRepository.getActiveWebhooksForEvent(eventType);

    for (const subscription of subscriptions) {
      try {
        await this.deliverWebhook(subscription, eventType, payload);
      } catch (error) {
        logger.error('Failed to trigger webhook', {
          subscriptionId: subscription.id,
          eventType,
          error: (error as Error).message,
        });
      }
    }
  }

  /**
   * Deliver webhook to subscription
   */
  private async deliverWebhook(
    subscription: WebhookSubscription,
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const webhookPayload: WebhookEventPayload = {
      id: crypto.randomUUID(),
      eventType,
      timestamp: new Date(),
      data: payload,
      version: '1.0',
    };

    // Create delivery record
    const delivery = await apiClientRepository.createWebhookDelivery({
      subscriptionId: subscription.id,
      eventType,
      payload: webhookPayload,
    });

    // Deliver the webhook
    const retryConfig = (subscription.retryConfig as WebhookRetryConfig) || {
      maxRetries: 3,
      retryDelay: 60,
      backoffMultiplier: 2,
      timeout: 30,
    };

    let attempt = 0;
    let lastError: string | undefined;

    while (attempt <= retryConfig.maxRetries) {
      attempt++;

      try {
        const response = await fetch(subscription.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Id': webhookPayload.id,
            'X-Webhook-Event': eventType,
            'X-Webhook-Timestamp': webhookPayload.timestamp.toISOString(),
            'X-Webhook-Signature': this.generateSignature(webhookPayload, subscription.secret),
          },
          body: JSON.stringify(webhookPayload),
          signal: AbortSignal.timeout(retryConfig.timeout * 1000),
        });

        if (response.ok) {
          await apiClientRepository.updateWebhookDelivery(delivery.id, {
            responseCode: response.status,
            attemptCount: attempt,
            status: 'DELIVERED',
            deliveredAt: new Date(),
          });

          logger.info('Webhook delivered successfully', {
            deliveryId: delivery.id,
            subscriptionId: subscription.id,
            attempt,
          });

          return;
        }

        lastError = `HTTP ${response.status}`;
        await this.delay(retryConfig.retryDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1) * 1000);
      } catch (error) {
        lastError = (error as Error).message;
        await this.delay(retryConfig.retryDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1) * 1000);
      }
    }

    // All retries failed
    await apiClientRepository.updateWebhookDelivery(delivery.id, {
      attemptCount: attempt - 1,
      status: 'MAX_RETRIES_EXCEEDED',
      errorMessage: lastError,
    });

    logger.error('Webhook delivery failed after all retries', {
      deliveryId: delivery.id,
      subscriptionId: subscription.id,
      attempts: attempt - 1,
      lastError,
    });
  }

  /**
   * Get webhook delivery history
   */
  async getWebhookDeliveries(subscriptionId: string, clientId: string, limit = 50): Promise<WebhookDelivery[]> {
    const subscriptions = await apiClientRepository.getWebhookSubscriptions(clientId);
    const subscription = subscriptions.find(s => s.id === subscriptionId);

    if (!subscription) {
      throw new Error('Webhook subscription not found');
    }

    return apiClientRepository.getWebhookDeliveries(subscriptionId, limit);
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
  }): Promise<void> {
    await apiClientRepository.logApiUsage(data);
  }

  /**
   * Get API usage statistics
   */
  async getApiUsageStats(clientId: string, params?: {
    dateFrom?: Date;
    dateTo?: Date;
    groupBy?: 'hour' | 'day';
  }): Promise<ApiUsageStats> {
    return apiClientRepository.getApiUsageStats(clientId, params);
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(
    clientId: string,
    apiKey: ApiKey | null,
    method: string
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date; limit: number }> {
    const tier = apiKey?.rateLimitOverride
      ? apiKey.rateLimitOverride
      : RATE_LIMIT_TIERS[apiKey?.rateLimitOverride ? 'standard' : 'basic'].requestsPerMinute;

    // Use custom tier if API key has rate limit override
    const tierLimit = apiKey?.rateLimitOverride || tier;

    const result = await apiClientRepository.checkRateLimit(clientId, '1m', tierLimit);

    return {
      ...result,
      limit: tierLimit,
    };
  }

  /**
   * Get rate limit tier configuration
   */
  getRateLimitConfig(tier: RateLimitTier): { requestsPerMinute: number; requestsPerHour: number; requestsPerDay: number } {
    const config = RATE_LIMIT_TIERS[tier];
    return {
      requestsPerMinute: config.requestsPerMinute,
      requestsPerHour: config.requestsPerHour,
      requestsPerDay: config.requestsPerDay,
    };
  }

  /**
   * Generate HMAC signature for webhook
   */
  private generateSignature(payload: unknown, secret: string): string {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    const timestamp = Date.now().toString();
    const data = `${timestamp}.${JSON.stringify(payload)}`;
    return `t=${timestamp},v1=${hmac.update(data).digest('hex')}`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get API client dashboard data
   */
  async getApiClientDashboard(clientId: string) {
    const [client, usageStats, webhooks] = await Promise.all([
      apiClientRepository.getApiClientById(clientId),
      apiClientRepository.getApiUsageStats(clientId, {
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      }),
      apiClientRepository.getWebhookSubscriptions(clientId),
    ]);

    if (!client) {
      throw new Error('API client not found');
    }

    const activeWebhooks = webhooks.filter(w => w.status === 'ACTIVE').length;

    const rateLimitConfig = RATE_LIMIT_TIERS[client.rateLimitTier];
    const currentRateLimit = await apiClientRepository.checkRateLimit(clientId, '1m', rateLimitConfig.requestsPerMinute);

    return {
      client,
      usageStats,
      activeWebhooks,
      totalWebhooks: webhooks.length,
      rateLimitStatus: {
        tier: client.rateLimitTier,
        remaining: currentRateLimit.remaining,
        limit: rateLimitConfig.requestsPerMinute,
        resetAt: currentRateLimit.resetAt,
      },
    };
  }
}

export const apiEcosystemService = new ApiEcosystemService();
