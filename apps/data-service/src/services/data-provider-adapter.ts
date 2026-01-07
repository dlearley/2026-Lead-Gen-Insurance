// ========================================
// Data Provider Adapter Service
// Abstract layer for third-party data enrichment APIs
// ========================================

import { logger } from '@insurance-lead-gen/core';
import {
  DataProvider,
  DataProviderType,
  EnrichmentQuery,
  EnrichmentResponse,
  CreateDataProviderDto,
  UpdateDataProviderDto,
} from '@insurance-lead-gen/types';

export interface IDataProviderAdapter {
  enrich(query: EnrichmentQuery): Promise<EnrichmentResponse>;
  validateCredentials(): Promise<boolean>;
  getRateLimitStatus(): Promise<{ remaining: number; resetAt: Date }>;
}

export class DataProviderAdapterService {
  private adapters: Map<DataProviderType, IDataProviderAdapter> = new Map();
  private cache: Map<string, { data: unknown; expiresAt: Date }> = new Map();
  private rateLimitTrackers: Map<string, { calls: number; resetAt: Date }> = new Map();

  constructor() {
    this.initializeAdapters();
    this.startCacheCleanup();
  }

  private initializeAdapters(): void {
    // Register adapters for different provider types
    // In production, these would be imported from separate adapter files
    // this.adapters.set('zoominfo', new ZoomInfoAdapter());
    // this.adapters.set('apollo', new ApolloAdapter());
    // this.adapters.set('clearbit', new ClearbitAdapter());
    // this.adapters.set('dun_bradstreet', new DunBradstreetAdapter());
  }

