import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import { logger, MetricsCollector, createSecurityRateLimiter, rateLimitPresets, createInputSanitizer } from '@insurance-lead-gen/core';
import { register } from 'prom-client';
import { apiAnalyticsMiddleware } from './middleware/analytics.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { createAuditMiddleware } from './middleware/audit.middleware.js';
import leadsRouter from './routes/leads.js';
import notesRouter from './routes/notes.js';
import activityRouter from './routes/activity.js';
import notesProxyRouter from './routes/notes-proxy.routes.js';
import timelineProxyRouter from './routes/timeline-proxy.routes.js';
import emailsRouter from './routes/emails.js';
import tasksRouter from './routes/tasks.js';
import notificationsRouter from './routes/notifications.js';
import sendEmailRouter from './routes/send-email.js';
import analyticsRouter from './routes/analytics.js';
import policiesRouter from './routes/policies.js';
import reportsRouter from './routes/reports.js';
import regulatoryReportingRouter from './routes/regulatory-reporting.routes.js';
import alertsRouter from './routes/alerts.js';
import scoringRouter from './routes/scoring.js';
import leadScoringMLRouter from './routes/lead-scoring-ml.js';
import abTestingRouter from './routes/ab-testing.js';
import carriersRouter from './routes/carriers.js';
import brokersRouter from './routes/brokers.js';
import brokerAuthRouter from './routes/broker-auth.js';
import integrationsRouter from './routes/integrations.js';
import biRouter from './routes/bi.js';
import vipRouter from './routes/vip.js';
import communityRouter from './routes/community.js';
import brokerEducationRouter from './routes/broker-education.js';
import businessDataIngestionRouter from './routes/business-data-ingestion.js';
import claimsRouter from './routes/claims.js';
import territoryRouter from './routes/territory.js';
import brokerToolsRouter from './routes/broker-tools.js';
import privacyRouter from './routes/privacy.js';
import auditLogsRouter from './routes/audit-logs.js';
import customerSuccessRouter from './routes/customer-success.js';
import onboardingRouter from './routes/onboarding.js';
import gatewayRouter from './routes/gateway.js';
import { talkTrackRouter } from './routes/talk-track.js';
import supportRouter from './routes/support.js';
import vendorPartnerCoordinationRouter from './routes/vendor-partner-coordination.js';
import { OptimizationAPI } from '@insurance-lead-gen/core';
import { UPLOADS_DIR } from './utils/files.js';
import mediaSessionsRouter from './routes/media-sessions.js';
import mediaRecordingsRouter from './routes/media-recordings.js';
import rtcSignalingRouter from './routes/rtc-signaling.js';
import { 
  apiGatewayMiddleware,
  securityHeadersMiddleware,
  corsMiddleware,
  requestIdMiddleware,
  requestValidationMiddleware,
  requestTransformationMiddleware,
  responseTransformationMiddleware,
  circuitBreakerMiddleware
} from './middleware/api-gateway.middleware.js';
import { APIGatewayService } from '@insurance-lead-gen/core';
import { createAuditMiddleware } from './middleware/audit.middleware.js';
import { createSecurityRateLimiter, rateLimitPresets } from './middleware/security-rate-limiter.js';
import { createInputSanitizer } from './middleware/security.js';
import { register, collectDefaultMetrics } from 'prom-client';
import { apiAnalyticsMiddleware } from './middleware/analytics.js';

// Initialize default metrics
collectDefaultMetrics();

// Health Service Interface
interface HealthService {
  checkLiveness(): any;
  checkReadiness(): Promise<any>;
  checkHealth(): Promise<any>;
}

