import { Queue, Worker } from 'bullmq';

import { logger } from '@insurance-lead-gen/core';
import {
  EVENT_SUBJECTS,
  type LeadCreatePayload,
  type LeadReceivedEvent,
} from '@insurance-lead-gen/types';

import type Redis from 'ioredis';

import type { LeadRepository } from '../repositories/lead.repository.js';
import type { NatsEventBus } from '../nats/nats-event-bus.js';

export interface LeadIngestionJob {
  leadId: string;
  lead: LeadCreatePayload;
  rawEvent: LeadReceivedEvent;
}

export const LEAD_INGESTION_QUEUE_NAME = 'lead-ingestion';

export const createLeadIngestionQueue = (connection: Redis): Queue<LeadIngestionJob> =>
  new Queue<LeadIngestionJob>(LEAD_INGESTION_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 500,
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

export const startLeadIngestionWorker = (params: {
  connection: Redis;
  leadRepository: LeadRepository;
  eventBus: NatsEventBus;
}): Worker<LeadIngestionJob> => {
  const { connection, leadRepository, eventBus } = params;

  return new Worker<LeadIngestionJob>(
    LEAD_INGESTION_QUEUE_NAME,
    async (job) => {
      const { leadId, lead } = job.data;

      logger.info('Ingesting lead', { leadId });

      await leadRepository.createLead(leadId, lead);

      eventBus.publish(EVENT_SUBJECTS.LeadProcessed, {
        id: `evt_${Date.now()}`,
        type: EVENT_SUBJECTS.LeadProcessed,
        source: 'data-service',
        data: { leadId },
        timestamp: new Date().toISOString(),
      });
    },
    { connection }
  );
};
