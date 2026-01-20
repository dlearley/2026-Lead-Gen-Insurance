/**
 * Observability Initialization Module
 * 
 * Provides a unified way to initialize observability across all services
 * with tracing, metrics, health checks, and structured logging.
 */

import { Express, Request, Response } from 'express';
import { initializeObservability, ObservabilityManager } from '../monitoring/observability';
import { HealthService, createHealthMiddleware } from '../monitoring/health';
import { MetricsCollector } from '../monitoring/metrics';
import { createOtelLogger } from '../monitoring/winston-otel';
import { DatabaseManager } from '../database';
import { Redis } from 'ioredis';
import { register } from 'prom-client';
import { logger } from '../logger';

export interface ObservabilityInitConfig {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  app: Express;
  databaseManager?: DatabaseManager;
  redisClient?: Redis;
  neo4jClient?: any;
  enableTracing?: boolean;
  enableMetrics?: boolean;
  enableHealthChecks?: boolean;
}

export interface ObservabilityServices {
  observability: ObservabilityManager;
  health?: HealthService;
  metrics: MetricsCollector;
  logger: ReturnType<typeof createOtelLogger>;
}

/**
 * Initialize comprehensive observability for a service
 */
export function initializeServiceObservability(config: ObservabilityInitConfig): ObservabilityServices {
  const {
    serviceName,
    serviceVersion = '1.0.0',
    environment = process.env.NODE_ENV || 'development',
    app,
    databaseManager,
    redisClient,
    neo4jClient,
    enableTracing = true,
    enableMetrics = true,
    enableHealthChecks = true,
  } = config;

  logger.info(`Initializing observability for ${serviceName}`, {
    version: serviceVersion,
    environment,
    tracing: enableTracing,
    metrics: enableMetrics,
    healthChecks: enableHealthChecks,
  });

  // 1. Initialize observability manager (tracing + metrics)
  const observability = initializeObservability({
    serviceName,
    serviceVersion,
    environment,
    tracingEnabled: enableTracing,
    metricsEnabled: enableMetrics,
  });

  // 2. Initialize structured logger with trace context
  const structuredLogger = createOtelLogger({
    serviceName,
    environment,
    level: process.env.LOG_LEVEL || 'info',
  });

  // 3. Initialize metrics collector
  const metrics = new MetricsCollector(serviceName);

  // 4. Initialize health service if dependencies provided
  let healthService: HealthService | undefined;
  if (enableHealthChecks && databaseManager && redisClient) {
    healthService = HealthService.getInstance(databaseManager, redisClient, neo4jClient);
    setupHealthEndpoints(app, healthService);
  } else if (enableHealthChecks) {
    setupBasicHealthEndpoints(app, serviceName, serviceVersion);
  }

  // 5. Setup metrics endpoint
  if (enableMetrics) {
    setupMetricsEndpoint(app, metrics);
  }

  // 6. Setup operational endpoints
  setupOperationalEndpoints(app, serviceName, serviceVersion, healthService);

  structuredLogger.info(`Observability initialized successfully for ${serviceName}`);

  return {
    observability,
    health: healthService,
    metrics,
    logger: structuredLogger,
  };
}

/**
 * Setup health check endpoints
 */
function setupHealthEndpoints(app: Express, healthService: HealthService): void {
  const healthMiddleware = createHealthMiddleware(healthService);

  // Liveness probe - is the service running?
  app.get('/health/live', healthMiddleware.liveness);
  app.get('/livez', healthMiddleware.liveness);

  // Readiness probe - is the service ready to accept traffic?
  app.get('/health/ready', healthMiddleware.readiness);
  app.get('/readyz', healthMiddleware.readiness);

  // Full health check with dependency status
  app.get('/health', healthMiddleware.health);
  app.get('/healthz', healthMiddleware.health);

  // Health summary with historical data
  app.get('/health/summary', healthMiddleware.summary);
}

/**
 * Setup basic health endpoints without full health service
 */
function setupBasicHealthEndpoints(app: Express, serviceName: string, version: string): void {
  // Liveness probe
  app.get('/health/live', (req: Request, res: Response) => {
    res.json({
      alive: true,
      timestamp: new Date().toISOString(),
      service: serviceName,
      version,
    });
  });

  app.get('/livez', (req: Request, res: Response) => {
    res.json({
      alive: true,
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness probe
  app.get('/health/ready', (req: Request, res: Response) => {
    res.json({
      ready: true,
      timestamp: new Date().toISOString(),
      service: serviceName,
      version,
    });
  });

  app.get('/readyz', (req: Request, res: Response) => {
    res.json({
      ready: true,
      timestamp: new Date().toISOString(),
    });
  });

  // Basic health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: serviceName,
      version,
      uptime: process.uptime(),
    });
  });

  app.get('/healthz', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });
}

/**
 * Setup metrics endpoint
 */
function setupMetricsEndpoint(app: Express, metrics: MetricsCollector): void {
  app.get('/metrics', async (req: Request, res: Response) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      logger.error('Error generating metrics', { error });
      res.status(500).end();
    }
  });
}

/**
 * Setup operational endpoints
 */
function setupOperationalEndpoints(
  app: Express,
  serviceName: string,
  version: string,
  healthService?: HealthService
): void {
  // Service information
  app.get('/info', (req: Request, res: Response) => {
    res.json({
      service: serviceName,
      version,
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    });
  });

  // Service status
  app.get('/status', async (req: Request, res: Response) => {
    const status = {
      service: serviceName,
      status: 'operational',
      version,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };

    if (healthService) {
      try {
        const health = await healthService.checkHealth();
        status.status = health.status === 'healthy' ? 'operational' : 
                       health.status === 'degraded' ? 'degraded' : 'down';
      } catch (error) {
        logger.error('Error checking health for status endpoint', { error });
      }
    }

    res.json(status);
  });

  // Environment info (sanitized)
  app.get('/env', (req: Request, res: Response) => {
    const safeEnvVars = {
      NODE_ENV: process.env.NODE_ENV,
      SERVICE_NAME: serviceName,
      VERSION: version,
      LOG_LEVEL: process.env.LOG_LEVEL,
      // Add other safe env vars as needed
    };

    res.json({
      service: serviceName,
      environment: safeEnvVars,
      timestamp: new Date().toISOString(),
    });
  });
}

/**
 * Setup graceful shutdown handlers
 */
export function setupGracefulShutdown(
  observability: ObservabilityManager,
  cleanup?: () => Promise<void>
): void {
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, starting graceful shutdown`);

    try {
      // Custom cleanup
      if (cleanup) {
        await cleanup();
      }

      // Shutdown observability
      await observability.shutdown();

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', { error });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
