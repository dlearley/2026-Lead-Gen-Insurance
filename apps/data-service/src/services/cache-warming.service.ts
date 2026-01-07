/**
 * Cache Warming Service
 * Pre-loads critical data into cache for optimal performance
 */

import { PrismaClient } from '@prisma/client';
import { CacheManager, logger } from '@insurance-lead-gen/core';
import type {
  CacheWarmingStrategy,
  CacheMetrics,
  CacheHitRateReport,
} from '@insurance-lead-gen/types';

export class CacheWarmingService {
  private prisma: PrismaClient;
  private cache: CacheManager;
  private hitCounts: Map<string, number> = new Map();
  private missCounts: Map<string, number> = new Map();

  constructor(prisma: PrismaClient, cache: CacheManager) {
    this.prisma = prisma;
    this.cache = cache;
  }

  async warmCriticalData(): Promise<void> {
    logger.info('Starting cache warming...');

    const strategies: CacheWarmingStrategy[] = [
      {
        name: 'active-agents',
        keys: ['agents:active'],
        loader: 'loadActiveAgents',
        priority: 'critical',
      },
      {
        name: 'agent-availability',
        keys: ['agents:availability'],
        loader: 'loadAgentAvailability',
        priority: 'high',
      },
      {
        name: 'recent-leads',
        keys: ['leads:recent'],
        loader: 'loadRecentLeads',
        priority: 'high',
      },
      {
        name: 'carrier-performance',
        keys: ['carriers:performance'],
        loader: 'loadCarrierPerformance',
        priority: 'medium',
      },
      {
        name: 'insurance-types',
        keys: ['metadata:insurance-types'],
        loader: 'loadInsuranceTypes',
        priority: 'low',
      },
    ];

    for (const strategy of strategies) {
      try {
        await this.executeWarmingStrategy(strategy);
        logger.info('Cache warming strategy completed', { strategy: strategy.name });
      } catch (error) {
        logger.error('Cache warming strategy failed', { strategy: strategy.name, error });
      }
    }

    logger.info('Cache warming completed');
  }

  private async executeWarmingStrategy(strategy: CacheWarmingStrategy): Promise<void> {
    switch (strategy.loader) {
      case 'loadActiveAgents':
        await this.loadActiveAgents();
        break;
      case 'loadAgentAvailability':
        await this.loadAgentAvailability();
        break;
      case 'loadRecentLeads':
        await this.loadRecentLeads();
        break;
      case 'loadCarrierPerformance':
        await this.loadCarrierPerformance();
        break;
      case 'loadInsuranceTypes':
        await this.loadInsuranceTypes();
        break;
      default:
        logger.warn('Unknown cache warming loader', { loader: strategy.loader });
    }
  }

  private async loadActiveAgents(): Promise<void> {
    const agents = await this.prisma.agent.findMany({
      where: { isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        specializations: true,
        city: true,
        state: true,
        currentLeadCount: true,
        maxLeadCapacity: true,
      },
    });

    await this.cache.set('agents:active', agents, 300); // 5 minutes
  }

  private async loadAgentAvailability(): Promise<void> {
    const agents = await this.prisma.agent.findMany({
      where: {
        isActive: true,
        currentLeadCount: {
          lt: this.prisma.agent.fields.maxLeadCapacity,
        },
      },
      select: {
        id: true,
        currentLeadCount: true,
        maxLeadCapacity: true,
      },
    });

    const availability = agents.map((agent) => ({
      agentId: agent.id,
      available: agent.currentLeadCount < agent.maxLeadCapacity,
      capacity: agent.maxLeadCapacity - agent.currentLeadCount,
    }));

    await this.cache.set('agents:availability', availability, 60); // 1 minute
  }

  private async loadRecentLeads(): Promise<void> {
    const leads = await this.prisma.lead.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        insuranceType: true,
        qualityScore: true,
        createdAt: true,
      },
    });

    await this.cache.set('leads:recent', leads, 180); // 3 minutes
  }

  private async loadCarrierPerformance(): Promise<void> {
    const carriers = await this.prisma.carrier.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        performanceScore: true,
        conversionRate: true,
        averageResponseTime: true,
      },
    });

    await this.cache.set('carriers:performance', carriers, 600); // 10 minutes
  }

  private async loadInsuranceTypes(): Promise<void> {
    const types = ['AUTO', 'HOME', 'LIFE', 'HEALTH', 'COMMERCIAL'];
    await this.cache.set('metadata:insurance-types', types, 3600); // 1 hour
  }

  async invalidatePattern(pattern: string): Promise<void> {
    logger.info('Invalidating cache pattern', { pattern });
    await this.cache.deletePattern(pattern);
  }

  async invalidateOnEvent(eventType: string, entityId?: string): Promise<void> {
    const invalidationMap: Record<string, string[]> = {
      'lead.created': ['leads:recent', 'leads:stats'],
      'lead.updated': ['leads:recent', `lead:${entityId}`],
      'agent.updated': ['agents:active', 'agents:availability', `agent:${entityId}`],
      'assignment.created': ['agents:availability', 'leads:recent'],
      'carrier.updated': ['carriers:performance', `carrier:${entityId}`],
    };

    const patterns = invalidationMap[eventType] || [];
    for (const pattern of patterns) {
      await this.invalidatePattern(pattern);
    }

    logger.info('Cache invalidated for event', { eventType, patterns });
  }

  trackCacheHit(key: string): void {
    const count = this.hitCounts.get(key) || 0;
    this.hitCounts.set(key, count + 1);
  }

  trackCacheMiss(key: string): void {
    const count = this.missCounts.get(key) || 0;
    this.missCounts.set(key, count + 1);
  }

  async getCacheMetrics(): Promise<CacheMetrics> {
    const totalHits = Array.from(this.hitCounts.values()).reduce((a, b) => a + b, 0);
    const totalMisses = Array.from(this.missCounts.values()).reduce((a, b) => a + b, 0);
    const totalRequests = totalHits + totalMisses;

    const stats = this.cache.getStats();

    return {
      hits: totalHits,
      misses: totalMisses,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      evictions: 0, // Would need Redis INFO command
      size: stats.localCacheSize,
      memoryUsage: 0, // Would need Redis INFO command
      avgGetTime: 0,
      avgSetTime: 0,
    };
  }

  async getCacheHitRateReport(): Promise<CacheHitRateReport> {
    const byKey: Record<string, number> = {};
    const byPattern: Record<string, number> = {};

    for (const [key, hits] of this.hitCounts.entries()) {
      const misses = this.missCounts.get(key) || 0;
      const total = hits + misses;
      byKey[key] = total > 0 ? hits / total : 0;

      const pattern = key.split(':')[0];
      if (!byPattern[pattern]) {
        byPattern[pattern] = 0;
      }
      byPattern[pattern] += hits;
    }

    for (const pattern in byPattern) {
      let totalMisses = 0;
      for (const [key, misses] of this.missCounts.entries()) {
        if (key.startsWith(pattern + ':')) {
          totalMisses += misses;
        }
      }
      const total = byPattern[pattern] + totalMisses;
      byPattern[pattern] = total > 0 ? byPattern[pattern] / total : 0;
    }

    const metrics = await this.getCacheMetrics();

    return {
      overall: metrics.hitRate,
      byKey,
      byPattern,
      timestamp: new Date(),
    };
  }

  resetMetrics(): void {
    this.hitCounts.clear();
    this.missCounts.clear();
  }
}
