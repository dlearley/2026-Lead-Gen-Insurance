/**
 * Multi-Layer Advanced Caching Service
 * Phase 13.6: Intelligent caching with Redis, local memory, and CDN layers
 */

import { CacheManager, logger } from '@insurance-lead-gen/core';
import Redis from 'ioredis';
import { EventEmitter } from 'events';

export interface CacheLayer {
  name: string;
  type: 'memory' | 'redis' | 'cdn';
  ttl: number;
  maxSize?: number;
  evictionPolicy?: 'lru' | 'lfu' | 'fifo';
  enabled: boolean;
  priority: number;
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

export interface CacheStrategy {
  layers: CacheLayer[];
  invalidationPolicies: CacheInvalidationPolicy[];
  warmingStrategies: CacheWarmingStrategy[];
  replication?: CacheReplicationConfig;
}

export interface CacheInvalidationPolicy {
  pattern: string;
  trigger: 'time' | 'event' | 'dependency';
  dependency?: string;
  ttl?: number;
  customInvalidator?: string;
}

export interface CacheWarmingStrategy {
  name: string;
  keys: string[];
  schedule?: string;
  loader: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  enabled: boolean;
}

export interface CacheReplicationConfig {
  enabled: boolean;
  replicas: string[];
  consistency: 'strong' | 'eventual' | 'weak';
  replicationDelay: number;
}

export interface CacheMetrics {
  layer: string;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  size: number;
  memoryUsage: number;
  avgGetTime: number;
  avgSetTime: number;
}

export interface CacheHitRateReport {
  overall: number;
  byKey: Record<string, number>;
  byPattern: Record<string, number>;
  byLayer: Record<string, number>;
  timestamp: Date;
}

export interface IntelligentCacheKey {
  key: string;
  pattern: string;
  category: 'user_data' | 'analytics' | 'static' | 'api_response' | 'computed';
  estimatedSize: number;
  accessFrequency: number;
  lastAccessed: Date;
  dependencies: string[];
}

export interface CacheOptimizationRecommendation {
  id: string;
  type: 'ttl_adjustment' | 'key_pattern' | 'eviction_policy' | 'layer_distribution';
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  currentValue: string;
  recommendedValue: string;
  expectedImpact: string;
  implementation: string[];
}

export class AdvancedMultiLayerCacheService extends EventEmitter {
  private redis: Redis;
  private memoryCache: Map<string, any> = new Map();
  private cdnCache?: any; // Would be actual CDN client
  private strategies: Map<string, CacheStrategy> = new Map();
  private cacheKeys: Map<string, IntelligentCacheKey> = new Map();
  private metrics: Map<string, CacheMetrics> = new Map();
  private accessPatterns: Map<string, number[]> = new Map();
  
  // Configuration
  private readonly DEFAULT_TTL = 3600; // 1 hour
  private readonly MAX_MEMORY_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly CACHE_WARMING_INTERVAL = 300000; // 5 minutes
  private readonly PATTERN_ANALYSIS_PERIOD = 86400000; // 24 hours

  constructor(redisConnection: Redis) {
    super();
    this.redis = redisConnection;
    this.initializeStrategies();
    this.startPeriodicOptimization();
  }

