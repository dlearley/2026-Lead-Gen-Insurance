import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createAdvancedConnectionPool } from '../connection-pool-advanced.js';

describe('AdvancedConnectionPool', () => {
  let pool: any;

  beforeEach(() => {
    pool = createAdvancedConnectionPool({
      name: 'test-pool',
      serviceType: 'api',
      databaseUrl: 'postgresql://test:test@localhost:5432/test',
      maxConnections: 5,
      minConnections: 2,
      connectionTimeoutMillis: 1000,
      idleTimeoutMillis: 60000,
      healthCheckInterval: 30000,
      enableCircuitBreaker: true,
      enableRetry: true,
      slowQueryThreshold: 100,
    });
  });

  afterEach(async () => {
    if (pool) {
      await pool.drain();
    }
  });

  describe('Initialization', () => {
    it('should create pool with correct configuration', () => {
      const metrics = pool.getMetrics();

      expect(pool.name).toBe('test-pool');
      expect(metrics.maxConnections).toBe(5);
      expect(metrics.minConnections).toBe(2);
      expect(pool.validationQuery).toBe('SELECT 1');
      expect(pool.slowQueryThreshold).toBe(100);
    });

    it('should have correct max connections per service type', () => {
      const apiPool = createAdvancedConnectionPool({
        name: 'api-pool',
        serviceType: 'api',
        databaseUrl: 'postgresql://test:test@localhost:5432/test',
      });

      const dataPool = createAdvancedConnectionPool({
        name: 'data-pool',
        serviceType: 'data-service',
        databaseUrl: 'postgresql://test:test@localhost:5432/test',
      });

      const apiMetrics = apiPool.getMetrics();
      const dataMetrics = dataPool.getMetrics();

      expect(apiMetrics.maxConnections).toBe(20);
      expect(dataMetrics.maxConnections).toBe(15);

      apiPool.drain();
      dataPool.drain();
    });
  });

  describe('Metrics', () => {
    it('should track connection metrics', () => {
      const metrics = pool.getMetrics();

      expect(metrics).toHaveProperty('totalConnections');
      expect(metrics).toHaveProperty('activeConnections');
      expect(metrics).toHaveProperty('idleConnections');
      expect(metrics).toHaveProperty('waitingRequests');
      expect(metrics).toHaveProperty('connectionAcquires');
      expect(metrics).toHaveProperty('connectionReleases');
      expect(metrics).toHaveProperty('totalQueries');
      expect(metrics).toHaveProperty('slowQueries');
    });

    it('should calculate wait time percentiles', () => {
      const metrics = pool.getMetrics();

      expect(metrics).toHaveProperty('averageWaitTime');
      expect(metrics).toHaveProperty('p95WaitTime');
      expect(metrics).toHaveProperty('p99WaitTime');
      expect(typeof metrics.averageWaitTime).toBe('number');
    });
  });

  describe('Alerts', () => {
    it('should generate alert for high pool utilization', () => {
      // Mock metrics
      pool.metrics = {
        ...pool.metrics,
        activeConnections: 19,
        maxConnections: 20,
      };

      const alerts = pool.getAlerts();

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(alert => alert.includes('near exhaustion'))).toBe(true);
    });

    it('should generate alert for high wait time', () => {
      pool.metrics = {
        ...pool.metrics,
        p95WaitTime: 1500,
      };

      const alerts = pool.getAlerts();

      expect(alerts.some(alert => alert.includes('High connection wait time'))).toBe(true);
    });

    it('should generate alert for high error rate', () => {
      pool.metrics = {
        ...pool.metrics,
        connectionErrors: 15,
      };

      const alerts = pool.getAlerts();

      expect(alerts.some(alert => alert.includes('High connection error rate'))).toBe(true);
    });

    it('should generate alert for high slow query count', () => {
      pool.metrics = {
        ...pool.metrics,
        slowQueries: 15,
      };

      const alerts = pool.getAlerts();

      expect(alerts.some(alert => alert.includes('High slow query count'))).toBe(true);
    });
  });

  describe('Circuit Breaker', () => {
    it('should be disabled when not configured', () => {
      const poolWithoutCB = createAdvancedConnectionPool({
        name: 'no-cb-pool',
        serviceType: 'api',
        databaseUrl: 'postgresql://test:test@localhost:5432/test',
        enableCircuitBreaker: false,
      });

      expect(poolWithoutCB.circuitBreaker).toBeUndefined();

      poolWithoutCB.drain();
    });

    it('should be enabled when configured', () => {
      const poolWithCB = createAdvancedConnectionPool({
        name: 'with-cb-pool',
        serviceType: 'api',
        databaseUrl: 'postgresql://test:test@localhost:5432/test',
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 3,
        circuitBreakerTimeout: 30000,
      });

      expect(poolWithCB.circuitBreaker).toBeDefined();
      expect(poolWithCB.circuitBreaker.getState()).toBeDefined();

      poolWithCB.drain();
    });
  });

  describe('Retry Strategy', () => {
    it('should be disabled when not configured', () => {
      const poolWithoutRetry = createAdvancedConnectionPool({
        name: 'no-retry-pool',
        serviceType: 'api',
        databaseUrl: 'postgresql://test:test@localhost:5432/test',
        enableRetry: false,
      });

      expect(poolWithoutRetry.retryStrategy).toBeUndefined();

      poolWithoutRetry.drain();
    });

    it('should be enabled when configured', () => {
      const poolWithRetry = createAdvancedConnectionPool({
        name: 'with-retry-pool',
        serviceType: 'api',
        databaseUrl: 'postgresql://test:test@localhost:5432/test',
        enableRetry: true,
        maxRetries: 5,
        retryDelay: 200,
      });

      expect(poolWithRetry.retryStrategy).toBeDefined();

      poolWithRetry.drain();
    });
  });

  describe('Replica Support', () => {
    it('should support multiple replicas', () => {
      const poolWithReplicas = createAdvancedConnectionPool({
        name: 'replica-pool',
        serviceType: 'api',
        databaseUrl: 'postgresql://test:test@localhost:5432/test',
        replicaUrls: [
          'postgresql://test:test@replica1:5432/test',
          'postgresql://test:test@replica2:5432/test',
        ],
      });

      expect(poolWithReplicas.replicaPools.length).toBe(2);

      poolWithReplicas.drain();
    });
  });

  describe('Health Check', () => {
    it('should perform health check', async () => {
      const isHealthy = await pool.healthCheck();

      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('Reset', () => {
    it('should reset metrics', () => {
      pool.metrics.totalQueries = 100;
      pool.metrics.slowQueries = 10;

      pool.resetMetrics();

      expect(pool.metrics.totalQueries).toBe(0);
      expect(pool.metrics.slowQueries).toBe(0);
    });
  });

  describe('Drain', () => {
    it('should drain pool', async () => {
      await pool.drain();

      expect(pool.isDraining).toBe(true);
    });
  });
});
