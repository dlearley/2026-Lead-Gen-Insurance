import { Pool, PoolConfig, PoolClient } from 'pg';
import { logger } from '../logger.js';
import { CircuitBreaker } from '../resilience/circuit-breaker.js';
import { RetryStrategy } from '../resilience/retry-strategy.js';

export interface ConnectionPoolMetrics {
  name: string;
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  maxConnections: number;
  minConnections: number;
  errors: number;
  connectionErrors: number;
  queryErrors: number;
  averageWaitTime: number;
  p95WaitTime: number;
  p99WaitTime: number;
  totalQueries: number;
  slowQueries: number;
  connectionAcquires: number;
  connectionReleases: number;
}

export interface ConnectionPoolConfig extends PoolConfig {
  name: string;
  serviceType: 'api' | 'data-service' | 'background-jobs' | 'analytics' | 'batch-operations';
  maxConnections?: number;
  minConnections?: number;
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  maxLifetimeMillis?: number;
  healthCheckInterval?: number;
  validationQuery?: string;
  enableSsl?: boolean;
  sslCert?: string;
  sslKey?: string;
  sslCa?: string;
  enableCircuitBreaker?: boolean;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  enableRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  enableMetrics?: boolean;
  slowQueryThreshold?: number;
  replicaUrls?: string[];
}

interface WaitTimeSample {
  waitTime: number;
  timestamp: number;
}

export class AdvancedConnectionPool {
  private pool: Pool;
  private replicaPools: Pool[] = [];
  private name: string;
  private serviceType: string;
  private healthCheckInterval?: NodeJS.Timeout;
  private metrics: ConnectionPoolMetrics;
  private waitTimeSamples: WaitTimeSample[] = [];
  private circuitBreaker?: CircuitBreaker;
  private retryStrategy?: RetryStrategy;
  private isDraining = false;
  private validationQuery: string;
  private slowQueryThreshold: number;
  private currentReplicaIndex = 0;

  constructor(config: ConnectionPoolConfig) {
    this.name = config.name;
    this.serviceType = config.serviceType;
    this.validationQuery = config.validationQuery || 'SELECT 1';
    this.slowQueryThreshold = config.slowQueryThreshold || 500;

    const poolConfig = this.buildPoolConfig(config);
    this.pool = new Pool(poolConfig);

    this.metrics = this.initializeMetrics(config);

    this.setupEventListeners();
    this.setupCircuitBreaker(config);
    this.setupRetryStrategy(config);

    if (config.healthCheckInterval) {
      this.startHealthCheck(config.healthCheckInterval);
    }

    if (config.replicaUrls && config.replicaUrls.length > 0) {
      this.setupReplicas(config);
    }

    logger.info(`Advanced connection pool '${this.name}' initialized`, {
      serviceType: this.serviceType,
      maxConnections: poolConfig.max,
      minConnections: poolConfig.min,
      ssl: config.enableSsl,
      replicas: config.replicaUrls?.length || 0,
      circuitBreaker: config.enableCircuitBreaker,
    });
  }

  private buildPoolConfig(config: ConnectionPoolConfig): PoolConfig {
    const maxConnections = this.getMaxConnectionsForService(config.serviceType);

    const baseConfig: PoolConfig = {
      ...config,
      max: config.maxConnections || maxConnections,
      min: config.minConnections || 5,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
      idleTimeoutMillis: config.idleTimeoutMillis || 1800000,
      statement_timeout: config.statement_timeout || 30000,
      query_timeout: config.query_timeout || 30000,
    };

    if (config.enableSsl) {
      baseConfig.ssl = {
        rejectUnauthorized: true,
        cert: config.sslCert,
        key: config.sslKey,
        ca: config.sslCa,
      };
    }

    return baseConfig;
  }

  private getMaxConnectionsForService(serviceType: string): number {
    const limits = {
      'api': 20,
      'data-service': 15,
      'background-jobs': 10,
      'analytics': 5,
      'batch-operations': 8,
    };
    return limits[serviceType as keyof typeof limits] || 20;
  }

  private initializeMetrics(config: ConnectionPoolConfig): ConnectionPoolMetrics {
    const maxConnections = this.getMaxConnectionsForService(config.serviceType);
    return {
      name: this.name,
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingRequests: 0,
      maxConnections: config.maxConnections || maxConnections,
      minConnections: config.minConnections || 5,
      errors: 0,
      connectionErrors: 0,
      queryErrors: 0,
      averageWaitTime: 0,
      p95WaitTime: 0,
      p99WaitTime: 0,
      totalQueries: 0,
      slowQueries: 0,
      connectionAcquires: 0,
      connectionReleases: 0,
    };
  }

  private setupEventListeners(): void {
    this.pool.on('connect', () => {
      this.metrics.totalConnections++;
    });

    this.pool.on('acquire', () => {
      this.metrics.activeConnections++;
      this.metrics.connectionAcquires++;
    });

    this.pool.on('release', () => {
      this.metrics.activeConnections--;
      this.metrics.connectionReleases++;
    });

    this.pool.on('remove', () => {
      this.metrics.totalConnections--;
    });

    this.pool.on('error', (err) => {
      this.metrics.errors++;
      this.metrics.connectionErrors++;
      logger.error(`Connection pool '${this.name}' error`, { error: err });
    });
  }

