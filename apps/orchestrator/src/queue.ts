import { Queue, Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '@insurance-lead-gen/core';

export class BullMQQueue {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private redisConnection: Redis;

  constructor() {
    this.redisConnection = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
    });
  }

  async connect(): Promise<void> {
    try {
      // Test Redis connection
      await this.redisConnection.ping();
      logger.info('BullMQ connected to Redis');
    } catch (error) {
      logger.error('Failed to connect to Redis for BullMQ', { error });
      throw error;
    }
  }

  async addJob(queueName: string, data: any, options: any = {}): Promise<void> {
    try {
      // Get or create queue
      let queue = this.queues.get(queueName);
      if (!queue) {
        queue = new Queue(queueName, {
          connection: this.redisConnection,
          defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail: false,
            attempts: 3,
          },
        });
        this.queues.set(queueName, queue);
      }

      // Add job to queue
      await queue.add('job', data, options);
      logger.debug(`Job added to queue ${queueName}`, { jobId: data.id });
    } catch (error) {
      logger.error(`Failed to add job to queue ${queueName}`, { error });
      throw error;
    }
  }

  async processJobs(queueName: string, processor: (job: Job) => Promise<void>): Promise<void> {
    try {
      // Get or create queue
      let queue = this.queues.get(queueName);
      if (!queue) {
        queue = new Queue(queueName, {
          connection: this.redisConnection,
        });
        this.queues.set(queueName, queue);
      }

      // Create worker if it doesn't exist
      if (!this.workers.has(queueName)) {
        const worker = new Worker(queueName, async (job) => {
          try {
            await processor(job);
            logger.debug(`Job processed successfully from queue ${queueName}`, { jobId: job.id });
          } catch (error) {
            logger.error(`Error processing job from queue ${queueName}`, { error, jobId: job.id });
            throw error;
          }
        }, {
          connection: this.redisConnection,
          concurrency: 5,
        });

        this.workers.set(queueName, worker);
        logger.info(`Worker started for queue ${queueName}`);
      }
    } catch (error) {
      logger.error(`Failed to start worker for queue ${queueName}`, { error });
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      // Close all workers
      for (const [queueName, worker] of this.workers) {
        await worker.close();
        logger.info(`Worker closed for queue ${queueName}`);
      }
      this.workers.clear();

      // Close Redis connection
      await this.redisConnection.quit();
      logger.info('BullMQ Redis connection closed');
    } catch (error) {
      logger.error('Error closing BullMQ connections', { error });
      throw error;
    }
  }
}