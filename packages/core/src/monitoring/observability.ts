/**
 * OpenTelemetry Observability Integration
 * 
 * Main entry point for distributed tracing, logging, and metrics integration.
 * Provides centralized observability configuration with support for:
 * - Distributed tracing with Jaeger
 * - Structured logging with Winston + OpenTelemetry
 * - Prometheus metrics with enhanced business metrics
 */

import { initializeTracing, TracingService, TracingConfig } from './tracing';
import { MetricsService, MetricsConfig } from './metrics';

export interface ObservabilityConfig {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  tracing?: Partial<TracingConfig>;
  metrics?: Partial<MetricsConfig>;
  tracingEnabled?: boolean;
  metricsEnabled?: boolean;
}

export class ObservabilityManager {
  private tracingService: TracingService | null = null;
  private metricsService: MetricsService | null = null;
  private serviceName: string;
  private config: ObservabilityConfig;

  constructor(config: ObservabilityConfig) {
    this.serviceName = config.serviceName;
    this.config = {
      tracingEnabled: true,
      metricsEnabled: true,
      ...config,
    };
  }

  /**
   * Initialize all observability components
   */
  initialize(): void {
    // Initialize tracing
    if (this.config.tracingEnabled !== false) {
      this.tracingService = initializeTracing({
        serviceName: this.serviceName,
        serviceVersion: this.config.serviceVersion,
        environment: this.config.environment,
        ...this.config.tracing,
      });
    }

    // Initialize metrics
    if (this.config.metricsEnabled !== false) {
      this.metricsService = new MetricsService({
        namespace: 'insurance_lead_gen',
        serviceName: this.serviceName,
        environment: this.config.environment,
        ...this.config.metrics,
      });
    }

    console.log(`Observability initialized for ${this.serviceName}`);
  }

  /**
   * Get tracing service
   */
  getTracing(): TracingService | null {
    return this.tracingService;
  }

  /**
   * Get metrics service
   */
  getMetrics(): MetricsService | null {
    return this.metricsService;
  }

  /**
   * Shutdown all observability components gracefully
   */
  async shutdown(): Promise<void> {
    if (this.tracingService) {
      await this.tracingService.shutdown();
    }

    if (this.metricsService) {
      this.metricsService.shutdown();
    }

    console.log('Observability shut down successfully');
  }
}

/**
 * Initialize observability for a service with sensible defaults
 */
export function initializeObservability(config: ObservabilityConfig): ObservabilityManager {
  const manager = new ObservabilityManager(config);
  manager.initialize();

  // Handle process termination
  const gracefulShutdown = async () => {
    await manager.shutdown();
    process.exit(0);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  return manager;
}

/**
 * Get tracer for the service
 */
export function getTracer(serviceName: string): any {
  const { trace } = require('@opentelemetry/api');
  return trace.getTracer(serviceName);
}

export * from './tracing';
export * from './metrics';
