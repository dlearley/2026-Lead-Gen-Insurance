import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import { 
  logger, 
  createInputSanitizer, 
  createSecurityHeaders, 
  createSecurityRateLimiter, 
  rateLimitPresets, 
  securityHeaderPresets 
} from '@insurance-lead-gen/core';
import { authMiddleware } from './middleware/auth.js';
import { csrfProtection, getCsrfToken } from './middleware/csrf.js';
import { enforceHttps } from './middleware/https.js';
import { userRateLimiter } from './middleware/user-rate-limit.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import authRouter from './routes/auth.js';
import leadsRouter from './routes/leads.js';
import notesRouter from './routes/notes.js';
import activityRouter from './routes/activity.js';
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
import claimsRouter from './routes/claims.js';
import brokerToolsRouter from './routes/broker-tools.js';
import strategyRouter from './routes/strategy.js';
import { UPLOADS_DIR } from './utils/files.js';
import mediaSessionsRouter from './routes/media-sessions.js';
import mediaRecordingsRouter from './routes/media-recordings.js';
import rtcSignalingRouter from './routes/rtc-signaling.js';

export function createApp(): express.Express {
  const app = express();

  // Request ID
  app.use(requestIdMiddleware);

  // HTTPS Enforcement
  app.use(enforceHttps);

  // Security Headers (replaces app.use(helmet()))
  app.use(createSecurityHeaders(securityHeaderPresets.moderate));
  
  // Basic Helmet for remaining headers
  app.use(helmet({
    contentSecurityPolicy: false, // Handled by createSecurityHeaders
  }));

  // CORS Hardening
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
  app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    credentials: true,
    maxAge: 86400, // 24 hours
  }));

  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(apiAnalyticsMiddleware);

  app.use(requestIdMiddleware);
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

  app.use('/uploads', express.static(path.resolve(UPLOADS_DIR)));

  const openApiSpec = generateOpenApiSpec();
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.get('/openapi.json', (req, res) => {
    res.json(openApiSpec);
  });

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'insurance-lead-gen-api',
      version: '1.0.0',
    });
  });

  // CSRF Token Endpoint (public)
  app.get('/api/csrf-token', getCsrfToken);

  // Public Auth Routes
  app.use('/api/auth', authRouter);

  // Auth & CSRF protection for all API routes
  app.use('/api', authMiddleware);
  app.use('/api', userRateLimiter);
  app.use('/api', (req, res, next) => {
    // Only apply CSRF to state-changing requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return csrfProtection(req, res, next);
    }
    next();
  });

  app.use('/api/v1/leads', leadsRouter);
  app.use('/api/v1/leads/:leadId/notes', notesRouter);
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
  app.use('/api/v1/claims', claimsRouter);
  app.use('/api/v1/strategy', strategyRouter);

  app.use('/api/leads', leadsRouter);
  app.use('/api/leads/:leadId/notes', notesRouter);
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
  app.use('/api/claims', claimsRouter);
  app.use('/api/strategy', strategyRouter);

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
