export { CacheManager, createCacheManager } from './cache-manager.js';
export type { CacheOptions, CacheEntry } from './cache-manager.js';
export { Cacheable, CacheInvalidate } from './cache-decorator.js';
export type { CacheDecoratorOptions } from './cache-decorator.js';

// Advanced caching
export { AdvancedCacheManager, createAdvancedCacheManager } from './advanced-cache-manager.js';
export type { 
  CacheKeyStrategy, 
  HierarchicalCacheKeyStrategy,
  CacheTTLConfig,
  CacheStats,
  AdvancedCacheEntry,
  CacheInvalidationStrategy
} from './advanced-cache-manager.js';
export { AdvancedCacheable, AdvancedCacheInvalidate } from './advanced-cache-manager.js';
