import { Redis, RedisOptions } from 'ioredis';
import { logger } from '../logger.js';
import { MetricsCollector } from '../monitoring/metrics.js';

/**
 * Cache key strategy with hierarchical naming and versioning
 */
export interface CacheKeyStrategy {
  generateKey(entity: string, id: string, version?: string, tenantId?: string): string;
  parseKey(key: string): { entity: string; id: string; version?: string; tenantId?: string };
}

export class HierarchicalCacheKeyStrategy implements CacheKeyStrategy {
  generateKey(entity: string, id: string, version: string = 'v1', tenantId: string = 'default'): string {
    return `${tenantId}:${entity}:${id}:${version}`;
  }

  parseKey(key: string): { entity: string; id: string; version?: string; tenantId?: string } {
    const parts = key.split(':');
    if (parts.length < 3) {
      throw new Error(`Invalid cache key format: ${key}`);
    }
    
    return {
      tenantId: parts[0],
      entity: parts[1],
      id: parts[2],
      version: parts[3] || 'v1'
    };
  }
}

/**
 * Cache TTL configuration per data type
 */
export interface CacheTTLConfig {
  user?: number; // seconds
  lead?: number; // seconds  
  policy?: number; // seconds
  configuration?: number; // seconds
  lookup?: number; // seconds
  computed?: number; // seconds
  default?: number; // seconds
}

/**
 * Cache statistics and metrics
 */
export interface CacheStats {
  hitCount: number;
  missCount: number;
  setCount: number;
  deleteCount: number;
  hitRate: number;
  memoryUsage: number;
  evictionCount: number;
}

/**
 * Advanced cache entry with metadata
 */
export interface AdvancedCacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
  accessedAt: number;
  tags?: string[];
  version: string;
  tenantId: string;
}

/**
 * Cache invalidation strategy
 */
export interface CacheInvalidationStrategy {
  invalidateOnChange(entity: string, id: string, tenantId?: string): Promise<void>;
  invalidateByPattern(pattern: string): Promise<void>;
  invalidateByTag(tag: string): Promise<void>;
  invalidateAll(): Promise<void>;
}

/**
 * Advanced Cache Manager with multi-layer caching, distributed support, and comprehensive features
 */
export class AdvancedCacheManager implements CacheInvalidationStrategy {
  private redis: Redis;
  private localCache: Map<string, AdvancedCacheEntry<any>>;
  private keyStrategy: CacheKeyStrategy;
  private ttlConfig: CacheTTLConfig;
  private metrics: MetricsCollector;
  private localCacheEnabled: boolean;
  private maxMemoryLimit: number;
  private memoryUsage: number;
  private evictionPolicy: 'LRU' | 'LFU' | 'FIFO';
  
  // Statistics
  private hitCount: number = 0;
  private missCount: number = 0;
  private setCount: number = 0;
  private deleteCount: number = 0;
  private evictionCount: number = 0;

  constructor(redisConfig: RedisOptions, options: {
    keyStrategy?: CacheKeyStrategy;
    ttlConfig?: CacheTTLConfig;
    metrics?: MetricsCollector;
    localCacheEnabled?: boolean;
    maxMemoryLimit?: number; // in MB
    evictionPolicy?: 'LRU' | 'LFU' | 'FIFO';
  } = {}) {
    this.redis = new Redis(redisConfig);
    this.localCache = new Map();
    this.keyStrategy = options.keyStrategy || new HierarchicalCacheKeyStrategy();
    this.ttlConfig = options.ttlConfig || this.getDefaultTTLConfig();
    this.metrics = options.metrics || new MetricsCollector();
    this.localCacheEnabled = options.localCacheEnabled !== false;
    this.maxMemoryLimit = options.maxMemoryLimit || 100; // 100MB default
    this.memoryUsage = 0;
    this.evictionPolicy = options.evictionPolicy || 'LRU';
    
    this.setupEventListeners();
    this.startLocalCacheCleaner();
    this.startMemoryMonitor();
    
    logger.info('AdvancedCacheManager initialized', {
      localCacheEnabled: this.localCacheEnabled,
      maxMemoryLimit: `${this.maxMemoryLimit}MB`,
      evictionPolicy: this.evictionPolicy
    });
  }

