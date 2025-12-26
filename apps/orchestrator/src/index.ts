import { logger } from '@insurance-lead-gen/core';
import { getConfig } from '@insurance-lead-gen/config';
import { EVENT_SUBJECTS, type LeadProcessedEvent } from '@insurance-lead-gen/types';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { NatsEventBus } from './nats/nats-event-bus.js';
import { RoutingService } from './routing-service.js';
import { QueueManager } from './queues.ts';
import { LangChainEngine } from './langchain.ts';
import { OpenAIClient } from './openai.ts';

const config = getConfig();
const PORT = config.ports.orchestrator;

const start = async (): Promise<void> => {
  logger.info('Orchestrator service starting', { port: PORT });

  // 1. Initialize NATS Event Bus
  const eventBus = await NatsEventBus.connect(config.nats.url);

  // 2. Initialize Components
  const routingService = new RoutingService(eventBus);
  const openaiClient = new OpenAIClient();
  const langchainEngine = new LangChainEngine(openaiClient);
  const queueManager = new QueueManager();
  await queueManager.connect();

  // 3. Initialize HTTP Server
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

  // 4. Start Workers
  await queueManager.startProcessingQueue(langchainEngine, eventBus.connection);

  // 5. Subscribe to Events
  
  // Listen for new leads to process
  const leadReceivedSub = eventBus.subscribe(EVENT_SUBJECTS.LeadReceived);
  (async () => {
    for await (const msg of leadReceivedSub) {
      try {
        const event = eventBus.decode<any>(msg.data);
        const leadData = event.data?.lead || event.lead || event;
        
        logger.info('Received lead.received event, adding to processing queue', { 
          leadId: leadData.id 
        });
        
        await queueManager.addLeadProcessingJob(leadData);
      } catch (error) {
        logger.error('Failed to handle lead.received event', { error });
      }
    }
  })().catch((error) => {
    logger.error('lead.received subscription terminated', { error });
  });

  // Listen for qualified leads to route
  const leadQualifiedSub = eventBus.subscribe('lead.qualified');
  const leadProcessedSub = eventBus.subscribe(EVENT_SUBJECTS.LeadProcessed);
  
  const handleQualifiedLead = async (leadId: string) => {
    try {
      logger.info('Lead qualified, starting routing', { leadId });
      await routingService.routeLead(leadId);
    } catch (error) {
      logger.error('Failed to route qualified lead', { leadId, error });
    }
  };

  (async () => {
    for await (const msg of leadQualifiedSub) {
      const event = eventBus.decode<any>(msg.data);
      const leadId = event.id || event.leadId;
      if (leadId) await handleQualifiedLead(leadId);
    }
  })().catch((error) => {
    logger.error('lead.qualified subscription terminated', { error });
  });

  (async () => {
    for await (const msg of leadProcessedSub) {
      const event = eventBus.decode<any>(msg.data);
      const leadId = event.data?.leadId || event.leadId;
      if (leadId) await handleQualifiedLead(leadId);
    }
  })().catch((error) => {
    logger.error('lead.processed subscription terminated', { error });
  });

  // 6. Graceful Shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    void Promise.all([
      eventBus.close(),
      queueManager.close()
    ]).finally(() => process.exit(0));
  });

  logger.info(`Orchestrator service running and listening for events`);
};

start().catch((error) => {
  logger.error('Orchestrator failed to start', { error });
  process.exit(1);
});

// Keep the process alive
setInterval(() => {
  logger.debug('Orchestrator service heartbeat');
}, 60000);
