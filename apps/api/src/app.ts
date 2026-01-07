import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { logger } from '@insurance-lead-gen/core';
import swaggerUi from 'swagger-ui-express';
import { apiAnalyticsMiddleware } from './middleware/analytics.js';
import { generateOpenApiSpec } from './openapi.js';
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
import alertsRouter from './routes/alerts.js';
import scoringRouter from './routes/scoring.js';
import carriersRouter from './routes/carriers.js';
import brokersRouter from './routes/brokers.js';
import integrationsRouter from './routes/integrations.js';
import biRouter from './routes/bi.js';
import vipRouter from './routes/vip.js';
import communityRouter from './routes/community.js';
import communityNetworkRouter from './routes/community-network.js';
import claimsRouter from './routes/claims.js';
import brokerToolsRouter from './routes/broker-tools.js';
import knowledgeBaseRouter from './routes/knowledge-base.js';
import { UPLOADS_DIR } from './utils/files.js';
import mediaSessionsRouter from './routes/media-sessions.js';
import mediaRecordingsRouter from './routes/media-recordings.js';
import rtcSignalingRouter from './routes/rtc-signaling.js';

export function createApp(): express.Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(apiAnalyticsMiddleware);

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

  app.use('/api/v1/leads', leadsRouter);
  app.use('/api/v1/leads/:leadId/notes', notesRouter);
  app.use('/api/v1/leads/:leadId/activity', activityRouter);
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
  app.use('/api/v1/carriers', carriersRouter);
  app.use('/api/v1/brokers', brokersRouter);
  app.use('/api/v1/integrations', integrationsRouter);
  app.use('/api/v1/bi', biRouter);
  app.use('/api/v1/vip', vipRouter);
  app.use('/api/v1/community', communityRouter);
  app.use('/api/v1/community-network', communityNetworkRouter);
  app.use('/api/v1/claims', claimsRouter);
  app.use('/api/v1/knowledge-base', knowledgeBaseRouter);

  app.use('/api/leads', leadsRouter);
  app.use('/api/leads/:leadId/notes', notesRouter);
  app.use('/api/leads/:leadId/activity', activityRouter);
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
  app.use('/api/carriers', carriersRouter);
  app.use('/api/brokers', brokersRouter);
  app.use('/api/integrations', integrationsRouter);
  app.use('/api/bi', biRouter);
  app.use('/api/vip', vipRouter);
  app.use('/api/community', communityRouter);
  app.use('/api/community-network', communityNetworkRouter);
  app.use('/api/claims', claimsRouter);
  
  // Phase 30: Partner Ecosystem Routes (without v1 prefix)
  app.use('/api/partners', partnersRouter);
  app.use('/api/applications', applicationsRouter);
  app.use('/api/keys', apiKeysRouter);
  app.use('/api/webhooks', webhooksRouter);
  app.use('/api/marketplace', marketplaceRouter);

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error', { error: err });
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

export const app = createApp();
