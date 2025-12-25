import { Queue, Worker, QueueEvents } from 'bullmq';
import { logger } from '@insurance-lead-gen/core';
import { createClient } from 'redis';
import { LangChainEngine } from './langchain.js';
import { NatsConnection } from 'nats';
import { publishEvent } from './nats.js';

export class QueueManager {
  private redisClient: any;
  private leadProcessingQueue: Queue;
  private leadProcessingWorker: Worker;

  constructor() {
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
  }

  async connect() {
    try {
      await this.redisClient.connect();
      logger.info('Redis connection established for queues');

      // Initialize queues
      this.leadProcessingQueue = new Queue('leadProcessing', {
        connection: this.redisClient,
      });

      logger.info('Queue manager initialized');
    } catch (error) {
      logger.error('Failed to initialize queue manager', { error: error.message });
      throw error;
    }
  }

  async addLeadProcessingJob(leadData: any) {
    try {
      await this.leadProcessingQueue.add('processLead', leadData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      });
      
      logger.debug('Lead processing job added to queue', { leadId: leadData.id });
    } catch (error) {
      logger.error('Failed to add lead processing job', { 
        leadId: leadData.id,
        error: error.message
      });
      throw error;
    }
  }

  async startProcessingQueue(langchainEngine: LangChainEngine, natsConnection: NatsConnection) {
    try {
      this.leadProcessingWorker = new Worker('leadProcessing', async (job) => {
        const leadData = job.data;
        logger.info('Processing lead job', { 
          leadId: leadData.id,
          jobId: job.id
        });

        try {
          // Process lead with LangChain
          const processedLead = await langchainEngine.processLead(leadData);

          // Publish lead.qualified event
          await publishEvent(natsConnection, 'lead.qualified', {
            id: processedLead.id,
            status: 'qualified',
            insuranceType: processedLead.insuranceType,
            qualityScore: processedLead.qualityScore,
            enrichment: processedLead.enrichment,
            timestamp: new Date().toISOString(),
          });

          logger.info('Lead processing completed and event published', { 
            leadId: processedLead.id
          });

          return { success: true, leadId: processedLead.id };

        } catch (error) {
          logger.error('Failed to process lead in worker', { 
            leadId: leadData.id,
            error: error.message
          });
          throw error;
        }
      }, {
        connection: this.redisClient,
        concurrency: 5,
      });

      // Set up queue events
      const queueEvents = new QueueEvents('leadProcessing', {
        connection: this.redisClient,
      });

      queueEvents.on('completed', ({ jobId }) => {
        logger.debug('Lead processing job completed', { jobId });
      });

      queueEvents.on('failed', ({ jobId, failedReason }) => {
        logger.error('Lead processing job failed', { 
          jobId,
          error: failedReason
        });
      });

      logger.info('Lead processing queue started');

    } catch (error) {
      logger.error('Failed to start processing queue', { error: error.message });
      throw error;
    }
  }

  async close() {
    try {
      if (this.leadProcessingWorker) {
        await this.leadProcessingWorker.close();
      }
      await this.redisClient.quit();
      logger.info('Queue manager closed');
    } catch (error) {
      logger.error('Error closing queue manager', { error: error.message });
      throw error;
    }
  }
}