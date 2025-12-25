import { Queue, Worker, Job } from 'bullmq';
import { logger } from '@insurance-lead-gen/core';
import { publishLeadStatusChangedEvent } from './events.js';

// Queue names
export const QUEUES = {
  LEAD_PROCESSING: 'lead-processing',
  LEAD_QUALIFICATION: 'lead-qualification',
  LEAD_ROUTING: 'lead-routing',
  NOTIFICATIONS: 'notifications',
} as const;

// Job types
export enum JobType {
  QUALIFY_LEAD = 'qualify-lead',
  ROUTE_LEAD = 'route-lead',
  SEND_NOTIFICATION = 'send-notification',
  ENRICH_LEAD = 'enrich-lead',
}

// Queue instances (singleton pattern)
const queues = new Map<string, Queue>();

// Initialize queues
export async function initQueues(): Promise<void> {
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379');

  const queueOptions = {
    connection: {
      host: redisHost,
      port: redisPort,
    },
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  };

  // Create queues
  queues.set(QUEUES.LEAD_PROCESSING, new Queue(QUEUES.LEAD_PROCESSING, queueOptions));
  queues.set(QUEUES.LEAD_QUALIFICATION, new Queue(QUEUES.LEAD_QUALIFICATION, queueOptions));
  queues.set(QUEUES.LEAD_ROUTING, new Queue(QUEUES.LEAD_ROUTING, queueOptions));
  queues.set(QUEUES.NOTIFICATIONS, new Queue(QUEUES.NOTIFICATIONS, queueOptions));

  logger.info('BullMQ queues initialized');
}

// Close all queues
export async function closeQueues(): Promise<void> {
  for (const queue of queues.values()) {
    await queue.close();
  }
  queues.clear();
  logger.info('BullMQ queues closed');
}

// Get queue by name
export function getQueue(name: string): Queue | undefined {
  return queues.get(name);
}

// Add lead processing job
export async function addLeadProcessingJob(leadId: string, data: Record<string, unknown> = {}): Promise<Job> {
  const queue = queues.get(QUEUES.LEAD_PROCESSING);
  if (!queue) {
    throw new Error('Queues not initialized');
  }

  return queue.add(JobType.QUALIFY_LEAD, { leadId, ...data });
}

// Add lead qualification job
export async function addLeadQualificationJob(leadId: string, data: Record<string, unknown> = {}): Promise<Job> {
  const queue = queues.get(QUEUES.LEAD_QUALIFICATION);
  if (!queue) {
    throw new Error('Queues not initialized');
  }

  return queue.add(JobType.QUALIFY_LEAD, { leadId, ...data });
}

// Add lead routing job
export async function addLeadRoutingJob(leadId: string, qualityScore: number): Promise<Job> {
  const queue = queues.get(QUEUES.LEAD_ROUTING);
  if (!queue) {
    throw new Error('Queues not initialized');
  }

  return queue.add(JobType.ROUTE_LEAD, { leadId, qualityScore });
}

// Add notification job
export async function addNotificationJob(
  type: 'email' | 'sms',
  recipient: string,
  subject: string,
  body: string
): Promise<Job> {
  const queue = queues.get(QUEUES.NOTIFICATIONS);
  if (!queue) {
    throw new Error('Queues not initialized');
  }

  return queue.add(JobType.SEND_NOTIFICATION, { type, recipient, subject, body });
}

// Job processors
export const processors = {
  async qualifyLeadProcessor(job: Job): Promise<{ leadId: string; qualityScore: number }> {
    const { leadId } = job.data;
    logger.info('Processing lead qualification', { leadId, jobId: job.id });

    // Simulate AI qualification (would call orchestrator service)
    const qualityScore = Math.floor(Math.random() * 100);

    // Publish status change event
    await publishLeadStatusChangedEvent(leadId, 'received', 'qualified');

    return { leadId, qualityScore };
  },

  async routeLeadProcessor(job: Job): Promise<{ leadId: string; agentId: string }> {
    const { leadId, qualityScore } = job.data;
    logger.info('Processing lead routing', { leadId, qualityScore, jobId: job.id });

    // Simulate agent matching (would use Neo4j)
    const agentId = `agent_${Math.random().toString(36).substr(2, 9)}`;

    return { leadId, agentId };
  },

  async sendNotificationProcessor(job: Job): Promise<{ sent: boolean; type: string; recipient: string }> {
    const { type, recipient, subject, body } = job.data;
    logger.info('Sending notification', { type, recipient, subject, jobId: job.id });

    // Simulate notification sending
    return { sent: true, type, recipient };
  },
};

// Create workers for processing jobs
export function createWorkers(): void {
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379');

  const workerOptions = {
    connection: {
      host: redisHost,
      port: redisPort,
    },
    concurrency: 5,
  };

  // Lead qualification worker
  new Worker(
    QUEUES.LEAD_QUALIFICATION,
    async (job) => {
      try {
        return await processors.qualifyLeadProcessor(job);
      } catch (error) {
        logger.error('Lead qualification failed', { jobId: job.id, error });
        throw error;
      }
    },
    workerOptions
  );

  // Lead routing worker
  new Worker(
    QUEUES.LEAD_ROUTING,
    async (job) => {
      try {
        return await processors.routeLeadProcessor(job);
      } catch (error) {
        logger.error('Lead routing failed', { jobId: job.id, error });
        throw error;
      }
    },
    workerOptions
  );

  // Notification worker
  new Worker(
    QUEUES.NOTIFICATIONS,
    async (job) => {
      try {
        return await processors.sendNotificationProcessor(job);
      } catch (error) {
        logger.error('Notification failed', { jobId: job.id, error });
        throw error;
      }
    },
    workerOptions
  );

  logger.info('BullMQ workers created');
}
