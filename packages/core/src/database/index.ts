export {
  QueryOptimizer,
  globalQueryOptimizer,
  createQueryOptimizer,
  withQueryTracking,
  QueryTracking,
} from './query-optimizer.js';
export type { QueryMetrics } from './query-optimizer.js';

export {
  ConnectionPoolManager,
  createConnectionPool,
} from './connection-pool.js';
export type { ConnectionPoolOptions } from './connection-pool.js';
