/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
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
import { AgentRepository } from './repositories/agent.repository.js';
import { AssignmentRepository } from './repositories/assignment.repository.js';
import { AnalyticsService } from './analytics.js';
import { createAnalyticsRoutes } from './routes/analytics.routes.js';
import customersRoutes from './routes/customers.routes.js';
import { PartnerService } from './services/partner.service.js';
import { ReferralService } from './services/referral.service.js';
import { RewardService } from './services/reward.service.js';
import partnerRoutes from './routes/partners.routes.js';
import referralRoutes from './routes/referrals.routes.js';
import rewardRoutes from './routes/rewards.routes.js';
import { default as biRoutes } from './routes/bi.routes.js';
import { AdvancedAnalyticsService } from './services/advanced-analytics.js';
import { createRetentionRoutes } from './routes/retention.routes.js';
import { createCampaignsRoutes } from './routes/campaigns.routes.js';
import { createVIPRoutes } from './routes/vip.routes.js';
import { createCommunityRoutes } from './routes/community.routes.js';
import { createCommunityNetworkRoutes } from './routes/community-network.routes.js';
import { ClaimRepository } from './services/claim-repository.js';
import { createClaimsRoutes } from './routes/claims.routes.js';

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
  const agentRepository = new AgentRepository(prisma);
  const assignmentRepository = new AssignmentRepository(prisma);
  const analyticsService = new AnalyticsService(prisma);
  const claimRepository = new ClaimRepository(prisma);

  // Initialize referral services
  const partnerService = new PartnerService();
  const referralService = new ReferralService();
  const rewardService = new RewardService();
  const advancedAnalyticsService = new AdvancedAnalyticsService();

  // Setup analytics routes
  app.use('/api/v1/analytics', createAnalyticsRoutes(analyticsService));

  // Setup referral program routes
  app.use('/api/v1/partners', partnerRoutes);
  app.use('/api/v1/referrals', referralRoutes);
  app.use('/api/v1/rewards', rewardRoutes);

  // Setup customer portal routes
  app.use('/api/customers', customersRoutes);

  // Setup BI routes
  app.use('/api/v1/bi', biRoutes);

  // Setup retention routes
  app.use('/api/v1/retention', createRetentionRoutes());
  app.use('/api/v1/retention', createCampaignsRoutes());

  // Setup VIP and community routes
  app.use('/api/v1/vip', createVIPRoutes());
  app.use('/api/v1/community', createCommunityRoutes());
  app.use('/api/v1/community-network', createCommunityNetworkRoutes());

  // Setup claims routes
  app.use('/api/v1/claims', createClaimsRoutes(claimRepository));

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

  const agentsMatchSub = eventBus.subscribe(EVENT_SUBJECTS.AgentsMatch);
  (async () => {
    for await (const msg of agentsMatchSub) {
      try {
        const filters = eventBus.decode<any>(msg.data);
        const agents = await agentRepository.findMany({
          isActive: true,
          state: filters.state,
          specialization: filters.insuranceType,
        }, 0, filters.limit || 50);

        if (msg.reply) {
          eventBus.publish(msg.reply, { agents });
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

  const leadAssignSub = eventBus.subscribe(EVENT_SUBJECTS.LeadAssign);
  (async () => {
    for await (const msg of leadAssignSub) {
      try {
        const data = eventBus.decode<any>(msg.data);
        const assignment = await assignmentRepository.create({
          leadId: data.leadId,
          agentId: data.agentId,
          status: 'PENDING',
        });

        // Also update lead status to ROUTED
        await leadRepository.updateLeadStatus(data.leadId, 'ROUTED');

        if (msg.reply) {
          eventBus.publish(msg.reply, { assignmentId: assignment.id, success: true });
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

// Re-export for package consumers
export { prisma, disconnectPrisma } from './database/prisma.client.js';
