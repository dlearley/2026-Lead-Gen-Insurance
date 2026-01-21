/**
 * Performance Optimization & Scalability Types
 * Phase 14.4
 */

// ============================================================================
// Database Optimization Types
// ============================================================================

export interface DatabaseIndexStrategy {
  tableName: string;
  indexes: DatabaseIndex[];
  recommendations: IndexRecommendation[];
}

export interface DatabaseIndex {
  name: string;
  columns: string[];
  type: IndexType;
  unique?: boolean;
  partial?: string;
  estimatedSize?: number;
}

export enum IndexType {
  BTREE = 'BTREE',
  HASH = 'HASH',
  GIN = 'GIN',
  GIST = 'GIST',
  BRIN = 'BRIN',
}

export interface IndexRecommendation {
  table: string;
  columns: string[];
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
}

export interface QueryOptimizationResult {
  query: string;
  executionTime: number;
  planTime: number;
  totalCost: number;
  rows: number;
  plan: QueryExecutionPlan;
  recommendations: QueryRecommendation[];
}

export interface QueryExecutionPlan {
  nodeType: string;
  relation?: string;
  alias?: string;
  startupCost: number;
  totalCost: number;
  planRows: number;
  planWidth: number;
  actualTime?: number;
  actualRows?: number;
  actualLoops?: number;
  plans?: QueryExecutionPlan[];
}

export interface QueryRecommendation {
  type: 'index' | 'rewrite' | 'partition' | 'denormalize';
  description: string;
  impact: 'high' | 'medium' | 'low';
  implementation?: string;
}

export interface ConnectionPoolConfig {
  min: number;
  max: number;
  acquireTimeout: number;
  idleTimeout: number;
  connectionTimeout: number;
  statementTimeout: number;
}

export interface ConnectionPoolMetrics {
  total: number;
  idle: number;
  active: number;
  waiting: number;
  acquireCount: number;
  acquireTime: number;
  createCount: number;
  destroyCount: number;
}

export interface ReadReplicaConfig {
  enabled: boolean;
  replicas: ReplicaEndpoint[];
  strategy: 'round-robin' | 'least-connections' | 'random' | 'weighted';
  healthCheckInterval: number;
}

export interface ReplicaEndpoint {
  host: string;
  port: number;
  weight?: number;
  isHealthy: boolean;
  latency?: number;
}

export interface DataArchivalPolicy {
  table: string;
  archiveAfterDays: number;
  archiveStrategy: 'move' | 'copy' | 'delete';
  archiveDestination?: string;
  retentionDays?: number;
  enabled: boolean;
}

export interface DataArchivalResult {
  table: string;
  recordsArchived: number;
  recordsDeleted: number;
  startTime: Date;
  endTime: Date;
  status: 'success' | 'failed' | 'partial';
  errors?: string[];
}

// ============================================================================
// Caching Strategy Types
// ============================================================================

export interface CacheStrategy {
  layers: CacheLayer[];
  invalidationPolicies: CacheInvalidationPolicy[];
  warmingStrategies: CacheWarmingStrategy[];
}

export interface CacheLayer {
  name: string;
  type: 'memory' | 'redis' | 'cdn';
  ttl: number;
  maxSize?: number;
  evictionPolicy?: 'lru' | 'lfu' | 'fifo';
  enabled: boolean;
}

export interface CacheInvalidationPolicy {
  pattern: string;
  trigger: 'time' | 'event' | 'dependency';
  dependency?: string;
  ttl?: number;
}

export interface CacheWarmingStrategy {
  name: string;
  keys: string[];
  schedule?: string;
  loader: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  size: number;
  memoryUsage: number;
  avgGetTime: number;
  avgSetTime: number;
}

export interface CacheHitRateReport {
  overall: number;
  byKey: Record<string, number>;
  byPattern: Record<string, number>;
  timestamp: Date;
}

// ============================================================================
// API Performance Types
// ============================================================================

export interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// PaginatedResponse is imported from api-ecosystem.ts

export interface CursorPaginationOptions {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

export interface CursorPaginatedResponse<T> {
  edges: Array<{
    node: T;
    cursor: string;
  }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string;
    endCursor: string;
  };
}

export interface ResponseCompressionConfig {
  enabled: boolean;
  threshold: number;
  level: number;
  filter?: (req: any, res: any) => boolean;
}

export interface FieldLevelAuthConfig {
  enabled: boolean;
  rules: FieldAuthRule[];
}

export interface FieldAuthRule {
  resource: string;
  field: string;
  roles: string[];
  condition?: string;
}

// ============================================================================
// Asynchronous Processing Types
// ============================================================================

export interface JobQueueConfig {
  name: string;
  concurrency: number;
  priority: number;
  attempts: number;
  backoff: BackoffStrategy;
  timeout: number;
}

export interface BackoffStrategy {
  type: 'fixed' | 'exponential' | 'linear';
  delay: number;
  maxDelay?: number;
}

export interface JobMetrics {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  avgProcessingTime: number;
  avgWaitTime: number;
  throughput: number;
}

