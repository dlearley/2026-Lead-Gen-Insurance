import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from '@insurance-lead-gen/core';
import { getConfig } from '@insurance-lead-gen/config';

import { NatsEventBus } from './nats/nats-event-bus.js';
import { RankingService } from './services/ranking.service.js';
import { RoutingService } from './services/routing.service.js';
import { LeadRoutingWorkflow } from './services/lead-routing-workflow.js';
import { UnderwritingService } from './underwriting/underwriting.service.js';
import { UnderwritingWorkflow } from './services/underwriting-workflow.js';

const config = getConfig();
const PORT = config.ports.orchestrator;

const start = async (): Promise<void> => {
  logger.info('Orchestrator service starting', { port: PORT });

  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'orchestrator',
      version: '1.0.0',
      uptime: process.uptime(),
    });
  });

  app.get('/ready', (req, res) => {
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      service: 'orchestrator',
    });
  });

  const server = app.listen(PORT, () => {
    logger.info(`Orchestrator service API listening on port ${PORT}`);
  });

  const eventBus = await NatsEventBus.connect(config.nats.url);

  const rankingService = new RankingService();
  const routingService = new RoutingService();
  const routingWorkflow = new LeadRoutingWorkflow(eventBus, rankingService, routingService);

  const underwritingService = new UnderwritingService({
    apiKey: config.ai.openaiApiKey,
    model: config.ai.openaiModel,
  });
  const underwritingWorkflow = new UnderwritingWorkflow(eventBus, underwritingService);

  routingWorkflow.start().catch((error) => {
    logger.error('Lead routing workflow failed to start', { error });
  });

  underwritingWorkflow.start().catch((error) => {
    logger.error('Underwriting workflow failed to start', { error });
  });

  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down orchestrator service');

    await new Promise<void>((resolve) => server.close(() => resolve()));
    await eventBus.close();
  };

  process.on('SIGTERM', () => {
    shutdown()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  });

  logger.info('Orchestrator service running');
};

start().catch((error) => {
  logger.error('Orchestrator failed to start', { error });
  process.exit(1);
});

setInterval(() => {
  logger.debug('Orchestrator service heartbeat');
}, 60000);
