/**
 * Observability Type Definitions
 * 
 * Type definitions for observability features including:
 * - Tracing types
 * - Metrics types
 * - Logging types
 * - Instrumentation types
 */

/**
 * Trace context information
 */
export interface TraceContext {
  traceId: string;
  spanId: string;
  traceFlags: string;
}

/**
 * Span attribute types
 */
export type SpanAttributeValue = string | number | boolean | string[] | number[];

/**
 * Span attributes record
 */
export interface SpanAttributes {
  [key: string]: SpanAttributeValue;
}

/**
 * HTTP request metrics
 */
export interface HttpRequestMetrics {
  method: string;
  route: string;
  statusCode: number;
  duration: number;
  userAgent?: string;
  ip?: string;
}

/**
 * Lead processing metrics
 */
export interface LeadProcessingMetrics {
  leadId: string;
  stage: string;
  status: string;
  duration: number;
  score?: number;
  agentId?: string;
}

/**
 * AI model metrics
 */
export interface AIModelMetrics {
  model: string;
  operation: string;
  latency: number;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost?: number;
  accuracy?: number;
}

/**
 * Queue job metrics
 */
export interface QueueJobMetrics {
  queueName: string;
  jobType: string;
  jobId: string;
  status: string;
  duration: number;
  retryCount?: number;
}

/**
 * Database query metrics
 */
export interface DatabaseQueryMetrics {
  operation: string;
  table: string;
  duration: number;
  rowCount?: number;
  error?: string;
}

/**
 * Observability configuration
 */
export interface ObservabilityConfig {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  tracing?: {
    enabled: boolean;
    jaegerEndpoint?: string;
    samplingRate?: number;
  };
  metrics?: {
    enabled: boolean;
    port?: number;
    path?: string;
  };
  logging?: {
    enabled: boolean;
    level: string;
    enableConsole: boolean;
    enableFile: boolean;
    enableStructured: boolean;
  };
}

/**
 * Metrics configuration
 */
export interface MetricsConfig {
  namespace: string;
  serviceName: string;
  environment?: string;
  labels?: Record<string, string>;
  port?: number;
  path?: string;
}

/**
 * Tracing configuration
 */
export interface TracingConfig {
  serviceName: string;
  serviceVersion?: string;
  jaegerEndpoint?: string;
  environment?: string;
  samplingRate?: number;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  serviceName: string;
  environment?: string;
  level?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  enableStructured?: boolean;
}

/**
 * Observability cost breakdown
 */
export interface ObservabilityCost {
  traces: {
    count: number;
    cost: number;
  };
  logs: {
    bytes: number;
    cost: number;
  };
  metrics: {
    count: number;
    cost: number;
  };
  total: number;
  ratio: number; // As percentage of infrastructure cost
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  name: string;
  severity: 'info' | 'warning' | 'critical';
  condition: string;
  threshold: number;
  duration?: number;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  name: string;
  panels: DashboardPanel[];
}

export interface DashboardPanel {
  title: string;
  type: 'graph' | 'stat' | 'table' | 'heatmap';
  query: string;
  targets: DashboardTarget[];
}

export interface DashboardTarget {
  expr: string;
  legendFormat?: string;
}

/**
 * Instrumentation options
 */
export interface InstrumentationOptions {
  attributes?: SpanAttributes;
  events?: Array<{ name: string; attributes?: SpanAttributes }>;
}

/**
 * Trace decorator options
 */
export interface TraceDecoratorOptions {
  name?: string;
  attributes?: SpanAttributes;
}