  private setupCircuitBreaker(config: ConnectionPoolConfig): void {
    if (config.enableCircuitBreaker) {
      this.circuitBreaker = new CircuitBreaker({
        threshold: config.circuitBreakerThreshold || 5,
        timeout: config.circuitBreakerTimeout || 60000,
        name: `${this.name}-circuit-breaker`,
      });
    }
  }

  private setupRetryStrategy(config: ConnectionPoolConfig): void {
    if (config.enableRetry) {
      this.retryStrategy = new RetryStrategy({
        maxAttempts: config.maxRetries || 3,
        initialDelay: config.retryDelay || 100,
        maxDelay: 5000,
        backoffMultiplier: 2,
      });
    }
  }

  private setupReplicas(config: ConnectionPoolConfig): void {
    if (!config.replicaUrls) return;

    config.replicaUrls.forEach((url, index) => {
      const replicaConfig: PoolConfig = {
        ...config,
        connectionString: url,
        max: Math.floor((config.maxConnections || 20) / (config.replicaUrls!.length + 1)),
      };
      this.replicaPools.push(new Pool(replicaConfig));
      logger.info(`Replica pool ${index} initialized for '${this.name}'`);
    });
  }

  private startHealthCheck(interval: number): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const isHealthy = await this.healthCheck();
        if (!isHealthy) {
          logger.warn(`Health check failed for pool '${this.name}'`);
          this.metrics.connectionErrors++;
        }
      } catch (error) {
        logger.error(`Health check error for pool '${this.name}'`, { error });
      }
    }, interval);
  }

  async query<T = any>(text: string, params?: any[], options?: { useReplica?: boolean }): Promise<T> {
    if (this.isDraining) {
      throw new Error('Pool is draining, no new queries allowed');
    }

    const startTime = Date.now();
    let client: PoolClient;

    try {
      client = await this.acquireClient();
      
      const waitTime = Date.now() - startTime;
      this.recordWaitTime(waitTime);

      if (options?.useReplica && this.replicaPools.length > 0) {
        return await this.queryReplica<T>(text, params);
      }

      const result = await client.query(text, params);
      const duration = Date.now() - startTime;

      this.metrics.totalQueries++;

      if (duration > this.slowQueryThreshold) {
        this.metrics.slowQueries++;
        logger.warn(`Slow query in pool '${this.name}'`, {
          query: text.substring(0, 200),
          duration,
          params,
        });
      }

      return result.rows as T;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metrics.queryErrors++;
      logger.error(`Query error in pool '${this.name}'`, {
        query: text.substring(0, 200),
        duration,
        error,
      });
      throw error;
    } finally {
      if (client) {
        await this.validateAndReleaseClient(client);
      }
    }
  }

  private async queryReplica<T>(text: string, params?: any[]): Promise<T> {
    const replicaPool = this.replicaPools[this.currentReplicaIndex];
    
    try {
      const result = await replicaPool.query(text, params);
      return result.rows as T;
    } catch (error) {
      logger.warn(`Replica query failed, trying next replica`, { error });
      this.currentReplicaIndex = (this.currentReplicaIndex + 1) % this.replicaPools.length;
      throw error;
    }
  }

  async queryWithRetry<T = any>(
    text: string,
    params?: any[],
    options?: { useReplica?: boolean }
  ): Promise<T> {
    if (!this.retryStrategy) {
      return this.query<T>(text, params, options);
    }

    return this.retryStrategy.execute(async () => {
      return this.query<T>(text, params, options);
    });
  }

  async queryWithCircuitBreaker<T = any>(
    text: string,
    params?: any[],
    options?: { useReplica?: boolean }
  ): Promise<T> {
    if (!this.circuitBreaker) {
      return this.query<T>(text, params, options);
    }

    return this.circuitBreaker.execute(async () => {
      return this.query<T>(text, params, options);
    });
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    if (this.isDraining) {
      throw new Error('Pool is draining, no new transactions allowed');
    }

    const client = await this.acquireClient();
    const startTime = Date.now();

    try {
      await this.executeWithTimeout(client, 'BEGIN');
      const result = await callback(client);
      await this.executeWithTimeout(client, 'COMMIT');
      const duration = Date.now() - startTime;

      if (duration > 30000) {
        logger.warn(`Long-running transaction in pool '${this.name}'`, { duration });
      }

      return result;
    } catch (error) {
      await this.executeWithTimeout(client, 'ROLLBACK');
      const duration = Date.now() - startTime;
      logger.error(`Transaction error in pool '${this.name}'`, {
        duration,
        error,
      });
      throw error;
    } finally {
      await this.validateAndReleaseClient(client);
    }
  }

  private async executeWithTimeout(client: PoolClient, query: string): Promise<void> {
    return Promise.race([
      client.query(query),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), 30000)
      ),
    ]) as Promise<void>;
  }

  private async acquireClient(): Promise<PoolClient> {
    const startTime = Date.now();

    if (this.circuitBreaker && this.circuitBreaker.isOpen()) {
      throw new Error('Circuit breaker is open, rejecting connection');
    }

    const client = await this.pool.connect();
    
    await this.validateConnection(client);

    const waitTime = Date.now() - startTime;
    this.recordWaitTime(waitTime);

    return client;
  }

  private async validateConnection(client: PoolClient): Promise<void> {
    try {
      await client.query(this.validationQuery);
    } catch (error) {
      logger.error('Connection validation failed', { error });
      throw new Error('Invalid connection');
    }
  }

  private async validateAndReleaseClient(client: PoolClient): Promise<void> {
    try {
      await this.validateConnection(client);
    } catch (error) {
      logger.warn('Connection validation on release failed, removing from pool', { error });
      client.release(true);
      return;
    }
    client.release();
  }

  private recordWaitTime(waitTime: number): void {
    const sample: WaitTimeSample = {
      waitTime,
      timestamp: Date.now(),
    };
    this.waitTimeSamples.push(sample);

    if (this.waitTimeSamples.length > 1000) {
      this.waitTimeSamples.shift();
    }

    this.updateWaitTimeMetrics();
  }

  private updateWaitTimeMetrics(): void {
    if (this.waitTimeSamples.length === 0) return;

    const sorted = [...this.waitTimeSamples].sort((a, b) => a.waitTime - b.waitTime);
    const sum = this.waitTimeSamples.reduce((acc, s) => acc + s.waitTime, 0);

    this.metrics.averageWaitTime = sum / this.waitTimeSamples.length;
    this.metrics.p95WaitTime = sorted[Math.floor(sorted.length * 0.95)]?.waitTime || 0;
    this.metrics.p99WaitTime = sorted[Math.floor(sorted.length * 0.99)]?.waitTime || 0;
  }

  getMetrics(): ConnectionPoolMetrics {
    return {
      ...this.metrics,
      totalConnections: this.pool.totalCount,
      activeConnections: this.pool.totalCount - this.pool.idleCount,
      idleConnections: this.pool.idleCount,
      waitingRequests: this.pool.waitingCount,
    };
  }

  getAlerts(): string[] {
    const alerts: string[] = [];
    const metrics = this.getMetrics();
    const utilization = (metrics.activeConnections / metrics.maxConnections) * 100;

    if (utilization > 90) {
      alerts.push(`Connection pool '${this.name}' near exhaustion: ${utilization.toFixed(1)}% utilization`);
    }

    if (metrics.p95WaitTime > 1000) {
      alerts.push(`High connection wait time in pool '${this.name}': P95 = ${metrics.p95WaitTime}ms`);
    }

    if (metrics.connectionErrors > 10) {
      alerts.push(`High connection error rate in pool '${this.name}': ${metrics.connectionErrors} errors`);
    }

    if (metrics.slowQueries > 10) {
      alerts.push(`High slow query count in pool '${this.name}': ${metrics.slowQueries} queries`);
    }

    if (this.circuitBreaker?.isOpen()) {
      alerts.push(`Circuit breaker is open for pool '${this.name}'`);
    }

    return alerts;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query(this.validationQuery);
      client.release();

      for (const replicaPool of this.replicaPools) {
        const replicaClient = await replicaPool.connect();
        await replicaClient.query(this.validationQuery);
        replicaClient.release();
      }

      return true;
    } catch (error) {
      logger.error(`Health check failed for pool '${this.name}'`, { error });
      return false;
    }
  }

  async failoverToReplica(): Promise<void> {
    if (this.replicaPools.length === 0) {
      throw new Error('No replicas available for failover');
    }

    logger.info(`Initiating failover for pool '${this.name}'`);
    
    this.currentReplicaIndex = (this.currentReplicaIndex + 1) % this.replicaPools.length;
    
    const isHealthy = await this.healthCheck();
    if (!isHealthy) {
      throw new Error('All replicas are unhealthy');
    }

    logger.info(`Failover successful for pool '${this.name}', now using replica ${this.currentReplicaIndex}`);
  }

  async drain(): Promise<void> {
    if (this.isDraining) {
      return;
    }

    this.isDraining = true;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    logger.info(`Draining connection pool '${this.name}'`);

    await Promise.all([
      this.pool.end(),
      ...this.replicaPools.map(pool => pool.end()),
    ]);
  }

  resetMetrics(): void {
    this.waitTimeSamples = [];
    this.metrics = this.initializeMetrics({
      name: this.name,
      serviceType: this.serviceType as any,
      maxConnections: this.metrics.maxConnections,
      minConnections: this.metrics.minConnections,
    });
  }
}

export function createAdvancedConnectionPool(config: ConnectionPoolConfig): AdvancedConnectionPool {
  return new AdvancedConnectionPool(config);
}
