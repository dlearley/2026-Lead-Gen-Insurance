import { Redis } from 'ioredis';
import { DatabaseManager } from '../database/index.js';
import { logger } from '../logger.js';
import { neon } from '@neondatabase/serverless';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  service: string;
  version: string;
  dependencies: DependencyStatus[];
  responseTime: number;
}

export interface DependencyStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  lastCheck: string;
}

export interface ReadinessStatus extends HealthStatus {
  ready: boolean;
  checks: {
    database: boolean;
    redis: boolean;
    neo4j: boolean;
    [key: string]: boolean;
  };
}

export class HealthService {
  private static instance: HealthService;
  private databaseManager: DatabaseManager;
  private redisClient: Redis;
  private neo4jClient: any;
  private healthCheckHistory: HealthStatus[] = [];
  private readonly MAX_HISTORY_SIZE = 100;

  constructor(
    databaseManager: DatabaseManager,
    redisClient: Redis,
    neo4jClient?: any
  ) {
    this.databaseManager = databaseManager;
    this.redisClient = redisClient;
    this.neo4jClient = neo4jClient;
  }

  static getInstance(databaseManager: DatabaseManager, redisClient: Redis, neo4jClient?: any): HealthService {
    if (!HealthService.instance) {
      HealthService.instance = new HealthService(databaseManager, redisClient, neo4jClient);
    }
    return HealthService.instance;
  }

  /**
   * Performs a comprehensive health check of all dependencies
   */
  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    const dependencies: DependencyStatus[] = [];

    // Check database
    const dbCheck = await this.checkDatabase();
    dependencies.push(dbCheck);

    // Check Redis
    const redisCheck = await this.checkRedis();
    dependencies.push(redisCheck);

    // Check Neo4j
    const neo4jCheck = await this.checkNeo4j();
    dependencies.push(neo4jCheck);

    // Determine overall status
    const unhealthyCount = dependencies.filter(d => d.status === 'unhealthy').length;
    const degradedCount = dependencies.filter(d => d.status === 'degraded').length;
    
    let status: HealthStatus['status'] = 'healthy';
    if (unhealthyCount > 0) {
      status = 'unhealthy';
    } else if (degradedCount > 0) {
      status = 'degraded';
    }

