/**
 * Phase 30: Partner Ecosystem & Integrations
 * API Management Service - Handles API keys, rate limiting, and request validation
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import type {
  ApiKey,
  ApiKeyStatus,
  ApiKeyCreateRequest,
  ApiKeyResponse,
  RateLimitInfo,
} from '@insurance-platform/types';

export class APIManagementService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate a new API key
   */
  async generateApiKey(
    partnerId: string,
    request: ApiKeyCreateRequest
  ): Promise<ApiKeyResponse> {
    // Generate secure API key
    const rawKey = this.generateSecureKey();
    const keyPrefix = rawKey.substring(0, 8);
    const hashedKey = this.hashApiKey(rawKey);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        partnerId,
        appId: request.appId,
        keyValue: hashedKey,
        keyPrefix,
        scopes: request.scopes || [],
        rateLimit: request.rateLimit || 1000,
        expiresAt: request.expiresAt,
        status: 'ACTIVE',
      },
    });

    return {
      id: apiKey.id,
      keyPrefix: apiKey.keyPrefix,
      fullKey: rawKey, // Only returned once
      scopes: apiKey.scopes as string[],
      rateLimit: apiKey.rateLimit,
      expiresAt: apiKey.expiresAt || undefined,
      status: apiKey.status as ApiKeyStatus,
      createdAt: apiKey.createdAt,
    };
  }

  /**
   * Validate API key
   */
  async validateApiKey(rawKey: string): Promise<{
    valid: boolean;
    apiKey?: ApiKey;
    reason?: string;
  }> {
    const keyPrefix = rawKey.substring(0, 8);
    const hashedKey = this.hashApiKey(rawKey);

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyValue: hashedKey },
      include: { partner: true },
    });

    if (!apiKey) {
      return { valid: false, reason: 'Invalid API key' };
    }

    if (apiKey.status !== 'ACTIVE') {
      return { valid: false, reason: `API key is ${apiKey.status.toLowerCase()}` };
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      // Auto-expire the key
      await this.prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { status: 'EXPIRED' },
      });
      return { valid: false, reason: 'API key has expired' };
    }

    if (apiKey.partner.status !== 'ACTIVE') {
      return { valid: false, reason: 'Partner account is not active' };
    }

    // Update last used timestamp
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      valid: true,
      apiKey: this.mapPrismaApiKey(apiKey),
    };
  }

  /**
   * Check rate limit for API key
   */
  async checkRateLimit(apiKeyId: string): Promise<RateLimitInfo> {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id: apiKeyId },
    });

    if (!apiKey) {
      throw new Error('API key not found');
    }

    // Use Redis for rate limiting in production
    // For now, we'll implement a simple in-memory rate limiter
    const now = new Date();
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

    // Count API calls in current hour
    const callCount = await this.prisma.partnerUsage.count({
      where: {
        partnerId: apiKey.partnerId,
        metricName: 'api_calls',
        usageDate: {
          gte: hourStart,
          lt: hourEnd,
        },
      },
    });

    const limit = apiKey.rateLimit;
    const remaining = Math.max(0, limit - callCount);

    return {
      limit,
      remaining,
      reset: hourEnd,
      retryAfter: remaining === 0 ? Math.ceil((hourEnd.getTime() - now.getTime()) / 1000) : undefined,
    };
  }

  /**
   * Record API call for usage tracking
   */
  async recordApiCall(
    partnerId: string,
    appId: string | undefined,
    endpoint: string,
    responseTime: number
  ): Promise<void> {
    const now = new Date();
    const usageDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

    // Record API call count
    await this.prisma.partnerUsage.create({
      data: {
        partnerId,
        appId,
        usageDate,
        metricName: 'api_calls',
        metricValue: 1,
        unit: 'count',
      },
    });

    // Record response time
    await this.prisma.partnerUsage.create({
      data: {
        partnerId,
        appId,
        usageDate,
        metricName: 'response_time',
        metricValue: responseTime,
        unit: 'milliseconds',
      },
    });
  }

  /**
   * List API keys for a partner
   */
  async listApiKeys(partnerId: string, appId?: string): Promise<ApiKeyResponse[]> {
    const where: any = { partnerId };
    if (appId) {
      where.appId = appId;
    }

    const apiKeys = await this.prisma.apiKey.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return apiKeys.map((key) => ({
      id: key.id,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes as string[],
      rateLimit: key.rateLimit,
      expiresAt: key.expiresAt || undefined,
      status: key.status as ApiKeyStatus,
      createdAt: key.createdAt,
    }));
  }

  /**
   * Rotate API key
   */
  async rotateApiKey(apiKeyId: string): Promise<ApiKeyResponse> {
    const oldKey = await this.prisma.apiKey.findUnique({
      where: { id: apiKeyId },
    });

    if (!oldKey) {
      throw new Error('API key not found');
    }

    // Mark old key as rotated
    await this.prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { status: 'ROTATED' },
    });

    // Generate new key with same settings
    return this.generateApiKey(oldKey.partnerId, {
      appId: oldKey.appId || undefined,
      scopes: oldKey.scopes as string[],
      rateLimit: oldKey.rateLimit,
      expiresAt: oldKey.expiresAt || undefined,
    });
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(apiKeyId: string): Promise<void> {
    await this.prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { status: 'REVOKED' },
    });
  }

  /**
   * Update API key scopes
   */
  async updateScopes(apiKeyId: string, scopes: string[]): Promise<ApiKey> {
    const apiKey = await this.prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { scopes },
    });

    return this.mapPrismaApiKey(apiKey);
  }

  /**
   * Update rate limit
   */
  async updateRateLimit(apiKeyId: string, rateLimit: number): Promise<ApiKey> {
    const apiKey = await this.prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { rateLimit },
    });

    return this.mapPrismaApiKey(apiKey);
  }

  /**
   * Generate a secure random API key
   */
  private generateSecureKey(): string {
    // Generate 32 random bytes and encode as base64
    const randomBytes = crypto.randomBytes(32);
    const key = randomBytes.toString('base64').replace(/[+/=]/g, '').substring(0, 40);
    return `sk_${key}`;
  }

  /**
   * Hash API key for storage
   */
  private hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Map Prisma API key to domain model
   */
  private mapPrismaApiKey(apiKey: any): ApiKey {
    return {
      id: apiKey.id,
      partnerId: apiKey.partnerId,
      appId: apiKey.appId,
      keyValue: apiKey.keyValue,
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes as string[],
      rateLimit: apiKey.rateLimit,
      lastUsedAt: apiKey.lastUsedAt,
      expiresAt: apiKey.expiresAt,
      status: apiKey.status as ApiKeyStatus,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
    };
  }
}
