/**
 * Job Scheduler Service
 * Manages scheduled jobs and background processing with monitoring
 */

import { Queue, Worker, Job, QueueScheduler } from 'bullmq';
import { logger } from '@insurance-lead-gen/core';
import type {
  JobSchedule,
  JobMetrics,
  JobRetryPolicy,
  DeadLetterQueue,
} from '@insurance-lead-gen/types';

export class JobSchedulerService {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private schedulers: Map<string, QueueScheduler> = new Map();
  private redisConfig: any;

  constructor() {
    this.redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    };
  }

  async createQueue(
    name: string,
    options: {
      defaultJobOptions?: any;
      limiter?: any;
    } = {}
  ): Promise<Queue> {
    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }

    const queue = new Queue(name, {
      connection: this.redisConfig,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        ...options.defaultJobOptions,
      },
    });

    this.queues.set(name, queue);

    const scheduler = new QueueScheduler(name, {
      connection: this.redisConfig,
    });
    this.schedulers.set(name, scheduler);

    logger.info('Queue created', { name });
    return queue;
  }

  async createWorker(
    queueName: string,
    processor: (job: Job) => Promise<any>,
    options: {
      concurrency?: number;
      limiter?: any;
    } = {}
  ): Promise<Worker> {
    if (this.workers.has(queueName)) {
      return this.workers.get(queueName)!;
    }

    const worker = new Worker(queueName, processor, {
      connection: this.redisConfig,
      concurrency: options.concurrency || 5,
      limiter: options.limiter,
    });

    worker.on('completed', (job) => {
      logger.info('Job completed', {
        queue: queueName,
        jobId: job.id,
        duration: Date.now() - job.timestamp,
      });
    });

    worker.on('failed', (job, err) => {
      logger.error('Job failed', {
        queue: queueName,
        jobId: job?.id,
        error: err.message,
        attempts: job?.attemptsMade,
      });
    });

    worker.on('error', (err) => {
      logger.error('Worker error', { queue: queueName, error: err.message });
    });

    this.workers.set(queueName, worker);
    logger.info('Worker created', { queue: queueName });
    return worker;
  }

  async scheduleJob(schedule: JobSchedule): Promise<void> {
    const queue = await this.createQueue(schedule.jobType);

    await queue.add(
      schedule.name,
      schedule.data || {},
      {
        repeat: {
          pattern: schedule.pattern,
          tz: schedule.timezone || 'UTC',
        },
      }
    );

    logger.info('Job scheduled', {
      name: schedule.name,
      pattern: schedule.pattern,
      jobType: schedule.jobType,
    });
  }

  async addJob(
    queueName: string,
    jobName: string,
    data: any,
    options?: {
      delay?: number;
      priority?: number;
      attempts?: number;
      backoff?: any;
    }
  ): Promise<Job> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return queue.add(jobName, data, options);
  }

  async getJobMetrics(queueName: string): Promise<JobMetrics> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused(),
    ]);

    const jobs = await queue.getJobs(['completed', 'failed'], 0, 100);
    const processingTimes = jobs
      .filter((job) => job.finishedOn && job.processedOn)
      .map((job) => job.finishedOn! - job.processedOn!);

    const waitTimes = jobs
      .filter((job) => job.processedOn && job.timestamp)
      .map((job) => job.processedOn! - job.timestamp);

    const avgProcessingTime =
      processingTimes.length > 0
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
        : 0;

    const avgWaitTime =
      waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0;

    const recentCompleted = await queue.getCompletedCount();
    const throughput = recentCompleted / 60;

    return {
      queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
      avgProcessingTime,
      avgWaitTime,
      throughput,
    };
  }

  async getAllMetrics(): Promise<JobMetrics[]> {
    const metrics: JobMetrics[] = [];

    for (const queueName of this.queues.keys()) {
      const queueMetrics = await this.getJobMetrics(queueName);
      metrics.push(queueMetrics);
    }

    return metrics;
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.pause();
    logger.info('Queue paused', { queueName });
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.resume();
    logger.info('Queue resumed', { queueName });
  }

  async drainQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.drain();
    logger.info('Queue drained', { queueName });
  }

  async retryFailedJobs(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const failedJobs = await queue.getFailed();
    for (const job of failedJobs) {
      await job.retry();
    }

    logger.info('Failed jobs retried', { queueName, count: failedJobs.length });
  }

  async getDeadLetterJobs(queueName: string): Promise<Job[]> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const failed = await queue.getFailed();
    return failed.filter((job) => job.attemptsMade >= (job.opts.attempts || 3));
  }

  async setupDeadLetterQueue(config: DeadLetterQueue): Promise<void> {
    const dlq = await this.createQueue(config.name, {
      defaultJobOptions: {
        removeOnComplete: {
          age: config.ttl,
          count: config.maxSize,
        },
      },
    });

    logger.info('Dead letter queue configured', { name: config.name });
  }

  async moveToDeadLetter(queueName: string, jobId: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const dlqName = `${queueName}-dlq`;
    const dlq = await this.createQueue(dlqName);

    await dlq.add('dead-letter', {
      originalQueue: queueName,
      originalJobId: jobId,
      originalData: job.data,
      failureReason: job.failedReason,
      attempts: job.attemptsMade,
    });

    await job.remove();
    logger.info('Job moved to dead letter queue', { queueName, jobId });
  }

  async close(): Promise<void> {
    for (const worker of this.workers.values()) {
      await worker.close();
    }

    for (const scheduler of this.schedulers.values()) {
      await scheduler.close();
    }

    for (const queue of this.queues.values()) {
      await queue.close();
    }

    this.workers.clear();
    this.schedulers.clear();
    this.queues.clear();

    logger.info('Job scheduler service closed');
  }
}
