import { CacheManager } from './cache-manager.js';
import { logger } from '../logger/index.js';

export interface CacheDecoratorOptions {
  ttl?: number;
  keyGenerator?: (...args: any[]) => string;
  prefix?: string;
}

export function Cacheable(
  cacheManager: CacheManager,
  options: CacheDecoratorOptions = {}
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = options.keyGenerator
        ? options.keyGenerator(...args)
        : `${options.prefix || propertyKey}:${JSON.stringify(args)}`;

      const cached = await cacheManager.get(cacheKey);
      if (cached !== null) {
        logger.debug(`Cache hit for method: ${propertyKey}`);
        return cached;
      }

      logger.debug(`Cache miss for method: ${propertyKey}`);
      const result = await originalMethod.apply(this, args);
      
      if (result !== null && result !== undefined) {
        await cacheManager.set(cacheKey, result, options.ttl);
      }

      return result;
    };

    return descriptor;
  };
}

export function CacheInvalidate(
  cacheManager: CacheManager,
  options: { pattern: string }
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);
      await cacheManager.deletePattern(options.pattern);
      logger.debug(`Cache invalidated for pattern: ${options.pattern}`);
      return result;
    };

    return descriptor;
  };
}
