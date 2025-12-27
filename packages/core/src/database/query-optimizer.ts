import { logger } from '../logger/index.js';

export interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  params?: any;
}

export class QueryOptimizer {
  private slowQueryThreshold: number;
  private slowQueries: QueryMetrics[] = [];
  private queryStats: Map<string, { count: number; totalDuration: number; avgDuration: number }> = new Map();

  constructor(slowQueryThreshold: number = 1000) {
    this.slowQueryThreshold = slowQueryThreshold;
  }

  trackQuery(query: string, duration: number, params?: any): void {
    if (duration > this.slowQueryThreshold) {
      this.slowQueries.push({
        query,
        duration,
        timestamp: new Date(),
        params,
      });

      logger.warn('Slow query detected', {
        query,
        duration,
        threshold: this.slowQueryThreshold,
        params,
      });
    }

    const normalizedQuery = this.normalizeQuery(query);
    const stats = this.queryStats.get(normalizedQuery) || {
      count: 0,
      totalDuration: 0,
      avgDuration: 0,
    };

    stats.count++;
    stats.totalDuration += duration;
    stats.avgDuration = stats.totalDuration / stats.count;

    this.queryStats.set(normalizedQuery, stats);
  }

  getSlowQueries(limit: number = 10): QueryMetrics[] {
    return this.slowQueries
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  getQueryStats(limit: number = 10): Array<{ query: string; stats: any }> {
    const stats = Array.from(this.queryStats.entries())
      .map(([query, stats]) => ({ query, stats }))
      .sort((a, b) => b.stats.avgDuration - a.stats.avgDuration)
      .slice(0, limit);

    return stats;
  }

  clearMetrics(): void {
    this.slowQueries = [];
    this.queryStats.clear();
  }

  private normalizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .replace(/\$\d+/g, '$?')
      .replace(/'[^']*'/g, "'?'")
      .replace(/\d+/g, '?')
      .trim();
  }

  getSummary(): {
    totalQueries: number;
    slowQueriesCount: number;
    avgQueryDuration: number;
    maxQueryDuration: number;
  } {
    let totalQueries = 0;
    let totalDuration = 0;
    let maxDuration = 0;

    for (const stats of this.queryStats.values()) {
      totalQueries += stats.count;
      totalDuration += stats.totalDuration;
      maxDuration = Math.max(maxDuration, stats.avgDuration);
    }

    return {
      totalQueries,
      slowQueriesCount: this.slowQueries.length,
      avgQueryDuration: totalQueries > 0 ? totalDuration / totalQueries : 0,
      maxQueryDuration: maxDuration,
    };
  }
}

export const globalQueryOptimizer = new QueryOptimizer();

export function createQueryOptimizer(slowQueryThreshold?: number): QueryOptimizer {
  return new QueryOptimizer(slowQueryThreshold);
}

export function withQueryTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  queryExtractor?: (...args: Parameters<T>) => string
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now();
    const query = queryExtractor ? queryExtractor(...args) : 'unknown';

    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;
      globalQueryOptimizer.trackQuery(query, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      globalQueryOptimizer.trackQuery(query, duration);
      throw error;
    }
  }) as T;
}

export function QueryTracking(queryName: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        globalQueryOptimizer.trackQuery(`${queryName}.${propertyKey}`, duration, args);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        globalQueryOptimizer.trackQuery(`${queryName}.${propertyKey}`, duration, args);
        throw error;
      }
    };

    return descriptor;
  };
}
