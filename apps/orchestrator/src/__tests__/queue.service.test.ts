import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { QueueService } from '../queues';
import { MockNatsConnection, MockRedisClient, mockLogger } from './setup';

describe('QueueService', () => {
  let queueService: QueueService;
  let mockNats: MockNatsConnection;
  let mockRedis: MockRedisClient;

  beforeEach(() => {
    mockNats = new MockNatsConnection();
    mockRedis = new MockRedisClient();
    queueService = new QueueService(mockNats as any, mockRedis as any);
  });

  describe('constructor', () => {
    it('should initialize with connections', () => {
      expect(queueService).toBeDefined();
    });
  });

  describe('enqueue', () => {
    it('should add job to queue', async () => {
      const jobData = { type: 'lead_processing', payload: { leadId: 'lead-123' } };
      
      const jobId = await queueService.enqueue('lead-processing', jobData);

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
    });

    it('should store job in Redis', async () => {
      const jobData = { type: 'enrichment', payload: { leadId: 'lead-456' } };
      
      await queueService.enqueue('lead-enrichment', jobData);

      expect(mockRedis.set).toHaveBeenCalled();
    });
  });

  describe('dequeue', () => {
    it('should return next job from queue', async () => {
      const jobData = { type: 'processing', payload: { leadId: 'lead-123' } };
      await queueService.enqueue('test-queue', jobData);

      const job = await queueService.dequeue('test-queue');

      expect(job).toBeDefined();
      expect(job?.data).toEqual(jobData);
    });

    it('should return null for empty queue', async () => {
      const job = await queueService.dequeue('empty-queue');
      expect(job).toBeNull();
    });
  });

  describe('publish', () => {
    it('should publish message to NATS', async () => {
      const subject = 'test.subject';
      const message = { event: 'test_event', data: { id: '123' } };

      await queueService.publish(subject, message);

      expect(mockNats.publish).toHaveBeenCalledWith(subject, JSON.stringify(message));
    });
  });

  describe('subscribe', () => {
    it('should subscribe to subject', () => {
      const callback = jest.fn();
      const sub = queueService.subscribe('test.subject', callback);

      expect(mockNats.subscribe).toHaveBeenCalledWith('test.subject', expect.any(Function));
      expect(sub).toBeDefined();
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      // Add some jobs first
      await queueService.enqueue('stats-queue', { type: 'test', data: {} });
      await queueService.enqueue('stats-queue', { type: 'test', data: {} });

      const stats = await queueService.getQueueStats('stats-queue');

      expect(stats).toHaveProperty('waiting');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('completed');
    });
  });

  describe('retryJob', () => {
    it('should re-queue failed job', async () => {
      const jobData = { type: 'processing', payload: { leadId: 'lead-123' } };
      const jobId = await queueService.enqueue('retry-queue', jobData);

      await queueService.retryJob(jobId, 3);

      // Should have been re-queued with delay
      expect(mockRedis.set).toHaveBeenCalled();
    });
  });

  describe('ack', () => {
    it('should acknowledge job completion', async () => {
      await queueService.ack('job-123');
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });
});