  private getDefaultTTLConfig(): CacheTTLConfig {
    return {
      user: 3600, // 1 hour
      lead: 1800, // 30 minutes
      policy: 7200, // 2 hours
      configuration: 86400, // 24 hours
      lookup: 86400, // 24 hours
      computed: 300, // 5 minutes
      default: 300 // 5 minutes
    };
  }

  private setupEventListeners(): void {
    this.redis.on('error', (error) => {
      logger.error('Redis error', { error: error.message });
      this.metrics.increment('cache.redis.errors');
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected');
      this.metrics.increment('cache.redis.connections');
    });

    this.redis.on('ready', () => {
      logger.info('Redis ready');
      this.metrics.gauge('cache.redis.ready', 1);
    });
  }

  /**
   * Get cached value with hierarchical key support
   */
  async get<T>(entity: string, id: string, options: {
    version?: string;
    tenantId?: string;
    tags?: string[];
    bypassCache?: boolean;
  } = {}): Promise<T | null> {
    if (options.bypassCache) {
      this.metrics.increment('cache.bypass.count');
      return null;
    }

    const { version = 'v1', tenantId = 'default', tags } = options;
    const key = this.keyStrategy.generateKey(entity, id, version, tenantId);

    // Try local cache first
    if (this.localCacheEnabled) {
      const localEntry = this.localCache.get(key);
      if (localEntry && localEntry.expiresAt > Date.now()) {
        this.hitCount++;
        this.metrics.increment('cache.local.hits');
        
        // Update access time for LRU/LFU
        localEntry.accessedAt = Date.now();
        
        logger.debug(`Local cache hit: ${key}`);
        return localEntry.value as T;
      }
      
      if (localEntry) {
        this.localCache.delete(key);
        this.updateMemoryUsage(-this.estimateSize(localEntry));
      }
    }

    // Try Redis cache
    try {
      const value = await this.redis.get(key);
      if (value) {
        this.hitCount++;
        this.metrics.increment('cache.redis.hits');
        
        const parsed = JSON.parse(value) as AdvancedCacheEntry<T>;
        
        // Add to local cache if enabled
        if (this.localCacheEnabled) {
          const localEntry: AdvancedCacheEntry<T> = {
            value: parsed.value,
            expiresAt: Date.now() + Math.min(parsed.expiresAt - Date.now(), 300000), // Max 5 minutes
            createdAt: Date.now(),
            accessedAt: Date.now(),
            tags: parsed.tags,
            version: parsed.version,
            tenantId: parsed.tenantId
          };
          
          this.localCache.set(key, localEntry);
          this.updateMemoryUsage(this.estimateSize(localEntry));
          this.checkMemoryLimit();
        }

        logger.debug(`Redis cache hit: ${key}`);
        return parsed.value;
      }

      // Cache miss
      this.missCount++;
      this.metrics.increment('cache.misses');
      logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Cache get error: ${key}`, { error: error.message });
      this.metrics.increment('cache.errors');
      return null;
    }
  }

  /**
   * Set cached value with TTL based on entity type
   */
  async set<T>(entity: string, id: string, value: T, options: {
    version?: string;
    tenantId?: string;
    tags?: string[];
    ttl?: number; // override default TTL
    compress?: boolean;
  } = {}): Promise<void> {
    const { version = 'v1', tenantId = 'default', tags = [], ttl: customTTL, compress = true } = options;
    const key = this.keyStrategy.generateKey(entity, id, version, tenantId);
    
    // Determine TTL based on entity type or custom override
    const entityTTL = this.ttlConfig[entity as keyof CacheTTLConfig] || this.ttlConfig.default;
    const cacheTTL = customTTL || entityTTL;

    try {
      const entry: AdvancedCacheEntry<T> = {
        value,
        expiresAt: Date.now() + cacheTTL * 1000,
        createdAt: Date.now(),
        accessedAt: Date.now(),
        tags,
        version,
        tenantId
      };

      const serialized = compress 
        ? this.compressData(JSON.stringify(entry))
        : JSON.stringify(entry);

      await this.redis.setex(key, cacheTTL, serialized);
      
      // Add to local cache if enabled
      if (this.localCacheEnabled) {
        const localEntry: AdvancedCacheEntry<T> = {
          value,
          expiresAt: Date.now() + Math.min(cacheTTL * 1000, 300000), // Max 5 minutes
          createdAt: Date.now(),
          accessedAt: Date.now(),
          tags,
          version,
          tenantId
        };
        
        this.localCache.set(key, localEntry);
        this.updateMemoryUsage(this.estimateSize(localEntry));
        this.checkMemoryLimit();
      }

      this.setCount++;
      this.metrics.increment('cache.sets');
      this.metrics.gauge('cache.current_keys', await this.redis.dbsize());
      
      logger.debug(`Cache set: ${key} (TTL: ${cacheTTL}s, entity: ${entity})`);
    } catch (error) {
      logger.error(`Cache set error: ${key}`, { error: error.message });
      this.metrics.increment('cache.set_errors');
    }
  }

  /**
   * Cache warming - preload cache with critical data
   */
  async warmCache<T>(entries: Array<{
    entity: string;
    id: string;
    value: T;
    version?: string;
    tenantId?: string;
    tags?: string[];
    ttl?: number;
  }>): Promise<void> {
    if (entries.length === 0) return;

    try {
      const pipeline = this.redis.pipeline();
      
      entries.forEach(entry => {
        const { entity, id, value, version = 'v1', tenantId = 'default', tags = [], ttl } = entry;
        const key = this.keyStrategy.generateKey(entity, id, version, tenantId);
        const entityTTL = ttl || this.ttlConfig[entity as keyof CacheTTLConfig] || this.ttlConfig.default;
        
        const cacheEntry: AdvancedCacheEntry<T> = {
          value,
          expiresAt: Date.now() + entityTTL * 1000,
          createdAt: Date.now(),
          accessedAt: Date.now(),
          tags,
          version,
          tenantId
        };
        
        pipeline.setex(key, entityTTL, JSON.stringify(cacheEntry));
      });

      await pipeline.exec();
      
      logger.info(`Cache warming completed: ${entries.length} entries loaded`);
      this.metrics.increment('cache.warm_operations', entries.length);
    } catch (error) {
      logger.error('Cache warming failed', { error: error.message });
      this.metrics.increment('cache.warm_errors');
    }
  }

  /**
   * Invalidate cache on data changes (event-based)
   */
  async invalidateOnChange(entity: string, id: string, tenantId: string = 'default'): Promise<void> {
    const key = this.keyStrategy.generateKey(entity, id, '*', tenantId);
    await this.invalidateByPattern(key);
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    try {
      // Use SCAN for efficient key management in production
      const keys: string[] = [];
      let cursor = '0';
      
      do {
        const result = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
        cursor = result[0];
        keys.push(...result[1]);
      } while (cursor !== '0');

      if (keys.length > 0) {
        await this.redis.del(...keys);
        keys.forEach(key => this.localCache.delete(key));
        
        this.deleteCount++;
        this.metrics.increment('cache.invalidations', keys.length);
        
        logger.debug(`Cache invalidated pattern: ${pattern} (${keys.length} keys)`);
      }
    } catch (error) {
      logger.error(`Cache invalidate pattern error: ${pattern}`, { error: error.message });
      this.metrics.increment('cache.invalidation_errors');
    }
  }

  /**
   * Invalidate cache by tag
   */
  async invalidateByTag(tag: string): Promise<void> {
    try {
      // Find all keys with this tag
      const keys: string[] = [];
      let cursor = '0';
      
      do {
        const result = await this.redis.scan(cursor, 'MATCH', `*:*:*:*`, 'COUNT', '100');
        cursor = result[0];
        
        // Check each key for the tag
        for (const key of result[1]) {
          const value = await this.redis.get(key);
          if (value) {
            try {
              const entry = JSON.parse(value) as AdvancedCacheEntry<any>;
              if (entry.tags && entry.tags.includes(tag)) {
                keys.push(key);
              }
            } catch {
              // Ignore parsing errors
            }
          }
        }
      } while (cursor !== '0');

      if (keys.length > 0) {
        await this.redis.del(...keys);
        keys.forEach(key => this.localCache.delete(key));
        
        this.deleteCount++;
        this.metrics.increment('cache.tag_invalidations', keys.length);
        
        logger.debug(`Cache invalidated by tag: ${tag} (${keys.length} keys)`);
      }
    } catch (error) {
      logger.error(`Cache invalidate by tag error: ${tag}`, { error: error.message });
      this.metrics.increment('cache.tag_invalidation_errors');
    }
  }

  /**
   * Emergency cache bypass
   */
  async emergencyBypass(): Promise<void> {
    this.localCacheEnabled = false;
    this.localCache.clear();
    this.memoryUsage = 0;
    
    logger.warn('Emergency cache bypass activated');
    this.metrics.gauge('cache.bypass_mode', 1);
  }

  /**
   * Restore normal cache operation
   */
  restoreCache(): void {
    this.localCacheEnabled = true;
    logger.info('Cache operation restored');
    this.metrics.gauge('cache.bypass_mode', 0);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;

    return {
      hitCount: this.hitCount,
      missCount: this.missCount,
      setCount: this.setCount,
      deleteCount: this.deleteCount,
      hitRate,
      memoryUsage: this.memoryUsage,
      evictionCount: this.evictionCount
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.hitCount = 0;
    this.missCount = 0;
    this.setCount = 0;
    this.deleteCount = 0;
    this.evictionCount = 0;
  }

  /**
   * Get current cache size
   */
  async getCacheSize(): Promise<{ keys: number; memoryUsage: number }> {
    const keys = await this.redis.dbsize();
    const memoryInfo = await this.redis.info('memory');
    const usedMemory = this.parseMemoryInfo(memoryInfo);
    
    return {
      keys,
      memoryUsage: usedMemory
    };
  }

  /**
   * Check if cache hit rate meets target (> 80%)
   */
  isHitRateTargetMet(target: number = 80): boolean {
    const stats = this.getStats();
    return stats.hitRate >= target;
  }

  /**
   * Alert on cache miss rate increase
   */
  checkMissRateAlert(threshold: number = 20): boolean {
    const stats = this.getStats();
    const missRate = 100 - stats.hitRate;
    
    if (missRate > threshold) {
      logger.warn(`High cache miss rate: ${missRate.toFixed(2)}% (threshold: ${threshold}%)`);
      this.metrics.gauge('cache.miss_rate_alert', 1);
      return true;
    }
    
    this.metrics.gauge('cache.miss_rate_alert', 0);
    return false;
  }

  /**
   * Memory threshold alert
   */
  checkMemoryThresholdAlert(threshold: number = 0.9): boolean {
    const memoryLimitMB = this.maxMemoryLimit;
    const currentUsageMB = this.memoryUsage / (1024 * 1024);
    const usageRatio = currentUsageMB / memoryLimitMB;
    
    if (usageRatio > threshold) {
      logger.warn(`High cache memory usage: ${currentUsageMB.toFixed(2)}MB/${memoryLimitMB}MB (${(usageRatio * 100).toFixed(2)}%)`);
      this.metrics.gauge('cache.memory_alert', 1);
      return true;
    }
    
    this.metrics.gauge('cache.memory_alert', 0);
    return false;
  }

  /**
   * Get TTL configuration
   */
  getTTLConfig(): CacheTTLConfig {
    return { ...this.ttlConfig };
  }

  /**
   * Update TTL configuration
   */
  updateTTLConfig(config: Partial<CacheTTLConfig>): void {
    this.ttlConfig = { ...this.ttlConfig, ...config };
    logger.info('Cache TTL configuration updated', { config });
  }

  /**
   * Get cache keys by entity type
   */
  async getKeysByEntity(entity: string, tenantId: string = 'default'): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    
    do {
      const result = await this.redis.scan(cursor, 'MATCH', `${tenantId}:${entity}:*:*`, 'COUNT', '100');
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');
    
    return keys;
  }

  /**
   * Get cache entry info
   */
  async getCacheEntryInfo(key: string): Promise<AdvancedCacheEntry<any> | null> {
    try {
      const value = await this.redis.get(key);
      if (value) {
        return JSON.parse(value) as AdvancedCacheEntry<any>;
      }
      return null;
    } catch (error) {
      logger.error(`Get cache entry info error: ${key}`, { error: error.message });
      return null;
    }
  }

  /**
   * Get all cache entries by tag
   */
  async getEntriesByTag(tag: string): Promise<Array<{ key: string; entry: AdvancedCacheEntry<any> }>> {
    const entries: Array<{ key: string; entry: AdvancedCacheEntry<any> }> = [];
    let cursor = '0';
    
    do {
      const result = await this.redis.scan(cursor, 'MATCH', `*:*:*:*`, 'COUNT', '100');
      cursor = result[0];
      
      for (const key of result[1]) {
        const value = await this.redis.get(key);
        if (value) {
          try {
            const entry = JSON.parse(value) as AdvancedCacheEntry<any>;
            if (entry.tags && entry.tags.includes(tag)) {
              entries.push({ key, entry });
            }
          } catch {
            // Ignore parsing errors
          }
        }
      }
    } while (cursor !== '0');
    
    return entries;
  }

  /**
   * Get TTL for a specific key
   */
  async getTTL(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      logger.error(`Get TTL error: ${key}`, { error: error.message });
      return -1;
    }
  }

  /**
   * Set TTL for a specific key
   */
  async setTTL(key: string, ttl: number): Promise<boolean> {
    try {
      return (await this.redis.expire(key, ttl)) === 1;
    } catch (error) {
      logger.error(`Set TTL error: ${key}`, { error: error.message });
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      return (await this.redis.exists(key)) === 1;
    } catch (error) {
      logger.error(`Cache exists error: ${key}`, { error: error.message });
      return false;
    }
  }

  /**
   * Multi-get operation
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await this.redis.mget(...keys);
      return values.map(value => {
        if (value) {
          try {
            const entry = JSON.parse(value) as AdvancedCacheEntry<T>;
            return entry.value;
          } catch {
            return null;
          }
        }
        return null;
      });
    } catch (error) {
      logger.error('Cache mget error', { error: error.message });
      return keys.map(() => null);
    }
  }

  /**
   * Multi-set operation
   */
  async mset<T>(entries: Array<{
    entity: string;
    id: string;
    value: T;
    version?: string;
    tenantId?: string;
    tags?: string[];
    ttl?: number;
  }>): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      
      entries.forEach(entry => {
        const { entity, id, value, version = 'v1', tenantId = 'default', tags = [], ttl } = entry;
        const key = this.keyStrategy.generateKey(entity, id, version, tenantId);
        const entityTTL = ttl || this.ttlConfig[entity as keyof CacheTTLConfig] || this.ttlConfig.default;
        
        const cacheEntry: AdvancedCacheEntry<T> = {
          value,
          expiresAt: Date.now() + entityTTL * 1000,
          createdAt: Date.now(),
          accessedAt: Date.now(),
          tags,
          version,
          tenantId
        };
        
        pipeline.setex(key, entityTTL, JSON.stringify(cacheEntry));
      });

      await pipeline.exec();
      this.metrics.increment('cache.mset_operations', entries.length);
    } catch (error) {
      logger.error('Cache mset error', { error: error.message });
      this.metrics.increment('cache.mset_errors');
    }
  }

  /**
   * Increment numeric value in cache
   */
  async increment(key: string, delta: number = 1): Promise<number> {
    try {
      return await this.redis.incrby(key, delta);
    } catch (error) {
      logger.error(`Cache increment error: ${key}`, { error: error.message });
      return 0;
    }
  }

  /**
   * Decrement numeric value in cache
   */
  async decrement(key: string, delta: number = 1): Promise<number> {
    try {
      return await this.redis.decrby(key, delta);
    } catch (error) {
      logger.error(`Cache decrement error: ${key}`, { error: error.message });
      return 0;
    }
  }

  /**
   * Clear local cache
   */
  clearLocalCache(): void {
    const previousSize = this.localCache.size;
    this.localCache.clear();
    this.memoryUsage = 0;
    
    logger.info(`Local cache cleared: ${previousSize} entries removed`);
    this.metrics.increment('cache.local_clears', previousSize);
  }

  /**
   * Disable local cache
   */
  disableLocalCache(): void {
    this.localCacheEnabled = false;
    this.clearLocalCache();
    logger.info('Local cache disabled');
  }

  /**
   * Enable local cache
   */
  enableLocalCache(): void {
    this.localCacheEnabled = true;
    logger.info('Local cache enabled');
  }

  /**
   * Get local cache size
   */
  getLocalCacheSize(): number {
    return this.localCache.size;
  }

  /**
   * Get Redis connection status
   */
  getRedisStatus(): { connected: boolean; error?: string } {
    return {
      connected: this.redis.status === 'ready',
      error: this.redis.status !== 'ready' ? `Redis status: ${this.redis.status}` : undefined
    };
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    try {
      await this.redis.quit();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection', { error: error.message });
    }
  }

  /**
   * Private methods
   */

  private startLocalCacheCleaner(): void {
    setInterval(() => {
      const now = Date.now();
      const expiredKeys: string[] = [];
      
      for (const [key, entry] of this.localCache.entries()) {
        if (entry.expiresAt <= now) {
          expiredKeys.push(key);
        }
      }
      
      expiredKeys.forEach(key => {
        const entry = this.localCache.get(key);
        if (entry) {
          this.updateMemoryUsage(-this.estimateSize(entry));
        }
        this.localCache.delete(key);
      });
      
      if (expiredKeys.length > 0) {
        logger.debug(`Cleaned ${expiredKeys.length} expired local cache entries`);
        this.metrics.increment('cache.local_expired', expiredKeys.length);
      }
    }, 30000); // Every 30 seconds
  }

  private startMemoryMonitor(): void {
    setInterval(() => {
      const stats = this.getStats();
      this.metrics.gauge('cache.memory_usage', stats.memoryUsage);
      this.metrics.gauge('cache.local_size', this.localCache.size);
      this.metrics.gauge('cache.hit_rate', stats.hitRate);
      
      // Check memory threshold
      this.checkMemoryThresholdAlert();
      
      // Check hit rate target
      this.checkMissRateAlert();
    }, 60000); // Every minute
  }

  private checkMemoryLimit(): void {
    const memoryLimitBytes = this.maxMemoryLimit * 1024 * 1024;
    
    if (this.memoryUsage > memoryLimitBytes) {
      logger.warn(`Memory limit exceeded: ${this.memoryUsage} bytes > ${memoryLimitBytes} bytes`);
      this.evictCacheEntries();
    }
  }

  private evictCacheEntries(): void {
    const entriesToEvict: string[] = [];
    const now = Date.now();
    
    switch (this.evictionPolicy) {
      case 'LRU':
        // Least Recently Used - evict entries not accessed recently
        const lruEntries = Array.from(this.localCache.entries())
          .sort((a, b) => a[1].accessedAt - b[1].accessedAt);
        
        for (const [key, entry] of lruEntries) {
          if (this.memoryUsage <= this.maxMemoryLimit * 1024 * 1024 * 0.9) break;
          entriesToEvict.push(key);
          this.updateMemoryUsage(-this.estimateSize(entry));
          this.evictionCount++;
        }
        break;

      case 'LFU':
        // Least Frequently Used - would need frequency tracking
        // For now, fall through to FIFO
      case 'FIFO':
        // First In First Out - evict oldest entries
        const fifoEntries = Array.from(this.localCache.entries())
          .sort((a, b) => a[1].createdAt - b[1].createdAt);
        
        for (const [key, entry] of fifoEntries) {
          if (this.memoryUsage <= this.maxMemoryLimit * 1024 * 1024 * 0.9) break;
          entriesToEvict.push(key);
          this.updateMemoryUsage(-this.estimateSize(entry));
          this.evictionCount++;
        }
        break;
    }

    entriesToEvict.forEach(key => this.localCache.delete(key));
    
    if (entriesToEvict.length > 0) {
      logger.warn(`Evicted ${entriesToEvict.length} cache entries due to memory pressure`);
      this.metrics.increment('cache.evictions', entriesToEvict.length);
    }
  }

  private updateMemoryUsage(delta: number): void {
    this.memoryUsage += delta;
    
    // Ensure we don't go negative
    if (this.memoryUsage < 0) {
      this.memoryUsage = 0;
    }
  }

  private estimateSize(entry: AdvancedCacheEntry<any>): number {
    // Simple estimation - in production, use more accurate size calculation
    try {
      const jsonString = JSON.stringify(entry);
      return Buffer.byteLength(jsonString, 'utf8');
    } catch {
      return 1024; // Default 1KB estimate
    }
  }

  private compressData(data: string): string {
    // Simple compression - in production, use proper compression library
    try {
      return Buffer.from(data).toString('base64');
    } catch {
      return data;
    }
  }

  private parseMemoryInfo(info: string): number {
    const match = info.match(/used_memory:(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Health check for cache system
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    redisConnected: boolean;
    localCacheEnabled: boolean;
    stats: CacheStats;
    memoryStatus: string;
    error?: string;
  }> {
    try {
      const redisStatus = await this.redis.ping();
      const stats = this.getStats();
      const memoryStatus = this.checkMemoryThresholdAlert() ? 'WARNING' : 'NORMAL';
      
      return {
        healthy: redisStatus === 'PONG' && stats.hitRate >= 60,
        redisConnected: redisStatus === 'PONG',
        localCacheEnabled: this.localCacheEnabled,
        stats,
        memoryStatus,
      };
    } catch (error) {
      return {
        healthy: false,
        redisConnected: false,
        localCacheEnabled: this.localCacheEnabled,
        stats: this.getStats(),
        memoryStatus: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Factory function to create AdvancedCacheManager
 */
export function createAdvancedCacheManager(
  redisConfig: RedisOptions,
  options?: {
    keyStrategy?: CacheKeyStrategy;
    ttlConfig?: CacheTTLConfig;
    metrics?: MetricsCollector;
    localCacheEnabled?: boolean;
    maxMemoryLimit?: number;
    evictionPolicy?: 'LRU' | 'LFU' | 'FIFO';
  }
): AdvancedCacheManager {
  return new AdvancedCacheManager(redisConfig, options);
}

/**
 * Cache decorator for advanced caching
 */
export function AdvancedCacheable(options: {
  entity: string;
  ttl?: number;
  version?: string;
  tags?: string[];
  keyGenerator?: (...args: any[]) => string;
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheManager: AdvancedCacheManager = this.cacheManager;
      if (!cacheManager) {
        throw new Error('CacheManager not initialized on class');
      }
      
      const cacheKey = options.keyGenerator
        ? options.keyGenerator(...args)
        : `${options.entity}:${JSON.stringify(args)}`;
      
      const cached = await cacheManager.get(options.entity, cacheKey, {
        version: options.version,
        tags: options.tags
      });
      
      if (cached !== null) {
        logger.debug(`Advanced cache hit for method: ${propertyKey}`);
        return cached;
      }
      
      logger.debug(`Advanced cache miss for method: ${propertyKey}`);
      const result = await originalMethod.apply(this, args);
      
      if (result !== null && result !== undefined) {
        await cacheManager.set(options.entity, cacheKey, result, {
          ttl: options.ttl,
          version: options.version,
          tags: options.tags
        });
      }
      
      return result;
    };
    
    return descriptor;
  };
}

/**
 * Cache invalidation decorator
 */
export function AdvancedCacheInvalidate(options: {
  entity: string;
  idGenerator?: (...args: any[]) => string;
  pattern?: string;
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheManager: AdvancedCacheManager = this.cacheManager;
      if (!cacheManager) {
        throw new Error('CacheManager not initialized on class');
      }
      
      const result = await originalMethod.apply(this, args);
      
      if (options.pattern) {
        await cacheManager.invalidateByPattern(options.pattern);
      } else if (options.idGenerator) {
        const id = options.idGenerator(...args);
        await cacheManager.invalidateOnChange(options.entity, id);
      }
      
      logger.debug(`Advanced cache invalidated for: ${options.entity}`);
      return result;
    };
    
    return descriptor;
  };
}