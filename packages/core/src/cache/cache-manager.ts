import { Redis } from 'ioredis';
import { logger } from '../logger/index.js';

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class CacheManager {
  private redis: Redis;
  private defaultTTL: number;
  private prefix: string;
  private localCache: Map<string, CacheEntry<any>>;
  private localCacheEnabled: boolean;

  constructor(redis: Redis, options: CacheOptions = {}) {
    this.redis = redis;
    this.defaultTTL = options.ttl || 300;
    this.prefix = options.prefix || 'cache:';
    this.localCache = new Map();
    this.localCacheEnabled = true;

    this.startLocalCacheCleaner();
  }

  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.prefix + key;

    if (this.localCacheEnabled) {
      const localEntry = this.localCache.get(fullKey);
      if (localEntry && localEntry.expiresAt > Date.now()) {
        logger.debug(`Cache hit (local): ${fullKey}`);
        return localEntry.value as T;
      }
      if (localEntry) {
        this.localCache.delete(fullKey);
      }
    }

    try {
      const value = await this.redis.get(fullKey);
      if (value) {
        logger.debug(`Cache hit (redis): ${fullKey}`);
        const parsed = JSON.parse(value) as T;
        
        if (this.localCacheEnabled) {
          this.localCache.set(fullKey, {
            value: parsed,
            expiresAt: Date.now() + 60000,
          });
        }
        
        return parsed;
      }
      
      logger.debug(`Cache miss: ${fullKey}`);
      return null;
    } catch (error) {
      logger.error(`Cache get error: ${fullKey}`, { error });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const fullKey = this.prefix + key;
    const cacheTTL = ttl || this.defaultTTL;

    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(fullKey, cacheTTL, serialized);
      
      if (this.localCacheEnabled) {
        this.localCache.set(fullKey, {
          value,
          expiresAt: Date.now() + Math.min(cacheTTL * 1000, 60000),
        });
      }
      
      logger.debug(`Cache set: ${fullKey} (TTL: ${cacheTTL}s)`);
    } catch (error) {
      logger.error(`Cache set error: ${fullKey}`, { error });
    }
  }

  async delete(key: string): Promise<void> {
    const fullKey = this.prefix + key;

    try {
      await this.redis.del(fullKey);
      this.localCache.delete(fullKey);
      logger.debug(`Cache delete: ${fullKey}`);
    } catch (error) {
      logger.error(`Cache delete error: ${fullKey}`, { error });
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    const fullPattern = this.prefix + pattern;

    try {
      const keys = await this.redis.keys(fullPattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        keys.forEach(key => this.localCache.delete(key));
        logger.debug(`Cache delete pattern: ${fullPattern} (${keys.length} keys)`);
      }
    } catch (error) {
      logger.error(`Cache delete pattern error: ${fullPattern}`, { error });
    }
  }

  async exists(key: string): Promise<boolean> {
    const fullKey = this.prefix + key;

    try {
      return (await this.redis.exists(fullKey)) === 1;
    } catch (error) {
      logger.error(`Cache exists error: ${fullKey}`, { error });
      return false;
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const fullKeys = keys.map(key => this.prefix + key);

    try {
      const values = await this.redis.mget(...fullKeys);
      return values.map(value => {
        if (value) {
          try {
            return JSON.parse(value) as T;
          } catch {
            return null;
          }
        }
        return null;
      });
    } catch (error) {
      logger.error('Cache mget error', { error });
      return keys.map(() => null);
    }
  }

  async mset<T>(entries: { key: string; value: T; ttl?: number }[]): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      
      entries.forEach(({ key, value, ttl }) => {
        const fullKey = this.prefix + key;
        const cacheTTL = ttl || this.defaultTTL;
        const serialized = JSON.stringify(value);
        pipeline.setex(fullKey, cacheTTL, serialized);
      });
      
      await pipeline.exec();
      logger.debug(`Cache mset: ${entries.length} keys`);
    } catch (error) {
      logger.error('Cache mset error', { error });
    }
  }

  async increment(key: string, delta: number = 1): Promise<number> {
    const fullKey = this.prefix + key;

    try {
      return await this.redis.incrby(fullKey, delta);
    } catch (error) {
      logger.error(`Cache increment error: ${fullKey}`, { error });
      return 0;
    }
  }

  async decrement(key: string, delta: number = 1): Promise<number> {
    const fullKey = this.prefix + key;

    try {
      return await this.redis.decrby(fullKey, delta);
    } catch (error) {
      logger.error(`Cache decrement error: ${fullKey}`, { error });
      return 0;
    }
  }

  async getTTL(key: string): Promise<number> {
    const fullKey = this.prefix + key;

    try {
      return await this.redis.ttl(fullKey);
    } catch (error) {
      logger.error(`Cache getTTL error: ${fullKey}`, { error });
      return -1;
    }
  }

  async setTTL(key: string, ttl: number): Promise<boolean> {
    const fullKey = this.prefix + key;

    try {
      return (await this.redis.expire(fullKey, ttl)) === 1;
    } catch (error) {
      logger.error(`Cache setTTL error: ${fullKey}`, { error });
      return false;
    }
  }

  disableLocalCache(): void {
    this.localCacheEnabled = false;
    this.localCache.clear();
  }

  enableLocalCache(): void {
    this.localCacheEnabled = true;
  }

  clearLocalCache(): void {
    this.localCache.clear();
  }

  private startLocalCacheCleaner(): void {
    setInterval(() => {
      const now = Date.now();
      const expiredKeys: string[] = [];
      
      for (const [key, entry] of this.localCache.entries()) {
        if (entry.expiresAt <= now) {
          expiredKeys.push(key);
        }
      }
      
      expiredKeys.forEach(key => this.localCache.delete(key));
      
      if (expiredKeys.length > 0) {
        logger.debug(`Cleaned ${expiredKeys.length} expired local cache entries`);
      }
    }, 30000);
  }

  getStats(): { localCacheSize: number; localCacheEnabled: boolean } {
    return {
      localCacheSize: this.localCache.size,
      localCacheEnabled: this.localCacheEnabled,
    };
  }
}

export function createCacheManager(redis: Redis, options?: CacheOptions): CacheManager {
  return new CacheManager(redis, options);
}
