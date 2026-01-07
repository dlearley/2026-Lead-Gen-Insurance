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

export {
  AdvancedConnectionPool,
  createAdvancedConnectionPool,
} from './connection-pool-advanced.js';
export type {
  ConnectionPoolConfig,
  ConnectionPoolMetrics,
} from './connection-pool-advanced.js';

export {
  TransactionManager,
  OptimisticLock,
  PessimisticLock,
} from './transaction-manager.js';
export type {
  TransactionOptions,
  TransactionContext,
  TransactionResult,
  LockOptions,
} from './transaction-manager.js';
export { IsolationLevel } from './transaction-manager.js';

export {
  DataValidator,
  ConstraintValidator,
  BusinessRuleValidator,
} from './data-validator.js';
export type {
  ValidationRule,
  ValidationError,
  ValidationResult,
} from './data-validator.js';
export { ConstraintType, DataType, commonValidationRules } from './data-validator.js';

export { BackupManager } from './backup-manager.js';
export type {
  BackupConfig,
  BackupResult,
  RecoveryResult,
} from './backup-manager.js';

export { PerformanceOptimizer } from './performance-optimizer.js';
export type {
  QueryMetrics,
  IndexRecommendation,
  SlowQuery,
  TableStatistics,
} from './performance-optimizer.js';

export { MigrationManager } from './migration-manager.js';
export type {
  Migration,
  MigrationResult,
  SchemaVersion,
} from './migration-manager.js';

export {
  DataEncryption,
  ColumnEncryption,
  KeyRotationManager,
} from './encryption.js';
export type {
  EncryptionConfig,
} from './encryption.js';
export { sensitiveFields } from './encryption.js';

export { DatabaseMonitoring } from './database-monitoring.js';
export type {
  DatabaseHealthMetrics,
  SlowQueryInfo,
  TableStatistics,
} from './database-monitoring.js';

export { MaintenanceManager } from './maintenance-manager.js';
export type {
  MaintenanceConfig,
  MaintenanceResult,
  CleanupResult,
} from './maintenance-manager.js';