  /**
   * Initialize default caching strategies
   */
  private initializeStrategies(): void {
    // User data strategy - high priority, longer TTL
    const userDataStrategy: CacheStrategy = {
      layers: [
        {
          name: 'memory',
          type: 'memory',
          ttl: 1800, // 30 minutes
          maxSize: this.MAX_MEMORY_CACHE_SIZE * 0.3,
          evictionPolicy: 'lru',
          enabled: true,
          priority: 1,
          size: 0,
          hits: 0,
          misses: 0,
          hitRate: 0
        },
        {
          name: 'redis',
          type: 'redis',
          ttl: 3600, // 1 hour
          enabled: true,
          priority: 2,
          size: 0,
          hits: 0,
          misses: 0,
          hitRate: 0
        }
      ],
      invalidationPolicies: [
        {
          pattern: 'user:*',
          trigger: 'event',
          dependency: 'user_update'
        }
      ],
      warmingStrategies: [
        {
          name: 'user_profile_warming',
          keys: ['user:profile:*', 'user:settings:*'],
          priority: 'high',
          enabled: true,
          loader: 'UserDataLoader'
        }
      ]
    };

    // Analytics strategy - high throughput, shorter TTL
    const analyticsStrategy: CacheStrategy = {
      layers: [
        {
          name: 'memory',
          type: 'memory',
          ttl: 300, // 5 minutes
          maxSize: this.MAX_MEMORY_CACHE_SIZE * 0.2,
          evictionPolicy: 'lfu',
          enabled: true,
          priority: 1,
          size: 0,
          hits: 0,
          misses: 0,
          hitRate: 0
        },
        {
          name: 'redis',
          type: 'redis',
          ttl: 900, // 15 minutes
          enabled: true,
          priority: 2,
          size: 0,
          hits: 0,
          misses: 0,
          hitRate: 0
        }
      ],
      invalidationPolicies: [
        {
          pattern: 'analytics:*',
          trigger: 'time',
          ttl: 300
        }
      ],
      warmingStrategies: []
    };

    // API response strategy - balanced
    const apiResponseStrategy: CacheStrategy = {
      layers: [
        {
          name: 'memory',
          type: 'memory',
          ttl: 600, // 10 minutes
          maxSize: this.MAX_MEMORY_CACHE_SIZE * 0.4,
          evictionPolicy: 'lru',
          enabled: true,
          priority: 1,
          size: 0,
          hits: 0,
          misses: 0,
          hitRate: 0
        },
        {
          name: 'redis',
          type: 'redis',
          ttl: 1800, // 30 minutes
          enabled: true,
          priority: 2,
          size: 0,
          hits: 0,
          misses: 0,
          hitRate: 0
        }
      ],
      invalidationPolicies: [
        {
          pattern: 'api:*',
          trigger: 'dependency',
          dependency: 'data_change'
        }
      ],
      warmingStrategies: []
    };

    // Static content strategy - longest TTL
    const staticStrategy: CacheStrategy = {
      layers: [
        {
          name: 'memory',
          type: 'memory',
          ttl: 7200, // 2 hours
          maxSize: this.MAX_MEMORY_CACHE_SIZE * 0.1,
          evictionPolicy: 'fifo',
          enabled: true,
          priority: 3,
          size: 0,
          hits: 0,
          misses: 0,
          hitRate: 0
        },
        {
          name: 'redis',
          type: 'redis',
          ttl: 86400, // 24 hours
          enabled: true,
          priority: 4,
          size: 0,
          hits: 0,
          misses: 0,
          hitRate: 0
        }
      ],
      invalidationPolicies: [
        {
          pattern: 'static:*',
          trigger: 'time',
          ttl: 3600
        }
      ],
      warmingStrategies: []
    };

    this.strategies.set('user_data', userDataStrategy);
    this.strategies.set('analytics', analyticsStrategy);
    this.strategies.set('api_response', apiResponseStrategy);
    this.strategies.set('static', staticStrategy);

    logger.info('Cache strategies initialized', {
      strategies: Array.from(this.strategies.keys())
    });
  }

