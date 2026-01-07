import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from '@insurance-lead-gen/core';
import { getConfig } from '@insurance-lead-gen/config';
import { EVENT_SUBJECTS, type LeadProcessedEvent } from '@insurance-lead-gen/types';

import { NatsEventBus } from './nats/nats-event-bus.js';
import { RankingService } from './services/ranking.service.js';
import { RoutingService } from './services/routing.service.js';
import { LeadRoutingWorkflow } from './services/lead-routing-workflow.js';
import prisma from './db/prisma.js';
import {
  CampaignOrchestrationService,
  MultiChannelMessagingService,
  LeadStateService,
} from '@insurance-lead-gen/core';

const config = getConfig();
const PORT = config.ports.orchestrator;

const start = async (): Promise<void> => {
  logger.info('Orchestrator service starting', { port: PORT });

  // Initialize Express app for health checks
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'orchestrator',
      version: '1.0.0',
      uptime: process.uptime(),
    });
  });

  // Readiness check endpoint
  app.get('/ready', (req, res) => {
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      service: 'orchestrator',
    });
  });

  // Start Express server
  const server = app.listen(PORT, () => {
    logger.info(`Orchestrator service API listening on port ${PORT}`);
  });

  // Initialize NATS event bus
  const eventBus = await NatsEventBus.connect(config.nats.url);

  // Initialize services
  const rankingService = new RankingService();
  const routingService = new RoutingService();
  const routingWorkflow = new LeadRoutingWorkflow(
    eventBus,
    rankingService,
    routingService
  );

  // Initialize Orchestration services
  const messagingService = new MultiChannelMessagingService(prisma);
  const leadStateService = new LeadStateService(prisma);
  const campaignOrchestrationService = new CampaignOrchestrationService(
    prisma,
    messagingService,
    leadStateService
  );

  // Start campaign processing loop
  const campaignInterval = setInterval(async () => {
    try {
      await campaignOrchestrationService.processCampaigns();
    } catch (error) {
      logger.error('Error processing campaigns', { error });
    }
  }, 60000); // Process every minute

  // Start workflow
  routingWorkflow.start().catch((error) => {
    logger.error('Lead routing workflow failed to start', { error });
  });

  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down orchestrator service');

    clearInterval(campaignInterval);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await eventBus.close();
  };

  process.on('SIGTERM', () => {
    shutdown()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  });

  logger.info(`Orchestrator service running`);
};

start().catch((error) => {
  logger.error('Orchestrator failed to start', { error });
  process.exit(1);
});

// Keep the process alive
setInterval(() => {
  logger.debug('Orchestrator service heartbeat');
}, 60000);
