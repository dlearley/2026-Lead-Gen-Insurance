import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from '@insurance-lead-gen/core';
import { getConfig } from '@insurance-lead-gen/config';
import { EVENT_SUBJECTS, type LeadReceivedEvent } from '@insurance-lead-gen/types';

import { NatsEventBus } from './nats/nats-event-bus.js';
import { prisma } from './prisma/client.js';
import { createRedisConnection } from './redis/redis-client.js';
import {
  createLeadIngestionQueue,
  startLeadIngestionWorker,
} from './queues/lead-ingestion.queue.js';
import { LeadRepository } from './repositories/lead.repository.js';
import { AnalyticsService } from './analytics.js';
import { createAnalyticsRoutes } from './routes/analytics.routes.js';
import { default as biRoutes } from './routes/bi.routes.js';
import { AdvancedAnalyticsService } from './services/advanced-analytics.js';

const config = getConfig();
const PORT = config.ports.dataService;

const start = async (): Promise<void> => {
  logger.info('Data service starting', { port: PORT });

  // Initialize Express app for analytics API
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));

  // Initialize services
  const eventBus = await NatsEventBus.connect(config.nats.url);
  const redis = createRedisConnection();

  const leadRepository = new LeadRepository(prisma);
  const analyticsService = new AnalyticsService(prisma);
  const advancedAnalyticsService = new AdvancedAnalyticsService();

  // Setup analytics routes
  app.use('/api/v1/analytics', createAnalyticsRoutes(analyticsService));
  
  // Setup BI routes
  app.use('/api/v1/bi', biRoutes);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'data-service',
      version: '1.0.0',
    });
  });

  // Start Express server
  const server = app.listen(PORT, () => {
    logger.info(`Data service API listening on port ${PORT}`);
  });

  // Queue setup
  const leadIngestionQueue = createLeadIngestionQueue(redis);
  const leadIngestionWorker = startLeadIngestionWorker({
    connection: redis,
    leadRepository,
    eventBus,
  });

  leadIngestionWorker.on('failed', (job, error) => {
    logger.error('Lead ingestion job failed', { jobId: job?.id, error });
  });

  // Event subscriptions
  const leadReceivedSub = eventBus.subscribe(EVENT_SUBJECTS.LeadReceived);
  (async () => {
    for await (const msg of leadReceivedSub) {
      try {
        const event = eventBus.decode<LeadReceivedEvent>(msg.data);

        await leadIngestionQueue.add('ingest', {
          leadId: event.data.leadId,
          lead: event.data.lead,
          rawEvent: event,
        });
      } catch (error) {
        logger.error('Failed to enqueue lead ingestion job', { error });
      }
    }
  })().catch((error) => {
    logger.error('Lead received subscription terminated', { error });
  });

  const leadGetSub = eventBus.subscribe(EVENT_SUBJECTS.LeadGet);
  (async () => {
    for await (const msg of leadGetSub) {
      try {
        const { leadId } = eventBus.decode<{ leadId: string }>(msg.data);
        const lead = await leadRepository.getLeadById(leadId);

        if (msg.reply) {
          eventBus.publish(msg.reply, { lead });
        }
      } catch (error) {
        logger.error('Failed to handle lead.get request', { error });

        if (msg.reply) {
          eventBus.publish(msg.reply, { lead: null, error: 'internal_error' });
        }
      }
    }
  })().catch((error) => {
    logger.error('Lead get subscription terminated', { error });
  });

  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down data service');

    await new Promise<void>((resolve) => server.close(() => resolve()));
    await leadIngestionWorker.close();
    await leadIngestionQueue.close();

    await eventBus.close();
    await prisma.$disconnect();
    await redis.quit();
  };

  process.on('SIGTERM', () => {
    shutdown()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  });

  logger.info('Data service running');
};

start().catch((error) => {
  logger.error('Data service failed to start', { error });
  process.exit(1);
});

// Keep the process alive
setInterval(() => {
  logger.debug('Data service heartbeat');
}, 60000);