export interface JobSchedule {
  name: string;
  pattern: string;
  jobType: string;
  data?: any;
  timezone?: string;
  enabled: boolean;
}

export interface JobRetryPolicy {
  maxAttempts: number;
  backoff: BackoffStrategy;
  retryableErrors?: string[];
  onMaxRetriesExceeded?: 'fail' | 'archive' | 'deadletter';
}

export interface DeadLetterQueue {
  name: string;
  maxSize: number;
  ttl: number;
  alertThreshold: number;
}

// ============================================================================
// CDN & Static Assets Types
// ============================================================================

export interface CDNConfig {
  provider: 'cloudflare' | 'cloudfront' | 'fastly' | 'custom';
  domain: string;
  enabled: boolean;
  regions: string[];
  caching: CDNCachingConfig;
}

export interface CDNCachingConfig {
  staticAssets: {
    maxAge: number;
    swr: number;
  };
  api: {
    maxAge: number;
    swr: number;
  };
  images: {
    maxAge: number;
    swr: number;
  };
}

export interface AssetVersioningStrategy {
  strategy: 'hash' | 'timestamp' | 'semver';
  prefix?: string;
  manifest?: string;
}

export interface ImageOptimizationConfig {
  enabled: boolean;
  formats: ImageFormat[];
  quality: number;
  resize: ImageResizeConfig;
  lazy: boolean;
  webp: boolean;
  avif: boolean;
}

export interface ImageFormat {
  type: 'jpeg' | 'png' | 'webp' | 'avif';
  quality: number;
}

export interface ImageResizeConfig {
  maxWidth: number;
  maxHeight: number;
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  responsive: boolean;
  breakpoints?: number[];
}

export interface VideoStreamingConfig {
  enabled: boolean;
  provider: 'hls' | 'dash' | 'custom';
  qualities: VideoQuality[];
  adaptiveBitrate: boolean;
}

export interface VideoQuality {
  resolution: string;
  bitrate: number;
  fps: number;
}

// ============================================================================
// Load Testing & Capacity Planning Types
// ============================================================================

export interface LoadTestScenario {
  name: string;
  description: string;
  duration: number;
  rampUp: number;
  stages: LoadTestStage[];
  endpoints: LoadTestEndpoint[];
}

export interface LoadTestStage {
  name: string;
  duration: number;
  target: number;
  arrivalRate?: number;
}

export interface LoadTestEndpoint {
  method: string;
  path: string;
  weight: number;
  headers?: Record<string, string>;
  body?: any;
}

export interface LoadTestResults {
  scenarioName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  metrics: LoadTestMetrics;
  bottlenecks: PerformanceBottleneck[];
}

export interface LoadTestMetrics {
  latency: {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
    avg: number;
  };
  throughput: {
    requestsPerSecond: number;
    bytesPerSecond: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
    rate: number;
  };
  resources: {
    cpu: number;
    memory: number;
    network: number;
    disk: number;
  };
}

export interface PerformanceBottleneck {
  component: string;
  type: 'cpu' | 'memory' | 'network' | 'database' | 'cache' | 'queue';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  recommendation: string;
}

export interface CapacityForecast {
  resourceType: 'cpu' | 'memory' | 'storage' | 'bandwidth' | 'database';
  currentUsage: number;
  currentCapacity: number;
  utilizationRate: number;
  projections: CapacityProjection[];
  recommendations: CapacityRecommendation[];
}

export interface CapacityProjection {
  date: Date;
  predictedUsage: number;
  predictedCapacity: number;
  utilizationRate: number;
  confidence: number;
}

export interface CapacityRecommendation {
  resourceType: string;
  action: 'scale-up' | 'scale-out' | 'optimize' | 'archive';
  priority: 'immediate' | 'short-term' | 'medium-term' | 'long-term';
  description: string;
  estimatedCost?: number;
  estimatedImpact: string;
}

export interface CapacityPlanningDashboard {
  timestamp: Date;
  forecasts: CapacityForecast[];
  alerts: CapacityAlert[];
  trends: CapacityTrend[];
}

export interface CapacityAlert {
  resourceType: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
}

export interface CapacityTrend {
  resourceType: string;
  period: 'day' | 'week' | 'month' | 'quarter';
  growth: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  dataPoints: Array<{
    timestamp: Date;
    value: number;
  }>;
}

// ============================================================================
// Performance Monitoring Types
// ============================================================================

export interface PerformanceMetrics {
  timestamp: Date;
  api: APIPerformanceMetrics;
  database: DatabasePerformanceMetrics;
  cache: CacheMetrics;
  queue: QueuePerformanceMetrics;
}

export interface APIPerformanceMetrics {
  requestCount: number;
  errorCount: number;
  latency: LatencyMetrics;
  throughput: number;
  activeConnections: number;
}

export interface DatabasePerformanceMetrics {
  connectionPool: ConnectionPoolMetrics;
  queryCount: number;
  slowQueries: number;
  avgQueryTime: number;
  cacheHitRate: number;
}

export interface QueuePerformanceMetrics {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  avgProcessingTime: number;
  throughput: number;
}

export interface LatencyMetrics {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  avg: number;
  min: number;
  max: number;
}