    const healthStatus: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      service: this.getServiceName(),
      version: this.getVersion(),
      dependencies,
      responseTime: Date.now() - startTime,
    };

    this.addToHistory(healthStatus);
    return healthStatus;
  }

  /**
   * Checks if the service is ready to handle requests
   */
  async checkReadiness(): Promise<ReadinessStatus> {
    const healthCheck = await this.checkHealth();
    
    const checks = {
      database: healthCheck.dependencies.find(d => d.name === 'database')?.status === 'healthy',
      redis: healthCheck.dependencies.find(d => d.name === 'redis')?.status === 'healthy',
      neo4j: healthCheck.dependencies.find(d => d.name === 'neo4j')?.status === 'healthy',
    };

    const allHealthy = Object.values(checks).every(Boolean);

    return {
      ...healthCheck,
      ready: allHealthy && healthCheck.status === 'healthy',
      checks,
    };
  }

  /**
   * Quick liveness check - just checks if the service is running
   */
  checkLiveness(): { alive: boolean; timestamp: string } {
    return {
      alive: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Checks database connectivity and performance
   */
  private async checkDatabase(): Promise<DependencyStatus> {
    const startTime = Date.now();
    const check: DependencyStatus = {
      name: 'database',
      status: 'healthy',
      lastCheck: new Date().toISOString(),
    };

    try {
      // Check PostgreSQL connection
      const prisma = this.databaseManager.getPrismaClient();
      await prisma.$queryRaw`SELECT 1`;
      
      // Additional check: measure query performance
      const perfStart = Date.now();
      await prisma.lead.count({ take: 1 });
      const queryTime = Date.now() - perfStart;
      
      check.responseTime = Date.now() - startTime;
      
      // Mark as degraded if query is slow (> 500ms)
      if (queryTime > 500) {
        check.status = 'degraded';
        logger.warn('Database query performance degraded', { queryTime, threshold: 500 });
      }
      
    } catch (error) {
      check.status = 'unhealthy';
      check.error = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Database health check failed', { error });
    }

    return check;
  }

  /**
   * Checks Redis connectivity and memory usage
   */
  private async checkRedis(): Promise<DependencyStatus> {
    const startTime = Date.now();
    const check: DependencyStatus = {
      name: 'redis',
      status: 'healthy',
      lastCheck: new Date().toISOString(),
    };

    try {
      // Check Redis connection
      await this.redisClient.ping();
      
      // Check memory usage
      const memoryInfo = await this.redisClient.info('memory');
      const usedMemoryMatch = memoryInfo.match(/used_memory:(\d+)/);
      const maxMemoryMatch = memoryInfo.match(/maxmemory:(\d+)/);
      
      if (usedMemoryMatch && maxMemoryMatch && parseInt(maxMemoryMatch[1]) > 0) {
        const usedMemory = parseInt(usedMemoryMatch[1]);
        const maxMemory = parseInt(maxMemoryMatch[1]);
        const memoryUsage = (usedMemory / maxMemory) * 100;
        
        if (memoryUsage > 90) {
          check.status = 'degraded';
          logger.warn('Redis memory usage high', { memoryUsage: `${memoryUsage.toFixed(2)}%` });
        }
      }
      
      check.responseTime = Date.now() - startTime;
      
    } catch (error) {
      check.status = 'unhealthy';
      check.error = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Redis health check failed', { error });
    }

    return check;
  }

  /**
   * Checks Neo4j connectivity
   */
  private async checkNeo4j(): Promise<DependencyStatus> {
    const startTime = Date.now();
    const check: DependencyStatus = {
      name: 'neo4j',
      status: 'healthy',
      lastCheck: new Date().toISOString(),
    };

    // Skip if Neo4j is not configured
    if (!this.neo4jClient) {
      check.status = 'degraded';
      check.error = 'Neo4j not configured';
      return check;
    }

    try {
      // Test Neo4j connection
      await this.neo4jClient.verifyConnectivity();
      check.responseTime = Date.now() - startTime;
    } catch (error) {
      check.status = 'unhealthy';
      check.error = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Neo4j health check failed', { error });
    }

    return check;
  }

  /**
   * Checks external API dependencies
   */
  async checkExternalAPI(url: string, name: string): Promise<DependencyStatus> {
    const startTime = Date.now();
    const check: DependencyStatus = {
      name,
      status: 'healthy',
      lastCheck: new Date().toISOString(),
    };

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'Insurance-Lead-Gen-Health-Check/1.0' },
        timeout: 5000,
      });

      check.responseTime = Date.now() - startTime;

      if (!response.ok) {
        check.status = 'degraded';
        check.error = `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (error) {
      check.status = 'unhealthy';
      check.error = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`External API health check failed for ${name}`, { error, url });
    }

    return check;
  }

  /**
   * Gets health check history
   */
  getHealthHistory(limit: number = 50): HealthStatus[] {
    return this.healthCheckHistory.slice(-limit);
  }

  /**
   * Gets statistical summary of health checks
   */
  getHealthSummary(minutes: number = 60): {
    uptime: number;
    averageResponseTime: number;
    availability: number;
  } {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    const recentChecks = this.healthCheckHistory.filter(
      h => new Date(h.timestamp) >= cutoffTime
    );

    if (recentChecks.length === 0) {
      return { uptime: 0, averageResponseTime: 0, availability: 0 };
    }

    const totalChecks = recentChecks.length;
    const healthyChecks = recentChecks.filter(h => h.status === 'healthy').length;
    const uptime = (healthyChecks / totalChecks) * 100;

    const avgResponseTime = recentChecks.reduce((sum, h) => sum + h.responseTime, 0) / totalChecks;
    const availability = uptime;

    return {
      uptime,
      averageResponseTime: Math.round(avgResponseTime),
      availability,
    };
  }

  private addToHistory(healthStatus: HealthStatus): void {
    this.healthCheckHistory.push(healthStatus);
    if (this.healthCheckHistory.length > this.MAX_HISTORY_SIZE) {
      this.healthCheckHistory = this.healthCheckHistory.slice(-this.MAX_HISTORY_SIZE);
    }
  }

  private getServiceName(): string {
    return process.env.SERVICE_NAME || 'unknown-service';
  }

  private getVersion(): string {
    return process.env.VERSION || '1.0.0';
  }
}

// Health check middleware for Express
export function createHealthMiddleware(healthService: HealthService) {
  return {
    // Liveness probe endpoint
    liveness: (req: any, res: any) => {
      const liveness = healthService.checkLiveness();
      res.json(liveness);
    },

    // Readiness probe endpoint
    readiness: async (req: any, res: any) => {
      try {
        const readiness = await healthService.checkReadiness();
        const status = readiness.ready ? 200 : 503;
        res.status(status).json(readiness);
      } catch (error) {
        logger.error('Readiness check failed', { error });
        res.status(503).json({ error: 'Readiness check failed' });
      }
    },

    // Full health check endpoint
    health: async (req: any, res: any) => {
      try {
        const health = await healthService.checkHealth();
        const status = health.status === 'unhealthy' ? 503 : 200;
        res.status(status).json(health);
      } catch (error) {
        logger.error('Health check failed', { error });
        res.status(503).json({ error: 'Health check failed' });
      }
    },

    // Health summary endpoint
    summary: (req: any, res: any) => {
      try {
        const minutes = parseInt(req.query.minutes as string) || 60;
        const summary = healthService.getHealthSummary(minutes);
        res.json(summary);
      } catch (error) {
        logger.error('Health summary failed', { error });
        res.status(500).json({ error: 'Failed to get health summary' });
      }
    },
  };
}