  /**
   * Intelligent get with multi-layer fallback
   */
  async get<T>(key: string, strategy?: string): Promise<T | null> {
    const startTime = Date.now();
    const cacheKey = this.categorizeCacheKey(key);
    const cacheStrategy = strategy || this.detectStrategy(key);

    try {
      let value: T | null = null;
      let hitLayer: CacheLayer | null = null;

      // Try layers in priority order
      for (const layer of cacheStrategy.layers.filter(l => l.enabled).sort((a, b) => a.priority - b.priority)) {
        const layerValue = await this.getFromLayer<T>(layer, key);
        
        if (layerValue !== null) {
          value = layerValue;
          hitLayer = layer;
          break;
        }
      }

      const getTime = Date.now() - startTime;
      
      // Update metrics
      this.updateGetMetrics(cacheStrategy, hitLayer, getTime, value !== null);

      if (value !== null && hitLayer) {
        // Propagate to higher priority layers for better performance
        await this.propagateToHigherLayers(cacheStrategy, key, value, hitLayer);
        
        logger.debug('Cache hit', { key, layer: hitLayer.name, getTime });
      } else {
        logger.debug('Cache miss', { key, strategy: cacheStrategy });
      }

      return value;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  }

  /**
   * Intelligent set with multi-layer distribution
   */
  async set(key: string, value: any, ttl?: number, strategy?: string): Promise<void> {
    const startTime = Date.now();
    const cacheKey = this.categorizeCacheKey(key);
    const cacheStrategy = strategy || this.detectStrategy(key);
    const actualTTL = ttl || this.getDefaultTTL(cacheKey.category);

    try {
      // Store in all enabled layers
      const setPromises = cacheStrategy.layers
        .filter(layer => layer.enabled)
        .map(async (layer) => {
          try {
            await this.setToLayer(layer, key, value, actualTTL);
            return layer.name;
          } catch (error) {
            logger.error('Failed to set in layer', { layer: layer.name, key, error });
            return null;
          }
        });

      const setResults = await Promise.all(setPromises);
      const setTime = Date.now() - startTime;

      // Update intelligent cache key metadata
      this.updateCacheKeyMetadata(key, value);

      // Update metrics
      this.updateSetMetrics(cacheStrategy, setTime);

      logger.debug('Cache set completed', { 
        key, 
        layers: setResults.filter(Boolean), 
        setTime,
        ttl: actualTTL 
      });
    } catch (error) {
      logger.error('Cache set error', { key, error });
    }
  }

  /**
   * Smart cache invalidation based on patterns and dependencies
   */
  async invalidate(pattern: string, reason?: string): Promise<number> {
    const startTime = Date.now();
    let invalidationCount = 0;

    try {
      // Get all matching keys
      const keys = await this.getMatchingKeys(pattern);

      for (const key of keys) {
        const invalidatePromises = [];
        
        // Invalidate from all layers
        for (const [strategyName, strategy] of this.strategies) {
          for (const layer of strategy.layers.filter(l => l.enabled)) {
            invalidatePromises.push(this.invalidateFromLayer(layer, key));
          }
        }

        const results = await Promise.allSettle(invalidatePromises);
        invalidationCount += results.filter(r => r.status === 'fulfilled').length;

        // Remove from cache key tracking
        this.cacheKeys.delete(key);
      }

      // Clean memory cache if pattern matches
      if (pattern.includes('*')) {
        const regex = this.patternToRegex(pattern);
        for (const key of this.memoryCache.keys()) {
          if (regex.test(key)) {
            this.memoryCache.delete(key);
            invalidationCount++;
          }
        }
      }

      const invalidationTime = Date.now() - startTime;
      
      logger.info('Cache invalidation completed', {
        pattern,
        reason,
        count: invalidationCount,
        time: invalidationTime
      });

      // Emit invalidation event
      this.emit('invalidated', { pattern, reason, count: invalidationCount });

      return invalidationCount;
    } catch (error) {
      logger.error('Cache invalidation error', { pattern, error });
      return 0;
    }
  }

  /**
   * Intelligent cache warming based on access patterns
   */
  async warmCache(): Promise<void> {
    const startTime = Date.now();

    try {
      logger.info('Starting cache warming process');

      for (const [strategyName, strategy] of this.strategies) {
        for (const warmingStrategy of strategy.warmingStrategies.filter(w => w.enabled)) {
          if (warmingStrategy.priority === 'critical' || warmingStrategy.priority === 'high') {
            await this.warmStrategy(strategyName, warmingStrategy);
          }
        }
      }

      // Warm frequently accessed keys
      const frequentKeys = this.getFrequentAccessKeys();
      for (const key of frequentKeys.slice(0, 50)) { // Limit to top 50
        await this.warmKey(key);
      }

      const warmingTime = Date.now() - startTime;
      logger.info('Cache warming completed', { time: warmingTime });
    } catch (error) {
      logger.error('Cache warming error', { error });
    }
  }

  /**
   * Get comprehensive cache metrics
   */
  async getMetrics(): Promise<CacheMetrics[]> {
    const metrics: CacheMetrics[] = [];

    for (const [strategyName, strategy] of this.strategies) {
      for (const layer of strategy.layers.filter(l => l.enabled)) {
        const layerMetrics = await this.getLayerMetrics(layer);
        metrics.push(layerMetrics);
      }
    }

    return metrics;
  }

  /**
   * Get cache hit rate report
   */
  async getHitRateReport(): Promise<CacheHitRateReport> {
    const report: CacheHitRateReport = {
      overall: 0,
      byKey: {},
      byPattern: {},
      byLayer: {},
      timestamp: new Date()
    };

    let totalHits = 0;
    let totalRequests = 0;

    for (const [strategyName, strategy] of this.strategies) {
      let strategyHits = 0;
      let strategyRequests = 0;

      for (const layer of strategy.layers.filter(l => l.enabled)) {
        const layerMetrics = await this.getLayerMetrics(layer);
        const layerHits = layerMetrics.hits;
        const layerRequests = layerMetrics.hits + layerMetrics.misses;
        
        strategyHits += layerHits;
        strategyRequests += layerRequests;
        
        if (!report.byLayer[layer.name]) {
          report.byLayer[layer.name] = 0;
        }
        report.byLayer[layer.name] = layerHits / Math.max(1, layerRequests);
      }

      totalHits += strategyHits;
      totalRequests += strategyRequests;
    }

    report.overall = totalRequests > 0 ? totalHits / totalRequests : 0;

    return report;
  }

  /**
   * Generate optimization recommendations
   */
  async getOptimizationRecommendations(): Promise<CacheOptimizationRecommendation[]> {
    const recommendations: CacheOptimizationRecommendation[] = [];

    // Analyze hit rates
    const hitRateReport = await this.getHitRateReport();
    
    if (hitRateReport.overall < 0.7) {
      recommendations.push({
        id: this.generateId(),
        type: 'layer_distribution',
        priority: 'high',
        description: 'Overall cache hit rate is below 70%',
        currentValue: `${(hitRateReport.overall * 100).toFixed(1)}%`,
        recommendedValue: '80-90%',
        expectedImpact: 'Reduce database load by 40-60%',
        implementation: [
          'Review cache key patterns',
          'Adjust TTL values based on data freshness requirements',
          'Add more cache layers',
          'Implement smarter cache warming strategies'
        ]
      });
    }

    // Analyze memory cache efficiency
    const memoryLayer = this.strategies.get('user_data')?.layers.find(l => l.type === 'memory');
    if (memoryLayer && memoryLayer.hitRate < 0.6) {
      recommendations.push({
        id: this.generateId(),
        type: 'eviction_policy',
        priority: 'medium',
        description: 'Memory cache hit rate is low',
        currentValue: `${(memoryLayer.hitRate * 100).toFixed(1)}%`,
        recommendedValue: '75%+',
        expectedImpact: 'Improve response time by 20-30%',
        implementation: [
          'Adjust memory cache size',
          'Change eviction policy to LFU for better hit rates',
          'Implement smarter cache key categorization'
        ]
      });
    }

    // Analyze TTL patterns
    for (const [strategyName, strategy] of this.strategies) {
      for (const layer of strategy.layers.filter(l => l.enabled)) {
        if (layer.type === 'memory' && layer.ttl > 3600) {
          recommendations.push({
            id: this.generateId(),
            type: 'ttl_adjustment',
            priority: 'low',
            description: `Memory cache TTL might be too long for ${strategyName}`,
            currentValue: `${layer.ttl}s`,
            recommendedValue: '1800s (30 minutes)',
            expectedImpact: 'Reduce stale data risk while maintaining performance',
            implementation: [
              'Reduce TTL for memory cache layer',
              'Move long-lived data to Redis',
              'Implement cache invalidation on data updates'
            ]
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * Private helper methods
   */

  private categorizeCacheKey(key: string): IntelligentCacheKey {
    let category: IntelligentCacheKey['category'] = 'api_response';
    
    if (key.startsWith('user:') || key.includes('profile') || key.includes('settings')) {
      category = 'user_data';
    } else if (key.includes('analytics') || key.includes('metric') || key.includes('stat')) {
      category = 'analytics';
    } else if (key.includes('static') || key.includes('asset') || key.includes('config')) {
      category = 'static';
    } else if (key.includes('computed') || key.includes('calculated')) {
      category = 'computed';
    }

    const existing = this.cacheKeys.get(key);
    return {
      key,
      pattern: this.extractPattern(key),
      category,
      estimatedSize: existing?.estimatedSize || 1024,
      accessFrequency: existing?.accessFrequency || 1,
      lastAccessed: existing?.lastAccessed || new Date(),
      dependencies: existing?.dependencies || []
    };
  }

  private detectStrategy(key: string): CacheStrategy {
    const cacheKey = this.categorizeCacheKey(key);
    
    // Default strategy mapping
    switch (cacheKey.category) {
      case 'user_data':
        return this.strategies.get('user_data')!;
      case 'analytics':
        return this.strategies.get('analytics')!;
      case 'static':
        return this.strategies.get('static')!;
      default:
        return this.strategies.get('api_response')!;
    }
  }

  private async getFromLayer<T>(layer: CacheLayer, key: string): Promise<T | null> {
    switch (layer.type) {
      case 'memory':
        return this.getFromMemory(key);
      case 'redis':
        return this.getFromRedis<T>(key);
      case 'cdn':
        return this.getFromCDN<T>(key);
      default:
        return null;
    }
  }

  private async setToLayer(layer: CacheLayer, key: string, value: any, ttl: number): Promise<void> {
    switch (layer.type) {
      case 'memory':
        return this.setToMemory(key, value, ttl);
      case 'redis':
        return this.setToRedis(key, value, ttl);
      case 'cdn':
        return this.setToCDN(key, value, ttl);
    }
  }

  private async getFromMemory<T>(key: string): Promise<T | null> {
    const item = this.memoryCache.get(key);
    if (item && (!item.expiry || item.expiry > Date.now())) {
      return item.value;
    } else {
      this.memoryCache.delete(key);
      return null;
    }
  }

  private async setToMemory(key: string, value: any, ttl: number): Promise<void> {
    // Implement LRU eviction if needed
    if (this.memoryCache.size >= 1000) { // Max 1000 items in memory
      const oldestKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(oldestKey);
    }

    this.memoryCache.set(key, {
      value,
      expiry: Date.now() + (ttl * 1000)
    });
  }

  private async getFromRedis<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error', { key, error });
      return null;
    }
  }

  private async setToRedis(key: string, value: any, ttl: number): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error('Redis set error', { key, error });
    }
  }

  private async getFromCDN<T>(key: string): Promise<T | null> {
    // CDN implementation would go here
    return null;
  }

  private async setToCDN(key: string, value: any, ttl: number): Promise<void> {
    // CDN implementation would go here
  }

  private async invalidateFromLayer(layer: CacheLayer, key: string): Promise<void> {
    switch (layer.type) {
      case 'memory':
        this.memoryCache.delete(key);
        break;
      case 'redis':
        await this.redis.del(key).catch(err => logger.error('Redis delete error', { key, err }));
        break;
      case 'cdn':
        // CDN invalidation would go here
        break;
    }
  }

  private async propagateToHigherLayers(strategy: CacheStrategy, key: string, value: any, currentLayer: CacheLayer): Promise<void> {
    const higherPriorityLayers = strategy.layers
      .filter(layer => layer.priority < currentLayer.priority && layer.enabled);

    for (const layer of higherPriorityLayers) {
      try {
        await this.setToLayer(layer, key, value, layer.ttl);
      } catch (error) {
        logger.error('Failed to propagate to higher layer', { 
          layer: layer.name, 
          key, 
          error 
        });
      }
    }
  }

  private updateGetMetrics(strategy: CacheStrategy, hitLayer: CacheLayer | null, time: number, hit: boolean): void {
    for (const layer of strategy.layers.filter(l => l.enabled)) {
      if (hit && hitLayer && layer.name === hitLayer.name) {
        layer.hits++;
      } else if (!hit) {
        layer.misses++;
      }
      
      const total = layer.hits + layer.misses;
      layer.hitRate = total > 0 ? layer.hits / total : 0;
    }
  }

  private updateSetMetrics(strategy: CacheStrategy, time: number): void {
    for (const layer of strategy.layers.filter(l => l.enabled)) {
      layer.avgSetTime = (layer.avgSetTime + time) / 2;
    }
  }

  private async getLayerMetrics(layer: CacheLayer): Promise<CacheMetrics> {
    let size = 0;
    let memoryUsage = 0;

    if (layer.type === 'memory') {
      size = this.memoryCache.size;
      memoryUsage = this.calculateMemoryUsage();
    } else if (layer.type === 'redis') {
      size = await this.redis.dbsize().catch(() => 0);
    }

    return {
      layer: layer.name,
      hits: layer.hits,
      misses: layer.misses,
      hitRate: layer.hitRate,
      evictions: 0, // Would track evictions
      size,
      memoryUsage,
      avgGetTime: 0, // Would calculate from timing data
      avgSetTime: layer.avgSetTime
    };
  }

  private calculateMemoryUsage(): number {
    // Rough calculation of memory usage
    let usage = 0;
    for (const [key, value] of this.memoryCache) {
      usage += key.length + JSON.stringify(value).length;
    }
    return usage;
  }

  private updateCacheKeyMetadata(key: string, value: any): void {
    const existing = this.cacheKeys.get(key) || this.categorizeCacheKey(key);
    
    existing.estimatedSize = JSON.stringify(value).length;
    existing.lastAccessed = new Date();
    existing.accessFrequency++;

    this.cacheKeys.set(key, existing);
  }

  private async getMatchingKeys(pattern: string): Promise<string[]> {
    if (pattern.includes('*')) {
      // For Redis, use SCAN command for pattern matching
      const keys = [];
      let cursor = '0';
      
      do {
        const [nextCursor, foundKeys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );
        
        cursor = nextCursor;
        keys.push(...foundKeys);
      } while (cursor !== '0');

      return keys;
    } else {
      // Single key lookup
      const exists = await this.redis.exists(pattern);
      return exists ? [pattern] : [];
    }
  }

  private patternToRegex(pattern: string): RegExp {
    return new RegExp(
      pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
        .replace(/\*/g, '.*') // Convert * to .*
    );
  }

  private getDefaultTTL(category: IntelligentCacheKey['category']): number {
    switch (category) {
      case 'user_data':
        return 3600; // 1 hour
      case 'analytics':
        return 900; // 15 minutes
      case 'static':
        return 86400; // 24 hours
      case 'computed':
        return 1800; // 30 minutes
      default:
        return this.DEFAULT_TTL;
    }
  }

  private extractPattern(key: string): string {
    // Extract pattern from key (e.g., "user:123" -> "user:*")
    if (key.includes(':')) {
      const parts = key.split(':');
      if (parts.length > 1 && /^\d+$/.test(parts[1])) {
        return `${parts[0]}:*`;
      }
    }
    return key;
  }

  private getFrequentAccessKeys(): string[] {
    return Array.from(this.cacheKeys.entries())
      .sort((a, b) => b[1].accessFrequency - a[1].accessFrequency)
      .map(([key]) => key);
  }

  private async warmStrategy(strategyName: string, warmingStrategy: CacheWarmingStrategy): Promise<void> {
    logger.info('Warming strategy', { strategyName, warmingStrategy: warmingStrategy.name });

    // This would typically call the specified loader
    // For now, we'll simulate warming
    for (const key of warmingStrategy.keys) {
      await this.warmKey(key);
    }
  }

  private async warmKey(key: string): Promise<void> {
    try {
      // This would typically load data from the database or external service
      // For now, we'll simulate warming
      const simulatedValue = { warmed: true, timestamp: new Date() };
      await this.set(key, simulatedValue);
    } catch (error) {
      logger.error('Failed to warm key', { key, error });
    }
  }

  private startPeriodicOptimization(): void {
    // Run cache warming every 5 minutes
    setInterval(() => {
      this.warmCache().catch((error) => {
        logger.error('Periodic cache warming failed', { error });
      });
    }, this.CACHE_WARMING_INTERVAL);

    // Run optimization analysis every hour
    setInterval(() => {
      this.analyzeAndOptimize().catch((error) => {
        logger.error('Cache optimization failed', { error });
      });
    }, 3600000);
  }

  private async analyzeAndOptimize(): Promise<void> {
    try {
      logger.info('Starting cache optimization analysis');

      // Clean up expired memory cache entries
      const now = Date.now();
      for (const [key, item] of this.memoryCache.entries()) {
        if (item.expiry && item.expiry <= now) {
          this.memoryCache.delete(key);
        }
      }

      // Analyze access patterns and adjust strategies
      await this.adjustStrategiesBasedOnPatterns();

      logger.info('Cache optimization completed');
    } catch (error) {
      logger.error('Cache optimization error', { error });
    }
  }

  private async adjustStrategiesBasedOnPatterns(): Promise<void> {
    // Analyze access frequency and adjust TTLs or layer priorities
    const accessStats = this.getAccessStatistics();
    
    // Adjust memory cache size based on usage
    for (const [strategyName, strategy] of this.strategies) {
      const memoryLayer = strategy.layers.find(l => l.type === 'memory');
      if (memoryLayer) {
        // Adjust based on hit rate and access frequency
        if (memoryLayer.hitRate < 0.5 && memoryLayer.maxSize) {
          memoryLayer.maxSize = Math.min(
            memoryLayer.maxSize * 1.2,
            this.MAX_MEMORY_CACHE_SIZE * 0.5
          );
        }
      }
    }
  }

  private getAccessStatistics(): any {
    // Return access pattern analysis
    const totalAccesses = Array.from(this.cacheKeys.values())
      .reduce((sum, key) => sum + key.accessFrequency, 0);
    
    return {
      totalAccesses,
      uniqueKeys: this.cacheKeys.size,
      averageAccessFrequency: totalAccesses / Math.max(1, this.cacheKeys.size)
    };
  }

  private generateId(): string {
    return `cache_opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Public API methods
   */

  registerStrategy(name: string, strategy: CacheStrategy): void {
    this.strategies.set(name, strategy);
    logger.info('Cache strategy registered', { name });
  }

  getStrategy(name: string): CacheStrategy | undefined {
    return this.strategies.get(name);
  }

  getAllStrategies(): Map<string, CacheStrategy> {
    return new Map(this.strategies);
  }

  clearCache(pattern?: string): Promise<void> {
    if (pattern) {
      return this.invalidate(pattern, 'manual_clear').then(() => {});
    } else {
      this.memoryCache.clear();
      return this.redis.flushdb().then(() => {});
    }
  }

  getCacheInfo(): any {
    return {
      memoryCache: {
        size: this.memoryCache.size,
        keys: Array.from(this.memoryCache.keys())
      },
      redis: {
        info: this.redis.info(),
        dbSize: 0 // Would be async
      },
      strategies: Array.from(this.strategies.entries()).map(([name, strategy]) => ({
        name,
        layerCount: strategy.layers.length,
        enabledLayers: strategy.layers.filter(l => l.enabled).length
      }))
    };
  }
}