import { logger } from '@insurance-lead-gen/core';
import { getConfig } from '@insurance-lead-gen/config';
import { EVENT_SUBJECTS, type LeadProcessedEvent } from '@insurance-lead-gen/types';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { NatsEventBus } from './nats/nats-event-bus.js';

const config = getConfig();
const PORT = config.ports.orchestrator;

const start = async (): Promise<void> => {
  logger.info('Orchestrator service starting', { port: PORT });

  const eventBus = await NatsEventBus.connect(config.nats.url);

  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'insurance-lead-gen-orchestrator',
      version: '1.0.0',
    });
  });

  app.get('/api/v1/routing/status', (req, res) => {
    res.json({
      status: 'operational',
      connected: true,
      subscribers: 1,
    });
  });

  const httpServer = app.listen(PORT, () => {
    logger.info(`Orchestrator HTTP server running on port ${PORT}`);
  });

  const sub = eventBus.subscribe(EVENT_SUBJECTS.LeadProcessed);
  (async () => {
    for await (const msg of sub) {
      const event = eventBus.decode<LeadProcessedEvent>(msg.data);
      logger.info('Received lead.processed', { leadId: event.data.leadId });
    }
  })().catch((error) => {
    logger.error('lead.processed subscription terminated', { error });
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    void eventBus.close().finally(() => process.exit(0));
  });

  logger.info(`Orchestrator service running on port ${PORT}`);
};

start().catch((error) => {
  logger.error('Orchestrator failed to start', { error });
  process.exit(1);
});

// Keep the process alive
setInterval(() => {
  logger.debug('Orchestrator service heartbeat');
}, 60000);
