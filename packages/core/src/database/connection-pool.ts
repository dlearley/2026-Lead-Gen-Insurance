import { Pool, PoolConfig } from 'pg';
import { logger } from '../logger/index.js';

export interface ConnectionPoolOptions extends PoolConfig {
  name?: string;
  healthCheckInterval?: number;
}

export class ConnectionPoolManager {
  private pool: Pool;
  private name: string;
  private healthCheckInterval?: NodeJS.Timeout;
  private metrics = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingRequests: 0,
    errors: 0,
  };

  constructor(options: ConnectionPoolOptions) {
    this.name = options.name || 'default';
    
    const poolConfig: PoolConfig = {
      ...options,
      max: options.max || 20,
      min: options.min || 5,
      idleTimeoutMillis: options.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: options.connectionTimeoutMillis || 10000,
      statement_timeout: options.statement_timeout || 30000,
      query_timeout: options.query_timeout || 30000,
    };

    this.pool = new Pool(poolConfig);

    this.setupEventListeners();

    if (options.healthCheckInterval) {
      this.startHealthCheck(options.healthCheckInterval);
    }

    logger.info(`Connection pool '${this.name}' initialized`, {
      max: poolConfig.max,
      min: poolConfig.min,
    });
  }

  private setupEventListeners(): void {
    this.pool.on('connect', () => {
      this.metrics.totalConnections++;
      logger.debug(`New connection established in pool '${this.name}'`);
    });

    this.pool.on('acquire', () => {
      this.metrics.activeConnections++;
      logger.debug(`Connection acquired from pool '${this.name}'`);
    });

    this.pool.on('release', () => {
      this.metrics.activeConnections--;
      logger.debug(`Connection released to pool '${this.name}'`);
    });

    this.pool.on('remove', () => {
      this.metrics.totalConnections--;
      logger.debug(`Connection removed from pool '${this.name}'`);
    });

    this.pool.on('error', (err) => {
      this.metrics.errors++;
      logger.error(`Pool '${this.name}' error`, { error: err });
    });
  }

  private startHealthCheck(interval: number): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const client = await this.pool.connect();
        await client.query('SELECT 1');
        client.release();
        logger.debug(`Health check passed for pool '${this.name}'`);
      } catch (error) {
        logger.error(`Health check failed for pool '${this.name}'`, { error });
      }
    }, interval);
  }

  async query<T = any>(text: string, params?: any[]): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - startTime;
      
      if (duration > 1000) {
        logger.warn(`Slow query in pool '${this.name}'`, {
          query: text,
          duration,
        });
      }
      
      return result.rows as T;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Query error in pool '${this.name}'`, {
        query: text,
        duration,
        error,
      });
      throw error;
    }
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Transaction error in pool '${this.name}'`, { error });
      throw error;
    } finally {
      client.release();
    }
  }

  getMetrics(): typeof this.metrics {
    return {
      ...this.metrics,
      totalConnections: this.pool.totalCount,
      activeConnections: this.pool.totalCount - this.pool.idleCount,
      idleConnections: this.pool.idleCount,
      waitingRequests: this.pool.waitingCount,
    };
  }

  async drain(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    logger.info(`Draining connection pool '${this.name}'`);
    await this.pool.end();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      logger.error(`Health check failed for pool '${this.name}'`, { error });
      return false;
    }
  }
}

export function createConnectionPool(options: ConnectionPoolOptions): ConnectionPoolManager {
  return new ConnectionPoolManager(options);
}