export function createApp(): express.Express {
  const app = express();
  const metrics = new MetricsCollector('api-service');

  // Initialize health service (will be properly initialized when used)
  let healthService: HealthService | null = null;

  // API Gateway Configuration
  const gatewayConfig = {
    security: {
      headers: {
        hsts: { enabled: true, maxAge: 31536000, includeSubDomains: true, preload: true },
        xssProtection: { enabled: true, mode: 'block' },
        contentTypeOptions: { enabled: true },
        frameOptions: { enabled: true, policy: 'SAMEORIGIN' },
        referrerPolicy: { enabled: true, policy: 'strict-origin-when-cross-origin' }
      },
      cors: {
        origin: process.env.NODE_ENV === 'production' ? process.env.ALLOWED_ORIGINS?.split(',') || false : true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key'],
        exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
        credentials: true,
        maxAge: 86400,
        preflightContinue: false,
        optionsSuccessStatus: 204
      }
    },
    rateLimits: {
      global: { requests: 1000, windowMs: 60000, strategy: 'sliding' },
      burstLimit: 50
    },
    validation: {
      enabled: true,
      strict: false,
      schemas: [],
      sanitizeInput: true
    }
  };

  // Initialize API Gateway Service (placeholder - would be connected to actual service)
  const gatewayService = new APIGatewayService(
    // Redis connection would go here
    null as any,
    // Config would go here
    {
      id: 'api-gateway',
      name: 'Insurance Lead Gen API Gateway',
      version: '1.0.0',
      environment: process.env.NODE_ENV as any,
      enabled: true,
      rateLimits: gatewayConfig.rateLimits,
      security: gatewayConfig.security,
      routing: { services: [], loadBalancer: {} as any, circuitBreaker: {} as any, requestTransformation: {} as any, responseTransformation: {} as any },
      caching: { enabled: false, strategies: [], redis: {} as any, memory: {} as any },
      monitoring: { enabled: true, metrics: {} as any, logging: {} as any, tracing: {} as any, alerting: {} as any },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    // Audit service would go here
    null as any,
    metrics
  );

  // Make gateway service available to routes
  app.set('APIGatewayService', gatewayService);

  // Basic middleware
  app.use(helmet(gatewayConfig.security.headers));
  app.use(corsMiddleware(gatewayConfig.security.cors));
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(apiAnalyticsMiddleware);

  // API Gateway middleware stack
  app.use(requestIdMiddleware);
  app.use(apiGatewayMiddleware(gatewayService));
  app.use(requestValidationMiddleware(gatewayConfig.validation));
  app.use(requestTransformationMiddleware());
  app.use(responseTransformationMiddleware(gatewayService));
  app.use(
    createAuditMiddleware({
      excludePaths: ['/health', '/metrics', '/uploads'],
    })
  );

  // Global Rate Limiting
  const globalRateLimiter = createSecurityRateLimiter({
    ...rateLimitPresets.api,
    redis: process.env.REDIS_HOST ? {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    } : undefined,
  });
  app.use('/api', globalRateLimiter);

  // Input Sanitization
  app.use(createInputSanitizer());

  // Metrics middleware
  app.use(metricsCollector.middleware());
  app.use(metrics.middleware());

  app.use('/uploads', express.static(path.resolve(UPLOADS_DIR)));

  // Health check endpoints
  app.get('/health', (req, res) => {
    if (healthService) {
      const liveness = healthService.checkLiveness();
      res.json(liveness);
    } else {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'insurance-lead-gen-api',
        version: '1.0.0',
      });
    }
  });

  app.get('/health/ready', async (req, res) => {
    if (healthService) {
      try {
        const readiness = await healthService.checkReadiness();
        const status = readiness.ready ? 200 : 503;
        res.status(status).json(readiness);
      } catch (error) {
        logger.error('Readiness check failed', { error });
        res.status(503).json({ error: 'Readiness check failed' });
      }
    } else {
      // Basic readiness check if health service not initialized
      res.json({
        ready: true,
        timestamp: new Date().toISOString(),
        service: 'insurance-lead-gen-api',
        version: '1.0.0',
        checks: {},
        dependencies: [],
        responseTime: 0,
        status: 'healthy',
      });
    }
  });

  app.get('/health/full', async (req, res) => {
    if (healthService) {
      try {
        const health = await healthService.checkHealth();
        const status = health.status === 'unhealthy' ? 503 : 200;
        res.status(status).json(health);
      } catch (error) {
        logger.error('Health check failed', { error });
        res.status(503).json({ error: 'Health check failed' });
      }
    } else {
      // Basic health check if health service not initialized
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'insurance-lead-gen-api',
        version: '1.0.0',
        dependencies: [],
        responseTime: 0,
      });
    }
  });

  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', metrics.getContentType());
      res.end(await metrics.getMetrics());
    } catch (error) {
      res.status(500).end(error);
    }
  });

  app.use('/api/v1/leads', leadsRouter);
  app.use('/api/v1/leads/:leadId/notes', notesProxyRouter);
  app.use('/api/v1/leads/:leadId/timeline', timelineProxyRouter);
  app.use('/api/v1/leads/:leadId/activity', activityRouter);
  app.use('/api/v1/privacy', privacyRouter);
  app.use('/api/v1/audit-logs', auditLogsRouter);
  app.use('/api/v1/leads/:leadId/emails', emailsRouter);
  app.use('/api/v1/leads/:leadId/tasks', tasksRouter);
  app.use('/api/v1/leads/:leadId/policies', policiesRouter);
  app.use('/api/v1/leads/:leadId/send-email', sendEmailRouter);
  app.use('/api/v1/leads/:leadId/broker-tools', brokerToolsRouter);
  app.use('/api/v1/notifications', notificationsRouter);
  app.use('/api/v1/analytics', analyticsRouter);
  app.use('/api/v1/reports', reportsRouter);
  app.use('/api/v1/alerts', alertsRouter);
  app.use('/api/v1/scoring', scoringRouter);
  app.use('/api/v1/lead-scoring-ml', leadScoringMLRouter);
  app.use('/api/v1/ab-testing', abTestingRouter);
  app.use('/api/v1/carriers', carriersRouter);
  app.use('/api/v1/brokers', brokersRouter);
  app.use('/api/brokers', brokerAuthRouter);
  app.use('/api/v1/integrations', integrationsRouter);
  app.use('/api/v1/bi', biRouter);
  app.use('/api/v1/vip', vipRouter);
  app.use('/api/v1/community', communityRouter);
  app.use('/api/v1/broker-education', brokerEducationRouter);
  app.use('/api/v1/business-data', businessDataIngestionRouter);
  app.use('/api/v1/claims', claimsRouter);
  app.use('/api/v1/territories', territoryRouter);
  app.use('/api/v1/talk-tracks', talkTrackRouter);
  app.use('/api/talk-tracks', talkTrackRouter);
  app.use('/api/v1/customer-success', customerSuccessRouter);
  app.use('/api/v1/support', supportRouter);
  app.use('/api/v1/vendor-partner-coordination', vendorPartnerCoordinationRouter);

  // Phase 19.5: Post-Launch Optimization & Operations API routes
  const optimizationAPI = new OptimizationAPI();
  app.use('/api/v1/optimization', optimizationAPI.getRouter());

  app.use('/api/leads', leadsRouter);
  app.use('/api/leads/:leadId/notes', notesProxyRouter);
  app.use('/api/leads/:leadId/timeline', timelineProxyRouter);
  app.use('/api/leads/:leadId/activity', activityRouter);
  app.use('/api/privacy', privacyRouter);
  app.use('/api/audit-logs', auditLogsRouter);
  app.use('/api/leads/:leadId/emails', emailsRouter);
  app.use('/api/leads/:leadId/tasks', tasksRouter);
  app.use('/api/leads/:leadId/policies', policiesRouter);
  app.use('/api/leads/:leadId/send-email', sendEmailRouter);
  app.use('/api/leads/:leadId/broker-tools', brokerToolsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/scoring', scoringRouter);
  app.use('/api/lead-scoring-ml', leadScoringMLRouter);
  app.use('/api/ab-testing', abTestingRouter);
  app.use('/api/carriers', carriersRouter);
  app.use('/api/brokers', brokersRouter);
  app.use('/api/integrations', integrationsRouter);
  app.use('/api/bi', biRouter);
  app.use('/api/vip', vipRouter);
  app.use('/api/community', communityRouter);
  app.use('/api/broker-education', brokerEducationRouter);
  app.use('/api/business-data', businessDataIngestionRouter);
  app.use('/api/claims', claimsRouter);
  app.use('/api/territories', territoryRouter);
  app.use('/api/onboarding', onboardingRouter);
  app.use('/api/support', supportRouter);
  app.use('/api/vendor-partner-coordination', vendorPartnerCoordinationRouter);

  // Phase 19.5: Post-Launch Optimization & Operations API routes (legacy)
  app.use('/api/optimization', optimizationAPI.getRouter());

  // API Gateway routes
  app.use('/api/v1/gateway', gatewayRouter);
  app.use('/api/gateway', gatewayRouter);

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error', { 
      error: err instanceof Error ? err.message : err,
      stack: err instanceof Error ? err.stack : undefined,
      path: req.path,
      method: req.method
    });
    
    const statusCode = err.status || err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message || 'Internal server error';

    res.status(statusCode).json({ error: message });
  });

  return app;
}

export const app = createApp();
