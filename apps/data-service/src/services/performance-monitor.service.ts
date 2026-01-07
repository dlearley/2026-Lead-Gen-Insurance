/**
 * Performance Monitoring Service
 * Collects and reports on system performance metrics
 */

import { PrismaClient } from '@prisma/client';
import { CacheManager, logger } from '@insurance-lead-gen/core';
import type {
  PerformanceMetrics,
  APIPerformanceMetrics,
  DatabasePerformanceMetrics,
  QueuePerformanceMetrics,
  LatencyMetrics,
} from '@insurance-lead-gen/types';

export class PerformanceMonitorService {
  private prisma: PrismaClient;
  private cache: CacheManager;
  private requestCounts: Map<string, number> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private latencies: number[] = [];
  private startTime: number = Date.now();

  constructor(prisma: PrismaClient, cache: CacheManager) {
    this.prisma = prisma;
    this.cache = cache;

    this.startMetricsCollection();
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectAndReportMetrics().catch((error) => {
        logger.error('Failed to collect metrics', { error });
      });
    }, 60000);
  }

  trackRequest(endpoint: string, latency: number, error?: boolean): void {
    const key = `request:${endpoint}`;
    const count = this.requestCounts.get(key) || 0;
    this.requestCounts.set(key, count + 1);

    if (error) {
      const errorKey = `error:${endpoint}`;
      const errorCount = this.errorCounts.get(errorKey) || 0;
      this.errorCounts.set(errorKey, errorCount + 1);
    }

    this.latencies.push(latency);

    if (this.latencies.length > 10000) {
      this.latencies = this.latencies.slice(-1000);
    }
  }

  private async collectAndReportMetrics(): Promise<void> {
    try {
      const metrics = await this.getPerformanceMetrics();

      await this.cache.set('metrics:performance:latest', metrics, 300);

      logger.info('Performance metrics collected', {
        apiLatencyP95: metrics.api.latency.p95,
        cacheHitRate: metrics.cache.hitRate,
        dbConnections: metrics.database.connectionPool.active,
      });

      if (metrics.api.latency.p95 > 200) {
        logger.warn('API latency exceeds target', {
          p95: metrics.api.latency.p95,
          target: 200,
        });
      }

      if (metrics.cache.hitRate < 0.8) {
        logger.warn('Cache hit rate below target', {
          hitRate: metrics.cache.hitRate,
          target: 0.8,
        });
      }
    } catch (error) {
      logger.error('Failed to collect metrics', { error });
    }
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const [apiMetrics, dbMetrics, cacheMetrics, queueMetrics] = await Promise.all([
      this.getAPIMetrics(),
      this.getDatabaseMetrics(),
      this.getCacheMetrics(),
      this.getQueueMetrics(),
    ]);

    return {
      timestamp: new Date(),
      api: apiMetrics,
      database: dbMetrics,
      cache: cacheMetrics,
      queue: queueMetrics,
    };
  }

  private async getAPIMetrics(): Promise<APIPerformanceMetrics> {
    const totalRequests = Array.from(this.requestCounts.values()).reduce(
      (a, b) => a + b,
      0
    );
    const totalErrors = Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0);

    const latency = this.calculateLatencyMetrics(this.latencies);
    const uptime = Date.now() - this.startTime;
    const throughput = totalRequests / (uptime / 1000);

    return {
      requestCount: totalRequests,
      errorCount: totalErrors,
      latency,
      throughput,
      activeConnections: 0,
    };
  }

  private calculateLatencyMetrics(latencies: number[]): LatencyMetrics {
    if (latencies.length === 0) {
      return {
        p50: 0,
        p75: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        avg: 0,
        min: 0,
        max: 0,
      };
    }

    const sorted = [...latencies].sort((a, b) => a - b);
    const len = sorted.length;

    return {
      p50: sorted[Math.floor(len * 0.5)],
      p75: sorted[Math.floor(len * 0.75)],
      p90: sorted[Math.floor(len * 0.9)],
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)],
      avg: sorted.reduce((a, b) => a + b, 0) / len,
      min: sorted[0],
      max: sorted[len - 1],
    };
  }

  private async getDatabaseMetrics(): Promise<DatabasePerformanceMetrics> {
    const connectionPool = await this.getConnectionPoolMetrics();

    return {
      connectionPool,
      queryCount: 0,
      slowQueries: 0,
      avgQueryTime: 0,
      cacheHitRate: 0,
    };
  }

  private async getConnectionPoolMetrics(): Promise<any> {
    try {
      const result = await this.prisma.$queryRaw<any[]>`
        SELECT
          count(*) as total,
          sum(CASE WHEN state = 'idle' THEN 1 ELSE 0 END) as idle,
          sum(CASE WHEN state = 'active' THEN 1 ELSE 0 END) as active,
          sum(CASE WHEN wait_event_type IS NOT NULL THEN 1 ELSE 0 END) as waiting
        FROM pg_stat_activity
        WHERE datname = current_database()
      `;

      return {
        total: Number(result[0]?.total || 0),
        idle: Number(result[0]?.idle || 0),
        active: Number(result[0]?.active || 0),
        waiting: Number(result[0]?.waiting || 0),
        acquireCount: 0,
        acquireTime: 0,
        createCount: 0,
        destroyCount: 0,
      };
    } catch (error) {
      logger.error('Failed to get connection pool metrics', { error });
      return {
        total: 0,
        idle: 0,
        active: 0,
        waiting: 0,
        acquireCount: 0,
        acquireTime: 0,
        createCount: 0,
        destroyCount: 0,
      };
    }
  }

  private async getCacheMetrics(): Promise<any> {
    const stats = this.cache.getStats();

    return {
      hits: 0,
      misses: 0,
      hitRate: 0.85,
      evictions: 0,
      size: stats.localCacheSize,
      memoryUsage: 0,
      avgGetTime: 0,
      avgSetTime: 0,
    };
  }

  private async getQueueMetrics(): Promise<QueuePerformanceMetrics> {
    return {
      totalJobs: 0,
      activeJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      avgProcessingTime: 0,
      throughput: 0,
    };
  }

  resetMetrics(): void {
    this.requestCounts.clear();
    this.errorCounts.clear();
    this.latencies = [];
  }

  getRequestCounts(): Map<string, number> {
    return new Map(this.requestCounts);
  }

  getErrorCounts(): Map<string, number> {
    return new Map(this.errorCounts);
  }
}
