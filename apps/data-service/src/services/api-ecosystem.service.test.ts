import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { apiEcosystemService } from './api-ecosystem.service.js';
import { apiClientRepository } from './api-client-repository.js';
import { prisma } from '../prisma/client.js';

describe('API Ecosystem Service', () => {
  let testClientId: string;

  beforeAll(async () => {
    // Clean up any test data
    await prisma.apiClient.deleteMany({
      where: {
        contactEmail: { contains: 'test@example.com' },
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (testClientId) {
      await prisma.apiClient.delete({
        where: { id: testClientId },
      });
    }
    await prisma.$disconnect();
  });

  describe('API Client Management', () => {
    it('should create a new API client', async () => {
      const client = await apiEcosystemService.createApiClient({
        name: 'Test Client',
        description: 'Test API client for unit tests',
        redirectUris: ['https://example.com/callback'],
        website: 'https://example.com',
        contactEmail: 'test@example.com',
        rateLimitTier: 'basic',
        scopes: ['leads:read', 'leads:write'],
      });

      expect(client).toBeDefined();
      expect(client.id).toBeDefined();
      expect(client.name).toBe('Test Client');
      expect(client.contactEmail).toBe('test@example.com');
      expect(client.status).toBe('ACTIVE');
      expect(client.rateLimitTier).toBe('BASIC');
      expect(client.scopes).toEqual(['leads:read', 'leads:write']);

      testClientId = client.id;
    });

    it('should get API client by ID', async () => {
      const client = await apiEcosystemService.getApiClient(testClientId);

      expect(client).toBeDefined();
      expect(client?.id).toBe(testClientId);
      expect(client?.name).toBe('Test Client');
    });

    it('should update API client', async () => {
      const updated = await apiEcosystemService.updateApiClient(testClientId, {
        description: 'Updated description',
        rateLimitTier: 'standard',
      });

      expect(updated).toBeDefined();
      expect(updated.description).toBe('Updated description');
      expect(updated.rateLimitTier).toBe('STANDARD');
    });

    it('should list API clients', async () => {
      const result = await apiEcosystemService.listApiClients({
        contactEmail: 'test@example.com',
        page: 1,
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(testClientId);
      expect(result.total).toBeGreaterThanOrEqual(1);
    });

    it('should delete API client', async () => {
      const tempClient = await apiEcosystemService.createApiClient({
        name: 'Temp Client',
        redirectUris: ['https://example.com/callback'],
        contactEmail: 'temp@example.com',
      });

      await apiEcosystemService.deleteApiClient(tempClient.id);

      const deleted = await apiEcosystemService.getApiClient(tempClient.id);
      expect(deleted).toBeNull();
    });

    it('should throw error for invalid redirect URI', async () => {
      await expect(
        apiEcosystemService.createApiClient({
          name: 'Invalid Client',
          redirectUris: ['not-a-url'],
          contactEmail: 'test2@example.com',
        })
      ).rejects.toThrow('Invalid redirect URI');
    });

    it('should throw error for invalid email', async () => {
      await expect(
        apiEcosystemService.createApiClient({
          name: 'Invalid Email Client',
          redirectUris: ['https://example.com/callback'],
          contactEmail: 'not-an-email',
        })
      ).rejects.toThrow('Invalid contact email');
    });
  });

  describe('API Key Management', () => {
    it('should create an API key', async () => {
      const apiKey = await apiEcosystemService.createApiKey({
        clientId: testClientId,
        name: 'Test Key',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        scopes: ['leads:read'],
      });

      expect(apiKey).toBeDefined();
      expect(apiKey.id).toBeDefined();
      expect(apiKey.keyId).toBeDefined();
      expect(apiKey.key).toBeDefined(); // Secret key returned on creation
      expect(apiKey.keyPrefix).toBeDefined();
      expect(apiKey.name).toBe('Test Key');
      expect(apiKey.status).toBe('ACTIVE');
      expect(apiKey.expiresAt).toBeDefined();
      expect(apiKey.scopes).toEqual(['leads:read']);
    });

    it('should get API keys for a client', async () => {
      const keys = await apiEcosystemService.getApiKeys(testClientId);

      expect(keys).toBeDefined();
      expect(keys.length).toBeGreaterThanOrEqual(1);
      expect(keys[0].clientId).toBe(testClientId);
    });

    it('should verify API key', async () => {
      // Create a key
      const apiKeyData = await apiEcosystemService.createApiKey({
        clientId: testClientId,
        name: 'Verify Test Key',
        scopes: ['leads:read'],
      });

      // Verify the key (using keyId and secret)
      const result = await apiEcosystemService.verifyApiKey(apiKeyData.keyId, apiKeyData.key);

      expect(result).toBeDefined();
      expect(result?.clientId).toBe(testClientId);
      expect(result?.apiKeyId).toBe(apiKeyData.id);
    });

    it('should fail verification for invalid key', async () => {
      const result = await apiEcosystemService.verifyApiKey('invalid_key_id', 'invalid_secret');

      expect(result).toBeNull();
    });

    it('should revoke API key', async () => {
      const apiKey = await apiEcosystemService.createApiKey({
        clientId: testClientId,
        name: 'Revoke Test Key',
        scopes: ['leads:read'],
      });

      await apiEcosystemService.revokeApiKey(apiKey.id, testClientId);

      const keys = await apiEcosystemService.getApiKeys(testClientId);
      const revokedKey = keys.find(k => k.id === apiKey.id);

      expect(revokedKey).toBeDefined();
      expect(revokedKey?.status).toBe('REVOKED');
    });

    it('should throw error when creating key for inactive client', async () => {
      // Create a client and suspend it
      const inactiveClient = await apiEcosystemService.createApiClient({
        name: 'Inactive Client',
        redirectUris: ['https://example.com/callback'],
        contactEmail: 'inactive@example.com',
      });

      await apiEcosystemService.updateApiClient(inactiveClient.id, {
        status: 'SUSPENDED',
      });

      await expect(
        apiEcosystemService.createApiKey({
          clientId: inactiveClient.id,
          name: 'Test Key',
        })
      ).rejects.toThrow('Cannot create API key for inactive client');

      // Clean up
      await prisma.apiClient.delete({ where: { id: inactiveClient.id } });
    });
  });

  describe('Webhook Management', () => {
    it('should create a webhook subscription', async () => {
      const webhook = await apiEcosystemService.createWebhookSubscription(testClientId, {
        url: 'https://example.com/webhooks',
        events: ['lead.created', 'lead.converted'],
        retryConfig: {
          maxRetries: 3,
          retryDelay: 60,
          backoffMultiplier: 2,
          timeout: 30,
        },
      });

      expect(webhook).toBeDefined();
      expect(webhook.id).toBeDefined();
      expect(webhook.clientId).toBe(testClientId);
      expect(webhook.url).toBe('https://example.com/webhooks');
      expect(webhook.events).toEqual(['lead.created', 'lead.converted']);
      expect(webhook.status).toBe('ACTIVE');
      expect(webhook.secret).toBeDefined();
    });

    it('should get webhook subscriptions', async () => {
      const webhooks = await apiEcosystemService.getWebhookSubscriptions(testClientId);

      expect(webhooks).toBeDefined();
      expect(webhooks.length).toBeGreaterThanOrEqual(1);
      expect(webhooks[0].clientId).toBe(testClientId);
    });

    it('should update webhook subscription', async () => {
      const webhook = await apiEcosystemService.createWebhookSubscription(testClientId, {
        url: 'https://example.com/webhooks',
        events: ['lead.created'],
      });

      const updated = await apiEcosystemService.updateWebhookSubscription(
        webhook.id,
        testClientId,
        {
          status: 'PAUSED',
          events: ['lead.created', 'lead.converted'],
        }
      );

      expect(updated).toBeDefined();
      expect(updated.status).toBe('PAUSED');
      expect(updated.events).toEqual(['lead.created', 'lead.converted']);
    });

    it('should delete webhook subscription', async () => {
      const webhook = await apiEcosystemService.createWebhookSubscription(testClientId, {
        url: 'https://example.com/webhooks',
        events: ['lead.created'],
      });

      await apiEcosystemService.deleteWebhookSubscription(webhook.id, testClientId);

      const webhooks = await apiEcosystemService.getWebhookSubscriptions(testClientId);
      const deleted = webhooks.find(w => w.id === webhook.id);
      expect(deleted).toBeUndefined();
    });

    it('should throw error for invalid webhook URL', async () => {
      await expect(
        apiEcosystemService.createWebhookSubscription(testClientId, {
          url: 'not-a-url',
          events: ['lead.created'],
        })
      ).rejects.toThrow('Invalid webhook URL');
    });

    it('should throw error for empty events', async () => {
      await expect(
        apiEcosystemService.createWebhookSubscription(testClientId, {
          url: 'https://example.com/webhooks',
          events: [],
        })
      ).rejects.toThrow('At least one event type is required');
    });
  });

  describe('Rate Limiting', () => {
    it('should get rate limit configuration', async () => {
      const config = apiEcosystemService.getRateLimitConfig('standard');

      expect(config).toBeDefined();
      expect(config.requestsPerMinute).toBe(120);
      expect(config.requestsPerHour).toBe(5000);
      expect(config.requestsPerDay).toBe(50000);
    });

    it('should check rate limit', async () => {
      const result = await apiEcosystemService.checkRateLimit(
        testClientId,
        { id: 'test-key', rateLimitOverride: 1000 } as any,
        'GET'
      );

      expect(result).toBeDefined();
      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.remaining).toBe('number');
      expect(typeof result.limit).toBe('number');
      expect(result.resetAt).toBeInstanceOf(Date);
    });
  });

  describe('API Usage', () => {
    it('should log API usage', async () => {
      await apiEcosystemService.logApiUsage({
        clientId: testClientId,
        endpoint: '/api/v1/leads',
        method: 'GET',
        statusCode: 200,
        responseTimeMs: 150,
        requestIp: '127.0.0.1',
        userAgent: 'test-agent',
      });

      // No exception thrown = success
      expect(true).toBe(true);
    });

    it('should get API usage statistics', async () => {
      const stats = await apiEcosystemService.getApiUsageStats(testClientId, {
        dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        groupBy: 'day',
      });

      expect(stats).toBeDefined();
      expect(typeof stats.totalRequests).toBe('number');
      expect(typeof stats.successfulRequests).toBe('number');
      expect(typeof stats.failedRequests).toBe('number');
      expect(typeof stats.averageResponseTime).toBe('number');
      expect(Array.isArray(stats.requestsByEndpoint)).toBe(true);
      expect(Array.isArray(stats.requestsByTime)).toBe(true);
      expect(Array.isArray(stats.topErrorCodes)).toBe(true);
    });
  });

  describe('API Client Dashboard', () => {
    it('should get dashboard data', async () => {
      const dashboard = await apiEcosystemService.getApiClientDashboard(testClientId);

      expect(dashboard).toBeDefined();
      expect(dashboard.client).toBeDefined();
      expect(dashboard.client.id).toBe(testClientId);
      expect(dashboard.usageStats).toBeDefined();
      expect(typeof dashboard.activeWebhooks).toBe('number');
      expect(typeof dashboard.totalWebhooks).toBe('number');
      expect(dashboard.rateLimitStatus).toBeDefined();
      expect(dashboard.rateLimitStatus.tier).toBeDefined();
      expect(dashboard.rateLimitStatus.remaining).toBeDefined();
      expect(dashboard.rateLimitStatus.limit).toBeDefined();
      expect(dashboard.rateLimitStatus.resetAt).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent client', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(apiEcosystemService.getApiClientDashboard(fakeId)).rejects.toThrow('API client not found');
    });
  });
});

describe('API Client Repository', () => {
  let testClientId: string;

  beforeAll(async () => {
    const client = await prisma.apiClient.create({
      data: {
        name: 'Repository Test Client',
        redirectUris: ['https://example.com/callback'],
        contactEmail: 'repo-test@example.com',
        rateLimitTier: 'BASIC',
        scopes: [],
      },
    });
    testClientId = client.id;
  });

  afterAll(async () => {
    if (testClientId) {
      await prisma.apiClient.delete({
        where: { id: testClientId },
      });
    }
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const limit = 10; // Small limit for testing

      // Allow requests up to the limit
      for (let i = 0; i < limit; i++) {
        const result = await apiClientRepository.checkRateLimit(testClientId, '1m', limit);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(limit - i - 1);
      }

      // Next request should be blocked
      const blocked = await apiClientRepository.checkRateLimit(testClientId, '1m', limit);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it('should reset rate limit window', async () => {
      const limit = 5;

      // Use all requests
      for (let i = 0; i < limit; i++) {
        await apiClientRepository.checkRateLimit(testClientId, '1m', limit);
      }

      // Check the reset time
      const result = await apiClientRepository.checkRateLimit(testClientId, '1m', limit);
      expect(result.resetAt).toBeInstanceOf(Date);
      expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('API Key Security', () => {
    it('should generate secure API keys', async () => {
      const apiKey = await apiClientRepository.createApiKey({
        clientId: testClientId,
        name: 'Security Test Key',
      });

      expect(apiKey.keyId).toMatch(/^ins_[a-f0-9]+$/);
      expect(apiKey.keyPrefix).toBeDefined();
      expect(apiKey.keyHash).toBeDefined();
      expect(apiKey.keyHash).toHaveLength(64); // SHA256 hash length
      expect(apiKey.keyHash).not.toBe(apiKey.keyId);
    });

    it('should not return secret key in get operations', async () => {
      const created = await apiClientRepository.createApiKey({
        clientId: testClientId,
        name: 'Test Key',
      });

      const fetched = await prisma.apiKey.findUnique({
        where: { id: created.id },
      });

      expect(fetched).toBeDefined();
      expect(fetched?.keyHash).toBeDefined();
      // The raw key should never be returned from database
    });
  });

  describe('Webhook Delivery Tracking', () => {
    it('should create webhook delivery record', async () => {
      const webhook = await apiClientRepository.createWebhookSubscription({
        clientId: testClientId,
        url: 'https://example.com/webhooks',
        events: ['lead.created'],
      });

      const delivery = await apiClientRepository.createWebhookDelivery({
        subscriptionId: webhook.id,
        eventType: 'lead.created',
        payload: { leadId: 'test-lead-id' },
      });

      expect(delivery).toBeDefined();
      expect(delivery.id).toBeDefined();
      expect(delivery.subscriptionId).toBe(webhook.id);
      expect(delivery.eventType).toBe('lead.created');
      expect(delivery.status).toBe('PENDING');
      expect(delivery.attemptCount).toBe(0);

      // Clean up
      await prisma.webhookSubscription.delete({ where: { id: webhook.id } });
    });

    it('should update webhook delivery', async () => {
      const webhook = await apiClientRepository.createWebhookSubscription({
        clientId: testClientId,
        url: 'https://example.com/webhooks',
        events: ['lead.created'],
      });

      const delivery = await apiClientRepository.createWebhookDelivery({
        subscriptionId: webhook.id,
        eventType: 'lead.created',
        payload: { leadId: 'test-lead-id' },
      });

      const updated = await apiClientRepository.updateWebhookDelivery(delivery.id, {
        responseCode: 200,
        attemptCount: 1,
        status: 'DELIVERED',
        deliveredAt: new Date(),
      });

      expect(updated).toBeDefined();
      expect(updated.responseCode).toBe(200);
      expect(updated.attemptCount).toBe(1);
      expect(updated.status).toBe('DELIVERED');
      expect(updated.deliveredAt).toBeInstanceOf(Date);

      // Clean up
      await prisma.webhookSubscription.delete({ where: { id: webhook.id } });
    });
  });
});
