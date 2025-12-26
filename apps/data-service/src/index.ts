import { logger } from '@insurance-lead-gen/core';
import { getConfig } from '@insurance-lead-gen/config';
import { EVENT_SUBJECTS, type LeadReceivedEvent } from '@insurance-lead-gen/types';
import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { NatsEventBus } from './nats/nats-event-bus.js';
import { prisma } from './prisma/client.js';
import { createRedisConnection } from './redis/redis-client.js';
import {
  createLeadIngestionQueue,
  startLeadIngestionWorker,
} from './queues/lead-ingestion.queue.js';
import { LeadRepository } from './repositories/lead.repository.js';
import { AgentRepository } from './repositories/agent.repository.js';
import { Neo4jDriver } from './neo4j.ts';
import analyticsRouter from './routes/analytics.routes.js';

const config = getConfig();
const PORT = config.ports.dataService;

const start = async (): Promise<void> => {
  logger.info('Data service starting', { port: PORT });

  const eventBus = await NatsEventBus.connect(config.nats.url);
  const redis = createRedisConnection();

  const neo4j = new Neo4jDriver();
  await neo4j.connect();
  await neo4j.initializeSchema();

  const leadRepository = new LeadRepository(prisma);
  const agentRepository = new AgentRepository();
  const leadIngestionQueue = createLeadIngestionQueue(redis);
  const leadIngestionWorker = startLeadIngestionWorker({
    connection: redis,
    leadRepository,
    eventBus,
  });

  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'insurance-lead-gen-data-service',
      version: '1.0.0',
    });
  });

  app.use('/api/v1/analytics', analyticsRouter);

  const httpServer = app.listen(PORT, () => {
    logger.info(`Data service HTTP server running on port ${PORT}`);
  });

  leadIngestionWorker.on('failed', (job, error) => {
    logger.error('Lead ingestion job failed', { jobId: job?.id, error });
  });

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

  // Agent.get handler
  const agentGetSub = eventBus.subscribe(EVENT_SUBJECTS.AgentGet);
  (async () => {
    for await (const msg of agentGetSub) {
      try {
        const { agentId } = eventBus.decode<{ agentId: string }>(msg.data);
        const agent = await agentRepository.findById(agentId);
        if (msg.reply) {
          eventBus.publish(msg.reply, { agent });
        }
      } catch (error) {
        logger.error('Failed to handle agent.get request', { error });
        if (msg.reply) {
          eventBus.publish(msg.reply, { agent: null, error: 'internal_error' });
        }
      }
    }
  })().catch((error) => {
    logger.error('Agent get subscription terminated', { error });
  });

  // Agents.match handler
  const agentsMatchSub = eventBus.subscribe(EVENT_SUBJECTS.AgentsMatch);
  (async () => {
    for await (const msg of agentsMatchSub) {
      try {
        const { leadId, insuranceType, location, limit } = eventBus.decode<{ 
          leadId: string, 
          insuranceType: string, 
          location: string,
          limit?: number 
        }>(msg.data);
        
        const agentIds = await neo4j.findBestAgentsForLead(leadId, insuranceType, location);
        
        // Fetch full agent data for the matched IDs
        const agents = await Promise.all(
          agentIds.slice(0, limit || 5).map(id => agentRepository.findById(id))
        );
        
        const filteredAgents = agents.filter(a => a !== null);

        if (msg.reply) {
          eventBus.publish(msg.reply, { agents: filteredAgents });
        }
      } catch (error) {
        logger.error('Failed to handle agents.match request', { error });
        if (msg.reply) {
          eventBus.publish(msg.reply, { agents: [], error: 'internal_error' });
        }
      }
    }
  })().catch((error) => {
    logger.error('Agents match subscription terminated', { error });
  });

  // Lead.assign handler
  const leadAssignSub = eventBus.subscribe(EVENT_SUBJECTS.LeadAssign);
  (async () => {
    for await (const msg of leadAssignSub) {
      try {
        const { leadId, agentId } = eventBus.decode<{ leadId: string, agentId: string }>(msg.data);
        
        // Update SQL database
        await leadRepository.updateLeadStatus(leadId, 'routed');
        // Increment agent capacity (using the repo method)
        await agentRepository.incrementCapacity(agentId);
        
        // Update Graph database
        await neo4j.createAssignmentRelationship(leadId, agentId);
        
        if (msg.reply) {
          eventBus.publish(msg.reply, { success: true });
        }
      } catch (error) {
        logger.error('Failed to handle lead.assign request', { error });
        if (msg.reply) {
          eventBus.publish(msg.reply, { success: false, error: 'internal_error' });
        }
      }
    }
  })().catch((error) => {
    logger.error('Lead assign subscription terminated', { error });
  });

  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down data service');

    await leadIngestionWorker.close();
    await leadIngestionQueue.close();

    await eventBus.close();
    await neo4j.close();
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