  /**
   * Enrich lead data from one or more providers
   */
  async enrichLead(
    query: EnrichmentQuery,
    providerIds: string[],
    options?: {
      forceRefresh?: boolean;
      maxProviders?: number;
      timeout?: number;
    }
  ): Promise<{
    results: Map<string, EnrichmentResponse>;
    combinedData: Record<string, unknown>;
    errors: Array<{ providerId: string; error: string }>;
  }> {
    const results = new Map<string, EnrichmentResponse>();
    const errors: Array<{ providerId: string; error: string }> = [];
    const combinedData: Record<string, unknown> = {};

    // Generate cache key
    const cacheKey = this.generateCacheKey(query);

    for (const providerId of providerIds) {
      try {
        // Check rate limits
        if (!(await this.checkRateLimit(providerId))) {
          errors.push({ providerId, error: 'Rate limit exceeded' });
          continue;
        }

        // Check cache
        if (!options?.forceRefresh) {
          const cached = await this.getCachedData(cacheKey, providerId);
          if (cached) {
            results.set(providerId, cached);
            combinedData[providerId] = cached.data;
            continue;
          }
        }

        // Perform enrichment
        const response = await this.enrichFromProvider(providerId, query, options?.timeout);

        if (response.success && response.data) {
          results.set(providerId, response);
          combinedData[providerId] = response.data;

          // Cache successful results
          await this.cacheData(cacheKey, providerId, response.data, 1440); // 24 hours default
        } else {
          errors.push({ providerId, error: response.error || 'Enrichment failed' });
        }

        // Update rate limit tracking
        await this.updateRateLimitTracking(providerId);
      } catch (error) {
        errors.push({
          providerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { results, combinedData, errors };
  }

  /**
   * Enrich from a specific provider
   */
  private async enrichFromProvider(
    providerId: string,
    query: EnrichmentQuery,
    timeout?: number
  ): Promise<EnrichmentResponse> {
    const startTime = Date.now();

    try {
      // In production, fetch provider config from database
      const providerConfig = await this.getProviderConfig(providerId);

      if (!providerConfig || !providerConfig.isEnabled) {
        return {
          success: false,
          source: providerId,
          confidence: 0,
          cached: false,
          processingTime: Date.now() - startTime,
          error: 'Provider not configured or disabled',
        };
      }

      // Get adapter for provider type
      const adapter = this.adapters.get(providerConfig.type as DataProviderType);

      if (!adapter) {
        return {
          success: false,
          source: providerId,
          confidence: 0,
          cached: false,
          processingTime: Date.now() - startTime,
          error: `No adapter configured for provider type: ${providerConfig.type}`,
        };
      }

      // Execute enrichment with timeout
      const response = await Promise.race([
        adapter.enrich(query),
        new Promise<EnrichmentResponse>((resolve) =>
          setTimeout(
            () =>
              resolve({
                success: false,
                source: providerId,
                confidence: 0,
                cached: false,
                processingTime: timeout || 10000,
                error: `Enrichment timeout after ${timeout || 10000}ms`,
              }),
            timeout || 10000
          )
        ),
      ]);

      response.processingTime = Date.now() - startTime;

      // Update provider stats
      await this.updateProviderStats(providerId, response.success, response.processingTime);

      return response;
    } catch (error) {
      await this.updateProviderStats(providerId, false, Date.now() - startTime);

      return {
        success: false,
        source: providerId,
        confidence: 0,
        cached: false,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if provider is within rate limits
   */
  private async checkRateLimit(providerId: string): Promise<boolean> {
    const tracker = this.rateLimitTrackers.get(providerId);

    if (!tracker) {
      return true;
    }

    if (tracker.resetAt < new Date()) {
      // Reset tracker
      this.rateLimitTrackers.delete(providerId);
      return true;
    }

    // Get provider config to check limits
    const providerConfig = await this.getProviderConfig(providerId);
    if (providerConfig && tracker.calls >= (providerConfig.rateLimitPerMinute || 60)) {
      return false;
    }

    return true;
  }

  /**
   * Update rate limit tracking
   */
  private async updateRateLimitTracking(providerId: string): Promise<void> {
    const now = new Date();
    const tracker = this.rateLimitTrackers.get(providerId);

    if (!tracker || tracker.resetAt < now) {
      this.rateLimitTrackers.set(providerId, {
        calls: 1,
        resetAt: new Date(now.getTime() + 60000), // 1 minute window
      });
    } else {
      tracker.calls++;
    }
  }

  /**
   * Generate cache key from query
   */
  private generateCacheKey(query: EnrichmentQuery): string {
    const normalized = Object.entries(query)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');

    return Buffer.from(normalized).toString('base64');
  }

  /**
   * Get cached data
   */
  private async getCachedData(
    cacheKey: string,
    providerId: string
  ): Promise<EnrichmentResponse | null> {
    const fullKey = `${providerId}:${cacheKey}`;
    const cached = this.cache.get(fullKey);

    if (!cached || cached.expiresAt < new Date()) {
      this.cache.delete(fullKey);
      return null;
    }

    return {
      success: true,
      data: cached.data as Record<string, unknown>,
      source: providerId,
      confidence: 0.8, // Slightly lower confidence for cached data
      cached: true,
      processingTime: 0,
    };
  }

  /**
   * Cache data
   */
  private async cacheData(
    cacheKey: string,
    providerId: string,
    data: unknown,
    ttlMinutes: number
  ): Promise<void> {
    const fullKey = `${providerId}:${cacheKey}`;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    this.cache.set(fullKey, { data, expiresAt });
  }

  /**
   * Start periodic cache cleanup
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = new Date();
      for (const [key, cached] of this.cache.entries()) {
        if (cached.expiresAt < now) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }

  /**
   * Get provider configuration
   * In production, this would fetch from database
   */
  private async getProviderConfig(providerId: string): Promise<DataProvider | null> {
    // Placeholder - in production, fetch from database
    return null;
  }

  /**
   * Update provider statistics
   */
  private async updateProviderStats(
    providerId: string,
    success: boolean,
    processingTime: number
  ): Promise<void> {
    // Placeholder - in production, update database stats
  }

  /**
   * Merge data from multiple providers with conflict resolution
   */
  mergeProviderData(
    results: Map<string, EnrichmentResponse>,
    resolutionRules?: {
      [field: string]: 'most_recent' | 'highest_priority' | 'most_complete' | 'combine';
    }
  ): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    const conflicts: Array<{ field: string; values: unknown[] }> = [];

    for (const [providerId, response] of results.entries()) {
      if (!response.data) continue;

      for (const [field, value] of Object.entries(response.data)) {
        if (merged[field] === undefined) {
          merged[field] = value;
        } else if (merged[field] !== value) {
          // Conflict detected
          const rule = resolutionRules?.[field] || 'highest_priority';

          switch (rule) {
            case 'most_recent':
              // Use the most recent (last processed)
              merged[field] = value;
              break;

            case 'combine':
              // Try to combine arrays or objects
              if (Array.isArray(merged[field]) && Array.isArray(value)) {
                merged[field] = [...(merged[field] as unknown[]), ...value];
              } else if (typeof merged[field] === 'object' && typeof value === 'object') {
                merged[field] = { ...merged[field], ...value };
              } else {
                // Can't combine, keep first
              }
              break;

            case 'most_complete':
              // Keep the one with more data
              if (this.completenessScore(value) > this.completenessScore(merged[field])) {
                merged[field] = value;
              }
              break;

            case 'highest_priority':
            default:
              // Keep existing (assuming providers were tried in priority order)
              break;
          }
        }
      }
    }

    return merged;
  }

  /**
   * Calculate completeness score for a value
   */
  private completenessScore(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (Array.isArray(value)) return value.length;
    if (typeof value === 'object') {
      return Object.keys(value).filter((k) => (value as Record<string, unknown>)[k] !== undefined).length;
    }
    return 1;
  }

  /**
   * Validate provider credentials
   */
  async validateProviderCredentials(providerId: string): Promise<boolean> {
    const config = await this.getProviderConfig(providerId);

    if (!config) {
      return false;
    }

    const adapter = this.adapters.get(config.type as DataProviderType);
    if (!adapter) {
      return false;
    }

    return await adapter.validateCredentials();
  }

  /**
   * Get provider health status
   */
  async getProviderHealth(providerId: string): Promise<{
    isHealthy: boolean;
    lastSuccessfulAt?: Date;
    successRate: number;
    averageResponseTime?: number;
  }> {
    const config = await this.getProviderConfig(providerId);

    if (!config) {
      return {
        isHealthy: false,
        successRate: 0,
      };
    }

    return {
      isHealthy: config.status === 'active' && config.isEnabled && config.successRate > 0.8,
      lastSuccessfulAt: config.lastSuccessfulAt,
      successRate: config.successRate,
    };
  }
}
